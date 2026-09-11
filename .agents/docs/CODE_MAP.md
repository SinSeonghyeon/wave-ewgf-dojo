# CODE_MAP — `index.html` 구조

단일 파일. 순서대로 `<title>`·SEO/OG 메타(정적, 한/영 병기)·폰트 링크 → `<style>` → 마크업 → `<script>`(IIFE) 하나. 시간 기준 `FRAME = 1000/60`. 키보드는 `event.timeStamp`, 패드는 폴링 시각(약 4ms 해상도).

## 스크립트 구성 (위에서 아래 순서)

```
설정 저장  STORE='wave-ewgf-dojo-v1' · store{v,lang,window,side,fx,keys,records} · 로드 시 타입·허용값 검증 후 기본값으로 대체 · save()
i18n      LANGS, LOCALE, I18N{ko,en,ja} · T(key,...args) · msg(v): 문자열|[key,...args]|클로저 → 텍스트 · displayFont()
          ui{result,coach,trend,seg,padId}: 마지막 표시 내용을 키/클로저로 보관 → setLang → renderAll()
          정적 마크업은 data-i18n / data-i18n-html / data-i18n-aria 속성으로 applyStatic()이 채운다
세션      session{dashes,bestChain,bestDps,tries,hits,offsetSum,offsetCount,cycles,attempts,log}
입력      keydown/keyup → held Set → kbVector() → recomputeDir() · pollPad() 4ms → padDir/padBtn
          dirName(x,y): side 반영해 'f','n','d','df',... · history[]: 입력 스트립(직전 입력과 프레임 간격)
상태 머신 onDir(dir,t)  0 idle → 1 시작 6 → 2 중립 → 3 d(2) → 4 d/f(3, completeCD)
          4 → 5 캔슬 6 (cancelCD) → 6 캔슬 후 중립 → 1 시작 6 …
          4 → 7 (3을 뗐는데 6이 아직) → 120ms 안에 6이 오면 캔슬 인정
          tick(now): 각 상태 250ms(4는 450ms) 타임아웃 · 체인은 마지막 3 후 700ms 지나면 endChain()
          fault(kind): f_before_d / n_to_df / cancel_as_start
초풍 판정 onButton(n,t) → classify(off) → attempt(kind, off, t)
          off = 버튼 시각 − 마지막 3 시각 · |off| ≤ store.window → ewgf · off > window → wgf · off < −window → early
          상태 3(d 유지)에서 버튼이 먼저 오면 cd.pending, 3이 오면 음수 오프셋으로 판정, 120ms 안에 3이 없으면 no_df
          attempt 종류: ewgf / combo_short(웨이브 초풍 모드에서 웨이브 3회 미만) / wgf / early / no_df / early_stage / no_cd
코치      setCoach(m) · setTrend(m) · coachWaveLive(cyc): 5구간 중 가장 긴 구간 조언 · coachTrend(): 최근 10회 평균·편차
기록      addLog(t,typeKey,resMsg,num,memoMsg,cls) → session.log[12] · renderLog() 시각은 LOCALE[store.lang]
          store.records[mode][30]: wave10 {score(dps),dashes,chain} · ewgf20/combo10 {score(%),hits,target,mean}
          label/sub 문자열도 같이 저장(구버전 호환). recText()가 숫자 필드 우선으로 현재 언어로 다시 만든다
차트      histBins(attempts,window): −6f~+9f 빈(순수) · renderHist(): 히스토그램, 판정 폭 음영 · renderWave(): 최근 40 사이클 대시/초 · SVG 문자열 직접 생성
공유 카드 buildCard(src): 순수 데이터 → {app,modeName,sub,hero,metrics[],chart{hist|wave|null},windowText,dateText,url,tweet,file} (DOM 없음, 단위 테스트 대상)
          drawCard(g,model): 1200×630 캔버스 그리기. 색은 cssVar()로 :root 토큰을 읽어 스타일별 팔레트 P(기본=다크 앱 테마, model.style==='wood'=도장 나무 간판)로 묶고, 레이아웃 코드는 P만 참조. 폰트는 displayFont()/--body/--mono, drawFighter+drawBolt 재사용
          drawWood(널빤지 배경, 시드 LCG로 재현 가능)·drawPlaque(현판/목패)는 wood 스타일 전용 헬퍼. 나무·종이 색 토큰(--wood, --board, --cream*, --paper*)은 :root에 정의
          shareSource(): 드릴 모드는 drill.result{rec,attempts,cycles,window}(endDrill이 당시 판정 폭과 웨이브 포함 시도 목록을 채움, startDrill/setMode/dReset이 비움), 자유 연습은 live session
          openShare → renderShare(document.fonts.load 후 그리기) → #shareDlg.showModal() · 복사(ClipboardItem, 실패 시 share.copyFail) · PNG 저장(a[download]) · X intent(텍스트만)
          renderAll()이 다이얼로그가 열려 있으면 현재 언어로 다시 그림. 버튼 #dShare 라벨은 renderMode()에서 share.card/share.session
OG 카드   buildOgCard(): og.png용 소개 모델(style:'wood', hero:null, tagline[2], keywords, note=app.tagline, chips[{cmd,tag}](og.chipWave/og.chipEwgf), modeName은 chips에서 파생, 예시 히스토그램은 WINDOW_DEFAULT 기준). drawCard는 model.tagline이 있으면 hero·지표 타일 대신 태그라인+칩을 그림
          앱 안에서는 호출하지 않음. tools/make-og.js가 index.html 사본의 IIFE 끝에 globalThis.__og 훅을 붙여 헤드리스 Chrome에서 그린 뒤 루트 og.png로 저장. 공유 카드는 기본 스타일 그대로(나무 스타일로 바꾸려면 buildCard 반환값에 style:'wood' 한 줄)
          문서 제목은 applyStatic()에서 T('app.docTitle')(검색용, 앱 이름과 분리). <head>의 정적 title/og:title은 크롤러용으로 HTML에 직접 둠
모드      MODES{free,wave10(10초),ewgf20(20회),combo10(10회)} · setMode → renderMode · startDrill(3초 카운트다운) · endDrill(기록 저장) · drillTick
설정 UI   segSel(id,attr,cb): winSel/sideSel/fxSel/langSel · renderKeys(): 키 리맵(중복·방향키 충돌 거부, Esc 취소)
스테이지  canvas · world/anim/ghosts/pops/sparks/dust/bolts · fx{crouchDash,ewgf,wgf,jab,stumble} · pop(text) 폰트는 displayFont()
          frame(): 카메라 → 더미 → 배경/바닥 → 먼지 → 잔상 → 더미 → 캐릭터 → 번개 → 스파크 → 텍스트 팝 → 플래시
          drawFighter(g,x,y,pose,dir,alpha,tint) · poseAt(now): anim.kind('cd','ewgf','jab','stumble','idle')
부트      renderAll(); setMode('free'); renderHistory(); updateStats(); requestAnimationFrame(frame)
```

