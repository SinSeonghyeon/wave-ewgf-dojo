# 초스카이·캐릭터 선택 브리핑

작성: 2026-10-11. 상태: 구현 완료(결정 33·34). 규칙은 `DECISIONS.md`, 코드 구조는 `CODE_MAP.md`가 정본이다. 여기에는 조사 근거와 **왜 그렇게 정했는지**만 둔다.

## 1. 요청

- 한마디 최다 요청 3건: #71 "초스카이도 연습 가능합니까", #108 "초스카이도 넣어주세요", #82 "화랑 초스카이 연습 사이트".
- 운영자 답(#71): "풍신류 기능 끝나고 추가. 그때까지 무족초 커맨드로 연습" — 조사 결과 실제로 무족초와 같은 입력 모양이었다.
- 같은 날 사용자 요청: 특정 캐릭터의 특정 커맨드를 연습하도록 **캐릭터 선택**을 넣고, 앞으로 캐릭터를 늘릴 수 있게(웨이브가 없는 캐릭터 포함).

## 2. 초스카이 조사 (웹, 2026-10-11)

| 사실 | 근거 |
|---|---|
| 화랑의 저스트 스카이 로켓. T8 영어 Lethal Sky Rocket(JFSR), 일본어 リーサル・ライジングブレード(통칭 青ライ), 한국 초스카이 | wavu Hwoarang_movelist, tekken8.sorao.site, 나무위키 |
| 철권 4부터 있었고 T8에서 기술표에 `6n3+RK 저스트`로 정식 기재 | 나무위키 |
| 커맨드 `f,n,df#4` = 대각과 4가 **같은 프레임**. 2를 거치면 일반 스카이 | wavu Notation·Hwoarang_tech, TekkenDocs, 디시 |
| 중립 생략 `63+4`는 3RK, 4 늦음은 3RK, 4가 3보다 빠르면 오른 플라밍고, `6N2+4`는 2RK | 나무위키, 디시 |
| 대시·크라우치 대시 중에는 안 나감(웨이브 도중 불가) | wavu Hwoarang_tech, 디시 · **사용자 실게임 확인 2026-10-11** |
| 오른 자세에서는 4가 최대 10f 늦어도 됨(1f라는 출처도 있음) | wavu, FPS Index |
| 발생은 둘 다 i16, 가드 일반 −18 / 초스카이 −8, 히트 +53a / +59a | wavu, sorao(Ver.3.02.01) |
| "초"는 초풍의 "초"(강화판), "최속 스카이"의 줄임이 아님 | 루리웹 2009 댓글 |

- 경쟁 도구: Dorya Trainer(github abduznik/dorya-trainer)가 로드맵 이슈 #21에 Hwoarang JFSR을 미구현으로 올려 두었다.
- 출처: [wavu Hwoarang_movelist](https://wavu.wiki/t/Hwoarang_movelist) · [wavu Hwoarang_tech](https://wavu.wiki/t/Hwoarang_tech) · [wavu Notation](https://wavu.wiki/t/Notation) · [sorao 화랑 프레임](https://tekken8.sorao.site/hwoarang/frame/) · [나무위키 화랑/기술](https://namu.wiki/w/화랑(철권)/기술) · [디시 1](https://gall.dcinside.com/board/view/?id=fightgametekken&no=4292322) · [디시 2](https://gall.dcinside.com/mgallery/board/view/?id=tekken7&no=598890) · [루리웹 2009](https://bbs.ruliweb.com/ps/board/176262/read/3705375) · [TekkenDocs 화랑](https://tekkendocs.com/hwoarang/guide) · [FPS Index JFSR](https://fpsindex.com/tekken-8-how-to-do-hwoarangs-just-frame-sky-rocket-jfsr/) · [Dorya Trainer #21](https://github.com/abduznik/dorya-trainer/issues/21) · [ewgftraining](https://ewgftraining.com/) · 검색 요약만: [note alriw](https://note.com/alriw/n/nccb9a1cadaf8), [fandom EWGF](https://tekken.fandom.com/wiki/Electric_Wind_God_Fist).

### 2-1. 다음 캐릭터 후보 (T8 저스트 기술, 확인된 것만)

| 캐릭터 | 기술 | 커맨드 | 비고 |
|---|---|---|---|
| 헤이하치·데빌진 | 초풍 | `6N23#2` | 카즈야와 같은 경로 |
| 레이나 | 초풍 / 저스트 3 | `6N23:2` / `6N23:3` | [TekkenDocs 레이나](https://tekkendocs.com/reina/guide) 요약만 확인 |
| 리 | `1,3:3:3`, `3~3,4`, `b+1:1,2` 등 | | [wavu Lee_tech](https://wavu.wiki/t/Lee_tech), 연속 저스트라 판정 모양이 다르다 |

폴·킹·니나·브라이언 등은 커맨드를 확인하지 못했다.

### 2-2. 선택 초상 이미지 출처 (결정 3 예외)

`src/assets/portrait-kazuya.webp`·`portrait-hwoarang.webp`는 [tekken.com/fighters](https://tekken.com/fighters) 캐릭터 목록이 쓰는 `kazuya-fighter-select.webp`·`hworang-fighter-select.webp`(454×708, Bandai Namco)를 위쪽 454×568로 자르고 240×300 WebP(q80)로 줄인 것이다(2026-10-11, `ffmpeg -vf "crop=454:568:0:0,scale=240:300:flags=lanczos" -c:v libwebp -quality 80`). 새 캐릭터도 같은 페이지의 같은 이미지에서 같은 명령으로 만든다. 권리자 요청이 오면 파일을 지우고 `CHARS[id].portrait`를 비운다(참고: [2024-04 TekkenMods 통지](https://mp1st.com/news/tekken-8-mods-website-receives-infringement-notice-from-bandai-namco)).

## 3. 판정을 이렇게 정한 이유

- **무족 보류 경로 재사용**: `6N3+버튼`은 무족초와 같은 모양이라, 같은 칸의 순간적인 d/f 중간 방향을 보류했다가 버튼으로 끝내는 기존 장치(`MIST_EWGF.md` 8절)를 버튼만 바꿔 쓴다. 판정기를 복제하지 않아 두 기술의 프레임 기준이 어긋날 일이 없다.
- **최속 = 앞·중립 각 1f**: 초스카이는 발생이 일반판과 같으므로 "최속"은 입력 속도 지표일 뿐이다. 무족초와 같은 기준으로 맞췄다.
- **일반 스카이는 실패**(사용자 답 Q2): 연습 목적이 초스카이라서 2를 거친 것은 실패로 세고 원인을 알린다. 자유 연습에서도 일반 스카이 연출은 보여 준다(Q23).
- **웨이브 도중 인정**(Q24): 실게임은 막지만 사용자 결정으로 예외 규칙을 두지 않았다. 구현상으로는 초스카이 캐릭터에서 모든 6(새 시작, 6N2·62를 포기한 뒤의 재시도, 웨이브의 캔슬 6·재시작 6)을 무족 보류의 시작으로 받는다(`mistArmJf`, `commandDir` 뒤에 실행해야 상태 1·3의 `resetCD`가 보류를 지우지 않는다).
- **같은 칸의 2·3**: 초스카이 판정에서는 2가 없던 것(6N3)으로 보지만, 웨이브 머신에는 카즈야와 똑같이 크라우치 대시로 넣는다(`mistTick`). 웨이브 10초 보드에 두 캐릭터가 섞이므로 같은 입력이 같은 대시 수가 되어야 한다(2026-10-11 리뷰 수정).
- **오른 자세 제외**(Q6): 자세 전환을 모델링하지 않는다.

## 4. 캐릭터 선택을 이렇게 만든 이유

- **이름이 아니라 능력으로 분기**: 화랑은 웨이브가 되고 앞으로 웨이브가 없는 캐릭터도 온다. 그래서 `wave`·`kbd`·`wsc`·`giwon` 플래그와 기술 목록으로 판정·모드를 가른다. 모드는 필요한 것을 선언하고 모드 탭·순위 탭이 자동으로 걸러진다.
- **카즈야 회귀 0**: 기존 버튼 해석(`commandButton`)은 그대로 두고 새 캐릭터만 공용 레시피 판정으로 보낸다. 가장 많이 쓰이는 경로를 다시 짜는 위험을 피했다.
- **결정 32 재사용**: 캐릭터에 없는 기술은 "꺼진 기술"과 같아서 기존의 "다음 해석으로 넘어간다" 규칙이 그대로 동작한다.
- **보드는 캐릭터를 섞는다**(Q22): 같은 도전 모드는 한 보드. 행마다 캐릭터를 표시(Q27)하고, 닉네임당 1행이라 더 좋은 기록 하나만 남는 것은 사용자가 수용(Q28).

## 5. 화랑 백대시 실측 (Q26)

`D:\dojo_video\projects\backdash`의 분석 결과(Wavu 백대시 표 사본 `data/video_readout/wavu.csv`, 자체 영상 판독 `data/results/`)에서 가져왔다. 단위 u = 게임 내부 거리 ÷ 1000.

| h (프레임) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 카즈야 | .01 | .04 | .07 | .12 | .18 | .24 | .30 | .36 | .42 | .47 | .52 | .56 | .59 | .61 | .62 | .62 | .63 |
| 화랑 | .01 | .04 | .07 | .12 | .17 | .23 | .30 | .36 | .42 | .47 | .52 | .56 | .58 | .60 | .62 | .62 | .62 |

| 지표 | 카즈야 | 화랑 |
|---|---|---|
| 1회 최대 후퇴량 (u) | 0.626 | 0.624 |
| 최고 프레임 속도 (u/f) | 0.065 | 0.065 |
| 최속 KBD 이론 속도 c=3 (u/s) | 2.25 | 2.25 |
| 스크립트 최속 KBD 실측 (u/s) | 2.247 | 2.247 |
| 90% 도달 프레임 | 13 | 12 |

- 프레임별 차이는 최대 0.01u, KBD 속도는 같다. 그래서 사용자 결정대로 연습 모드·bd10은 기존 `BD.CURVE`(미시마 5인 평균)를 화랑도 그대로 쓴다. 같은 bd10 보드에 섞어도 유불리는 측정 오차 수준이다.
- 다른 캐릭터를 넣을 때 차이가 크면(실측 범위 0.50~0.68u) 그때 캐릭터별 곡선을 다시 검토한다.

## 6. 남은 확인

- 실게임 최대 허용 시간(6·N을 얼마나 길게 눌러도 되는지). 지금은 무족초와 같은 기준.
- 히트 상태에서 저스트 조건이 풀리는지(EWGF만 확인됨).
- 웨이브 10초에서 화랑 크라우치 대시의 거리·주기가 카즈야와 다른지(점수는 대시 횟수라 거리 차이는 직접 들어가지 않는다).
