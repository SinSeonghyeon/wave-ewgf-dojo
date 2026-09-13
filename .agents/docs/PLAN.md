# 수익화 플랜

작성일: 2026-09-11. 진행 상태는 이 문서의 체크박스로 관리한다. 완료한 항목은 `[x]`로 바꾸고 날짜를 적는다.

## 전제

- 이 도구 하나로 큰돈은 어렵다. 순서는 **유입 → 저마찰 수익 → 유료 제품**.
- 국내 철권 유저 풀만으로는 광고·제휴 수익이 월 몇만 원 수준. 영어 지원과 커맨드 확장으로 시장을 넓혀야 유료 제품이 성립한다.
- claude.ai 아티팩트는 외부 스크립트가 막혀 광고·분석·제휴 위젯을 못 붙인다. 공개 주소가 모든 것의 선행 조건.
- 철권 공식 캐릭터 이름·이미지는 계속 쓰지 않는다. "철권 초풍 연습" 같은 설명적 언급은 SEO 제목에 써도 된다.

## 1단계. 공개 주소와 유입

- [x] 1-1. GitHub 저장소 생성 + GitHub Pages 배포 (2026-09-11). https://sinseonghyeon.github.io/wave-ewgf-dojo/ · 저장소 https://github.com/SinSeonghyeon/wave-ewgf-dojo
- [ ] 1-2. 짧은 도메인 연결 (선택). Pages 기본 주소로 먼저 시작해도 됨.
- [x] 1-3. 언어 토글 ko/en/ja (2026-09-11). 185개 문자열 사전, 브라우저 언어 자동 감지, localStorage 저장. 일본어까지 포함해 완료.
- [x] 1-4. 결과 공유 카드 (2026-09-11). 스펙:
  - 측정 모드 종료(endTrial) 시 결과 옆에 "공유 카드" 버튼. 자유 연습에서는 "세션 카드"로 현재 세션 통계.
  - 카드는 오프스크린 캔버스 1200×630(OG 비율)에 직접 그린다. 외부 라이브러리 없음(설계 결정 4). 내용: 앱 이름/로고 風, 모드명, 핵심 수치(성공률 또는 대시/초, 평균 오프셋, 최고 연속), 히스토그램 또는 웨이브 속도 미니 차트, 판정 폭, 날짜, 하단에 공개 주소.
  - 언어는 현재 UI 언어를 따르고 문자열은 I18N 사전에 추가(설계 결정 7). 캔버스 폰트는 displayFont()와 --body 규칙을 따른다.
  - 동작: 클립보드 복사(navigator.clipboard.write + ClipboardItem, 실패 시 안내) / PNG 다운로드(a[download]) / 트위터 공유 텍스트(intent URL, 텍스트만) / 디스코드는 이미지 복사 안내.
  - 캐릭터 그림은 자체 SD 도트만 사용(설계 결정 3).
  - 테스트: 카드 생성 함수가 순수 데이터 → 그리기 명령으로 분리되도록 만들어 node 테스트에서 텍스트 구성을 검증. 브라우저 스모크 테스트에 카드 생성 1회 추가.
- [x] 1-5. SEO 기본 (2026-09-11). `<title>`·meta description(한/영 병기, 정적 하나)·robots·theme-color·canonical, Open Graph/Twitter Card, 정적 `og.png`(1200×630, `node tools/make-og.js`로 재생성). 검색용 문서 제목은 `app.docTitle` 키(ko/en/ja)로 앱 이름과 분리.
- [ ] 1-6. 배포처 공략. 디시 철권 갤러리, 철권 디스코드, r/Tekken, 트위터 FGC. 치지직·유튜브 철권 스트리머 5명에게 DM ("방송에서 써보라").
- [x] 1-7. 방문 집계 (2026-09-12). 외부 스크립트 없이 자체 Worker `/visits`로. 브라우저당 KST 하루 1회(localStorage `visitDay`), 헤더 우상단에 "오늘 방문 N · 누적 N". IP 등 개인정보 저장 없음.
- [x] 1-8. 주간 순위(리더보드) (2026-09-12). Worker 배포 주소 `https://mishima-dojo-board.mishima-dojo.workers.dev`(`index.html`의 `BOARD_URL`). Cloudflare 계정은 사용자 소유, D1 `mishima-dojo-board`(APAC), workers.dev 서브도메인 `mishima-dojo`. 스펙(2026-09-12 사용자 결정):
  - 보드 3개 = 측정 모드 3개. 정상 종료(endTrial)한 결과만 등록 가능. 웨이브 10초: 대시/초(동점 최고 연속) · 초풍 20회: 성공률(동점 |평균 오프셋| 작은 쪽) · 웨이브 초풍 10회: 성공률(동점 측정 중 평균 대시/초).
  - 주간 초기화: 월요일 0시 KST. 지난 기록은 지우지 않고 조회에서만 빠짐. 상위 10위 + 내 순위/참가자 수/상위 %(10위 밖이면 표 아래에 내 행). (2026-09-12 사용자 결정으로 20→10)
  - 식별: 계정 없음. 첫 방문에 닉네임(2~12자) 지정 모달이 뜨고 정해야 플레이 가능. 닉네임은 서버에서 유일(대소문자·전각 무시)하고 `POST /nick`이 준 토큰을 localStorage(`store.nick`/`store.nickToken`)에 보관, 등록·게시에 토큰 필요. 브라우저 데이터를 지우면 새 닉네임을 정해야 한다(옛 닉네임은 영구 점유). 보드마다 주간 최고 기록 1건만 유지(서버 업서트, 더 나쁘면 무시). 드릴이 끝나면 항상 자동 등록. 순위 카드는 항상 화면에 표시. (2026-09-12 사용자 결정)
  - 결과 창: 측정 모드가 끝나면 0.9초 뒤 공유 카드 창이 자동으로 열리고 위에 등급 배너(상위 %별 7단계 제목·코멘트, 등급별 색·애니메이션). 카드 이미지와 트윗 문구에도 '주간 N위 / M명 · 상위 P% · 등급'이 들어간다. 참가 10명 미만이면 10명으로 계산해 등급을 매긴다. 코멘트 문구는 사용자가 추후 검토 예정(I18N `tier.N.title/msg`). 실존 프로게이머 이름은 쓰지 않았다(설계 결정 3의 취지).
  - 치팅 방지 없음(사용자 결정). 서버는 형식·범위만 검사. 판정 폭은 보드를 나누지 않고 열에 표기.
  - 백엔드: Cloudflare Worker + D1(`worker/`). 앱은 `fetch`만 쓰므로 단일 파일·외부 라이브러리 없음 유지. `BOARD_URL`이 비어 있으면 UI 전체가 숨겨진다.

