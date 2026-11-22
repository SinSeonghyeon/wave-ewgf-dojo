# 인수인계: SinSeonghyeon/workspace00 — 카즈야 기원권 게임 녹화 레퍼런스

## 1. 브랜치·기준·목적

- 브랜치: `SinSeonghyeon/workspace00`. 기준 커밋: `b0b11fb`(= 2026-11-23 `origin/main` 머리). 이 문서와 같은 커밋에 들어가는 작업 트리 전체가 인수인계 대상이다.
- 목적: 사용자 요청 2026-11-19 "브라이언처럼 카즈야도 모션 누끼 따서 넣어 주면 좋겠대 … 공격 캐릭터와 피격 캐릭터 모두", 2026-11-20 재생 규칙·누끼·화질 조정, 2026-11-22 로컬 변경 리뷰 수정.
  - 기원권을 쓰면 실제 게임의 기원권 카운터 히트 녹화(공격 카즈야 + 피격 상대, 132프레임)를 SD 인형 뒤쪽에 1게임 프레임 = 1칸으로 재생.
  - 브라이언 전용 도발 스프라이트 코드를 `CHARS[id].refs` + `drawRefSprite` 공용 구조로 바꿈.

## 2. 합류 순서·의존

- 의존 브랜치 없음. `main`(`b0b11fb`) 위에 바로 얹힌다.
- 새 설계 결정 번호 없음(결정 3·30 본문만 보강).
- **`sprites/kazuya-giwon.webp`(1.10MB)를 코드와 같은 커밋에 넣는다.** 빠지면 `build-site`(Pages 배포)와 스모크의 `stageAssets`가 멈추고, `chars` 단위 테스트가 실패한다.

## 3. 사용자에게 보이는 변경 (공지 필요: 예 — 권장, 통합 담당자가 사용자에게 확인)

- 카즈야로 기원권(↘+RP)을 쓰면 캐릭터 뒤쪽(더미 반대쪽)에 실제 게임 녹화가 누른 프레임부터 1칸씩 나온다. 처음 5프레임은 어둠에서 떠오르고, 끝나면 종이 타듯 사라진다.
- 명중·헛침 모두, 모든 모드에서 나온다. 기원초·걷기·모드 변경 같은 다른 입력에 끊기지 않고 132칸을 끝까지 돈다. 기원권을 다시 쓰면 그 자리에서 첫 칸부터 바로 다시 나온다. 캐릭터 변경만 끊는다.
- 연출 끄기·동작 줄이기에서도 나온다(나타나고 사라지는 효과만 페이드).
- 좁은 화면에서는 칸이 무대 밖으로 나가지 않게 줄어들되, 인형 앞 간격은 유지해 녹화된 상대가 인형을 덮지 않는다. 브라이언 도발 레퍼런스도 같은 규칙을 받는다(전에는 좁은 화면에서 잘릴 수 있었음).
- 다시보기 창은 런의 캐릭터 시트를 받는다.
- 부작용: 기본 캐릭터가 카즈야라 새 방문자는 첫 입력 뒤 시트 1.1MB를 한 번 받는다(브라우저 캐시, 기기당 1회).

## 4. 공지 초안 (코드에는 아직 넣지 않음)

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 카즈야 기원권 실제 동작 | 기원권을 쓰면 실제 게임의 기원권 카운터 히트 동작이 캐릭터 옆에 프레임 단위로 함께 나옵니다. | 1. 기원권(↘+RP)을 쓰면 실제 게임 녹화(공격 카즈야 + 피격 상대, 132프레임)가 누른 프레임부터 1프레임씩 재생<br>2. 헛쳐도 나오고 다른 입력에 끊기지 않으며, 기원권을 다시 쓰면 처음부터 |
| en | Kazuya's d/f+2, as in the game | Using d/f+2 now plays the real in-game counter hit beside your character, frame by frame. | 1. d/f+2 plays a recording from the game (Kazuya and the opponent he hits, 132 frames) from the frame you pressed, one game frame at a time<br>2. It plays on a whiff too, keeps going through other input, and restarts when you use d/f+2 again |
| ja | 一八の3+2、実際の動き | 3+2を出すと、実際のゲームのカウンターヒットの動きがキャラクターの横にフレーム単位で流れます。 | 1. 3+2で実際のゲームの録画（攻撃側の一八と被弾側、132フレーム）が押したフレームから1フレームずつ再生<br>2. 空振りでも再生され、他の入力では途切れず、もう一度3+2を出すと最初から |

- 넣는다면 `src/js/02-notices.js` `NOTICES` 맨 위 + `src/i18n/{ko,en,ja}.js` 같은 키(결정 7·20). `smoke-locales`가 공지 개수·맨 위 항목 수를 기대하므로 함께 고친다.

## 5. 배포 전후 사람이 할 일

- 워커·D1·비밀값 변경 없음. 사이트 푸시만.

## 6. 충돌 가능성이 큰 파일·심볼과 반드시 보존할 동작