## 판정 상수 (경험값. 너무 엄격·느슨하면 여기부터)

- 상태 타임아웃 250ms, d/f 유지 상태 450ms, d/f 뗀 뒤 캔슬 대기 120ms, pending 버튼 120ms, 체인 종료 700ms.
- 판정 폭 8/12/15ms(0.5f/0.7f/0.9f). 기본 12. "완벽한 저스트" 코치 문구는 `|off| ≤ min(8, window/2)`.
- 웨이브 상급 기준 5 대시/초. 구간 조언은 가장 긴 구간이 90ms를 넘을 때만.

## i18n 용어

| ko | en | ja |
|---|---|---|
| 초풍 | EWGF | 最風 |
| 풍신권 | WGF / Wind God Fist | 風神拳 |
| 크라우치 대시 | crouch dash | 風神ステップ |
| 웨이브 | wave (dash) | ウェーブ |
| 캔슬 6 / 시작 6 | cancel 6 / start 6 | キャンセル6 / 始動6 |
| 방향 | f, N, d, d/f | 텐키 6/N/2/3 |

일본어일 때만 `html[lang=ja]`로 폰트를 Dela Gothic One / Noto Sans JP로 바꾼다. 언어는 `navigator.language`로 초기 선택(ko/ja 외는 en), `store.lang`에 저장.

## 리소스

- `og.png`: Open Graph 이미지 1200×630. `node tools/make-og.js [--lang ko|en|ja] [--out 경로]`로 생성(헤드리스 Chrome/Edge + CDP, 의존성 없음, Google Fonts 서브셋을 카드 문자열로 미리 로드). drawCard·og.* 문자열·색 토큰이 바뀌면 다시 생성해 커밋. 페이지 오류(폰트 요청 실패 포함)가 있으면 종료 코드 1.
- `tools/cdp.js`: 헤드리스 Chrome/Edge 실행·CDP 연결·evalJs·오류 수집을 한 곳에 둔 공용 모듈. `tests/smoke-chrome.js`와 `tools/make-og.js`가 씀(포트 9333/9334, 프로필 분리로 동시 실행 가능). 브라우저 자동화가 필요한 스크립트는 여기서 `launch()`를 가져다 쓴다.
- `bgm.mp3`, `웨이브사운드.mp3`, `초풍사운드.mp3`: 저장소에 있으나 아직 재생 코드 없음. 사용자가 자체 제작이라고 확인(2026-09-11). 소리 피드백 기능(PLAN 4단계)에서 사용.

## 검증

- `node --test tests/dojo.test.cjs`: 배포 HTML의 실제 스크립트를 읽어 DOM·게임패드·시간을 모사. 판정, 드릴 경계, 패드 동시 입력·재연결, 저장 데이터 검증, 누적 통계, 판정 폭 경계, 언어 전환, 세 사전 키 집합 일치, 공유 카드 모델(histBins/buildCard/shareSource), OG 카드 모델(buildOgCard)과 `<head>`의 정적 SEO/OG 태그(og:image 절대 주소·1200×630·theme-color가 `--bg`와 일치·외부 스크립트 없음)를 검증한다. 테스트 하네스의 `querySelectorAll`은 빈 배열을 돌려주므로 정적 텍스트 치환은 여기서 검증되지 않는다. 하네스에는 `createElement`·캔버스 컨텍스트가 없으므로 그리기·클립보드 코드는 클릭 핸들러 안에서만 호출해야 한다.
- `node tests/smoke-chrome.js`: 로컬 Chrome/Edge를 헤드리스로 띄워 CDP로 조작. 키보드로 6N23+2 입력, ko/en/ja 왕복 전환, 일본어로 웨이브 10초 드릴을 끝까지 돌린 뒤 공유 카드 열기·1200×630 PNG 생성·이미지 복사 시도(file://에서는 거부되어 안내 문구)·언어 전환·닫기. JS 오류가 있거나 카드 검사가 실패하면 종료 코드 1. 약 15초 걸린다.
- 실제 키보드·게임패드 지연, DirectInput 장치별 hat 매핑, 화면 폭별 시각 품질은 자동 검증에 없다.
- 캔버스 입자·더미 물리는 프레임마다 고정량으로 갱신하므로 주사율에 따라 연출 속도가 달라진다. 판정은 시각 기반이라 영향 없음.
