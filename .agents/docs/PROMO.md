# 홍보 글 초안 (PLAN 1-6)

2026-09-12 작성. 사용자가 붙여 넣기 전에 주소·닉네임·스크린샷만 확인한다. 게시 후 반응은 PLAN 진행 로그에 남긴다.

공통 사실(글마다 지키기): 무료 · 브라우저에서 바로 실행(설치·가입 없음, 닉네임만) · 키보드·패드 인식 · 6N23 웨이브와 초풍 입력을 ms 단위로 판정 · 매 시도 원인 한 줄 코치 · 측정 모드 3개 + 주간 순위 · ko/en/ja · 비공식 팬 제작, 자체 그림·음원 · 브라우저 입력 해상도(약 4ms) 때문에 실제 게임 판정과 오차가 있음을 밝힌다.

주소: https://sinseonghyeon.github.io/wave-ewgf-dojo/

첨부 추천: 초풍 성공 순간(번개 + "초풍!" 팝업) 스크린샷 1장, 결과 공유 카드 1장, 가능하면 웨이브 5~6초 GIF.

---

## 1. 디시 철권 갤러리

제목: 웨이브·초풍 연습 사이트 만들었음 (브라우저에서 바로 됨, 무료)

```
미시마 연습하다가 내 초풍이 몇 ms 늦는지 눈으로 보고 싶어서 직접 만들었음.

https://sinseonghyeon.github.io/wave-ewgf-dojo/

- 설치·가입 없음. 링크 열고 키보드나 패드 잡으면 끝 (닉네임만 하나 정함)
- 6N23 입력을 상태 머신으로 따라가면서 판정함. 초풍은 d/f 대비 2 버튼이 몇 ms 빨랐는지/늦었는지 숫자로 나옴
- 실패하면 원인 한 줄 알려줌 (풍신권으로 샜음 / d/f 누락 / 캔슬 6 누락 / 시작 6 누락 등)
- 웨이브는 마지막 대시를 구간별 ms로 쪼개서 보여줌 (시작 6 → N → 2 → 3 → 캔슬 6)
- 측정 모드 3개: 웨이브 10초 / 초풍 20회 / 웨이브 초풍 10회. 끝나면 주간 순위에 올라감 (월요일 초기화)
- 판정 폭은 0.5f / 0.7f / 0.9f 중 선택. 기본 0.7f

솔직히 말하면 브라우저라 입력 폴링이 4ms 정도라 실제 게임 판정이랑 100% 같진 않음. 대신 "내가 대체로 늦는지 빠른지", "웨이브 어느 구간에서 느려지는지" 보는 용도로는 충분함.

비공식 팬 제작이고 광고 없음. 캐릭터 그림·소리 전부 직접 만든 거라 공식 리소스 안 씀.
버그나 "이런 커맨드도 판정해줘" 있으면 댓글 남겨주셈. 사이트 안에 한마디 게시판도 있음.
```

댓글 대응 메모: "실제 게임이랑 다르다" → 알려진 한계로 이미 적어둠, 경향 파악용이라고 답. "치팅 순위" → 치팅 방지 없음(사용자 결정)이라 "재미로 보는 순위"라고 답.

## 2. 철권 디스코드 (한국)

```
웨이브·초풍 입력 연습 사이트 하나 공유합니다. 무료, 설치 없음, 브라우저에서 바로 됩니다.
https://sinseonghyeon.github.io/wave-ewgf-dojo/

6N23 입력을 프레임 단위로 판정하고 초풍은 버튼이 몇 ms 빠르고 늦었는지 숫자로 보여줍니다. 실패하면 원인 한 줄(풍신권 / d/f 누락 / 캔슬 6 누락 …)이 뜹니다.
측정 모드(웨이브 10초 · 초풍 20회 · 웨이브 초풍 10회) 끝나면 주간 순위에 올라가요. 키보드·패드 둘 다 됩니다.

브라우저 입력 한계(약 4ms) 때문에 실제 게임 판정과 오차는 있고, 경향 파악용으로 봐주세요. 비공식 팬 제작입니다. 피드백 환영!
```

## 3. r/Tekken

Title: I built a free browser trainer for Mishima wave dash / EWGF inputs. It tells you how many ms late (or early) your 2 was.