- [x] 1-9. 한마디 게시판 (2026-09-12 사용자 결정: 실시간 채팅 대신). 닉네임 + 200자 한 줄, 최신 50개, 1분마다 새로 고침, IP당 1분 3개(Cloudflare 레이트 리밋 바인딩), 관리자 삭제는 `ADMIN_TOKEN`으로 `DELETE /posts/:id`. 스레드·수정·신고 없음. 스팸이 문제 되면 그때 검토.

- 2026-09-12 (4차): 용어 통일(사용자 결정). 자유 연습이 아닌 세 측정 모드를 가리키던 "드릴"을 화면·문서에서 "측정 모드"(en trial, ja 測定モード)로, 코드에서는 drill→trial(trial 객체, startTrial/endTrial/trialTick/renderTrialRank, I18N trial.*, CSS .trial, shareSrc.kind 'trial')로 바꿨다. og.footer가 바뀌어 og.png 재생성. 지난 진행 로그의 "드릴"은 당시 표기 그대로 둠.
- 2026-09-12 (3차): 2차 작업 코드 리뷰 반영(확정 10건 + 소소한 4건). 앱: 게이트가 서버 장애·429에서도 앱을 잠그지 않게 claim 실패(taken·nick 외) 시 "나중에 · 순위 없이 연습" 버튼(`#nickLater`), Escape로 게이트가 닫혀도(브라우저가 활성화 없는 preventDefault를 무시) 헤더 `#nickBtn`이 항상 보이고 닉 없으면 "닉네임 정하기"·드릴 바에 "닉네임을 정하면 순위에 등록됩니다", 닉을 정하면 미등록 결과를 바로 등록. boardFetch에 10초 타임아웃(멈춘 요청이 게이트·등록·게시를 영원히 busy로 두던 문제). openNick이 진행 중 드릴을 취소(모달이 시계는 안 멈춰 0점이 자동 등록되던 문제). 403 auth가 결과 창과 겹치지 않게 창이 닫힌 뒤 게이트. 등록 중 닉 변경·탭 전환 시 응답이 보드를 덮어쓰거나 탭을 되돌리던 경합 수정. 결과 창이 폰트 로드 중일 때 순위가 도착하면 카드에 빠지던 문제(renderShare 시퀀스 가드). 방문 집계 visitDay를 요청 전에 저장(새로고침·두 탭 이중 집계). `/top?nick=`은 토큰 있는 닉만. 워커+앱: 보이지 않는 문자(한글 채움 U+3164, 워드 조이너, 소프트 하이픈, 이체자 선택자, 사용자 영역 등)를 유니코드 속성 클래스로 거부(빈 닉네임 점유·빈 글 방지). 테스트 39개(백엔드 경합 테스트 1개 추가, fetch 스텁) + 스모크 통과. 남은 결정: 실서버 scores의 토큰 이전 행 4건은 여전히 사용자 판단으로 삭제.
- 2026-09-12 (2차): 닉네임 게이트·유일성·자동 결과 창·등급 코멘트(사용자 요청 4건). 서버 `nicks` 테이블 + `/nick`(409 taken), submit/posts에 토큰 검사(403 auth), `NICK_LIMIT` 10회/분. 앱: `#nickDlg` 게이트(Escape 불가), 헤더 `#nickBtn`으로 변경, 드릴 바 닉네임 폼·한마디 닉네임 칸 제거, `modalOpen()`으로 모달 중 입력 차단, `tierOf`+`tier.*` 문자열 21키×3, 결과 창 배너·카드 순위 줄. 테스트 38개 + 스모크(게이트·점유 거부·자동 결과 창·닉네임 변경) 통과. 에이전트가 스키마 적용·워커 배포 실행. 실서버 scores에 남아 있는 2026-09-12 테스트 행 4건(ssh·ss2·ss3·테스트0)은 등록되지 않은 닉네임이라 누군가 그 이름을 claim하면 그 행을 물려받는다 → 사용자 판단으로 삭제.

## 4단계. 연습 경험 (사용자 요청, 2026-09-12)

