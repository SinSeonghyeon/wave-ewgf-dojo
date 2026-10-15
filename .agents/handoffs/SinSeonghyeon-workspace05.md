# 인수인계 — SinSeonghyeon/workspace05

## 1. 브랜치·기준·목적

- 브랜치: `SinSeonghyeon/workspace05`
- 기준: `origin/main` 24ab24c 위에 커밋 2개(00d2a60 기능, 이 문서가 들어간 후속 커밋 = 리뷰 반영·진입 카드·인수인계)
- 목적: 철권식 **핫키**(공격 버튼 조합을 키/패드 버튼 하나에)와 설정 안 **컨트롤러 설정** 하위 화면. 결정 33(hotkeys).

## 2. 합류 순서·의존

- 의존 브랜치 없음. main 24ab24c에서 바로 fast-forward 가능.
- 다른 브랜치보다 늦게 합류하면 결정 번호 33이 겹칠 수 있다. 겹치면 합류 순서대로 번호를 다시 매기고 코드 주석 `결정 33(hotkeys)`·`DECISIONS.md` 제목·`AGENTS.md` 요약을 함께 바꾼다(`tests/docs.test.cjs`가 대조).

## 3. 사용자에게 보이는 변경 · 공지 필요: 예

- 설정 창 맨 위에 아이콘이 있는 큰 **컨트롤러 설정** 카드. 누르면 하위 화면(`‹ 설정으로`로 복귀, 창을 닫으면 주 화면으로 돌아옴).
- 하위 화면에 결정 29의 키보드/게임패드 바인딩·키 확인·기본값 복원과 터치 표시·크기·위치가 모였다(주 화면에서는 빠짐).
- **핫키** 11종: 1+3·2+4·1+2·3+4·1+4·2+3·1+2+3·1+2+4·1+3+4·2+3+4·1+2+3+4(철권 메뉴 순서). 키보드 키 1개·패드 버튼 1개씩. 기본은 모두 미지정.
- 동작마다 철권식 4점 버튼 아이콘, 표준 매핑 패드는 버튼이 Xbox(A/B/X/Y/LB…) 또는 PlayStation(✕○□△/L1…) 기호로 보인다. 비표준(DirectInput) 패드는 기존 B번호.

## 4. 공지 초안

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 컨트롤러 설정 · 핫키 추가 | 키 설정을 한곳에 모으고 철권처럼 버튼 묶음(핫키)을 지정할 수 있습니다. | 1. 설정 맨 위 "컨트롤러 설정"에서 키보드·게임패드·터치를 한 번에 설정합니다.<br>2. 핫키: 1+2, 1+3 … 1+2+3+4 조합을 키 하나·패드 버튼 하나에 지정합니다. 판정은 그 버튼들을 정확히 동시에 누른 것과 같습니다.<br>3. 버튼마다 철권식 아이콘과 패드 기호(Xbox/PlayStation)가 표시됩니다. |
| en | Controller settings · hotkeys | All bindings now live in one place, and you can bind Tekken-style button combos (hotkeys). | 1. Open "Controller settings" at the top of Settings for keyboard, gamepad and touch.<br>2. Hotkeys: bind 1+2, 1+3 … 1+2+3+4 to one key or pad button. Judging is the same as pressing those buttons exactly together.<br>3. Each action shows a Tekken-style button icon and Xbox/PlayStation pad symbols. |
| ja | コントローラー設定・ホットキー追加 | キー設定を1か所にまとめ、鉄拳のようにボタンの組み合わせ(ホットキー)を設定できます。 | 1. 設定の一番上「コントローラー設定」でキーボード・ゲームパッド・タッチをまとめて設定します。<br>2. ホットキー: 1+2、1+3 … 1+2+3+4 を1つのキー・パッドボタンに割り当てます。判定はそのボタンを完全に同時押ししたときと同じです。<br>3. 各操作に鉄拳風のボタンアイコンとパッド記号(Xbox/PlayStation)を表示します。 |

`NOTICES`·`notice.*` 키는 아직 넣지 않았다(같은 배포 묶음과 합칠지 통합 담당자가 결정).

## 5. 배포 전후 사람 작업

