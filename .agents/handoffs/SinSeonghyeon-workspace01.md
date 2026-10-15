# 인수인계 — SinSeonghyeon/workspace01: 브라이언 + 도발 제트어퍼 연습

`.agents/docs/MERGE_PROCESS.md` 형식. 합류 직전에 이 파일은 삭제한다. 오래 남을 근거(영상 실측 F번호, 판정 설계 이유, 모션 출처, 초상 출처)는 `.agents/docs/TJU.md`로 옮겼다.

## 1. 브랜치·기준·목적

| 항목 | 내용 |
|---|---|
| 브랜치 | `SinSeonghyeon/workspace01` (원격 `origin/SinSeonghyeon/workspace01`) |
| 기반 커밋 | `32bbb61` = 통합 브랜치 `origin/wsc-sample-workspace03`의 머리(workspace00 웨캔기어 + workspace02 캐릭터 선택·초스카이가 합류된 상태). 사용자 요청 "디벨롭 최신으로 리베이스"를 이 브랜치로 fast-forward한 것으로 해석 |
| 인수인계 기준 | 기능 커밋 `7382089` "Bryan and Taunt Jet Upper practice"(2026-10-15) + 이 문서를 합류용으로 고친 뒤속 커밋 = 원격 브랜치 머리 |
| 합류 범위 | `git diff --stat 32bbb61 origin/SinSeonghyeon/workspace01` — 기능 커밋 기준 48개 파일(+1,806 −70), 새 파일 8개(6절 끝) |
| 한 줄 목적 | 사용자 요청: **브라이언**(백대시 O, 웨이브·풍신류 X)과 **도발 제트어퍼 연습**(영상 프로젝트 실측 기준, 모션 맞춤, 프레임 타임라인) |
| 상태 | 구현·테스트·코드 리뷰(1·2차) 완료, 사용자 지시로 커밋·푸시 완료(2026-10-15). 통합 대기 |

## 2. 합류 순서·의존

- **workspace00·workspace02 뒤에** 합류한다. workspace02(캐릭터 선택, 결정 34)의 `CHARS`·`MODES.needs`·`CHALLENGES`·`legacy` 분기를 그대로 쓴다. 두 브랜치는 이미 `wsc-sample-workspace03`에 들어 있다.
- 2026-10-15 fetch 기준 `wsc-sample-workspace03`은 `32bbb61`에서 움직이지 않았다 → 이 브랜치를 **fast-forward로 합칠 수 있다**(충돌 없음). 그 사이 통합 브랜치에 새 커밋이 생겼으면 6절 표로 충돌을 푼다.
- `origin/main`(`24ab24c`)은 통합 브랜치보다 4커밋, 이 브랜치보다 5커밋 뒤이고 앞선 커밋은 없다.
- 통합 브랜치에는 workspace00·02의 인수인계(`.agents/handoffs/SinSeonghyeon-workspace00.md`·`-workspace02.md`)가 아직 남아 있다. 이 문서와 함께 세 개를 처리하고 `main` 전에 모두 지운다(`MERGE_PROCESS.md` 9~10).
- 새 결정 번호 35를 썼다. 다른 브랜치도 35를 만들었으면 합류 순서대로 다시 매기고 코드 주석 `결정 N(slug)`·`AGENTS.md` 요약·`DECISIONS.md` 제목을 함께 고친다(`tests/docs.test.cjs`가 대조).

## 3. 사용자에게 보이는 변경 · 공지 필요: **예(이미 넣음)**