```
I kept wondering *why* my EWGF came out as a regular wind god fist, so I built a small trainer for it.

https://sinseonghyeon.github.io/wave-ewgf-dojo/

What it does:

- Runs in the browser, no install, no account (you just pick a nickname). Keyboard and gamepad both work.
- Tracks the f, N, d, d/f input as a state machine and measures the 2 press against d/f in milliseconds and frames.
- Every attempt gets a one-line reason: WGF (late), early (d+2), missed d/f, missing cancel f, missing starting f, wrong order.
- For wave dash it breaks your last dash into segments (start f → N → d → d/f → cancel f) so you can see where you lose time.
- Three timed trials: wave dash 10s, EWGF ×20, wave-into-EWGF ×10. Results go on a weekly leaderboard (resets Monday KST).
- Adjustable window: 0.5f / 0.7f / 0.9f (default 0.7f).
- English / Korean / Japanese UI.

Honest caveat: browser input polling is roughly 4ms, so it won't match in-game judgment exactly. It's meant for seeing whether you're consistently late or early and which part of your wave is slow, not as a frame-perfect replacement for the game.

It's a fan project, free, no ads. All art and sounds are homemade, nothing ripped from the game. Feedback and bug reports welcome, there's also a small message board on the site.
```

Reddit 메모: r/Tekken 자기 홍보 규칙에 따라 코멘트 답변을 성실히 달 것. 첫 댓글에 "made this myself, happy to answer questions"를 남기면 홍보 글로 안 보인다.

## 4. X (트위터)

한국어 (≤280자):

```
철권 웨이브·초풍 연습 사이트 만들었습니다. 브라우저에서 바로, 무료, 설치 없음.
6N23 입력을 ms 단위로 판정하고 초풍이 몇 ms 늦었는지 알려줘요. 실패하면 원인 한 줄. 주간 순위도 있음.
키보드·패드 OK. 비공식 팬 제작.
https://sinseonghyeon.github.io/wave-ewgf-dojo/
#철권 #TEKKEN8
```

English:

```
Made a free browser trainer for Mishima wave dash / EWGF.
It measures your 2 press against d/f in ms, tells you why each attempt failed (WGF, missed d/f, missing cancel f…), and has weekly leaderboards.
No install, keyboard or pad. Fan project.
https://sinseonghyeon.github.io/wave-ewgf-dojo/
#TEKKEN8 #FGC
```

日本語:

```
三島の風神ステップ・最風の練習サイトを作りました。ブラウザで動作、無料、インストール不要。
6N23の入力をms単位で判定し、最風が何ms遅れたかを表示。失敗時は原因を一行で。週間ランキングあり。
キーボード・パッド対応。非公式ファン制作です。
https://sinseonghyeon.github.io/wave-ewgf-dojo/
#鉄拳8 #TEKKEN8
```

## 5. 스트리머 DM (치지직·유튜브)

```
안녕하세요, 철권 방송 잘 보고 있습니다. 미시마 웨이브·초풍 입력을 브라우저에서 판정해 주는 무료 연습 사이트를 만들어서 소개드립니다.

https://sinseonghyeon.github.io/wave-ewgf-dojo/

링크 열고 패드 잡으면 바로 되고, 초풍이 몇 ms 빨랐는지 늦었는지랑 실패 원인이 매번 한 줄로 뜹니다. "웨이브 10초에 몇 번 하나", "초풍 20회 성공률" 같은 측정 모드가 있어서 방송에서 시청자랑 같이 도전하거나 주간 순위 경쟁하기에 괜찮을 것 같아 연락드렸습니다.

비공식 팬 제작이고 광고·유료 요소 없습니다. 방송에 쓰시면서 불편한 점 말씀해 주시면 바로 고치겠습니다. 감사합니다.
```

## 6. 일본 커뮤니티용 짧은 소개 (Discord 등)

```
三島の風神ステップ（6N23）と最風をブラウザで練習できるサイトです。無料・インストール不要・キーボードとパッド対応。
https://sinseonghyeon.github.io/wave-ewgf-dojo/
最風はボタンが d/f から何ms早い/遅いかを数値で表示し、失敗時は原因を一行で教えます（風神拳になった / d/f 抜け / キャンセル6抜け など）。
測定モード3種（風神ステップ10秒・最風20回・ステップ最風10回）と週間ランキングあり。
ブラウザの入力精度（約4ms）の都合で実機判定とは誤差があります。非公式ファン制作、フィードバック歓迎です。
```

## 게시 순서와 체크

1. 푸시 후 Pages 반영 확인 → 시크릿 창에서 닉네임 → 측정 모드 1회 → 순위 등록 → 후원 창까지 한 바퀴.
2. 디시 철권 갤 → 한국 디스코드 → X(ko) 같은 날. 반응 보고 문구 수정.
3. r/Tekken + X(en)는 미국 저녁 시간(KST 오전 9~11시)에.
4. X(ja) + 일본 디스코드.
5. 스트리머 DM은 위 게시물에 반응이 조금 붙은 뒤(순위에 사람이 몇 명 있어야 설득력).
