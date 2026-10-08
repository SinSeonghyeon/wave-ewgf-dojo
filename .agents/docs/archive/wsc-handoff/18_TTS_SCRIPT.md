# TTS용 구간별 대사 — 2026-09-18

최신 승인 story.json과 타임라인에서 대사를 추출했다. 사용자가 허용한 [지문] 형식으로 말투·강세·호흡 안내를 추가했다. 기존 영상과 음성은 변경하지 않았다.

제작 폴더 `.sandbox/wsc-workspace03-production/`의 `exports/tts-script-ko/MAIN_SCRIPT_DIRECTED.md`는 본편 13구간, `SHORT_SCRIPT_DIRECTED.md`는 쇼츠 8구간이다. `main/directed-sections/`는 구간별 TXT, `main/directed-scenes/`는 기존 편집 대응용 44개 TXT다. 쇼츠는 8개다. 지문 없는 SCRIPT.md, sections/, scenes/, full-speech-only.txt도 함께 제공한다. `timing-manifest.json`에는 장면 ID·영상 범위·기존 음성 시작점과 길이·파일 대응을 기록했다. 전체 패키지는 `exports/wsc-tts-script-ko.zip`, 재생성 도구는 `export_tts_script.py`.

지문은 낭독할 대사가 아니다. 특정 TTS 서비스의 태그 지원을 전제하지 않는다. 태그를 읽는 서비스에서는 대사 전용 TXT나 별도 스타일 지시란을 쓴다. 새 음성의 길이에 따라 싱크를 다시 맞추며 기존 길이에 억지로 가속하지 않는다. 기존 영상의 정밀 교체는 장면별 파일을 권장한다.

검증: 본편44/쇼츠8장면 순서·누락·원문 일치, 지문 제거 후 원문 일치, UTF-8 저장, ZIP 무결성 통과. 대표 대본을 직접 읽어 형식 확인. 앱/영상 변경이 없어 앱·브라우저·MP4 검사는 실행하지 않았다. 이번 추적 문서는 PLAN.md와 이 문서이며 이전 변경을 보존했다. 커밋·푸시 없음.
