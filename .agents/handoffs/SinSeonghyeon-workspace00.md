# 인수인계: SinSeonghyeon/workspace00 — 도전 모드 정리 · 연습 탭 · 다시보기 · 한마디 수정/삭제 · 왕관 · 새 시즌

## 1. 브랜치·기준·목적

- 브랜치: `SinSeonghyeon/workspace00`. 기준 커밋: `593252b`(통합 브랜치 `wsc-sample-workspace03`의 머리, 2026-10-16 리베이스). 이 문서와 같은 커밋에 들어가는 작업 트리 전체가 인수인계 대상이다.
- 목적: 사용자 요청 2026-10-16 —
  - 도전 모드 정리: 탭 하나 → 캐릭터별 도전 창, 6개 보드 비활성
  - 도전 모드 런 다시보기: 상위 10, 입력 기록 표시
  - 한마디 본인 수정·삭제
  - 순위권 닉네임 왕관
  - 순위표 새 시즌 `'s2'`("대시보드 싹 리셋할까?" → 새 시즌 선택)
  - 2026-10-17: 도전마다 같은 연습 탭(웨이브·더미 격파·백대시 연습, "도전 모드에 넣었다고 여기서 빼면 안될 듯"), 다른 세션 재리뷰 반영

## 2. 합류 순서·의존

- 의존 브랜치는 없다. `wsc-sample-workspace03` 위에 바로 얹힌다.
- 2026-10-17 기준 `origin/main`(`24ab24c`)은 이미 이 브랜치의 조상이다. `main` 쪽에서 새로 받아올 커밋은 없다.
- 다른 브랜치가 결정 38 이후 번호를 새로 만들었으면, 합류 순서대로 번호를 다시 매긴다.
  - 이 브랜치의 결정: 38 challenge-mode, 39 replay, 40 post-edit, 41 crown
  - 번호를 바꾸면 `DECISIONS.md` 제목, `AGENTS.md` 요약, 코드 주석의 `결정 N(slug)`을 함께 바꾼다(`tests/docs.test.cjs`가 대조한다).

## 3. 사용자에게 보이는 변경 (공지 필요: 예)

- 모드 탭은 자유 연습, 기술별 연습 탭, **도전 모드** 탭 하나로 바뀐다.
  - 도전마다 같은 연습 탭이 있다(2026-10-17 사용자 선택): **웨이브 연습 · 더미 격파 연습 · 백대시 연습**. 시작·시간·점수·순위가 없다. 더미 격파 연습은 상·중·하단 더미가 계속 나오고 맞히면 다음 더미, 백대시 연습은 백대시 10초의 타임라인·세트 평가를 시간 제한 없이 쓴다. 탭이 7개라 좁은 화면에서는 탭 줄이 가로로 넘치고, 고른 탭은 고정된 도전 모드 탭 왼쪽으로 스크롤된다(`revealTab`).
  - 도전 모드 탭을 누르면 창이 열리고 지금 캐릭터가 할 수 있는 도전이 나온다. 도전은 웨이브 10초, 더미 격파 30초, 백대시 10초다.
  - 화랑은 웨이브와 백대시, 브라이언은 백대시만 나온다.
  - 도전 모드 탭은 연습 탭과 다른 금테·칼 아이콘 버튼이고, 연습 탭 바로 뒤에 있다(좁은 화면에서 탭 줄이 넘치면 오른쪽 가장자리에 붙어 보인다).
  - 시작은 씬 가운데 위의 큰 "도전 시작" 버튼이다(위에 모드 이름). 시작하면 예전 시작 자리(1P/2P 왼쪽)에 "취소" 버튼이 나오고, 누르면 기록·등록 없이 끝난다.
- 비활성 대상:
  - 초풍 20회, 웨이브 초풍 10회
  - 웨캔기어, 기원초, 초스카이, 도발 제트어퍼의 10회 도전과 그 순위 탭
- 비활성의 의미:
  - 코드, 워커 보드, 저장된 기록은 남는다. 연습 모드도 남는다.
  - 다시 켤 때는 `src/js/20-trials.js`의 `BOARDS_OFF` 한 곳만 고친다.