- [x] 4-1. 소리 (2026-09-12). BGM 상시 루프(첫 키·클릭 뒤 시작, 탭 숨기면 일시정지), 크라우치 대시마다 웨이브 효과음, 초풍 성공에만 초풍 효과음. 설정: 소리 켜기/끄기 + 배경음·효과음 볼륨 슬라이더(분리, 저장). 파일은 `bgm.mp3`·`sfx-wave.mp3`·`sfx-ewgf.mp3`.
- [x] 4-2. 연속 초풍 연출 (2026-09-12). 1회 "초풍!", 2회 "2초", 3회 "3초", 4회 "4초!", 5회 "5초!!", 6회부터 숫자는 계속 올라가고 크기·색·이펙트는 6 수준 고정. 실패·잘못된 입력·3초 공백·세션 리셋·모드 전환·측정 GO에서 0.
- [x] 4-3. 이동·대시·대초 (2026-09-12). 앞/뒤 유지로 걷기, f,N,f 대시 / b,N,b 백대시(250ms), 대초(f,f,N,d,df+2)는 기존 초풍 판정에 "대초" 라벨. 모두 연출 전용이며 판정은 그대로. 웨이브의 캔슬 6 → N → 시작 6은 대시로 보지 않는다.
- [x] 4-4. 모바일 터치 컨트롤 (2026-09-12 완료. 설계 2026-09-12, 사용자 요청: "터치패드가 게임 뷰에 출력, 좌측 방향키 + 우측 1234 2×2, 모바일에서만"). 사용자 확인 완료(원형 슬라이드 패드 · 스테이지 안 오버레이 · 순위 동일 처리) → 구현 진행.
  - 0. 문서 기본 태그(2026-09-12 완료: doctype·`<html lang="ko">`·charset·viewport 모두 추가). `index.html`에는 그 전까지 `<!doctype html>`·`<html lang>`·`<meta charset>`·`<meta name="viewport">`가 없었다(첫 커밋부터). 폰에서는 980px 데스크톱 폭으로 렌더된 뒤 축소되므로 터치 UI 이전에 `<!doctype html>` + `<meta charset="utf-8">` + `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`를 넣는다. doctype 추가는 쿼크 모드 → 표준 모드 전환이라 1280px·390px 스크린샷을 전후 비교한다.
  - 1. 표시 조건. `store.touch` = `'auto'|'on'|'off'`(기본 auto). auto = `matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints>0`. 결과를 `html.touch-ui` 클래스로 켜고 끈다(구현은 body가 아니라 html). 데스크톱(마우스)에서는 절대 안 보인다. 설정 창에 "터치 컨트롤: 자동/켜기/끄기" 한 줄(`set.touch`, `set.touchAuto`, 기존 `set.on/off`).
  - 2. 배치. `#stageBox` 안에 `<div id="touch" class="touch">` 오버레이(캔버스·HUD 위, 하단 고정, 반투명). `touch-ui`에서 `.stage` 비율을 16/7.2 → 세로형 4/5(최대 72vh, 가로 모드는 16/9)로 키우고, 캐릭터·더미·팝은 위쪽에 그리도록 바닥 `gy`를 H*0.80 → H*0.46으로 올린다(구현: `padBottom` 상수 대신 `touchOn` 삼항). `.stage-wrap` sticky는 구현하지 않았다(스테이지가 페이지 맨 위라 불필요). 톱니(`.hud-gear`)·측정 타이머는 위쪽이라 그대로. 대안(스테이지 아래 별도 띠)은 사용자 요청과 엄지 위치 때문에 채택하지 않음.
  - 3. 방향 패드(좌하단). 4버튼 십자가 아니라 **원형 슬라이드 패드** 하나(지름 min(46vw, 200px), 여백 14px). 이유: 초풍은 f→N→d→df를 엄지로 굴려야 하고 대각(df)이 버튼 십자로는 안 나온다. 첫 포인터가 잡으면 `setPointerCapture`, 중심 대비 벡터로 판정: 반지름 22% 안은 N, 밖은 각도 → 8방향(각 45° 섹터, 경계 22.5°). 손가락을 움직이는 동안 계속 갱신, 떼면 N. 표시: 링 + 손가락 따라가는 노브 + 현재 방향 GLYPH 강조.
  - 4. 버튼(우하단). 2×2 = `1 2 / 3 4`(LP RP / LK RK), 각 64px(최소 56), 간격 10px, 여백 14px. 버튼마다 별도 포인터(멀티터치): `pointerdown` → `unlockAudio(); onButton(n,t)`, `pointerup`은 시각만. 방향 패드를 누른 채 버튼을 눌러야 하므로 두 영역이 포인터를 서로 뺏지 않게 한다.
  - 5. 입력 파이프라인. `touchDir={x,y}`를 `recomputeDir`의 합에 `padDir`처럼 더한다(`kbDir + padDir + touchDir`, clamp). `resetInput()`이 `touchDir`·눌림 상태를 지운다. `modalOpen()`이면 무시(패드와 동일). 시각은 `performance.now()`(pointer 이벤트와 같은 시계). `setSrc('touch')` → `src.touch` '👆 터치'. 컨트롤 요소에 `touch-action:none`, `user-select:none`, `-webkit-tap-highlight-color:transparent`, `-webkit-touch-callout:none`, `contextmenu` 차단(길게 누르기), `pointerdown`에 `preventDefault`(더블탭 확대 방지). 판정 상태 머신·`onDir`·`onButton`은 손대지 않는다(설계 결정 9와 같은 원칙).
  - 6. 정밀도 고지. 터치 샘플링은 60~120Hz(8~16ms)라 키보드 4ms보다 거칠다. 방향과 버튼이 같은 경로를 타므로 "2가 d/f보다 빠른지 늦은지"는 여전히 유효하지만 절대값 오차가 크다. 컨트롤 위에 한 줄(`touch.note`)과 README "알려진 한계" 문구를 "지원하지 않는다" → "정밀도가 낮다"로 바꾼다.
  - 7. 순위. 사용자 결정(2026-09-12): 터치 기록도 같은 보드에 똑같이 올린다. 표시·분리·제외 없음("연습하는 건데 공정성이 어딨어"). 워커 변경 없음.
  - 8. 걷기·대시·대초. 패드에서 f를 유지하면 걷기, f→N→f 굴리기는 기존 `taps` 경로로 대시 연출. 추가 코드 없음.
  - 9. 문자열. `set.touch`, `set.touchAuto`, `src.touch`, `touch.note`, `touch.aria`(패드·버튼 aria-label) ko/en/ja.
  - 10. 테스트. 단위: 내보낸 `touchVec(x,y,t)`/`touchPress(n,t)`로 데드존 → 'n', 22.5° 경계 → 'd'/'df', f→N→d→df + 2 → `attempts[0].kind==='ewgf'`, `resetInput` 후 `touchDir` 0, 모달 열림 중 무시, `store.touch` 로드 검증(잘못된 값 → auto). 스모크: CDP `Emulation.setDeviceMetricsOverride(390×844, mobile)` + `setTouchEmulationEnabled` + `setEmulatedMedia(pointer:coarse)` → `#touch` 보임, `Input.dispatchTouchEvent`로 f,N,d,df,2 → 로그에 시도 1건, 데스크톱 메트릭으로 되돌리면 숨김, 폰 스크린샷 저장. 기존 스모크·og 생성은 데스크톱이라 영향 없음(`tools/make-og.js` 확인).
  - 11. 문서. CODE_MAP 입력 절(`touchDir`, 오버레이, 섹터 표), AGENTS 설계 결정 11(터치는 coarse pointer에서만 표시, 판정 경로 동일, 정밀도 고지), README 조작·한계.
  - 규모: `index.html` 약 250줄(CSS 60·마크업 20·JS 120·i18n 15×3), 테스트 약 80줄, 워커 (a) 선택 시 10줄 + 재배포. 한 세션 분량.

