# 인수인계: wave5-challenge

## 1. 브랜치·기준·목적

- 브랜치: `wave5-challenge`. 작업한 워크트리 브랜치는 `wsc-sample-workspace03`이었고, 내용에 맞게 푸시 전에 이름을 바꾼다.
- 기준 커밋: `b0b11fb`(main, 2026-10-17 배포 문서).
- 목적: 도전 모드에 시간 기록 도전 **웨이브 5회**를 더한다(결정 42). 크라우치 대시 5번을 첫 대시의 6부터 다섯 번째 3까지 초(소수 둘째 자리)로 재고, 빠른 순으로 순위를 매긴다.

## 2. 합류 순서·의존

- main 위에 바로 올라가며 의존하는 브랜치는 없다.
- 다른 브랜치가 새 결정 42를 만들었으면, 합류 순서대로 번호를 다시 매긴다. 고칠 곳:
  - `DECISIONS.md` 제목
  - `AGENTS.md` 요약
  - 코드 주석의 `결정 42(wave5)`

## 3. 사용자에게 보이는 변경·공지

- 도전 모드 창의 순서가 웨이브 10초 · **웨이브 5회** · 더미 격파 30초 · 백대시 10초가 된다.
- 순위표에 "웨이브 5회" 탭이 생긴다. 그 보드에도 다시보기와 왕관이 붙고, 등급(SS~D)도 매긴다.
- 웨이브가 있는 캐릭터(카즈야·화랑)에게만 보인다. 연습 탭은 따로 없다.
- GO 뒤 20초 안에 다섯 번을 못 채우면 "20초 초과 · 대시 n/5 — 기록되지 않습니다"만 뜬다.
- 공지가 필요하다. `NOTICES` 맨 앞의 `2026-10-17-wave5`와 i18n 키 `notice.20261017b.*`로 이미 넣어 두었다. 날짜는 실제 배포일로 바꿔도 된다.

## 4. 공지 초안 (반영됨)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 10월 17일 추가 · 도전 모드 「웨이브 5회」 | 크라우치 대시 5번을 얼마나 빨리 끝내는지 겨루는 시간 기록 도전을 추가했습니다. | 1. 도전 모드에 「웨이브 5회」가 생겼습니다. 첫 대시의 6부터 다섯 번째 대시의 3까지 걸린 시간을 초(소수 둘째 자리)로 재고, 빠를수록 순위가 높습니다.<br>2. 중간에 끊기거나 MISS가 나도 횟수는 이어지고 그만큼 시간만 늘어납니다. GO 뒤 20초 안에 다섯 번을 채우지 못하면 기록되지 않습니다. 상위 10명의 도전은 다시보기로 남습니다. |
| en | October 17 addition · Challenge “Wave ×5” | A new timed challenge: how fast can you finish five crouch dashes? | 1. Challenge Mode now has “Wave ×5”. The time from the first dash’s 6 to the fifth dash’s 3 is measured in seconds (two decimals); faster ranks higher.<br>2. A break or a MISS does not reset the count, it only costs time. If the fifth dash has not come 20 seconds after GO, nothing is recorded. The top 10 runs are kept as replays. |
| ja | 10月17日 追加 · チャレンジ「ウェーブ5回」 | 風神ステップ5回をどれだけ速く終えられるかを競うタイムチャレンジを追加しました。 | 1. チャレンジモードに「ウェーブ5回」を追加しました。1回目の6から5回目の3までの時間を秒(小数第2位)で測り、速いほど上位です。<br>2. 途中で途切れたりMISSが出ても回数はそのまま続き、その分時間が延びるだけです。GOから20秒以内に5回に届かなければ記録されません。上位10人の挑戦はリプレイとして残ります。 |

## 5. 배포 전후 사람이 할 일 (순서)

1. **워커 재배포를 사이트 푸시보다 먼저** 한다: `cd worker; npx wrangler@latest deploy`.
   - 바뀌는 것: `BOARDS.wave5`, `CROWN_BOARDS`, `validate`.
   - 스키마 변경과 D1 마이그레이션은 없다. `schema.sql`은 주석만 바뀌어 다시 적용할 필요가 없다.
   - 절차는 `worker/README.md` "2026-10-17 웨이브 5회 보드 추가"에 있다.
2. 그다음 사이트를 푸시한다.
   - 순서가 바뀌면, 그사이 웨이브 5회 등록과 `/top?board=wave5` 조회가 실패한다.
   - 반대로 옛 사이트에 새 워커가 붙는 것은 안전하다. 옛 사이트의 왕관 표시가 모르는 보드를 거르기 때문이다.

## 6. 충돌 가능 파일·보존할 동작

