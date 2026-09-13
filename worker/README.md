# worker/ — 백엔드 (Cloudflare Worker + D1): 누적 순위 · 방문자 수 · 한마디

앱(`index.html`)은 `fetch`로 이 Worker만 호출한다. 앱 본체는 여전히 단일 파일이고, 이 폴더는 별도 배포 코드다.

| 경로 | 용도 |
|---|---|
| `POST /nick` | 닉네임 등록 `{nick}` → `{ok,nick,token}`. 대소문자·전각을 무시하고 유일. 이미 있으면 409 `taken`. 토큰은 브라우저가 보관하고 아래 등록·게시에 붙인다 |
| `GET /top?board=wave10[&nick=]` | 상위 10 + 참가 수 + (nick이 있으면) 내 행과 순위 `me` + `cut10`(상위 10% 경계 점수. 10명 미만은 10명으로 계산해 1위 점수, 빈 보드는 null. 앱은 wave10의 값으로 웨이브 차트 상위 띠를 그린다) |
| `POST /submit` | 기록 등록(`token` 필수, 틀리면 403 `auth`). 닉네임당 보드마다 1행(초기화 없음, 2026-09-14): 더 좋으면 교체, 아니면 유지(`improved:false`) |
| `GET /visits` · `POST /visits` | 오늘(KST)·누적 방문 수. POST는 오늘에 1을 더한다(앱이 브라우저당 하루 1회만 보냄) |
| `GET /posts` · `POST /posts` | 한마디 최신 50개(행마다 좋아요 `up`·싫어요 `down` 수) · 작성(`{nick,token,text}`, 200자, IP당 1분 3개) |
| `POST /vote` | 글에 좋아요/싫어요(`{nick,token,id,v}`, v = 1 좋아요 · -1 싫어요 · 0 취소). 닉네임당 글 하나에 표 1개(`votes` PK), 같은 값을 다시 보내도 중복되지 않는 "설정" 방식. 응답 `{ok,id,mine,rows}`. 400 `id`/`v`, 403 `auth`, 404 `post`, 429 `rate`(IP당 1분 30개, `VOTE_LIMIT`) |
| `DELETE /posts/:id` | 관리자 삭제(그 글의 표도 함께 지움). 헤더 `authorization: Bearer <ADMIN_TOKEN>` |
| `GET /scores?board=` | 관리자. 그 보드의 **모든** 행을 id·차단 표시(`banned`)와 함께 |
| `DELETE /scores/:id` | 관리자. 기록 한 행 영구 삭제 |
| `GET /ban` · `POST /ban {nick}` · `DELETE /ban?nick=` | 관리자. 섀도 밴 목록·추가·해제(아래 "순위 조작 대응") |

## 현재 상태 (2026-09-12)