- 업적 두 개의 조건을 바꿨다. 사범의 짚신은 초풍 7연속, 마왕의 검은 바지는 초풍 20연속이다.
- 다시보기:
  - 순위표에서 다시보기가 있는 행에 ▶가 붙는다. 누르면 대화상자 안의 별도 창(`?replay=1` iframe)에서 실제 화면과 입력 기록이 재연된다.
  - 끝나면 "다시보기 끝 · 기록"이 나오고, 결과가 등록 기록과 다르면 다르다고 알린다.
  - 배포 뒤 새로 등록되는 기록부터 남는다.
- 한마디 본인 수정·삭제:
  - 수정한 글에는 "수정됨"이 붙는다.
  - 답글이 달린 원글을 지우면 "삭제된 글입니다"로 남고 답글은 유지된다(작성자 본인 답글만 있어도 같다).
- 왕관:
  - 도전 모드 보드의 공개 상위 10에 든 닉네임 옆에 붙는다.
  - 보드 수(1·2·3+)에 따라 화려해지고, 1위면 보석이 붙는다. 마우스를 올리면 보드와 순위가 나온다.
  - 모양은 사용자가 고르지 않아 에이전트 기본안으로 했다.
- 순위표 새 시즌(결정 19 보완, 사용자 선택): 워커 `SEASON`이 `'all'` → `'s2'`. 워커가 배포되는 순간 모든 순위표·왕관이 비고, 옛 행은 D1에 남는다(`'all'`로 되돌리면 복구). 공지 항목 `notice.20261016c.7`.
- 미반영 공지 문구도 정리했다.
  - 대상: 이미 있던 미배포 공지 `notice.20261016.2/.3/.7`, `mode.jfsr.desc`, `mode.tju.desc`, `gp.note`, `wsc.note`
  - 10회 도전 순위를 약속하는 문장을 뺐다. 보드가 꺼졌기 때문이다.

## 4. 공지 초안 (이미 반영: `NOTICES` 맨 위 `2026-10-16-challenge`, 키 `notice.20261016c.*`)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 도전 모드 · 다시보기 · 한마디 수정 | 모드 탭의 「도전 모드」에서 순위 도전을 고르고, 순위표 상위 10명의 도전을 다시보기로 볼 수 있습니다. 순위표는 새 시즌으로 다시 시작합니다. | 1. 「도전 모드」 → 캐릭터별 도전(웨이브 10초 · 더미 격파 30초 · 백대시 10초), 가운데 위 「도전 시작」, 진행 중 「취소」(기록 없음), 같은 연습은 웨이브·더미 격파·백대시 연습 탭(시간 제한 없음)<br>2. 다시보기: 상위 10명, ▶로 캐릭터·더미·입력 기록 재생, 지금부터 등록되는 기록부터<br>3. 순위표 새 시즌(이전 순위는 서버 보관, 개인 최고는 그대로)<br>4. 초풍 20회 · 웨이브 초풍 10회와 10회 도전 4종은 도전 모드에서 뺌(연습·기록 유지)<br>5. 업적 7연속·20연속 초풍 = 초풍 연속 성공<br>6. 한마디 내 글·답글 수정·삭제(「삭제된 글」, 「수정됨」)<br>7. 도전 모드 10위 안 닉네임에 왕관 |
| en | Challenge Mode · Replays · Editing posts | Pick a ranked run from “Challenge Mode” in the mode tabs, and watch the top 10 runs on each leaderboard as replays. The leaderboards start a new season. | 같은 7항목(`src/i18n/en.js`) |
| ja | チャレンジモード・リプレイ・投稿の編集 | モードタブの「チャレンジモード」からランキング挑戦を選び、各ランキング上位10人の挑戦をリプレイで見られます。ランキングは新シーズンで再スタートします。 | 같은 7항목(`src/i18n/ja.js`) |

- 같은 날짜의 `2026-10-16-update` 공지와 하나로 합칠지는 통합 담당자가 사용자에게 확인한다.
- 지금은 별도 항목이고, 스모크(`smoke-locales`)는 공지 9개와 맨 위 7항목을 기대한다. 키 순서는 `02-notices.js`의 items 배열(`.1`·`.2`·`.7`·`.3`·`.4`·`.5`·`.6`)이 정한다.

