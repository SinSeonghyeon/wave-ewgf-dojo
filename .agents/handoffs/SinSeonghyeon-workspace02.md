# 인수인계 — SinSeonghyeon/workspace02

## 1. 브랜치·기준 커밋·목적

- 브랜치: `SinSeonghyeon/workspace02`
- 인수인계 기준 커밋: `a3c7f53` (origin/main과 동일. 앞서거나 뒤처진 커밋 없음)
- 상태: **미커밋 작업 트리**. 아래 9개 파일이 `M` 상태이며 커밋·푸시는 사용자 작업이다.
- 한 줄 목적: 2026-09-22 사용자 실게임 확인에 따라 중립을 생략한 `623` 웨이브 입력을 다시 허용하고(설계 결정 1), 그 변경을 리뷰해 상태 머신 진입점 정리와 WSC 웨이브 수 불일치 버그를 수정한다.

## 2. 합류 순서와 의존 브랜치

- 의존 브랜치 없음. 단독으로 `main`에 합류할 수 있다.
- 선행 배포(Worker 재배포·D1 마이그레이션) **없음**. 서버·스키마·API 변경이 전혀 없으므로 사이트 푸시 순서 제약이 없다.
- 다른 브랜치와 함께 묶을 경우: `index.html`의 `NOTICES`가 최신순이므로 이 브랜치의 `2026-09-22-623`이 다른 브랜치의 더 최신 공지보다 아래에 오도록 정렬만 맞춘다.

## 3. 사용자에게 보이는 변경과 공지 필요 여부

공지 필요 여부: **예** (`NOTICES`에 `2026-09-22-623` 1건을 이미 추가했다)

- `623`(시작 6 → 아래 → 대각)이 `6N23`과 같은 웨이브·크라우치 대시로 인정된다. 웨이브 수·연속·wave10/rush30 점수·업적 경로가 동일하다.
- 같은 선행 입력을 쓰는 일반 초풍·나락(`623+4`)·웨캔기어도 `623`을 받는다.
- 「중립 누락」 실패 결과·코치 문구가 사라졌다(`fault.no_neutral.*`, `a.no_neutral.*`, `res.no_neutral` 키 제거).
- 입력 기록 메모의 경로 표시는 유지: `623`은 `route.noNeutral`(중립 생략 · 623+RP), `6N23`은 `route.standard`, 무족초는 `route.mist`.
- 구간 막대에서 생략한 중립 구간은 0으로 표시된다.
- 무족초 `6N3+RP`의 판정·최속 조건은 그대로다.

## 4. 공지 초안 (index.html에 반영 완료)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 623 웨이브 입력 지원 | 중립 생략 입력 판정을 수정했습니다. | 1. 실게임 확인을 반영해 6 다음 중립 없이 23을 입력해도 웨이브가 동작합니다. 일반 초풍·나락·웨캔기어도 같은 선행 입력을 사용합니다. 9월 21일 중립 필수 안내를 정정하며, 캔슬 6과 다음 시작 6은 계속 구분합니다. |
| en | 623 wave input supported | Updated judging for inputs without neutral. | 1. Following in-game verification, waves now accept 623 without neutral after forward. Standard EWGF, Hellsweep and WSC share this prefix. This corrects the September 21 neutral requirement. Cancel forward and the next starting forward remain separate. |
| ja | 623ウェーブ入力に対応 | 中立省略入力の判定を修正しました。 | 1. ゲーム内での確認を反映し、6の後に中立を挟まない623でもウェーブが出るようになりました。通常の最風・奈落・WSCも同じ先行入力を使います。9月21日の中立必須の案内を訂正します。キャンセルの6と次の開始6は引き続き区別します。 |

I18N 키: `notice.20260922.title` / `.summary` / `.1` (ko/en/ja 동일 키).

과거 공지 `2026-09-21-roundup`(항목 2)과 `2026-09-21-mist`(항목 3)는 `623` 금지를 설명한다. 설계 결정 20에 따라 공지는 날짜순 기록이므로 **본문을 고치지 않고** 새 공지에서 정정 문구로 덮었다. 통합 담당자가 과거 공지를 수정할 생각이면 먼저 사용자에게 확인한다.

## 5. 배포 전후 사람이 할 작업

없음. Worker 재배포·D1 마이그레이션·비밀값·도메인 변경 모두 해당 없다.

Pages 배포는 `main` 푸시 → `.github/workflows/pages.yml` → `_site/` 자동 배포 그대로다. `node tools/build-site.js`는 로컬에서 정상 동작을 확인했다(루트·ko/en/ja 생성, tracks 5).

## 6. 충돌 가능성이 큰 파일·심볼과 반드시 보존할 동작

