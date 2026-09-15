# 더미 격파 배점 변경 인수인계

## 기본 정보

- 브랜치: `origin/SinSeonghyeon/workspace00`
- 기준 베이스: `origin/main`의 `54e5194bef29c93fcfad69dfa48ca11d3aa0217c` (`fix: recognize legacy D1 quota errors`)
- 기능 최종 커밋: `649bdf623c6cf295a989dade54e509aaf8dabf25` (`feat: raise dummy rush destruction scores`)
- 목적: 더미 격파 30초의 일반 격파 점수를 5점에서 10점으로, 저스트를 놓친 풍신권 점수를 2점에서 5점으로 상향한다.

## 합류 순서와 의존성

- 이 브랜치는 최신 `origin/main`에서 직접 시작했으며 다른 기능 브랜치 의존성이 없다.
- 다른 브랜치와 함께 합칠 때 점수 상수와 세 언어 설명을 한 단위로 유지한다.
- Worker·D1·도메인·비밀값 의존성이 없다. 기존 Worker의 `rush30` 점수 허용 범위 0~2000점 안이므로 재배포나 마이그레이션이 필요하지 않다.
- 누적 순위의 기존 기록은 설계 결정 19에 따라 초기화하거나 변환하지 않는다.

## 사용자에게 보이는 변경과 공지 초안

- 초풍·통발·나락으로 올바른 더미를 격파하면 `+10`이 표시되고 10점이 더해진다.
- 상단 더미를 저스트가 아닌 풍신권으로 격파하면 `+5`가 표시되고 5점이 더해진다.
- 크라우치 대시 점수(연속 수만큼, 최대 3점), 헛침, 격파 수 tie, 700ms 재등장 규칙은 그대로다.
- 공지 필요 여부와 아래 문구는 통합 담당자가 다른 변경과 함께 사용자 승인을 받아 결정한다. 승인 전 `NOTICES`에는 넣지 않았다.

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 더미 격파 점수 조정 | 격파 보상을 높여 정확한 기술의 비중을 키웠습니다. | 1. 올바른 기술로 격파 시 10점<br>2. 저스트를 놓친 풍신권으로 상단 격파 시 5점<br>3. 웨이브 점수와 헛침 규칙은 유지 |
| en | Dummy Rush scoring adjusted | Destruction rewards now give more weight to landing the correct move. | 1. 10 points for destroying a dummy with the correct move<br>2. 5 points for destroying a high dummy with a non-just WGF<br>3. Wave points and whiff rules are unchanged |
| ja | ダミー撃破の得点を調整 | 正しい技で撃破した時の得点を引き上げました。 | 1. 正しい技で撃破すると10点<br>2. ジャストを外した風神拳で上段を撃破すると5点<br>3. ウェーブ加点と空振りルールは変更なし |

## 배포·운영 작업

- 선행 Worker 재배포: 없음.
- 선행 D1 마이그레이션: 없음.
- 기존 누적 `rush30` 기록 삭제·재계산: 없음.
- 통합 브랜치에서 검증한 뒤 기존 GitHub Pages 배포 절차만 따르면 된다.

## 충돌 예상 지점

- `index.html`: `RUSH_PTS`, ko/en/ja의 `mode.rush30.desc`. 다른 브랜치가 같은 I18N 사전이나 점수 상수를 건드리면 10/5/3 값을 보존한다.
- `tests/dojo.test.cjs`: rush30 누적 점수·팝업·기록·공유 카드·순위 등록 기대값. 다른 브랜치의 테스트 export나 모드 변경과 합칠 때 새 기대값을 유지한다.
- `README.md`, `AGENTS.md`, `.agents/docs/CODE_MAP.md`, `.agents/docs/PLAN.md`: 배점 설명과 진행 로그가 겹칠 수 있다. 일반 격파 10점·풍신권 5점 및 기존 크라우치 대시 최대 3점을 함께 보존한다.
- Worker 파일은 변경하지 않았다. 충돌 해결을 이유로 Worker 점수 계약이나 배포 절차를 추가하지 않는다.

## 병합 시 반드시 보존할 동작

1. `RUSH_PTS`는 `{kill:10, wgf:5, dashMax:3}`이다.
2. 초풍·통발·나락의 올바른 격파는 각각 10점이며, 상단 더미의 저스트를 놓친 풍신권만 5점이다.
3. 틀린 기술은 0점이고 더미를 유지하며 헛침 수만 증가한다.
4. 크라우치 대시는 연속 수에 따라 1~3점이고 3점 상한을 유지한다.
5. 격파 수는 종전처럼 `kills`와 순위 tie에 기록한다. 격파 점수 변경이 초풍 통계나 웨이브 체인을 바꾸지 않는다.
6. ko/en/ja 모드 설명은 같은 배점 내용을 전달하고 I18N 키 패리티를 유지한다.
7. 누적 순위는 초기화하지 않고 기존 기록도 변환하지 않는다.

## 검증 결과와 남은 확인

- `node --test tests/dojo.test.cjs tests/board.test.cjs`: 107/107 통과.
- `node tests/smoke-chrome.js`: 통과, 종료 코드 0, `errors: []`, JS 오류 0.
- `git diff --check`: 통과. 줄바꿈 변환 안내만 있으며 whitespace 오류는 없다.
- Worker `BOARDS.rush30.score` 허용 범위가 `[0, 2000]`임을 확인했다.
- 통합 후에는 같은 두 테스트를 다시 실행하고, 브라우저에서 일반 격파 `+10`과 풍신권 격파 `+5`를 직접 확인한다.

## 변경 파일

- `index.html`
- `tests/dojo.test.cjs`
- `README.md`
- `AGENTS.md`
- `.agents/docs/CODE_MAP.md`
- `.agents/docs/PLAN.md`
- `.agents/handoffs/SinSeonghyeon-workspace00.md`

## 합류 후 브라우저 수동 확인

1. 더미 격파 30초를 시작하고 상단 더미를 초풍으로 격파해 `+10`과 총점 +10을 확인한다.
2. 중단은 통발, 하단은 나락으로 격파해 각각 `+10`을 확인한다.
3. 상단 더미에 늦은 2로 풍신권을 내서 `+5`와 총점 +5를 확인한다.
4. 잘못된 높이의 기술은 `헛침`이고 점수가 오르지 않는지 확인한다.
5. 모드 설명을 ko/en/ja로 전환해 10점·5점이 모두 표시되는지 확인한다.
6. 측정 종료 후 기록·공유 카드·순위 등록 점수가 HUD 최종 점수와 같은지 확인한다.

통합 담당자는 원격 브랜치 tip이 이 handoff의 변경을 포함하는지 검증하고, 최종 공지 문구를 사용자에게 승인받은 뒤 합류한다. 이 파일은 통합 결과와 공지가 승인되기 전에는 삭제하지 않는다.
