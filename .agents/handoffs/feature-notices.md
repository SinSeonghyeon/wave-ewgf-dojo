# feature/notices 인수인계

## 기본 정보

- 브랜치: `feature/notices`
- 기준 커밋: `a9d9d93` (`feat: add in-app announcements`)
- 목적: 헤더 종 버튼, 누적 패치 노트, 브라우저별 `NEW`/읽음 상태, 기존 방문자 대상 안전한 1회 자동 표시 추가

## 합류 순서와 의존성

- 다른 기능의 배포 공지를 이 구조에 넣을 예정이므로 통합 브랜치에 **가장 먼저 합류 권장**.
- 백엔드 의존성 없음. `BOARD_URL`, Worker, D1 스키마는 변경하지 않음.
- 이 브랜치 뒤에 합류하는 기능은 아래 공지 초안을 참고해 새 공지를 추가하거나 같은 배포 공지에 항목을 합친다.

## 사용자 변경과 공지

- 공지 필요: 예. 첫 공지가 이미 `index.html`에 `2026-09-15-notices`로 포함됨.
- 헤더 종 버튼을 누르면 과거 공지를 포함한 목록이 열림.
- 최신 ID 미열람이면 `NEW`. 첫 방문은 배지만 표시하고, 기존 방문자는 안전한 시점에 새 공지를 한 번 자동으로 봄.
- 읽음 상태는 `store.noticeSeen`에만 저장하며 서버에는 보내지 않음.

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 공지사항 기능 추가 | 앞으로 업데이트 내용을 앱 안에서 바로 확인할 수 있습니다. | 1. 헤더의 종 버튼에서 패치 노트 확인<br>2. 미열람 공지에 NEW 표시<br>3. 한국어·영어·일본어 지원 |
| en | Announcements added | You can now check the latest changes without leaving the app. | 1. Patch notes from the header bell<br>2. NEW badge for unread announcements<br>3. Korean, English, and Japanese support |
| ja | お知らせ機能を追加 | アプリ内で最新の変更内容を確認できるようになりました。 | 1. ヘッダーのベルからパッチノートを確認<br>2. 未読のお知らせにNEWを表示<br>3. 韓国語・英語・日本語に対応 |

## 배포·운영 작업

- 별도 Worker 재배포·D1 마이그레이션 없음.
- 사이트 반영은 통합 브랜치 검증 후 기존 GitHub Pages 절차만 수행.

## 충돌 주의

- `index.html`: 헤더 `.top-right`, `I18N` 세 사전, `store` 로드 검증, `modalOpen`, `renderAll`, 부트 호출부를 수정함.
- `tests/dojo.test.cjs`: VM에 `noticeDlg`와 공지 심볼 export를 추가함. 다른 브랜치가 같은 export 문자열을 바꿨다면 양쪽 심볼을 모두 보존.
- `tests/smoke-chrome.js`: 첫 방문/재방문 공지 검사와 DOM 조건 대기 추가. 최신 ID는 원본 `NOTICES` 첫 항목에서 파생하므로 ID를 하드코딩하지 말 것.
- `NOTICES`는 최신순 유지. 날짜 전용 표시의 `timeZone:'UTC'`를 제거하지 말 것.
- 자동 공지는 측정·카운트다운·결과·다른 대화상자·보상 연출을 중단하지 않고 기다리는 동작을 보존.

## 검증 상태

- `node --test tests/dojo.test.cjs tests/board.test.cjs`: 96/96 통과.
- 공지 날짜 UTC 고정 회귀 테스트 포함.
- Chrome 스모크에서 9월 15일 공지 수동 열기·읽음 저장·재접속 자동 열기는 통과.
- 전체 Chrome 스모크는 공지 이후 보상 시나리오까지 진행한 뒤 간헐적인 CDP 15초 응답 타임아웃으로 완주하지 못함. 앱 JS 오류나 공지 검사 실패는 보고되지 않음.

## 문서·설계

- `AGENTS.md` 설계 결정 20 추가.
- `.agents/docs/PLAN.md`, `.agents/docs/CODE_MAP.md`, `README.md` 갱신.
- 공식 캐릭터 이름·리소스, 백엔드 계약, 판정 상태 머신 변경 없음.

## 합류 후 수동 확인

1. 첫 방문: 닉네임 창 뒤 공지가 자동으로 겹치지 않고 종에 `NEW`만 보이는지 확인.
2. 종 클릭: 날짜가 2026년 9월 15일로 보이고 ko/en/ja 전환 시 제목·내용이 즉시 바뀌는지 확인.
3. 공지를 닫은 뒤 `NEW`가 사라지는지 확인.
4. 기존 저장소에서 `noticeSeen`이 이전 ID인 상태로 새로고침하면 공지가 한 번 자동으로 열리는지 확인.
5. 측정·결과·다른 대화상자 중에는 자동 공지가 끼어들지 않는지 확인.

통합 담당자가 위 내용을 최종 코드·공지·문서에 반영한 뒤 이 파일은 `main` 합류 전에 삭제한다.
