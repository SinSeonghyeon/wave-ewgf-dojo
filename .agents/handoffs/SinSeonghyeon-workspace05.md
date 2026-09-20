# workspace05 기능 변경 병합 인수인계 — 2026-09-19

## 2026-09-21 추가: 동시 입력 한 행 표시

- 후속 리뷰: 입력 시각순 삽입으로 장치 간 도착 순서 역전에도 동일 슬롯·버튼 간격·최근 40행 보존. Chrome 스모크는 실제 패드 연결/해제 이벤트도 차단해 터치 커맨드 초기화 간섭 제거. 최종 단위 151/151, Chrome errors=[], 디자인 30조합 errors=[] 통과. 사용자 후속 요청으로 이번 변경의 커밋·푸시·main 병합 승인됨.

- 기준 HEAD `8efb8d4`, 브랜치 동일. 이번 추가 작업은 커밋·푸시하지 않고 사용자 검증 대기 상태로 전달한다. 아래 9월 19일 승인·명령은 이전 작업 이력이다.
- 의존성/합류 순서: 기존 workspace05 입력 기록 UI 이후 적용, 다른 새 의존 브랜치 없음.
- 변경: 동일 60Hz frameSlot의 마지막 방향과 버튼을 `↘+2`처럼 합치고 프레임 수를 한 번 표시. 묶음 40행 유지, 모바일 긴 조합 줄바꿈.
- 별도 공지 불필요(표시 개선). 기존 공지에 포함할 경우 ko: 동시 입력을 입력 기록 한 행으로 표시 / en: Simultaneous inputs now share one history row / ja: 同時入力を入力履歴の1行にまとめて表示。
- 이번 추가분은 Worker 재배포·D1 마이그레이션 없음. 기존 기능 묶음의 선행 배포 요건은 아래 유지.
- 충돌 지점: index.html의 pushHistory/historyRows와 .chip CSS, tests/dojo.test.cjs, tests/smoke-chrome.js, tests/smoke-design.js, AGENTS.md 결정 27, CODE_MAP.md/PLAN.md. 원시 입력 판정·점수·프레임 격자와 방향 홀드 시간 유지.
- 직접 확인: 자유 연습에서 대각+RP 및 버튼 1+2 동시 입력 → 한 행/프레임 숫자 하나, 프레임이 다른 입력은 별도 행. 2P 화살표·모바일·오래된 40행 스크롤 확인.
- 검증: 단위 150/150, 디자인 스모크 30조합 통과. 전체 Chrome 스모크 첫 실행은 기존 분리 행 기대값과 실제 연결 패드 개입 상태에서 보상/백대시 검사 실패. 기대값 갱신·테스트 패드 격리 후 재검증 결과는 PLAN.md 진행 로그 참조.

## 기준과 권한

- 브랜치: `SinSeonghyeon/workspace05`.
- 검증한 로컬 HEAD: `2ffe47c342c72a0b1369fa556dfd4b320dc3e622`.
- 인수인계 대상: **기준 HEAD 위의 검토 완료 기능 변경 전체**. 사용자 후속 승인으로 본 문서와 기능을 함께 커밋·푸시한다. 전달 커밋은 `git log -1 --format=%H -- .agents/handoffs/SinSeonghyeon-workspace05.md`로 식별하고, 통합 전 fetch한 브랜치 tip과 파일 목록을 대조한다.
- 목적: 도장 화면·입력 기록 재구성, WSC 전용 순위, 폴더 기반 랜덤 BGM 및 음량 보정, 비동기 등록/초기화 리뷰 수정.
- 사용자 승인 범위: 로컬 변경 리뷰·수정·검증·인계 작성 및 후속 요청의 현재 기능 브랜치 커밋·푸시. 원격 fetch 후 현재 HEAD보다 앞선 기능 브랜치 커밋이 없음을 확인했다. main 병합/서비스 배포/인계 삭제는 범위 밖이다.
- 사용 스킬: `release-branch-integrator`의 handoff contract. 실제 통합 작업은 하지 않았다.

## 합류 순서·의존성

