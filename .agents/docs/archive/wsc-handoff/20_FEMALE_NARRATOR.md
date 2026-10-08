# 여성 설명 캐릭터 시안 — 2026-09-18

사용자는 기존 설명 아저씨를 여성으로 바꾸고 싶으며, 멍하고 대충 그린 느낌에 예쁜 인상을 원한다고 요청했다. 내장 image_gen으로 기존 캐릭터의 거친 선을 참조해 단발/긴 머리 두 여성 캐릭터를 제작했다. 네모 입·비대칭 작은 눈·볼의 짧은 색선·막대 팔다리를 유지한다.

`.sandbox/wsc-workspace03-production/exports/character/female-concepts/index.html`에서 비교. 원본은 female-bob.png와 female-long.png(각1024×1536), 정확한 프롬프트는 prompts.json. 단발은 더 장난스럽고 멍한 느낌, 긴 머리는 더 부드러운 인상이다. 사용자가 단발을 선택한 뒤 목을 짧게, 홍조 제거, 오른쪽 눈과 입을 정리하도록 요청했다. 이를 반영한 투명 자산과 말하기 합성을 제작하고 본편의 기존 설명 캐릭터 5장면을 교체했다. TTS 음성은 유지했다. 초기 시안은 불투명 아이보리 배경이며 실제 영상에는 아래 투명 자산을 사용한다.

PNG 디코딩, 브라우저 두 이미지 로드와 크기, 콘솔 오류0 확인. 앱 코드 변경이 없어 앱 테스트는 실행하지 않았다. pack_source.py는 캐릭터 하위 폴더도 소스 ZIP에 포함하도록 변경. 선택된 썸네일 교체는 별도로 완료(19_THUMBNAIL_CONCEPTS.md). 이전 Git 변경은 보존, 커밋/푸시 없음.

## 단발 수정 및 영상 적용 완료

- 수정된 아이보리 배경 시안: exports/character/female-concepts/female-bob-refined.png.
- 최종 투명 자산: assets/female-narrator.png 및 exports/character/female-narrator-transparent.png. 목이 거의 보이지 않도록 줄이고 홍조를 제거했다. 오른쪽 눈에도 윤곽/동공을 넣었으며 입은 작은 정돈된 네모로 만들었다. 정확한 생성 지시: bob-refine-prompt.txt와 bob-alpha-prompt.txt.
- female_narrator.py가 원본 배경의 약한 반투명 번짐을 합성 마스크에서 정리하고 안정된 몸체 위 작은 입만 음량에 따라 움직인다. 캐릭터가 움직일 때 표정/몸 전체가 교체되지는 않는다.
- render_female_narrator.py로 stop_tag, theory_practice, down, qcb, db 장면만 재렌더하고 다른 장면은 직전 clean 출력에서 유지. 백업 cache/before-female-narrator. build.py 전체 재생성에도 동일 자산 적용. 쇼츠에는 원래 설명 캐릭터가 없어 재렌더하지 않았다.
- 4개 MP4 전체 디코딩·자막 경계, 최종 본편5장면 원본 대조(42.6–44.2dB), 입 이외 몸체 픽셀 동일, 기존 전환 회귀검사 통과. 실제 인코딩 접촉 시트 qa/female-encoded.jpg 육안 확인.
- 브라우저 재생·탐색·17개 바로가기 통과, 몽타주6초360프레임 드롭0, 콘솔오류0. 본편5:02.13/쇼츠0:55.05, 음량 -16.10/-15.94 LUFS, 오디오 스트림 동일.
- 미리보기에서 0:24 일시정지와 3:10 이론→연습, 3:27 이후 다른 입력 방법을 재생해 캐릭터를 확인한다. 썸네일은 별도 선택된 뿔 B안이다.
