# worker/ — 주간 순위 백엔드 (Cloudflare Worker + D1)

앱(`index.html`)은 `fetch`로 이 Worker의 `/top`, `/submit`만 호출한다. 앱 본체는 여전히 단일 파일이고, 이 폴더는 별도 배포 코드다.

## 현재 상태 (2026-09-12)

- 배포 주소: `https://mishima-dojo-board.mishima-dojo.workers.dev` (`index.html`의 `BOARD_URL`)
- 계정: 사용자 소유 Cloudflare 계정. D1 `mishima-dojo-board`(APAC, id는 `wrangler.toml`에 기입됨), workers.dev 서브도메인 `mishima-dojo`.
- 아래 "처음 한 번"은 이미 끝났다. 다른 PC에서 배포하려면 `npx wrangler login`만 다시 하면 된다.

## 이후 코드 수정 시

```powershell
cd D:\dojo\worker
npx wrangler@latest deploy
```

스키마가 바뀌면 `npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql`을 다시 실행한다(`IF NOT EXISTS`라 안전). 배포 직후 몇 초는 루트 `/`가 Cloudflare 오류 1042를 돌려줄 수 있는데 곧 사라진다.

확인: `https://mishima-dojo-board.mishima-dojo.workers.dev/` → `{"ok":true,...}`, `/top?board=wave10` → 순위표 JSON.

## 처음 한 번 (이미 완료. 새 계정에 다시 세울 때만)

Cloudflare 무료 계정을 만들고 **이메일 인증**을 마친 뒤(인증 전에는 deploy가 code 10034로 거부된다) 이 폴더에서 순서대로 실행한다. wrangler는 `npx`로 받아 쓰며 저장소에 설치하지 않는다.

```powershell
cd D:\dojo\worker
npx wrangler@latest login                                   # 브라우저가 열리면 허용
npx wrangler d1 create mishima-dojo-board                   # 출력된 database_id로 wrangler.toml의 값을 바꾼다
npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql
npx wrangler deploy                                         # 마지막 줄의 주소로 index.html의 BOARD_URL을 바꾼다 (끝에 / 없이)
```

workers.dev 서브도메인이 없으면 deploy가 멈춘다. 대시보드 Workers & Pages를 처음 열면 자동 생성되고, 또는 API `PUT /accounts/{account_id}/workers/subdomain` `{"subdomain":"이름"}`으로 등록할 수 있다(wrangler의 OAuth 토큰은 `%APPDATA%\xdg.config\.wrangler\config\default.toml`).

## 설계

- 주간 키 `week` = 해당 주 월요일 날짜(KST). 월요일 0시 KST에 조회에서 빠지며 지난 기록은 지우지 않는다.
- 보드 3개: `wave10`(score=대시/초, tie=최고 연속), `ewgf20`(score=성공률, tie=−|평균 오프셋|), `combo10`(score=성공률, tie=드릴 중 평균 대시/초).
- 순위 = 자기보다 (score, tie)가 높은 기록 수 + 1. 동점은 같은 순위. 응답은 상위 20 + 전체 참가자 수.
- 치팅 방지 없음(2026-09-12 사용자 결정). 형식·범위 검사만 한다. 인증·쿠키 없음, CORS `*`. 본문 2000자 초과는 413.
- 무료 한도: 요청 10만/일, D1 쓰기 10만 행/일. 방치해도 정지되지 않는다.
- 테스트: `node --test tests/board.test.cjs` (가짜 D1 `tests/fake-d1.js`로 핸들러를 직접 호출). 스모크 테스트는 같은 핸들러를 로컬 http로 감싸 실제 브라우저에서 등록·조회를 돈다.