1. 캐릭터 타일에 **브라이언**(초상 = tekken.com 공식 이미지, 5절·8절). `?c=bryan`. 모드 탭 = 자유 연습 · 도발 제트어퍼 연습 · 백대시 10초, 순위 탭 = 백대시 10초 · 도발 제트어퍼 10회.
2. 웨이브가 없는 캐릭터 화면(`body.no-wave`): 웨이브·초풍 타일, 초풍 기록·웨이브 카드를 숨기고 "연습 분석" 링크는 최고 기록 카드로. 코치 칸은 도발 박자 안내와 빈 도발 막대로 시작.
3. **도발 판정**: 1·3·4가 같은 60Hz 칸이면 도발(나뉘면 "도발 안 나감"). 28f 무릎(+16), 첫 입력 32f까지 캔슬(28f까지는 무릎 전), 33~77f 무시. 후속기는 44f까지 맞으면 콤보. **29f 6 · 30f N · 31f 4+RP = 도발 제트어퍼**. 가드·무릎 전 캔슬·입력 무시·캔슬 안 함·←+RP(N 없음)·RP 먼저를 구분. 더블 도발은 첫 도발 기준. 자유 연습에서도 판정하고, 10회 도전도 같은 판정이다(카운트다운부터 쥔 방향 포함).
4. **단독 제트어퍼**(도발 없이 6N4+RP): 앞·중립·4 먼저 프레임과 최속(앞 1f · 중립 1f · 4+RP 동시 = 6부터 16f) 표시. 도발 시도로 세지 않음.
5. **도발 제트어퍼 연습 탭**: 프레임 타임라인(1f · 2~12f · 13~34f 한 칸씩 · 35~77f, 캔슬·무시 구간, 무릎·목표·44f, +16, 실제 누른 후속기의 커맨드·발동 막대. 사용자 요청으로 입력 무시는 33·34f + 한 칸, 캔슬 쪽이 축의 약 85%, 44f는 접힌 칸 안 초록 눈금), 6칸 평가·고칠 점·단독 줄·세션 기록·최근 표, **10회 도전** → 새 순위표 「도발 제트어퍼 10회」(`tju`).
6. **1+3+4 키**(설정 키보드/패드 목록 맨 끝, 기본 L·패드 RB): 한 번에 LP·LK·RK. 도발이 있는 캐릭터에서만 동작(카즈야·화랑은 예전처럼 아무 일 없음). 옛 저장값이 그 키를 이미 쓰면 비워 두고, 비운 키는 다시 지정할 때까지 그대로. 터치 화면에 도발 버튼(브라이언만, 가로 화면에서도 터치 영역 안). 브라이언의 무대 연속 카운터는 BACKDASH.
7. 연출: 실측 영상의 도발 자세 — 사용자 지적으로 게임 입력 기록 프레임에 다시 맞춤(두 팔을 앞뒤로 벌리고, 팔을 벌린 채 무릎이 22~28f에 천천히 올라와 28f 명중, 무릎 든 채 버팀, 뒷손 허리·앞팔 뻗기, 77f 앞 주먹을 세우며 주황빛 → 김, 끝난 뒤 잠깐 그 자세. 웅크림·점프 없음), 무릎 명중 시 더미가 44f까지 휘청(가드된 후속기의 GUARD는 그 뒤 명중 프레임에), 캔슬하면 머리 불꽃, 제트어퍼(웅크렸다 올려치기). 효과음은 기존 음원.
8. 가이드 글 `guide/tju/`(ko/en/ja) + 가이드 목록 카드.
9. 카즈야·화랑은 기존 동작 그대로(기존 테스트 전부 통과).