- [x] 4-5. 통발·나락 기술 추가 (2026-09-13). 통발 = f,f+2(오른손, 중단), 나락 = 6N23+4(오른발, 하단). 둘 다 초풍 판정과 분리된 `strike` 경로로 `attempt`가 아니다(성공률·히스토그램·연속 초풍·`session.tries/hits`에 안 잡힘). 통발은 상태 1/2에서 `cd.dashT===cd.tF && 2가 두 번째 6 후 250ms(FF_MS) 안`. 나락은 저스트 없음 — 상태 4/7 또는 캔슬 6 후 250ms의 4, 상태 3이면 `cd.pending={t,btn:4}`로 df를 기다렸다가 판정(2가 pending이면 우선). 저스트가 아니므로 라벨에 "!"·연속 횟수 없음(사용자 결정). 자유 연습에서는 일반 더미가 반응. 문자열·연출(`fx.tongbal/hellsweep`, `poseAt`)·로그 추가.
- [x] 4-6. 웨이브 재시작 대시 (2026-09-13, 설계 결정 9 변경). `6N23 6 N 6`의 그 시작 6을 대시로 처리(캔슬 6 자체는 아님). 짧은 대시 연출(`fx.dash(true)`, 24px), 대초 라벨은 안 붙음(`cd.dashWave`). 이 대시로도 통발 가능.
- [x] 4-7. 더미 격파 30초 (rush30) (2026-09-13). 4번째 측정 모드 + 주간 순위 4번째 보드. 상/중/하단 더미(`world.dummy.type`)가 무작위로 나오고 `HIT_TYPE`로 상단=초풍, 중단=통발, 하단=나락일 때만 격파(5점, 저스트 놓친 풍신권이 상단에 닿으면 2점, `RUSH_PTS`). 크라우치 대시는 어디서든 `min(연속,3)`점. 틀린 기술은 헛침(0점, 더미 유지). 격파 후 700ms 뒤 새 타입·거리(140~min(380,W*0.6)px)로 리스폰. rush 중 캐릭터는 더미를 지나치지 못하게 clamp. `endTrial`이 취소·완료 모두에서 `dummy.type=null`로 복구. 기록 `{score,kills,whiffs,dashPts}`, 보드 tie=격파 수. 워커 `BOARDS.rush30` 추가 — **재배포(`cd worker && npx wrangler deploy`)는 사용자 작업**이며, 배포 전에는 rush30 등록이 400 `board`로 거부되어 순위 바에 실패 문구 + 재시도가 뜬다. 테스트: dojo 3개 추가(통발 6시퀀스·나락 pending·rush30 점수/카드/취소), board 1개(rush30 범위·tie). 스모크에 통발·나락·rush30 단계와 보드 탭 4개 검사 추가.
  - 열린 항목(후속, 사용자 결정 필요): 통발·나락·격파 전용 효과음. 설계 결정 8(효과음은 크라우치 대시·초풍 성공만)이라 새 음원을 넣지 않았다.
- [x] 4-8. 결과 창 등급 SS~D · 웨이브 상위 기준 상대화 · 문의 이메일 (2026-09-13, 사용자 요청). 등급: 7단계 제목(최강~입문)을 상위 %별 SS(1%)·S(10%)·A(20%)·B(50%)·C(70%)·D로 교체(`TIERS=[1,10,20,50,70]`, 10명 미만은 10명 계산 유지 → 혼자 1위 S). 코멘트는 측정 모드별 `tier.N.wave10/ewgf20/combo10/rush30` 24키×3언어(SS "사람이 아니군요!?", D 자조 개그). CSS t0~t5 재배치. 웨이브 차트·공유 카드 음영·코치 "상위권 속도"는 워커 `/top`·`/submit`의 새 `cut10`(상위 10% 경계 점수, `ceil(max(total,10)/10)`위, 빈 보드 null)을 따르고 없으면 5 폴백(`waveTop`, 축은 `max(8, ceil(cut)+1)`까지). 문의 이메일은 푸터 mailto(`footer.contact`)·README·LICENSE·AGENTS 주소 모음. 테스트: dojo 62개(등급표·모드별 배너·wave 띠/코치/카드 top 추가) + board(cut10 3케이스) + 스모크 등급 S 확인. **워커 재배포는 사용자 작업**(rush30과 함께).
- [x] 4-9. 옷장·업적·출석 선물·잭팟 (2026-09-13, 사용자 요청: "업적 완수하면 코스튬 조각을 하나씩, 부위별로 갈아입게 / 후원 버튼 업적 / 잭팟처럼 화려하게 / 출석 때 랜덤 지급"). 설계 결정 15. 아이템은 `ITEMS[slot][id]`(색 + 몸통 로컬 좌표 그리기 훅), 업적은 `ACH[id]{target,stat(life)}`, 누적 통계 `store.life`(대시·초풍·시도·통발·나락·최대 연속·최대 연속 초풍·0.5f 초풍·방문일·후원 클릭·모드별 완주·giftDay), 해금 기록 `store.ach`(업적·출석 공통), 복장 `store.fit`. `drawFighter`가 `look`(현재 복장)을 받아 훅을 호출하고 잔상(tint)은 기존 실루엣 유지. 옷장 창 `#fitDlg`(옷장/업적 탭, 미리보기 캔버스, 슬롯별 칩, 진행 n/목표), HUD 버튼 `#fitOpen`. 잭팟 `#jackpot`(`playJackpot`, 큐 `jackpotQ`, 측정·카운트다운·대화상자 중 보류 → `endTrial` 2.3초 뒤·대화상자 close에서 재개, 4개 이상 쌓이면 "외 N개"). 방문일 집계를 `bumpVisitDay()`로 분리해 `BOARD_URL` 없이도 센다(`live.visitPending`으로 `/visits` POST 유지). 검증: 기본 복장 5포즈 픽셀 해시 HEAD와 동일, 세트 8줄 contact sheet 육안 확인, 단위 테스트 6개, 스모크 옷장 단계. 업적 수치(500/3000/10000 대시 등)는 초안이며 사용자 조정 대상.

## 2단계. 저마찰 수익 (유입 생기면 바로)

- [ ] 2-1. 쿠팡 파트너스 가입 + "연습 장비" 섹션. 레버·히트박스·패드. "이 도구로 측정한 입력 지연 기준 추천" 맥락으로 배치.
- [ ] 2-2. 해외 유입 생기면 같은 자리에 Amazon Associates 링크 병기 (언어에 따라 전환).
- [x] 2-3. 후원 버튼 (2026-09-12). 1차: 푸터에 언어별 외부 링크 하나( ko = 카카오페이 송금 링크, en/ja = Ko-fi `ko-fi.com/misimadojo`, PayPal만 연동). 비어 있으면 그 언어에서는 숨김. 스크립트·위젯 없음. 토스아이디(toss.me)는 서비스 종료라 제외. 카카오페이 링크는 휴대폰 전용(PC 브라우저는 404)이라 QR(`donate-kakao.png`, 링크 주소만 담은 코드) + 휴대폰용 직접 링크를 보여준다. 2차(사용자 요청): 버튼을 헤더·결과 창(공유 이미지에는 안 나옴)·푸터 세 곳에 두고, 누르면 카카오페이/Ko-fi 중 고르는 창(`#donateDlg`)이 뜬다. 순서는 ko에서 카카오페이 먼저, en/ja는 Ko-fi 먼저. 두 방법 모두 모든 언어에서 보인다.
- [ ] 2-4. 배너 광고는 후순위. 붙인다면 카카오 애드핏, 위치는 측정 모드 종료 화면 한 곳만. 연습 중 화면에는 절대 넣지 않는다.

