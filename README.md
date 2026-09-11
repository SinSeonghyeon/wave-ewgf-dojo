# 미시마 도장 (Mishima Dojo / 三島道場)

철권 미시마류 커맨드(웨이브 대시, 초풍) 입력을 브라우저에서 프레임 단위로 판정하고, 코치 피드백과 기록을 남기는 연습 도구.
비공식 팬 제작. 파일 하나(`index.html`)로 동작하며 빌드나 의존 파일이 없다. UI는 한국어·영어·일본어 3개 언어(헤더 토글, 브라우저 언어로 자동 선택, localStorage 저장).

- 공개 배포: https://sinseonghyeon.github.io/wave-ewgf-dojo/ (GitHub Pages, main 브랜치 루트)
- 저장소: https://github.com/SinSeonghyeon/wave-ewgf-dojo
- 비공개 아티팩트(구): https://claude.ai/code/artifact/a7218420-6343-45ea-938f-19493e07059a
- 로컬 실행: `index.html`을 브라우저로 열면 끝. 키보드와 게임패드 모두 인식.
- 개발 세션: Claude Code에서 진행. 다음 세션에서 이어갈 때 이 문서, 아래 "설계 결정", 그리고 [PLAN.md](PLAN.md)의 체크박스와 진행 로그를 먼저 읽을 것.

## 기능 요약

| 영역 | 내용 |
|---|---|
| 판정 | 크라우치 대시(6N23) 상태 머신, 웨이브 캔슬 6 인식, 초풍 버튼 오프셋(ms/프레임) 측정 |
| 결과 분류 | 초풍 / 풍신권(늦음) / 빠름(d+2) / d/f 누락 / 커맨드 미완성 / 캔슬 6 누락 / 시작 6 누락 / 순서 오류 |
| 코치 | 매 시도마다 원인 한 줄 + 최근 10회 경향(평균 오프셋, 편차, 늦는지 빠른지) |
| 구간 분석 | 마지막 대시의 5구간 ms 스택 바: 시작 6 / 중립 / 2 / 3→캔슬 6 / 캔슬 6→다음 시작 6 |
| 모드 | 자유 연습 · 웨이브 10초 · 초풍 20회 · 웨이브 초풍 10회(웨이브 3회 이상 후 초풍만 인정) |
| 기록 | 초풍 타이밍 히스토그램(SVG), 웨이브 속도 추이(SVG), 최근 로그 표, 모드별 최고 기록(localStorage) |
| 연출 | 캔버스 SD 캐릭터: 대시 잔상·먼지, 초풍 시 번개·플래시·흔들림·"초풍!" 팝업, 샌드백 더미 타격 |
| 설정 | 판정 폭(0.5f/0.7f/0.9f), 1P/2P 방향, 연출 on/off, 키 리맵, 게임패드 상태 |
| 언어 | 한국어 / English / 日本語. 결과 카드·코치·로그·기록까지 전환 시 즉시 다시 그림 |

## 조작 (기본값)

- 방향: WASD 또는 방향키. 1P 기준 → 가 앞(6).
- 버튼: U=1(LP), I=2(RP), J=3(LK), K=4(RK).
- 게임패드: 십자키·왼쪽 스틱, □/X=1, △/Y=2, ✕/A=3, ○/B=4 (표준 매핑 인덱스 2,3,0,1).

## 설계 결정 (다음 세션에서 바꾸지 말 것)

1. **웨이브 표기는 `6N23 6 N 6N23 6 N …`**  
   3 직후의 6은 후딜레이 캔슬용이고, 다음 대시는 별도의 시작 6이 필요하다. 캔슬 6 없이 다음 6N23이 오면 "캔슬 6 누락", 캔슬 6을 시작 6으로 겸용하면 "시작 6 누락"으로 잡는다. 사용자가 명시적으로 요구한 규칙.
2. **초풍 기본 판정은 0.7프레임(±12ms, "보통"), 선택지는 0.5f(저스트)·0.7f·0.9f(±15ms)**. 2026-09-11 사용자 결정으로 기본값을 0.5f에서 0.7f로 변경. 1f 이상은 넉넉하다는 판단으로 1f/2f/3f 옵션은 제거. 저장된 옛 설정은 `store.v` 마이그레이션(v<4 또는 허용값 외)으로 기본값으로 덮어쓴다.
3. **철권 공식 캐릭터 이름·그림을 쓰지 않는다.** "미시마류 SD 파이터"와 자체 도트 연출만 사용. 수익화 시 IP 문제를 피하기 위함.
4. **단일 파일, 외부 라이브러리 없음.** 차트도 직접 SVG 문자열로 그린다. 폰트만 Google Fonts(Black Han Sans, Noto Sans KR, JetBrains Mono).
5. 다크 단일 테마. 토큰은 `:root`에 모두 정의(`--accent #4CC9FF` 전기 블루, `--gold`, `--warn`, `--red`, `--seg1~5`).
6. **앱 이름은 "미시마 도장"** (2026-09-11 사용자 결정, 이전 이름 "웨이브 초풍 도장"). 영어 Mishima Dojo, 일본어 三島道場. 성씨·유파 명칭이라 캐릭터 자산 회피 원칙(3번)과는 별개로 본다.
7. **모든 사용자 노출 문자열은 `I18N` 사전을 거친다.** 새 문자열은 ko/en/ja 세 곳에 같은 키로 추가하고, 정적 마크업은 `data-i18n` / `data-i18n-html` / `data-i18n-aria` 속성으로 묶는다. 동적 문구는 문자열 대신 `[key, ...args]` 배열이나 클로저로 저장해 언어 전환 시 다시 평가한다(`msg()`). 테스트가 세 언어 키 누락을 잡는다.
   일본어 용어: 초풍 = 最風, 풍신권 = 風神拳, 크라우치 대시 = 風神ステップ, 웨이브 = ウェーブ, 방향은 텐키 표기(6/N/2/3). 일본어일 때만 `html[lang=ja]`로 폰트를 Dela Gothic One / Noto Sans JP로 바꾼다.

