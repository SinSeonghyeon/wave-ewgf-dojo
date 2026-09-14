# 한마디 대댓글 기능 인수인계

## 기준

- 브랜치: `SinSeonghyeon/workspace01`
- 기능 최종 커밋: `f345371042744009108192c4be3470cdefaa77fa` (`feat: add one-level board replies`)
- 인수인계 문서 커밋: 이 문서를 추가하는 브랜치 HEAD. 자기 참조 해시는 문서에 고정할 수 없으므로 정확한 최종 해시는 푸시 결과와 최종 보고에서 확인한다.
- 한 줄 목적: 한마디 원글마다 여러 개의 1단계 대댓글을 작성하고 오래된 순으로 모두 볼 수 있게 한다.

## 합류 순서와 의존성

- 의존 브랜치: 없음. `origin/main`의 현재 게시판·닉네임 토큰·좋아요/싫어요 기능만 전제한다.
- `feature/notices` 안에서는 다른 기능 브랜치와 순서 의존성이 없으므로 임의 순서로 합류할 수 있다.
- 이 브랜치의 공지 초안을 다른 사용자 노출 기능과 한 공지로 합칠지는 통합 담당자가 사용자에게 확인한다.
- `main` 반영이나 사이트 배포보다 D1 스키마 적용과 Worker 배포가 먼저 완료되어야 한다.

## 사용자에게 보이는 변경과 공지

- 각 한마디에 `답글 N` 버튼이 보인다.
- 버튼을 누르면 원글 아래에서 답글을 작성하거나 취소할 수 있다.
- 답글은 원글 아래에 오래된 순으로 전부 표시된다.
- 원글·투표·답글 요청 중에는 충돌하는 게시판 쓰기 버튼이 잠겨 느린 응답이 최신 화면을 덮지 않는다.
- 공지 필요 여부: **예**.

| 언어 | 제목 | 요약 | 항목 |
|---|---|---|---|
| ko | 한마디에 답글 기능 추가 | 이제 한마디 글 아래에서 바로 답글을 남기고 대화를 이어갈 수 있습니다. | 1. 원글마다 여러 답글을 작성할 수 있습니다.<br>2. 답글은 작성된 순서대로 원글 아래에 표시됩니다.<br>3. 원글이 삭제되면 해당 답글도 함께 삭제됩니다. |
| en | Replies added to the shoutbox | You can now reply directly below a shoutbox post and continue the conversation. | 1. Each post can have multiple replies.<br>2. Replies appear below the post in chronological order.<br>3. Deleting a post also removes its replies. |
| ja | ひとことに返信機能を追加 | ひとことの投稿の下から直接返信して、会話を続けられるようになりました。 | 1. 各投稿に複数の返信を書けます。<br>2. 返信は投稿の下に古い順で表示されます。<br>3. 元の投稿を削除すると返信も一緒に削除されます。 |

통합 시 최종 공지 문자열은 `index.html`의 ko/en/ja I18N에 같은 키로 추가하고 `NOTICES` 최신 항목에서 사용한다.

## 사람 작업과 정확한 배포 순서

이 브랜치에서는 실서버 D1 변경과 Worker 배포를 실행하지 않았다. 사이트 코드가 먼저 배포되면 답글 버튼이 실패하고, Worker가 스키마보다 먼저 배포되면 `/posts`가 `replies` 테이블 없음 오류를 낼 수 있다.

1. `feature/notices`에서 이 브랜치를 합류하고 전체 검증을 끝내되 아직 사이트를 배포하지 않는다.
2. 사용자가 `worker/`에서 원격 D1에 멱등 스키마를 적용한다.

   ```powershell
   cd worker
   npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql
   ```

3. `--file`이 401(code 10000)로 거부될 때만 `worker/schema.sql`의 다음 두 문장을 `--command`로 순서대로 실행한다.
   - `CREATE TABLE IF NOT EXISTS replies (...)`
   - `CREATE INDEX IF NOT EXISTS replies_post_id ON replies (post_id, id)`
   정확한 전체 문장은 `worker/README.md`에 있다.
4. 같은 `worker/` 디렉터리에서 Worker를 배포한다.

   ```powershell
   npx wrangler@latest deploy
   ```

5. `/posts` 응답의 각 원글에 `"replies":[]`가 포함되는지 확인하고, 시험 원글에 답글 하나를 등록해 배열에 추가되는지 확인한다.
6. 그 뒤에만 통합 브랜치의 사이트 변경을 `main` 배포 절차로 반영한다.

별도 데이터 변환 마이그레이션은 없다. 기존 행을 수정하지 않고 `replies` 테이블과 인덱스만 추가한다. 비밀값이나 토큰 변경도 없다.

## 충돌 예상 지점

- `index.html`: 게시판 CSS(`.post-actions`, `.reply-*`), ko/en/ja `posts.reply*`, `live`, `postsLoad`, `setPosts`, `renderPosts`, `postVote`, `replySend`, `postSend`. 공지 브랜치의 I18N/`NOTICES` 변경과 같은 단일 파일에서 충돌할 가능성이 높다.
- `worker/index.js`: `posts()`, `/reply` 라우트, 관리자 `DELETE /posts/:id` 정리.
- `worker/schema.sql`, `worker/wrangler.toml`, `worker/README.md`: `replies` 스키마와 원글+답글 공용 `POST_LIMIT`, 배포 순서.
- `tests/board.test.cjs`, `tests/dojo.test.cjs`, `tests/fake-d1.js`, `tests/smoke-chrome.js`: API 계약·경합·브라우저 흐름.
- `AGENTS.md`, `.agents/docs/PLAN.md`, `.agents/docs/CODE_MAP.md`, `README.md`: 설계 결정 20과 사용자 문서. 통합 담당자가 여러 브랜치의 최종 문서 상태를 한 번 정리한다.
- `tools/board-admin.js`: 관리자 한마디 목록에서 대댓글을 원글 아래에 출력한다.

