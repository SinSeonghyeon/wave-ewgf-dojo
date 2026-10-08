# CODE_MAP — 앱 코드 지도

먼저 **파일 지도**와 **기능별 색인**으로 고칠 파일을 고른 뒤 그 파일만 읽는다. 아래 "서브시스템 상세"부터는 필요한 절만 `rg`로 찾아 읽는다.

## 소스·빌드 한눈에

- 원본은 `src/`이고 저장소 루트에 `index.html`은 없다(2026-09-30, 결정 4). `tools/assemble.js`가 `src/app.html`의 `@@include <file>` 줄을 파일 내용으로 바꿔 **한 페이지**를 만든다. JS는 모두 IIFE 하나(`(() => { 'use strict'; … })();`) 안에 이어 붙으므로 파일끼리 최상위 이름을 그대로 공유한다. **include 순서가 실행 순서**다: 최상위에서 바로 실행되는 코드는 앞 파일의 `const`만 쓸 수 있다(함수 선언은 호이스팅되지만 함수 안에서 읽는 `const`는 그 함수가 **호출되는** 시점에 초기화돼 있어야 한다).
- 새 JS 파일을 만들면 `src/app.html`에 include 줄을 넣고 이 파일 지도에 한 줄을 더한다(`tests/docs.test.cjs`가 빠진 파일을 잡는다). 파일 하나는 단독으로 파싱되는 문장들이어야 한다(문장 중간에서 자르지 않는다).
- `src/assets/room-atlas.webp`는 `@@DATA_URI:assets/room-atlas.webp@@` 자리에 data URI로 들어간다. 배포 결과는 여전히 file://에서도 텍스처가 오염되지 않는 인라인 이미지다.
- `node tools/build-site.js` → `_site/`(루트 + `ko/`·`en/`·`ja/` 언어별 앱 + 공개 자원 + `bgm/playlist.json`). 로컬 미리보기는 루트 `preview.cmd` 더블클릭(= 빌드 후 `tools/serve.js --open`, `--no-open`은 빌드만). `file://`로 `_site/index.html`을 직접 열면 가이드 같은 폴더 링크(/ko/guide/)가 브라우저 폴더 목록으로 열리므로 서버로 띄운다. 로컬 주소는 워커 `ALLOWED_ORIGINS` 밖이라 순위·한마디는 불러오지 못한다. `_site/`는 커밋하지 않는다.
- Pages 배포: `.github/workflows/pages.yml`(main 푸시) = 단위 테스트(`SKIP_DOC_CHECKS=1`로 문서 검사만 건너뜀) → `build-site` → artifact. 문서 검사와 브라우저 스모크는 `.github/workflows/smoke.yml`(배포를 막지 않는 별도 워크플로, CI에서는 `tools/cdp.js`가 SwiftShader로 WebGL을 켠다).
- 효과음은 `sfx/<이름>.mp3`. 2026-09-30 이동 전 주소로 열린 탭을 위해 빌드가 `_site/sfx-<이름>.mp3` 사본도 만든다(`tools/build-site.js`, 2026-10-31 이후 제거).
- 언어별 페이지 규칙(canonical·hreflang·`PAGE_LANG`·`ASSET_ROOT`)은 [LOCALIZED_PAGES.md](LOCALIZED_PAGES.md)와 아래 "언어별 페이지" 절.
- 시간 기준 `FRAME = 1000/60`. 키보드는 `event.timeStamp`, 패드는 `gamepad.timestamp`(0/NaN/과거값이면 폴링 시각, `padLastT`로 단조 유지).

## 파일 지도

| 파일 | 내용 |
|---|---|
| `src/app.html` | `<head>`(SEO·OG·JSON-LD·AdSense·폰트), 정적 마크업(모든 대화상자 포함), include 순서 |
| `src/style.css` | 스타일 전부. 색 토큰은 `:root`에만(결정 5) |
| `src/i18n/ko.js` · `en.js` · `ja.js` | `I18N_KO/EN/JA` 사전. 세 파일은 같은 키(테스트가 검사). 공지 문구 `notice.*`도 여기 |
| `src/js/00-core.js` | `FRAME`, `$`, `clamp`, 판정·연출 공용 상수, 백대시 실측 모델 `BD`·`bdDist`·`bdBestH`, 가정값 `GIWON`·`GIWON_ZOOM` |
| `src/js/01-wardrobe-items.js` | 옷장 슬롯·아이템(그리기 훅), 업적 정의, `TRIAL_MODES` |
| `src/js/02-notices.js` | `NOTICES`(최신순 공지 데이터) |
| `src/js/03-store.js` | `STORE`, `store` 로드·검증·저장, `PAGE_LANG`·`ASSET_ROOT` |
| `src/js/04-i18n.js` | `LOCALE`, `I18N` 결합, `T()`·`msg()`·`displayFont()` |
| `src/js/05-sound.js` | `SND`·`BGM_TRACKS`·`BGM_GAIN`(도구가 생성), 효과음 풀, BGM 셔플·Web Lock, 합성 차임·팡파르 |
| `src/js/06-state.js` | `session`, `cd`(크라우치 대시 상태), `bd`(백대시 상태), `tapDetect`, `ui` 재렌더 보관 |
| `src/js/07-input.js` | 키보드·게임패드 입력, 키 바인딩·패드 리맵 UI, `recomputeDir` |
| `src/js/08-touch.js` | 터치 오버레이 |
| `src/js/09-history.js` | 입력 기록(씬뷰 왼쪽 세로 목록) |
| `src/js/10-wsc.js` | 웨캔기어 인식·A/B·10회 도전 |
| `src/js/11-crouch-dash.js` | `onDir` 진입점, 무족초(`mistDir`/`mistButton`), `commandDir` 상태 머신 |
| `src/js/12-backdash.js` | 독립 백대시 머신 `bdDir`·bd10 |
| `src/js/12-bd-practice.js` | bd10 프레임 타임라인·세트 평가 패널(`bdp`) |
| `src/js/13-button.js` | `onButton` 진입점, `commandButton`(초풍·나락·통발·기원권 분기), `resolvePending` |
| `src/js/14-giwon.js` | 기원권 판정·경직·버퍼, 기원초 링크 판정 |
| `src/js/15-giwon-practice.js` | 기원초 연습 모드: 타임라인·통계·10회 도전 |
| `src/js/16-strikes.js` | `strike()`(통발·나락·기원권), `classify()`(초풍 슬롯 판정), `attempt()`(초풍 계열 기록·연출 분기) |
| `src/js/17-coach.js` | 코치·경향 문구 |
| `src/js/18-hud.js` | 결과 카드·통계·HUD·로그 |
| `src/js/19-tick.js` | `tick(now)`: 상태 타임아웃·체인 종료 |
| `src/js/20-trials.js` | `MODES`·`CHALLENGES`·`BOARDS`, 모드 전환, 측정 모드(시작·카운트다운·종료), 기록 텍스트 |
| `src/js/21-charts.js` | 히스토그램·웨이브 차트(SVG 문자열) |
| `src/js/22-share-model.js` | 공유 카드 순수 모델 `buildCard`·`buildOgCard` |
| `src/js/23-settings-ui.js` | 설정 대화상자 |
| `src/js/24-share-dialog.js` | 공유 카드 대화상자·복사·다운로드 |
| `src/js/25-notices-ui.js` | 공지 대화상자·NEW 배지·자동 열기 |
| `src/js/26-backend-config.js` | `BOARD_URL`(비우면 백엔드 UI 전체 숨김) |
| `src/js/27-donate.js` | 후원 대화상자·결과창 안내·헤더 말풍선 |
| `src/js/28-rewards.js` | 업적 카운터·보상 상자·잭팟 연출·옷장 대화상자 |
| `src/js/29-backend.js` | 도전 완주 처리, 순위(등록·삭제·경합 방지), 닉네임, 방문자, 한마디·답글·투표 |
| `src/js/30-language.js` | `applyStatic`·`renderAll`·`setLang` |
| `src/js/31-stage.js` | 스테이지 캔버스, 카메라 줌, 캐릭터 이동·팝, 더미 명중·반응 |
| `src/js/32-rush.js` | 더미 격파 30초 |
| `src/js/33-fighter.js` | SD 캐릭터·더미 그리기, 포즈 |
| `src/js/34-share-draw.js` | 공유 카드 캔버스 그리기(`drawCard`) |
| `src/js/35-dojo3d.js` | WebGL 3D 도장·Canvas 대체, `frame()` 렌더 루프 |
| `src/js/36-boot.js` | 부트 순서 |
| `src/assets/room-atlas.webp` | 목재/회벽 재질 아틀라스(자체 생성) |
| `src/pages/ko.js` · `en.js` · `ja.js` | 가이드·개인정보처리방침 원고(CommonJS, 앱에 포함되지 않음). 세 파일은 같은 slug 순서와 `ui` 키. 본문 링크 `href="@<slug>"`는 같은 언어 페이지, `@`만 쓰면 연습 화면 |
| `src/pages/page.css` | 가이드·개인정보 페이지 스타일. 색 토큰은 빌드가 `src/style.css`의 `:root`를 복사해 붙인다 |

테스트·도구:

| 파일 | 내용 |
|---|---|
| `tests/helpers/app.cjs` | 단위 테스트 하네스. `boot(saved, fetch, env)`가 조립한 앱을 vm에서 돌리고 **앱의 모든 최상위 이름**을 돌려준다(목록 관리 없음. `let`은 부트 직후 값의 스냅샷, 객체는 살아 있는 참조) |
| `tests/<주제>.test.cjs` | judging · input · modals · i18n-pages · backend · sound · strikes-rush · wardrobe-rewards · backdash · wsc · stage · giwon · giwon-practice · board(워커) · docs(문서 경로·결정 인용·파일 지도 검사) · source(`src/` include·파싱·조립 결과 검사) |
| `tests/smoke-*.js` | 헤드리스 Chrome/Edge 브라우저 검사. 조립한 페이지를 `.sandbox/`나 임시 폴더에 쓰고 `stageAssets()`로 자원을 복사 |
| `tests/fake-d1.js` | node:sqlite 인메모리 가짜 D1 |
| `tools/assemble.js` | `src/` → 한 페이지. `sourceFileContaining()`은 생성 상수를 고치는 도구가 대상 파일을 찾는 데 쓴다 |
| `tools/build-site.js` | Pages 산출물 생성, 언어별 정적 번역, 글 주소·필수 원고·내부 링크 검증(`validateContent`), 가이드·개인정보 페이지(`contentPage`)와 `sitemap.xml` 생성 |
| `tools/cdp.js` | 헤드리스 브라우저 공용 모듈(`launch`·`stageAssets`·`sfxFiles`) |
| `tools/serve.js` | `_site/` 로컬 미리보기 서버(의존성 없음). 폴더 주소 → `index.html`, 쿼리를 보존하는 동일 출처 301, 파일 읽기 실패 처리. `createServer()`는 HTTP 회귀 테스트에서도 사용 |
| `tools/update-bgm.js` · `measure-bgm.js` | `src/js/05-sound.js`의 `BGM_TRACKS`·`BGM_GAIN` 재생성 |
| `tools/make-og.js` | `og.png` 재생성 |
| `tools/board-admin.js` · `admin.cmd` | 순위·한마디 관리자 도구 |

## 기능별 색인

| 기능 | 코드 | 테스트 | 배경 문서 |
|---|---|---|---|
| 웨이브·초풍 판정 | `06-state` `11-crouch-dash` `13-button` `16-strikes` `19-tick` | `judging` | 결정 1·2 |
| 무족초 | `11-crouch-dash`(`mistDir`/`mistButton`) `16-strikes` | `judging` | `MIST_EWGF.md` |
| 통발·나락 | `13-button` `16-strikes` | `strikes-rush` | 결정 12 |
| 기원권·기원초 | `00-core`(`GIWON`) `14-giwon` `15-giwon-practice` `16-strikes` `31-stage` | `giwon` `giwon-practice` `smoke-giwon` | `GIWONCHO.md` |
| 웨캔기어 | `10-wsc` `20-trials`(`CHALLENGES`) | `wsc` `smoke-wsc` | `WSC_PRACTICE.md` |
| 백대시·bd10 | `00-core`(`BD`) `06-state` `12-backdash` `12-bd-practice` `11-crouch-dash`(`backdashMotion`) `31-stage`(`bdEase`) | `backdash` `smoke-backdash` | 결정 17, `BACKDASH.md` |
| 측정 모드·결과 | `20-trials` `18-hud` `21-charts` | `judging` `i18n-pages` | 결정 13·14 |
| 순위·한마디 | `26-backend-config` `29-backend` `worker/` | `backend` `board` `smoke-chrome` | `worker/README.md`, 결정 16·18·19·22~24·26·31 |
| 입력 장치·키 설정 | `07-input` `08-touch` `09-history` | `input` `smoke-bindings` | 결정 11·28·29 |
| 소리 | `05-sound` | `sound` `smoke-sound` | 결정 8 |
| 옷장·업적·보상 | `01-wardrobe-items` `28-rewards` `33-fighter` | `wardrobe-rewards` | 결정 15 |
| 공지·후원 | `02-notices` `25-notices-ui` `27-donate` | `i18n-pages` `modals` | 결정 20·21 |
| 언어·정적 페이지 | `src/i18n/*` `04-i18n` `30-language` `tools/build-site.js` `src/pages/*` | `i18n-pages` `smoke-locales` | `LOCALIZED_PAGES.md`, 결정 4·7 |
| 화면·3D 도장 | `src/style.css` `31-stage` `33-fighter` `35-dojo3d` | `stage` `smoke-design` | 결정 5 |
| 공유 카드·og.png | `22-share-model` `24-share-dialog` `34-share-draw` `tools/make-og.js` | `i18n-pages` | — |

새 모드를 추가할 때: `20-trials`의 `MODES`(측정 모드면 `01-wardrobe-items`의 `TRIAL_MODES`도), 로컬 N회 도전이면 `CHALLENGES` 한 줄(보드·패널 id 접두어·바쁨 검사가 여기서 파생된다), 워커 `BOARDS`, 세 언어 `mode.<id>.*` 문구, `src/app.html`의 모드 탭·순위 탭 버튼.

## 입력 처리 순서 (판정 우선순위)

방향과 버튼은 각각 한 진입점을 지나며, **위에서 먼저 소비한 경로가 이긴다**. 새 기술은 이 표의 어느 줄에 끼우는지부터 정하고, 앞뒤 줄의 기존 테스트가 그대로 통과하는지 본다.

방향 `onDir(dir, t)` (`11-crouch-dash`):

| 순서 | 단계 | 소비하면 |
|---|---|---|
| 1 | `practiceInput`·`trialTick`·`tick`, `heldDir` 갱신, 입력 기록·기원초 타임라인 기록 | — (항상 실행) |
| 2 | 도전 카운트다운 중(`challengeStatus(mode)==='countdown'`) | 끝 |
| 3 | 보류된 기원권 RP(`giwonRP`)가 있으면: 같은 칸 `↘`는 기원권 `strike`, 아니면 보류한 실패를 기록 | 기원권이면 끝 |
| 4 | 기원권 경직 중(`giwonStiff`)이면 시작 6(`f`) 말고는 버린다 | 끝 |
| 5 | 무족초 같은 칸 보류(`mistDir`) | 끝 |
| 6 | `commandDir`: 보류한 `f_before_d` 실패 → `wscDir` → 더블 탭(대시·백대시 연출, `bd` 머신은 `backdashMotion`) → `cd` 상태 머신 `switch` | — |

버튼 `onButton(n, t)` (`13-button`):

| 순서 | 단계 | 소비하면 |
|---|---|---|
| 1 | `practiceInput`·`trialTick`·`tick`, 입력 기록 | — |
| 2 | 기원권 경직 중(`giwonRecovery`): 마지막 `BUFFER_F` 안이면 한 칸 버퍼(덮어쓰기), 그 전이면 버림 | 끝(해제 칸에 `buttonJudge`로 재전달) |
| 3 | 도전 카운트다운 중 | 끝 |
| 4 | 무족초 후보(`mistButton`) | 끝 |
| 5 | 웨캔기어 뒤 입력이 열려 있으면(`wsc.active.back`) `wscButton` | 끝 |
| 6 | `4`: 크라우치 대시 중이면 나락, 상태 3이면 `cd.pending`, 그 외 무시 | 끝 |
| 7 | `2` 외 버튼: 초풍 측정 모드면 잘못된 버튼 코치 | 끝 |
| 8 | `2`: 대시 중·캔슬 창·같은 칸 대각 → 초풍 판정 `classify` | 끝 |
| 9 | `2`: `↘`를 쥐고 있고 다른 경로가 없으면(`giwonReady`) 기원권 | 끝 |
| 10 | `2`: 상태 3이면 `cd.pending`(대각을 기다림), 상태 1·2면 통발(`f,f` 대시 직후) 또는 `early_stage`, 그 외 `no_cd`(기원권 보류 가능) | 끝 |