## 3단계. 유료 제품

- [ ] 3-1. 지표 확인. 주간 활성 사용자 수백 명, 재방문율 확인 후 착수. 그 전엔 시작하지 않는다.
- [ ] 3-2. 데스크톱 앱 (Tauri 우선). raw input으로 브라우저 4ms 폴링 한계 극복. "실제 게임 판정과 오차가 적다"가 판매 포인트.
- [ ] 3-3. Steam 출시, 3~5달러. 웹은 무료 체험판, 데스크톱은 정밀 판정·리플레이·세션 비교·캐릭터별 커맨드 팩.
- [ ] 3-4. 범위 확장: "격투게임 입력 트레이너". 스파6 드라이브 러시, 길티기어 대시 캔슬, 철권 백대시 캔슬 등 커맨드 팩 구조로.

- [x] 공유 카드 리뷰 수정: 결과 당시 판정 폭 보존, 웨이브 드릴 초풍 시도 집계 (2026-09-11).

- [x] 설정·소리 리뷰 수정 (2026-09-12): 설정 진입 시 측정/카운트다운 취소·입력 초기화, 재생 중 효과음 볼륨/끄기 동기화, 여러 창 BGM 중복 방지.

- [x] rush30 리뷰 2건 수정 (2026-09-13): 즉시 소비로 중복 득점 차단, 낙하 완료와 무관한 700ms 재등장.

- [x] 후원 문구 현지화 (2026-09-13): 굶고 있는 철찌의 한 끼 밥 문구를 ko/en/ja에 적용하고 후원 버튼 양쪽에 🍚 표시.

- [x] 주간 웨이브 기준 캐시 만료 수정 (2026-09-13). 응답 end부터 기본값 5 적용, 1분 주기 재조회 및 실패 재시도, 선택 탭·새 응답 보존.

- [x] 후원 창 하단 문의 이메일 추가 (2026-09-13). 선택·QR 화면 공통으로 작은 mailto 링크 표시, 기존 ko/en/ja 문의 번역 재사용.

- [x] 1P/2P 선택을 설정 밖으로 이동 (2026-09-13). 스테이지 설정 버튼 바로 왼쪽에 상시 배치, 좁은 화면에서 타이머 겹침 방지.

## 진행 로그

- [x] 2026-09-13: 사용자 지적으로 `a.early_stage.coach`(ko/en/ja) 수정: "↓, ↓→ 까지 완성한 뒤 2"는 3을 다 넣고 누르라는 뜻이라 틀림 → "→, 떼고, ↓ 까지 넣은 뒤 ↓에서 오른쪽(↓→)으로 바꾸는 순간 2". (같은 날 만들었던 홍보 GIF 도구는 사용자 결정으로 폐기, 직접 촬영.)
- [x] 2026-09-13: 옷장·패드 재리뷰 수정. 입력 변화 없는 패드 폴링의 판정 시각 갱신 제거, 대시 누적·최대 연속 즉시 저장 예약, 진행 중 잭팟의 측정·모달 진입 보류(타이머·차임 중단 및 같은 보상 재개), 현재 보상 언어 전환, 초기화 시 연출 폐기, KST 자정 첫 입력 출석 일수 갱신. CDP 연결·명령 대기 제한과 스모크 실패 시 정리 추가. 단위 77개·최종 브라우저 스모크 통과(JS 오류 0). 초기 출력 없는 대기 실행은 중단했으며 제한·진행 출력 추가 후 정상 완주를 확인.

- 2026-09-13: 획득 연출 보강(사용자 요청): 배경 딤(`.jackpot` 배경), 결과 카드 아래 확인 버튼 `#jpOk`(누를 때까지 유지, 자동 종료 없음, 포커스라 Enter도 됨), 스테이지 색종이 대신 오버레이 캔버스 `#jpFall`에 꽃잎 낙하(딤 위에서 보이도록). 테스트 72개 + 스모크 통과.
- 2026-09-13 (후속, 사용자 요청): 획득 연출을 룰렛에서 "? 상자 부화"(점점 세게 흔들림 → 화이트아웃 → 결과 페이드인)로 교체, 초풍 효과음 3회 대신 Web Audio 합성 차임(`playChime`, 파일 없음), 설정에 기록·업적·복장 초기화(`#dataReset`, 닉네임·설정 유지). 테스트 1개 추가.
- 2026-09-13: 패드 판정 시각을 `gamepad.timestamp`(기기 갱신 시각)로 변경(사용자 보고: 스틱에서 동시 입력이 어긋남). 4ms 폴링 타이머가 바쁜 프레임 뒤로 밀리면 같은 순간의 ↘와 버튼이 다른 폴에 걸려 최대 1f 벌어지던 것을 제거. 0/NaN/과거 값이면 종전처럼 `performance.now()`. 단위 테스트 1개 추가. 브라우저 자체의 패드 갱신 주기(16ms 의심)는 `.sandbox/ab/pad-probe.html`로 사용자 측정 대기.
- 2026-09-13: 4-9 완료(옷장·업적 25·출석 선물 12·잭팟). `index.html` +~430줄: 데이터 블록(`SLOTS/SETS/ITEMS/ACH/lookOf/currentLook/setFit`)을 저장소 앞에, 런타임(`checkAch/dailyGift/bumpVisitDay/jackpotNext/playJackpot/renderFit/openFit`)을 후원 코드 뒤에. 훅: `completeCD`(dashes·maxChain), `attempt`(tries·ewgf·tightEwgf·maxStreak), `strike`(tongbal·hellsweep), `endTrial`(trials, 잭팟 2.3초 보류), `openDonate`(donate), `unlockAudio`(dailyGift), `endChain`/`pagehide`(save). 문자열 `fit.*`·`slot.*`·`set.*`·`item.*`·`ach.*` ko/en/ja. 테스트 70개 + 스모크 통과.
- 2026-09-13: 1P/2P 선택 버튼을 설정 창에서 스테이지 톱니 왼쪽으로 이동. 짧은 1P/2P 표기와 번역된 접근성 설명, 모바일 타이머 위치 조정. 단위 테스트 64개·브라우저 스모크 통과(JS 오류 0건), 1280/390/320px 배치 및 2P 선택·저장 확인, 390px 화면 캡처 확인.