1. workspace00 통합본 `2ffe47c`의 WSC·동일 60Hz 칸 초풍·모바일·기술음이 선행 기준이다. 현재 HEAD에 이미 포함되어 있다.
2. 사용자가 승인한 이 브랜치의 기능 커밋을 통합 브랜치에 합류한다. 별도 후원 기능 브랜치를 다시 병합할 필요가 없다(옛 인계의 후원 변경은 기준 HEAD에 포함됨).
3. 통합 담당자는 다른 인계를 읽고 실제 원격 tip/의존 관계를 다시 확인한다. 전달 기능 커밋 SHA를 이 문서의 기준 HEAD와 혼동하지 않는다.

## 현재 기능 범위·보존 사항

- G 도장: 먹색/목재/붉은 강조, 작은 기존 2D 캐릭터, native WebGL 도장과 내장 WebP 재질. 미지원/유실 시 동일 투영의 Canvas 폴백, 복구 시 GPU 자원 재생성.
- 입력 기록: 왼쪽 최신순 최대 40행·내부 스크롤, 방향 유지 프레임/버튼 직전 간격. 다음 방향 시각은 역순 1회 순회, 같은 표시의 80ms DOM 재작성 생략.
- 도전/측정 시작은 1P/2P 왼쪽, 카운트다운/타이머는 씬 중앙 상단. 한마디는 1100px 이상 오른쪽·미만 바로 아래. WSC 타임라인/A·B는 플레이 아래, 1~15f만 표시하되 실제 숫자·판정은 유지.
- 캐릭터 재디자인은 철회 상태. 기존 그림/옷장/공유 카드/OG 사용, 손 번개 좌표 중복 배율 보정은 보존.
- WSC 10회 완주만 전용 순위: score=성공 횟수, tie=최고 연속. 둘 다 0~10 정수. 취소/자유 연습은 등록하지 않으며 기존 trial/로컬 측정 기록/업적/공유 카드와 분리.
- 등록 큐: `boardSubmit`이 `{r,e,nick,token,tab0}`를 예약하고 `boardDrain`이 직렬 전송. 등록/삭제 대기 중 모드 변경·새 도전에도 완주 payload 보존. 중복 예약 차단. 계정 변경 후 옛 예약 자동 전송 금지·옛 auth 오류로 새 계정 로그아웃 금지.
- 초기화: 세션 초기화 버튼은 제거. 설정의 기록·업적 초기화는 일반/WSC 세션·완주 결과·입력 이력·미전송 큐까지 함께 지운다. 이미 전송한 요청/서버 순위는 별도이며 서버 기록 삭제 기능은 그대로 유지.
- BGM: 루트 `bgm.mp3`를 `bgm/bgm.mp3`로 이동, High Rollers Club/DUOMO DI SIRIO/Mishima DOJO 포함 현재 4곡. 원본 보존. Moonlit Wilderness는 제외된 비커밋 파일.
- `bgm/playlist.json`은 Jekyll 템플릿, `tools/update-bgm.js`는 로컬 fallback 갱신. HTTP는 목록을 기다리고 실패/4초 타임아웃 시 fallback. 경로로 직전 곡 제외, 빈 목록 무음/한 곡 반복, 일시정지·음소거·다음 곡 분리, Web Lock 한 창 재생 유지.
- BGM_GAIN은 기본 곡 -19.17 LUFS 기준 감쇠. `tools/measure-bgm.js`는 FFmpeg가 있을 때 수동 재측정, 새 곡 목록 등록과 별도. 원본 재인코딩 없음.
- 기존 623/6N23·캔슬6/시작6, A=8/9/10와 B=1/1~2/1~3, 공통 60Hz 초풍, rush 10/5/3점, 독립 백대시, 터치70~300%·보조 키, ko/en/ja, 후원/공지/D1 조회 절약 정책 보존.

## 배포 순서 — Worker 선행, DB 변경 없음