## 언어별 페이지·배포 세부

루트 `ads.txt`는 Google AdSense 판매자 등록 파일이며 게시자 `pub-8394509799881324`를 사용한다. `tools/build-site.js`가 `_site/ads.txt`로 그대로 복사한다.

원본 앱은 `src/`를 조립한 한 페이지이며 외부 라이브러리는 없다. `tools/build-site.js`가 I18N 사전의 정적 문자열로 최초 HTML을 번역해 `_site/ko/`·`en/`·`ja/`에 앱을 생성한다. 루트는 조립한 페이지 그대로다. 세 언어의 인라인 앱 스크립트는 원본과 동일하며 `data-page-lang`으로 고정 언어를 지정한다. 제목·설명·OG·JSON-LD·본문·접근성 문구를 언어에 맞추고 자원 경로는 루트 공유 자원으로 보정한다. 상대 `#` 링크는 그대로 유지한다.
루트 및 생성 페이지에 기존 승인 AdSense 연결 스크립트를 유지한다.

가이드·개인정보처리방침(2026-10-01, AdSense 심사의 "가치 없는 콘텐츠" 대응): `src/pages/{ko,en,ja}.js`의 원고를 `contentPage`가 `_site/<언어>/<slug>index.html` 정적 글로 만든다. 앱 스크립트는 없고 AdSense 연결 스크립트·JSON-LD(가이드는 Article)·Google Fonts만 쓴다. canonical은 각 주소, hreflang은 같은 slug의 ko/en/ja + x-default=영어. `sitemap.xml`은 루트 파일이 아니라 빌드가 앱 4 URL + 글 전체로 생성한다(`sitemap()`). 앱 푸터·소개 블록의 링크는 `data-page="<slug>"`로 표시하고, 빌드는 언어별 앱에서 그 언어 주소로, `applyStatic`은 현재 언어 주소로 바꾼다. 글을 크게 고치면 `CONTENT_UPDATED`를 올린다. 모드 이름 옆 `?` 버튼(`#dGuide`, 새 탭)은 `MODES[mode].guide`의 글을 연다(`renderMode`). 영상은 글 항목의 `video: {id, title}`(선택 `videoNote`)로 넣으며, 빌드가 메타 줄 아래에 `youtube-nocookie.com/embed/<id>` iframe(lazy)과 YouTube 링크를 그린다. id는 11자 검사. 다른 iframe은 테스트가 막는다.

배포는 `.github/workflows/pages.yml`(main 푸시/수동 실행)의 단위 테스트 → Node 생성 → Pages artifact 게시다. 기존 main/root Jekyll 배포에서 사용자가 Pages Source를 GitHub Actions로 전환해야 한다. `_site/`는 빌드 때 교체하며 커밋하지 않는다. 공개 자원 화이트리스트로 CNAME·robots·이미지·효과음·검색 소유권 파일을 복사하고 BGM MP3/playlist.json을 생성한다.
Worker·DB·도메인은 변경하지 않는다. 절차는 [LOCALIZED_PAGES.md](LOCALIZED_PAGES.md).

언어별 앱의 canonical은 각 주소. 루트·ko/en/ja의 hreflang 4종(ko/en/ja/x-default)은 사이트맵의 앱 4 URL과 동일하다. 루트는 자동 언어 및 저장값 유지, `PAGE_LANG`이 있으면 저장 언어보다 우선하고 `ASSET_ROOT='../'`를 쓴다. 옛 `?lang=`은 루트에서 한 번 적용 후 삭제하며 다른 쿼리와 해시는 유지한다. 언어별 주소에서는 query보다 주소 언어가 우선이다.
`setLang`은 언어별 페이지에서 replaceState로 ../<언어>/ 주소를 바꿔 세션·모달·입력을 유지하고 제목/description/canonical/OG를 갱신한다. 저장소 키는 기존 것 그대로다. 언어 링크는 `/ko/`·`/en/`·`/ja/`의 앱으로 직접 이동한다.

`tests/smoke-locales.js`는 생성 artifact의 JavaScript 없는 초기 본문, 영어 브라우저/저장 언어 충돌, 언어 전환 후 세션 보존·새로고침·공유 저장소·앵커·QR/음악/효과음 경로를 로컬 HTTP에서 검증한다. 백엔드 비활성, 외부 폰트/광고 로딩은 차단한다. 기존 전체 스모크는 별도로 실제 로컬 Worker와 연동한다.

## 서브시스템 상세

이 절의 이름은 함수·상태 이름이다. 어느 파일에 있는지는 위 파일 지도를 본다(`rg "^function 이름" src/js`).

공지 강조(2026-09-30): `NOTICES` 항목의 선택 속성 `highlight{kind,title,summary,items[]}`는 같은 공지 안의 `.notice-highlight`로 렌더링한다. 기존 색 토큰의 금빛 테두리·배경·큰 제목으로 결혼 안내를 강조하며, 문자열·이모지는 I18N을 따른다. 미배포 공지 5건은 `2026-09-30-roundup` 하나로 합쳤고 main의 기존 공지 4건은 유지했다. 공지 정렬·읽음 저장·자동 열기 규칙은 그대로다.
단위 테스트는 각 언어 사전의 원본 키 중복을 검사하고, 언어별 브라우저 검사는 최신 공지만이 아니라 과거 공지와 강조 상자까지 언어 전환 후 확인한다.