| 파일 | 심볼 / 구간 | 반드시 보존할 동작 |
|---|---|---|
| `index.html` | `startCD(t)` (신규) | **상태 1 진입은 이 함수 한 곳뿐이다.** `cd.state=1; cd.tF=t;`를 직접 쓰는 코드를 되살리면 안 된다. 시작 6은 `cd.omittedNeutral`을 반드시 해제해야 하고, 캔슬 6(상태 4/5/7 → `cancelCD`)은 반대로 **유지**해야 250ms 안에 들어온 RP가 `noNeutral`로 기록된다. |
| `index.html` | `commandDir` case 1 `dir==='d'` | `cd.state=3; cd.tN=t; cd.tD=t; cd.omittedNeutral=true;` — `fault('no_neutral')`·`wscCancel(false)` 호출을 되살리지 않는다. |
| `index.html` | `commandDir` case 5/6 `dir==='d'` | `fault('cancel_as_start')` 유지. 캔슬 6은 시작 6을 겸할 수 없다(설계 결정 1). |
| `index.html` | `wscDir`의 `wsc.prefix` 분기 | `dir==='d' && (wsc.prefix===1 || wsc.prefix===2)` — 앞→아래와 앞→중립→아래를 모두 받는다. |
| `index.html` | `wscDir`의 `linked` 정규식 | `/^df,([nd],)?f,n,f,(n,)?d,df$/`. 첫 칸 `[nd]`는 대각 해제(1회), 뒤의 `(n,)?`는 623의 생략 가능한 중립이다. 둘을 혼동해 `[nd]`를 `n`으로 되돌리면 6번 항목의 버그가 재발한다. |
| `index.html` | `fault(kind)` 화이트리스트 | `['f_before_d','n_to_df','cancel_as_start']`. `'no_neutral'`을 되살리지 않는다. |
| `index.html` | `commandButton` 선두 | `if(cd.omittedNeutral){...}` 가로채기를 되살리지 않는다. 623은 일반 판정 경로를 탄다. |
| `index.html` | `attempt()` | `else if(off!=null) a.inputRoute=cd.omittedNeutral?'noNeutral':'standard';` — `kind==='no_neutral'` 조건을 되살리지 않는다. |
| `index.html` | `tick(now)` | `cd.omittedNeutral`의 250ms 만료 줄은 삭제했다. 이제 실패 상태가 아니라 경로 표시이므로 만료시키지 않는다. |
| `index.html` | I18N ko/en/ja | `fault.no_neutral.*`, `a.no_neutral.*`, `res.no_neutral` 5키 제거 + `notice.20260922.*` 3키 추가. 세 사전이 같은 키 집합이어야 한다(테스트가 검사). |
| `index.html` | `NOTICES` | 최신순 배열 맨 앞이 `2026-09-22-623`. |
| `tests/dojo.test.cjs` | `623 …` 테스트 4개, `neutral omission completes standalone and linked waves` | 아래 7번 참조 |
| `tests/smoke-mist.js` | 623/6N23 패드 검사 | 양쪽 패드에서 `623`·`6N23` 모두 `초풍!` + 웨이브 1 증가 |

## 7. 실행한 테스트와 결과

| 검사 | 결과 |
|---|---|
| `node --test tests/dojo.test.cjs tests/board.test.cjs` | **181/181 통과** |
| `node tests/smoke-chrome.js` | 통과, JS 오류 0 |
| `node tests/smoke-mist.js` | 통과 (`ok:true`, commands 17, neutralChecks 4, errors 0) |
| `node tests/smoke-wsc.js` | 통과, errors 0 |
| `node tools/build-site.js` | 정상 (`_site/` 생성, tracks 5) |
| `git diff --check` | 정상 |

알려진 실패·미완료: 없음.

수정 전 실패 재현: `linked` 정규식을 `([nd],)?` → `(n,)?`로 되돌리면 `623 seeds and refreshes WSC challenge prefixes without consuming tasks early`가 실패한다(162/163). 되돌리면 다시 163/163.

### 이번 리뷰에서 고친 것 (623 허용 작업 위에 추가)

