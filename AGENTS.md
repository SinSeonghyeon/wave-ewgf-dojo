# AGENTS.md

## 목적

모든 AI 에이전트(Claude Code, Codex, 기타)가 매 세션 지켜야 하는 최소 규칙과 문서 라우팅만 둡니다. 프로젝트 지식과 진행 상황은 `.agents/docs/`에서 필요할 때만 읽고, 같은 규칙을 여러 문서에 반복하지 않습니다. Claude Code는 `CLAUDE.md`(`@AGENTS.md` 한 줄)로 이 파일을 불러옵니다. **이 파일에는 구현 세부를 쓰지 않는다**(함수·상수·픽셀 값은 `CODE_MAP.md`, 결정 전문은 `DECISIONS.md`).

## 프로젝트 기본 정보

- 이름: 미시마 도장 (Mishima Dojo / 三島道場). 철권 미시마류 웨이브 대시·초풍 입력을 브라우저에서 프레임 단위로 판정하는 연습 도구. 비공식 팬 제작.
- 코드: 원본은 `src/`(`app.html` 셸·`style.css`·`i18n/{ko,en,ja}.js`·`js/NN-*.js`·`assets/`). `tools/assemble.js`가 외부 라이브러리 없는 **한 페이지**로 조립하고, `node tools/build-site.js`가 루트·ko/en/ja 앱을 `_site/`에 만든다. 저장소 루트에 `index.html`은 없다. 로컬 미리보기는 루트 `preview.cmd`(빌드 후 `tools/serve.js`로 `_site/`를 http://localhost:8080/ 에 띄워 연다 — 폴더 주소가 GitHub Pages처럼 `index.html`로 열리게, CRLF 유지).
- 배포: GitHub Pages, main 푸시 → `.github/workflows/pages.yml`(단위 테스트 → 빌드 → `_site/` 배포). 커스텀 도메인 https://mishimaryu.com/ (루트 `CNAME`, Cloudflare Registrar 2026-09-13 구매, 자동 갱신 꺼짐 — 만료 전 사용자가 결정). 예전 주소 https://sinseonghyeon.github.io/wave-ewgf-dojo/ 는 301. 저장소 이름 `wave-ewgf-dojo`·도메인·`CNAME`·워커 `ALLOWED_ORIGINS`는 사용자 결정 없이 바꾸지 않는다.
- 주소 모음: 저장소 https://github.com/SinSeonghyeon/wave-ewgf-dojo · 백엔드 Worker https://mishima-dojo-board.mishima-dojo.workers.dev · 후원 Ko-fi https://ko-fi.com/misimadojo (en/ja) · 카카오페이 https://qr.kakaopay.com/Ej8EBCpJu (ko, 휴대폰 전용) · 문의 tlstjdgus3@gmail.com (푸터·README·LICENSE) — 코드의 `BOARD_URL`(`src/js/26-backend-config.js`)·`DONATE`(`src/js/27-donate.js`)와 같아야 한다.
- 테스트: `node --test "tests/*.test.cjs"` (Node 22.13+, 의존성 없음. 따옴표째 입력하면 Node가 직접 펼친다. 가짜 D1이 `node:sqlite`를 쓴다) · 브라우저 스모크 `node tests/smoke-chrome.js` 외 `tests/smoke-*.js` (로컬 Chrome/Edge 헤드리스, CDP).
- 개발 도구: `tools/` (커밋 대상). `assemble.js` 조립, `build-site.js` 배포 산출물, `cdp.js` 헤드리스 브라우저 공용 모듈, `make-og.js` `og.png` 재생성, `update-bgm.js`·`measure-bgm.js` BGM 목록·게인 생성, `board-admin.js` 관리자.
- 백엔드: `worker/` (Cloudflare Worker + D1: 누적 순위·방문자 수·한마디). 배포는 `npx wrangler deploy`(`worker/README.md`). 앱은 `fetch`로만 호출하며 `BOARD_URL`이 비면 백엔드 UI 전체가 숨겨진다.
- 사용자: 한국어. 철권 플레이어. C++·Unity 경험, 웹은 익숙하지 않음. 설명은 간결하게, 용어는 격투게임 표기(6N23, d/f, 저스트) 그대로.

## 문서 라우팅

- 남은 작업: `.agents/docs/PLAN.md`(열린 항목만). 끝낸 작업은 거기서 지우고 `.agents/docs/log/YYYY-MM.md`에 한 줄. 2026-09까지의 전체 이력은 `archive/PLAN-2026-09.md`(검색할 때만).
- 코드를 고칠 때: `.agents/docs/CODE_MAP.md`의 **앞부분(파일 지도·기능별 색인·입력 처리 순서)만 먼저** 읽고, 나머지 "서브시스템 상세"는 필요한 절만 `rg`로 찾아 읽는다.
- 설계 결정 전문: `.agents/docs/DECISIONS.md`. 아래 요약과 다르면 전문이 정본이다.
- 기능 브리핑(그 기능을 건드릴 때만): `GIWONCHO.md`(기원권·기원초) · `MIST_EWGF.md`(무족초) · `WSC_PRACTICE.md`(웨캔기어) · `LOCALIZED_PAGES.md`(언어별 페이지·배포) · `PROMO.md`(홍보 초안). 지난 릴리스·통합·디자인 기록은 `archive/`, 코드 리뷰는 `reviews/`.
- 여러 기능 브랜치를 한 번에 합류할 때: `.agents/docs/MERGE_PROCESS.md`. 각 기능 브랜치는 `.agents/handoffs/<브랜치명>.md`를 하나씩 커밋하고, 통합 담당자는 내용을 반영한 뒤 `main` 합류 직전에 `.agents/handoffs/`의 임시 문서를 모두 삭제한다.
- 사람용 소개·조작법: 루트 `README.md`. 에이전트 규칙은 넣지 않는다.
- 긴 파일은 `rg`로 위치를 좁힌 뒤 필요한 구간만 읽는다.

## 설계 결정 (사용자 결정. 바꾸려면 먼저 물을 것)

번호는 바꾸지 않는다(철회해도 번호는 남긴다). 코드 주석은 `결정 N(slug)`로 인용하고 `tests/docs.test.cjs`가 번호·slug를 `DECISIONS.md` 제목과 대조한다. 결정을 바꾸면 `DECISIONS.md` 전문을 고치고 여기 요약도 맞춘다.

1. wave-input — 웨이브는 `6N23 6 N 6N23 …`. 시작 6 뒤 중립을 생략한 `623`도 같은 경로로 허용(2026-09-22 실게임 확인, 일반 초풍·나락·웨캔기어 공통). 캔슬 6 누락/시작 6 누락을 구분한다.
2. ewgf-judge — 초풍은 대각·RP 입력 시각을 브라우저 공통 60Hz 격자(`floor(t/(1000/60)+0.5)`)에 놓아 같은 칸일 때만 성공. 옛 `store.window`는 저장·통신 호환용.
3. no-official-ip — 철권 공식 캐릭터 이름·그림을 쓰지 않는다(테스트가 금지어 검사). 자체 리소스가 원칙, 사용자가 추가한 BGM만 예외.
4. single-page — 배포는 외부 라이브러리 없는 한 페이지. 원본은 `src/`로 나누고 `tools/assemble.js`가 조립(2026-09-30 승인, 번들러·npm 의존성 없음). 런타임 외부 자원은 Google Fonts·백엔드 Worker·AdSense 사이트 연결 스크립트뿐 — 늘리려면 먼저 묻는다. `/ko/`·`/en/`·`/ja/`는 해당 언어 앱을 바로 연다. 가이드·개인정보처리방침은 앱과 별도의 정적 글(`src/pages/` → 빌드 생성, 2026-10-01). 가이드 글에만 운영자 YouTube 영상(nocookie iframe)을 넣을 수 있다.
5. theme-layout — 다크 단일 테마, 색 토큰은 `:root`에만. WebGL 3D 도장 배경 + 기존 2D SD 캐릭터(WebGL 불가 시 Canvas 대체). 화면 배치 세부는 전문.
6. app-name — "미시마 도장" / Mishima Dojo / 三島道場.
7. i18n — 사용자에게 보이는 모든 문자열은 `I18N`(ko/en/ja 같은 키, `src/i18n/`). 동적 문구는 `[key, ...args]`나 클로저로 저장해 언어 전환 때 다시 그린다.
8. sound — BGM은 첫 입력 뒤 `bgm/` 셔플 재생(Web Lock 단일 창), 효과음은 완료된 크라우치 대시·기술 출력·실제 백대시에 재생(헛친 기술도 기술음은 나고, 피격음은 명중에만). 소리는 연출 끄기와 독립. 부트 때 `Audio`를 만들지 않는다. 음량 보정·재생목록 규칙은 전문.
9. visual-only-motion — 걷기·대시·백대시 연출은 판정·통계를 바꾸지 않는다(백대시 판정은 결정 17의 별도 `bd` 머신).
10. license — 오픈소스 아님(루트 `LICENSE`, 모든 권리 보유). MIT 등 오픈소스 라이선스를 붙이지 않는다.
11. touch — 터치 기기에서 ←·↓·→ + 공격 버튼 오버레이. 키보드·패드와 같은 입력 경로, 판정 불변, 같은 순위 보드.
12. strikes — 통발(f,f+2)·나락(6N23+4)은 `strike` 경로. 초풍 성공률·연속·`session.tries`에 잡히지 않고 "!"·연속 표기가 없다.
13. rush30 — 더미 격파 30초: 상단=초풍·중단=통발·하단=나락 10점, 크라우치 대시 최대 3점, 격파해도 웨이브 콤보 유지.
14. result-tiers — 측정 결과 SS~D 등급(순위 상위 %, 10명 미만은 10명으로 계산). 웨이브 상위 띠는 워커 `cut10`.
15. wardrobe — 옷장 6슬롯·오마주 세트(캐릭터 이름 금지)·업적 25 = 아이템 25·출석 선물·보상 상자. 진행은 이 브라우저에만 저장, 판정·통계는 읽기만.
16. shadow-ban — 순위 조작은 운영자가 섀도 밴(`tools/board-admin.js`). 앱 코드는 관여하지 않는다.
17. backdash — 한국식 백대시 `414 N …`는 `cd`와 독립된 `bd` 머신(자유 연습·bd10). `BD` 상수는 실측이 아닌 가정값, 등급 이름에 Perfect/Great/Good 금지.
18. votes — 한마디 👍/👎: 닉네임+토큰당 글 하나에 1표, `POST /vote`는 멱등 설정, 누가 표했는지 돌려주는 API 없음.
19. cumulative-ranking — 순위 초기화 없음(누적, 닉네임·보드당 최고 1건). 되살리려면 워커 `seasonKey()` 한 곳.
20. notices — 정적 `NOTICES`(`src/js/02-notices.js`)를 최신순 누적, NEW 배지, 기존 방문자에게 새 공지 1회 자동 표시(측정·대화상자 중단 금지).
21. donate-nudge — 개인 최고 결과창 후원 안내와 10분 연습 후 헤더 말풍선은 각각 KST 하루 1회.
22. replies — 한마디 1단계 대댓글(재대댓글 없음), 원글과 같은 인증·길이·레이트 리밋.
23. score-delete — 순위표 본인 행만 삭제 버튼. 서버가 닉네임+토큰으로 소유권 검증.
24. d1-quota — D1 무료 한도 절약: 자동 폴링 금지, 조회는 최초 로드·사용자 조작·변경 때만. 쿼리 변경 전후 `wrangler d1 insights`로 확인.
25. wsc — 웨캔기어 전용 모드: 전체 입력 평가, A/B 프레임 기준, 랜덤 과제 10회 도전. 다른 기술과 인식은 공유하되 wsc 모드에서는 기존 통계·업적을 막는다.
26. wsc-board — 웨캔기어 10회 완주만 전용 보드에 자동 등록(score=성공 수, tie=최고 연속).
27. mist — 무족초 `6N3+RP`: 성공과 최속(앞·중립 각 1f) 구분. 실제 명중·딜캐 성공으로 표현하지 않는다.
28. input-log — 입력 기록은 같은 60Hz 칸의 입력을 한 행으로 묶는다(방향 유지 프레임·버튼 간격 표시).
29. pad-bindings — 설정의 키보드/게임패드 탭, 동작별 기본/보조 입력, 키 확인 토글. 설정 중에는 연습 판정 차단.
30. giwon — 기원권 `↘+RP`는 모든 모드에서 `strike`. 기원초는 **링크**이며 초풍이 49f(`GP_TARGET`)까지 발동하면 성공(루트 무관). 경직 중 동작·연습 모드·연출 규칙은 전문. `GIWON` 상수는 가정값.
31. giwon-board — 기원초 10회 완주만 전용 보드에 자동 등록(결정 26과 같은 규칙).

**워커가 필요한 변경**(새 보드·경로·테이블)은 워커 재배포·스키마 적용이 사용자 작업이고 **사이트 푸시보다 먼저**다. 순서와 명령은 `worker/README.md` "배포 순서" 한 곳에만 둔다.

## 작업 원칙

- 요구가 모호하면 추측으로 진행하지 말고 해석안을 제시하거나 묻는다. 더 단순한 대안이 보이면 착수 전에 제안한다.
- 코드는 `src/`만 고친다. 새 JS 파일은 `src/app.html`에 include 줄을 넣고 `CODE_MAP.md` 파일 지도에 한 줄을 더한다(테스트가 빠진 파일을 잡는다). 생성 상수(`BGM_TRACKS`·`BGM_GAIN`)는 도구로만 고친다.
- 코드 변경 후 최소 검증: 단위 테스트 → 브라우저 스모크 테스트. 실패한 테스트는 결과 그대로 보고한다. 여기까지가 에이전트 몫이고, 커밋·푸시는 사용자가 한다(아래 "커밋·푸시는 사용자가" 참조).
- 기능을 끝내면 `PLAN.md`에서 그 항목을 지우고 `log/YYYY-MM.md`에 날짜와 한 줄을 남긴다. 설계 결정이 바뀌면 `DECISIONS.md` 전문과 위 요약을 고친다. 코드 구조가 바뀌면 `CODE_MAP.md`를 고친다.
- 여러 기능 브랜치를 묶어 배포할 예정이면 `.agents/docs/MERGE_PROCESS.md` 형식으로 자기 브랜치의 임시 인수인계 문서를 남긴다. 공지 초안, 선행 배포·마이그레이션, 충돌 예상 파일, 테스트 결과를 빠뜨리지 않는다.
- 작업을 마치면 마지막 보고에 **검증 안내**를 넣는다: 바뀐 파일 목록(`git status --short`), 사용자가 브라우저에서 직접 확인할 항목(무엇을 눌러서 무엇이 보여야 하는지), 실행한 테스트 결과, 그리고 그대로 붙여 넣을 수 있는 `git add <파일...>` + `git commit` + `git push` 명령. 커밋 메시지 초안도 함께 준다.

## 커밋·푸시는 사용자가 (2026-09-11 사용자 결정)

- 에이전트는 `git commit`, `git push`를 하지 않는다. 테스트를 통과시킨 작업 트리 상태로 두고 검증 안내를 보고하면 끝이다. 사용자가 직접 확인한 뒤 커밋·푸시한다.
- 예외: 사용자가 그 세션에서 "커밋해라", "푸시해라"라고 명시적으로 지시한 경우에만 한다. 그때도 파일을 명시해서 추가한다.
- Pages 반영 확인(`curl -s <배포 주소> | grep -o "<title>[^<]*</title>"`)은 사용자가 푸시했다고 알린 뒤에만 한다.
- 세션 시작 시 작업 트리에 미커밋 변경이 있으면 이전 세션의 검증 대기 작업일 수 있다. `git checkout`·`git reset`·`git stash`로 되돌리지 말고, 어떤 파일이 바뀌어 있는지 보고한 뒤 그 위에서 이어서 작업할지 사용자에게 묻는다.
- 미커밋 변경이 있는 상태에서 원격이 앞서 있으면 `git reset --hard origin/main`을 하지 않는다. 상황을 보고하고 사용자 지시를 기다린다.

## 파일·Git 안전

- 커밋은 파일을 명시해서 추가한다. `git add -A`, `git add .` 금지. 이 폴더에는 다른 세션이나 사용자가 파일을 수시로 떨어뜨린다(2026-09-11에 외부 mp3가 공개 저장소에 쓸려 들어가 히스토리를 재작성했다). `git status --short`에 낯선 파일이 있으면 커밋에 넣지 말고 사용자에게 묻는다.
- 같은 폴더에서 여러 에이전트 세션이 동시에 돌 수 있다. 시작할 때 `git status`, `git log origin/main..main`, `git log main..origin/main`으로 갈라짐을 확인한다. 로컬 main이 원격과 다르면 작업 트리 변경이 **없을 때만** `git fetch && git reset --hard origin/main`으로 맞춘다. 변경이 있으면 위 "커밋·푸시는 사용자가" 규칙대로 사용자에게 묻는다.
- 커밋하지 않을 임시 파일·실험 스크립트는 `.sandbox/<topic>/`(gitignore됨)에 둔다. 영속할 문서만 `.agents/docs/`에 둔다.
- 커밋과 `git push`는 사용자가 한다(위 절 참조). force push, 히스토리 재작성, 공개 저장소 생성, 저장소 설정·권한 변경은 사용자가 그 작업을 명시적으로 지시했을 때만 한다. 도구 권한이 막히면 필요한 명령을 안내하고 사용자가 `! <명령>`으로 실행하게 한다.
- 저작권이 의심되는 파일(게임 음원, 공식 이미지)은 커밋하지 않고 사용자에게 출처를 확인한다.
