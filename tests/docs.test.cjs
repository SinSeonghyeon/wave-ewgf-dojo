// Documentation guards: decision citations match DECISIONS.md, AGENTS.md summaries stay in step with it,
// paths named in the live docs exist, and CODE_MAP's file map lists every src/ file.
// The Pages deploy job sets SKIP_DOC_CHECKS=1 so a doc wording slip never blocks a site fix; smoke.yml and local runs enforce them.
const {test: nodeTest} = require('node:test');
const test = (name, fn) => nodeTest(name, {skip: process.env.SKIP_DOC_CHECKS === '1' && 'doc checks run in smoke.yml, not in the deploy job'}, fn);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
// Tracked-style sources only: nested dot-folders (worker/.wrangler bundles …) and node_modules are tool output, not ours.
const walk = dir => fs.readdirSync(path.join(ROOT, dir), {withFileTypes:true}).flatMap(e =>
  e.isDirectory() ? (/^\.|^node_modules$/.test(e.name) ? [] : walk(path.join(dir, e.name))) : [path.join(dir, e.name).replace(/\\/g, '/')]);

const DECISIONS = new Map([...read('.agents/docs/DECISIONS.md').matchAll(/^## (\d+)\. ([a-z0-9-]+) — .+$/gm)].map(m => [+m[1], m[2]]));

test('DECISIONS.md numbers decisions 1..N once each, with unique slugs', () => {
  const nums = [...DECISIONS.keys()];
  assert.ok(nums.length >= 31, 'decision headings parsed');
  assert.deepEqual(nums, nums.map((_, i) => i + 1), 'numbers are consecutive from 1 and never reused');
  assert.equal(new Set(DECISIONS.values()).size, DECISIONS.size, 'slugs are unique');
});

test('AGENTS.md summarises every decision under the same number and slug', () => {
  const summary = new Map([...read('AGENTS.md').matchAll(/^(\d+)\. ([a-z0-9-]+) — /gm)].map(m => [+m[1], m[2]]));
  assert.deepEqual([...summary], [...DECISIONS]);
});

// A citation is "결정 N(slug)" / "decision N(slug)", several joined by · or ,: "결정 26(wsc-board)·31(giwon-board)".
// A bare number is refused: numbers alone drifted (code cited 결정 29 for 기원초, which is 30).
const CITE = /(?:결정|[Dd]ecisions?)\s+(\d{1,2}(?![\d-])(?:\([a-z0-9-]+\))?(?:\s*[·,]\s*\d{1,2}(?![\d-])(?:\([a-z0-9-]+\))?)*)/g;
test('code cites design decisions as N(slug) and every slug matches DECISIONS.md', () => {
  const files = [...walk('src'), ...walk('tools'), ...walk('worker'), ...walk('tests'), ...walk('.github')]
    .filter(f => /\.(js|cjs|html|css|sql|toml|yml)$/.test(f) && f !== 'tests/docs.test.cjs');
  const bad = [];
  let count = 0;
  for(const f of files){
    const text = read(f);
    for(const m of text.matchAll(CITE)){
      for(const item of m[1].split(/\s*[·,]\s*/)){
        count++;
        const [, n, slug] = item.match(/^(\d+)(?:\(([a-z0-9-]+)\))?$/);
        if(!slug) bad.push(`${f}: "${m[0]}" needs a slug, e.g. ${n}(${DECISIONS.get(+n) || '?'})`);
        else if(DECISIONS.get(+n) !== slug) bad.push(`${f}: "${m[0]}" — decision ${n} is ${DECISIONS.get(+n) || 'missing'}, not ${slug}`);
      }
    }
  }
  assert.ok(count > 10, 'citations were found');
  assert.deepEqual(bad, []);
});

// Paths in backticks inside the live docs must exist (relative to the repo root, the doc, or .agents/docs).
const LIVE_DOCS = ['AGENTS.md', 'README.md', 'worker/README.md', 'bgm/README.md',
  ...['README', 'PLAN', 'CODE_MAP', 'DECISIONS', 'LOCALIZED_PAGES', 'MERGE_PROCESS'].map(n => `.agents/docs/${n}.md`)];
test('repository paths named in the live docs exist', () => {
  const missing = [];
  for(const doc of LIVE_DOCS){
    for(const [, token] of read(doc).matchAll(/`([^`\s]+)`/g)){
      const p = token.replace(/^\.\//, '').replace(/[:#].*$/, '');
      // Only path-like tokens: something with a folder, or a Markdown doc. A bare `assemble.js` after "tools/" is prose.
      if(!(/\//.test(p) && /\.(md|js|cjs|html|css|json|sql|toml|yml|webp|png|mp3|cmd|bat|command|txt)$|^[\w.-]+\/(?:[\w.-]+\/)*$/.test(p)) && !/^[\w.-]+\.md$/.test(p)) continue;
      if(/[*<>{}%\\]|YYYY|NN-|^https?:|^\/|^_site\/|^\.sandbox\/|^\.agents\/handoffs\/|^\.\.\//.test(p)) continue; // patterns, placeholders, site URLs, generated or scratch
      if(/^(?:ko|en|ja)\/$|(?:^|\/)index\.html$|^bgm\/playlist\.json$/.test(p)) continue; // generated pages and catalog, never in the repo
      const hit = [ROOT, path.join(ROOT, path.dirname(doc)), path.join(ROOT, '.agents/docs'), path.join(ROOT, '.agents/docs/archive'), path.join(ROOT, 'src')]
        .some(base => fs.existsSync(path.join(base, p)));
      if(!hit) missing.push(`${doc}: ${token}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('repository paths cited in code comments exist', () => {
  const files = [...walk('src'), ...walk('tools'), ...walk('worker'), ...walk('tests'), ...walk('.github')].filter(f => /\.(js|cjs|html|css|sql|yml)$/.test(f));
  const missing = [];
  for(const f of files){
    for(const [p] of read(f).matchAll(/\b(?:src|tools|tests|worker)\/[\w./-]+\.(?:js|cjs|html|css|md|sql|webp)\b/g)){
      if(p.includes('*') || /\/NN-/.test(p)) continue;
      if(!fs.existsSync(path.join(ROOT, p))) missing.push(`${f}: ${p}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('CODE_MAP file map lists every src/ file', () => {
  const map = read('.agents/docs/CODE_MAP.md');
  const section = map.slice(map.indexOf('## 파일 지도'), map.indexOf('## 기능별 색인'));
  assert.ok(section.length > 500, 'file map section found');
  const missing = walk('src').filter(f => !section.includes('`'+f+'`') && !section.includes('`'+path.basename(f)+'`'));
  assert.deepEqual(missing, [], 'add a row to the CODE_MAP 파일 지도 for each new src file');
});