## 4. 공지 (최종 문자열은 `src/i18n/*.js`의 `notice.20261015.*`, `NOTICES` 맨 위 `2026-10-15-tju`)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 10월 15일 업데이트 · 브라이언과 도발 제트어퍼 연습 | 캐릭터 선택에 브라이언을 추가했습니다. 도발(1+3+4) 뒤 제트어퍼를 프레임 타임라인으로 연습할 수 있습니다. | 1. 브라이언: 백대시는 그대로, 웨이브와 풍신류 기술은 없습니다. 고르면 도발 제트어퍼 연습 탭이 나타납니다.<br>2. 도발 제트어퍼: 도발을 누른 프레임을 1f로 세어 28f 무릎과 29f 6 · 30f N · 31f 4+RP를 프레임마다 보여 줍니다. 판정은 철권 8 실측값입니다.<br>3. 설정의 1+3+4 키(키보드 L)로 LP·LK·RK를 한 번에 누를 수 있습니다. 터치 화면에는 도발 버튼이 생깁니다.<br>4. 도발 제트어퍼 연습 탭의 10회 도전 결과가 새 순위표 「도발 제트어퍼 10회」에 올라갑니다. |
| en | October 15 update · Bryan and Taunt Jet Upper practice | Bryan joins the character select. Practice the taunt (1+3+4) into the Jet Upper on a frame timeline. | 1. Bryan: backdash as usual, no wavedash and no Mishima moves. Picking him shows the Taunt Jet Upper tab.<br>2. Taunt Jet Upper: counting the taunt press as 1f, the timeline shows the 28f knee and f 29f · n 30f · b+2 31f frame by frame. The numbers are TEKKEN 8 measurements.<br>3. The 1+3+4 key in the settings (L on the keyboard) presses LP, LK and RK at once. Touch screens get a taunt button.<br>4. The 10-try challenge on the Taunt Jet Upper tab goes to the new Taunt Jet Upper ×10 leaderboard. |
| ja | 10月15日アップデート · ブライアンと挑発ジェット練習 | キャラクター選択にブライアンを追加しました。挑発(1+3+4)からのジェットアッパーをフレームタイムラインで練習できます。 | 1. ブライアン: バックダッシュはそのまま、ウェーブと風神系の技はありません。選ぶと挑発ジェット練習タブが表示されます。<br>2. 挑発ジェット: 挑発を押したフレームを1fとして、28fの膝と29f 6 · 30f N · 31f 4+RPをフレームごとに表示します。判定は鉄拳8の実測値です。<br>3. 設定の1+3+4キー(キーボードのL)でLP・LK・RKを一度に押せます。タッチ画面には挑発ボタンが付きます。<br>4. 挑発ジェット練習タブの10回チャレンジの結果が新しいランキング「挑発ジェット10回」に載ります。 |

같은 묶음의 다른 공지와 합칠지는 통합 담당자가 사용자에게 확인한다. 합치면 `tests/smoke-locales.js`(공지 9개·최신 4항목)와 `tests/i18n-pages.test.cjs`(공지 id 목록·항목 수) 기대값도 맞춘다.

## 5. 사람 작업과 순서

1. **통합**: 이 브랜치를 `wsc-sample-workspace03`(또는 새 통합 브랜치)에 합치고 `MERGE_PROCESS.md` 체크리스트대로 세 인수인계를 반영·삭제한다. `main`은 건드리지 않는다.
2. **사용자 확인**(`main` 전):
   - 브라이언 초상 `src/assets/portrait-bryan.webp`(결정 3 예외 — 2026-10-11 카즈야·화랑 초상 결정을 그대로 적용). 2026-10-15 사용자가 이 기능의 커밋·푸시를 지시해 **초상이 포함된 채 기능 브랜치에 올라가 있다**. 결정 3 요약·`TJU.md` 6절·`PLAN.md`의 "확인 필요" 표시는 그대로 두었으니 확인을 받으면 표시를 정리하고, 거절하면 파일을 지우고 `CHARS.bryan.portrait`를 비운다.
   - 결정 35 규칙 전체(에이전트가 영상 실측에서 옮긴 것, `PLAN.md` 실게임 확인 대기).
3. **워커 재배포**(사이트 푸시보다 먼저): `cd worker; npx wrangler@latest deploy`. 바뀐 것: `BOARDS.tju`(`CHALLENGE_10`), `CHARS`에 `bryan`. **스키마·D1 마이그레이션·비밀값 없음.**
4. **사이트 푸시**(`main` → Pages Actions). 기능 브랜치·통합 브랜치 푸시는 배포되지 않는다(`pages.yml`은 `main`만).
- 순서가 바뀌면: 재배포 전까지 도발 제트어퍼 10회 등록이 400 `board`로 거부되고 순위 바에 실패 문구(데이터 손실 없음). 그동안 브라이언의 bd10 기록은 옛 워커가 `char`를 버려 카즈야로 표시된다.
- 관리자 도구 `tools/board-admin.js`에 `tju`('도발 제트어퍼 10회') 추가.

## 6. 충돌 가능 파일과 반드시 보존할 동작

