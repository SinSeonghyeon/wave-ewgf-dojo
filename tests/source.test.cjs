// src/ structure: every script file is included once, parses on its own, and the assembled page has no build markers left.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {assemble, includes, SRC} = require('../tools/assemble');

test('src/app.html includes every script and stylesheet exactly once, and nothing that does not exist', () => {
  const listed = includes();
  assert.equal(new Set(listed).size, listed.length, 'no duplicate include');
  for(const f of listed) assert.ok(fs.existsSync(path.join(SRC, f)), 'included file exists: '+f);
  const onDisk = ['style.css', ...['i18n', 'js'].flatMap(d => fs.readdirSync(path.join(SRC, d)).map(f => d+'/'+f))];
  assert.deepEqual(onDisk.filter(f => !listed.includes(f)), [], 'every src file is included (or deleted)');
});

test('each script file parses on its own (files split only between statements)', () => {
  for(const f of includes().filter(f => f.endsWith('.js'))){
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(SRC, f), 'utf8'), {filename:f}), f);
  }
});

test('script order: dictionaries before the I18N join, boot last', () => {
  const js = includes().filter(f => f.endsWith('.js'));
  assert.ok(js.indexOf('i18n/ja.js') < js.indexOf('js/04-i18n.js'));
  assert.equal(js.at(-1), 'js/36-boot.js');
  const numbered = js.filter(f => f.startsWith('js/'));
  assert.deepEqual(numbered, [...numbered].sort(), 'js/NN-*.js are included in numeric order');
});

test('the assembled page is one self-contained document with no build markers left', () => {
  const html = assemble();
  assert.doesNotMatch(html, /@@include|@@DATA_URI/);
  assert.match(html, /const ROOM_ATLAS='data:image\/webp;base64,UklGR/, 'atlas inlined as a WebP data URI');
  assert.equal((html.match(/<script>/g) || []).length, 1, 'one inline app script');
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /\}\)\(\);\n<\/script>\n?$/, 'the app IIFE closes the page (test and tool hooks patch this spot)');
});

test('the unit harness finds every name of a declaration list and refuses top-level destructuring', () => {
  const {topLevelNames} = require('./helpers/app.cjs');
  assert.deepEqual([...topLevelNames('let W=800, H=f(1,2), dpr=1;\nfunction go(){}\nasync function run(){}\nconst s=`a,b`, t={x:1,y:2};')], ['W','H','dpr','go','run','s','t']);
  assert.throws(() => topLevelNames('const {a,b}=x;'), /destructuring/);
});

test('batch files stay CRLF and preview.cmd keeps cmd redirections', () => {
  // Every batch file, not just this one: .gitattributes only converts on checkout, so a file written LF after it was added
  // (tools/admin.cmd stayed LF in the working tree) passes nowhere else.
  const root = path.join(__dirname, '..');
  const batches = ['.', 'tools'].flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => /\.(?:cmd|bat)$/i.test(f)).map(f => d+'/'+f));
  assert.ok(batches.includes('./preview.cmd') && batches.includes('tools/admin.cmd'), 'batch files found');
  for(const f of batches) assert.doesNotMatch(fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, ''), /\n/, f+': CRLF line endings, cmd misparses LF-only batch files');
  const bat = fs.readFileSync(path.join(root, 'preview.cmd'), 'utf8');
  assert.doesNotMatch(bat, /\/dev\/null/, 'Windows redirects to nul, not /dev/null');
  assert.match(bat, /node tools\\build-site\.js/);
  assert.match(bat, /node tools\\serve\.js --open/, 'preview serves _site/ over HTTP so folder links open index.html like GitHub Pages');
});