- 2026-09-13: 후원 창 공통 하단에 문의 이메일 mailto 링크를 12px로 추가, footer.contact의 ko/en/ja 번역 재사용. 단위 테스트 64개 및 브라우저 스모크 통과(JS 오류 0건).

- 2026-09-13: 리뷰 P2 주간 캐시 만료 수정. waveTop의 end 검사와 waveRefresh 추가, KST 월요일 경계·실패 재시도·응답 경합 회귀 테스트 추가. 단위 테스트 64개 및 브라우저 스모크 통과(JS 오류 0건). 운영 Worker에서 cut10·rush30 지원을 확인해 이번 프런트엔드 수정은 Worker 재배포 불필요.

- 2026-09-13: 4-8 완료(결과 창 등급 SS~D + 모드별 멘트 / 웨이브 상위 띠를 주간 순위 상위 10% 경계 `cut10`으로 / 문의 이메일). 워커 `top()`에 OFFSET 쿼리 1개 추가. 코멘트 문구는 사용자 검토 대기(I18N `tier.N.<mode>`).
- 2026-09-13: 후원 안내를 사용자 확정 한국어와 영어·일본어 현지화 문구로 교체. 결과 창·후원 창·푸터 및 초기 HTML에 반영하고 버튼을 🍚 후원하기 🍚 / 🍚 Donate 🍚 / 🍚 支援する 🍚로 통일. 단위 61개·브라우저 스모크 통과(JS 오류 0), 390px·1280px에서 세 언어 문구 일치·후원 창 가로 넘침 없음 및 모바일 스크린샷 확인.

- 2026-09-13: rush30 명중 즉시 hit를 설정하고 110ms 연출 지연은 launchAt으로 유지. updateDummy가 낙하와 재등장을 관리하며 타입 더미는 700ms 기한을 우선 적용. 통발 60ms 연타의 기록·순위 점수와 네 기술의 30/60/144Hz 재등장 회귀 테스트 추가(단위 61개·브라우저 스모크 통과, JS 오류 0).

- 2026-09-13 (후속, 사용자 요청): (1) 격파해도 웨이브 콤보 유지 — `endCommand()`가 rush30에서 chain·cancelled·lastDF를 유지해 격파 후 대시가 3점으로 이어짐(700ms 공백에만 endChain 초기화). 회귀 테스트 1개. (2) 나락 연출을 오른 다리로 크게 돌리는 저평 스윕으로(깊게 숙임 sink, 다리 쭉 뻗어 하체 한 바퀴 sweep, 궤적). 이후 사용자 요청으로 약 2배 빠르게(전체 ~760ms → ~380ms, fx 슬라이드·먼지도 단축). (3) 통발은 앞팔을 reach로 늘려 빠르게 내지르는 스트레이트로. 테스트 59개 + 스모크 통과.
- 2026-09-13: 4-5·4-6·4-7 완료(통발·나락 / 웨이브 재시작 대시 / 더미 격파 30초). `onDir`에서 상태 6의 시작 6도 `tapDetect`로 넣어 대시 처리(`cd.dashWave`, 짧은 대시). `onButton`에 통발(상태 1/2 + `cd.dashT===cd.tF` + FF_MS)·나락(상태 4/7/5, 상태 3은 `cd.pending.btn`) 분기와 `strike()` 경로 추가(attempt와 분리). `world.dummy.type`·`HIT_TYPE`·`tryHit(move)` 반환·`rushSpawn`·`rushStrike`·`renderRushHud`, `drawDummy` 타입별 모양, `poseAt` tongbal/hellsweep. `MODES.rush30`·`#modes`·`#boardTabs`·`store.records.rush30`·`endTrial`/`trialTick`/`recText`/`boardEntry`/`buildCard` 분기. 워커 `BOARDS.rush30`(재배포는 사용자). i18n 통발·나락·rush30 키 ko/en/ja. 통발·나락은 저스트가 아니므로 "!"·연속 없음(세션 중 사용자 피드백 반영). 테스트 58개 통과 + 스모크 통과.
- [x] 후원창 측정 취소 회귀 수정 (2026-09-12): openDonate에서 endTrial(true)·resetInput() 후 창을 열도록 변경. 세 언어·세 측정 모드의 카운트다운/측정 취소 및 후원 버튼 3곳의 입력 초기화 단위 테스트 추가. 브라우저 스모크에 영어 카운트다운·일본어 측정 중 후원창 진입 후 결과/순위 미생성 검사 추가.

