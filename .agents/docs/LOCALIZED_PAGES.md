# 언어별 연습 화면 배포

2026-09-21. 원본 앱은 `index.html` 하나다. `node tools/build-site.js`가 `_site/`에 `/`·`/ko/`·`/en/`·`/ja/` 앱과 정적 자원을 생성한다. `_site/`는 생성물이라 커밋하지 않는다. 종전 `en/index.html`·`ja/index.html` 소개 페이지와 Jekyll BGM 템플릿은 제거했다.

- `/`: 기존 브라우저 언어 감지·저장 언어 우선 동작 유지. `?lang=`은 기존처럼 한 번 적용하며 다른 쿼리·해시는 보존한다.
- `/ko/`, `/en/`, `/ja/`: 주소의 언어가 브라우저·저장 언어·옛 `?lang=`보다 우선. 검색용 최초 HTML도 해당 언어의 제목·설명·본문·JSON-LD를 제공한다.
- 언어별 화면에서 언어 버튼을 누르면 `replaceState`로 주소와 화면을 함께 바꾸고 현재 연습은 유지한다. 새로고침은 새 언어 주소를 연다. 루트에서는 언어 버튼이 주소를 바꾸지 않는다.
- 같은 출처의 기존 localStorage 키를 그대로 사용하므로 닉네임·토큰·기록·업적·설정은 공유된다. 사운드·QR·아이콘은 루트 자원을 함께 쓴다.
- canonical은 페이지 자신의 주소, hreflang은 ko/en/ja 각각의 주소와 x-default 루트로 통일한다. 사이트맵은 4개 주소를 포함한다.
- 빌드는 공개 자원만 복사하며 Worker·테스트·문서·임시 파일은 배포하지 않는다. Google·네이버 확인 파일과 CNAME은 그대로 복사한다. BGM은 `tracksAt`으로 매번 새 목록을 만든다.

## 사용자가 한 번 할 일

1. 커밋·푸시 **전에** 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꾼다. Custom domain은 `mishimaryu.com` 그대로 두고 DNS·Worker 설정은 변경하지 않는다. 기존 공개 사이트는 새 배포가 완료될 때까지 남는다.
2. 준비된 파일을 커밋하고 main에 푸시한다. `.github/workflows/pages.yml`이 단위 테스트 → 언어별 HTML/BGM 생성 → Pages 배포를 수행한다.
3. **Actions → Deploy localized dojo**의 build/deploy 성공을 확인한다. 이미 푸시한 뒤 Source를 바꿨다면 같은 화면에서 **Run workflow → main**으로 다시 실행한다.
4. `/ko/`·`/en/`·`/ja/` 각각을 열어 소개 페이지 없이 연습 화면이 바로 표시되고 주소와 언어가 맞는지 확인한다. 언어 버튼 → 주소 변경 → 새로고침을 확인한다. 기존 닉네임·기록도 확인한다.
5. Google Search Console에서 `https://mishimaryu.com/sitemap.xml`을 다시 제출하고 `/ko/`·`/en/`·`/ja/` 및 루트를 URL 검사 → 실제 URL 테스트 → 색인 생성 요청한다. 수집 HTML의 제목·본문 언어와 canonical이 각 주소에 맞는지 확인한다.
6. 네이버 서치어드바이저에도 같은 사이트맵을 제출하고 언어별 URL 수집을 요청한다. 기존 소유권 확인 파일은 보존된다.

Worker 재배포·DB 마이그레이션은 없다. 검색 결과 반영은 검색엔진의 재수집 이후이며 즉시 변경되거나 특정 순위가 보장되는 것은 아니다.

## 로컬 확인

```sh
node --test tests/dojo.test.cjs tests/board.test.cjs
node tests/smoke-chrome.js
node tests/smoke-locales.js
node tools/build-site.js
python -m http.server 8080 --directory _site
```

`http://localhost:8080/ko/`·`/en/`·`/ja/`를 연다. 빌드할 때 기존 `_site`는 교체되므로 직접 편집하지 않는다. 언어별 스모크는 빌드 결과를 로컬 HTTP로 제공하고 백엔드는 비활성화한다. JavaScript 없는 초기 HTML, 영어 브라우저/저장 언어 충돌, 언어 전환·새로고침·연습 세션·공유 저장소·미디어 경로를 검증한다. 실제 GitHub Actions 실행·운영 검색 색인은 로컬 검증 범위 밖이다.

참고: [GitHub Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Google 다국어 사이트 안내](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