| 파일 | 이 브랜치의 변경 | 보존할 동작 |
|---|---|---|
| `src/js/00-core.js` | `GIWON_ZOOM` 앞에 도발 제트어퍼 모델 블록: `TJ`(실측 상수)·`TJ_LAST`(44)·`TJ_GO`(31)·`TJ_SIX`(29)·`TJ_TAUNT` | 다른 브랜치가 상수를 더하면 양쪽 블록 유지 |
| `src/js/02-chars.js` | `CHARS.bryan`(`caps` wave·wsc·giwon 없음, `moves:['tju']`, `tj:{move:'tju'}`, `portrait`), 머리 주석의 `tj` 설명 | 새 캐릭터를 더하는 브랜치와 겹치면 양쪽 항목 유지(항목 순서 = 타일 순서) |
| `src/js/11-crouch-dash.js` | `onDir`: 카운트다운 검사 **앞**에서 `tjDir`(도발 리더는 카운트다운 중에도 방향을 받는다 — 2차 리뷰), 검사 뒤 잠금이면 `return` · `commandDir`: `switch` 앞 `if(!charCap('wave')) return;` | 카즈야·화랑은 `tjDir`가 즉시 false(도발 레시피 없음), `wave`가 있어 그대로. `onDir`에 return을 더할 때 `tjDir` 호출은 그 위에 둔다 |
| `src/js/13-button.js` | `MOVE_FORCED.tju`, `commandButton`의 비legacy 분기: `charOf().tj ? tjButton : jfButton` | 화랑은 `jfButton` 그대로 |
| `src/js/03-store.js` | `DEFAULT_KEYS.bt`·`DEFAULT_PAD.bt`·`altKeys.bt`, 로드 때 옛 저장값이 그 키·버튼을 쓰면 `bt`만 비움(`''`/`'none'`), 비운 채 저장된 `bt`는 그대로 | 옛 키 설정이 기본값으로 초기화되지 않아야 한다(`tju.test` 회귀) |
| `src/js/07-input.js` · `08-touch.js` | `tauntCode`·`pressTaunt`, keydown의 도발 키, 패드 5번째 동작, `resetInput`의 `tjChallengeCancel`·`tjClear`, 터치 `t` | 1~몇 줄, 양쪽 유지 |
| `src/js/18-hud.js` · `36-boot.js` | `updateHud`: 웨이브 없는 캐릭터는 무대 연속 카운터가 백대시 · 부트: 웨이브 없는 캐릭터면 `coachForChar()` | 각 1줄 |
| `src/js/20-trials.js` | `MODES.tju`, `CHALLENGES.tju`, `renderMode`→`renderTj`, `renderCharUI`의 `body.no-wave`·분석 링크·터치 도발 버튼 | 새 모드는 `needs` 선언 |
| `src/js/31-stage.js` · `33-fighter.js` · `35-dojo3d.js` | `fx.taunt`·`taunt2`·`tauntCut`·`knee`·`tauntEnd`·`tjMove(key, how, n, at)`, `HIT_CONTACT_MS`(knee·ju·tjs), `dummyGuard(at)`(판정 명중 프레임 시각), `TJ_FLAME_MS`·`TJ_STEAM_MS`, `parkPx`, `tryHit(move, until)`의 무릎 휘청, `updateDummy`의 가드 링·회복 · 도발 자세표 `TJ_POSE`·`tjTauntPose`·`TJ_CUT_F`, 다리 `knee` 관절, 포즈 `taunt`·`tjCut`·`ju`·`bknee`, `fist.head` · `canWalk`의 `!tjBusy()`(도발 자세는 `taunt`), 빛·불꽃·김 | 더미 처리(`tryHit`·`updateDummy`)를 바꾸는 브랜치와 겹치면 수동 병합 |
| `src/js/17-coach.js` · `19-tick.js` · `23-settings-ui.js` · `30-language.js` · `01-wardrobe-items.js` | `renderSeg` tj 변형·`coachForChar`, `tjTick`·`tjChallengeTick`·`renderTjLive`, `KEYLABEL.bt`·세션 초기화, `renderTj`, `LIFE_KEYS.tju` | 각 1~몇 줄 |
| `src/app.html` | include `js/16-tju.js`(`16-strikes` 뒤)·`js/17-tju-practice.js`(`17-coach` 뒤) — 숫자순 테스트, tju 모드·순위 탭, 도전 버튼, `#tjTimeline`·`#tjPanel`(bdpTimeline 앞), 터치 도발 버튼, `#analysisLink`·`#bestsCard` id, 설정의 `set.tauntHelp` | 같음 |
| `src/style.css` | `body.tju-mode`·`#tjTimeline`·`.tj-band`·`#tjPanel`, `body.no-wave` 숨김, 750px 미디어 쿼리 한 줄에 `tju-mode`·`#tjPanel` | 한 줄짜리 미디어 쿼리는 충돌 시 양쪽 항목 합침 |
| `src/i18n/{ko,en,ja}.js` · `src/js/02-notices.js` | `char.bryan.*`·`mode.tju.*`·`tj.*`(29f 키는 `tj.sixCount`·`tj.c.cancelSix`·`tj.s.cancelSix`)·`set.tauntHelp`·`touch.taunt`·`pop.tju*`·`log.tTj/tJu`·`notice.20261015.*` 등 약 155키씩, 공지 맨 위 | 양쪽 키·공지 모두 살린다 |
| `src/pages/{ko,en,ja}.js` | `guide/tju/` 글(frames 앞), 목록 카드, 목록 `updated` 2026-10-15 | 같음 |
| `worker/index.js` · `tools/board-admin.js` | `BOARDS.tju`, `CHARS`에 `bryan`, 관리자 목록 | 새 보드 브랜치와 겹치면 양쪽 유지 |
| 문서: `AGENTS.md` · `.agents/docs/DECISIONS.md` · `CODE_MAP.md` · `PLAN.md` · `log/2026-10.md` · `README.md` · `worker/README.md` | 결정 35 요약·전문, 결정 3·32·34 보완, 라우팅 `TJU.md` · 파일 지도(`16-tju`·`17-tju-practice`)·색인·입력 순서 1½·"도발 제트어퍼" 절 · PLAN 2줄(결정 35 확인, 코드 정리: 10회 도전 공용화) · log 3줄 · README "도발 제트어퍼 연습" 절·캐릭터 행 · worker "2026-10-15" 절 | 결정 번호가 겹치면 다시 매김(2절). 그 밖에는 양쪽 항목 합침 |
| 기존 테스트 기대값 | `tests/helpers/app.cjs`(금지어·선택 가능 이름에 브라이언), `moves.test`(`bryan:{tju:1}`), `i18n-pages.test`(공지 id·항목 수), `smoke-locales`(공지 9개) | 다른 브랜치가 공지·캐릭터를 넣으면 함께 맞춘다 |