```
설정 저장  STORE='wave-ewgf-dojo-v1' · store{v,lang,window,side,fx,touch,touchSize,touchX,touchY,sound,bgm,bgmVol,sfxVol,keys,altKeys,padKeys,padAltKeys,records,nick,noticeSeen,…,life,ach,pendingRewards,fit,donateResultDay,donateNudgeDay,donatePlayDay,donatePlayMs} · 로드 시 타입·허용값 검증 후 기본값으로 대체 · save().
          `keys`는 기존 기본 키, `altKeys`는 동작별 보조 키 1개(빈 문자열=미설정)라 옛 저장값과 호환
소리      SND{wave,ewgf,wsc,hellsweep,tongbal,hit,backdash,giwon,giwonCh} 파일명 · snd{ok(typeof Audio),unlocked,bgm,pool,idx,lock,release} · 부트 때는 아무것도 만들지 않음(테스트 vm·og 생성이 미디어를 안 건드림)
          unlockAudio(): 첫 keydown/pointerdown/패드 버튼에서 1회 → 모든 효과음 풀(이름당 Audio 3개, 라운드로빈) 생성 + bgmSync()
          bgmSync(): sound && bgm && bgmVol>0 && unlocked && !hidden이면 Web Locks(mishima-dojo-bgm) 획득 후 bgm 지연 생성·volume·play(). 같은 브라우저·사이트에서 한 창만 재생. 숨김/끄기/pagehide 시 대기 취소·pause·권한 반환, pageshow/visibilitychange/focus/blur에서 동기화. Web Locks 미지원은 hasFocus 조건으로 대체.
          NotAllowedError만 unlocked=false로 다음 제스처에 재시도(AbortError는 무시)
          sfxSync(): 모든 기존 효과음 보이스에 볼륨 적용, 끄기/0%는 pause·재생 위치 초기화. 설정 진입은 endTrial(true)·resetInput() 후 showModal로 측정·입력 잔여 상태 정리
          playSfx(name): fx.crouchDash → 'wave', fx.ewgf → 'ewgf'. 설정 #soundSel(segSel, 마스터) · #bgmSel/#bgmBtn → setBgm(on)(배경음만 끄기, 켜면 마스터도 켜기) · #bgmVol/#sfxVol range(input → store·save, sfx change → 미리듣기) · renderSound()는 부트·변경 시 슬라이더·두 설정 토글·헤더 효과 상태(sound && bgm)를 동기화
i18n      LANGS, LOCALE, I18N{ko,en,ja} · T(key,...args) · msg(v): 문자열|[key,...args]|클로저 → 텍스트 · displayFont()
          ui{result,coach,trend,seg,padId}: 마지막 표시 내용을 키/클로저로 보관 → setLang → renderAll()
          정적 마크업은 data-i18n / data-i18n-html / data-i18n-aria / data-i18n-title 속성으로 applyStatic()이 채운다
공지      NOTICES(최신순){id,date,kind,title,summary,items[]} · 헤더 #noticeOpen(종 + #noticeBadge NEW) → #noticeDlg · renderNotices()가 모든 텍스트를 I18N 키로, 날짜 전용 값을 UTC 고정 시간대로 렌더링 · openNotices()는 수동 진입이면 진행 중 측정/입력을 정리한 뒤 팝업을 열고 최신 id를 store.noticeSeen에 저장.
          hadStore는 bumpVisitDay가 저장소를 만들기 전 부트 시점에 기존 저장소가 있었는지 기억한다. noticeAutoPending/Schedule/Try는 hadStore && 미열람일 때 0.5초 뒤 자동 표시하되 modal/trial/countdown/openTimer/jackpot 중이면 0.75초마다 재시도하고, 첫 방문은 배지만 둔다. 새 패치는 NOTICES 맨 앞 + notice.<날짜>.* ko/en/ja를 함께 추가한다.
          스모크 기대 ID도 원본 HTML의 NOTICES 첫 항목에서 파생한다. 백엔드 없음
세션      session{dashes,bestChain,bestDps,tries,hits,offsetSum,offsetCount,cycles,attempts,log}
입력      keydown/keyup → held Set → kbVector()(`keys` 기본 키와 `altKeys` 보조 키를 같은 동작으로 합침. 둘을 함께 누른 뒤 하나만 떼도 다른 키가 눌려 있으면 방향 유지) → recomputeDir().
          버튼도 buttonForCode/buttonHeld로 논리 입력을 합쳐 기본·보조 키 중 하나가 이미 눌린 동안 다른 키의 keydown은 onButton을 다시 호출하지 않음 · pollPad() 4ms(판정 시각은 gamepad.timestamp, 실제 방향·버튼 변화에서만 padLastT 갱신) → padDir/padBtn · 터치 오버레이 → touchDir/touchPress (아래 "터치" 줄)
터치      html.touch-ui(applyTouchUI: store.touch 'auto'|'on'|'off', auto = (pointer:coarse) && maxTouchPoints>0, 미디어 쿼리 change에 재적용) → #touch 오버레이(스테이지 하단 46%, 데스크톱은 display:none)
          · #tdirs 독립 버튼 3개(←·↓·→): 포인터별 touchPointers Map → touchKeys(keys,t), ↓+좌/우 동시 입력은 db/df, 좌+우는 N → touchDir → recomputeDir(t,'touch')(kbDir+padDir+touchDir 합) · #tbtns 2×2(1 2 / 3 4, 포인터 별도)
          pointerdown → touchPress(n,t): modalOpen이면 무시, unlockAudio, onButton · resetInput()이 touchDir·포인터·눌림 표시를 지움(touchRelease) · 판정·상태 머신은 손대지 않음 · 시각은 e.timeStamp(키보드와 같은 클록)
          · store.touchSize(70~300%, 기본 100이고 실제 크기는 종전 140%)·touchX/touchY(0~100%, 기본 좌하단 0/0)를 설정 슬라이더로 저장, applyTouchLayout이 기본 100%만 공격 버튼 앞 폭에 맞춰 자동 축소하고 100% 이외의 선택 크기는 그대로 반영; 가로 위치는 공격 버튼과 무관하게 오버레이 안에서, 세로 위치는 노트 아래에서 제한하며 resize에도 재계산(결정 11)
          · 대기 배지는 touchOn이면 src.waitTouch · touch-ui면 frame()의 바닥 gy가 H*0.80 → H*0.46(발과 오버레이 사이 띠에 힌트 2줄이 들어갈 자리), .stage 비율 4/5(max-height 72vh, 가로 모드는 16/9), .hud-hint는 오버레이 바로 위 바닥 띠(bottom:calc(46% + 3px), 가로 모드는 한 줄 말줄임), #touch는 container-type:size ·
          문서 기본 태그(<!doctype html>·<html lang="ko">·charset·viewport)는 2026-09-12 터치 작업 때 추가(그 전엔 쿼크 모드, 폰에서 980px로 렌더)
          dirName(x,y): side 반영해 'f','n','d','df',... · history[]: 씬뷰 왼쪽 고정 세로 입력 기록(최신 위 최대 40개·스크롤 가능). historyRows(now)는 방향의 다음 방향 이벤트까지 유지 시간(버튼 이벤트 제외), 버튼의 직전 이벤트 간격을 60Hz 프레임으로 표시. resetInput은 열린 방향 행의 endT를 닫아 모달·포커스 이탈 시간을 홀드로 누적하지 않는다. frame에서 80ms마다 현재 행을 다시 그림. 판정과 세션 통계는 쓰지 않는다.
상태 머신 onDir(dir,t)  0 idle → 1 시작 6 → (2 중립 생략 가능) → 3 d(2) → 4 d/f(3, completeCD)
          4 → 5 캔슬 6 (cancelCD) → 6 캔슬 후 중립 → 1 시작 6 …
          4 → 7 (3을 뗐는데 6이 아직) → 120ms 안에 6이 오면 캔슬 인정
          tick(now): 각 상태 250ms(4는 450ms) 타임아웃 · 체인은 마지막 3 후 700ms 지나면 endChain()
          fault(kind): f_before_d / n_to_df / cancel_as_start
          대시(연출 전용) taps{dir,t,neutral} · tapDetect(dir,t): f,N,f / b,N,b 가 TAP_MS(250) 안이면 fx.dash()/fx.backdash(). onDir의 switch 앞에서 실행하므로 두 번째 f는 그대로 시작 6
          상태 6(캔슬 후 중립)에서 오는 f(웨이브의 시작 6)도 대시로 잡는다(2026-09-13). cd.dashT=대시 시각, cd.dashWave=(상태 6에서 온 대시). fx.dash(wave)는 wave면 짧게(24px). 통발 자격은 cd.dashT===cd.tF, 대초 라벨은 그중 !cd.dashWave만
백대시     bd{state,t4a,tN,t4b,prev,chain,engaged,lastT,seg,open,card} (2026-09-13, 결정 17) — cd와 독립(방향만 본다, 버튼·cd는 읽지도 쓰지도 않음; bdRec.until은 읽기만). onDir의 switch 앞에서 bdActive()(free이고 측정 아님 · bd10)일 때만 bdDir(dir,t), tick 끝에서 bdTick(now)
          0 idle → 1 첫 4 홀드 → 2 중립 → 3 백대시 중(두 번째 4 홀드, bdOut: 첫 4로부터 TAP_MS 안의 b — tapDetect와 같은 규칙이라 판정된 백대시 = 그려진 백대시) → 4 캔슬 1(↙) 홀드 → 1 … · 3에서 n = 캔슬 없음(bdNoCancel: 거리 BD_FULL을 일단 주고 bd.open={t4b}; 경직 안에 앉기·횡이 오면 onDir의 bdCut(t)이 bdDist(h)로 깎는다, 경직이 끝나면 bdTick이 open을 지워 확정)
          · 2에서 b가 bdRec 안이면 bdFail('stiff') · 3에서 d/u/ub/uf = 횡 캔슬(거리 인정, bdFail('side')), df = 앉기(거리 인정, bdFail('dir')), f = bdFail('dir') · 4에서 n = bdFail('neutral1'), 그 외 방향 = bdFail('dir')
          bd.card{cls,title} = bdOut이 띄운 카드. bdCancel은 ui.result를 들여다보지 않고 이걸 캔슬 문구와 함께 다시 그린다(사이에 다른 카드가 떠도 유지). 체인·bestChain은 첫 백대시(chain 1)도 기록한다
          거리 bdDist(h) = BD.CURVE[min(h,BD_LAST)−1] (실측 S자, 실게임 m. h = 두 번째 4를 잡은 프레임 bdF(ms)=max(1,round(ms/FRAME)), 너무 이른 프레임은 없다 — 짧을 뿐)
          세트 채점은 다음 백대시가 출력될 때 bdOut에서: 손 hand = 1 → 이 출력 프레임, mps = bdMps(prev.dist, prev.h + hand)(각 구간을 반올림한 뒤 합산해 표시 공식과 일치) = D(h)×60÷(h+hand) → BD_TIER_MPS 첫 통과 등급(top/fast/ok = 손 c 7/10/16f로 최적 캔슬한 속도) 아니면 slow(체인 1)
          코치: best = bdBestH(hand)(공식 최적). [early best−1−h, late h−best−1, db 1홀드−2, tap 4N4−4] 중 최대 손실. 1을 누른 순간(bdCancel)은 고정 권장 창 CANCEL_A~B(11~13)로 cancelEarly/cancelLate/cancelOk
          자유 연습은 bd.engaged(첫 1 캔슬에 true, 백대시 없이 3초면 false)일 때만 카드·코치·로그·HUD(hudChainL BACKDASH, cd.chain===0일 때만)를 건드린다.
          bdClear()는 resetInput/setMode/측정 GO/endTrial(모두 updateHud와 짝). session.bd{count,dist,bestChain,top}(테스트가 읽는 관측값, 통계 격자에는 안 나옴).
          bd10 타임라인(12-bd-practice, mode==='bd10'일 때만): bdDir 첫 줄 bdpInput, bdOut의 bdpOut(t,row), bdBreak(t,why)의 bdpBreak, bdClear의 bdpClear, resetSession의 bdpReset(통계·마지막 세트까지). bdp{run{t0,events,h},last{…,end,row|fail},row(마지막 채점 세트 — 연속의 끝은 늘 끊김이라 칸은 이걸 그린다),session}
          축 0..RECOVER_F 칸(0f = 출력, 축을 넘는 캔슬 h는 마지막 칸으로 접는다), 칸 채움 --d = D(min(f,h 또는 stop))/BD_FULL(횡·앉기 및 N 뒤 캔슬도 정지 거리 유지), 클래스 out/win/best(그 세트 손의 bdBestH)/still/cut/hand/next/mark, 위 줄 구간 이름(이동·최적 캔슬·감속·정지), 아래 줄 손 입력 띠 span(1 홀드 h→다시 4, 4N4 4→다음 출력; 목표 BD.DB_F·TAP_F 대비 ok/no). 패널 칸 6개: 캔슬 타이밍·손 합계·1 홀드·4N4·거리·속도. bdpView가 표시 세트를 선택하며 현재 위치는 그 세트가 run일 때만 표시. bdpStop(t0,t)은 정지한 세트를 출력 시각으로 찾아 갱신. renderBdpLive는 tick에서. body.bd10-mode, #bdpTimeline·#bdpPanel
          bd10 기록은 bdv:BD_REC_V(2). 그 전 기록(1.0 m/백대시 척도)은 저장소에 남기되 trialRecs()가 최고 기록·개인 최고 판정에서 뺀다
          bd10 측정은 trial.dist/bdCount/bdTop/bestChain → renderBdHud(#hudScore "n.n m") · 구간 막대: bd.seg{tap,n,hold,db} → renderSeg(bd 변형, seg.namesBd 4·N·4홀드·1, 5번째 칸 접힘, 제목 #segTitle)
경직      bdRec{until} — 모든 모드의 스테이지 기능(판정 아님): onDir에서 b,N,b가 나가면 until = t + RECOVER_F(판정이 그 백대시를 본 뒤 설정), 그 안의 b,N,b는 fx.backdash 없음, d/db/df/u/ub/uf가 until을 지우고 anim이 backdash면 이동 정지 + bdCrouch. frame()은 until 전엔 뒤 걷기만 막고, poseAt backdash는 BD_LAST 프레임 뒤에도 until까지 자세 유지(sweat). 연출 이동은 fx.backdash → moveChar(−BD.PX, BD_LAST×FRAME, bdEase): 판정과 같은 CURVE를 프레임 사이 선형 보간(anim.moveEase, 없으면 ease-out cubic)
초풍 판정 onButton(n,t): n===4 → 나락(strike), n===2 → 초풍 판정, 그 외 → wrongBtn 코치
          초풍: classify(off,t) → attempt(kind,off,t). frameSlot(t)=floor(t/FRAME+0.5), 대각과 RP의 슬롯 차이 0→ewgf / 양수→wgf / 음수→early. 원시 off는 보존, a.frameOff를 히스토그램에 사용(간격 반올림과 다름).
          상태 3(d 유지)에서 버튼이 먼저 오면 cd.pending={t,btn}, 3이 오면 음수 오프셋으로 판정, 120ms 안에 3이 없으면 no_df(btn 2만)
          attempt 종류: ewgf / combo_short(웨이브 초풍 모드에서 웨이브 3회 미만) / wgf / early / no_df / early_stage / no_cd
          attempt 레코드 {t,kind,off,chain,mode,streak,dash}: streak = combo{n,t}(연속 초풍. ewgf가 아니면 0, 마지막 초풍 후 3초 지나면 다시 1부터, resetInput/setMode/측정 GO/fault에서 0)
          dash = 대초(res 'dash_ewgf', 제목 a.dashEwgf.title, r-kind 'DASH ELECTRIC WIND GOD FIST'). 판정·통계·차트·순위는 kind만 보므로 영향 없음
통발·나락 strike(kind,t) kind: tongbal(f,f+2 중단)/hellsweep(6N23+4 하단, 저스트 없음)/hellsweepEarly(4가 3보다 이름)/giwon(↘+RP 중단, 저스트 없음 — 결정 30). 끝에 endCommand()(rush30이면 clearCommand 대신 chain 유지, 그 외엔 clearCommand). attempt가 아니라 session.tries/hits·히스토그램·combo에 안 잡힘.
          통발=상태 1/2 + cd.dashT===cd.tF + 2가 두 번째 6 후 FF_MS(250) 안. 나락=상태 4/7 또는 캔슬 6 후 250ms의 4, 상태 3은 cd.pending.btn=4로 df 대기(resolvePending: btn 4는 off≥−window면 hellsweep, 이르면 hellsweepEarly, df 안 오면 조용). rushStrike로 더미 격파 점수. 저스트가 아니라 라벨에 "!"·연속 없음
코치      setCoach(m) · setTrend(m) · coachWaveLive(cyc): 5구간 중 가장 긴 구간 조언 · coachTrend(): 최근 10회 평균·편차
기록      addLog(t,typeKey,resMsg,num,memoMsg,cls) → session.log[12] · renderLog() 시각은 LOCALE[store.lang]
          store.records[mode][30]: wave10 {score(dps),dashes,chain} · ewgf20/combo10 {score(%),hits,target,mean} · rush30 {score(점수),kills,whiffs,dashPts} · bd10 {score(m),dashes,top,chain}
          label/sub 문자열도 같이 저장(구버전 호환). recText()가 숫자 필드 우선으로 현재 언어로 다시 만든다
차트      histBins(attempts,window): −6f~+9f 빈(순수) · renderHist(): 히스토그램, 판정 폭 음영 · renderWave(): 최근 40 사이클 대시/초 · SVG 문자열 직접 생성
공유 카드 buildCard(src): 순수 데이터 → {app,modeName,sub,hero,metrics[],chart{hist|wave|null},windowText,dateText,url,tweet,file} (DOM 없음, 단위 테스트 대상)
          drawCard(g,model): 1200×630 캔버스 그리기. 색은 cssVar()로 :root 토큰을 읽어 스타일별 팔레트 P(기본=다크 앱 테마, model.style==='wood'=도장 나무 간판)로 묶고, 레이아웃 코드는 P만 참조. 폰트는 displayFont()/--body/--mono, drawFighter+drawBolt 재사용
          drawWood(널빤지 배경, 시드 LCG로 재현 가능)·drawPlaque(현판/목패)는 wood 스타일 전용 헬퍼. 나무·종이 색 토큰(--wood, --board, --cream*, --paper*)은 :root에 정의
          shareSource(): 측정 모드는 trial.result{rec,attempts,cycles,window}(endTrial이 당시 판정 폭과 웨이브 포함 시도 목록을 채움, startTrial/setMode/resetSession이 비움), 자유 연습은 live session
          openShare → renderShare(document.fonts.load 후 그리기) → #shareDlg.showModal() · 같은 결과의 중복 열기(자동+클릭/더블클릭)는 이미 획득한 당일 후원 안내 표시를 유지 · 복사(ClipboardItem, 실패 시 share.copyFail) · PNG 저장(a[download]) · X intent(텍스트만)
          renderAll()이 다이얼로그가 열려 있으면 현재 언어로 다시 그림. 버튼 #dShare 라벨은 renderMode()에서 share.card/share.session
OG 카드   buildOgCard(): og.png용 소개 모델(style:'wood', hero:null, tagline[2], keywords, note=app.tagline, chips[{cmd,tag}](og.chipWave/og.chipEwgf), modeName은 chips에서 파생, 예시 히스토그램은 WINDOW_DEFAULT 기준). drawCard는 model.tagline이 있으면 hero·지표 타일 대신 태그라인+칩을 그림
          앱 안에서는 호출하지 않음. tools/make-og.js가 조립한 페이지 사본의 IIFE 끝에 globalThis.__og 훅을 붙여 헤드리스 Chrome에서 그린 뒤 루트 og.png로 저장. 공유 카드는 기본 스타일 그대로(나무 스타일로 바꾸려면 buildCard 반환값에 style:'wood' 한 줄)
          문서 제목은 applyStatic()에서 T('app.docTitle')(검색용, 앱 이름과 분리). 검색·OG 설명은 T('app.description')로 언어 전환 시 함께 갱신. 루트 정적 meta/JSON-LD 설명은 한국어, /en/·/ja/ 정적 설명은 해당 언어로 제공. <head>의 정적 title/og:title은 크롤러용으로 HTML에 직접 둠. 사이트 아이콘은 루트 favicon.png(파란 주먹·노란 좌우 번개, 1254×1254 PNG)를 루트/en/ja 세 페이지에서 함께 사용
후원      DONATE{kakao{url,qr},kofi{url}} · donateOptions(lang): ko는 ['kakao','kofi'], 그 외 ['kofi','kakao'](순수, 테스트) · 버튼 3개(#donateTop 헤더, #donateShareBtn 결과 창 #shareDlg 안 — 캔버스 밖이라 공유 이미지에는 안 나옴, #donateBtn 푸터) 모두 openDonate() → #donateDlg(modalOpen에 포함).
          endTrial이 이전 store.records보다 score가 높거나 첫 기록이면 trial.result.personalBest. openShare → takeResultDonate가 KST 하루 첫 개인 최고에만 #donateShare를 표시(구체적 소액·운영/개발 용도 + 작은 밥 농담).
          practiceInput(onDir/onButton)이 마지막 실제 입력 시각을 찍고 1초 practiceTick이 보이는 페이지·모달 밖·마지막 입력 30초 이내 시간만 store.donatePlayMs에 더한다(30초마다 saveSoon, pagehide에서 미저장 구간도 즉시 save, KST 날짜가 바뀌면 0).
          10분이면 donateNudgeMaybe가 측정/카운트다운/openTimer/modal/jackpotHold·Busy가 끝난 뒤 #donateTop을 8초 금빛 강조하고 #donateBubble을 KST 하루 1회 표시. 표시 8초 중 차단 상태가 시작되면 즉시 숨기고 당일 소모를 되돌려 종료 후 재표시. reduced 또는 store.fx=0이면 정적. 판정/세션 통계/워커와 독립.
          openDonate()는 창을 열기 전에 endTrial(true)·resetInput()으로 카운트다운/측정을 취소하고 남은 입력을 지운다(0점 저장·자동 순위 등록·결과 창 중첩 방지).
          #donateDlg 뷰 2개: #donateChoose(제목·안내·#donateOptions에 renderDonate()가 순서대로 그린 선택지·닫기) / #donateKakao(QR #donateQr + 휴대폰용 직접 링크 #donateOpen + 뒤로 #donateBack). 카카오페이 선택은 뷰 전환(링크가 휴대폰 전용이라), Ko-fi 선택은 새 탭 링크 후 닫힘. 두 뷰 공통 하단에 문의 메일 링크(.donate-contact, footer.contact 번역 재사용). 문자열 donate.*
          donate-kakao.png는 DONATE.kakao.url을 담은 QR(제작 시 1회 생성한 정적 파일). 주소가 바뀌면 다시 만든다(스모크 테스트가 스크래치 페이지 옆에 복사)
출처 잠금 워커는 env.ALLOWED_ORIGINS(기본 https://mishimaryu.com, www, https://sinseonghyeon.github.io)에 있는 Origin에만 CORS 허용 헤더를 돌려주고 POST는 403 origin. 앱 쪽 코드 변경 없음. 도메인 연결 시 wrangler.toml [vars]에 추가 후 재배포
백엔드    BOARD_URL(Worker 주소, 빈 문자열이면 backendInit()이 #boardCard·#postsCard를 숨기고 모든 fetch를 건너뜀) · board{tab,data[board]={season,board,total,rows,me,cut10},msg,seq,deleting,submitting,loadAfterDelete,submitQueue}(seq: 가장 최근 boardLoad만 msg/data를 건드림, 나머지 플래그: 점수 등록·삭제 직렬화와 삭제 뒤 예약 작업)
          · live{visits,posts,postsMsg,postsLoading,posting,voting,replying,postsSeq,replyTo,replyText,visitsBusy,nickBusy,nickMsg,nickLater,nickLost} · BOARDS = MODES 중 start 모드 목록(순위 탭·renderBests 순서) · nickOk/NICK_BAD/cleanNick/nickKey/hasNick()(워커와 같은 규칙.
          NICK_BAD는 유니코드 속성 클래스: 제어·서식(제로폭/양방향)·사용자 영역·미할당·행 구분자 + 한글 채움 문자·이체자 선택자. 워커 BAD_CHARS와 반드시 같게) · pctTop(rank,total)=상위 % (ceil, 최소 1) · tierOf(rank,total)=등급 0~5 = SS/S/A/B/C/D(TIERS=[1,10,20,50,70] 상위 % 상한.
          참가 10명 미만이면 10명으로 계산해 혼자 1위는 S) · 배너 제목 tier.N.title(세 언어 공통 문자), 코멘트 tier.N.<mode>(측정 모드별, renderShareRank가 전역 mode로 고름) · WAVE_TOP_DEFAULT=5 · boardSet(t,d)=data[t] 기록 · waveTop()=board.data.wave10.cut10(유한한 양수일 때만, 없으면 null.
          최초·수동 순위 조회와 등록·삭제 응답에서 갱신한 값을 만료 없이 유지, 결정 19·24) · waveTopText(cut)=wave.top(v)/wave.topFixed · waveYMax(top)=max(8,ceil(top)+1) · waveGrid(yMax)=2 간격 눈금 · modalOpen(): #nickDlg/#shareDlg/#setDlg/#donateDlg/#fitDlg/#noticeDlg 중 하나가 열려 있으면 키보드·패드 입력 무시(패드 폴링 주기로 불리므로 DOM 검색 없음)
          닉네임 게이트: store.nick + store.nickToken(48 hex; 닉 없는 토큰은 로더가 버림). backendInit()에서 hasNick()이 아니면 #nickDlg를 showModal → claimNick(POST /nick) 성공 시 nick·token 저장 후 boardLoad + boardSubmit(닉 없이 끝난 측정 결과가 있으면 그때 등록). 토큰 없는 옛 닉네임은 그대로 자동 claim.
          cancel 이벤트를 막아 Escape를 거부하지만 브라우저는 사용자 활성화가 없으면 무시하므로 게이트는 닫힐 수 있다 → close 이벤트에서 renderNick/renderTrialRank로 상태를 맞추고, 헤더 #nickBtn은 항상 보이며 닉 없으면 nick.set("닉네임 정하기"), 있으면 nick.change. 측정 모드 바 #dRank는 닉 없이 끝난 결과에 nick.needed를 표시.
          claim이 서버 쪽 이유(taken·nick 외: 네트워크·5xx·429)로 실패하면 live.nickLater로 #nickLater("나중에 · 순위 없이 연습") 버튼이 나타나 게이트를 닫을 수 있다(서버가 죽어도 연습은 가능). openNick()은 진행 중인 측정 모드(running/cdTimer)을 endTrial(true)로 취소한다(모달은 입력만 멈추고 시계는 멈추지 않으므로).
          서버가 403 auth를 주면 lostNick()이 비우고, 결과 창이 열려 있거나 열리는 중(trial.openTimer)이면 live.nickLost만 켜 두었다가 #shareDlg close 때 게이트를 연다(모달 겹침 방지). 폼에서 내 닉의 대소문자/전각만 바꾼 경우(nickKey 동일)는 claim 없이 닫는다(서버는 409를 줄 것이므로). 한마디 폼은 #postNickLabel로 표시만
          boardFetch(path, init): fetch + JSON, 실패는 Error(message=서버 error 코드 또는 'http N'). AbortSignal.timeout(10초)로 멈춘 요청이 busy 플래그(게이트·등록·게시)를 영원히 붙들지 않게 한다
          backendInit(): boardLoad·postsLoad·visitsLoad + 60초 setInterval(열린 탭에서 KST 날짜 전환과 미완료 방문 집계만 확인). 순위·한마디는 주기 조회하지 않는다(결정 24)
          boardEntry(trial.result, mode): 순수. 측정 결과 → {board,win,lang,score,tie,detail}. wave10 score=대시/초·tie=최고 연속·detail{dashes,chain} / ewgf20 score=성공률·tie=−|mean|(−0 방지)·detail{hits,target,mean} / combo10 tie=detail.dps(측정 모드 중 cycles 평균 대시/초). 자유 연습·결과 없음 → null
          boardRowText(board,row): recText 재사용으로 표 셀 문자열(현재 언어)
          순위 등록: endTrial 끝에서 boardSubmit()을 항상 호출(토큰 없으면 no-op)하고 900ms 뒤 openShare()로 결과 창(#shareDlg)을 자동으로 연다(trial.openTimer는 창이 실제로 열릴 때까지 유지). boardSubmit은 시작 시점의 nick·board.tab을 기억해, 응답이 왔을 때 닉이 바뀌었으면 보드 데이터를 버리고, 사용자가 다른 탭으로 옮겼으면 탭을 되돌리지 않고 data[board]만 저장(seq는 탭이 그대로일 때만 올려 옛 로드를 버림).
          페이로드에 nick·token 포함. trial.result.submit={state:'busy'|'done'|'fail',rank,total,improved,error} → renderTrialRank()가 #dRank 문구(등록 완료/최고 기록 유지 + N위/M명·상위 P%)·#dRankRetry(실패 시)를 그리고 renderShareRank()가 결과 창 배너(#shareRank.tN: 등급 제목 tier.N.title·순위 줄·코멘트 tier.N.msg,
          CSS 애니메이션 tierPop/tierGlow/tierShine)를 그림. 등록이 끝나면 카드(열려 있거나 폰트 로드 중이라 아직 안 열린 것도, shareSrc.rec===trial.result.rec로 판별)를 다시 그려 캔버스에도 순위 줄(model.rankText = card.rank + 등급 제목, 타일 아래 y=548)이 들어가고 트윗 문구에도 붙는다
          #boardCard(.records 첫 칸): 탭(#boardTabs) · 참가 수(#boardInfo, 2026-09-14부터 기간·초기화 문구 없음) · 내 순위 한 줄(#boardMe: 응답 me의 nickKey가 현재 닉과 같을 때만 board.me, 아니면 board.meNone) · 상위 10 표(#boardList, 내 행 tr.me, 10위 밖이면 ⋯ 구분 행 뒤에 내 행, 본인 행에만 `.board-delete`) · 새로고침.
          boardLoad는 GET /top?board=&nick=(hasNick()일 때만 store.nick. 토큰 없는 옛 닉으로 남의 행을 내 행처럼 보이지 않게); 삭제 중 호출되면 `loadAfterDelete`로 예약해 닉네임 변경 뒤 재조회를 잃지 않는다. boardDelete는 확인 후 `DELETE /score {board,nick,token}`으로 서버가 소유권을 검증해 현재 보드의 본인 행만 지우고, 돌려받은 top 모양으로 표·참가 수·wave cut을 갱신한다.
          `board.submitting` 중에는 삭제 버튼·실행을 막고, 삭제 중 완주한 측정의 등록은 `submitQueue`에 결과·payload·닉네임·토큰을 함께 보관하고 `boardDrain()`으로 미뤄 `/submit`과 `DELETE /score`가 겹치지 않게 한다.
          방문자(#visits, 헤더 우상단): visitsLoad()가 KST 날짜(KST_DAY)와 store.visitDay를 비교해 다르면 visitDay를 먼저 저장하고 POST /visits(요청 중 새로고침·두 번째 탭이 다시 세지 않게; 실패하면 그날은 안 세어짐), 같으면 GET. live.visitsBusy로 한 번에 하나만. 문구 visits(today,total)
          한마디(#postsCard): 최초 1회와 #postsRefresh 클릭 때 postsLoad(GET /posts), `live.postsLoading`으로 중복 클릭·쓰기 중 조회를 막고 버튼을 불러오는 중/비활성으로 표시한다.
          자동 폴링은 없다(결정 24). #postForm(#postNickLabel 표시 + 본문 #postText 200자) → postSend(POST /posts; hasNick()이 아니면 게이트를 연다) → 응답 rows로 목록 갱신. GET이 워커 503 `{error:'quota'}`를 받으면 posts.quota(무료 서버 한도·후원 안내), 다른 실패는 posts.loadFail. 오류 코드 매핑 rate→posts.tooFast, text→posts.textBad, auth→lostNick().
          대댓글(2026-09-14, 결정 22): renderPosts가 원글마다 `.reply-open`(답글 수)을 그리고 #postList 클릭 위임으로 `live.replyTo` 한 곳에 `.reply-form`을 연다. replySend(id,text) → POST /reply; 실패 시 `replyText` 유지, 성공 시 폼 닫힘, post(원글 삭제됨)면 postsLoad. 서버 replies[]는 오래된 순으로 `.reply-list`에 전부 표시하며 재대댓글은 없다.
          좋아요/싫어요(2026-09-13, 결정 18): renderPosts가 글마다 `.post-votes`에 voteBtn(👍 up / 👎 down, aria-pressed = 내 표) 두 개를 그리고 #postList 클릭 위임 → postVote(id, v): hasNick() 아니면 게이트, 내 표와 같으면 v:0(취소)
          아니면 v로 POST /vote(멱등 설정), 응답 `mine`으로 store.votes[id] 갱신(요청 시작 때의 닉과 key가 같을 때만 — 요청 중 닉을 바꾸면 새 닉의 캐시를 더럽히지 않음)·setPosts(rows)로 목록 교체.
          원글·투표·답글 쓰기는 `postsMutating()`(`live.posting/voting/replying`) 하나로 직렬화해 각 전체 rows 스냅샷이 서로 덮지 않으며, 변경 중 postsLoad를 막고 `live.postsSeq`로 이미 진행 중이던 낡은 조회 응답도 버린다.
          오류 rate→posts.voteFast, post(삭제됨)→postsLoad, auth→lostNick, 그 외 posts.voteFail. store.votes = {글 id: 1|-1} 렌더 전용 캐시(로더가 닉이 있을 때 숫자 id·±1만 통과, live.posts를 대입하는 유일한 함수 setPosts가 목록 밖 id 제거, 닉 변경(claimNick 다른 key)·lostNick에서 비움)
          서버 코드는 worker/ (CODE_MAP 범위 밖, worker/README.md 참조). 응답 shape: /nick {ok,nick,token} | 409 taken · /top {season,board,total,rows[{id,rank,nick,score,tie,detail,win,created_at}],me|null,cut10(상위 10% 경계 점수, 10명 미만은 1위, 빈 보드 null)} · /submit 같은 shape + {ok,id,rank,improved} ·
          DELETE /score 같은 shape + {ok,deleted} · /visits {day,today,total} · /posts {rows[{id,nick,text,created_at,up,down,replies[{id,post_id,nick,text,created_at}]}]} · /reply {ok,id,postId,rows} (400 id/text · 403 auth · 404 post · 429 rate)
          · /vote {ok,id,mine,rows} (400 id/v · 403 auth · 404 post · 429 rate)
모드      MODES{free,wsc(전용 무제한),giwon(기원초 연습, 전용 무제한),wave10(10초),ewgf20(20회),combo10(10회),rush30(30초 더미 격파),bd10(10초 백대시 거리)} · setMode → renderMode · startTrial(3초 카운트다운, rush면 GO에 rushSpawn) · endTrial(기록 저장, rush면 dummy.type=null 복구) · trialTick(trial.dur 있으면 타이머, rush는 renderRushHud)
          · rush30: trial{score,kills,whiffs,dashPts}, RUSH_PTS{kill:10,wgf:5,dashMax:3}, HIT_TYPE{ewgf:high,wgf:high,tongbal:mid,hellsweep:low}, boardEntry tie=kills
설정 UI   #setDlg(dialog.share.settings, aside 안에 둠) ← 스테이지 우상단 톱니 버튼 #setOpen(.hud-gear, pointer-events:auto) · #setClose · 톱니·옷장·보상 가로 도구 모음 왼쪽 #sideSel(.hud-side)의 1P/2P 버튼은 스테이지에서 바로 방향 전환(설정 창에서는 제거, 기존 측정 취소·입력 초기화·저장 유지).
          좁은 화면 타이머는 좌측, 도구 모음은 우측에 배치 · 열려 있으면 modalOpen()이 게임 입력을 멈춤(키 리맵 listening은 그보다 먼저 처리되어 동작)
          segSel(id,attr,cb): sideSel/fxSel/touchSel/soundSel/langSel · renderKeys(): 동작별 기본 키 + 보조 키 1개 리맵(`store.keys`/`store.altKeys`; 전체 중복·방향키 충돌 거부, Esc 취소, 보조 칸에서 Delete/Backspace로 제거) · 볼륨 기본값 100/100
스테이지  canvas · world/anim/ghosts/pops/sparks/dust/bolts · fx{crouchDash,ewgf(n,fromDash),wgf,jab,stumble,dash(short),backdash,tongbal,hellsweep} · pop(text,color,size,opts) 폰트는 displayFont() · opts에 x(월드 px),y(바닥 위 px) 추가 가능(격파 팝은 더미 위)
          world.dummy.type: null=일반 백(아무 기술이나 반응. move/crumpleUntil은 기원권 배잡기 경직용) · high/mid/low=rush30 표적(HIT_TYPE 일치만 격파). tryHit(move)는 true/false 반환(사거리 10~130px, 날아가는 중이면 false), 명중 즉시 hit=1로 중복 득점을 차단하고 launchAt=지금+HIT_CONTACT_MS[move]까지 낙하·스파크를 지연한다.
          updateDummy(now)가 물리·재등장을 처리하며 타입 더미는 낙하 완료와 무관하게 respawn=명중+700 이후 첫 프레임에 교체한다. rushSpawn()=타입·거리 랜덤(140~min(380,W*0.6)px). drawDummy는 DUMMY_LOOK로 타입별 위치·색·라벨(dummy.high/mid/low)
          STREAK[1..6] 연속 초풍 팝 스타일(size/color 토큰/glow/rings/sparks/shake, 6에서 고정) · pop opts {lvl,glow,rings,core,life} → 렌더러가 punch-in(easeOutBack)·shadowBlur·퍼지는 링·흰 코어를 그림. reduced motion이면 크기·색·글로우만
          frame(): 걷기(curDir f/b 유지 + idle/walk 이고 moveDur 없음, WALK_F/WALK_B px/s, 살아있는 더미 DUMMY_STOP(36px) 앞에서 정지) → 이동 → rush 더미 통과 방지 clamp → 카메라 → 더미(타입 있으면 rushSpawn 리스폰, 없으면 기존 앞으로 재배치) → 배경/바닥 → 먼지 → 잔상(cd/dash/backdash) → 더미 → 캐릭터 → 번개 → 스파크 → 텍스트 팝 → 플래시
          drawFighter(g,x,y,pose,dir,alpha,tint,look=currentLook()) look=슬롯별 아이템(옷장; tint가 있으면 훅 생략, hairBase 실루엣) · pose.step(−1..1: 보폭, 0이면 기본 자세)·reach(앞팔 추가 길이, 통발)·sink(스탠스 낮춤, 나락)·sweep(오른 다리 궤도각, null이 아니면 다리 하나를 하체 중심 저평 타원 궤도로 그려 한 바퀴 스윕)
          · poseAt(now): anim.kind('cd','ewgf','jab','stumble','dash','backdash','tongbal','hellsweep','walk','idle')
옷장      데이터(저장소 앞): SLOTS[head,top,arms,legs,shoes,skin] · SETS[red,thunder,master,devil] · ITEMS[slot][id]{set, 색, 훅: head.draw(g,hy,item,C) / top.back·front(g,T,C) / arms.hand(g,x,y,angle,C) / legs.deco(g,lines)·width / shoes.foot(g,x,y)·color / skin.marks(g,T,hy,bare)} · base = 기존 캐릭터(픽셀 동일)
          · ITEM_SLOT(id→slot) · DAILY_IDS(12) · ACH[id]{target, stat(life)} 25개(id = 해금 아이템) · owned(id) · lookOf(fit)/currentLook()(캐시)/setFit(slot,id)
          저장: store.life{dashes,ewgf,tries,tongbal,hellsweep,maxChain,maxStreak,tightEwgf,days,donate,giftDay,trials{모드}} · store.ach{id:시각}(업적·출석 공통 해금 기록) · store.fit{slot:id} · 로더가 정수·id·소유 여부 검증(미소유 복장은 base)
          · 저장은 completeCD/attempt/strike/endChain에서 saveSoon()(1.5초 디바운스, 입력 경로에서 동기 localStorage 쓰기 제거), 해금·endTrial은 즉시 save(), pagehide는 연습 시간의 30초 체크포인트 사이 변경까지 포함해 항상 save
          런타임(후원 코드 뒤): checkAch()(카운터 변경마다) → unlockItem → store.pendingRewards[{id,kind:'ach'|'daily',at,day}] 저장. owned는 수령 완료 store.ach만, earned는 owned+pendingReward. 업적 검사·dailyGift 추첨은 earned 제외(미수령 중복 방지). dailyGift는 KST 첫 제스처에 예약, bumpVisitDay로 자정 반영. 로드 시 ID/종류/시각/일수 검증·중복/수령 완료 항목 제거.
          기존 ach는 그대로 유지.
          #rewardOpen(옷장 아래 보물상자): renderRewards가 개수 배지·금빛 맥동·접근성 이름·disabled 갱신. claimRewards는 측정/카운트다운/modal/잭팟/결과 2.3초 hold와 trial.openTimer(결과 창 준비 중) 가드 → 클릭 시점 pending 전부 ach로 이동·save → 대표 첫 보상과 나머지 개수로 playJackpot 1회. 자동 팝업 없음; dialog close/endTrial은 버튼만 갱신. 새 보상은 다음 클릭까지 대기.
          rewardNoticeAdd: 보상 발생 시 #rewardToast를 1.4초 표시하고 Web Animations로 현재 버튼 중심까지 550ms 축소 이동 → 상자 아이콘 450ms 반짝임. 연속 발생은 개수로 합쳐 타이머 재시작; pending 저장/판정과 무관. pointer-events:none, role=status, 무음. reduced/fx off이면 정적 토스트만, 버튼도 정적. rewardNoticeClear는 수령·데이터 초기화·fx 변경 시 타이머/애니메이션 취소.
          renderRewards에서 현재 언어로 다시 그림.
          playJackpot(j,extra): 기존 egg(1.8초 흔들림) → white(230ms, playChime) → reveal(대표 아이템·외 N개, 딤·광선·꽃잎) → #jpOk까지 유지 → out. reduced/fx off면 차임+정적 카드. jackpotActive{j,extra,timers,rumble,done,stopChime} 관리; jackpotPause는 측정 시작·대화상자 진입에서 연출/차임을 정지·폐기하고 자동 재개하지 않음(아이템은 클릭 시 이미 저장됨).
          renderJackpot은 renderAll에서 언어 전환. playChime은 AudioContext 지연 생성, sound/SFX 볼륨 준수. #dataReset은 records/life(days=1)/ach/pendingRewards/fit과 진행 중 연출·토스트 초기화, 닉네임·설정·visitDay 유지.
          #fitDlg(dialog.share.fit) ← #fitOpen(.hud-gear.hud-fit) · fitView(fit|ach) · renderFit(): #fitDaily(출석 n/12), #fitSlots(슬롯별 .fit-chip, 잠김은 🔒+title, 미수령은 수령 대기 표시·착용 불가), #fitAch(세트별 .ach-row 달성 n/목표와 수령 대기 구분 + 특별 + 출석 풀), #fitPreview에 drawPreview · #fitReset ·
          modalOpen()에 포함, renderAll이 열려 있으면 다시 그림
부트      renderAll(); setMode('free'); renderHistory(); updateStats(); bumpVisitDay(); backendInit(); requestAnimationFrame(frame)
```

