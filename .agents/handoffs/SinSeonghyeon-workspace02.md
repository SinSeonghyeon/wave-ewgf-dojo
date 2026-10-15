# 인수인계 — SinSeonghyeon/workspace02: 캐릭터 선택 + 화랑 초스카이 + 홀드 버튼 합성 입력

`.agents/docs/MERGE_PROCESS.md` 형식. 합류 직전에 이 파일은 삭제한다. 오래 남을 조사·근거(웹 출처, 다음 캐릭터 후보, 초상 이미지 출처, 화랑 백대시 실측)는 이미 `.agents/docs/JFSR.md`로 옮겼다.

## 1. 브랜치·기준·목적

| 항목 | 내용 |
|---|---|
| 브랜치 | `SinSeonghyeon/workspace02` |
| 기준 커밋 | `24ab24c` (origin/main, 2026-10-11 기준 최신) |
| 한 줄 목적 | 한마디 최다 요청(#71·#82·#108) **초스카이(화랑 6N3+4 저스트)** 연습과 이를 담는 **캐릭터 선택**(카즈야·화랑, 데이터로 확장 가능) |
| 상태 | 구현·테스트 완료. 커밋 `8c3d36e`(캐릭터 선택·초스카이) + 그 위 홀드 버튼 합성 입력 커밋(10절) |

## 2. 합류 순서·의존

- 의존 브랜치 없음.
- 웨캔기어(`10-wsc.js`)·백대시(`12-backdash.js`) 세션 브랜치가 같은 묶음에 있으면 **그 뒤에 합류**하는 편이 안전하다. 이 브랜치가 두 파일에 넣은 것은 가드 1줄씩이라 다시 얹기 쉽다(6절).
- 새 결정 번호 33·34를 썼다. 다른 브랜치도 33·34를 만들었으면 합류 순서대로 번호를 다시 매기고 코드 주석 `결정 N(slug)`·`AGENTS.md` 요약·`DECISIONS.md` 제목을 함께 고친다(`tests/docs.test.cjs`가 대조).

## 3. 사용자에게 보이는 변경 · 공지 필요: **예(이미 넣음)**

1. **캐릭터 버튼**: 헤더의 모드 탭 바로 왼쪽에 붉은 버튼(현재 캐릭터 초상 + "캐릭터" + 이름 + ▾). 휴대폰 폭은 탭 줄 위.
2. **캐릭터 타일 창**(`#charDlg`): 카드마다 초상·이름·기술 요약, 현재 캐릭터에 "선택됨", 점선 "추가 예정" 카드. 카드를 누르면 바로 바뀌고 닫힌다(진행 중 측정은 종료).
3. **초상은 tekken.com 공식 캐릭터 선택 이미지**(사용자 결정, 결정 3 예외 — 8절). 연습 화면 캐릭터·옷장·공유 카드·og.png는 전과 같은 자체 SD.
4. **화랑 선택 시** 모드 탭 = 자유 연습 · 초스카이 연습 · 웨이브 10초 · 백대시 10초. 초풍 통계 칸(성공률·시도·평균)과 공유 버튼은 숨는다. 설정의 기술 켜기·끄기 줄은 **캐릭터마다 따로**(카즈야 5개, 화랑은 초스카이 하나, 2026-10-12 사용자 요청). 옛 저장값은 카즈야 설정으로 옮겨진다.
5. **초스카이 판정**: 3(↘)·4가 같은 60Hz 칸 = 성공, 앞·중립 각 1f = 최속. `6N23+4` = 일반 스카이(2를 거침), 4 늦음 = 3RK, 4 빠름, 2+4, 6N 없는 3+4를 각각 알려 준다. 웨이브 도중 초스카이도 연습용으로 인정(실게임과 다름, 안내 문구 있음). 발차기 포즈·발끝 번개 연출.
6. **초스카이 연습 탭**: 프레임 타임라인·평가 패널, **10회 도전**(3초 카운트다운) → 새 순위표 「초스카이 10회」(`jfsr`).
7. **섞인 순위표**: 웨이브 10초·백대시 10초는 카즈야·화랑 기록이 한 보드에 오르고 각 행에 캐릭터 태그. 옛 기록은 카즈야.
8. **주소** `?c=hwoarang`으로 화랑을 바로 연다(저장값보다 우선, 바꾸면 주소도 따라감).
9. **가이드 글** `guide/jfsr/`(ko/en/ja) + 가이드 목록 카드.
10. 카즈야(기본값)는 기존 판정·기록·순위·업적이 그대로다.

## 4. 공지 (최종 문자열은 `src/i18n/*.js`의 `notice.20261011.*`, `NOTICES` 맨 위 `2026-10-11-jfsr`)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 10월 11일 업데이트 · 캐릭터 선택과 초스카이 연습 | 모드 탭 왼쪽의 캐릭터 버튼을 눌러 화랑을 고르면 초스카이(6N3+4 저스트)를 연습할 수 있습니다. 한마디에서 가장 많이 요청해 주신 기능입니다. | 1. 캐릭터 선택: 카즈야(기존 기능 전체)와 화랑. 고른 캐릭터가 할 수 있는 연습 모드와 순위표만 보입니다.<br>2. 초스카이: 3(↘)과 4가 같은 프레임이면 성공, 앞·중립 각 1f면 최속입니다. 2를 거치면 일반 스카이, 4가 늦으면 3RK로 알려 줍니다.<br>3. 초스카이 연습 탭의 10회 도전 결과가 새 순위표 「초스카이 10회」에 올라갑니다.<br>4. 화랑으로도 웨이브 10초·백대시 10초를 할 수 있고, 카즈야와 같은 순위표에 캐릭터 표시와 함께 올라갑니다. |
| en | October 11 update · Character select and JF Sky Rocket | Press the new character button left of the mode tabs and pick Hwoarang to practice the just-frame Sky Rocket (f,n,df:4) — the most requested feature on the board. | 1. Character select: Kazuya (everything the site had) and Hwoarang. Only the modes and leaderboards that character can play are shown.<br>2. JF Sky Rocket: d/f and 4 on the same frame is a success, forward and neutral 1f each is the fastest. Going through d shows a normal Sky Rocket, a late 4 shows d/f+4.<br>3. The 10-try challenge on the JF Sky Rocket tab goes to the new JF Sky Rocket ×10 leaderboard.<br>4. Hwoarang can also play Wavedash 10s and Backdash 10s; they share the leaderboards with Kazuya, with a character tag on every row. |
| ja | 10月11日アップデート · キャラ選択と青ライ練習 | モードタブ左のキャラボタンからファランを選ぶと、青ライ(6N3+4最速)を練習できます。ひとことで最も多くリクエストされた機能です。 | 1. キャラ選択:一八(これまでの全機能)とファラン。選んだキャラができる練習モードとランキングだけが表示されます。<br>2. 青ライ:3(↘)と4が同じフレームなら成功、前・ニュートラル各1fなら最速。2を経由すると通常版、4が遅いと3RKと表示します。<br>3. 青ライ練習タブの10回チャレンジの結果が新しいランキング「青ライ10回」に載ります。<br>4. ファランでもウェーブ10秒・バックダッシュ10秒ができ、一八と同じランキングにキャラ表示付きで載ります。 |

같은 묶음의 다른 공지와 합칠지는 통합 담당자가 사용자에게 확인한다. 합치면 `tests/smoke-locales.js`의 공지 개수·최신 공지 항목 수 기대값(현재 8개·4항목)도 맞춘다.

## 5. 사람 작업과 순서

1. **워커 재배포**(사이트 푸시보다 먼저): `cd worker; npx wrangler@latest deploy`. 바뀐 것: `BOARDS.jfsr`(10회 도전 규칙), `detail.char` 허용 목록(`kazuya`·`hwoarang`, 그 밖의 값은 버림). **스키마·D1 마이그레이션·비밀값 없음.**
2. 사이트 푸시(main → Pages Actions).
- 순서가 바뀌면: 재배포 전까지 초스카이 10회 등록이 400으로 거부되고 순위 바에 실패 문구(데이터 손실 없음). 다른 보드의 `char`는 옛 워커가 조용히 버려 그동안 등록된 화랑 기록은 카즈야로 표시된다.
- 관리자 도구 `tools/board-admin.js`에 `jfsr`('초스카이 10회')를 추가했다(사용법 그대로).

## 6. 충돌 가능 파일과 반드시 보존할 동작

| 파일 | 이 브랜치의 변경 | 보존할 동작 |
|---|---|---|
| `src/js/10-wsc.js` | `wscDir` 첫 줄 `if(!charCap('wsc')) return;` | 가드 1줄만 살리면 된다 |
| `src/js/12-backdash.js` | `bdActive`에 `charCap('kbd') &&` | 같음 |
| `src/js/11-crouch-dash.js` | 무족 보류 경로 일반화: `mistBtn`·`mistArmJf`(jf 캐릭터는 `onDir`에서 `commandDir` 뒤에 모든 6으로 시작), `mistReplay` 재시작, `mistTick`의 jf 분기(2·3 같은 칸은 웨이브 머신엔 크라우치 대시로 넣고, 초스카이 판정은 일반 6N3로 계속 기다림), `mistFinish`→`jfStaged`, case 3의 `charCap('wave')` | 카즈야(`legacy`)에서는 **기존과 같은 동작**. 기존 무족초·웨이브 테스트 전부가 회귀 검사 |
| `src/js/13-button.js` | `moveOn`에 `charHas`, `commandButton`·`resolvePending`의 `!charOf().legacy` 분기 | 같음 |
| `src/js/20-trials.js` | `MODES.needs`·`modeAvailFor`·`modeAvail`·`boardMixed`, `CHALLENGES.jfsr`, `renderCharUI`·`renderCharTiles`·`setChar`, 결과에 `char` | 모드 탭·순위 탭 숨김은 `MODES.needs`로만 정한다(새 모드를 넣는 브랜치는 `needs`를 선언) |
| `src/js/29-backend.js` | `boardEntry`의 `detail.char`, 행 태그 `.char-tag`, `openNick`의 도전 중 `resetInput` | 새 보드를 넣는 브랜치와 겹치면 양쪽 유지 |
| `src/js/07-input.js` · `23-settings-ui.js` · `19-tick.js` · `30-language.js` · `17-coach.js` · `01-wardrobe-items.js` · `31-stage.js` · `33-fighter.js` · `35-dojo3d.js` | `resetInput`→`jfChallengeCancel`, `MODAL_IDS`(대화상자 목록 한 곳, `modals.test`가 app.html과 대조)에 `#charDlg`, `28-rewards`의 닫힘 → `renderRewards` 목록에 `charDlg`, 캐릭터 버튼·타일 핸들러, `jfTick`, `renderJf`·`renderCharUI`, `renderSeg`의 jf 변형, `LIFE_KEYS.jfsr`, `fx.sky`·발차기 포즈·발끝 번개 | 각 1~몇 줄, 양쪽 유지 |
| `src/app.html` | include 2줄(`js/02-chars.js`는 `02-notices` 앞, `js/16-jfsr.js`는 `16-strikes` 앞 — 숫자순 테스트), `.mode-bar`(캐릭터 버튼 + `nav#modes`), jfsr 모드·순위 탭, 도전 버튼, `#jfTimeline`·`#jfPanel`, `#charDlg` | 헤더 `.mode-bar` 구조를 바꾸는 브랜치와 겹치면 수동 병합 |
| `src/style.css` | `.mode-bar`·`.char-open*`·`.char-dlg`·`.char-tile*`·`.char-soon`·`.char-tag`·jfsr 패널·`body.no-ewgf`, 650px 미디어 쿼리 한 줄에 몇 항목 | 650px 미디어 쿼리는 한 줄짜리라 충돌 시 양쪽 항목을 합친다 |
| `src/i18n/{ko,en,ja}.js` · `src/js/02-notices.js` | `char.*`·`mode.jfsr.*`·`hint.jfsr`·`jf.*`·`res.jf.*`·`pop.jfsr/jfStreak/sky`·`log.tJf`·`notice.20261011.*`, 캐릭터별 문구 `mode.free.desc.hwoarang`·`hint.free.hwoarang` | 양쪽 키·공지 모두 살린다 |
| `src/pages/{ko,en,ja}.js` | `guide/jfsr/` 글(frames 앞), 목록 카드, 목록 `updated` 2026-10-11, 연습 단계 문구 | 같음 |
| `worker/index.js` · `tools/board-admin.js` | `BOARDS.jfsr`, `export const CHARS`, `detail.char` | 새 보드 브랜치와 겹치면 양쪽 유지 |
| `tests/helpers/app.cjs` | `CHAR_NAMES`·`offNames`(선택 가능한 캐릭터 이름만 금지어 검사에서 뺀다) | 옷장 테스트는 여전히 전체 금지 |
| 기존 테스트 기대값 | 순위 등록 `detail`에 `char:'kazuya'`(backend·backdash·giwon-practice×2·strikes-rush·wsc), smoke-chrome(숨긴 탭 제외·`.char-tag` 제거·bd 태그 확인), smoke-locales(공지 8개·4항목) | 다른 브랜치가 새 보드·공지를 넣으면 이 기대값도 함께 맞춘다 |

새 파일: `src/js/02-chars.js`, `src/js/16-jfsr.js`, `src/assets/portrait-kazuya.webp`, `src/assets/portrait-hwoarang.webp`, `tests/chars.test.cjs`, `tests/smoke-jfsr.js`, `.agents/docs/JFSR.md`.

## 7. 테스트 (2026-10-11, 최종 상태 기준)

- `node --test "tests/*.test.cjs"`: **294/294 통과**(새 `tests/chars.test.cjs` 13개 포함 — 리뷰 수정 회귀 3개 + `modals.test`의 대화상자 목록 1개 + `moves.test`의 캐릭터별 온오프 1개).
- 브라우저 스모크 통과: 새 `smoke-jfsr`(키보드 실입력 판정 3종, 탭 필터, 패널, 도전 카운트다운, 캐릭터 버튼 → 타일 선택, `?c=` 주소, 390/1366px × ko/en/ja 레이아웃과 타일 창 스크린샷), `smoke-design`·`smoke-chrome`·`smoke-locales`(초상 교체 뒤 재실행). `smoke-mist`·`wsc`·`giwon`·`backdash`·`bindings`·`sound`는 타일 창·초상 교체 전에 통과했고 그 뒤 해당 경로는 바뀌지 않았다.
- 알려진 실패: 없음.
- 미완료(실게임 확인 필요, `PLAN.md` 1줄·`JFSR.md` 6절): 초스카이 최대 허용 시간, 히트 상태 예외, 화랑 웨이브 대시 거리·주기. 지금은 무족초·카즈야와 같은 값.

## 8. 바뀐 설계 결정·문서

- **결정 3 개정**: 선택 가능한 캐릭터(결정 34)의 이름·기술명은 텍스트로 허용. **캐릭터 선택 버튼·타일 창의 초상만 tekken.com 공식 이미지**(사용자 결정 "그냥 실제 초상화 사용해". IP 위험 — 2024-04 Bandai Namco의 TekkenMods 통지, 사이트에 AdSense·후원 — 을 알린 뒤 감수). 파일은 인라인이라 외부 요청 없음(결정 4 유지). 권리자 요청 시 두 파일 삭제 + `CHARS[id].portrait` 비우기.
- 결정 15에 한 문장(옷장은 이름 전부 금지 유지).
- **결정 33 jfsr**, **결정 34 char-select** 신설.
- 문서: `DECISIONS.md`, `AGENTS.md` 요약·라우팅(`JFSR.md`), `CODE_MAP.md`(파일 지도·기능별 색인·입력 처리 순서·새 캐릭터 추가 절차·초상 에셋), `JFSR.md`(새 기능 브리핑: 조사·출처·다음 캐릭터 후보·초상 출처·화랑 백대시 실측), `README.md`, `worker/README.md`(2026-10-11 배포 절), `PLAN.md`(실게임 확인 1줄), `log/2026-10.md`, `.agents/docs/README.md`.

## 9. 합류 후 브라우저 확인

1. 모드 탭 왼쪽 붉은 버튼에 카즈야 초상·이름이 보인다(첫 방문 기본값).
2. 버튼 → 타일 창에 카즈야·화랑 공식 초상 카드와 "추가 예정" 카드, 카즈야에 "선택됨".
3. 화랑 카드 → 창이 닫히고 버튼이 화랑, 주소에 `?c=hwoarang`, 탭이 자유 연습·초스카이 연습·웨이브 10초·백대시 10초.
4. 초스카이 연습 탭에서 `6 N 3+4`를 한 프레임에 → "초스카이!"(앞·중립 1f면 "최속 초스카이!"), `6 N 2 3+4` → "일반 스카이 (2를 거침)", 4를 늦게 → "4가 늦음 (3RK)".
5. 웨이브(6N23) 뒤 캔슬 6 → N → 3+4도 성공으로 나온다.
6. 10회 도전 → 3초 카운트다운 → 10번 뒤 결과와 「초스카이 10회」 순위 등록(워커 재배포 후).
7. 화랑으로 웨이브 10초 완주 → 순위 행에 "화랑" 태그.
8. 카즈야로 돌아가면 탭 8개(자유·웨캔기어·기원초·웨이브10·초풍20·콤보10·더미30·백대시10)와 주소에서 `?c=`가 사라지고, 초풍·무족초·통발·나락·기원권·웨캔기어가 전처럼 동작.
9. 휴대폰 폭(390px)에서 버튼이 탭 줄 위, 타일 창이 화면 안에 들어오고 세로 스크롤.
10. 새 공지(10월 11일)가 기존 방문자에게 한 번 뜨고 종 버튼 목록 맨 위에 있다.

## 10. 추가 작업 — 홀드 버튼 합성 입력 (결정 35(button-chord), 2026-10-15)

1~9절과 같은 형식으로 이 작업만 따로 적는다.

1. **목적**: 철권처럼 공격 버튼을 새로 누르는 순간 홀드 중인 공격 버튼과 묶어 동시 입력으로 읽는다(LP 홀드 + RP = LP+RP, LP+RP 홀드 → LP만 뗌 → LP 다시 = LP+RP). 기준은 `8c3d36e`(origin/main `24ab24c` + 캐릭터 선택).
2. **합류 순서**: 캐릭터 선택 커밋 `8c3d36e` 뒤(같은 브랜치라 자동). 다른 브랜치가 결정 35를 먼저 쓰면 번호를 다시 매긴다(코드 주석 5곳 `결정 35(button-chord)`·`AGENTS.md`·`DECISIONS.md`).
3. **사용자에게 보이는 변경 · 공지 필요: 예(초안만, 코드에 넣지 않음)**
   - 공격 버튼을 홀드한 채 다른 공격 버튼을 누르면 `1+2` 같은 입력 하나가 되고, **둘 이상 묶인 입력은 단일 버튼 기술(초풍·통발·기원권 RP, 나락 RK, 초스카이 RK)로 인정하지 않는다**(사용자 선택 "섞이면 다른 입력"). 예: LP를 쥔 채 6N23+RP → 초풍 아님. 기존 "다른 버튼"과 같은 처리(초풍 측정 모드의 잘못된 버튼 코치, 웨캔기어 `button` 실패).
   - 키보드·패드·터치 홀드를 합산, 패드 한 샘플에 같이 눌린 버튼도 한 입력. 입력 기록은 `1+2`, 기원초·웨캔기어 타임라인은 `LP+RP`.
   - 캐릭터별 예외 없음(판정이 입력 값과 기술 버튼을 비교만 한다).
4. **공지 초안** (10월 11일 공지에 항목으로 합칠지 별도 공지로 낼지는 통합 담당자가 사용자에게 확인)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 홀드 버튼 동시 입력 | 실게임처럼 공격 버튼을 누른 채 다른 버튼을 누르면 두 버튼이 동시 입력으로 들어갑니다. | 1. 예: LP를 누른 채 RP를 누르면 LP+RP입니다. 초풍·나락·초스카이 같은 버튼 하나짜리 기술은 나가지 않습니다.<br>2. 입력 기록에 1+2처럼 함께 표시됩니다. |
| en | Held buttons combine | As in the game, pressing an attack button while another is held enters both as one simultaneous input. | 1. Example: holding 1 and pressing 2 is 1+2, so single-button moves such as EWGF, Hell Sweep and Sky Rocket do not come out.<br>2. The input log shows it as 1+2. |
| ja | ホールドボタンの同時入力 | 実機と同じく、攻撃ボタンを押したまま別のボタンを押すと同時押しとして入力されます。 | 1. 例:1を押したまま2を押すと1+2になり、最風・奈落・青ライなどボタン1つの技は出ません。<br>2. 入力履歴に1+2のようにまとめて表示されます。 |

5. **사람 작업**: 없음(워커·D1·비밀값 변경 없음).
6. **충돌 가능 파일·보존할 동작**

| 파일 | 변경 | 보존할 동작 |
|---|---|---|
| `src/js/13-button.js` | `onButton`이 `buttonChord(n)`으로 묶은 값 `b`(`n` 또는 오름차순 `'1+2'`)를 기록·`giwonRecovery`·`buttonJudge`에 넘김 | 판정 함수들은 `n===2` 같은 비교만 하므로 묶인 문자열은 자동으로 "다른 버튼". `onButton`을 고치는 브랜치는 이 두 줄을 살린다 |
| `src/js/07-input.js` | `heldAttacks`·`buttonChord`·`chordButtons`·`btnMark`(`buttonHeld` 아래, 묶인 값은 이 함수들만 만들고 나눈다), `pollPad`의 새 버튼을 샘플당 한 번 `onButton` | 패드에서 한 샘플의 새 버튼을 하나씩 따로 `onButton`하지 않는다 |
| `src/js/08-touch.js` | `touchBtnPointers`(포인터별 홀드), 버튼 `setPointerCapture`, `touchRelease`에서 비움 | 홀드 판정은 DOM `.on` 클래스가 아니라 이 Map |
| `src/js/09-history.js` · `10-wsc.js` · `15-giwon-practice.js` · `src/style.css` | 묶인 입력 표시(`chordButtons`·`btnMark`, `+` 뒤 줄바꿈 기회), 기원초 칸 `overflow-wrap:anywhere` | 표시만 |

7. **테스트**(2026-10-16): `node --test "tests/*.test.cjs"` **300/300 통과**(`input.test` 5개 — 키보드·패드·터치 홀드, 타임라인 표기 — 와 `chars.test` 1개 추가). 브라우저 스모크 10종(backdash·bindings·chrome·design·giwon·jfsr·locales·mist·sound·wsc) 통과. 알려진 한계: 홀드 없이 **같은 60Hz 칸 안에 따로** 누른 RP→LP는 RP가 먼저 판정돼 초풍으로 남는다(실게임은 1+2). 고치려면 버튼 판정을 한 칸 미뤄야 해서 보류(사용자 판단 대기).
8. **결정·문서**: 결정 35 신설(`DECISIONS.md` 전문, `AGENTS.md` 요약), `CODE_MAP.md` 버튼 입력 처리 순서 0번 줄, `log/2026-10.md`.
9. **브라우저 확인**
   1. U(LP)를 쥔 채 6N23+I(RP) → 초풍 안 나옴, 입력 기록 `↘+1+2`.
   2. U·I를 함께 쥔 채 U만 뗐다 다시 → 입력 기록에 새 `1+2` 행.
   3. 모두 뗀 뒤 일반 초풍은 평소대로.
   4. 화랑: J(LK)를 쥔 채 6N3+K(RK) → 초스카이 안 나옴.
   5. 패드 LP·RP 동시 → 입력 기록 한 행.