- 배포 주소: `https://mishima-dojo-board.mishima-dojo.workers.dev` (`index.html`의 `BOARD_URL`)
- 계정: 사용자 소유 Cloudflare 계정. D1 `mishima-dojo-board`(APAC, id는 `wrangler.toml`에 기입됨), workers.dev 서브도메인 `mishima-dojo`.
- 아래 "처음 한 번"은 이미 끝났다. 다른 PC에서 배포하려면 `npx wrangler login`만 다시 하면 된다.
- 비밀 `ADMIN_TOKEN`(관리자 경로 전용: 게시글·기록 삭제, 섀도 밴, 보드 전체 기록 조회)은 `npx wrangler secret put ADMIN_TOKEN`으로 넣는다. 값은 저장소에 두지 않는다(로컬 `.sandbox/admin-token.txt`, gitignore).
- 출처 잠금(2026-09-12): `wrangler.toml`의 `[vars] ALLOWED_ORIGINS`(쉼표 구분)에 있는 브라우저 출처만 API를 쓸 수 있다. 다른 출처는 응답에 CORS 헤더가 없고(브라우저가 읽지 못함) POST는 403 `origin`. 사이트를 복사해 다른 곳에 올려도 순위·한마디·방문 집계가 붙지 않는다. 도메인을 연결하면 여기에 추가하고 다시 배포. 관리자 경로(`DELETE /posts/:id`·`/scores/:id`, `/ban`, `GET /scores`)는 `ADMIN_TOKEN`만 검사하므로 curl로 그대로 쓸 수 있다. 테스트는 `ALLOWED_ORIGINS='*'` 또는 `'null'`(file:// 페이지)로 연다.

## 이후 코드 수정 시

```powershell
cd D:\dojo\worker
npx wrangler@latest deploy
```

스키마가 바뀌면 `npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql`을 다시 실행한다(`IF NOT EXISTS`라 안전). 배포 직후 몇 초는 루트 `/`가 Cloudflare 오류 1042를 돌려줄 수 있는데 곧 사라진다.

2026-09-14 순위 초기화 폐지(누적 순위, AGENTS.md 결정 19) 적용 순서 — 워커를 먼저 배포하고 바로 마이그레이션을 돌린다(둘 사이에는 순위표가 비어 보인다. 사이트 푸시는 그 뒤·앞 어느 쪽이든 동작: 새 사이트 + 구 워커면 순위표는 주간 그대로에 기간 문구만 사라지고, 구 사이트 + 새 워커면 웨이브 상위 띠가 기본값 5로만 보이고, 순위 카드 기간 줄에 "NaN/NaN ~ NaN/NaN (KST)"가 찍히며, wave10을 매분 다시 요청하지만 응답을 버린다. 새로고침하면 사라진다):

```powershell
cd D:\dojo\worker
npx wrangler@latest deploy
npx wrangler d1 execute mishima-dojo-board --remote --file=migrate-2026-09-14-alltime.sql
# --file이 401(code 10000)로 거부되면 문장 둘을 순서대로 직접(첫 문장은 migrate 파일의 DELETE 전체를 한 줄로 붙여 넣는다):
# npx wrangler d1 execute mishima-dojo-board --remote --command "DELETE FROM scores WHERE EXISTS (SELECT 1 FROM scores b WHERE b.board = scores.board AND b.nick = scores.nick AND b.id <> scores.id AND (b.score > scores.score OR (b.score = scores.score AND (b.tie > scores.tie OR (b.tie = scores.tie AND b.id < scores.id)))))"
# npx wrangler d1 execute mishima-dojo-board --remote --command "UPDATE scores SET week = 'all' WHERE week <> 'all'"
```

확인: `/` 응답에 `"season":"all"`, `/top?board=wave10`에 지난주 기록까지 합쳐진 순위표가 보이면 끝. 마이그레이션은 멱등이라 순서가 꼬였으면 한 번 더 돌리면 된다.

2026-09-13 좋아요/싫어요(`votes` 테이블 + `POST /vote` + `VOTE_LIMIT` 바인딩) 적용 순서 — **사이트 푸시보다 먼저**(구 워커 + 새 사이트면 버튼이 0으로 보이고 누르면 실패 문구만 뜬다, 다른 기능 무영향):

```powershell
cd D:\dojo\worker
npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql
# --file이 401(code 10000)로 거부되면 문장 하나만 직접:
# npx wrangler d1 execute mishima-dojo-board --remote --command "CREATE TABLE IF NOT EXISTS votes (post_id INTEGER NOT NULL, key TEXT NOT NULL, v INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (post_id, key))"
npx wrangler@latest deploy
```

확인: `/posts` 응답의 행에 `"up":0,"down":0`이 보이면 새 워커다.

확인: `https://mishima-dojo-board.mishima-dojo.workers.dev/` → `{"ok":true,...}`, `/top?board=wave10` → 순위표 JSON, `/visits`, `/posts`.

## 순위 조작 대응: 섀도 밴·기록 삭제 (관리자, 2026-09-13)

자동 치팅 판정은 없다(아래 설계 참조). 대신 운영자가 닉네임을 **섀도 밴**한다. 차단된 닉의 기록은 계속 저장·접수되고 본인 브라우저에는 차단 전과 똑같은 순위표(자기 행·등수·참가 수 포함)가 보이지만, 다른 사람의 순위표·참가 수·`cut10`에서는 사라진다. 해제하면 저장돼 있던 행이 그대로 다시 보인다. 닉 지정 조회(`/top?nick=`)는 누구나 쓸 수 있으므로 차단된 닉을 직접 지목하면 그 행이 보인다(순위표에서 숨기는 것이지 조회를 막는 것은 아니다). 한마디는 차단과 무관하다(글은 `delpost`로 지운다).

**`tools\admin.cmd`를 더블클릭**하면 번호로 고르는 메뉴가 뜬다(보드 1~4 → 행 번호 → 차단/해제/삭제, 5 한마디 삭제, 6 차단 목록, 0 종료. 삭제는 y를 한 번 더 묻는다). 같은 것을 터미널에서는 `node tools/board-admin.js`(인자 없음)로 연다. 토큰은 `.sandbox/admin-token.txt`(gitignore)나 환경변수 `ADMIN_TOKEN`에서 읽는다. 명령을 직접 치려면:

```powershell
node tools/board-admin.js top wave10          # wave10 전체 행(누적): 순위(차단 행은 BAN)·id·닉·점수·detail·시각
node tools/board-admin.js ban 닉네임          # 섀도 밴. 등록된 닉은 대소문자 달라도 됨(등록 표기로 저장). 등록 전 옛 기록은 표기가 정확히 같아야 걸러짐 — 메뉴에서 행을 고르면 그대로 넘어감
node tools/board-admin.js unban 닉네임
node tools/board-admin.js bans                # 차단 목록
node tools/board-admin.js del 123             # 기록 한 행 삭제 (id는 top 출력)
node tools/board-admin.js delpost 45          # 한마디 삭제
```

2026-09-13에 배포 완료. `schema.sql` 파일 실행(`--file`)이 401(code 10000)로 거부되면 `--command "CREATE TABLE IF NOT EXISTS …"`로 해당 문장만 직접 넣으면 된다(이번에 그렇게 했다). 배포 직후 몇 초는 옛 버전이 섞여 `/scores`가 404를 낼 수 있다.

## 게시글 삭제 (관리자)

```powershell
curl -X DELETE https://mishima-dojo-board.mishima-dojo.workers.dev/posts/123 -H "authorization: Bearer <ADMIN_TOKEN>"
```

`{"ok":true,"deleted":1}`이면 지워진 것. id는 `GET /posts` 응답에 있다.

## 처음 한 번 (이미 완료. 새 계정에 다시 세울 때만)

Cloudflare 무료 계정을 만들고 **이메일 인증**을 마친 뒤(인증 전에는 deploy가 code 10034로 거부된다) 이 폴더에서 순서대로 실행한다. wrangler는 `npx`로 받아 쓰며 저장소에 설치하지 않는다.

```powershell
cd D:\dojo\worker
npx wrangler@latest login                                   # 브라우저가 열리면 허용
npx wrangler d1 create mishima-dojo-board                   # 출력된 database_id로 wrangler.toml의 값을 바꾼다
npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql
npx wrangler deploy                                         # 마지막 줄의 주소로 index.html의 BOARD_URL을 바꾼다 (끝에 / 없이)
npx wrangler secret put ADMIN_TOKEN                         # 관리자 비밀(삭제·섀도 밴·전체 조회). 아무 긴 문자열
```

workers.dev 서브도메인이 없으면 deploy가 멈춘다. 대시보드 Workers & Pages를 처음 열면 자동 생성되고, 또는 API `PUT /accounts/{account_id}/workers/subdomain` `{"subdomain":"이름"}`으로 등록할 수 있다(wrangler의 OAuth 토큰은 `%APPDATA%\xdg.config\.wrangler\config\default.toml`).

## 설계

- 시즌 키 `scores.week` = `SEASON` 상수 `'all'`(2026-09-14 사용자 결정: 초기화 없음, 유입이 늘면 그때 넣는다). `seasonKey(now)` 한 곳이 저장·조회 키를 정하므로 주간 초기화를 되살리려면 거기서 `weekKey(now)`(해당 주 월요일 날짜 KST)를 돌려주면 된다 — 다른 키의 행은 지우지 않고 조회에서만 빠진다. 2026-09-14 이전의 주간 행은 `migrate-2026-09-14-alltime.sql`로 닉·보드당 최고 1건만 남겨 `'all'`로 합쳤다.
- 보드 5개: `wave10`(score=대시/초, tie=최고 연속), `ewgf20`(score=성공률, tie=−|평균 오프셋|), `combo10`(score=성공률, tie=측정 중 평균 대시/초), `rush30`(score=점수, tie=격파 수, detail {kills,whiffs,dashPts}. 2026-09-13 추가), `bd10`(score=백대시로 물러난 거리 m 0~60, tie=매우 빠름 세트 수, detail {dashes,top,chain}. 2026-09-13 추가 — 배포 전에는 앱의 bd10 등록이 400 `board`로 거부되므로 사이트보다 먼저 배포한다).
- 닉네임: `nicks(key,nick,token)`. key = NFKC 소문자. 계정 대신 토큰(48 hex)으로 소유를 증명한다. 토큰을 잃으면(브라우저 데이터 삭제) 그 닉네임은 다시 못 쓴다 — 해제 API는 일부러 없다. 필요하면 D1에서 직접 `DELETE FROM nicks WHERE key=?`.
- 닉네임당 보드마다 1행: `INSERT … ON CONFLICT(week,board,nick) DO UPDATE … WHERE 더 좋을 때만`. 순위 = 자기보다 (score, tie)가 높은 기록 수 + 1. 동점은 같은 순위. 응답은 상위 10 + 전체 참가자 수 + 내 행(`me`, 10위 밖이어도 순위 계산).
- 방문 집계: `visits(day,n)`. 날짜는 KST. 앱이 브라우저당 하루 1회 POST하므로 "사람 수"에 가깝지만 정확한 고유 방문자는 아니다.
- 한마디: `posts(id,nick,text,created_at)`. 본문은 공백 정리 후 1~200자, 제어·서식(제로폭·양방향·소프트 하이픈 등)·사용자 영역·미할당 문자와 한글 채움 문자·이체자 선택자 금지(`BAD_CHARS`, 앱의 `NICK_BAD`와 같아야 함. 빈칸으로 보이는 닉네임·글을 막기 위함). 레이트 리밋은 `wrangler.toml`의 `POST_LIMIT` 바인딩(IP당 60초 3회, 저장하는 것 없음), 닉네임 등록은 `NICK_LIMIT`(10회), 좋아요/싫어요는 `VOTE_LIMIT`(30회). 바인딩이 없으면(테스트) 검사 생략. 삭제는 `ADMIN_TOKEN`이 설정된 경우에만 가능.
- 좋아요/싫어요(2026-09-13): `votes(post_id,key,v,created_at)`, PK (post_id,key)라 닉네임당 글 하나에 표 1개. `POST /vote`는 "내 표를 v로 설정"(1/-1/0)이라 재전송·낡은 화면에서 눌러도 두 번 세지지 않는다. `/posts`가 `LEFT JOIN`으로 `up`/`down`을 집계하고, 누가 어디에 표했는지는 어떤 응답에도 나가지 않는다(앱이 자기 표를 localStorage `store.votes`에 기억). 닉을 새로 정하면 다른 key라 다시 표할 수 있다(허용된 한계).
- 자동 치팅 판정 없음(2026-09-12 사용자 결정). 형식·범위 검사만 한다. 인증·쿠키 없음. 본문 2000자 초과는 413. 매크로 등 순위 조작은 운영자가 섀도 밴(`bans(key,nick,created_at)`, 2026-09-13)으로 대응한다: `top()`의 상위 목록·참가 수·`cut10`·순위 계산은 `VISIBLE`(bans의 표기 + 같은 key로 등록된 표기를 `nicks`와 조인해 제외)로 거르되, 요청한 닉 자신의 행은 `OR nick=?`로 통과시켜 본인은 차단 전과 같은 화면을 본다. `/submit`도 그대로 받는다. 관리자 경로(`/ban`, `/scores`, `DELETE /posts/:id`·`/scores/:id`)는 `admin()` 한 곳에서 출처 검사 전에 처리하며 `ADMIN_TOKEN`만 본다.
- 무료 한도: 요청 10만/일, D1 쓰기 10만 행/일. 방치해도 정지되지 않는다.
- 테스트: `node --test tests/board.test.cjs` (`tests/fake-d1.js` = node:sqlite 인메모리에 schema.sql을 그대로 적용한 가짜 D1, Node 22.13+). 스모크 테스트는 같은 핸들러를 로컬 http로 감싸 실제 브라우저에서 등록·조회·게시·방문 집계를 돈다.
