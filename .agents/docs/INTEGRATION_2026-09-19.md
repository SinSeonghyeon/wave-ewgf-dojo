# workspace00 통합 검증 — 2026-09-19

## 범위와 상태

- 대상: `SinSeonghyeon/workspace00`, 시작 HEAD `96f1e9023c0e5d805cb231c8f1aad7d7dd5ee7e9`.
- 순서: workspace02 `0b97f7e0f8711f31f292067ecf93cf76a1d2e03b` → workspace01 `dd3bf1ddb9584ad813d04bcf41e94484adb5ed64`. fetch 후 두 로컬 tip과 원격 tip 일치 확인.
- 두 기능의 내용은 순차적으로 통합했다. 승인 대기 중 첫 브랜치는 `merge --no-ff --no-commit`, 두 번째는 공통 조상 이후 변경을 `git apply --3way --index`로 적용했다. 두 tip을 MERGE_HEAD에 보존했다. 이후 사용자가 로컬 병합 커밋을 승인했으므로 검증 후 기존 workspace00 HEAD와 두 기능 tip을 부모로 갖는 병합 커밋을 생성한다. 정확한 커밋 ID는 `git log -1`과 최종 보고에서 확인한다.
- main과 origin/main은 `3f05c1550325ca8c111d7186ed7d5ed3ed1e1c62` 유지. 푸시·서비스 배포·D1 변경·실서비스 검증은 실행하지 않았다.
- 기존 작업 트리는 깨끗했으며 별도 사용자 변경은 없었다. 영상 문서와 승인된 자체 효과음은 기능 브랜치 그대로 보존했다.

## 충돌과 보존 동작

| 브랜치 | 충돌 | 해결 |
|---|---|---|
| workspace02 | index.html, dojo.test.cjs, smoke-chrome.js, CODE_MAP.md, PLAN.md, README.md | WSC·공통 60Hz 초풍·효과음과 기존 모바일 방향 버튼·보조 키·공지·후원·게시판을 병합. 더미 배점 10/5/3, 기술별 피격 지연을 함께 보존 |
| workspace01 | PLAN.md | WSC 진행 이력·D1 용량 계획과 모바일 개선 이력을 모두 보존. 기본 100% 자동 축소·70~300% 수동 범위 유지 |

- WSC 설계는 기존 후원 결정 21과 겹치지 않도록 결정 25로 정리했다. PLAN의 새 작업 번호도 기존 모바일·보조 키 항목 뒤로 옮겼다.
- 자동 공지와 후원 말풍선은 WSC 카운트다운·도전 중 대기한다. 이미 보이는 후원 말풍선은 도전 시작에 보류한다. 회귀 테스트 추가.
- 단위 테스트 이벤트 하네스는 같은 이벤트의 여러 리스너를 모두 실행하도록 수정했다. WSC 터치 검사는 제거된 원형 패드 대신 현재 독립 방향 버튼 경로를 사용한다.
- WSC 전용 스모크는 최신 공지를 읽은 저장값으로 시작한다. 공지 동작 자체는 기본 스모크에서 별도 검증한다.
- Worker 파일·D1 스키마 변경 없음. 이번 두 기능 때문에 필요한 선행 배포 작업 없음.

## 공지 최종 제안 — 미승인, 앱 미반영

main 합류 전 아래 문구를 사용자에게 확인받아 새 공지 한 건으로 적용한다. 기존 공지는 변경하지 않는다. 날짜는 실제 반영일로 정한다.

| 언어 | 제목 | 요약 |
|---|---|---|
| ko | 웨캔기어 연습과 입력·모바일 개선 | 웨캔기어 연습을 추가하고 초풍 판정, 효과음, 모바일 조작과 더미 격파 점수를 개선했습니다. |
| en | Wave-cancel uppercut practice and input updates | Added wave-cancel uppercut practice and updated EWGF timing, sounds, mobile controls, and Dummy Rush scoring. |
| ja | ウェーブキャンセル立ち途中アッパー練習と操作改善 | 専用練習を追加し、最風判定、効果音、モバイル操作、ダミー撃破の得点を更新しました。 |