1. 통합 결과를 로컬에서 단위 → 브라우저 스모크로 검증한다.
2. **사용자 작업:** `worker/`에서 `npx wrangler deploy`. `BOARDS.wsc`와 정수/완주 검증이 추가되어 구 Worker는 WSC 제출을 거부한다.
3. D1 스키마/마이그레이션/비밀값/도메인/ALLOWED_ORIGINS 변경 없음.
4. 사용자 직접 확인·최종 공지 승인 후 사이트 main을 반영한다. 기존 main/root Pages + Jekyll 유지. `.nojekyll`을 추가하면 playlist 자동 생성이 중단된다.
5. 사용자가 푸시했다고 알린 뒤 통합 담당자가 Pages 빌드 성공·실제 `bgm/playlist.json`의 JSON/4곡 및 WSC 순위 왕복을 확인한다. 이번 로컬 검증은 실 Jekyll 배포 검증이 아니다.
6. 최종 통합/공지 승인 뒤 저장소 절차에 맞춰 임시 handoff들을 제거한다. 이번 세션에서는 인계를 남긴다.

## 공지 초안

공지 필요: 예. 아래 문구는 초안이며 NOTICES/I18N에 적용하지 않았다. 통합자는 다른 기능 초안과 합쳐 사용자에게 최종 문구를 보여준다.

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 새 도장과 웨캔기어 순위 | 연습 화면을 정리하고 음악과 도전 순위를 추가했습니다. | 1. 3D 도장과 왼쪽 입력 기록, 플레이 아래 분석을 확인하세요.<br>2. 한마디는 넓은 화면에서 플레이 오른쪽에 표시됩니다.<br>3. 웨캔기어 10회 완주 기록을 성공 횟수·최고 연속 기준으로 등록합니다.<br>4. 배경음을 랜덤 재생하고 일시정지·다음 곡으로 조절할 수 있습니다. |
| en | A new dojo and wave-cancel rankings | An updated practice view, music controls, and challenge rankings. | 1. Practice in a 3D dojo with input history on the left and analysis below.<br>2. The shoutbox sits beside practice on wide screens.<br>3. Completed 10-try wave-cancel challenges rank by successes, then best streak.<br>4. Shuffle the music, pause it, or skip to the next track. |
| ja | 新しい道場とキャンセルアッパーランキング | 練習画面を整理し、音楽操作とチャレンジランキングを追加しました。 | 1. 3D道場、左側の入力履歴、プレイ下の分析を確認できます。<br>2. 広い画面ではひとことをプレイ右側に表示します。<br>3. 10回チャレンジの完走記録を成功数・最高連続成功で登録します。<br>4. BGMをランダム再生し、一時停止・次の曲で操作できます。 |

## 충돌 예상 파일·심볼