1. **유지보수성 — 상태 1 진입 4곳 분산.** `cd.state=1; cd.tF=t; cd.omittedNeutral=false;`가 case 0/2/3/6에 복사돼 있었다. 새 전이를 추가할 때 해제를 빠뜨리면 `623` 경로 표시가 다음 초풍 로그에 잘못 남는다. `startCD(t)` 한 함수로 모으고, 캔슬 6은 왜 해제하면 안 되는지 주석으로 남겼다. case 1의 중복 `omittedNeutral=false`(항상 이미 false)도 제거했다. 동작 변화 없음.
2. **버그 — WSC 웨이브 수와 `cd.chain` 불일치 (기존 버그, 이번 변경 이전부터 존재).** `cd`는 상태 4에서 대각 해제를 N과 아래 모두 상태 7로 보내지만(`case 4: dir==='n' || dir==='d'`), `wscDir`의 `linked` 정규식은 해제 칸으로 N만 받았다. 그래서 `↘→↓→6 N 6 (N) 2 3` 연속 웨이브에서 `cd.chain`은 2인데 `wsc.active.waves`는 1로 돌아가, 웨캔기어 랜덤 과제(웨이브 N회 후 N+1번째 성공)가 실제 웨이브 수와 어긋나 조용히 실패했다. 정규식 첫 칸을 `[nd]`로 고쳐 `cd`와 일치시켰다(해제는 여전히 1회만, 두 번이면 양쪽 모두 체인이 끊긴다).
3. **테스트 — 약해진 단언 복구.** `assert.equal(a.cd.chainCycles[0]?.nGap??0,0)`은 선행 RP(offset<0)에서 `completeCD` 안에서 명령이 정리돼 배열이 비므로 **항상 통과**하던 공회전 단언이었다. 배열이 살아 있는 경우로 한정해 길이와 값을 함께 검사한다. 세 언어 반복문의 `assert.ok(rTitle.textContent)`도 모드별 실제 제목 키(`a.ewgf.title`/`a.wgf.title`/`a.combo.title`) 비교로 되돌렸다. 해제 방향(N/아래) 회귀 2건을 `cd`·WSC 양쪽에 추가했다.

## 8. 바뀐 설계 결정과 갱신한 문서

- `AGENTS.md` 설계 결정 **1** 교체 (2026-09-21 중립 필수 → 2026-09-22 `623` 허용), 결정 **25**(웨캔기어)·**27**(무족초)의 관련 문장 갱신.
- `.agents/docs/PLAN.md`: 전제 체크박스 2건(`623` 재허용, 리뷰·수정) + 진행 로그 2줄.
- `.agents/docs/CODE_MAP.md`: 상태 머신 다이어그램에 중립 생략 표기, 623 허용 문단 교체, `startCD` 단일 진입 규칙과 `linked` 정규식 `[nd]` 이유 2줄 추가.
- `.agents/docs/MIST_EWGF.md`: `623`을 실패 경로가 아닌 중립 생략 일반 경로로 정정(머리말·표·4절·8절).
- `.agents/docs/WSC_PRACTICE.md` 11절 4항: 선행 입력 `6N23`·`623` 모두 허용.
- `README.md`: 조작법·웨캔기어 절의 중립 필수 설명 정정.
- 서버·DB·워커 문서 변경 없음.

## 9. 합류 후 브라우저에서 직접 확인할 항목

1. **자유 연습 — `623` 웨이브**: `6` → (중립 없이) `2` → `3`. 결과 카드에 CROUCH DASH가 뜨고 웨이브 수가 1 오른다. 「중립 누락」이 뜨면 안 된다. 구간 막대의 `N` 칸은 0이다.
2. **`623+RP` 초풍**: 위 입력의 `3`과 동시에 RP. 「초풍!」이 뜨고, 입력 기록 표 맨 윗줄 메모가 `중립 생략 · 623+RP`다. 같은 자리에서 `6N23+RP`를 하면 메모가 `일반 입력 · 6N23+RP`로 바뀐다.
3. **`623+4` 나락**: `6` → `2` → `3`과 함께 RK. HELL SWEEP이 뜬다.
4. **캔슬 6 구분**: 웨이브 1회 뒤 `3`에서 바로 `6`을 누르고 중립 없이 `2`를 누르면 「시작 6 누락」 계열 MISS가 뜨고 웨이브가 늘지 않아야 한다.
5. **연속 웨이브(이번 수정 지점)**: 웨캔기어 모드에서 `6N23` → **↘에서 ↓로 뺀 뒤** `6` → `N` → `6` → `2` → `3`. 웨이브가 2로 이어져야 한다(예전에는 1로 되돌아갔다). 랜덤 과제 "웨이브 1회 후 2번째에 성공"이 이 입력으로 성공 처리되는지 확인한다.
6. **무족초 유지**: `6` → `N` → `3`+RP가 여전히 「무족초!」/「최속 무족초!」로 나오고, `623+RP`와 구분된다.
7. **공지**: 헤더 종 버튼에 `NEW` 배지 → 팝업 최상단이 「623 웨이브 입력 지원」. ko/en/ja 전환 시 제목·요약·항목이 모두 번역된다.
8. **언어별 주소**: `/ko/`·`/en/`·`/ja/`에서도 1~3번이 동일하게 동작한다.

## 10. 남긴 판단 (통합 담당자·사용자 확인용)

- `623`은 앞·중립·대각이 모두 같은 60Hz 칸에 들어와도 성공한다(중립 0칸 허용). 무족초처럼 "앞·중립 각각 최소 1칸" 조건을 넣지 않았다. 9월 21일 이전 동작과 같고 설계 결정 1의 "생략한 중립 구간은 0으로 표시한다"와 일치한다. 실게임에서 더 엄격하다면 사용자 확인 후 별도 작업으로 다룬다.
- 과거 공지 2건의 `623` 금지 설명은 4번 항목대로 그대로 두었다.