- 없음. Worker·D1·비밀값·도메인 변경 없음. 저장은 이 브라우저의 `store.hotKeys`/`store.padHotKeys`(새 필드, 기존 저장값과 호환, 잘못된 값은 미지정으로).

## 6. 충돌 가능성·반드시 보존할 동작

- `src/app.html` 설정 대화상자: `#setMain`(주 화면, 맨 위 `#ctlOpen` 카드)과 `#setCtl`(하위 화면: `.binding-editor` 전체 + 터치 행). 다른 브랜치가 설정 항목을 추가하면 **입력 장치 관련은 `#setCtl`, 나머지는 `#setMain`**에 넣는다. 터치 행(`touchSel`·`touchSize/X/Y`)의 id는 그대로.
- `src/js/07-input.js`: 키보드 버튼은 `buttonsForCode`(배열), 핫키는 아직 눌리지 않은 버튼마다 같은 timestamp로 `onButton`. 패드는 `pollPad`의 `hot`을 `pressed[]`에 합침. 슬롯 판별은 반드시 `isHotkey()`(패드 hat 코드 `hu`… 도 `h`로 시작). `padBindingEntries`에 `padHotKeys` 포함(교환·해제·release gate).
- `src/js/23-settings-ui.js`: `bindingCards`(이동·공격·핫키 절), `btnDots`, `padGlyph`, `showCtl`/`ctlView`. `setDlg` close 시 주 화면 복귀.
- `src/js/03-store.js`: `HOTKEYS`·`isHotkey`·`hotkeyButtons`·`padAttackSlot`, 로드 검증(이미 쓰는 키/패드 입력·자동 방향과 겹치면 미지정).
- `src/i18n/*.js`: `set.ctl`·`set.ctlSub`·`set.ctlBack`·`set.touchShow`·`set.secMove/secAtk/secHot`·`set.hotKey`·`set.hotNote`. 다른 브랜치의 `set.*` 키와 양쪽 모두 살린다.
- `src/style.css`: `.ctl-entry*`, `.ctl-nav`, `.ctl-sub`, `.key-sec`, `.dots`, `.pg*`, 캡처 중 `.binding-feedback` sticky.
- `tests/smoke-bindings.js`·`tests/smoke-chrome.js`: 바인딩 칸은 하위 화면 안에 있으므로 `#ctlOpen`을 먼저 누른다.

## 7. 테스트

- 단위 `node --test "tests/*.test.cjs"`: 281/281 통과(핫키 테스트 2개 추가 + 하위 화면 진입·이탈 확인).
- 브라우저 스모크: 00d2a60 시점 `tests/smoke-*.js` 9개 전부 통과. 리뷰 반영 후 `smoke-bindings`·`smoke-chrome`·`smoke-design`·`smoke-locales` 재실행 통과.
- 알려진 문제: 병렬 세션이 같은 CDP 포트로 스모크를 돌리면 `#setOpen` 클릭에서 CDP 타임아웃이 날 수 있다(단독 재실행은 통과).
- 실제 물리 패드로는 표시만 확인(GP2040-CE PS4 모드, 비표준 매핑 → B번호 표시). 표준 매핑 패드의 Xbox/PS 기호는 모의 Gamepad로만 확인.

## 8. 설계 결정·문서

- 새 결정 33(hotkeys): `DECISIONS.md` 전문, `AGENTS.md` 요약.
- `CODE_MAP.md`(파일 지도 23-settings-ui·기능 색인·store 필드·핫키 절), `README.md`(설정 표·조작법), `log/2026-10.md`(2026-10-16 두 줄).

## 9. 합류 후 브라우저 확인

1. 톱니 → 맨 위 붉은 "컨트롤러 설정" 카드 → 하위 화면. `‹ 설정으로`·닫기로 주 화면 복귀.
2. 키보드 탭 핫키 `1+2` 칸 클릭 → L → 창 닫고 6N23과 L을 함께 → 초풍 판정.
3. 게임패드 탭 핫키 칸 클릭 → LB 등 → 지정. 이미 쓰는 버튼이면 서로 교환. 지우기로 해제.
4. 키 확인을 켜고 핫키를 누르면 해당 카드와 4점 아이콘이 강조.
5. 폰 폭(390px)에서 카드·하위 화면 가로 넘침 없음, 캡처 중 지우기/취소 줄이 화면에 고정.