## 5. 배포 전후 사람이 할 일 (순서 고정)

정본은 `worker/README.md`의 "2026-10-16 다시보기 · 한마디 수정/삭제 · 왕관 · 도전 모드 정리" 절이다.

1. `npx wrangler d1 execute mishima-dojo-board --remote --file=migrate-2026-10-16-post-edit.sql`
   - `posts.edited_at`, `posts.deleted`, `replies.edited_at` 열을 더한다.
   - **한 번만, 워커보다 먼저** 실행한다.
2. `npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql`
   - `replays` 테이블과 인덱스를 만든다.
3. `npx wrangler@latest deploy`
   - 2026-10-11·10-15 절의 `jfsr`·`tju`·`CHARS` 변경도 같은 배포에 들어간다.
4. 사이트 푸시
5. 확인과 감시:
   - `/posts` 응답에 `"crowns":{`가 보여야 한다.
   - 도전 한 판 뒤 순위표 내 행에 ▶가 생겨야 한다.
   - 하루 뒤 `wrangler d1 insights`로 `/posts`·`/top` 읽기 행을 본다(결정 24).

순서를 어기면 이렇게 된다(데이터는 잃지 않는다):

- 열 없이 새 워커를 먼저 올리면 `/posts`가 `no such column`으로 실패해 한마디가 안 보인다.
- 옛 워커에 새 사이트가 붙으면:
  - ▶·왕관이 안 보인다.
  - 수정·삭제는 실패 문구를 띄운다.
  - 등록 본문의 `replay`는 무시된다(옛 워커의 본문 한도 2000자를 넘으면 그 등록이 413으로 실패한다 → 반드시 워커 먼저).

## 6. 충돌 가능성이 큰 파일과 보존할 동작

- `src/i18n/{ko,en,ja}.js`:
  - 끝에 `challenge.*`, `replay.*`, `posts.edit…`, `crown.*`, `notice.20261016c.*` 키를 더했다.
  - 업적 이름·설명 4개, `about.modes.*`, `board.empty`(ko/ja), 위 3절의 문구 정리도 들어 있다.
  - 양쪽 키를 모두 살린다.
- `src/js/02-notices.js`: 맨 위 항목.
- `src/js/20-trials.js`:
  - `BOARDS_OFF`, `boardOn`, `CHALLENGE_MODES`, `boardTabs`, 도전 창 함수가 새로 들어갔다.
  - `MODES`에 연습 탭 `wave`·`rush`·`backdash`(각각 `of: 'wave10'|'rush30'|'bd10'`)와 `modeKind`. `PANEL_MODES` 루프는 `modeKind()`로 켠다. 연습 탭 판별은 모두 `practiceOf('rush30'|'wave10')`·`modeKind()`로 한다(모드 이름 직접 비교 금지). `setMode`가 `rushIdle()`을 부르고, `endTrial`은 더미 격파 연습에서 타입 더미를 지우지 않는다.
- `src/js/12-backdash.js`·`12-bd-practice.js`: `mode==='bd10'` 검사를 `bdMode()`(= `modeKind()==='bd10'`, bd10·백대시 연습)로 바꿨다. bd 패널을 고치는 브랜치는 `bdMode()`를 쓴다.
- `src/js/00-core.js`: `bdFrameNo`·`bdF`가 `BD_ROUND`(2e-4f) 치우침을 더해 반올림한다(정확히 반 프레임인 간격이 라이브·다시보기에서 같게, 재리뷰 2026-10-17).
- `src/js/23-settings-ui.js`: 모드 탭 클릭의 `scrollIntoView`를 `revealTab`으로 바꿨다. 1P/2P 콜백은 이름 있는 `setSide`가 됐고, 더미 격파 연습이면 새 더미를 세운다.
  - `startTrial`은 `recBegin`, 카운트다운 끝은 `trialGo(t)`로 분리됐다(REPLAY 창에서는 GO를 녹화에서 받는다).
  - `endTrial`은 `recFinish`·`recDrop`을 부르고, REPLAY면 `replayEnded`.
