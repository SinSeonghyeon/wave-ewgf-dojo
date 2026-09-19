# workspace05 미커밋 변경 리뷰 — 2026-09-19

## 범위

- 사용자 요청: HEAD 대비 미커밋 로컬 변경과 새 파일만 검토·수정. 커밋된 브랜치 이력 전체 리뷰는 제외.
- 브랜치 `SinSeonghyeon/workspace05`, 기준 HEAD `2ffe47c342c72a0b1369fa556dfd4b320dc3e622`.
- 검토: 도장 WebGL/Canvas·배치·입력 이력, WSC 순위의 앱/Worker 계약과 비동기 경계, BGM 목록·재생·음량 도구, 관련 테스트·문서.
- 기존 로컬 변경은 보존. 이번 수정은 `index.html`, `tests/dojo.test.cjs`, `tests/smoke-design.js`와 리뷰·구조·진행·인계 문서다. 음원·OG·Worker 코드는 이번 리뷰에서 추가 수정하지 않았다.

## 확인한 문제와 수정

| 중요도 | 문제·재현 | 원인 | 수정 |
|---|---|---|---|
| P1 | WSC 첫 결과 전송 중 두 번째 완주 → 새 도전/모드 전환 → 첫 응답 도착 시 두 번째 결과가 제출되지 않음 | `submitAfterBusy`는 예약 여부만 저장하고 나중에 현재 모드의 결과를 다시 읽음. 삭제 중 등록도 같은 한계 | `submitQueue`가 결과 참조·payload·닉/토큰·탭을 보관. `boardDrain`으로 삭제/다른 등록 후 순서대로 전송. busy 표시로 중복 예약 방지 |
| P2 | 설정 초기화 후 이전 WSC 완주 결과·세션 또는 일반 세션이 남음 | 새 WSC 순위 결과가 모드 전환 뒤 유지되는데, 기존 모드별 초기화 함수를 전체 초기화 경로로 재사용 | 세션 버튼 제거 후 유일한 앱 호출자인 설정 초기화에 맞춰 모든 세션·입력 이력·WSC 결과·미전송 큐 초기화. 이미 서버로 보낸 요청과 서버 최고 기록은 취소/삭제하지 않음 |
| P2 | 제출 대기 중 계정 변경 시 옛 결과를 새 계정에 연결하거나 옛 요청의 auth 실패로 새 계정을 비움 | 큐의 신원 스냅샷 부재·응답 오류의 신원 검증 누락 | 예약 당시 닉+토큰을 함께 검증. 바뀐 예약은 자동 제출하지 않고 실패로 전환, 늦은 auth 오류는 같은 신원일 때만 로그아웃. 명시 재시도는 현재 신원으로 가능 |
| P3 | 입력 종료 후에도 80ms마다 최대 40행 DOM을 계속 교체 | 프레임 루프에서 동일 마크업까지 매번 innerHTML 할당, 다음 방향을 각 행마다 재검색 | 역순 1회 순회로 유지 시간 계산. `historyMarkup`이 달라질 때만 DOM 변경. 프레임 갱신·언어 전환은 유지 |

초기화의 모드 분기 자체는 HEAD에도 있었다. 이번 수정은 새로 유지되는 WSC 순위 결과와 세션 버튼 제거 후 남은 전체 초기화 경로를 검토하면서 확인한 문제다. HEAD의 다른 기존 동작을 포괄적으로 리팩터링하지 않았다.

## 검증

- 수정 전 추가한 재현 테스트 3개가 모두 실패: 등록 유실, 초기화 누락, 동일 입력 이력 DOM 재할당.
- 첫 전체 단위 실행: 146/147 통과. 기존 WSC 분리 테스트가 제거된 세션 초기화 버튼의 옛 동작을 기대했다. 모드 전환 때 일반 통계가 보존되는 검증으로 정리하고 설정 전체 초기화는 별도 회귀 테스트로 검증.
- 최종 `node --test tests/dojo.test.cjs tests/board.test.cjs`: 149/149 통과. 삭제 중 예약·계정 변경·중복 예약·초기화·언어 전환 포함.
- `node tests/smoke-chrome.js`: 통과, errors=[]; 실제 로컬 Worker로 WSC 완주 등록/본인 삭제 포함.
- `node tests/smoke-wsc.js`: 통과, errors=[]; 1366/390px·ko/en/ja·1P/2P.
- `node tests/smoke-sound.js`: 통과; 4곡 실제 재생·경로별 게인·다중 창 Web Lock·일시정지/다음/종료·효과음.
- `node tests/smoke-design.js`: 통과, errors=[]; WebGL/재질·30개 배치·유실/복구·미지원 폴백 및 free/wsc 설정 전체 초기화 검사. 데스크톱/모바일 캡처를 열어 배치 확인.
- `git diff --check`: 통과(LF→CRLF 안내만 존재).
- 실행 로그: `.sandbox/review-local-{unit,chrome,wsc,sound,design}.log`. 임시 파일은 비커밋.

실 Pages/Jekyll 빌드·실서비스 배포는 이번 리뷰에서 실행하지 않았다. 로컬 사운드 스모크는 폴더 스캐너로 manifest를 제공하므로 실제 Pages 생성 결과 확인을 대체하지 않는다. 실제 입력 장치·사용자 GPU/스피커 체감 검증도 별도다.

## 직접 확인

1. WSC 10회 완주 → 성공 횟수/최고 연속 표시 및 전용 순위 등록·본인 삭제.
2. 자유 연습과 WSC에서 각각 기록을 만든 뒤 설정 → 기록·업적 초기화. 두 모드의 세션/입력 이력/이전 WSC 등록 문구가 모두 사라져야 한다. 서버 순위는 별도 삭제 전까지 유지.
3. 입력 후 설정 창을 열어 방향 유지 프레임을 정지시키고 목록을 스크롤. 언어 전환 시 툴팁이 갱신되어야 한다.
4. 모바일 세로/가로, 1P/2P의 입력 표·터치·한마디 배치와 BGM 일시정지 후 다음 곡에서도 정지 상태 유지 확인.

병합 기준·공지 초안·배포 순서·명시적 파일 추가 명령은 `.agents/handoffs/SinSeonghyeon-workspace05.md`에 정리한다.

## 최종 작업 트리 (`git status --short`)

기존 변경 포함. 커밋/푸시하지 않았다.

```text
 M .agents/docs/CODE_MAP.md
 M .agents/docs/PLAN.md
 M .agents/docs/WSC_PRACTICE.md
 M .agents/handoffs/SinSeonghyeon-workspace05.md
 M AGENTS.md
 M README.md
 D bgm.mp3
 M en/index.html
 M index.html
 M ja/index.html
 M og.png
 M tests/board.test.cjs
 M tests/dojo.test.cjs
 M tests/smoke-chrome.js
 M tests/smoke-sound.js
 M tests/smoke-wsc.js
 M tools/board-admin.js
 M worker/README.md
 M worker/index.js
?? .agents/docs/DESIGN_2026-09-19.md
?? .agents/docs/reviews/2026-09-19-workspace05-local.md
?? bgm/
?? tests/smoke-design.js
?? tools/measure-bgm.js
?? tools/update-bgm.js
```
