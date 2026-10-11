# 인수인계 — SinSeonghyeon/workspace00 (웨캔기어 한마디 #105·#104)

## 1. 브랜치·기준·목적

- 브랜치 `SinSeonghyeon/workspace00`, 기준 커밋 `0975f49`(origin/main) 위 작업 트리.
- 목적: 웨캔기어 연속이 끊기는 문제(#105) 수정 — 10회 도전의 웨이브 횟수 과제 제거, A 구간(3→4 사이) ↓·↙ 허용.

## 2. 합류 순서·의존

- 의존 없음. 다른 브랜치보다 앞뒤 어느 쪽이든 합류 가능.

## 3. 사용자에게 보이는 변경 / 공지 필요: 예

- 웨캔기어 10회 도전에 "웨이브 N회 후" 과제가 없어지고 10번을 타이밍만으로 평가. `#wscTask` 줄 삭제.
- 3에서 4로 갈 때 ↓·↙를 지나도 실패하지 않음(A는 여전히 4가 들어온 프레임).
- 가이드(웨캔기어) ko/en/ja 문구와 `updated` 날짜 2026-10-11.
- 214를 1 기준으로 인정하는 것(#104)은 실게임 규칙 불명이라 넣지 않음.

## 4. 공지 초안

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 웨캔기어 판정·10회 도전 변경 | 한마디 의견을 반영해 웨캔기어 연속이 끊기던 문제를 고쳤습니다. | 1. 3에서 4로 갈 때 ↓·↙를 지나도 실패하지 않습니다(타이밍은 4가 들어온 프레임 기준).<br>2. 10회 도전의 "웨이브 N회 후" 과제를 없앴습니다. 이제 웨캔기어 10번을 타이밍만으로 평가합니다. |
| en | WSC judging and 10-try challenge update | Fixed WSC streaks breaking, based on board feedback. | 1. Passing through down or down-back on the way from d/f to back no longer fails (timing still counts from the back input).<br>2. The 10-try challenge no longer asks for a set number of waves; all 10 tries are judged on timing only. |
| ja | ウェーブキャンセル立ち途中RPの判定・10回チャレンジ変更 | 一言の意見を反映し、連続成功が途切れる問題を直しました。 | 1. 3から4へ向かう途中で↓・↙を通っても失敗になりません(タイミングは4が入ったフレーム基準)。<br>2. 10回チャレンジの「ウェーブN回後」課題をなくし、10回をタイミングだけで判定します。 |

## 5. 배포 전후 사람 작업

- 없음. 워커·D1 변경 없음(`wsc` 보드 점수 형식 그대로). 단, 이전 순위 기록은 횟수 과제가 있던 때의 점수와 섞인다(사용자 인지 사항).

## 6. 충돌 가능 파일·보존할 동작

- `src/js/10-wsc.js`(`wscDir` A 구간 허용 방향, `wscFinish`에서 taskN/waves/timingOK 제거, `renderWscChallenge`의 `#wscTask` 제거).
- `src/i18n/{ko,en,ja}.js` 448~449행 한 줄(`wsc.task`·`wsc.waveResult` 삭제, `wsc.challengeHint` 변경) — 다른 브랜치가 같은 줄 키를 추가했으면 양쪽 보존.
- `src/pages/*.js` 웨캔기어 가이드, `src/app.html`(`#wscTask` 한 줄 삭제).
- `tests/helpers/app.cjs`: `wscTaskRun` → `wscChainRun`(과제 개념 제거). 다른 브랜치 테스트가 옛 이름을 쓰면 합류 때 바꾼다.
- 보존: B 구간은 뒤 유지·중립만, 대각 재입력·위쪽 방향은 A 구간에서도 무효, 다른 모드의 초풍 판정 불변.

## 7. 테스트

- `node --test "tests/*.test.cjs"`: 278/278 통과.
- `node tests/smoke-wsc.js`, `node tests/smoke-chrome.js`, `node tests/smoke-locales.js`: 모두 errors [].
- 새 테스트: `wsc.test.cjs` "A window lets 3→4 pass through down and down-back"(실제 키보드 해제 순서 3종 × 8회 연속 = 8연속), "challenge and session streaks follow timing only".

## 8. 결정·문서

- 결정 25·26 전문(`DECISIONS.md`)과 AGENTS 요약 25 갱신. `WSC_PRACTICE.md` 14절, `CODE_MAP.md` 웨캔기어 절, `README.md`, `worker/README.md`, `log/2026-10.md`.

## 9. 합류 후 브라우저 확인

- 웨캔기어 연습: 6N23 후 → 먼저 떼고(↓만 남김) ← → RP가 성공. ↓→ 누른 채 ← → →·↓ 떼고 RP도 성공.
- 10회 도전: 과제 줄이 없고, 웨이브 횟수와 무관하게 타이밍 성공이 연속으로 쌓임.