## 무족초 (2026-09-20)

- 2026-09-22 중립 생략 허용: `commandDir`의 시작 앞→아래는 상태 3으로 진행하고 `tN=tD`로 중립 구간 0을 기록한다. `cd.omittedNeutral`은 실패 상태가 아니라 초풍 로그의 `noNeutral` 경로 구분용이다. 캔슬 앞/대각 해제 때는 유지하고 새 시작 앞·초기화에서 해제한다. `commandButton`은 일반 판정 경로를 사용한다. `wscDir`는 앞→아래와 앞→중립→아래를 모두 허용하고 연결 정규식에서도 시작 앞 다음 중립만 선택 처리한다. 캔슬 앞→N→별도 시작 앞은 필수다.
- 상태 1 진입은 `startCD(t)` 한 곳뿐이다(상태 0/2/3/6의 시작 앞). `cd.state=1`을 직접 쓰지 말 것: 시작 앞은 반드시 `omittedNeutral`을 해제해야 하고, 캔슬 앞(상태 4/5/7 → `cancelCD`)은 반대로 유지해야 250ms 안의 RP가 `noNeutral`로 남는다.
- `wscDir` 연결 정규식의 대각 해제 한 칸은 `[nd]`다. `cd`가 상태 4에서 N과 아래를 모두 상태 7로 보내므로(해제는 한 번만) 정규식이 N만 받으면 ↘→↓→6 웨이브에서 `cd.chain`은 늘고 `wsc.active.waves`만 1로 돌아가 랜덤 과제 수가 어긋난다.
- 설계/구현 경계: `MIST_EWGF.md` 8절, AGENTS 결정 27. 독립 `6N3+RP`, 같은 슬롯 성공 + 앞/N 각각 1칸일 때 최속. 실제 명중 프레임은 측정하지 않음.
- `onDir/onButton`은 시각·기록·측정 기한 처리 후 `mistDir/mistButton`에 먼저 전달한다. 기존 본문은 `commandDir/commandButton`으로 분리. 독립 시작이 아닌 대시·웨이브·활성 WSC에서는 무족 후보를 만들지 않는다.
- `mist{f,n,df,rp,slot,released,queue}`: 중립 다음 d 또는 f 중간 방향 한 번만 한 슬롯 보류해 마지막 세 버튼 순서를 흡수한다. 대각 전에 두 번째 단독 방향이 오면 큐를 재전달하고 일반 순서 검사를 적용한다(6→2는 중립 생략 일반 경로로 처리). 같은 슬롯 df/RP로 끝나면 `mistFinish` → 기존 `classify/attempt`에 선택 input 문맥 전달. `completeCD` 미호출이므로 무족 자체로 웨이브·대시 점수는 없음.
  `released`는 대각 뒤 중립 도착 여부이며 RP보다 먼저 해제했으면 완료 후 다음 시작 앞을 막지 않는다.