새 파일: `src/js/16-tju.js`(판정), `src/js/17-tju-practice.js`(연습 모드), `src/assets/portrait-bryan.webp`, `tests/tju.test.cjs`, `tests/smoke-tju.js`, `.agents/docs/TJU.md`, `.agents/docs/reviews/2026-10-15-tju-review.md`, 이 파일.

## 7. 테스트·리뷰

- `node --test "tests/*.test.cjs"`: **312/312 통과**(새 `tests/tju.test.cjs` 19개 — 판정 표·늦은 입력·키보드 SOCD·옛 저장값·타임라인(13~34f 한 칸씩·35~77f 한 칸·44f 눈금·막대 위치)·도발 자세(22→28f 무릎·팔 벌림·캔슬 연결)·10회 도전·워커 검증, 2차 리뷰 회귀(카운트다운 중 방향·29f 상수·느린 제트어퍼·비운 1+3+4 키·가드 시각) 포함). 커밋 `7382089` 직전 작업 트리에서 실행.
- 브라우저 스모크 11종 통과(`smoke-chrome`·`tju`(신규)·`jfsr`·`bindings`·`locales`·`design`·`backdash`·`giwon`·`mist`·`sound`·`wsc`, 페이지 오류 0). 리뷰 수정 뒤, 코치 칸 수정 뒤, 타임라인·도발 모션 수정 뒤에 전체를 다시 돌렸다(그 회차 11/11 통과, 그 뒤 고친 캔슬 연결·가이드 문단은 `tju`·`locales`·`design`을 다시 돌려 통과. 앞선 실행에서 `bindings`가 다른 Chrome과 겹친 1회만 실시간 대기 구간에서 실패했고 단독 재실행 3/3 통과).
- 2차 리뷰 수정 뒤(커밋 직전) 스모크 11종을 순서대로 다시 돌려 10종 통과. `sound`만 두 창 BGM 검사(300ms 실시간 대기)에서 1회 실패했고 단독 재실행 4/4 통과(소리 코드·그 테스트는 이 브랜치에서 바뀌지 않음). 걷기 확인 스크립트(도발 중 6을 쥐어도 제자리, 끝난 힘준 자세는 걷기가 끊음) 통과.
- 코드 리뷰: `.agents/docs/reviews/2026-10-15-tju-review.md` — 1차 발견 6건 모두 수정(늦게 도착한 입력 판정, 옛 저장값 보조 입력, 김 연출, 가로 화면 터치, L·RB가 카즈야에서 나락을 내던 것, 브라이언 무대 카운터)과 시연 영상을 준비하다 찾은 7번째(브라이언 코치 칸에 크라우치 대시 안내가 남던 것). 2차 리뷰(다른 세션)의 버그 5건·유지보수 7건은 10회 도전 공용화(B, `PLAN.md`)만 남기고 반영했다.
- 알려진 실패: 없음(`sound`·`bindings`의 실시간 대기 흔들림은 위와 같이 단독 재실행 통과). 미완료: 결정 35·브라이언 초상 사용자 확인(5절 2, `PLAN.md`), 10회 도전 공용화(`PLAN.md` 코드 정리).