- `src/js/13-button.js`:
  - `onButton`이 `buttonIn(buttonChord(n), t)` 한 줄이 됐고, 본문은 `buttonIn`으로 옮겼다.
  - **버튼 처리를 고치는 브랜치는 `buttonIn` 쪽에 넣어야** 다시보기에 반영된다.
- `src/js/11-crouch-dash.js`: `onDir` 맨 앞의 `recDir`.
- `src/js/32-rush.js`: `rushSeed`·`rushRng`, 더미 격파 연습 `rushIdle`(그리고 `rushStrike` 맨 앞의 연습 분기). 더미 무작위는 `Math.random` 대신 `rushRng()`를 쓴다. `rushStrike`의 `recHit`·`replayHit`도 보존한다.
- `src/js/31-stage.js`: `tryHit(move, until, force)`.
- `src/js/29-backend.js`:
  - `boardDrain`: `/submit`이 413 `too_large`이고 다시보기가 붙어 있으면 다시보기를 뺀 본문으로 한 번 더 보낸다(옛 워커·롤백 대비).
  - `live.crowns`, `live.edit`, `setPosts(rows, crowns)`(모든 호출이 `res.crowns`를 넘긴다), `renderPosts`(자리표시·왕관·수정됨·본인 도구), 순위 ▶, `boardEntry.replay`.
  - REPLAY 창에서는 `boardFetch`가 던지고 `boardSubmit`은 아무것도 하지 않는다.
- `src/js/03-store.js` `REPLAY`: `save()` 무효. `05`·`07`·`08`·`09`·`25`·`27`·`28`·`36`에 `REPLAY`면 끄는 줄이 있다.
- `src/js/35-dojo3d.js`: `frame()` 맨 앞의 `replayFrame(now)`.
- `src/app.html`:
  - `#modes`의 측정 탭 5개를 `#challengeOpen` 하나로 바꿨다. 연습 탭 `wave`(자유 연습 뒤)·`rush`·`backdash`(`ju` 뒤, `#challengeOpen` 앞)를 더했다.
  - `#dStart`는 `.stage-actions`에서 `.hud` 안 `#hudCenter` 바로 뒤 `.stage-start`로 옮겼다(CSS 형제 선택자가 이 순서에 기댄다). `.stage-actions`의 그 자리에는 `#dCancel`.
  - `#challengeDlg`·`#replayDlg`를 더했다.
  - `35-replay.js` include는 `35-dojo3d`와 `36-boot` 사이에 둔다.
- `src/style.css`: 끝에 도전 창·다시보기·`body.replay-view`·본인 도구·자리표시·왕관, 도전 모드 탭(`.challenge-tab`)·시작(`.challenge-start`)·취소(`.stage-cancel`) 스타일을 더했다(색은 토큰만).
- `src/i18n`: `trial.start` 문구가 "시작" → "도전 시작"(en `START`, ja `挑戦開始`), `trial.cancel*` 키 추가.
- `worker/index.js`:
  - 원글 삭제 순서(삭제 시도 → 자리표시 → 빈 자리표시 정리 → 표 삭제), `/vote` 쓰기는 글 확인과 한 문장, `/edit`은 삭제된 글이면 404, `/submit`은 `keepReplay`가 돌려준 id로 다시보기 표시를 고친다(두 번째 `top()` 없음).
  - 상수: `BODY_MAX`·`SUBMIT_MAX`·`REPLAY_*`·`CROWN_BOARDS`
  - 함수: `cleanReplay`·`publicTop`·`keepReplay`·`crowns`·`dropCrowns`
  - 경로: `/replay`·`/edit`·`DELETE /post`
  - 그 밖: `/submit`의 다시보기 보관, 삭제·밴 때 캐시 버림, 삭제된 글에 답글·투표 거부
