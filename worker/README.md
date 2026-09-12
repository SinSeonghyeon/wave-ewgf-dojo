# worker/ — 백엔드 (Cloudflare Worker + D1): 주간 순위 · 방문자 수 · 한마디

앱(`index.html`)은 `fetch`로 이 Worker만 호출한다. 앱 본체는 여전히 단일 파일이고, 이 폴더는 별도 배포 코드다.

| 경로 | 용도 |
|---|---|
| `POST /nick` | 닉네임 등록 `{nick}` → `{ok,nick,token}`. 대소문자·전각을 무시하고 유일. 이미 있으면 409 `taken`. 토큰은 브라우저가 보관하고 아래 등록·게시에 붙인다 |
| `GET /top?board=wave10[&nick=]` | 상위 10 + 참가 수 + (nick이 있으면) 내 행과 순위 `me` + `cut10`(상위 10% 경계 점수. 10명 미만은 10명으로 계산해 1위 점수, 빈 보드는 null. 앱은 wave10의 값으로 웨이브 차트 상위 띠를 그린다) |
| `POST /submit` | 기록 등록(`token` 필수, 틀리면 403 `auth`). 닉네임당 보드마다 주간 1행: 더 좋으면 교체, 아니면 유지(`improved:false`) |
| `GET /visits` · `POST /visits` | 오늘(KST)·누적 방문 수. POST는 오늘에 1을 더한다(앱이 브라우저당 하루 1회만 보냄) |
| `GET /posts` · `POST /posts` | 한마디 최신 50개 · 작성(`{nick,token,text}`, 200자, IP당 1분 3개) |
| `DELETE /posts/:id` | 관리자 삭제. 헤더 `authorization: Bearer <ADMIN_TOKEN>` |

## 현재 상태 (2026-09-12)

- 배포 주소: `https://mishima-dojo-board.mishima-dojo.workers.dev` (`index.html`의 `BOARD_URL`)
- 계정: 사용자 소유 Cloudflare 계정. D1 `mishima-dojo-board`(APAC, id는 `wrangler.toml`에 기입됨), workers.dev 서브도메인 `mishima-dojo`.
- 아래 "처음 한 번"은 이미 끝났다. 다른 PC에서 배포하려면 `npx wrangler login`만 다시 하면 된다.
- 비밀 `ADMIN_TOKEN`(게시글 삭제용)은 `npx wrangler secret put ADMIN_TOKEN`으로 넣는다. 값은 저장소에 두지 않는다(로컬 `.sandbox/admin-token.txt`, gitignore).
- 출처 잠금(2026-09-12): `wrangler.toml`의 `[vars] ALLOWED_ORIGINS`(쉼표 구분)에 있는 브라우저 출처만 API를 쓸 수 있다. 다른 출처는 응답에 CORS 헤더가 없고(브라우저가 읽지 못함) POST는 403 `origin`. 사이트를 복사해 다른 곳에 올려도 순위·한마디·방문 집계가 붙지 않는다. 도메인을 연결하면 여기에 추가하고 다시 배포. `DELETE`는 `ADMIN_TOKEN`만 검사하므로 curl로 그대로 쓸 수 있다. 테스트는 `ALLOWED_ORIGINS='*'` 또는 `'null'`(file:// 페이지)로 연다.

## 이후 코드 수정 시

```powershell
cd D:\dojo\worker
npx wrangler@latest deploy
```

스키마가 바뀌면 `npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql`을 다시 실행한다(`IF NOT EXISTS`라 안전). 배포 직후 몇 초는 루트 `/`가 Cloudflare 오류 1042를 돌려줄 수 있는데 곧 사라진다.

확인: `https://mishima-dojo-board.mishima-dojo.workers.dev/` → `{"ok":true,...}`, `/top?board=wave10` → 순위표 JSON, `/visits`, `/posts`.

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
npx wrangler secret put ADMIN_TOKEN                         # 게시글 삭제용 비밀. 아무 긴 문자열
```

workers.dev 서브도메인이 없으면 deploy가 멈춘다. 대시보드 Workers & Pages를 처음 열면 자동 생성되고, 또는 API `PUT /accounts/{account_id}/workers/subdomain` `{"subdomain":"이름"}`으로 등록할 수 있다(wrangler의 OAuth 토큰은 `%APPDATA%\xdg.config\.wrangler\config\default.toml`).

## 설계

- 주간 키 `week` = 해당 주 월요일 날짜(KST). 월요일 0시 KST에 조회에서 빠지며 지난 기록은 지우지 않는다.
- 보드 4개: `wave10`(score=대시/초, tie=최고 연속), `ewgf20`(score=성공률, tie=−|평균 오프셋|), `combo10`(score=성공률, tie=측정 중 평균 대시/초), `rush30`(score=점수, tie=격파 수, detail {kills,whiffs,dashPts}. 2026-09-13 추가 — 배포 전에는 앱의 rush30 등록이 400 `board`로 거부된다).
- 닉네임: `nicks(key,nick,token)`. key = NFKC 소문자. 계정 대신 토큰(48 hex)으로 소유를 증명한다. 토큰을 잃으면(브라우저 데이터 삭제) 그 닉네임은 다시 못 쓴다 — 해제 API는 일부러 없다. 필요하면 D1에서 직접 `DELETE FROM nicks WHERE key=?`.
- 닉네임당 보드마다 주간 1행: `INSERT … ON CONFLICT(week,board,nick) DO UPDATE … WHERE 더 좋을 때만`. 순위 = 자기보다 (score, tie)가 높은 기록 수 + 1. 동점은 같은 순위. 응답은 상위 10 + 전체 참가자 수 + 내 행(`me`, 10위 밖이어도 순위 계산).
- 방문 집계: `visits(day,n)`. 날짜는 KST. 앱이 브라우저당 하루 1회 POST하므로 "사람 수"에 가깝지만 정확한 고유 방문자는 아니다.
- 한마디: `posts(id,nick,text,created_at)`. 본문은 공백 정리 후 1~200자, 제어·서식(제로폭·양방향·소프트 하이픈 등)·사용자 영역·미할당 문자와 한글 채움 문자·이체자 선택자 금지(`BAD_CHARS`, 앱의 `NICK_BAD`와 같아야 함. 빈칸으로 보이는 닉네임·글을 막기 위함). 레이트 리밋은 `wrangler.toml`의 `POST_LIMIT` 바인딩(IP당 60초 3회, 저장하는 것 없음), 닉네임 등록은 `NICK_LIMIT`(10회). 바인딩이 없으면(테스트) 검사 생략. 삭제는 `ADMIN_TOKEN`이 설정된 경우에만 가능.
- 치팅 방지 없음(2026-09-12 사용자 결정). 형식·범위 검사만 한다. 인증·쿠키 없음, CORS `*`. 본문 2000자 초과는 413.
- 무료 한도: 요청 10만/일, D1 쓰기 10만 행/일. 방치해도 정지되지 않는다.
- 테스트: `node --test tests/board.test.cjs` (`tests/fake-d1.js` = node:sqlite 인메모리에 schema.sql을 그대로 적용한 가짜 D1, Node 22.13+). 스모크 테스트는 같은 핸들러를 로컬 http로 감싸 실제 브라우저에서 등록·조회·게시·방문 집계를 돈다.
