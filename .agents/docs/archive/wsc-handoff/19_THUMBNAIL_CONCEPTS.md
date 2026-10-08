# 썸네일 시안 3개 — 2026-09-18

사용자 요청으로 imagegen 스킬의 내장 image_gen을 사용해 서로 다른 썸네일 3개를 생성했다. `.sandbox/wsc-workspace03-production/exports/thumbnail-concepts/index.html`에서 비교하고 원본을 열 수 있다. 전체는 `exports/wsc-thumbnail-concepts.zip`.

- A: 게임 장면과 “왜 안 나가지? / 커맨드는 맞는데”. 기존 썸네일의 플레이 장면만 참조해 생성한 홍보 아트이며 원본 게임 캡처가 아니다.
- B: “타이밍이 문제였다 / 4 입력 타이밍”, 8·9·10 숫자를 크게 배치. 발동속도가 아닌 4 입력 시점을 뜻한다.
- C: 공개 사용 승인된 수염 캐릭터 참조, “같은 커맨드 / 다른 결과”와 실패·성공 대비. 손그림 분위기. 기존 썸네일과의 차별성과 캐릭터 연결을 고려한 추천안이다.

원본 PNG는 각 1672×941. 사용한 정확한 프롬프트와 참조 경로는 같은 폴더 prompts.json. 내장 생성 결과를 원본 그대로 프로젝트 폴더에 복사했으며 기존 썸네일·영상은 변경하지 않았다. 세 이미지에서 한글 문구·구도·네모 입을 육안 확인, PNG 디코딩과 ZIP 무결성 통과. 앱 변경이 없어 앱 테스트는 실행하지 않았다. 브라우저에서는 비교 페이지에서 각 썸네일을 클릭해 원본 크기로 확인한다. 이번 추적 문서는 PLAN.md와 이 문서. 이전 변경 보존, 커밋·푸시 없음.

## C안 후속 시안

사용자가 C안을 선호해 같은 캐릭터·종이·거친 손글씨 스타일로 3개를 추가 생성했다. C1 왜 나만 안 나가지 / C2 문제는 타이밍(4입력8·9·10) / C3 커맨드는 같은데(실패·성공 대비). 추천 C1. 비교는 `exports/thumbnail-concepts/c-variations.html`, 묶음은 `exports/wsc-thumbnail-C-variations.zip`. 원본 C와 최종 영상/썸네일은 유지. 정확한 프롬프트 C-variations-prompts.json. 한글·네모 입·구도 육안 확인, PNG 디코딩·ZIP 무결성 통과. 내장 image_gen 사용, 원본 생성 파일을 그대로 복사했다.

## 웨이브 → 기상어퍼 의미 중심 시안

사용자가 같은 그림체로 단순한 데빌진을 직접 요청했다. 내장 image_gen으로 C 그림체 참조, 웨이브 저자세 이동 → 빨간 캔슬 화살표 → 기상어퍼와 뜨는 더미의 두 장면을 생성. `exports/thumbnail-wave-upper/wave-to-upper.png`, 정확한 프롬프트는 같은 폴더 prompt.txt. 양쪽 캐릭터가 오른쪽을 향하는 전환과 한글·파일 디코딩을 확인. 기술 의미를 설명하는 개념 그림이며 실제 게임 포즈의 프레임별 재현은 아님. 사용자 요청은 영상용 시안에만 적용, 앱의 공식 캐릭터 금지 결정은 변경하지 않음. 기존 영상/썸네일 교체와 커밋 없음.

## 낙서체와 수염 캐릭터 유무 비교

사용자가 캔술 오독/오자를 지적하고 더 허접한 손그림을 요청. 기존 두 동작을 단순한 둥근 머리·막대 팔·낙서 날개로 재생성하고 캔슬만 명확한 고딕으로 교정했다. 수염 없는 rough-no-narrator.png와 위쪽 여백에서 설명하는 수염 캐릭터 포함 rough-with-narrator.png를 `exports/thumbnail-wave-upper/`에 저장. 비교 페이지 compare-rough.html, 묶음 exports/wsc-thumbnail-rough-comparison.zip. 내장 image_gen 편집, 정확한 프롬프트 rough-final-prompts.json. 최종 두 이미지 캔슬 글자·동작·캐릭터 육안 확인, PNG/ZIP 검증 통과. 기존 썸네일/영상 유지.

## 더 멍한 표정, 아저씨 제외

사용자가 아저씨 없는 안을 선호하며 더 멍청해 보이는 느낌을 요청. 화난 눈썹을 없앤 blank-face.png와 넓적한 감자 머리/짧은 다리/힘없는 팔의 goofy-proportions.png 두 변형 생성. `exports/thumbnail-wave-upper/compare-goofy.html`에서 비교. 추천 후자. 내장 image_gen 편집, 정확한 프롬프트 goofy-prompts.json. 캔슬/웨이브/기상어퍼 글자·두 동작·수염 없음 육안 확인 및 PNG 디코딩 통과. 기존 썸네일 미교체.

## B안 선택 및 뿔 추가

사용자가 goofy-proportions B안을 선택하고 두 데빌진 머리에 뿔만 추가 요청. 내장 image_gen으로 두 캐릭터에 작은 뿔 한 쌍씩 추가한 `exports/thumbnail-wave-upper/goofy-proportions-horns.png` 저장. 같은 폴더 goofy-horns-prompt.txt에 정확한 프롬프트. 표정·구도·캔슬 글자 유지 육안 확인, PNG 검증 통과. 이전 B와 기존 납품 썸네일은 보존했다.

## 선택 썸네일 실제 적용

사용자가 뿔 추가 B안을 썸네일로 교체하도록 확정. assets/selected-thumbnail.png에 원본을 보관하고 delivery.py가 항상 이 파일로 exports/thumbnail.jpg(1920×1080,452089바이트)를 만들도록 변경. 미리보기 video poster도 새 파일을 사용. 이전 썸네일과 delivery.py는 cache/before-selected-thumbnail에 보존. pack_source.py가 선택 원본을 ZIP에 포함. PNG→JPG·규격 변환만 수행, 그림 재편집 없음. 브라우저 poster 로드/크기 검사 및 파일 검증 통과. 영상 본문과 유튜브 게시물은 변경하지 않음.