## 코드 구조 (`index.html` 안의 `<script>`)

```
i18n  I18N{ko,en,ja} · T(key,...args) · msg(v) · setLang → renderAll() (정적 텍스트 applyStatic + 결과/코치/로그/기록 재렌더)
      ui{result,coach,trend,seg,padId}: 마지막 표시 내용을 키/클로저로 보관

입력 레이어
  keydown/keyup → held Set → kbVector() → recomputeDir()
  pollPad() 4ms 간격 → padDir/padBtn → recomputeDir()/onButton()
  dirName(x,y): 방향(side 반영)을 'f','n','d','df',... 로 변환
  history[]: 입력 표시 스트립(직전 입력과의 프레임 간격 포함)

크라우치 대시 상태 머신  onDir(dir,t)
  0 idle → 1 시작 6 → 2 중립 → 3 d(2) → 4 d/f(3, 대시 완료: completeCD)
  4 → 5 캔슬 6 (cancelCD) → 6 캔슬 후 중립 → 1 시작 6 …
  4 → 7 (3을 뗐는데 6이 아직) → 120ms 안에 6이 오면 캔슬 인정, 아니면 캔슬 없음
  tick(now): 각 상태 250ms(4는 450ms) 타임아웃, 체인은 마지막 3 후 700ms 지나면 endChain()
  fault(kind): f_before_d / n_to_df / cancel_as_start

초풍 판정  onButton(n,t) → classify(off) → attempt(kind, off, t)
  off = 버튼 시각 − 마지막 3 시각. |off| ≤ store.window → 초풍, off > window → 풍신권, off < −window → 빠름
  상태 3(d 유지)에서 버튼이 먼저 오면 cd.pending에 두고 3이 오면 음수 오프셋으로 판정, 120ms 안에 3이 없으면 'no_df'

코치  setCoach / coachWaveLive(cyc) / coachTrend() / endChain()
기록  session{dashes,bestChain,bestDps,cycles,attempts,log}, store.records[mode] (localStorage 키 'wave-ewgf-dojo-v1')
      log 행은 {type,res,num,memo} 를 i18n 키/배열로 저장, records 는 숫자 필드(dashes,chain / hits,target,mean)로 저장해 언어별로 다시 렌더 (label/sub 는 구버전 호환용)
차트  renderHist() 히스토그램 −6f~+9f, renderWave() 최근 40 사이클 대시/초
모드  MODES, setMode, startDrill(3초 카운트다운), endDrill(기록 저장), drillTick
스테이지  frame(): 카메라 → 더미 관리 → 배경/바닥 → 먼지 → 잔상 → 더미 → 캐릭터 → 번개 → 스파크 → 텍스트 팝 → 플래시
  drawFighter(g,x,y,pose,dir,alpha,tint) 포즈 파라미터: crouch, lean, jump, armR, armL, spread, tuck, eyeGlow, sweat
  poseAt(now): anim.kind('cd','ewgf','jab','stumble','idle')별 타임라인
  fx.crouchDash / ewgf / wgf / jab / stumble
```

시간 기준: `FRAME = 1000/60`. 키보드는 `event.timeStamp`, 패드는 폴링 시각(약 4ms 해상도).

## 개발 검증

- Node.js 18 이상에서 `node --test tests/dojo.test.cjs` 실행. 외부 패키지는 필요 없다. 19개 테스트(판정 경계·기본값 및 저장 설정 호환성·드릴·패드·저장·언어 전환).
- 브라우저 스모크 테스트: `node tests/smoke-chrome.js`. 로컬 Chrome/Edge를 헤드리스로 띄워 CDP로 조작한다(npm 의존성 없음). 키보드로 6N23+2를 넣고, ko/en/ja를 왕복 전환하고, 일본어 상태로 웨이브 10초 드릴을 돌린 뒤 JS 오류가 하나라도 있으면 실패한다. 결과 JSON을 눈으로 훑어 문구가 맞는지 확인하는 용도.
- 코드 변경 후 최소 검증 순서: `node --test tests/dojo.test.cjs` → `node tests/smoke-chrome.js` → 커밋·푸시 → Pages 반영 확인(약 1분, `curl -s https://sinseonghyeon.github.io/wave-ewgf-dojo/ | grep -o "<title>[^<]*</title>"`).

