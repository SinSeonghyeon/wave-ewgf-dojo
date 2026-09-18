# 검색 설명·사이트 아이콘 인수인계

## 전달 상태

- 아래 미커밋·미전달 표기는 인수인계 준비 시점의 기록이다. 이후 2026-09-19 사용자가 현재 기능 브랜치의 커밋·푸시를 명시 승인했다. 이 문서와 검색 설명·아이콘·회귀 테스트를 함께 전달한다.
- 수신자는 fetch 후 `origin/SinSeonghyeon/workspace01`의 실제 tip과 파일 포함 여부를 재확인한다. 이번 승인에는 main 병합·푸시·배포·인수인계 삭제가 포함되지 않는다.

## 기준과 합류 순서

- 브랜치: `SinSeonghyeon/workspace01`
- 기준 커밋: `2ffe47c342c72a0b1369fa556dfd4b320dc3e622` (workspace00 통합 커밋).
- 2026-09-19 사용자 요청으로 workspace00 기준 리베이스 완료. 기존 모바일 방향 버튼 커밋 `dd3bf1d`는 이미 기준에 포함돼 있어 재작성 없이 전진했다.
- 이번 검색 설명·아이콘 변경은 미커밋. 사용자가 커밋·푸시하며, 통합 담당자는 실제 원격 tip을 재확인한다.
- 목적: 검색 설명을 초풍·웨이브 무료 연습 중심으로 간소화하고 사용자 확정 아이콘을 적용한다.
- 추가 의존 브랜치 없음. 통합 브랜치가 이미 `2ffe47c`를 포함하면 이번 추가 변경만 합류한다. 최신 WSC/동일 프레임 판정/더미 격파 배점을 보존한다.

### 원격 검증 상태 (2026-09-19, git fetch origin 후)

| 대상 | 확인한 tip | 로컬/원격 관계 |
| --- | --- | --- |
| 로컬 `SinSeonghyeon/workspace01` | `2ffe47c342c72a0b1369fa556dfd4b320dc3e622` | 원격보다 6커밋 앞, 원격에만 있는 커밋 0 |
| `origin/SinSeonghyeon/workspace01` | `dd3bf1ddb9584ad813d04bcf41e94484adb5ed64` | 검색 설명·아이콘·리뷰 수정은 아직 없음 |
| 통합 `SinSeonghyeon/workspace00` 및 원격 | `2ffe47c342c72a0b1369fa556dfd4b320dc3e622` | 동일, 양방향 차이 0 |
| 최종 `main` 및 `origin/main` | `3f05c1550325ca8c111d7186ed7d5ed3ed1e1c62` | 동일, 양방향 차이 0 |

이번 기능의 최종 SHA는 아직 없다. 위 기준 커밋을 이번 기능 완료 커밋으로 취급하지 않는다. 사용자 커밋·푸시 후 통합 담당자는 fetch하여 새 원격 tip과 이 문서·`favicon.png`·회귀 테스트 포함 여부를 확인한다. 통합 대상은 새 `origin/SinSeonghyeon/workspace01` tip이며, 현재 원격 tip만 병합하면 이번 변경이 빠진다.

이번 세션의 승인 범위는 리뷰 수정·인수인계 문서 보완이다. 실제 병합·커밋·푸시·배포·인수인계 삭제는 수행하지 않았다.

## 사용자 변경과 공지

- ko/en/ja 검색·OG 설명에서 프레임 폭·밀리초·히스토그램 사양 나열을 빼고 무료 초풍·웨이브 연습, 설치 불필요, 입력 타이밍 확인을 소개한다.
- 루트 정적 meta·JSON-LD는 한국어, en/ja 랜딩 meta·OG는 해당 언어로 제공한다.
- 앱 `app.description` 사전으로 언어 전환 시 meta·OG 설명도 바뀐다.
- 사용자 확정 파란 주먹·노란 좌우 번개 아이콘을 루트 `favicon.png`(1254×1254 PNG)에 저장하고 세 페이지에서 함께 사용한다. 내장 이미지 생성 도구로 만든 자체 시안이며 공식 캐릭터·게임 이미지가 아니다.
- 별도 앱 공지 불필요. 이번 작업은 제목·판정·점수·모드·워커를 변경하지 않는다.
- 과거 모바일 기본 크기 변경은 이미 workspace00에 통합됐다. 관련 공지 판단은 통합 담당자의 기존 배포 묶음을 따른다.

## 배포 전후 작업

- Worker 재배포/D1 마이그레이션/비밀값/도메인 변경 없음.
- 순서: 사용자 기능 브랜치 커밋·푸시 → 통합 담당자 fetch 및 새 tip 확인 → `2ffe47c`를 포함한 workspace00에 이번 변경 합류 → 단위·브라우저 검증 → 배포 묶음의 최종 공지·결과 승인 및 인수인계 정리 → 승인된 main 병합·푸시 → Pages 배포 확인 → Search Console에서 루트/en/ja URL 검사 및 필요시 색인 요청. 기능 브랜치 푸시 자체는 main 기반 Pages 배포가 아니다.
- 검색 문구·아이콘은 Google 재수집 후 반영될 수 있으며 노출·순위·표시 문구는 보장되지 않는다.