- `src/js/35-dojo3d.js`: `drawTauntSprite`·`tauntSprite`·`TAUNT_SPRITE_*`·`taunt*` 헬퍼를 모두 `drawRefSprite`·`refSprite`·`REF_*`·`ref*`로 바꿈. 다른 브랜치가 옛 이름을 쓰면 새 이름으로 옮긴다.
- `src/js/02-chars.js`: 브라이언 `tj.sprite` → `refs.taunt`(`tj`는 `{move:'tju'}`만), 카즈야 `refs.giwon` 추가. `CHARS` 줄을 고친 브랜치와 겹치면 두 변경을 모두 살린다.
- 한 줄 훅(겹치면 양쪽 유지): `05-sound` `unlockAudio`의 `refPreload()`(REPLAY 반환 뒤), `07-input` `resetInput`의 `refStop()`, `16-strikes` `strike`의 `refPlay('giwon', giwonLink.t0)`, `20-trials` `setChar`의 `refPreload()`, `31-stage` `fx.taunt`의 `refPlay('taunt', t0)`, `35-replay` `replayLoad`의 `refPreload()`.
- 보존할 동작:
  - 기원권 시트(`keep`)는 걷기·기원초·`resetInput`에 끊기지 않고 132칸 뒤·캐릭터 변경에만 끝, 다음 기원권은 `cut`으로 첫 칸부터.
  - 도발 시트(`keep` 없음)는 후속기·캔슬(`tjCut`)·걷기·`resetInput`에 끝.
  - 1칸 = `giwonLink.t0`(버퍼된 기원권은 해제 칸), 칸 = 누른 칸부터 센 60Hz 칸(`refFrame`).
  - 판정·통계·저장·다시보기 결과에 닿지 않음(결정 9).

## 7. 테스트

- 단위 `node --test "tests/*.test.cjs"`: 356/356 통과. 추가: `chars`(모든 `refs` 시트 파일 존재·WebP 크기 = 칸×열), `giwon`(재생·재시작·끊김 규칙, 도발 끊김 규칙), `replay`(다시보기 창은 런의 캐릭터 시트만 받음).
- 브라우저 스모크: `smoke-chrome`·`smoke-giwon`·`smoke-tju`·`smoke-replay` 모두 exit 0, 오류 없음.
- 1회성 확인(`.sandbox/giwon-ref/check.js`, 커밋 안 함): 1366px·390px에서 두 시트가 첫 입력 뒤 불러와져 그려짐, 390px에서 칸 0.84 → 0.64배·먼 끝 = `REF_EDGE` 6px.
- 돌리지 않음: `smoke-locales`·`smoke-design`·`smoke-backdash`·`smoke-bindings`·`smoke-jfsr`·`smoke-mist`·`smoke-sound`·`smoke-wsc`(이 변경이 닿지 않는 영역).
- 알려진 미완: 카운터 줌(약 15~30f) 동안 좁은 화면에서 칸 끝이 무대 밖으로 조금 나갈 수 있음(줌을 칸 크기 계산에 넣지 않음).

## 8. 바뀐 설계 결정과 문서

- 결정 3(no-official-ip): "게임 녹화 레퍼런스" 예외 추가(`DECISIONS.md` 전문 + `AGENTS.md` 요약). 공식 3D 모델 화면이라 초상과 같은 IP 위험. 권리자 요청 시 `CHARS[id].refs`와 파일을 지우면 연출만 사라진다.
- 결정 30(giwon): 연출 절에 녹화 재생 규칙(2026-11-19·11-20), 연출 끄기에서도 나옴.
- 문서: `CODE_MAP.md`(파일 지도·기능 색인·"게임 녹화 레퍼런스" 절), `GIWONCHO.md` 13절(녹화·프레임 맞춤·누끼·시트 방법), `PLAN.md`(사용자 확인 항목, `GIWON` 실측 메모), `log/2026-11.md`.
- 시트 제작 도구·녹화본은 `.sandbox/giwon-sprite/`·`.sandbox/giwon-video/`(이 워크트리에만, 커밋 안 함, 약 2.5GB). 줌 컷 제거처럼 시트를 다시 만들 일이 있으면 필요하니 워크트리를 지우기 전에 사용자가 보관할지 정한다.

## 9. 합류 후 브라우저 확인

1. 카즈야로 더미에서 떨어져 기원권 한 번: 캐릭터 뒤쪽에 녹화(공격 + 배를 잡고 쓰러지는 상대)가 나와 끝까지 돈다. 더미에 맞혀도 같다.
2. 재생 중 걷기·기원초·모드 변경: 계속 돈다. 기원권 다시: 그 자리에서 첫 칸부터 바로.
3. 2P로 바꿔 같은 확인(녹화가 좌우 반전, 오른쪽에 나옴).
4. 브라이언 도발(L): 녹화가 나오고, 후속기·걷기에 바로 타서 사라진다.
5. 휴대폰 폭(약 390px): 칸이 무대 안에 들어오고 인형을 덮지 않는다. 1P에서 녹화 공격 캐릭터가 입력 기록 패널 아래로 들어가는 것은 PLAN의 사용자 확인 항목.
6. 배포 뒤: 브라이언을 고른 상태에서 카즈야 순위 ▶ 다시보기 → 기원권 녹화가 나온다.
7. PLAN 사용자 확인: 카운터 줌 컷(15~30f) 유지 여부, 브라이언 도발도 기원권처럼 끊기지 않게 할지.