| 파일 | 합류 시 확인 |
|---|---|
| index.html | :root/누적 레이아웃 CSS·stage/coach/posts DOM, historyRows/renderHistory/resetInput, wscFinish/challenge.result, boardSubmit/boardDrain/boardDelete, resetSession, BGM_TRACKS/BGM_GAIN/bgmSync, resize/roomMesh/createDojo3D/drawFighter |
| worker/index.js, tools/board-admin.js | wsc 보드·검증·관리자 목록을 앱과 함께 유지. scores 스키마 변경 금지 |
| tests/* | 큐·신원·초기화 회귀, 6개 순위 탭, 세로 입력 기록·새 BGM 폴더·WebGL 폴백 기대값 유지 |
| bgm/, bgm.mp3, tools/update-bgm.js, tools/measure-bgm.js | 루트 파일 삭제와 하위 폴더 이동을 함께 반영. 4개 파일명과 fallback/gain 경로 일치 |
| 문서·en/index.html·ja/index.html·og.png | 최신 디자인/판정/순위 문구 보존, 오래된 'Worker 배포 없음'이나 단일 루프 BGM 설명을 되살리지 않음 |

## 검증·남은 일

- 단위: `node --test tests/dojo.test.cjs tests/board.test.cjs` → 149/149 통과.
- `node tests/smoke-chrome.js` → 통과, errors=[]; 로컬 실제 Worker의 WSC 자동 등록/삭제 포함.
- `node tests/smoke-wsc.js` → 통과, errors=[]; 데스크톱/모바일·3언어·양 방향.
- `node tests/smoke-sound.js` → 통과; 4곡 디코딩/재생/게인·다중 창·음소거/일시정지/다음 곡.
- `node tests/smoke-design.js` → 통과, errors=[]; 30개 배치·WebGL/재질·유실/복구·미지원·설정 초기화 확인. 데스크톱/모바일 캡처도 열어 확인했다.
- `git diff --check` → 통과(LF→CRLF 안내만 존재).
- 재현 실패/첫 단위 실패 경위: `.agents/docs/reviews/2026-09-19-workspace05-local.md`.
- 로그: `.sandbox/review-local-{unit,chrome,wsc,sound,design}.log`(비커밋).
- 통합 담당자의 남은 일: 사용자 직접 조작 확인, 전달된 기능 커밋/원격 tip 대조, 통합 후 재검증·공지 확정, 사용자 Worker 배포, Pages/Jekyll 실 배포 확인. 라이브 검증을 했다고 간주하지 않는다.

## 문서·설계 결정

- 기존 로컬 변경이 AGENTS 결정5/8/25/26과 README·PLAN·CODE_MAP·WSC_PRACTICE·DESIGN_2026-09-19를 갱신했다.
- 이번 리뷰는 설계 정책을 바꾸지 않았다. CODE_MAP의 제출 큐/전체 초기화/입력 렌더 설명을 갱신하고 PLAN과 리뷰 보고서를 추가했다.

## 합류 후 직접 확인

1. 자유 연습 → 웨이브/초풍, 입력 프레임·스크롤·손 번개·캐릭터/바닥 일치.
2. WSC 10회 완주 → 전용 순위 등록, 실패 시 재시도, 본인 기록 삭제. 기존 로컬 측정/업적과 분리.
3. 두 모드에 기록을 만든 뒤 각각 설정 → 기록·업적 초기화. 두 세션과 입력 이력/이전 WSC 등록 문구 모두 제거, 서버 순위 유지.
4. 모바일 세로/가로·1P/2P·ko/en/ja의 터치/한마디/시계/도구 배치.
5. BGM 4곡·음량·일시정지 중 다음 곡·음소거·다중 창 한 곳 재생.

## 승인된 커밋·푸시 파일 목록과 명령 (PowerShell, 저장소 루트)

사용자 후속 요청으로 아래 파일들을 명시해서 커밋·푸시한다. 이번 리뷰 수정만이 아니라 검토 대상 로컬 기능 전체를 추가한다. 기존 미추적 MP3 4개를 정확한 경로로 지정했고 `.sandbox`는 포함하지 않는다. Worker 선행 배포는 main/사이트 반영 전에 필요하다. 이 명령은 현재 기능 브랜치를 푸시하며 main 병합 명령이 아니다.

```powershell
git add -- '.agents/docs/CODE_MAP.md' '.agents/docs/PLAN.md' '.agents/docs/WSC_PRACTICE.md' '.agents/docs/DESIGN_2026-09-19.md' '.agents/docs/reviews/2026-09-19-workspace05-local.md' '.agents/handoffs/SinSeonghyeon-workspace05.md'
git add -- 'AGENTS.md' 'README.md' 'index.html' 'en/index.html' 'ja/index.html' 'og.png'
git add -- 'bgm.mp3' 'bgm/README.md' 'bgm/playlist.json' 'bgm/bgm.mp3' 'bgm/TEKKEN 7 鉄拳7 DUOMO DI SIRIO.mp3' 'bgm/Tekken 6 Soundtrack High Rollers Club.mp3' 'bgm/Tekken 7 OST  Mishima DOJO.mp3'
git add -- 'tests/board.test.cjs' 'tests/dojo.test.cjs' 'tests/smoke-chrome.js' 'tests/smoke-sound.js' 'tests/smoke-wsc.js' 'tests/smoke-design.js'
git add -- 'tools/board-admin.js' 'tools/update-bgm.js' 'tools/measure-bgm.js' 'worker/README.md' 'worker/index.js'
git commit -m "feat: refresh dojo layout, add WSC rankings and folder BGM"
git push origin HEAD
```