## 변경 파일·충돌 예상·보존 사항

- `index.html`: head meta/JSON-LD/아이콘, I18N `app.description`, `applyStatic` 설명 갱신.
- `en/index.html`, `ja/index.html`: meta/OG 설명과 `../favicon.png` 아이콘 링크.
- `favicon.png`: 최종 사용자 승인 이미지.
- `tests/smoke-chrome.js`, `tools/make-og.js`: 임시 페이지에 favicon 파일도 복사. 최신 기준의 전체 효과음·후원 이미지 복사 및 OG 도구의 백엔드 비활성화 유지.
- 리뷰 후속: `tests/smoke-wsc.js`에도 favicon 복사를 추가해 임시 페이지의 `ERR_FILE_NOT_FOUND` 실패를 수정했다. `tests/dojo.test.cjs`에 세 페이지 설명·사전 일치 및 아이콘 경로·크기 검증, `tests/smoke-chrome.js`에 언어 전환 후 실제 meta·OG 설명 검증을 추가했다.
- `.agents/docs/PLAN.md`, `.agents/docs/CODE_MAP.md`: 이번 작업 기록. 최신 WSC·배점 변경 문서를 덮어쓰지 않는다.
- `.agents/handoffs/SinSeonghyeon-workspace01.md`: 이 문서.
- hreflang/canonical/sitemap의 기존 언어별 URL, 최신 상태 머신·효과음·모바일 크기 설정 보존.
- 리베이스 autostash 복원 충돌은 index의 사양 설명을 이번 간단한 설명으로, PLAN 로그는 양쪽 모두, 도구 리소스 복사는 양쪽 목록을 합쳐 해결했다.

## 검증과 알려진 사항

- 리뷰 수정 후 단위 테스트: 132/132 통과. Chrome 스모크(언어별 meta·OG 검사 포함)·WSC 스모크 모두 통과, JS 오류 0. WSC의 favicon 누락 실패를 복사 목록 보완으로 해결했다.
- 세 페이지 아이콘 경로와 실제 PNG 크기 일치 확인. Chrome에서 16/32/48/64px 크기, 밝은/어두운 배경 렌더 확인.
- 최초 아이콘 크기 검사에서 원본이 예상 1280이 아닌 1254임을 확인해 HTML sizes와 문서를 실제 크기로 수정했다.
- 이전 기준 검색 설명 스모크 첫 실행은 본인 기록 삭제 버튼 미출현으로 실패했고, 진단 출력만 추가한 재실행 및 아이콘 추가 후 재실행은 통과했다. 최초 실패 원인은 확정하지 못했다.
- 최신 기준 전체 Chrome 스모크: 통과, `errors: []` (JS 오류 0). ko→en→ja→ko 설명 전환도 별도 Chrome 검사 통과.
- 설계 결정 변경 없음. 커밋·푸시·배포는 하지 않았다.
- 검증 환경: Windows, Node v24.17.0, 로컬 헤드리스 Chrome/CDP. 백엔드 검사는 가짜 D1로 수행했으며 실서버를 변경하지 않았다.
- 실행 명령: `node --test tests/dojo.test.cjs tests/board.test.cjs` → `node tests/smoke-chrome.js` 및 `node tests/smoke-wsc.js`; `git diff --check`. 리뷰 과정의 OG 생성도 `.sandbox/seo-check/review-og.png`에 별도 출력하여 성공(원본 `og.png` 변경 없음).
- 병합 후 위 명령을 다시 실행하고 아래 수동 확인을 수행한다. 최종 병합·배포·실사이트 확인은 미완료이며, 사용자가 푸시했다고 알린 뒤 Pages 반영을 확인한다.
- 갱신 문서: `PLAN.md` 작업·검증 로그, `CODE_MAP.md` 검색 설명·아이콘·회귀 검증 안내, 이 인수인계. `AGENTS.md` 설계 결정·README 변경 없음.

## 합류 후 수동 확인

1. 루트/en/ja 페이지를 열어 브라우저 탭에 파란 주먹·노란 번개 아이콘이 보이는지 확인한다.
2. 앱 언어 버튼으로 UI·탭 제목이 바뀌는지 확인하고, 개발자 도구에서 meta description/og:description의 해당 언어 문구를 확인한다.
3. 기존 WSC 모드 및 자유 연습·모바일 방향 버튼이 정상인지 확인한다.
4. 통합 담당자는 변경·문서가 모두 반영되고 배포 묶음의 최종 공지·통합 결과가 승인된 뒤, main 합류 직전에 이 임시 인수인계를 삭제한다. 이번 문서 보완은 삭제 승인이 아니다.
