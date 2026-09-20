# 무족초 입력 기능 인수인계

- **2026-09-21 최종 사용자 확정:** 웨이브·일반 초풍·나락·웨캔기어 모두 `6N23` 필수, `623`은 금지. 시작 앞→아래에서 중립 오류로 기존 커맨드와 WSC 후보를 취소한다. 웨이브 수·점수·기술 성공 없음. WSC 도전은 같은 과제 재시도. 무족초 `6N3+RP` 유지. 공지 초안은 ko 「웨이브·일반 초풍·나락·웨캔기어 모두 6N23의 중립 필수」 / en 「Wave, standard EWGF, Hellsweep and WSC all require neutral in 6N23」 / ja 「ウェーブ・通常の最風・奈落・WSCはすべて6N23の中立が必須」로 갱신할 것.
- 브랜치: `SinSeonghyeon/workspace01`. 최종 기준: `d7cc7a2`(origin/main). 최초 `e225da2`에 사용자 지시로 리베이스한 뒤, 최종 확인에서 AdSense 연결 커밋이 추가되어 다시 `git rebase --autostash origin/main`을 수행했다. 코드 자동 복원, PLAN 진행 로그만 양쪽 기록을 보존해 충돌 해결. 이 기능은 아직 미커밋 작업 트리이며 에이전트는 커밋·푸시하지 않았다.
- 목적: 독립 `6N3+RP`의 무족초/최속 무족초 구분과 앞·중립·RP 프레임 피드백.
- 의존/순서: 위 main의 공통 60Hz 초풍, WSC, 최신 UI/순위 수정과 승인된 AdSense 연결 코드를 보존. 다른 기능 브랜치 선행 합류는 필요 없음.
- 공지 필요: 예. 아래는 초안이며 NOTICES에는 아직 추가하지 않음.

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 무족초 연습 추가 | 6N3+RP와 최속 입력을 연습할 수 있습니다. | 1. 무족초 성공과 앞·중립 각각 1f인 최속 성공을 구분합니다.<br>2. 결과와 구간 막대에 앞·중립·RP 프레임을 표시합니다.<br>3. 독립 입력부터 지원하며 대시·웨이브 연결은 제외합니다. |
| en | Mist Step EWGF practice | Practice 6N3+RP and the fastest input. | 1. Distinguishes successful input from the fastest input with one frame each of forward and neutral.<br>2. Shows forward, neutral and RP timing.<br>3. Supports standalone input; dash and wave links are excluded. |
| ja | 無足最風の練習を追加 | 6N3+RPと最速入力を練習できます。 | 1. 成功と前・中立各1fの最速成功を区別します。<br>2. 結果と区間バーに前・中立・RPのフレームを表示します。<br>3. 単独入力に対応し、ダッシュ・ウェーブからの連係は対象外です。 |

