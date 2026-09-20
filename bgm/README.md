# BGM 추가·삭제

이 폴더에 MP3를 넣고 커밋·푸시하면 GitHub Pages가 배포하면서 재생목록을 자동 생성합니다. 곡을 빼려면 이 폴더에서 제거하세요. 사이트를 새로 열면 새 목록을 읽습니다. `playlist.json`은 자동 목록을 만드는 템플릿이므로 직접 편집하지 마세요.

- 이 폴더 바로 안의 `.mp3` / `.MP3` 파일만 사용합니다. 하위 폴더는 제외합니다.
- 파일명이 곡 제목으로 표시됩니다. 공백·한글·일본어를 지원합니다. 파일명 첫 글자에 `.`, `_`, `#`는 쓰지 마세요(GitHub Pages 제외 규칙).
- 접속할 때 전체 목록을 섞어 순서대로 재생하며, 한 바퀴 안에서는 곡이 중복되지 않습니다. 다음 곡 버튼도 같은 순서를 따릅니다. 전곡 재생 후 다시 섞고 직전 곡과 연속되지 않게 하며, 재접속 첫 곡도 직전 곡을 피합니다. 한 곡이면 반복하고, 빈 폴더면 BGM만 멈춥니다.
- 현재 목록: `bgm.mp3`, `Tekken 6 Soundtrack High Rollers Club.mp3`, `TEKKEN 7 鉄拳7 DUOMO DI SIRIO.mp3`, `Tekken 7 OST  Mishima DOJO.mp3`, `TEKKEN 7 鉄拳7 Infinite Azure - Round 1 (Moonsiders 1st).mp3`.

로컬에서 `index.html`을 직접 열거나 일반 정적 서버로 미리 볼 때는 파일을 추가·삭제한 뒤 루트에서 한 번 실행하세요:

```sh
node tools/update-bgm.js
```

이 명령은 `index.html`의 로컬 미리보기 목록만 갱신합니다. 배포된 사이트는 폴더에서 생성된 `bgm/playlist.json`을 우선 사용하므로 목록을 코드로 관리할 필요가 없습니다. GitHub Pages의 기존 main/root + Jekyll 배포를 유지해야 하며 `.nojekyll`을 추가하면 자동 생성이 중단됩니다.

구현 근거: [GitHub Pages와 Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll), [Jekyll site.static_files](https://jekyllrb.com/docs/variables/).

## 곡 사이 음량 맞추기

기본 `bgm.mp3`의 전체 곡 평균 청감 음량(-19.17 LUFS)을 기준으로 다른 곡의 재생 음량을 낮춥니다. 원본 MP3는 변경하지 않습니다. 사용자가 설정한 BGM 볼륨에 곡별 보정값을 곱하며 효과음에는 영향을 주지 않습니다.

| 곡 | 측정 음량 | 재생 보정 |
|---|---:|---:|
| bgm.mp3 | -19.17 LUFS | 그대로 |
| High Rollers Club | -7.84 LUFS | -11.33 dB |
| DUOMO DI SIRIO | -10.22 LUFS | -8.95 dB |
| Mishima DOJO | -8.03 LUFS | -11.14 dB |
| Infinite Azure - Round 1 (Moonsiders 1st) | -10.21 LUFS | -8.96 dB |

새 곡 추가 또는 음원 교체 후 음량도 맞추려면 FFmpeg가 설치된 환경에서 아래를 실행하세요. 곡 전체를 분석하므로 잠시 걸립니다. 측정되지 않은 곡은 재생목록에는 자동 추가되지만 음량 보정은 적용되지 않습니다. 기준보다 조용한 곡은 증폭하지 않습니다.

```sh
node tools/update-bgm.js
node tools/measure-bgm.js
```