## 8. 바뀐 설계 결정·문서

- **결정 35(tju) 신설**, 결정 3(브라이언 이름·초상), 32(브라이언 기술 스위치), 34(브라이언·`no-wave` 화면) 보완. `DECISIONS.md` 전문·`AGENTS.md` 요약·라우팅(`TJU.md`).
- 결정 35는 사용자 요청을 바탕으로 **에이전트가 영상 실측에서 옮긴 규칙**이라 사용자 확인이 필요하다(`PLAN.md` 실게임 확인 대기 1줄). 브라이언 초상도 2026-10-11 예외를 그대로 적용한 것이라 확인 필요 — 커밋·푸시는 사용자 지시로 했지만 결정 문서의 확인 표시는 바꾸지 않았다(5절 2).
- 문서: `CODE_MAP.md`(파일 지도·색인·입력 순서·"도발 제트어퍼" 절), `TJU.md`(신규), `README.md`, `PLAN.md`(결정 35 확인, 코드 정리: 10회 도전 공용화 — 2차 리뷰 B), `log/2026-10.md`, `worker/README.md`(2026-10-15 절), `reviews/2026-10-15-tju-review.md`(1·2차).

## 9. 합류 후 브라우저 확인

1. 캐릭터 버튼 → 브라이언: 탭이 자유 연습 · 도발 제트어퍼 연습 · 백대시 10초만, 웨이브·초풍 타일이 없다. 코치 칸은 도발 박자 안내.
2. 도발 제트어퍼 연습 탭에서 L(1+3+4) → 29f 6 · 30f N · 31f 4+RP: 결과 "도발 제트어퍼!", 타임라인 28f 빨강(무릎)·29~31f 표시·초록 발동 막대. 13~34f는 한 칸씩 넓게, 입력 무시 35~77f는 좁은 한 칸이고 그 안의 초록 눈금이 44f. 6을 한 박자 늦추면 "가드됨", L만 누르고 기다리면 "캔슬하지 않은 도발". 통계의 "29f 캔슬"은 29f에 캔슬했을 때만 오른다.
3. 도발 동작(두 팔을 양쪽으로 천천히 벌리고 22f부터 무릎이 천천히 올라와 28f 명중 → 주먹을 가슴 앞으로 모아 버팀 → 77f 힘주기·주황빛 → 김), 무릎에 더미가 휘청, 제트어퍼에 더미가 뜬다. 30f ←+RK(뒷무릎, 가드)는 더미가 휘청임을 멈춘 뒤에 GUARD가 뜬다.
4. 10회 도전: 카운트다운 중에 →를 누른 채로 두고, 시작 뒤 L → 29f에 → 놓기 = "29f 캔슬"(자유 연습과 같은 판정). 10회를 마치면 「도발 제트어퍼 10회」 등록(워커 재배포 뒤).
5. 카즈야·화랑으로 돌아가 기존 모드·판정이 그대로인지(L·RB는 아무 일 없음).