- RP 없이 보류 슬롯 종료 시 `mistReplay`가 원래 시각으로 기존 명령을 재전달한다. 짧은 ↓의 기존 WSC/웨이브/통발 보존. 직접 N→df는 대각 450ms, RP 선행 120ms(성공 폭 아님), 앞/N 각각 250ms. `mistTick`은 입력과 렌더 tick에서 처리하며 `trialTick`도 종료 판정 전에 호출해 종료 직전 입력의 점수 누락 방지.
- 후보 타임아웃도 `mistTick`에서 보류 이벤트를 처리한 뒤 기존 `cd` 타임아웃에 넘긴다. 방향 없는 RP 대기는 원래 버튼 시각으로 `no_df` 한 번, 방향이 있는 큐는 버튼까지 원래 순서로 `mistReplay`에 전달한다. 큐를 단순 폐기하면 중립 250ms 직전의 유효한 ↓까지 사라진다.
- `backdashMotion`은 실제 방향 입력마다 한 번 처리. 큐에서 재전달할 때 `commandDir(...,true)`로 중복 방지. `mistRelease`는 기술 종료 후 중립까지 방향 해제를 새 시작으로 인식하지 않도록 함. `clearCommand/resetInput`과 측정 종료에서 후보 정리.
- 레코드 `inputRoute: standard|noNeutral|mist`; 무족만 `fFrames/nFrames/fastest`. kind/서버 payload/영구 저장 구조 유지. WSC는 기존 통계·업적 차단 정책 유지.
- `renderSeg({mist:true,f,n,rp})`: 프레임 단위 세 칸, 기존 대시 범례 숨김. `mist.*`, `route.*` ko/en/ja 키, 접이식 연습 안내. 결과 kind도 키 배열을 허용하여 언어 전환 시 다시 번역. 로그는 경로와 기존 선행 웨이브 메모 함께 표시.
- 검증: 단위 테스트의 mist 그룹 + `node tests/smoke-mist.js`(키보드 6순서/1P·2P/터치/다국어/화면 캡처), 기존 Chrome/WSC 스모크.

## 기원권·기원초 (2026-09-23, 결정 30)

- `heldDir`/`prevDir`/`heldDirT`: `onDir`이 보는 방향 상태(= `curDir`의 판정 경로 사본). `recomputeDir`만 쓰는 `curDir`과 달리 상태 머신과 테스트가 함께 읽는다. `resetInput`이 셋 다 되돌린다.
- 인식: `commandButton`의 `n===2`에서 크라우치 대시 분기(상태 4/7/5·같은 슬롯 lastDF)가 모두 빠진 뒤 `giwonReady(t)` = `heldDir==='df' && !mist && !cd.pending && !(wsc.active.back!=null)`이면 `strike('giwon', t)`. 6N23+RP가 초풍으로 남는 이유는 완성된 크라우치 대시가 같은 ↘를 쥔 채 상태 4에 있기 때문이다.
- RP 선행: `giwonStage`는 실패할 RP를 **한 슬롯만** 보류한다. 조건은 `heldDir`이 'f'/'d' + 직전이 중립 + 그 방향이 같은 슬롯에 들어온 경우, 또는 중립에서 누른 `no_cd` RP(`fromN`: RP, ↓, → 순서의 첫 키다 — 그래서 혼자 누른 RP의 실패는 한 칸 늦게 나온다)뿐이고 그 밖의 `early_stage` 등은 즉시 판정한다. `fromN`은 같은 슬롯의 첫 절반 방향(`half`)까지 기다리고, ↘ 없이 끝나면 RP 실패 뒤에 그 6의 접두(`startCD`·`mistNew`)를 다시 세운다. `onDir`이 같은 슬롯의 `df`를 받으면 기원권, 아니면 `giwonResolve`가 원래 실패를 원래 시각으로 재전달한다(`tick`도 슬롯이 지나면 같은 일을 한다).
- 보류된 실패: 중립→↘ 굴림이 앞을 1프레임 스치므로 상태 1에서 `df`가 오면 `fault('f_before_d')` 대신 `cd.gFault=t`만 남긴다. `commandDir`의 다음 방향이나 `tick`의 `GIWON.FAULT_MS`가 원래 시각으로 실패를 띄우고, 그 사이 RP가 오면 기원권이 취소한다. `clearCommand/endCommand/resetCD`가 함께 지운다.
- `strike('giwon')`는 끝에서 `giwonArm(t)`로 링크를 걸고 `mistRelease=false`로 비운다(2026-09-29: `true`로 두면 ↘→6 미끄러짐이 삼켜져 경직 중 잡은 시작 6이 사라졌다. 경직 중 6 외 방향은 `onDir`이 이미 버린다).
- 링크 `giwonLink{tHit,tRec,until}`: `tHit = t + HIT_CONTACT_MS.giwon`, `tRec = tHit + GIWON.RECOVERY_F*FRAME`, `until = t + GIWON.LINK_MS`. 명중 여부와 무관하게 걸린다(32f는 자기 리커버리). `giwonClear()`가 resetInput/setMode/측정 GO/endTrial에서 지운다(= bdClear와 같은 네 지점).
- 채점값은 **초풍의 발동 프레임**이다(2026-09-27 인게임 확인). `giwonTake(a,t,startT,neutralT)`는 `attempt` 안에서 한 번만 소비한다. `startT/neutralT`는 무족 경로면 `mistFinish`가 실어 보낸 `input.startT/neutralT`, 그 외에는 `cd.tF/cd.tN`.
  축 상수는 `GP_FREE`(=`ACTIVE_F`+`RECOVERY_F`+2, 경직 해제 = 중립 칸 48)와 `GP_TARGET`(=`GP_FREE`+1, 초풍 발동 목표 49)이고 `giwonLink.tRec`는 `GP_FREE`에서 역산한다.
  결과는 `{fire,cell,n,f,buffered,ewgf,route}` — `fire`=`max(0, 누른 슬롯 − 해제 슬롯)`(기술이 실제로 나가는 프레임), `cell`=`GP_FREE+fire`, `n`/`f`=중립·시작 6 슬롯 − 해제 슬롯(참고값, 루트에 따라 `null`). 성공은 `linkOk()` = `ewgf && fire <= GP_FIRE_MAX`이고 루트는 보지 않는다. 실패 문구는 `linkWhy()` 한 곳에서 만든다.
  이 값들은 `a.giwonLink`에 남고 코치·결과 제목·로그 메모·`renderSeg` 4칸 변형(`link.segNames` 경직/시작6/N/RP, 무족 경로에서만)을 고른다. 판정·통계·점수는 건드리지 않는다.
- 경직 잠금(결정 30, 2026-09-27. 경계는 2026-09-28에 슬롯 기준으로 정정): 경직의 끝은 **60Hz 칸**으로 본다 — `giwonOff(t)=frameSlot(t)-frameSlot(tRec)`가 한 곳이고 `giwonStiff`(방향·걷기·대시)와 `giwonRecovery`(버튼)가 함께 쓴다.
  원시 시각(`t<tRec`)으로 비교하면 그려진 `GP_FREE` 칸의 앞쪽 절반(최대 8.3ms)에 들어온 중립이 경직으로 버려져, 눈금은 48f인데 판정은 실패하고 한 칸 늦게 넣어야 성공하는 것처럼 보였다(사용자 보고 2026-09-28).
  `onButton`은 판정을 `buttonJudge(n,t)`로 떼어 놓고 그 앞에서 `giwonRecovery(n,t)`를 본다: `giwonOff(t)>=0`이면 그냥 나가고, 음수면 판정을 건너뛰되 `giwonOff(t)>=-GIWON.BUFFER_F`인 버튼만 `giwonBuf`에 **덮어쓴다**(한 칸 버퍼). `tick`이 `giwonOff(now)>=0`에서 `buttonJudge(b.n, b.t)`로 재전달하며 **판정 시각은 실제 누른 시각**이라 대각+RP 같은 칸 관계가 남는다.
  방향 중 경직을 넘는 것은 시작 6 하나이고, 그것도 `giwonPre(t)`(선입력 창 `GP_BUF_A`~`GP_BUF_B`) 안에서 누른 것만이다. 경직 중의 6은 매번 `resetCD()` 뒤 새 시작 6이 된다(사이의 N이 버려져 f→f로 보이므로). `commandDir`은 `623`(`omittedNeutral`)의 2와 대각이 같은 칸이고 6은 앞 칸이면 `rolled`로 보고 상태 3에서 크라우치 대시 대신 6→3으로 처리한다(보류한 RP가 있으면 기원권). `rolled`는 `wscDir`보다 먼저 정해 웨캔기어도 웨이브로 세지 않는다. `giwonStage`의 `fromN`은 상태 1에서 중립을 쥔(=경직이 N을 버린) `early_stage` RP도 기다린다. 버퍼에서 나온 기원권은 `giwonArm`이 해제 칸(`tRec`)부터 링크를 건다. `giwonClear`가 `giwonBuf`도 지운다.
- 링크는 `linkOk(link)`가 기존 초풍 성공과 발동 프레임만 검사한다. `6N23`·`623`·`6N3` 모두 기존 판정을 따르며 루트별 13f 조건을 추가하지 않는다.
- 연출: `fx.giwon`(`poseAt` 'giwon' — 라이트 훅: 앉지 않고 키를 유지, 어깨를 뺐다가 굽힌 팔꿈치로 돌려 치고 오버슛 뒤 가드 복귀. reach 9 < 통발 13, 전진 8px) · `tryHit('giwon')`이 `d.move`와 `d.crumpleUntil`을 세워 더미를 날리지 않고 제자리에서 `GIWON.CRUMPLE_MS` 동안 접는다(`crumpling(d,now)`가 그 동안의 후속타를 허용).
  `updateDummy`는 접촉에 `giwonCh`를 피격음 대신 재생하고 `giwonZoomStart(now)`를 부른다. `HIT_TYPE`에 없어 rush30 표적은 언제나 헛침.
- `drawStiffGauge(g,x,baseY,now)`는 `stiffBar`{t0,tRec,ax}만 읽어 경직 게이지를 그리고, 위치는 `stiffAnchor()`가 정한다(서 있는 더미를 따라가다 날아가면 그 자리에 고정, 더미가 없으면 캐릭터 발밑에 한 번만). 세로 위치는 바닥선 + `STIFF_BAR.below`(2026-09-29: 머리 위는 팝 글자에 가려 발밑으로). `giwonArm`이 켜고 `STIFF_BAR.flashMs` 뒤 스스로 끄며 `giwonClear`가 취소한다. 판정은 이 상태를 읽지 않는다.
- `impacts`는 `t0`가 미래인 항목을 가질 수 있다(기원초 성공의 2차 고리는 70ms 뒤에 시작). 그리기 루프는 `u<0`이면 **건너뛰기만** 한다 — 반지름이 음수인 채로 `ctx.arc`에 들어가면 IndexSizeError로 `frame()` 전체가 멈춰 페이지가 뻗는다.
- `world.dummy.power`는 `attempt`의 링크 블록이 `'link'`|`'weak'`로 채우는 **연출 플래그**다. `tryHit`도 같은 더미에 기원권이 두 번 들어오면(`again`) 배잡기를 풀고 `'weak'`를 미리 넣으며, 같은 자리에서 `giwonRehit`을 세워 `gpStart`가 그 기원권으로는 새 시도를 열지 않게 한다. `updateDummy`가 발사 순간에 속도·회전 배율과 불꽃 수에만 쓰고, `tryHit`이 매 명중마다 비운다.
- 줌 `zoomAt(now)`/`GIWON_ZOOM`: `frame()`이 2D 컨텍스트를 (W/2, gy) 기준으로 scale하고 같은 배율을 `roomCamera(...,zoom)`에 넘긴다. 카메라 쪽은 `f*z`와 바닥 NDC 행 고정(`offset = g0-(g0-offset)*z`)으로 **정확히 같은 화면 확대**가 되므로 WebGL·Canvas 대체·2D가 어긋날 수 없다. Canvas 대체는 ctx가 이미 확대를 갖고 있어 확대 없는 카메라로 그린다. `store.fx===0`·`reduced`면 생략.
- 기원초 연습 모드 `giwon`(결정 30, 2026-09-24. 탭 이름은 링크를 따라 "기원초 연습"): 자유 연습과 별도 10회 도전을 제공하는 전용 모드. 상태는 `gp{run,last,notice,session}` 하나이고 `gpStats()`가 `{tries,hits,onTime,streak,best,aborted,rows}`를 만든다.
  상수 `GP_FREE=ACTIVE_F+RECOVERY_F+2`(경직 해제 = 중립 칸 48) · `GP_TARGET=GP_FREE+1`(초풍 발동 목표 49) · `GP_FIRE_MAX=GP_TARGET-GP_FREE` · `GP_HIT=ACTIVE_F+1`(카운터 명중) · `GP_LAST=GP_TARGET+3` · `GP_NEAR=GIWON.BUFFER_F`(해제 앞 선입력 창 칸 수).
- `gpCell(run,t)=frameSlot(t)-frameSlot(run.tRec)+GP_FREE`: 칸을 **경직 해제 기준**으로 센다. 입력 시각 기준으로 세면 슬롯 경계에서 그려진 칸과 판정 오차가 1f 어긋날 수 있다. 같은 이유로 경직 잠금도 슬롯으로 비교한다(위).
- 흐름: `giwonArm` → `gpStart`(모드일 때만 `gp.run` 개시) → `gpInput`이 `onDir`/`onButton`마다 이벤트를 쌓고 축을 다시 그린다 → `attempt`에서 링크가 잡히면 `gpFinish(link,a)`, 링크가 있었는데 못 쓰면 `gpAbort()`. 열린 시도 중에 기원권이 또 나가면 `gpStart`가 `gpFail()`로 그 시도를 실패(`again`, `link.again`)로 닫고 눈금은 `gp.last`에 남긴다(재타격이면 새 시도를 열지 않는다). 기록은 `gpFinish`·`gpFail` 모두 `gpClose(row)` 한 곳. `tick`의 `GIWON.LINK_MS` 만료와 `giwonClear`(모드 변경·resetInput·blur·측정 시작/종료)도 `gpAbort`/`gp.run=null`로 끝낸다.
- 채점: `onTime = fire===GP_FIRE_MAX`, `ok = linkOk(link)`. 중단은 `aborted`만 올리고 `tries`(평가 분모)와 행 목록에는 넣지 않는다. 행은 최근 12개.
- 10회 도전(결정 30, 2026-09-28): `gp.challenge{status,stats,startAt,remaining}` + `GP_CHALLENGE`. `gpStartChallenge`(버튼 `#gpChallengeBtn`) → `gpTick`이 3초 카운트다운을 세고 `running`으로 넘긴다. `gpFinish`가 `gpRecord`로 세션과 도전 통계에 같이 쌓고 `tries>=GP_CHALLENGE`면 `done`. 중단은 분모에 들어가지 않는다.
  취소는 `gpChallengeCancel`이며 `resetInput`(모드 전환·blur·탭 숨김)이 부른다. 문구는 `gp.challengeHint` 외에는 `wsc.*` 도전 문구를 재사용하고, 완주 결과는 공용 `completeChallenge()`를 통해 기원초 보드에 등록한다. DB 스키마는 유지한다.