- `worker/schema.sql`과 새 파일 `worker/migrate-2026-10-16-post-edit.sql`.
- `AGENTS.md`·`DECISIONS.md`: 결정 38~41을 추가했고, 13·26·31·33·37에 "결정 38로 비활성" 등의 주석을 달았다.
- `src/js/11-crouch-dash.js`: `endCommand`가 더미 격파 연습에서도 웨이브 연속을 유지한다(`practiceOf('rush30')`).
- `src/pages/{ko,en,ja}.js`·`README.md`: 꺼진 모드 문장 정리, 도전 모드·다시보기·연습 탭 소개, 백대시 가이드의 연습 순서가 백대시 연습 탭을 가리킨다.
- 테스트: `tests/i18n-pages.test.cjs`(공지 순서·개수, 모드 목록), `tests/board.test.cjs`(빈 `/posts`가 `{rows:[],crowns:{}}`, 시즌 `'s2'`), `tests/chars.test.cjs`·`tests/tju.test.cjs`(캐릭터별 모드 목록에 연습 탭), `tests/backend.test.cjs`·`tests/strikes-rush.test.cjs`·`tests/backdash.test.cjs`(연습 탭 3개), `tests/replay.test.cjs`(반 프레임 bd10).
- 스모크의 탭 목록 기대값: `smoke-jfsr`(카즈야 `free,wave,wsc,giwon,rush,backdash,challengeOpen`, 화랑 `free,wave,jfsr,backdash,challengeOpen`), `smoke-tju`(브라이언 `free,tju,ju,backdash,challengeOpen`), `smoke-chrome`(보이는 탭 7개), `smoke-locales`(연습 탭 가이드 링크). 다른 브랜치가 탭을 더하면 이 값들을 함께 고친다.

## 7. 테스트

- 단위 `node --test "tests/*.test.cjs"`: 350개 모두 통과(연습 탭 3개, 반 프레임 bd10 재생, 취소 버튼, 새 시즌, 리뷰 반영 회귀 테스트 포함: 칸 경계 입력 재생, 413 재등록, 원글 삭제 경쟁 상태, 몰아서 재생할 때 더미 순서, 메시지 출처, 수정 초안 kind).
  - 새 `tests/replay.test.cjs`: wave10, bd10, rush30 녹화 → 주사율 60, 144, 30Hz 재생 결과가 같다. 늦은 프레임 TICK, 설정 전달, 창 격리, 대화상자 흐름도 확인한다.
  - `board.test.cjs`에 다시보기, 왕관, 수정·삭제, 마이그레이션 검사를 더했다.
- 스모크(로컬 Chrome) 12개: `smoke-chrome`, `smoke-backdash`, `smoke-jfsr`, `smoke-tju`, `smoke-giwon`, `smoke-wsc`, `smoke-mist`, `smoke-design`, `smoke-bindings`, `smoke-sound`, `smoke-locales`, 새 `smoke-replay`.
  - 2026-10-17 연습 탭 뒤 전체 실행: 11개 통과. `smoke-replay`는 기능 확인은 모두 통과했지만 외부 글꼴(`fonts.gstatic.com` woff2) 요청이 `ERR_CONNECTION_CLOSED`로 끊겨 실패로 잡혔다(스모크가 이 네트워크 오류는 거르지 않는다).
  - 재리뷰 반영 뒤 영향 받는 5개(`backdash`·`chrome`·`jfsr`·`tju`·`replay`)를 다시 돌려 모두 통과했다(`smoke-replay` 포함).
  - 기존 스모크는 도전 모드 창을 거치도록 고쳤고, 꺼진 10회 도전은 "숨겨져 있음"을 확인하도록 바꿨다.
  - `smoke-chrome`에 도전 시작 위치(씬 가운데 위)·취소(타이머가 사라지고 기록·등록 없음) 확인을 더했다.
  - `smoke-chrome` 한마디 구간에 다음을 더했다(실제 워커): 다른 닉네임의 wave10 1위 → 답글에 왕관(`c1 first`, 툴팁), 내 글 수정 → "edited", 내 답글 삭제, 남의 답글이 달린 내 글 삭제 → "This post was deleted." 자리표시.
  - `smoke-replay`: 페이지를 로컬 http로 띄워 실제 키보드로 wave10·rush30을 하고, 등록한 뒤 ▶를 누른다. 확인하는 것:
    - iframe 재연: REPLAY 배지, 입력 기록, 타이머
    - 끝 문구가 등록 기록과 같다
    - 재생 중 서버 요청은 `GET /replay` 하나뿐이다
    - 저장된 기록이 바뀌지 않는다
    - 처음부터·닫기