ko:
1. 웨캔기어 전용 연습에서 A/B 타이밍과 실시간 프레임 표를 확인하고 랜덤 과제 10회에 도전할 수 있습니다.
2. 초풍은 공통 60Hz 격자에서 대각·RP가 같은 프레임에 입력돼야 성공하며, 판정 폭 설정을 없앴습니다. 선행 중립을 생략한 623도 사용할 수 있습니다.
3. 통발·나락·기상어퍼·백대시 효과음과 실제 명중 시 피격음·연출을 추가했습니다.
4. 모바일 방향 버튼은 종전 140%를 새 100% 기준으로 사용하며, 기본값은 좁은 화면에 자동으로 맞춰집니다. 크기는 70~300%로 조절할 수 있습니다.
5. 더미 격파는 올바른 기술 10점, 저스트를 놓친 풍신권의 상단 격파 5점으로 올렸습니다. 웨이브는 연속 수에 따라 최대 3점입니다.

en:
1. Practice wave-cancel uppercuts with A/B timing feedback, a live frame display, and a 10-task random challenge.
2. EWGF requires diagonal and RP inputs in the same frame of a shared 60Hz grid. The timing-window setting has been removed, and 623 without the initial neutral is supported.
3. Added sounds for f,f+2, hell sweep, wave-cancel uppercut, and backdash, plus impact sounds and effects on actual hits.
4. Mobile direction buttons use the former 140% size as the new 100% baseline. The default auto-fits narrow screens, and sizes are adjustable from 70% to 300%.
5. Dummy Rush awards 10 points for the correct move and 5 for a non-just WGF against a high dummy. Waves still award up to 3 points based on the chain.

ja:
1. 専用練習でA/Bのタイミングと現在フレームを確認し、ランダム課題10回に挑戦できます。
2. 最風は共通60Hzグリッドで斜め入力とRPが同じフレームに入ると成功します。判定幅の設定を廃止し、最初のニュートラルを省略した623にも対応しました。
3. f,f+2・奈落・立ち途中アッパー・バックダッシュの効果音と、実際に命中した時のヒット音・演出を追加しました。
4. モバイル方向ボタンは従来の140%を新しい100%基準とし、初期値は狭い画面に自動調整されます。サイズは70～300%で調整できます。
5. ダミー撃破は正しい技で10点、ジャストを外した風神拳で上段を撃破すると5点です。ウェーブは連続数に応じて最大3点です。

## 검증·남은 작업

- 통합 단위 테스트: 131/131 통과. 첫 실행의 실패 3개는 테스트 하네스 리스너 덮어쓰기와 옛 touchVec 경로를 수정한 뒤 해소했다.
- WSC 브라우저 검사: 1366/390px × ko/en/ja × 1P/2P, 랜덤 도전·취소·실시간 프레임 표시 통과, errors=[].
- 소리 브라우저 검사: 두 창 BGM 소유권·효과음 재생·음량·음소거 통과. 직접 청취 검증은 아님.
- 기본 Chrome 스모크: 최종 통과(종료 코드 0, errors=[]). 모바일 기본 비침범·140% 가로 이동·300% 크기, 공지·후원·보조 키·대댓글·순위 삭제를 포함한다. 390px WSC 화면 육안 확인 완료. git diff --check와 충돌 마커 검사도 통과.
- main 합류·푸시·공지 반영·인수인계 삭제는 아직 진행하지 않는다. 새 기능 때문에 필요한 Worker 재배포·D1 마이그레이션은 없다.

사용자 수동 확인:
1. 웨캔기어 선택 → 랜덤 과제 10회 시작 → A/B와 프레임 표시, 설정 창을 열 때 취소 확인.
2. 설정 → 모바일 방향 버튼 100/140/300% → 기본 자동 축소와 수동 크기·가로 위치 유지 확인.
3. ko/en/ja에서 초풍 동일 프레임 안내와 판정 폭 설정 제거 확인.
4. 기술음·피격음·볼륨을 직접 듣고 더미 격파의 10/5점을 확인.

모든 `.agents/handoffs/`는 통합 결과와 공지 승인 후 main 합류 직전까지 보존한다.