- 성공 연출: `attempt`가 스위치보다 먼저 링크를 집어(`linkWin`) `fx.ewgf`에 `pop.giwoncho`를 넘긴다(연속 2회부터는 기존 `pop.streak`). 성공하면 `fx.linkWin()`이 `playFanfare()`(음원 없는 Web Audio 합성)와 폭죽 고리·색종이를 낸다. 파티클은 `store.fx===0`·동작 줄이기에서 생략하고 소리는 효과음 볼륨·음소거만 따른다.
- 연습 더미: `updateDummy`의 `spawnDist()`가 `giwon` 모드에서 `GP_DUMMY_PX`(70)를 돌려주고, 살아 있고 맞지 않은 동안 매 프레임 `dummyX = charX + GP_DUMMY_PX*side`로 고정한다(기술의 짧은 전진을 따라간다). 착지 후 재등장은 `GP_DUMMY_MS`(250ms). 맞는 중(`d.hit`)에는 고정하지 않아 연출이 그대로 나온다. 다른 모드와 rush30 표적은 건드리지 않는다.
- `gpSegments()`가 축을 만든다. 판정이 없는 두 구간(발동 `2..GP_HIT-1`, 경직 `GP_HIT+1..GP_FREE-GP_NEAR-1`)만 `{a,b,span}` 한 칸으로 묶고 나머지는 `{a,b}` 한 프레임씩이라 15칸이 패널 폭에 들어간다(가로 스크롤 없음). 칸은 `data-frame`(=a)·`data-to`(=b)·`data-label`을 갖고 `renderGpLive`가 그 범위로 `.current`를 켠다.
  축은 그리드이고 칸 폭은 `#gpAxis`의 인라인 `grid-template-columns`가 갖는다(판정하는 프레임 `1fr`, 묶은 칸은 프레임 수에 비례). 묶은 칸은 `--n`(프레임 눈금 수)·`--p`(0~1 진행 채움)를 쓰며, 시계가 안에 있는 동안 `<i>` 라벨이 현재 프레임 숫자로 바뀐다.
  그리드 첫 줄에는 구간 이름 `<u class="gp-band">` 세 개가 `grid-column`으로 자기 칸 위에 정확히 얹힌다 — 회색 `선입력`(`GP_BUF_A`~`GP_BUF_B` = 40~46f. 해제 앞 47f는 창이 아니다) · 금색 `중립`(`GP_FREE`) · 주홍 `공격`(`GP_TARGET`), 칸 색도 같다(사용자 요청 2026-09-28).
- DOM: `#gpTimeline`(`#gpCommand`·`#gpLive`·`.wsc-scroll.gp-fit > #gpAxis`·`#gpLegend`·`#gpGuide`)와 `.coach` 안 `#gpPanel`(`#gpResult`·`#gpAB` 네 칸·`#gpDetail`·`#gpStats`·`#gpRows`). CSS·클래스는 WSC 패널(`.wsc-panel/.wsc-cell/.wsc-ab/.wsc-stats`)을 그대로 쓰고 `.wsc-cell.hit/.rec`만 추가했다.
  `renderMode`가 두 블록을 함께 켜고 `body.giwon-mode`를 토글하며 `renderAll`이 `renderGp()`를 불러 언어 전환에 다시 그린다. `body.giwon-mode`는 wsc와 같은 2열 코치(타임라인 | 평가)를 쓰되 세션 통계는 지우지 않고 `grid-row:auto`로 아래로 내린다 — 플레이와 타임라인을 한 화면에 두기 위한 배치다.
- WSC와 다른 점: 이 모드는 기존 초풍 통계·업적·연속을 **막지 않는다**(후속타가 실제 초풍이므로). 세션 기록은 새로고침하면 사라진다. 10회 도전을 완주하면 `gpFinish`가 `gp.challenge.result={completed:true,window,rec:{hits,target:GP_CHALLENGE,best}}`를 만들고 `boardSubmit()`한다(결정 31). `rankingResult()`는 `giwon` 모드에서 이 결과를 돌려준다.
- `tools/cdp.js`의 `b.errors`는 제3자 광고 프레임의 **report-only CSP 항목**을 무시한다(2026-09-27). 브라우저가 "기록만 하고 아무것도 하지 않았다"고 남기는 줄이라 페이지 오류가 아니고, 네트워크 상태에 따라 나타났다 사라져 스모크를 간헐적으로 깨뜨렸다.
- 검증: 단위의 기원권/기원초/연습 모드/훅 모션 그룹 + `node tests/smoke-giwon.js`(키보드 도착 순서 6가지×양쪽 방향, 굴림, 링크 프레임, 세 언어, 카운터 줌·배잡기 경직 스크린샷, 연습 모드 축·라이브·통계·행·가로 스크롤과 화면 캡처, 터치·390px).

## 판정 상수 (경험값. 너무 엄격·느슨하면 여기부터)

- 상태 타임아웃 250ms, d/f 유지 상태 450ms, d/f 뗀 뒤 캔슬 대기 120ms, pending 버튼 120ms, 체인 종료 700ms.
- 기원권 `GIWON`(가정값, 결정 30): ACTIVE_F 14 · RECOVERY_F 32 · GROUND_F 13 · BUFFER_F 8 · FAULT_MS 450 · CRUMPLE_MS 900 · LINK_MS 1200. `GIWON_ZOOM` PEAK 1.12 · IN_MS 60 · OUT_MS 470(PEAK만 미측정). `HIT_CONTACT_MS.giwon`은 ACTIVE_F에서 파생된다. 문구(클로저)와 테스트가 상수를 읽으므로 숫자만 바꾸면 된다.
- 백대시 `BD`(실측 모델 2026-10-02, 결정 17, 근거 `BACKDASH.md`): CURVE 17칸(풀 0.638 m) · RECOVER_F 26 · LINK_MAX_F 60 · CANCEL_A~B 11~13 · HAND_F 6 · TIERS 손 c 7/10/16f(→ 1.78/1.55/1.23 m/s) · PX 56. 4 탭·N 짝짓기는 TAP_MS(250) 공유. 문구(클로저)와 테스트가 상수를 읽으므로 숫자만 바꾸면 된다.
- 초풍은 공통 60Hz 슬롯 동일성(AGENTS 결정 2). 옛 window는 로드/서버 호환 및 기존 나락 선입력에만 유지. 선택 UI 없음. 완벽 코치 `|off|≤4ms`, 사범 피부 진행은 동일 슬롯 성공 중 `|off|≤8ms`.
- 웨이브 상위 띠(차트 음영·카드 chart.top·코치 tempo.5)는 웨이브 10초 순위 상위 10% 경계(`waveTop()`, 워커 `cut10`). 보드 응답 전·백엔드 없음이면 5 대시/초 폴백. 순위가 초기화되지 않으므로(2026-09-14) 받은 값은 만료 없이 유지한다. D1 조회 절약(2026-09-15)으로 배경 재조회는 없으며 최초 로드·순위 탭/새로고침·등록·삭제 응답 때만 갱신한다.
  boardLoad/boardSubmit이 wave10 데이터를 받으면 renderWave()로 띠를 갱신. 구간 조언은 가장 긴 구간이 90ms를 넘을 때만.

## i18n 용어

| ko | en | ja |
|---|---|---|
| 초풍 | EWGF | 最風 |
| 풍신권 | WGF / Wind God Fist | 風神拳 |
| 크라우치 대시 | crouch dash | 風神ステップ |
| 웨이브 | wave (dash) | ウェーブ |
| 대초 (대시 초풍) | Dash EWGF | ダッシュ最風 |
| 기원권 | d/f+2 | 3+2 |
| 기원초 (링크) | d/f+2 link | 3+2連係 |
| N초 (연속 초풍) | EWGF ×N | 最風×N |
| 캔슬 6 / 시작 6 | cancel 6 / start 6 | キャンセル6 / 始動6 |
| 방향 | f, N, d, d/f | 텐키 6/N/2/3 |

일본어일 때만 `html[lang=ja]`로 폰트를 Dela Gothic One / Noto Sans JP로 바꾼다. 언어는 `navigator.language`로 초기 선택(ko/ja 외는 en), `store.lang`에 저장.

## 리소스

- 3D 도장 재질: 원본 `src/assets/room-atlas.webp`(자체 생성 목재/회벽 WebP)를 조립 때 `ROOM_ATLAS` data URL로 인라인(`src/js/35-dojo3d.js`). `roomTexture`가 각각 256×512 POT 텍스처로 잘라 mipmap을 만든다. 외부 요청이나 file:// 업로드 보안 문제 없음. 출처·프롬프트는 `archive/DESIGN_2026-09-19.md`. 옛 `dojo-room.webp`는 사용하지 않음.

- `og.png`: Open Graph 이미지 1200×630. `node tools/make-og.js [--lang ko|en|ja] [--out 경로]`로 생성(헤드리스 Chrome/Edge + CDP, 의존성 없음, Google Fonts 서브셋을 카드 문자열로 미리 로드). drawCard·og.* 문자열·색 토큰이 바뀌면 다시 생성해 커밋. 페이지 오류(폰트 요청 실패 포함)가 있으면 종료 코드 1.
- `tools/cdp.js`: 헤드리스 Chrome/Edge 실행·CDP 연결·evalJs·오류 수집을 한 곳에 둔 공용 모듈. WebSocket 연결 10초·CDP 명령 15초 제한으로 응답 없는 대기를 실패로 보고한다. `tests/smoke-chrome.js`와 `tools/make-og.js`가 씀(포트 9333/9334, 프로필 분리로 동시 실행 가능). 브라우저 자동화가 필요한 스크립트는 여기서 `launch()`를 가져다 쓴다.
  `sfxFiles(html)`은 조립한 페이지의 `SND` 표에서 효과음 파일 목록을 뽑아 스모크 페이지가 복사·서빙할 목록으로 쓴다(새 효과음은 `SND`만 고치면 된다).
- `worker/`: 백엔드(Cloudflare Worker + D1: 누적 순위·방문자 수·한마디). `index.js`(ESM, `SEASON`·`seasonKey`(항상 `'all'`. 2026-09-14부터 초기화 없음, 되살리려면 여기서 `weekKey(now)`)·`weekKey`·`dayKey`·`validate`·`cleanText`·`nickKey`·`handle`·`BOARDS`·`WINDOWS` export + default fetch),
  `migrate-2026-09-14-alltime.sql`(주간 행 → 닉·보드당 최고 1건, week='all'. 멱등, 테스트가 실행해 본다), `schema.sql`(scores + UNIQUE(week,board,nick)
  — week 열은 시즌 키, nicks(key=NFKC 소문자 유니크, token), visits, posts, replies(원글 아래 1단계 대댓글, 2026-09-14), bans(섀도 밴 닉, 2026-09-13), votes(글 좋아요/싫어요, PK(post_id,key), 2026-09-13).
  멱등), `package.json`(`"type":"module"`만), `wrangler.toml`(D1 + 레이트 리밋 바인딩 `POST_LIMIT` 3회/분(원글+대댓글 합계)·`NICK_LIMIT` 10회/분·`VOTE_LIMIT` 30회/분), `README.md`(배포·관리자 삭제·설계). `/top`은 window 함수 CTE 한 쿼리로 상위 10·참가 수·내 순위·cut10 후보를 함께 읽는다.
  `/posts`는 `latest` CTE에서 최신 50개를 먼저 제한한 뒤 그 행에만 투표를 조인하고, 답글 SELECT는 첫 원글 SELECT가 돌려준 ID만 바인딩한다. `/reply`는 `INSERT … SELECT … WHERE EXISTS` 한 문장으로 부모 확인과 삽입을 원자화한다. D1 일일 행 한도 오류는 503 `{error:'quota'}`로 메시지 노출 없이 구분한다.
  비밀 `ADMIN_TOKEN`(wrangler secret)은 관리자 경로 전용: DELETE /posts/:id, DELETE /scores/:id, GET /scores(보드 전체 행), GET/POST/DELETE /ban(섀도 밴: `top()`의 목록·total·cut10·순위에서 `VISIBLE` 필터로 제외하되 요청한 닉 자신의 행은 `OR nick=?`로 통과 → 본인은 차단 전과 같은 화면. `BANNED`는 bans 표기 + 같은 key로 등록된 표기).
  관리자 경로 매칭·토큰 검사는 `admin()` 한 곳(출처 검사 전, 해당 경로가 아니면 undefined). SQL 조각은 `SCOPE`·`BY_RANK`·`VISIBLE` 상수로 공유. 터미널 도구 `tools/board-admin.js`(인자 없으면 번호 메뉴, 직접 명령 top/ban/unban/bans/del/delpost, 토큰은 `.sandbox/admin-token.txt` 또는 env; `tools/admin.cmd`는 더블클릭용 래퍼).
  앱과 계약이 바뀌면 `src/js/29-backend.js`의 boardEntry/renderBoard와 `tests/board.test.cjs`, `tests/backend.test.cjs`의 계약 교차 검증을 함께 고친다.
- `tests/fake-d1.js`: node:sqlite 인메모리에 `worker/schema.sql`을 그대로 적용한 가짜 D1(Node 22.13+). 단위 테스트와 스모크 테스트가 공유. `tests/helpers/app.cjs`의 `boot(saved, fetch)`는 두 번째 인자로 fetch 스텁을 받아 백엔드 경합(등록 중 닉 변경·탭 전환, 403, 방문 집계)을 검사한다.
- `bgm.mp3`(3.7MB, 루프), `sfx/wave.mp3`(크라우치 대시), `sfx/ewgf.mp3`(초풍 성공): 자체 제작(사용자 확인 2026-09-11). 2026-09-12에 영문 파일명으로 개명하고 재생 코드 연결. 스모크 테스트는 스크래치 페이지 옆에 세 파일을 복사한다(없으면 리소스 오류로 실패).

### D1 조회 절약 보완 (2026-09-21)

- Worker `BANNED`는 bans를 바깥 루프로 하는 `CROSS JOIN`으로 nicks의 key 인덱스를 조회한다. 전체 가입 닉네임 스캔을 피하며 기존 섀도 밴 표기 규칙은 유지한다.
- `board.loads`는 보드·닉·토큰·rev별 진행 중 Promise만 공유한다. `boardLoadKey()`로 현재 요청을 구분하고 조회 중 새로고침 버튼을 비활성화한다. 탭 왕복은 진행 중 요청을 재사용하되 완료 결과는 캐시하지 않는다. 삭제 시작 시 rev를 올려 삭제 전 요청을 재사용하지 않으며, 기존 seq/rev 보호로 낡은 응답을 버린다.
- 공유 응답은 마지막 호출(seq 일치)만 렌더링한다. 키에 rev가 포함되므로 별도 rev 스냅샷 비교는 하지 않는다. `lostNick()`은 seq를 올리고 조회 중 문구·버튼 상태를 즉시 정리해 인증 만료 전 요청이 완료돼도 로딩 표시가 남거나 새 익명 조회를 덮지 않게 한다.

## 검증

- 한마디 밀도(2026-09-19): `.posts-card` 안에서 목록 gap 0·글 padding 3px·본문 12px/1.4와 작은 문단 여백, 투표 margin 제거. 글은 flex-shrink:0으로 전체 내용을 보존하며 목록 내부에서 스크롤한다. 작성자 이름은 입력칸 옆에서 최대90px로 줄바꿈, 기존 버튼 높이28px·댓글/답글 DOM/API 유지.