- 배포: 이번 변경만으로 Worker 재배포·D1 마이그레이션·비밀값 변경은 필요 없다. 기존 WSC 서버 기능의 배포 상태는 이번 작업에서 바꾸지 않았다. 사용자가 브라우저 확인 → 파일을 명시해 add/commit/push → Pages 확인 순서로 진행한다.
- 충돌 예상: `index.html`의 I18N, `onDir/onButton/commandDir/commandButton`, `mist*`, `backdashMotion`, `classify/attempt`, `renderSeg/showResult`, `trialTick/endTrial`; 테스트와 AGENTS/PLAN/CODE_MAP/README.
- 보존: 초풍 공통 슬롯, 6N23 일반/대초 및 623 중립 누락 거부, WSC 우선/과제 비소모/통계 차단, 백대시 방향별 1회 처리, 순위·닉네임 최신 경쟁 상태 수정, 서버 payload. 무족 경로에서 `completeCD`를 호출하지 말 것.
- 입력 경계: 키보드/터치의 같은 슬롯 중간 d/f는 RP까지 모이면 무족, RP 없이 슬롯이 끝나면 기존 커맨드로 재전달. 이 경우 늦은 RP는 일반 경로일 수 있음. 대시 확정은 최대 한 슬롯 보류. 실게임 최대 허용 시간·대시/웨이브 연결은 미확정·지원 밖. 자세한 동작은 MIST_EWGF 8절.
- 검증: 단위 162/162, `node tests/smoke-chrome.js`, `node tests/smoke-wsc.js`, `node tests/smoke-mist.js` 통과(JS 오류 0). 무족 스모크 17회 입력·6가지 키 순서·양쪽 방향·터치·3언어·화면 검사. 초기 WSC 스모크 일반 초풍 fixture의 0칸 ↓가 무족으로 인식된 실패는 ↓를 별도 프레임에 유지하도록 수정해 해결. 미해결 테스트 실패 없음.
- 문서: AGENTS 결정 27(최신 main의 WSC 순위 결정 26 유지), PLAN 체크/로그, CODE_MAP 무족 절, MIST_EWGF 구현 절, README 사용법.
- 최종 재검증: `d7cc7a2` 합류 후 단위 162/162 및 Chrome/WSC/무족 스모크 모두 재통과(JS 오류 0), 미해결 충돌 없음. 복원용 autostash `46979bc`는 안전 백업으로 유지했으며 다른 세션의 stash는 건드리지 않았다.
- 사람 확인: 자유 연습에서 6→N→대각+RP 성공, 앞·중립을 늘리면 최속 표시 없음, 구간 앞/N/RP 및 로그, 언어 전환, 분석의 무족 안내 펼치기. 일반 초풍·대초·통발·WSC가 계속 동작하는지 확인.
- 최종 합류 전 통합 담당자가 공지 승인·검증 결과를 반영한 뒤 `.agents/handoffs/`의 임시 문서를 삭제한다. 이번 작업은 main 병합·공지 발행·배포를 수행하지 않음.
- 2026-09-21 최종 검증: 단위 166/166 및 Chrome/WSC/무족 스모크 모두 통과(JS 오류 0). 무족 스모크의 양쪽 패드에서 623 실패/6N23 성공 4건을 추가 확인. 최초 패드 검사의 포커스 부재로 인한 미입력 실패는 CDP 포커스 에뮬레이션으로 해결. 미해결 실패 없음. 서버 변경·커밋·푸시 없음.
- 2026-09-20 후속 리뷰 반영: 중립 제한시간 직전 보류한 ↓/RP가 후보 만료 때 유실되던 문제, RP 전에 이미 중립으로 해제했는데 다음 시작 6을 무시하던 문제를 수정. 방향 큐는 RP까지 원래 순서로 재전달하며 방향 없는 RP 만료는 원래 버튼 시각으로 1회 처리한다. `mist.released`로 이미 도착한 중립 해제를 기억한다. 최종 단위 164/164, Chrome/WSC/무족 스모크 모두 통과(JS 오류 0), diff 검사 통과. 사람 확인에 중립을 길게 둔 일반 초풍, 무족초 후 연속 재입력을 포함할 것.

- 최종 범위 확정 후 검증: 단위 167/167, Chrome/WSC/무족 스모크 통과(JS 오류 0), diff 검사 통과. 사람 확인: 623의 웨이브 수 0·나락 미출력·WSC 동일 과제 유지, 6N23 정상 성공, 무족초 6N3+RP 유지. .agents/docs/WSC_PRACTICE.md도 변경 파일에 포함.

- 2026-09-21 리뷰 검증 완료: 잘못된 같은 슬롯 방향 전환의 무족 성공을 수정 전 실패로 재현 후 수정. 전체 단위 168/168, Chrome/WSC/무족 스모크 모두 통과(JS 오류 0), git diff --check 통과. 623 허용 잔여 설명과 인수인계의 낡은 classify 설명 정리. 서버·설계 결정 변경 및 커밋·푸시 없음.