## 작업 규칙 (세션 인계용)

- **커밋은 파일을 명시해서 추가한다. `git add -A` 금지.** 이 폴더에는 다른 세션이나 사용자가 파일을 수시로 떨어뜨린다(2026-09-11에 외부 mp3가 공개 저장소에 쓸려 들어가 히스토리를 재작성했다).
- **같은 폴더에서 여러 Claude 세션이 동시에 돌 수 있다.** 시작할 때 `git status`와 `git log origin/main..main`, `git log main..origin/main`으로 갈라짐을 확인한다. 로컬 main이 원격과 다르면 작업 트리 변경이 없는지 보고 `git fetch && git reset --hard origin/main`으로 맞춘다. 커밋 전에 `git status --short`에 낯선 파일이 있으면 커밋에 넣지 말고 사용자에게 묻는다.
- **Claude Code 권한:** 공개 저장소 생성, rebase/reset, force push 같은 작업은 자동 모드 분류기가 막을 수 있다. 막히면 사용자가 프롬프트에 `! <명령>` 형태로 직접 실행하거나, 사용자가 명시적으로 지시하면 재시도한다. 이번 세션에서는 사용자가 force push를 직접 승인했다.
- **사운드 리소스** `bgm.mp3`, `웨이브사운드.mp3`, `초풍사운드.mp3`는 저장소에 있지만 아직 `index.html`에서 쓰지 않는다. 사용자가 자체 제작이라고 확인했다. 소리 피드백 기능(PLAN 4단계 "연습 품질")을 만들 때 사용.
- **저장소 이름은 `wave-ewgf-dojo`로 유지 중.** 앱 이름과 다르지만 Pages 주소가 바뀌므로 사용자 결정 없이는 바꾸지 않는다.
- 문서 갱신 규칙: 기능을 끝내면 PLAN.md 체크박스 `[x]`와 날짜, 진행 로그 한 줄, 설계 결정이 바뀌면 이 README의 "설계 결정" 번호를 추가한다.

- 테스트는 배포 HTML의 실제 스크립트를 읽고, DOM·게임패드·시간을 모사해 판정과 드릴 전환을 검증한다. 실제 하드웨어 입력 지연이나 화면의 시각적 품질은 별도 확인이 필요하다.
- 판정 기한은 입력 이벤트에서도 검사한다. 공격 판정 후 커맨드는 소비되며 다음 시도에는 새 커맨드가 필요하다.
- 모드 전환·세션 초기화·포커스 이탈은 진행 중 드릴과 카운트다운을 취소한다. 시작 전 커맨드는 드릴에 이어지지 않는다.
- 키 리맵은 중복 및 고정 방향키 충돌을 거부한다. Esc로 취소할 수 있다.
- 세션 누적 통계는 최근 300회 상세 기록과 별도로 관리한다.
- 검토 내역: [REVIEW.md](REVIEW.md).

## 알려진 한계

- 브라우저 입력 해상도(약 4ms)와 키보드 폴링 때문에 실제 게임 판정과 오차가 있다. 페이지에도 명시.
- 웨이브 체인 판정 임계값(700ms, 각 상태 250ms)은 경험적 값. 너무 엄격하거나 느슨하면 `tick()`과 `completeCD()`의 상수를 조정.
- claude.ai 아티팩트는 외부 스크립트를 차단하므로 광고·분석 스크립트를 붙일 수 없다.

## 추후 계획

1. ~~GitHub 저장소 + GitHub Pages 배포.~~ 완료(2026-09-11). 진행 계획은 [PLAN.md](PLAN.md).
2. **수익화 (우선순위 순).**  
   쿠팡 파트너스 제휴(레버·히트박스·패드 "연습 장비" 섹션) → 카카오 애드핏 배너(애드센스는 단일 도구 사이트 심사 통과가 어려움) → 후원 버튼(토스/Buy Me a Coffee) → 유료 기능(캐릭터별 커맨드 팩, 클라우드 기록, 리플레이).  
   IP 리스크 때문에 공식 캐릭터 자산은 계속 쓰지 않는다.
3. **커맨드 추가 후보:** 백대시 캔슬(4,4,1,4,4…), 스네이크 엣지류 크라우치 대시 파생기, 캐릭터별 초풍 파생(나락, 뇌신), 1P/2P 전환 드릴.
4. **연습 품질:** 리플레이(입력 타임라인 되감기), 세션 간 통계 비교, 목표 설정(예: 초풍 성공률 80%까지), 소리 피드백(저스트 성공음).
5. **연출:** SD 캐릭터 2종 이상(헤어·글러브 색 변형), 더미 콤보 후속타, 초풍 카운터히트 연출.
6. **모바일:** 터치 가상 패드는 타이밍 정밀도가 낮아 우선순위 낮음. 현재는 폰 폭에서 레이아웃만 대응.