- 검색 설명·아이콘 회귀: 단위 테스트가 루트/en/ja의 meta·OG 설명과 각 언어의 `app.description` 일치, 공유 PNG 경로·실제 크기와 `sizes` 일치를 검사한다. Chrome 스모크는 en→ja→ko 전환 뒤 실제 DOM의 meta·OG 설명을 정적 페이지와 대조한다. WSC 스모크 사본에도 `favicon.png`를 복사한다.
- `node --test "tests/*.test.cjs"`: 조립한 페이지(`tools/assemble.js`)의 실제 스크립트를 vm에서 돌려 DOM·게임패드·시간을 모사. 판정, 측정 모드 경계, 패드 동시 입력·재연결, 저장 데이터 검증, 누적 통계, 공통 60Hz 슬롯 경계, 언어 전환, 세 사전 키 집합 일치, 공유 카드 모델(histBins/buildCard/shareSource),
  OG 카드 모델(buildOgCard)과 `<head>`의 정적 SEO/OG 태그(og:image 절대 주소·1200×630·theme-color가 `--bg`와 일치·외부 스크립트 없음)를 검증한다. 테스트 하네스의 `querySelectorAll`은 빈 배열을 돌려주므로 정적 텍스트 치환은 여기서 검증되지 않는다. 하네스에는 `createElement`·캔버스 컨텍스트가 없으므로 그리기·클립보드 코드는 클릭 핸들러 안에서만 호출해야 한다.
- `node --test tests/board.test.cjs`: Worker 핸들러를 `tests/fake-d1.js`(node:sqlite 인메모리 + 실제 schema.sql, D1 prepare/bind/run/all/first 모양)로 직접 호출.
  주차·일 키 경계(15:00 UTC), 닉네임·본문 정규화·범위 검증, 닉네임 등록(대소문자·전각 무시 유니크, 토큰 없거나 틀리면 submit/posts/reply 403, 등록 철자로 저장, 레이트 리밋 스텁), 닉네임당 1행 업서트(더 나쁘면 유지·improved=false), 동점 순위 공유·보드/주차 격리, 10위 캡 + 10위 밖 내 순위, 방문 집계, 게시판(50개 캡·검증·레이트 리밋 스텁·관리자 삭제 403/404), 대댓글(다중·시간순·원글과 레이트 리밋 공유·원글 삭제 시 삭제),
  좋아요/싫어요(닉당 1표·멱등 설정·변경·취소·검증 400/403/404·레이트 리밋 스텁·글 삭제 시 표 삭제), CORS·상속 키 400·404/413·500(스택 비노출). 단위 테스트 전체는 `node --test "tests/*.test.cjs"` 한 줄이다(따옴표는 Node가 직접 펼치게 하려는 것).