- 2026-09-12: 복제 대비(사용자 요청). 루트 `LICENSE`(모든 권리 보유, 한/영), 푸터 저작권 줄(`footer.copy` ko/en/ja), `index.html` 첫 줄 주석, README 라이선스 줄, AGENTS 설계 결정 10. 워커 출처 잠금: `ALLOWED_ORIGINS`(wrangler.toml [vars]) 외 Origin은 CORS 헤더 없음·POST 403 `origin`, DELETE는 토큰만. 워커 테스트 1개 추가, 스모크는 `ALLOWED_ORIGINS:'null'`(file://)로 실행. **워커 재배포(`cd worker && npx wrangler deploy`)는 사용자 작업.**

- 2026-09-12: 리뷰 3건과 BGM 중복 재생 수정. 설정 진입에서 endTrial(true)·resetInput(), sfxSync()로 기존 보이스에 설정 즉시 반영. Web Locks로 같은 브라우저·사이트의 BGM 한 개만 재생하고 숨김/끄기/닫기 시 권한 반환(미지원 환경은 포커스 조건). AbortError는 자동재생 거부로 취급하지 않음. 회귀 단위 테스트 5개 및 실제 두 창 소리 스모크 tests/smoke-sound.js 추가.

- 2026-09-12: 4단계 3건 완료(소리 / 연속 초풍 팝업 / 걷기·대시·대초). 소리는 `snd`+`unlockAudio`/`bgmSync`/`playSfx`(Audio 지연 생성, 이름당 3보이스, 자동재생 거부는 다음 제스처에 재시도), 설정 `store.sound/bgmVol/sfxVol` + range 슬라이더. 연속 팝은 `combo{n,t}` + `STREAK[1..6]` 표 + pop opts(lvl/glow/rings/core/life). 이동은 `taps/tapDetect`(onDir switch 앞), `cd.dashT===cd.tF`로 대초 라벨, `fx.dash/backdash`, poseAt `walk/dash/backdash`, drawFighter `step`. 문자열 9키 ko/en/ja. 단위 테스트 4개 추가(dojo 35 + board), 스모크에 mp3 복사·소리 설정 토글/슬라이더·f,N,f 단계 추가. mp3 2개 영문 개명. 후속(사용자 요청): 볼륨 기본값 100/100, 설정 패널을 `<details>`에서 스테이지 우상단 톱니 버튼(#setOpen)으로 여는 `<dialog id="setDlg">`로 변경(열린 동안 게임 입력 정지), set.more/set.less 키 삭제.

- 2026-09-11: 플랜 작성.
- 2026-09-11: 공유 카드 리뷰 2건 수정. 종료 후 설정 변경에도 당시 판정 폭을 유지하고 웨이브 드릴 중 초풍 시도를 집계. 재발 방지 테스트 2개 추가(총 25개).
- 2026-09-11: 1-1 완료. 공개 저장소 생성, Pages 활성화. 앱 파일은 index.html로 개명.
- 2026-09-11: 1-3 완료. 앱 이름을 "미시마 도장"으로 변경(Mishima Dojo / 三島道場). 한/영/일 UI 토글, 언어 전환 테스트 3개 추가(총 16개).
- 2026-09-11: 초풍 기본 판정 폭을 0.5f → 0.7f(보통)로 변경 (사용자 요청).
- 2026-09-11: 사운드 리소스 3개 커밋 (bgm.mp3, 웨이브사운드.mp3, 초풍사운드.mp3). 사용자 확인: 모두 자체 제작. 아직 index.html에서 재생하지 않음 (소리 피드백 기능은 별도 작업).
- 2026-09-11: 잘못 커밋된 외부 파일명을 지우기 위해 히스토리 재작성 후 force push (사용자 승인). 이후 커밋은 `git add -A` 대신 파일을 명시해서 추가한다.
- 2026-09-11: 세션 인계 준비. 브라우저 스모크 테스트를 tests/smoke-chrome.js로 저장소에 넣고, README에 "작업 규칙 (세션 인계용)" 추가, 1-4 스펙을 이 문서에 정리.
- 2026-09-11: 1-4 완료. 드릴 종료 후 "공유 카드", 자유 연습에서 "세션 카드" 버튼 → `<dialog>`에 1200×630 캔버스 카드(모드·핵심 수치·히스토그램/웨이브 미니 차트·판정 폭·날짜·주소·자체 SD 캐릭터). 이미지 복사(ClipboardItem)·PNG 저장·X 공유(텍스트)·디스코드 안내. 카드 데이터는 순수 함수 `buildCard`로 분리해 단위 테스트 4개 추가(총 23개), 스모크 테스트에 카드 생성·복사·닫기 단계 추가. 문자열 25키를 ko/en/ja에 추가.
- 2026-09-11: 1-5 완료. `<head>`에 검색용 title·description·robots·theme-color·canonical·OG/Twitter 메타 22줄 추가. `og.png`는 `buildOgCard()`(태그라인·예시 히스토그램, 개인 수치 없음) + `drawCard` 소개용 분기로 그려 `tools/make-og.js`(헤드리스 Chrome+CDP)가 저장. 문자열 7키(`app.docTitle`, `og.*`)를 ko/en/ja에 추가, 단위 테스트 2개 추가(총 27개). 미반영 메모: `<!DOCTYPE>`·`<meta charset>`·viewport 메타가 없어 모바일은 데스크톱 폭으로 렌더된다. 레이아웃이 바뀔 수 있어 사용자 결정 후 별도 작업.
- 2026-09-12: 1-5 리뷰·정리. `<head>` twitter:title/description/image 중복 4줄 제거(X는 og:*로 폴백, twitter:card만 유지). 헤드리스 CDP 코드를 `tools/cdp.js`로 추출해 smoke-chrome.js·make-og.js가 공유. `og.pill` 키 삭제, 칩 문자열(og.chipWave/og.chipEwgf)을 buildOgCard 모델로 옮겨 drawCard에서 하드코딩 제거. `WINDOWS`/`WINDOW_DEFAULT` 상수 도입. 테스트가 head의 canonical/og:url·`<title>`을 스크립트의 SITE_URL·app.docTitle과 대조. 사용자 요청으로 og.png를 도장 나무 간판 스타일(널빤지 배경·현판·종이 차트 패널, `model.style==='wood'`)로 재생성. 공유 카드는 기존 다크 스타일 유지(사용자 결정 대기).
- 2026-09-11: 에이전트 공용 구조로 재편. 규칙은 루트 AGENTS.md(CLAUDE.md는 @AGENTS.md 포인터), 문서는 .agents/docs/(이 파일, CODE_MAP.md, reviews/), 임시 파일은 .sandbox/(gitignore). README는 사람용으로 축소. Claude/Codex 런처 스크립트 추가.
- 2026-09-12: 1-8 완료. 사용자 지시로 에이전트가 `wrangler login`(브라우저 승인은 사용자)·D1 생성·스키마 적용·workers.dev 서브도메인 `mishima-dojo` 등록(API)·배포까지 실행. 배포는 Cloudflare 이메일 인증 후에야 통과했다. 백엔드 `worker/`(index.js·schema.sql·wrangler.toml·README.md): Cloudflare Worker + D1, `/top`·`/submit`, 주차 키 = KST 월요일 날짜, 순위 = 더 나은 (score,tie) 수 + 1. 앱: `#dBoard` "주간 순위" 버튼 → `#boardDlg`(보드 탭 3개·주간 범위·등록 폼·상위 20 표·내 행 강조). `boardEntry`(순수, 드릴 결과 → 제출 페이로드)·`boardRowText`(recText 재사용). 문자열 20키 ko/en/ja. `store.nick` 추가. 테스트: `tests/board.test.cjs` 5개(가짜 D1 `tests/fake-d1.js`로 핸들러 직접 호출: 주차 경계, 검증, 동점 순위, 20위 캡, CORS/오류), dojo.test.cjs 1개 추가(총 33). 스모크 테스트는 워커 핸들러를 로컬 http로 감싸 실제 Chrome에서 열기→등록→내 행→다른 보드 빈 상태→ko 전환→닫기까지 확인. `BOARD_URL`은 배포 주소로 채워져 있다(비어 있으면 숨김). 방문 집계(1-7)는 미착수.
- 2026-09-12: 1-8 코드 리뷰 반영(10건). 앱: 순위 요청 경합 수정(`board.seq`로 최신 로드만 msg/data 반영, 등록 중엔 탭 전환·중복 등록 차단 → 이전엔 느린 회선에서 탭 전환 시 같은 결과가 두 번 등록될 수 있었다), 서버 400 `nick`을 "닉네임 2~12자" 문구로 표시하고 워커와 같은 문자 규칙(`NICK_BAD`·`nickOk`)을 클라이언트·저장소 로더에도 적용, 드릴 카운트다운·진행 중 `#dBoard` 숨김(`renderBoardBtn`), combo10 기록에 `rec.dps` 저장해 순위 표·최고 기록에 동점 기준(대시/초)을 표시, GET에는 content-type을 붙이지 않아 preflight 제거, `BOARDS`(MODES의 start 모드)로 renderBests 순서 파생. 워커: `Object.hasOwn`으로 `constructor` 같은 상속 키 거부, `BOARDS`·`WINDOWS` export, `worker/package.json`(`"type":"module"`, Node 18~20에서 ESM 로드용). 테스트: 앱↔워커 계약 교차 검증 1개 추가(총 34), 상속 키 400 검사, 픽스처 닉네임을 중립 이름으로 교체(설계 결정 3). 스모크 테스트 실패 시에도 임시 폴더 삭제. 문서: 설계 결정 4에 Worker 명시, "채움/Paste" 등 배포 전 문구 정리.
- 2026-09-12: 1-7·1-9 완료, 1-8 개편(사용자 요청 3건). 순위: 모달·버튼 제거, `.records` 첫 칸에 순위 카드 상시 표시(상위 10 + 내 순위/참가 수/상위 %, 10위 밖이면 표 아래 내 행). 닉네임당 주간 최고 1건(서버 업서트, `UNIQUE(week,board,nick)`), 닉네임 저장 시 드릴 종료 즉시 자동 등록(드릴 바 #dRank에 "등록 완료/최고 기록 유지 · N위/M명 · 상위 P%"), 없으면 드릴 바에서 한 번 입력. 방문자: `/visits`, 브라우저당 KST 하루 1회, 헤더 우상단. 한마디: `/posts` 게시판(200자·최신 50·1분 갱신·IP당 1분 3개·`ADMIN_TOKEN` 삭제). 테스트 인프라: `tests/fake-d1.js`를 node:sqlite + 실제 schema.sql로 교체(Node 22.13+ 필요, 문서 갱신). 테스트 37개 + 스모크(자동 등록·게시·방문 포함) 통과. 에이전트가 스키마 적용·워커 배포·`ADMIN_TOKEN` 등록까지 실행(토큰은 `.sandbox/admin-token.txt`).
- 2026-09-12: 2-3 후원 2차(사용자 요청). 버튼을 헤더 `#donateTop`·결과 창 `#donateShare`(캔버스 밖이라 공유 이미지에는 안 나옴)·푸터 `#donateBtn` 세 곳에 두고, 누르면 `#donateDlg`에서 카카오페이/Ko-fi를 고른다(`DONATE`·`donateOptions(lang)`: ko는 카카오페이 먼저, en/ja는 Ko-fi 먼저). 카카오페이는 QR 뷰로 전환, Ko-fi는 새 탭. 문자열 `donate.btn/chooseTitle/kakao/kakaoSub/kofi/kofiSub/back` ko/en/ja. 테스트 50개 + 스모크(선택 창·순서·QR·en 순서) 통과. Ko-fi 최소 금액은 코드가 아니라 Ko-fi 설정에서 바꾼다.
- 2026-09-12: 4-4 코드 리뷰 반영(10건). 가로 모드에서 4/5 스테이지가 72vh 캡에 눌려 ~220px 폭이 되고 패드가 캐릭터·버튼을 덮던 문제 → 가로는 `.stage` 16/9, `#touch`를 container-type:size로 두고 패드 폭·버튼 칸을 `cqh`로 제한(구형 브라우저용 폴백 선언 유지). 결과 카드가 자동으로 열려도 패드 위 손가락이 onDir를 계속 넣던 문제 → pointermove에 modalOpen 가드 + openShare가 resetInput(). 터치 시각을 performance.now() → e.timeStamp(pointermove가 rAF에 맞춰 늦게 오면 d/f 시각이 최대 한 프레임 늦어 초풍 오프셋이 음수로 치우침). 패드 라벨 glyphFor(2P 미러), resetInput에서 curDir='n'을 touchRelease보다 먼저(라벨 잔상), releasePad가 recomputeDir(터치·키보드 방향 유지), 링 inset 39%(=데드존 0.22R), 노브 단위원 클램프, 대기 배지 `src.waitTouch`, `.hud-hint`를 오버레이 위 바닥 띠로(숨기지 않음, 그 자리를 위해 바닥 gy H*0.50 → H*0.46), `<html lang="ko">`. 단위 테스트 1개 추가(총 55), 스모크에 가로 844×390 레이아웃·대기 배지 검사.
- 2026-09-12: 4-4 터치 컨트롤. `<!doctype html>`·charset·viewport 추가(그 전엔 쿼크 모드라 폰이 980px 데스크톱 폭으로 렌더됐음. 데스크톱 스크린샷 전후 동일 확인). `store.touch` auto/on/off(설정 #touchSel), `html.touch-ui`에서 스테이지 4/5 비율 + 하단 46% 오버레이(#tpad 원형 슬라이드 패드 8방향·데드존 22%, #tbtns 2×2), touchDir이 recomputeDir 합에 들어가고 버튼은 onButton → 판정 동일. 바닥 gy H*0.50. 문자열 src.touch/set.touch/set.touchAuto/touch.note/touch.aria/touch.padAria. 단위 테스트 2개 추가(총 54) + 스모크에 폰 에뮬레이션 터치 초풍 1회. 순위는 사용자 결정으로 표시 없이 동일 처리.