**충돌 가능 파일**
- `src/i18n/{ko,en,ja}.js`: 새 키, 그리고 공지 키가 `notice.20261017.title` 앞에 있다.
- `src/js/02-notices.js`: 맨 앞 항목.
- `src/js/01-wardrobe-items.js`: `TRIAL_MODES`에서 wave10 바로 뒤에 `wave5`가 있다. 이 순서를 탭·워커 보드·도전 창이 따른다.
- `src/js/20-trials.js`: `MODES`, `endTrial`, `trialTick`, `recText`, `wave5Sec`.
- `src/js/11-crouch-dash.js`: `completeCD`.
- `src/js/22-share-model.js`, `src/js/29-backend.js`.
- `src/app.html`: 순위 탭 버튼.
- `worker/index.js`.
- 테스트 기대값 목록: 공지 id·개수, 순위 탭 4개, 캐릭터별 도전 목록(`smoke-chrome`·`smoke-jfsr`·`smoke-locales`·`chars`·`wardrobe-rewards`·`i18n-pages`).

**반드시 보존할 동작**
- 점수는 −(1/100초 정수)다(1.23초 → −123). 앱과 워커의 "높을수록 위" 비교를 그대로 쓰므로 정렬 쿼리를 바꾸지 않는다.
- 시계는 첫 완성 대시의 `cd.tF`(6)부터 다섯 번째 대시의 3까지 잰다. `completeCD`는 맨 끝에서 `endTrial`을 부르므로, 그 대시의 결과 표시가 끊기지 않는다.
- GO 뒤 20초가 지나면 실패다. 기록·`life.trials`·등록·다시보기를 하나도 남기지 않는다. 제한 시각이 지난 뒤 들어온 입력은 세지 않는다(`trialTick`이 입력 판정보다 먼저 돈다).
- `MODES.wave5.limit`은 wave5 분기만 읽는다. 범용 `trial.limit`은 없앴다.
- `endTrial`은 `store.life.trials[mode]++`를 기록과 **같은 `save()`**에 담는다(리뷰 반영). `smoke-replay`가 저장소의 `life.trials`를 기다리는 것이 이것을 전제로 한다.

## 7. 테스트

- 단위 테스트 `node --test "tests/*.test.cjs"`: 358개 모두 통과.
- 브라우저 스모크:
  - 첫 구현 때 12개 모두 통과.
  - 리뷰를 반영한 뒤 `smoke-replay`·`smoke-chrome`·`smoke-jfsr`·`smoke-locales`를 다시 돌려 통과했다. 웨이브 5회 다시보기는 2.38초로 순위표 행과 같았다.
- `node tools/build-site.js`: 통과.
- 알려진 실패·미완료는 없다.
- 다른 세션의 리뷰에서 직접 재현해 본 두 경우도 문제가 없었다.
  - 1ms 시계(Firefox·Safari)에서 0.005초 경계 반올림: 400판, 주사율 3종에서 불일치 0건.
  - 화랑의 지연 판정: 실제 런과 다시보기가 같았다.

## 8. 설계 결정·문서

- **결정 42(wave5)를 새로 만들었다.**
  - 결정 38의 도전 목록 문장도 고쳤다.
  - 동점 규칙(최고 연속이 긴 쪽)은 에이전트 기본안이다. `PLAN.md`에서 사용자 확인을 기다린다.
- 갱신한 문서:
  - `AGENTS.md`, `DECISIONS.md`, `CODE_MAP.md`
  - `PLAN.md`, `log/2026-10.md`
  - `README.md`, `worker/README.md`, `worker/schema.sql`(주석)
  - `src/pages/{ko,en,ja}.js`(가이드·소개)

## 9. 합류 후 브라우저 확인

- **도전 모드 창**: 카즈야로 열면 웨이브 10초 · 웨이브 5회 · 더미 격파 30초 · 백대시 10초가 이 순서로 나온다. 화랑에게도 웨이브 5회가 있고, 브라이언에게는 없다.
- **진행 중**:
  - 웨이브 5회 → 도전 시작을 누른다.
  - GO 뒤 타이머는 `0.00`이다가 첫 대시가 완성되면 흐른다.
  - 진행 표시가 `1 / 5`처럼 바뀐다.
- **완료 시**:
  - 다섯 번째 대시에서 곧바로 끝난다.
  - 화면 가운데에 `1.23 s`, 아래에 `대시 5회 · 1.23초`가 뜬다.
  - 결과 카드의 지표는 최고 연속 대시와 웨이브 속도다.
- **실패 시**: GO 뒤 아무것도 하지 않으면 20초 뒤 "20초 초과 …"가 뜨고 기록이 남지 않는다.
- **배포 뒤**: 순위표 "웨이브 5회" 탭에 `0.00초` 형식으로 나온다. ▶ 다시보기가 같은 시간으로 끝난다. 공지가 한 번 뜬다.