- `node tests/smoke-chrome.js`: 로컬 Chrome/Edge를 헤드리스로 띄워 CDP로 조작. 시작 시 `worker/index.js`를 로컬 http로 감싸고(가짜 D1) `BOARD_URL`만 그 주소로 바꾼 조립 페이지를 임시 폴더에 만들어 연다(원본은 건드리지 않음).
  키보드로 6N23+2 입력, ko/en/ja 왕복 전환, 일본어로 웨이브 10초 측정 모드를 끝까지 돌린 뒤 공유 카드 열기·1200×630 PNG 생성·이미지 복사 시도(file://에서는 거부되어 안내 문구)·언어 전환·닫기, 백엔드는 로드 직후 닉네임 게이트부터: 모달 열림·게이트 중 키 입력 무시·Escape로 안 닫힘·2자 미만 거부·미리 점유된 닉네임 409 거부(Chrome이 남기는 409 리소스 오류 로그는 걸러냄)·자유 닉네임으로 시작(localStorage nick+token 48 hex).
  측정 모드가 끝나면 자동 등록 문구와 자동으로 열린 결과 창 배너(등급 t2 '上級', 1位/1人)를 확인하고, 두 번째 측정 모드 자동 등록('최고 기록 유지'·결과 창 재오픈) → 다른 보드 빈 상태 → 한마디 작성·표시 → 헤더 버튼으로 닉네임 변경 → ko 전환 후 문구와 가짜 D1의 scores/posts/visits/nicks 행을 검사한다. JS 오류가 있거나 검사가 실패하면 종료 코드 1. 약 40초 걸린다.
- 스모크 테스트 끝에 폰 에뮬레이션(390×844, touch, pointer:coarse)으로 터치 오버레이 표시·대기 배지 → 패드에서 f,N,d,df를 굴리고(CDP Input.dispatchTouchEvent) df와 2를 한 번에 보내 초풍 판정 → 가로(844×390)에서 패드·버튼이 오버레이 안에 겹침 없이 들어가고 힌트가 그 위에 보이는지 → 데스크톱으로 되돌리면 숨김을 확인한다.
- 실제 키보드·게임패드·터치 지연, DirectInput 장치별 hat 매핑, 화면 폭별 시각 품질은 자동 검증에 없다.
- 캔버스 입자·더미 물리는 프레임마다 고정량으로 갱신하므로 주사율에 따라 연출 속도가 달라진다. 판정과 rush30 더미 재등장은 시각 기반이라 영향 없음(재등장은 기한 이후 첫 프레임).

- 소리 회귀 브라우저 검사: `node tests/smoke-sound.js`. 로컬 HTTP로 backend 비활성 사본을 제공, 같은 Chrome의 별도 창 두 개에서 BGM 한 개·끄기/닫기 시 권한 이전·재생 중 효과음 볼륨/끄기를 검증. 정리본 MP3 5개 실제 디코딩/재생·볼륨·일괄 음소거와 피격 효과 스크린샷도 확인한다.


## 웨캔기어 (2026-09-18, 후속 UI 반영)

- `wsc`는 메모리 전용 `session` 하나 + `challenge{status,stats,startAt,remaining,taskN}`. onDir/tick은 모든 모드에서 wsc와 기존 cd를 함께 실행한다. onButton은 active.back이 있으면 wscButton으로 소비하고 endCommand, 없으면 wscOtherMove로 후보를 지우고 기존 기술을 판정한다. pending RP/나락 확정도 attempt/strike에서 후보를 정리한다.
  wsc 모드의 completeCD/attempt/strike/addLog 기록 쓰기는 가드로 막아 기존 session/life/업적을 유지한다. 다른 모드에서는 기존 웨이브만 정상 집계하며 WSC 마무리로 attempt/strike/측정 점수를 만들지 않는다. 공통 입력 정규화·키보드/패드/터치와 1P/2P 변환은 유지.
- `wscJudge` / `wscFrames` / `wscA`: 경과 간격 반올림, A만 +1(대각 입력 프레임 포함). A=8..10(실제 경과 7..9)/B=1..A−7, B는 뒤 입력 0f 기준 유지. 원시 값·정수 값 보존. 초풍 `frameSlot`과 다른 정책.
- `wscDir`: 선행 prefix 순서만 인식하고 시간 기록은 마지막 df부터 `active.events`에 넣는다. 첫 앞은 캔슬, 별도 시작 앞부터 새 prefix; 완성된 대각만 기준 교체. `wscButton` → `wscFinish` 결과 최대 1회, `wscRecord`로 세션 및 실행 중 도전에 각각 집계. 중단 aborted/선행 errors는 분모 제외, 최근 rows 12건.
- `wscStartChallenge` / `WSC_TARGET=10`: countdown(3초) → running → done. wscTick의 입력 시각·RAF tick으로 진행, 별도 타이머 없음. 카운트다운 입력은 무시. N=0~3을 과제마다 무작위 추첨, active.waves의 유효한 연결 수가 taskN+1인지 A/B와 함께 평가. 결과 taskN/waves/taskOK/timingOK로 횟수와 타이밍을 따로 보존. 10번째 평가 결과에서 완료, 다음 시도는 세션에만 추가.
  기존 trial/공유와 분리되며 2026-09-19부터 완주 결과만 전용 wsc 리더보드에 등록. rewardBlocked는 도전 중 보상 수령도 막는다.
- `resetInput` → `wscCancel`이 진행 입력과 도전을 취소한다. 내부 GO·다른 기술·일반 모드의 미완성 웨이브 만료에서는 `wscCancel(false)`로 후보만 지운다. 모드/side/모달/blur/hidden에서 취소. 세션 초기화는 WSC의 session/challenge만 비운다.
- 왼쪽 #inputs(기존 입력 간격 f 이력), #wscTimeline(6N23 묶음 + 1..15f 축 + #wscLive 실시간 A/B), 플레이 아래 .coach 안 #wscPanel(전체 결과, #wscAB 두 칸, 도전 요약/#wscTask 요구·현재 횟수, 이번 세션 통계, 접이식 기록/안내). 단계 버튼 없음. 기본 2열 레이아웃/모바일 1열 유지. 표는 가로 스크롤하며 새 결과의 뒤·RP 구간으로 정적 이동.
  renderWscLive(now)는 RAF 현재 시각으로 판정과 동일한 반올림을 표시하고 .current 칸을 강조·스크롤한다. 판정 자체는 입력 시각만 사용한다. 완료/취소에는 진행 강조 제거, 15f 초과 입력·현재 칸 강조는 표에서 생략하고 실제 숫자와 판정은 유지. #resultCard도 표시해 다른 기술 결과를 보여준다. shareSource/openShare 가드 유지.
- `wscAnimate` → poseAt('wsc'): 앉기/상승/복귀, moveChar·기상어퍼 팝·tryHit('wsc')로 일반 더미만 반응. wsc 기술음은 playSfx, 일반 더미 tryHit는 연출 설정과 독립. rushStrike·기술 통계 없음. timingOK(도전 횟수와 독립)일 때 기술 연출·소리. fx off/reduced는 기상어퍼 추가 모션만 생략.
- `tests/smoke-wsc.js`: 백엔드 없는 사본, 실제 브라우저 키 이벤트, 여섯 조합/동시/모달 취소, 실제 3초 카운트다운/랜덤 과제 10회 완료/취소, 1366·390px × ko/en/ja × 1P/2P 레이아웃 및 기상어퍼 스크린샷. `.sandbox/wsc/browser/` 저장.
- `tools/make-og.js`는 임시 사본의 백엔드를 끄고 QR 리소스를 복사해 외부 서버·누락 리소스 없이 생성한다.


## 기술별 효과음·피격 (2026-09-18)

- 효과음은 첫 사용자 입력(unlockAudio)에서 sfxPool에 이름별 Audio 3개를 미리 생성한다. `fx.tongbal/hellsweep`, `wscAnimate`에서 각각 재생한다. 기존 wave/ewgf 소리는 유지, 풍신권·실패에는 새 기술음을 임의로 배정하지 않는다.
- `tryHit`가 사거리/활성/중복/타입을 검증하고 예약한 launchAt에 `updateDummy`가 피격음과 효과를 1회 생성한다. 피격음은 sound/sfxVol만 따르고, `impacts`의 180ms 원·방사선과 접촉 불꽃은 fx/reduced도 따른다. effects-off에서도 더미 명중·점수는 동일하다.
- 원본 제공 폴더 `D:\사운드 모음`: 정리본 기상어퍼소리.mp3→sfx/wsc.mp3, 나락소리.mp3→sfx/hellsweep.mp3, 통발소리.mp3→sfx/tongbal.mp3, 피격음.mp3→sfx/hit.mp3, 백대쉬소리.mp3→sfx/backdash.mp3. 파일 내용은 변경하지 않았다. 2026-09-18 사용자 확인: 4개 모두 직접 제작 또는 사이트 공개 사용 권한이 있는 음원. 출처 확인 완료.

- 2026-09-18 피격음 후속 조정: `SFX_GAIN{tongbal:0.8,wsc:0.8}`와 `sfxVolume(name)`을 재생 및 sfxSync 모두에서 적용. `HIT_CONTACT_MS`는 통발/초풍/풍신권 180ms, 나락 160ms, 기상어퍼 200ms. 사운드·충격 효과·더미 날아가기의 시작을 같은 launchAt에서 처리하며 점수/명중 예약/700ms 재등장 정책은 유지한다. 실제 게임 발동 프레임이 아닌 사이트 연출 조정값이다.

- 2026-09-18 음원 내부 지연 확인: FFmpeg 및 Chrome decodeAudioData에서 피격음의 10ms RMS가 최대 RMS의 30%를 처음 넘는 구간은 180ms(최대는300ms). `SFX_START.hit=0.18`로 재생 시작점을 옮겼다. 다른 기술음은0, 원본 MP3·기술별 contact 시간·80% gain은 유지한다. 첫 입력에서 모든 SFX를 선로딩한다.
  `tests/smoke-sound.js`는 디코딩한 onset과 설정 offset 일치, 실제 seek 완료 후 currentTime을 검사하며, 로컬 미디어 서버에 Range 응답을 제공한다.
- `.sandbox/wsc/`에 audio-analysis.json, browser-audio-analysis.json, sync-before/after.mp4 보관. 비교 영상은 동일한 선로딩 조건에서 hit offset0/0.18만 비교한 브라우저 캔버스+오디오 캡처다. 녹화 첫 통발 피격음 파형 상관 비교에서 약917ms→753ms(약164ms 단축). 에이전트의 직접 청취 결과가 아니며 오디오 출력 장치의 체감 싱크 보장은 아님.

- 2026-09-18 정리 음원 재교체(최신): 사용자 제공 5개를 원본 바이트 그대로 복사. 새 피격음의 10ms RMS 30% 시작점은120ms이므로 SFX_START.hit=0.12로 갱신(위180ms 분석은 이전 파일 이력). 통발/기상어퍼80%와 기존 contact 시간은 유지. `fx.backdash`에서 playSfx('backdash'), tapDetect가 실제 출력한 b,N,b만 재생하고 경직 중 무효 재입력·걷기에는 재생하지 않는다.
  정리본 녹화 `.sandbox/wsc/sync-clean.mp4`(백대시→통발→기상어퍼→나락)는 브라우저 오디오·캔버스 캡처이며 직접 청취 검증은 아니다.

- 2026-09-19 통합: WSC 도전 countdown/running 동안 noticeAutoTry와 donateNudgeBlocked가 자동 안내를 보류한다. wscStartChallenge는 활성 후원 말풍선을 donateNudgeDefer로 먼저 숨긴다. WSC 전용 스모크는 최신 noticeSeen을 준비하고, 기본 스모크가 공지 흐름을 검증한다.


## G 도장 외형 (2026-09-19)

- `.main`은 backend 활성 + 1100px 이상에서 플레이/한마디 2열, 그 외 1열. 한마디는 원래 postsCard DOM을 이동해 글쓰기/답글/투표 API를 유지한다. `.coach`는 아래 전체 폭. `#resultCard`를 스테이지 오른쪽 위로 이동. `.coach`는 하단 6열 통계 + 코치/구간 분석 2열(모바일 3열 통계 + 1열). `.section-links`는 분석/순위/한마디 앵커, records는 차트·로컬 기록 다음 온라인 영역 순서. backend 비활성 시 온라인 앵커도 숨긴다.
- WSC는 모든 화면에서 `.coach`에 타임라인 + A/B 평가를 배치한다. 750px 이상 하단 2열, 작은 화면 하단 1열. `.stage-actions`의 dStart/wscChallengeBtn은 1P/2P 왼쪽에서 모드에 맞게 노출, 중앙 상단은 hudTimer/hudCenter. dReset DOM은 제거, `resetSession()`은 설정 dataReset이 호출하는 내부 함수로 유지.
- `stageScale`은 데스크톱 캔버스의 표시 배율(1~1.15), 터치는 0.9. 데스크톱 스테이지 높이는 :root의 --scene-height=clamp(465px,52vh,510px), 한마디는 같은 값+55px. 1100px 미만 한마디는520px, 터치 세로 씬은2/3 비율·최대78vh, 가로는16/9·최대72vh. canvas의 물리 픽셀 크기는 DOM×DPR, 논리 W/H는 표시 배율로 나눈다.
  drawFighter와 기본 복장·옷장 훅·공유 카드 캐릭터는 기존 그림으로 유지(2026-09-19 재디자인 철회). 카메라 목표 위치 1P 43% / 2P 62%, 판정 시각·세계 이동량·충돌 거리 상수는 그대로다.
- `ResizeObserver`는 WSC 모드/터치 설정으로 DOM 스테이지 크기가 변할 때 canvas 및 터치 배치를 갱신. window resize도 유지.
- 본문은 기존 Noto Sans, 한국어/영어 브랜드만 Nanum Brush Script(Google Fonts 기존 허용 출처), 일본어 브랜드는 기존 Dela Gothic. 먹색·목재색·붉은 강조 토큰은 :root. en/ja 정적 소개도 같은 기본 색상 사용.
- `node tests/smoke-design.js`: WebGL 초기화·내장 재질 로드·카메라 전진·입력 기록 고정, 320/390/768/1024/1440px × ko/en/ja × free/wsc의 넘침·겹침·캔버스 크기를 확인. 캡처는 `.sandbox/dojo-design/`. 기존 smoke-chrome의 가로 입력 순서/세로 도구 배치 가정은 새 순서와 실제 사각형 교차 검사로 변경.


### 3D 배경 후속 (2026-09-19)

- `#stageBack` WebGL 캔버스가 `#stage` 투명 2D 캔버스 아래에 있다. 기존 drawFighter/drawDummy/번개/파티클은 2D 그대로다. 배경은 `createDojo3D`의 정적 vertex buffer + 1 draw call, 벽/바닥/기둥/보/벤치/족자/등의 실제 입체 geometry. 외부 엔진 없음.
- `ROOM`의 단위 80px/m, 바닥 y=0, 벽 z=-3. `roomCamera(W,H,gy,camX)`가 원근 카메라를 만들고 z=0 연습 레인의 점을 정확히 `(worldX-camX,gy)`로 투영한다. 1P/2P, canvas 배율, 터치에서 동일하며 단위 테스트로 검증한다. `roomProject`는 같은 식을 CPU 폴백에 사용한다.
- `roomMesh`는 4.5m 구조 모듈을 구성하고, `roomShift`는 장식 반복 주기인 3칸(13.5m) 단위로만 재배치한다. 벽보·벤치는 카메라가 경계를 넘어도 월드 좌표를 유지하며, 음수 구간에도 같은 장식 패턴을 쓴다. 그림 두 장의 서로 다른 스크롤이 아니므로 벽/바닥 접합부가 분리되지 않는다.
- 셰이더는 목재/회벽 diffuse 재질, 판재 이음선, 법선 방향광·등 주변 밝기·벽 모서리/기둥 접촉 음영. OES_standard_derivatives가 있으면 fwidth로 마루 선을 완화. 배경 DPR은 최대1.5, 전경은 기존 최대2.
- 텍스처는 이미지가 해독되기 전 절차 재질로 시작하고 load 후 GPU에 교체한다. data URL로 내장되어 로컬 파일에서도 안전하게 업로드된다. `ROOM_ATLAS`는 긴 base64 한 줄이므로 파일 읽기는 이 줄을 제외해 좁힐 것.
- `webglcontextlost`는 preventDefault 후 Canvas 폴백으로, `webglcontextrestored`는 프로그램·buffer·texture·extension을 재생성. 지원 자체가 없거나 shader 초기화가 실패해도 판정 루프는 유지된다. 디자인 스모크가 강제 유실/복구와 WebGL 없는 부트까지 검증한다.

### 캐릭터·손 번개 좌표 (2026-09-19)
- 캐릭터 재디자인은 사용자 요청으로 철회했다. ITEMS·drawFighter의 그림은 기존과 같고, 손 좌표 반환만 수정했다.
- `drawFighter` 진입 시 부모 Canvas 행렬을 저장하고 `fighterPoint(parent, current, x, y)`로 손 좌표를 부모 좌표계에 돌려준다. DPR, stageScale, 화면 흔들림을 번개에 두 번 적용하지 않는다. 1P/2P·초풍 자세·터치/데스크톱 배율은 브라우저 회귀 검증에 포함한다.

- 입력 이력(2026-09-21): pushHistory는 원시 이벤트를 입력 시각순으로 삽입해 최근 40개 `frameSlot` 그룹까지 보관한다. 장치 간 늦게 도착한 입력도 같은 슬롯에 합치고 이웃 버튼 간격을 보정한다. 보존 범위보다 오래된 입력은 기존 행의 간격을 바꾸지 않는다. historyRows는 초풍과 같은 60Hz 격자로 그룹화해 마지막 방향 + 중복 없는 번호순 버튼을 한 행으로 출력한다(예: ↘+2). 방향 포함 행은 마지막 방향의 유지 시간, 버튼 전용 행은 그룹 첫 입력의 gap을 표시한다.
  이전 방향의 유지 시간은 다음 그룹의 첫 방향 변화에서 끝난다. 판정용 입력은 그대로다. 80ms 표시는 유지하되 `historyMarkup`이 같으면 DOM을 교체하지 않는다. 입력 패널은 씬 하단 힌트 바로 위까지 flex로 채우고, 목록만 내부 스크롤. 터치는 하단 46% 컨트롤·힌트 공간을 제외한다. 긴 복합 입력은 프레임 숫자와 겹치지 않게 행 안에서 줄바꿈한다.

### 2026-09-19 WSC 순위·랜덤 BGM
- 2026-09-20 리뷰 보완: `bgmApplyTracks`는 경로 중복을 먼저 제거한 목록으로 구성 변경을 비교한다. 중복·순서만 바뀌면 현재 Audio와 대기열을 유지하고, 곡 삭제 시 삭제 경로가 대기열에 남지 않게 재구성한다. 회차 경계·재접속 직전 곡 회피·순서 변경·중복 포함 삭제를 고정 난수 테스트로 검증한다.
- 로컬 N회 도전 보드는 표 하나 `CHALLENGES={wsc:{target:WSC_TARGET,state:()=>wsc.challenge}, giwon:{target:GP_CHALLENGE,state:()=>gp.challenge}}`가 기준이다.
  `BOARDS=[...TRIAL_MODES,...Object.keys(CHALLENGES)]`, `challengeTarget(m)`(아니면 0), `rankingResult()`가 모두 이 표를 읽어 `boardEntry`·`recText`가 두 보드를 같은 모양(score=hits, tie=best)으로 다룬다.
  완주 처리는 `completeChallenge(c,target)` 하나(`wscFinish`·`gpFinish` 공용: status done + result 생성 + `boardSubmit()`). 새 로컬 도전 보드는 이 표에 한 줄 + 워커 `BOARDS` + `#boardTabs` 버튼. 로컬 최고 기록/업적용 `TRIAL_MODES`는 기존 다섯 모드만. `renderBests`도 TRIAL_MODES만 쓴다.
  10번째 평가에서 `wsc.challenge.result={completed:true,window,rec:{hits,target:10,best}}` 생성·등록. `rankingResult()`가 모드별 결과를 반환해 기존 제출/재시도/닉 게이트/삭제 흐름을 재사용한다. 진행/취소 결과는 payload가 없다. 등록/삭제 중 완주 결과는 `submitQueue`에 스냅샷으로 보관하고 `boardDrain()`이 직렬 제출한다. 모드 변경·새 도전이 큐 내용을 바꾸지 않고, 같은 결과는 busy 상태로 중복 예약을 막는다.
  전송 전 닉+토큰이 달라진 예약은 실패 상태로 돌리며 자동 제출하지 않는다. 과거 계정의 늦은 auth 오류가 새 계정을 로그아웃시키지 않게 한다.
- Worker `BOARDS.wsc`: score 0~10, tie 0~10, detail hits/target/best. 정수·score=hits·tie=best·best≤hits·완주 target=10 검증. scores 스키마 그대로, 재배포만 필요. 관리자 도구에 wsc 추가. `BOARDS.giwon`(2026-09-30)도 같은 범위이고 두 보드가 같은 명세 객체 `CHALLENGE_10`을 가리키고, `validate`의 정수·일치 검증은 `BOARDS[board]===CHALLENGE_10`으로 건다.
  순위 UI는 WSC에서도 boardCard를 표시하되 기존 모드 분석 카드는 숨긴다.
- `BGM_TRACKS`는 `bgm/` 폴더의 경로 목록. `tools/update-bgm.js`가 로컬 fallback을 갱신하고 배포에서는 `tools/build-site.js`가 만든 `bgm/playlist.json`을 우선 로드한다. HTTP에서는 목록 응답 전 재생을 보류하고 4초 타임아웃/네트워크·JSON 오류면 fallback을 쓴다. `bgmShuffle`은 Fisher–Yates로 전체 목록을 섞고 `bgmPick`은 경로 대기열 `snd.queue`를 순서대로 소비한다.
  한 바퀴가 끝나면 다시 셔플하며 첫 곡이 직전 곡이면 다른 위치와 교환한다. 목록 순서만 바뀌면 대기열을 보존하고, 곡 구성 변경 시 현재 곡을 제외해 다시 만든다. `store.bgmLast`는 재접속 때 제외할 파일 경로(순서 변경에 안전). `snd.track`/`snd.paused`는 현재 곡/명시적 일시정지. Audio.loop=false, onended→bgmSelect→bgmSync. `bgmNext`는 mute/pause 보존.
  상단 bgm-player에는 bgmBtn/bgmPlay/bgmNext/bgmTrack. 부트 때 Audio 생성 없음, Web Locks 소유·가시성·마스터 음소거 조건 유지.
- 폴더 MP3는 기본 BGM·High Rollers Club·DUOMO DI SIRIO. Moonlit Wilderness는 사용자 요청으로 제외하고 `.sandbox/excluded-bgm/`에 보관. 스모크는 bgm 폴더 전체를 복사하고 HTTP 사운드 검사는 fallback을 비워 manifest 자동 발견을 검증한다.
  Audio URL은 경로 조각별 encodeURIComponent, 곡명은 파일명을 textContent로 표시. 빈 목록은 재생 중지, 한 곡은 반복하며 next 버튼 비활성. 늦은 목록 갱신은 같은 경로의 재생 위치를 보존한다.

- BGM 음량(2026-09-19): tools/measure-bgm.js → FFmpeg loudnorm input_i 측정 → BGM_GAIN 상수 생성. bgmVolume()은 사용자 볼륨×경로별 gain(미측정 기본1), bgmSync마다 반영해 다음 곡/종료/재생 재개/볼륨 변경에 유지. 기준 -19.17 LUFS, High Rollers -11.33dB, DUOMO -8.95dB, 새 Mishima DOJO -11.14dB. 파일 재인코딩 없음.

- 2026-09-19 로컬 리뷰: `resetSession()`은 제거된 세션 버튼 대신 설정의 전체 초기화 전용이다. 모드와 무관하게 session/WSC session/완주 순위 결과/입력 이력/미전송 submitQueue를 지운다. 이미 전송한 서버 요청과 서버 최고 기록은 취소·삭제하지 않는다.

- 2026-09-21 성공 팝: `fx.ewgf(n,popKey)`가 일반/대초/무족초 첫 성공 키를 받는다. n>1은 기존 `pop.streak` 우선. 무족 결과 카드의 최속 구분은 그대로 유지한다.


### 패드 리맵·입력 설정 (2026-09-27)
- 리뷰 보완: `padAutoConflict(keys,slot,code)`를 저장 복원·신규 지정·교환 반대편에 공유한다. 교환은 양쪽을 검증한 뒤에만 저장해 일부 변경을 방지한다. `suspendBindings()`가 blur/hidden/폴링의 포커스 상실 정리를 공유하며 visibilitychange에서 즉시 호출해 백그라운드 타이머 실행에 의존하지 않는다. 키 확인에서도 반복 keydown은 탭 전환을 일으키지 않는다.
- `DEFAULT_KEYS` / `DEFAULT_PAD`와 `store.padKeys`/`store.padAltKeys`(보조 기본값 none): 방향 `auto`(기존 조합)/`none`/`bN`/`aN+/-`/`hu,hd,hl,hr`, 공격 `bN`/`none`. 저장값은 타입·범위·명시적 중복 검증 후 복구하며 잘못된 배치는 기본값으로 돌아간다. 장치별 프로필 없이 브라우저 공통 저장.
- `padInputs`는 버튼·부호별 축·축 9 hat을 입력 토큰으로 변환한다. `pollPad`는 설정 모달에서도 장치를 감지하고 `capturePad`/현재 입력 표시만 실행한다. 연습 때 저장된 방향 → 버튼 순서와 기존 기기 timestamp 판정을 유지한다. 다른 모달에서는 연습·캡처 모두 차단.
- `padCapture{slot,field,previous}`: 변경 클릭 시 현재 입력을 스냅샷하고 이후 새로 눌린 입력만 캡처한다. 중립에서도 -1을 보내는 트리거 축 등 기존 유지 값이 변경을 막지 않는다. 시작 전에 눌린 입력은 해제 후 다시 눌러야 하며 복수 입력 중 하나를 떼는 것으로 남은 입력을 지정하지 않는다. 동일 십자 방향의 알려진 버튼/축/hat 별칭은 한 입력으로 합친다.
  중복 버튼은 호환 가능한 이전 배치와 교환, 자동 방향과 충돌하면 거부. `padNeedsRelease`는 모달·포커스 이탈 후 할당된 입력이 해제될 때까지 판정을 막는다(미지정 축은 복귀를 막지 않음).
- `renderBindings` / `renderKeys`: 설정 최상단 키보드·패드 탭, 기본/보조 키 라벨, 패드 개별 해제, 탭별 확인 후 복원. 대기/저장/충돌 메시지를 `bindingMessage` 번역 키 배열로 보존하고 모달 내 live region에 표시한다. Esc는 먼저 캡처 취소, 그다음 모달 닫기. 닫기/blur/hidden/패드 연결 해제 시 캡처 취소.
- `node tests/smoke-bindings.js`: 모의 Gamepad API + 실제 DOM/키 이벤트로 상시 -1 축·십자키 중복 보고에서의 캡처·교환·해제·충돌·취소·새로고침 저장·복원·입력 복귀 검증. 320/390/1100px × ko/en/ja × 키보드/패드 18개 레이아웃 검증 및 `.sandbox/pad-settings/browser/` 스크린샷. 물리 패드별 입력 지연·비표준 축 배치는 별도 수동 확인.

- 패드 보조 입력(2026-09-27 후속): `padBindingEntries()`가 기본/보조 칸을 함께 다룬다. 두 칸 사이 중복·자동 방향 충돌을 검증하고 호환되는 서로 다른 동작의 칸만 교환한다. 저장값이 없는 기존 사용자는 기본 배치를 보존하며 보조를 none으로 시작한다. 방향은 기본 입력과 보조 입력을 합치되 같은 방향을 두 번 더하지 않고, 공격은 OR 후 `padBtn`과 비교해 모두 해제되기 전까지 1회만 호출한다. 해제 대기·모달 복귀도 보조 입력을 포함한다.
  설정에는 키보드와 같은 2열 카드의 두 칸을 표시하고 선택한 칸을 공통 지우기로 해제하며 패드 기본값 복원 시 두 배치를 함께 초기화한다.

- 입력 설정 UI·자동 장치 전환(2026-09-27 후속): 키보드와 패드가 `.keys`/`.key`/`.key-pair`/`.key-bind` 스타일을 공유한다. 패드의 상시 × 버튼과 전용 1열 스타일은 제거. `bindingClear`는 패드 지정/키보드 보조 지정 중에만 표시하며 `clearBinding()`으로 해당 칸만 비운다. 패드 표시는 B번호/A축부호로 줄이고 전체 이름은 aria-label/title/현재 입력 표시에 유지한다.
- `setBindingDevice(device,automatic)`는 기존 캡처를 취소하고 탭/메시지/포커스를 갱신한다. 설정 중 일반 키 keydown은 키보드로, `bindingPadPrevious{index,id,inputs}` 대비 새 패드 입력은 패드로 전환한다. 최초 장치 감지에서는 버튼만 전환 신호로 인정하고 축은 기준값으로 기록한다. 설정 열기와 지정 시작의 `pollPad(true)`는 현재 누른 입력을 기준으로만 기록하므로 화면을 열자마자 탭이 뒤집히지 않는다.
  유지/해제된 입력과 고정 축은 전환하지 않고, 키 반복·수정키·Tab/Esc·버튼의 Enter/Space·폼 입력은 키보드 자동 전환에서 제외한다. 기존 연습 판정은 동일하며 자동 전환을 일으킨 입력을 설정값으로 저장하지 않는다.

- 키 확인(2026-09-27): `bindingCheck`는 비영속 토글, `bindingCheckHeld`/`bindingCheckPad`는 설정 확인 전용 입력 상태다. 키보드 keydown/keyup과 패드 폴링으로 정확히 일치하는 기본/보조 칸을 `bindingChecked`로 조회하고, `.checked`를 칸과 동작 카드에 적용한다. 키보드 고정 방향키는 지정 칸과 별개로 방향 카드도 강조한다.
  `renderBindingCheck`는 입력 서명이 같으면 DOM 작업을 생략하고 `renderKeys`로 DOM을 교체했을 때만 강제 적용한다. 확인 중 버튼 지정·지우기·기본값 복원은 UI와 함수 가드로 차단하고 연습 입력/통계/저장값은 변경하지 않는다. 기존 자동 탭 전환 유지, 설정 close는 확인 모드 종료, blur/hidden/disconnect는 눌림 표시 정리.