## 병합 시 반드시 보존할 동작

- 답글은 1단계만 허용하고 재대댓글 UI/API를 만들지 않는다.
- 최신 원글 50개는 최신순, 각 원글의 모든 답글은 오래된 순으로 표시한다.
- 답글 인증·본문 정규화와 1~200자 검증은 원글과 동일하게 유지한다.
- 원글과 답글은 IP당 합계 1분 3개의 같은 `POST_LIMIT` 버킷을 쓴다.
- `/posts`의 답글 조회는 첫 원글 SELECT에서 실제로 얻은 ID 집합을 사용한다. 두 SELECT 사이에 새 원글이 생겨도 50번째 원글의 답글을 잃으면 안 된다.
- `/reply`의 부모 확인과 삽입은 원자적 `INSERT … SELECT … WHERE EXISTS` 한 문장이어야 한다.
- 관리자 원글 삭제는 표와 답글을 모두 정리하며, 삭제와 답글 삽입이 경합해도 고아 답글을 남기지 않는다.
- 원글·투표·답글 쓰기는 `postsMutating()`으로 서로 직렬화하고, `postsSeq`가 먼저 시작한 낡은 `/posts` 응답의 화면 덮어쓰기를 막는다.
- 닉네임이 없으면 기존 닉네임 게이트를 열고, 인증 상실·레이트 리밋·삭제된 원글 오류 처리를 유지한다.
- 사용자 노출 문자열은 ko/en/ja I18N 키 집합을 동일하게 유지한다.

## 테스트 결과와 알려진 실패

- `node --test tests/dojo.test.cjs tests/board.test.cjs`: **통과, 97/97** (2026-09-15).
  - 다중 답글·시간순 정렬·인증·검증·공용 레이트 리밋·원글 삭제를 검증한다.
  - 새 원글이 두 조회 사이에 끼는 경합, 부모가 원자 삽입 직전에 삭제되는 경합, 투표와 답글 요청 경합을 검증한다.
- `git diff --check`: 오류 없음. Windows 작업 트리의 LF→CRLF 안내만 출력됨.
- `node tests/smoke-chrome.js`: **실패** (2026-09-15).
  - 최종 요청 실행은 보상 팝업 확인 직후 `Runtime.evaluate document.querySelector('#jackpot').hidden && document.querySelector('#rewardOpen').disabled`가 15초 안에 응답하지 않아 CDP 타임아웃.
  - 앞선 깨끗한 재실행에서는 후원창을 연 채 14.5초 대기한 뒤 상태를 읽는 `Runtime.evaluate`에서 같은 CDP 타임아웃.
  - 두 경우 모두 게시판 assertion 실패나 수집된 앱 JS 예외가 나오기 전 자동화 통신이 멈췄다. 실패한 테스트 전용 포트 9333 Chrome은 정리했다.
- 알려진 미완료: 실서버 D1 스키마 적용, Worker 재배포, 실사이트 수동 확인, 통합 공지 반영.

## 바뀐 설계 결정과 문서

- `AGENTS.md` 설계 결정 20에 한마디 대댓글 계약을 추가했다.
- `.agents/docs/PLAN.md`의 한마디 하위 항목을 완료 처리하고 구현·리뷰 경합 수정 로그를 추가했다.
- `.agents/docs/CODE_MAP.md`에 프런트 요청 직렬화, API 응답 shape, Worker의 원자 삽입과 부모 ID 조회 규칙을 기록했다.
- `README.md`와 `worker/README.md`에 사용자 기능 및 운영·배포 절차를 반영했다.

## 합류 후 브라우저 수동 확인

1. 닉네임을 가진 상태에서 한마디 원글의 `답글 0`을 눌러 입력창이 열리고 취소가 동작하는지 확인한다.
2. 1자와 200자 답글은 등록되고 빈 글과 201자 글은 거부되는지 확인한다.
3. 같은 원글에 서로 다른 닉네임으로 여러 답글을 달아 오래된 순으로 모두 보이는지 확인한다.
4. 답글 등록 후 새로고침해도 답글이 유지되는지 확인한다.
5. 관리자 도구에서 원글과 중첩 답글이 보이고, 원글 삭제 후 답글도 사라지는지 확인한다.
6. 네트워크를 Slow 3G로 제한해 투표 중 답글·원글 버튼, 답글 중 투표·원글 버튼이 잠겼다가 응답 후 다시 활성화되는지 확인한다.
7. ko/en/ja 전환 시 답글 수·입력 placeholder·등록·취소·오류 문구가 모두 번역되는지 확인한다.
8. 데스크톱과 390px 모바일에서 답글 목록과 입력 폼이 가로로 넘치지 않는지 확인한다.
9. 기존 좋아요/싫어요 취소·변경, 최신 원글 50개, 1분 자동 새로 고침이 그대로 동작하는지 확인한다.
