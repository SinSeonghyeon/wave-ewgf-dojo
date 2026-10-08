# 인수인계: SinSeonghyeon/workspace01 — 기술 온오프

## 1. 브랜치·기준 커밋·목적

- 브랜치: `SinSeonghyeon/workspace01`
- 기준 커밋: 이 문서를 포함한 커밋(부모 `60ccca2`, origin/main `86ca10d`까지 병합된 상태)
- 목적: 설정에서 초풍·무족초·통발·나락·기원권을 하나씩 켜고 끄는 기능(결정 32 move-toggle).

## 2. 합류 순서·의존

- 의존 브랜치 없음. origin/main(`86ca10d`)을 이미 병합했으므로 순서 제약 없음.
- **결정 번호 32**를 새로 썼다. 다른 브랜치도 32를 새로 만들었으면 합류 순서대로 번호를 다시 매긴다(`DECISIONS.md` 제목, `AGENTS.md` 요약, 코드 주석 `결정 32(move-toggle)`를 함께 바꿔야 `tests/docs.test.cjs`가 통과).

## 3. 사용자에게 보이는 변경·공지

- 설정 창(입력·판정 설정)에 "기술 켜기·끄기" 버튼 줄과 설명 문구 추가. 기본은 모두 켜짐, 이 브라우저에만 저장(`store.moves`).
- 끈 기술은 없는 것처럼 판정한다(예: 기원권 끔 → ↘+RP는 초풍 실패, 통발 끔 → f,f+2는 초풍 early_stage, 나락 끔 → 4 무시, 초풍 끔 → 초풍 계열 결과가 안 나오고 무족초도 꺼짐).
- 모든 모드에 적용. 초풍 20회·웨이브 초풍 10회는 초풍, 기원초 연습은 기원권·초풍을 강제로 켠다(`MOVE_FORCED`). 더미 격파 30초·순위 보드에도 적용(사용자 수용).
- 모드 설명 끝에 "· 꺼 둔 기술: …" 표시.
- 공지 필요: **예** (아직 `NOTICES`·I18N 공지 키는 추가하지 않음 — 통합 담당자가 묶음 공지로 합칠지 결정).

## 4. 공지 초안

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 기술 켜기·끄기 | 설정에서 연습하지 않을 기술을 끌 수 있습니다. | 1. 초풍·무족초·통발·나락·기원권을 각각 끄면 그 기술이 없는 것처럼 판정합니다. 예) 기원권을 끄면 ↘+RP는 초풍 실패로 채점됩니다.<br>2. 초풍 20회·웨이브 초풍 10회에서는 초풍, 기원초 연습에서는 기원권·초풍이 항상 켜집니다. 꺼 둔 기술은 모드 설명 끝에 표시됩니다. |
| en | Moves on/off | You can now turn off moves you are not practicing in Settings. | 1. Turn EWGF, Mist Step EWGF, f,f+2, Hell sweep or d/f+2 off one by one and inputs are judged as if that move did not exist. E.g. with d/f+2 off, ↘+RP counts as a failed EWGF.<br>2. EWGF ×20 and Wave EWGF ×10 always keep EWGF on, and the d/f+2 → EWGF link mode keeps d/f+2 and EWGF on. Moves you turned off are listed at the end of the mode description. |
| ja | 技のオン・オフ | 設定で練習しない技をオフにできます。 | 1. 最風・無足最風・66+2・奈落・3+2を個別にオフにすると、その技が存在しないものとして判定します。例) 3+2をオフにすると↘+RPは最風失敗になります。<br>2. 最風20回・ウェーブ最風10回では最風、3+2 → 最風連係では3+2と最風が常にオンです。オフの技はモード説明の末尾に表示されます。 |

## 5. 배포 전후 사람 작업

- 없음. Worker·D1·비밀값·도메인 변경 없음. 저장 데이터는 추가 필드(`moves`)뿐이라 마이그레이션 없음.

## 6. 충돌 가능 파일·보존할 동작

- `src/i18n/{ko,en,ja}.js` 80번째 줄 근처(`set.side*` 바로 아래): `set.moves`·`set.movesNote`·`move.*`·`moves.off` 키를 양쪽 다 살린다.
- `src/js/03-store.js`: `MOVE_IDS`, `store` 기본값의 `moves`, 로드 시 0/1 검증 줄.
- `src/js/13-button.js` `commandButton`: `moveOn(...)` 가드가 붙은 분기(나락·초풍 classify·state 3 보류·통발). 판정 분기를 고친 브랜치와 겹치면 가드를 유지한다.
- `src/js/16-strikes.js`: `attempt()` 첫 줄 `if(!moveOn('ewgf')) return;`, 기원권 코치에서 초풍 꺼짐이면 `a.giwon.hint` 생략.
- `src/js/14-giwon.js` `giwonStage`/`giwonReady`, `src/js/11-crouch-dash.js` `mistDir` 시작·case 1의 6→↘ 보류(`cd.gFault`)·case 2 무족초 코치.
- `src/js/20-trials.js` `renderMode`(dDesc 뒤에 꺼 둔 기술), `src/js/23-settings-ui.js`(`renderMoveSel`·`setMove`), `src/app.html` 설정의 `#moveSel`, `src/style.css` `.segc.moves`.
- 새 모드를 추가·이름 변경하면 `MOVE_FORCED`(13-button) 키도 맞춘다(`tests/moves.test.cjs`가 검사).

## 7. 테스트

- `node --test "tests/*.test.cjs"`: 272 통과, 실패 0 (`tests/moves.test.cjs` 신규 8개 포함).
- 브라우저 스모크 `smoke-chrome`·`smoke-giwon`·`smoke-mist`·`smoke-bindings`: 모두 exit 0.
- 헤드리스 수동 점검(420px): 초풍 끔 → 무족초 비활성·꺼진 모양, 모드 설명에 "꺼 둔 기술: 초풍, 무족초", 가로 넘침 없음.
- 알려진 실패·미완료: 없음. 공지(`NOTICES`·I18N 키)는 미반영(4절 초안).

## 8. 설계 결정·문서

- 결정 32 move-toggle 신설: `DECISIONS.md` 전문, `AGENTS.md` 요약.
- `CODE_MAP.md`: 기능별 색인에 "기술 온오프" 행, 입력 처리 순서에 온오프 설명, 테스트 목록에 `moves`.
- `log/2026-10.md`: 2026-10-08 한 줄.

## 9. 합류 후 브라우저 확인

1. 설정 → 기술 켜기·끄기에서 기원권을 끄고 자유 연습에서 ↘+RP → 초풍 실패(MISS) 카드.
2. 초풍을 끄면 무족초 버튼이 흐려지고 꺼진 모양. 이때 ↘+RP는 기원권이 나오고 코치에 "초풍을 노렸다면…" 문장이 없다.
3. 통발을 끄고 f,N,f+RP → 통발이 아니라 초풍 실패.
4. 초풍을 끈 채 초풍 20회 모드로 가면 초풍이 정상 판정되고, 모드 설명의 꺼 둔 기술 목록에 초풍이 없다.
5. 새로고침 후에도 설정이 유지된다.