- 알려진 한계:
  - 일시정지·배속은 없다(판정이 실시간 시계 기준).
  - 다시보기는 증명이 아니다(형식·크기만 검사, 자동 치팅 판정 없음 방침).
  - 왕관은 워커 인스턴스마다 최대 5분 늦을 수 있다.
  - 섀도 밴된 본인 화면에는 자기 행에만 ▶가 없고 왕관도 없다(밴을 짐작할 단서). 2026-10-17 사용자 결정으로 그대로 둔다(결정 39 전문).

## 8. 바뀐 결정·문서

- 결정 38~41을 새로 만들었다. 13·26·31·33·37에는 비활성·시드 주석을 달았다. 19에는 새 시즌 `'s2'`(사용자 결정)을 더했다. 38에는 실전 느낌 배치와 연습 탭(2026-10-17 사용자 선택), 39에는 섀도 밴 본인 화면을 그대로 두는 사용자 결정(2026-10-17)을 더했다. 정본은 `DECISIONS.md`이고 요약은 `AGENTS.md`에 있다.
- 함께 갱신한 문서:
  - `CODE_MAP.md`: 파일 지도 `35-replay.js`, 기능별 색인 "도전 모드"·"다시보기", 입력 처리 순서의 `buttonIn`, 테스트 목록, 다시보기 결정성 규칙(칸 가장자리 이동·`BD_ROUND`), 연습 탭 판별 규칙(`modeKind`·`practiceOf`)
  - `README.md`·`src/pages/{ko,en,ja}.js`: 모드 목록, 다시보기, 연습 탭
  - `worker/README.md`: 경로 표, 배포 순서 1단계의 열 추가, 2026-10-16 절, 설계
  - `PLAN.md`: 배포 대기 2항목, 코드 정리 주석
  - `log/2026-10.md`: 여러 줄(마지막 2026-10-17 연습 탭)

## 9. 합류 후 브라우저에서 확인할 것

1. 모드 탭의 "도전 모드"를 누르면 창에 웨이브 10초·더미 격파 30초·백대시 10초가 보인다.
   - 하나를 고르면 창이 닫히고, 탭에 모드 이름이 적힌다.
   - 씬 가운데 위에 "도전 시작" 버튼이 보이고, 누르면 사라지며 카운트다운이 같은 자리에 뜬다. 1P/2P 왼쪽에 "✕ 취소"가 나오고, 누르면 "도전을 취소했습니다"만 나오고 기록·순위는 그대로다.
   - `?c=hwoarang`이면 웨이브·백대시만, `?c=bryan`이면 백대시만 나온다.
2. 웨캔기어·기원초 연습 탭에 10회 도전 버튼이 없다. 순위표 탭은 3개다.
   - 탭 줄에 웨이브 연습·더미 격파 연습·백대시 연습이 있고, 시작 버튼이 없다. 더미 격파 연습은 누르자마자 상·중·하단 더미가 서고 맞히면 다음 더미, 백대시 연습은 아래에 타임라인·세트 평가가 나온다.
   - 더미 격파 연습에서 1P ↔ 2P를 바꾸면 더미가 캐릭터 앞에 새로 선다(캐릭터가 더미 너머로 튀지 않는다).
   - 창을 휴대폰 폭으로 줄이면 탭 줄이 가로로 스크롤되고, 더미 격파 연습·백대시 연습을 눌러도 오른쪽 끝의 도전 모드 버튼에 가리지 않는다.
3. 도전 한 판을 등록하면 순위표 내 행에 ▶가 생긴다.
   - 누르면 대화상자에서 캐릭터, 입력 기록, HUD가 재생되고, 끝에 "다시보기 끝 · 기록"이 나온다.
   - "처음부터"를 누르면 다시 재생되고, 닫으면 멈춘다.
4. 한마디에서 내 글의 수정·삭제를 확인한다.
   - 수정하면 "수정됨"이 붙는다.
   - 다른 닉네임의 답글이 달린 글을 삭제하면 "삭제된 글입니다"가 남는다.
5. 도전 모드 순위표 10위 안의 닉네임에 왕관이 붙는다. 마우스를 올리면 보드와 순위가 나온다.
