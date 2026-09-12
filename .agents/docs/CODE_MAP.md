# CODE_MAP — `index.html` 구조

단일 파일. 순서대로 `<title>`·SEO/OG 메타(정적, 한/영 병기)·폰트 링크 → `<style>` → 마크업 → `<script>`(IIFE) 하나. 시간 기준 `FRAME = 1000/60`. 키보드는 `event.timeStamp`, 패드는 폴링 시각(약 4ms 해상도).

## 스크립트 구성 (위에서 아래 순서)

```
설정 저장  STORE='wave-ewgf-dojo-v1' · store{v,lang,window,side,fx,sound,bgmVol,sfxVol,keys,records,nick,…} · 로드 시 타입·허용값 검증 후 기본값으로 대체 · save()
소리      SND{bgm,wave,ewgf} 파일명 · snd{ok(typeof Audio),unlocked,bgm,pool,idx,lock,release} · 부트 때는 아무것도 만들지 않음(테스트 vm·og 생성이 미디어를 안 건드림)
          unlockAudio(): 첫 keydown/pointerdown/패드 버튼에서 1회 → 효과음 풀(이름당 Audio 3개, 라운드로빈) 생성 + bgmSync()
          bgmSync(): sound && bgmVol>0 && unlocked && !hidden이면 Web Locks(mishima-dojo-bgm) 획득 후 bgm 지연 생성·volume·play(). 같은 브라우저·사이트에서 한 창만 재생. 숨김/끄기/pagehide 시 대기 취소·pause·권한 반환, pageshow/visibilitychange/focus/blur에서 동기화. Web Locks 미지원은 hasFocus 조건으로 대체. NotAllowedError만 unlocked=false로 다음 제스처에 재시도(AbortError는 무시)
          sfxSync(): 모든 기존 효과음 보이스에 볼륨 적용, 끄기/0%는 pause·재생 위치 초기화. 설정 진입은 endTrial(true)·resetInput() 후 showModal로 측정·입력 잔여 상태 정리
          playSfx(name): fx.crouchDash → 'wave', fx.ewgf → 'ewgf'. 설정 #soundSel(segSel) · #bgmVol/#sfxVol range(input → store·save, sfx change → 미리듣기) · renderSound()는 부트·변경 시
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
          대시(연출 전용) taps{dir,t,neutral} · tapDetect(dir,t): f,N,f / b,N,b 가 TAP_MS(250) 안이면 fx.dash()/fx.backdash(). onDir의 switch 앞에서 실행하므로 두 번째 f는 그대로 시작 6
          상태 6(캔슬 후 중립)에서 오는 f는 웨이브의 시작 6이라 감지기에 넣지 않는다(같은 raw f,N,f지만 대시 아님). cd.dashT = 대시 시각, cd.dashT===cd.tF 이면 그 커맨드는 대초
초풍 판정 onButton(n,t) → classify(off) → attempt(kind, off, t)
          off = 버튼 시각 − 마지막 3 시각 · |off| ≤ store.window → ewgf · off > window → wgf · off < −window → early
          상태 3(d 유지)에서 버튼이 먼저 오면 cd.pending, 3이 오면 음수 오프셋으로 판정, 120ms 안에 3이 없으면 no_df
          attempt 종류: ewgf / combo_short(웨이브 초풍 모드에서 웨이브 3회 미만) / wgf / early / no_df / early_stage / no_cd
          attempt 레코드 {t,kind,off,chain,mode,streak,dash}: streak = combo{n,t}(연속 초풍. ewgf가 아니면 0, 마지막 초풍 후 3초 지나면 다시 1부터, resetInput/setMode/측정 GO/fault에서 0)
          dash = 대초(res 'dash_ewgf', 제목 a.dashEwgf.title, r-kind 'DASH ELECTRIC WIND GOD FIST'). 판정·통계·차트·순위는 kind만 보므로 영향 없음
코치      setCoach(m) · setTrend(m) · coachWaveLive(cyc): 5구간 중 가장 긴 구간 조언 · coachTrend(): 최근 10회 평균·편차
기록      addLog(t,typeKey,resMsg,num,memoMsg,cls) → session.log[12] · renderLog() 시각은 LOCALE[store.lang]
          store.records[mode][30]: wave10 {score(dps),dashes,chain} · ewgf20/combo10 {score(%),hits,target,mean}
          label/sub 문자열도 같이 저장(구버전 호환). recText()가 숫자 필드 우선으로 현재 언어로 다시 만든다
차트      histBins(attempts,window): −6f~+9f 빈(순수) · renderHist(): 히스토그램, 판정 폭 음영 · renderWave(): 최근 40 사이클 대시/초 · SVG 문자열 직접 생성
공유 카드 buildCard(src): 순수 데이터 → {app,modeName,sub,hero,metrics[],chart{hist|wave|null},windowText,dateText,url,tweet,file} (DOM 없음, 단위 테스트 대상)
          drawCard(g,model): 1200×630 캔버스 그리기. 색은 cssVar()로 :root 토큰을 읽어 스타일별 팔레트 P(기본=다크 앱 테마, model.style==='wood'=도장 나무 간판)로 묶고, 레이아웃 코드는 P만 참조. 폰트는 displayFont()/--body/--mono, drawFighter+drawBolt 재사용
          drawWood(널빤지 배경, 시드 LCG로 재현 가능)·drawPlaque(현판/목패)는 wood 스타일 전용 헬퍼. 나무·종이 색 토큰(--wood, --board, --cream*, --paper*)은 :root에 정의
          shareSource(): 측정 모드는 trial.result{rec,attempts,cycles,window}(endTrial이 당시 판정 폭과 웨이브 포함 시도 목록을 채움, startTrial/setMode/dReset이 비움), 자유 연습은 live session
          openShare → renderShare(document.fonts.load 후 그리기) → #shareDlg.showModal() · 복사(ClipboardItem, 실패 시 share.copyFail) · PNG 저장(a[download]) · X intent(텍스트만)
          renderAll()이 다이얼로그가 열려 있으면 현재 언어로 다시 그림. 버튼 #dShare 라벨은 renderMode()에서 share.card/share.session
OG 카드   buildOgCard(): og.png용 소개 모델(style:'wood', hero:null, tagline[2], keywords, note=app.tagline, chips[{cmd,tag}](og.chipWave/og.chipEwgf), modeName은 chips에서 파생, 예시 히스토그램은 WINDOW_DEFAULT 기준). drawCard는 model.tagline이 있으면 hero·지표 타일 대신 태그라인+칩을 그림
          앱 안에서는 호출하지 않음. tools/make-og.js가 index.html 사본의 IIFE 끝에 globalThis.__og 훅을 붙여 헤드리스 Chrome에서 그린 뒤 루트 og.png로 저장. 공유 카드는 기본 스타일 그대로(나무 스타일로 바꾸려면 buildCard 반환값에 style:'wood' 한 줄)
          문서 제목은 applyStatic()에서 T('app.docTitle')(검색용, 앱 이름과 분리). <head>의 정적 title/og:title은 크롤러용으로 HTML에 직접 둠
후원      DONATE{kakao{url,qr},kofi{url}} · donateOptions(lang): ko는 ['kakao','kofi'], 그 외 ['kofi','kakao'](순수, 테스트) · 버튼 3개(#donateTop 헤더, #donateShareBtn 결과 창 #shareDlg 안 — 캔버스 밖이라 공유 이미지에는 안 나옴, #donateBtn 푸터) 모두 openDonate() → #donateDlg(modalOpen에 포함)
          openDonate()는 창을 열기 전에 endTrial(true)·resetInput()으로 카운트다운/측정을 취소하고 남은 입력을 지운다(0점 저장·자동 순위 등록·결과 창 중첩 방지).
          #donateDlg 뷰 2개: #donateChoose(제목·안내·#donateOptions에 renderDonate()가 순서대로 그린 선택지·닫기) / #donateKakao(QR #donateQr + 휴대폰용 직접 링크 #donateOpen + 뒤로 #donateBack). 카카오페이 선택은 뷰 전환(링크가 휴대폰 전용이라), Ko-fi 선택은 새 탭 링크 후 닫힘. 문자열 donate.*
          donate-kakao.png는 DONATE.kakao.url을 담은 QR(제작 시 1회 생성한 정적 파일). 주소가 바뀌면 다시 만든다(스모크 테스트가 스크래치 페이지 옆에 복사)
출처 잠금 워커는 env.ALLOWED_ORIGINS(기본 https://sinseonghyeon.github.io)에 있는 Origin에만 CORS 허용 헤더를 돌려주고 POST는 403 origin. 앱 쪽 코드 변경 없음. 도메인 연결 시 wrangler.toml [vars]에 추가 후 재배포
백엔드    BOARD_URL(Worker 주소, 빈 문자열이면 backendInit()이 #boardCard·#postsCard를 숨기고 모든 fetch를 건너뜀) · board{tab,data[board]={week,start,end,total,rows,me},msg,seq}(seq: 가장 최근 boardLoad만 msg/data를 건드림) · live{visits,posts,postsMsg,posting,visitsBusy,nickBusy,nickMsg,nickLater,nickLost} · BOARDS = MODES 중 start 모드 목록(순위 탭·renderBests 순서) · nickOk/NICK_BAD/cleanNick/nickKey/hasNick()(워커와 같은 규칙. NICK_BAD는 유니코드 속성 클래스: 제어·서식(제로폭/양방향)·사용자 영역·미할당·행 구분자 + 한글 채움 문자·이체자 선택자. 워커 BAD_CHARS와 반드시 같게) · pctTop(rank,total)=상위 % (ceil, 최소 1) · tierOf(rank,total)=코멘트 등급 0~6(TIERS=[1,5,10,30,50,70] 상위 % 상한. 참가 10명 미만이면 10명으로 계산해 1/1이 '입문'이 되지 않게) · modalOpen(): #nickDlg/#shareDlg/#setDlg가 열려 있으면 키보드·패드 입력 무시(패드 폴링 주기로 불리므로 DOM 검색 없음)
          닉네임 게이트: store.nick + store.nickToken(48 hex; 닉 없는 토큰은 로더가 버림). backendInit()에서 hasNick()이 아니면 #nickDlg를 showModal → claimNick(POST /nick) 성공 시 nick·token 저장 후 boardLoad + boardSubmit(닉 없이 끝난 측정 결과가 있으면 그때 등록). 토큰 없는 옛 닉네임은 그대로 자동 claim. cancel 이벤트를 막아 Escape를 거부하지만 브라우저는 사용자 활성화가 없으면 무시하므로 게이트는 닫힐 수 있다 → close 이벤트에서 renderNick/renderTrialRank로 상태를 맞추고, 헤더 #nickBtn은 항상 보이며 닉 없으면 nick.set("닉네임 정하기"), 있으면 nick.change. 측정 모드 바 #dRank는 닉 없이 끝난 결과에 nick.needed를 표시. claim이 서버 쪽 이유(taken·nick 외: 네트워크·5xx·429)로 실패하면 live.nickLater로 #nickLater("나중에 · 순위 없이 연습") 버튼이 나타나 게이트를 닫을 수 있다(서버가 죽어도 연습은 가능). openNick()은 진행 중인 측정 모드(running/cdTimer)을 endTrial(true)로 취소한다(모달은 입력만 멈추고 시계는 멈추지 않으므로). 서버가 403 auth를 주면 lostNick()이 비우고, 결과 창이 열려 있거나 열리는 중(trial.openTimer)이면 live.nickLost만 켜 두었다가 #shareDlg close 때 게이트를 연다(모달 겹침 방지). 폼에서 내 닉의 대소문자/전각만 바꾼 경우(nickKey 동일)는 claim 없이 닫는다(서버는 409를 줄 것이므로). 한마디 폼은 #postNickLabel로 표시만
          boardFetch(path, init): fetch + JSON, 실패는 Error(message=서버 error 코드 또는 'http N'). AbortSignal.timeout(10초)로 멈춘 요청이 busy 플래그(게이트·등록·게시)를 영원히 붙들지 않게 한다
          backendInit(): boardLoad·postsLoad·visitsLoad + 60초 setInterval(document.hidden이면 건너뜀; 순위표는 주기 갱신 안 함)
          boardEntry(trial.result, mode): 순수. 측정 결과 → {board,win,lang,score,tie,detail}. wave10 score=대시/초·tie=최고 연속·detail{dashes,chain} / ewgf20 score=성공률·tie=−|mean|(−0 방지)·detail{hits,target,mean} / combo10 tie=detail.dps(측정 모드 중 cycles 평균 대시/초). 자유 연습·결과 없음 → null
          boardRowText(board,row): recText 재사용으로 표 셀 문자열(현재 언어) · boardWeekText(d): KST 기준 M/D ~ M/D
          순위 등록: endTrial 끝에서 boardSubmit()을 항상 호출(토큰 없으면 no-op)하고 900ms 뒤 openShare()로 결과 창(#shareDlg)을 자동으로 연다(trial.openTimer는 창이 실제로 열릴 때까지 유지). boardSubmit은 시작 시점의 nick·board.tab을 기억해, 응답이 왔을 때 닉이 바뀌었으면 보드 데이터를 버리고, 사용자가 다른 탭으로 옮겼으면 탭을 되돌리지 않고 data[board]만 저장(seq는 탭이 그대로일 때만 올려 옛 로드를 버림). 페이로드에 nick·token 포함. trial.result.submit={state:'busy'|'done'|'fail',rank,total,improved,error} → renderTrialRank()가 #dRank 문구(등록 완료/최고 기록 유지 + N위/M명·상위 P%)·#dRankRetry(실패 시)를 그리고 renderShareRank()가 결과 창 배너(#shareRank.tN: 등급 제목 tier.N.title·순위 줄·코멘트 tier.N.msg, CSS 애니메이션 tierPop/tierGlow/tierShine)를 그림. 등록이 끝나면 카드(열려 있거나 폰트 로드 중이라 아직 안 열린 것도, shareSrc.rec===trial.result.rec로 판별)를 다시 그려 캔버스에도 순위 줄(model.rankText = card.rank + 등급 제목, 타일 아래 y=548)이 들어가고 트윗 문구에도 붙는다
          #boardCard(.records 첫 칸): 탭(#boardTabs) · 주간 범위+참가 수(#boardWeek) · 내 순위 한 줄(#boardMe: me 있으면 board.me, 없으면 board.meNone) · 상위 10 표(#boardList, 내 행 tr.me, 10위 밖이면 ⋯ 구분 행 뒤에 내 행) · 새로고침. boardLoad는 GET /top?board=&nick=(hasNick()일 때만 store.nick. 토큰 없는 옛 닉으로 남의 행을 내 행처럼 보이지 않게)
          방문자(#visits, 헤더 우상단): visitsLoad()가 KST 날짜(KST_DAY)와 store.visitDay를 비교해 다르면 visitDay를 먼저 저장하고 POST /visits(요청 중 새로고침·두 번째 탭이 다시 세지 않게; 실패하면 그날은 안 세어짐), 같으면 GET. live.visitsBusy로 한 번에 하나만. 문구 visits(today,total)
          한마디(#postsCard): #postForm(#postNickLabel 표시 + 본문 #postText 200자) → postSend(POST /posts; hasNick()이 아니면 게이트를 연다) → 응답 rows로 목록 갱신. 오류 코드 매핑 rate→posts.tooFast, text→posts.textBad, auth→lostNick()
          서버 코드는 worker/ (CODE_MAP 범위 밖, worker/README.md 참조). 응답 shape: /nick {ok,nick,token} | 409 taken · /top {week,start,end,board,total,rows[{id,rank,nick,score,tie,detail,win,created_at}],me|null} · /submit 같은 shape + {ok,id,rank,improved} · /visits {day,today,total} · /posts {rows[{id,nick,text,created_at}]}
모드      MODES{free,wave10(10초),ewgf20(20회),combo10(10회)} · setMode → renderMode · startTrial(3초 카운트다운) · endTrial(기록 저장) · trialTick
설정 UI   #setDlg(dialog.share.settings, aside 안에 둠) ← 스테이지 우상단 톱니 버튼 #setOpen(.hud-gear, pointer-events:auto) · #setClose · 열려 있으면 modalOpen()이 게임 입력을 멈춤(키 리맵 listening은 그보다 먼저 처리되어 동작)
          segSel(id,attr,cb): winSel/sideSel/fxSel/soundSel/langSel · renderKeys(): 키 리맵(중복·방향키 충돌 거부, Esc 취소) · 볼륨 기본값 100/100
스테이지  canvas · world/anim/ghosts/pops/sparks/dust/bolts · fx{crouchDash,ewgf(n,fromDash),wgf,jab,stumble,dash,backdash} · pop(text,color,size,opts) 폰트는 displayFont()
          STREAK[1..6] 연속 초풍 팝 스타일(size/color 토큰/glow/rings/sparks/shake, 6에서 고정) · pop opts {lvl,glow,rings,core,life} → 렌더러가 punch-in(easeOutBack)·shadowBlur·퍼지는 링·흰 코어를 그림. reduced motion이면 크기·색·글로우만
          frame(): 걷기(curDir f/b 유지 + idle/walk 이고 moveDur 없음, WALK_F/WALK_B px/s, 살아있는 더미 36px 앞에서 정지) → 이동 → 카메라 → 더미 → 배경/바닥 → 먼지 → 잔상(cd/dash/backdash) → 더미 → 캐릭터 → 번개 → 스파크 → 텍스트 팝 → 플래시
          drawFighter(g,x,y,pose,dir,alpha,tint) pose.step(−1..1: 보폭, 0이면 기존과 픽셀 동일) · poseAt(now): anim.kind('cd','ewgf','jab','stumble','dash','backdash','walk','idle')
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
| 대초 (대시 초풍) | Dash EWGF | ダッシュ最風 |
| N초 (연속 초풍) | EWGF ×N | 最風×N |
| 캔슬 6 / 시작 6 | cancel 6 / start 6 | キャンセル6 / 始動6 |
| 방향 | f, N, d, d/f | 텐키 6/N/2/3 |

일본어일 때만 `html[lang=ja]`로 폰트를 Dela Gothic One / Noto Sans JP로 바꾼다. 언어는 `navigator.language`로 초기 선택(ko/ja 외는 en), `store.lang`에 저장.

## 리소스

- `og.png`: Open Graph 이미지 1200×630. `node tools/make-og.js [--lang ko|en|ja] [--out 경로]`로 생성(헤드리스 Chrome/Edge + CDP, 의존성 없음, Google Fonts 서브셋을 카드 문자열로 미리 로드). drawCard·og.* 문자열·색 토큰이 바뀌면 다시 생성해 커밋. 페이지 오류(폰트 요청 실패 포함)가 있으면 종료 코드 1.
- `tools/cdp.js`: 헤드리스 Chrome/Edge 실행·CDP 연결·evalJs·오류 수집을 한 곳에 둔 공용 모듈. `tests/smoke-chrome.js`와 `tools/make-og.js`가 씀(포트 9333/9334, 프로필 분리로 동시 실행 가능). 브라우저 자동화가 필요한 스크립트는 여기서 `launch()`를 가져다 쓴다.
- `worker/`: 백엔드(Cloudflare Worker + D1: 주간 순위·방문자 수·한마디). `index.js`(ESM, `weekKey`·`weekBounds`·`dayKey`·`validate`·`cleanText`·`nickKey`·`handle`·`BOARDS`·`WINDOWS` export + default fetch), `schema.sql`(scores + UNIQUE(week,board,nick), nicks(key=NFKC 소문자 유니크, token), visits, posts. 멱등), `package.json`(`"type":"module"`만), `wrangler.toml`(D1 + 레이트 리밋 바인딩 `POST_LIMIT` 3회/분·`NICK_LIMIT` 10회/분), `README.md`(배포·관리자 삭제·설계). 비밀 `ADMIN_TOKEN`(wrangler secret)은 DELETE /posts/:id 전용. 앱과 계약이 바뀌면 `index.html`의 boardEntry/renderBoard와 `tests/board.test.cjs`, dojo.test.cjs의 계약 교차 검증을 함께 고친다.
- `tests/fake-d1.js`: node:sqlite 인메모리에 `worker/schema.sql`을 그대로 적용한 가짜 D1(Node 22.13+). 단위 테스트와 스모크 테스트가 공유. dojo.test.cjs의 `boot(saved, fetch)`는 두 번째 인자로 fetch 스텁을 받아 백엔드 경합(등록 중 닉 변경·탭 전환, 403, 방문 집계)을 검사한다.
- `bgm.mp3`(3.7MB, 루프), `sfx-wave.mp3`(크라우치 대시), `sfx-ewgf.mp3`(초풍 성공): 자체 제작(사용자 확인 2026-09-11). 2026-09-12에 영문 파일명으로 개명하고 재생 코드 연결. 스모크 테스트는 스크래치 페이지 옆에 세 파일을 복사한다(없으면 리소스 오류로 실패).

## 검증

- `node --test tests/dojo.test.cjs`: 배포 HTML의 실제 스크립트를 읽어 DOM·게임패드·시간을 모사. 판정, 측정 모드 경계, 패드 동시 입력·재연결, 저장 데이터 검증, 누적 통계, 판정 폭 경계, 언어 전환, 세 사전 키 집합 일치, 공유 카드 모델(histBins/buildCard/shareSource), OG 카드 모델(buildOgCard)과 `<head>`의 정적 SEO/OG 태그(og:image 절대 주소·1200×630·theme-color가 `--bg`와 일치·외부 스크립트 없음)를 검증한다. 테스트 하네스의 `querySelectorAll`은 빈 배열을 돌려주므로 정적 텍스트 치환은 여기서 검증되지 않는다. 하네스에는 `createElement`·캔버스 컨텍스트가 없으므로 그리기·클립보드 코드는 클릭 핸들러 안에서만 호출해야 한다.
- `node --test tests/board.test.cjs`: Worker 핸들러를 `tests/fake-d1.js`(node:sqlite 인메모리 + 실제 schema.sql, D1 prepare/bind/run/all/first 모양)로 직접 호출. 주차·일 키 경계(15:00 UTC), 닉네임·본문 정규화·범위 검증, 닉네임 등록(대소문자·전각 무시 유니크, 토큰 없거나 틀리면 submit/posts 403, 등록 철자로 저장, 레이트 리밋 스텁), 닉네임당 1행 업서트(더 나쁘면 유지·improved=false), 동점 순위 공유·보드/주차 격리, 10위 캡 + 10위 밖 내 순위, 방문 집계, 게시판(50개 캡·검증·레이트 리밋 스텁·관리자 삭제 403/404), CORS·상속 키 400·404/413·500(스택 비노출). 두 파일을 함께 돌리려면 `node --test tests/dojo.test.cjs tests/board.test.cjs`.
- `node tests/smoke-chrome.js`: 로컬 Chrome/Edge를 헤드리스로 띄워 CDP로 조작. 시작 시 `worker/index.js`를 로컬 http로 감싸고(가짜 D1) `BOARD_URL`만 그 주소로 바꾼 index.html 사본을 임시 폴더에 만들어 연다(원본은 건드리지 않음). 키보드로 6N23+2 입력, ko/en/ja 왕복 전환, 일본어로 웨이브 10초 측정 모드를 끝까지 돌린 뒤 공유 카드 열기·1200×630 PNG 생성·이미지 복사 시도(file://에서는 거부되어 안내 문구)·언어 전환·닫기, 백엔드는 로드 직후 닉네임 게이트부터: 모달 열림·게이트 중 키 입력 무시·Escape로 안 닫힘·2자 미만 거부·미리 점유된 닉네임 409 거부(Chrome이 남기는 409 리소스 오류 로그는 걸러냄)·자유 닉네임으로 시작(localStorage nick+token 48 hex). 측정 모드가 끝나면 자동 등록 문구와 자동으로 열린 결과 창 배너(등급 t2 '上級', 1位/1人)를 확인하고, 두 번째 측정 모드 자동 등록('최고 기록 유지'·결과 창 재오픈) → 다른 보드 빈 상태 → 한마디 작성·표시 → 헤더 버튼으로 닉네임 변경 → ko 전환 후 문구와 가짜 D1의 scores/posts/visits/nicks 행을 검사한다. JS 오류가 있거나 검사가 실패하면 종료 코드 1. 약 40초 걸린다.
- 실제 키보드·게임패드 지연, DirectInput 장치별 hat 매핑, 화면 폭별 시각 품질은 자동 검증에 없다.
- 캔버스 입자·더미 물리는 프레임마다 고정량으로 갱신하므로 주사율에 따라 연출 속도가 달라진다. 판정은 시각 기반이라 영향 없음.

- 소리 회귀 브라우저 검사: `node tests/smoke-sound.js`. 로컬 HTTP로 backend 비활성 사본을 제공, 같은 Chrome의 별도 창 두 개에서 BGM 한 개·끄기/닫기 시 권한 이전·재생 중 효과음 볼륨/끄기를 검증.
