// 결정 39(replay): a 도전 모드 run recorded on one engine plays back to the same result on a fresh engine in the replay window (?replay=1),
// whatever the playback's frame cadence. Also: the replay window writes nothing and takes no live input; ▶ on a board row opens the dialog.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {boot, dash, F, fr, bdOut, bdSet, backend} = require('./helpers/app.cjs');
const worker = () => import(pathToFileURL(path.join(__dirname, '../worker/index.js')).href);
const plain = x => JSON.parse(JSON.stringify(x));

// One frame of frame(): the recorder / replay hook first, then the ticks (35-dojo3d.js). `dummy` also runs the bag (rush30 respawns).
function frameAt(a, t, dummy = false){ a.time(t); a.replayFrame(t); a.tick(t); a.trialTick(t); if(dummy) a.updateDummy(t); }
// Live run: 시작 at t0, the countdown's three timer callbacks, GO at t0+3000 (+ jitter like a real interval), then play(a) with frames
// every `step` ms from GO until the trial is over. Returns the finished result.
function liveRun(a, mode, play, {t0 = 1000, jitter = 3.7, step = F, phase = 5.3, dummy = false, before = null, during = null} = {}){
  a.setMode(mode); if(before) before(a, t0); a.time(t0); a.startTrial();
  const cd = a.timers.get(a.trial.cdTimer); a.time(t0 + 1000); cd(); if(during) during(a, t0); a.time(t0 + 2000); cd(); a.time(t0 + 3000 + jitter); cd();
  const go = a.trial.tStart; assert.equal(a.trial.running, true);
  const inputs = play(a, go); // [{t, fn}] in arrival order; a frame runs whenever the clock passes it
  let next = go + phase;
  for(const {t, fn} of inputs){ while(next <= t){ frameAt(a, next, dummy); next += step; } a.time(Math.max(t, next - step)); fn(); }
  while(a.trial.running){ frameAt(a, next, dummy); next += step; }
  return a.trial.result;
}
// Playback: a fresh engine in the replay window, the run posted by the parent, frames every `step` ms until the end message.
function playBack(replay, {step = F, phase = 0, dummy = false, saved, onFrame = null} = {}){
  const posted = [], parent = {postMessage: m => posted.push(m)}, writes = [], fetches = [];
  const b = boot(saved, (...args) => { fetches.push(args); return new Promise(() => {}); }, {
    location: {search: '?replay=1', pathname: '/ko/', hash: '', origin: 'https://mishimaryu.com', protocol: 'https:'}, URLSearchParams,
    window: {parent, history: {replaceState(){}}},
    localStorage: {getItem: () => saved === undefined ? null : JSON.stringify(saved), setItem: (k, v) => writes.push(v)},
  });
  assert.equal(b.REPLAY, true);
  assert.deepEqual(posted.map(m => m.type), ['mishima-replay-ready'], 'the window asks its parent for the run');
  b.time(50000 + phase);
  b.events.message({source: parent, origin: 'https://mishimaryu.com', data: {type: 'mishima-replay', data: plain(replay)}});
  assert.ok(b.player.run, 'loaded');
  let t = b.player.run.base - 3 * step;
  for(let n = 0; n < 1e5 && !posted.some(m => m.type === 'mishima-replay-end'); n++){ frameAt(b, t, dummy); if(onFrame) onFrame(b); t += step; }
  return {b, end: posted.find(m => m.type === 'mishima-replay-end'), posted, writes, fetches};
}
const ev = (t, fn) => ({t, fn});

test('replay: wave10 — the same dashes and chain on another frame cadence, a late frame tick carried in the recording', () => {
  const a = boot();
  const result = liveRun(a, 'wave10', (a, go) => {
    const list = [];
    let t = go + 40;
    for(let i = 0; i < 18; i++){ // 6N23 6 N 6N23 … (cancel 6, N, then the next 6N23) with uneven gaps, some inside one 60Hz slot
      const g = 17 + (i % 5) * 3.3;
      for(const d of i ? ['f','n','f','n','d','df'] : ['f','n','d','df']){ const at = t; list.push(ev(at, () => a.onDir(d, at))); t += g; }
      t += 9 + (i % 3) * 7;
    }
    list.push(ev(t + 900, () => a.onButton(2, t + 900)));
    return list;
  }, {step: F, phase: 2.1, before: a => a.onDir('f', 990), during: (a, t0) => { for(const [k, d] of ['n','d','df','f','n'].entries()) a.onDir(d, t0 + 1100 + k * 25); }}); // 6 held at 시작, a warm-up dash in the countdown
  const rec = result.rec, replay = result.replay;
  assert.ok(rec.dashes > 10, 'the run dashed'); assert.ok(replay && replay.board === 'wave10'); assert.equal(replay.init, 1 * 9 + 0, 'held 6 (and n before it) at 시작');
  assert.ok(replay.ev.length > 100);
  for(const cadence of [{step: F, phase: 0}, {step: 1000/144, phase: 3.3}, {step: 1000/30, phase: 11}]){
    const {b, end} = playBack(replay, cadence);
    assert.deepEqual([b.trial.result.rec.dashes, b.trial.result.rec.chain, b.trial.result.rec.score], [rec.dashes, rec.chain, rec.score], JSON.stringify(cadence));
    assert.equal(end.score, rec.score); assert.equal(end.tie, rec.chain);
  }
  // an input read after a frame that already ran past its time takes that frame tick along
  const c = boot(); c.setMode('wave10'); c.time(1000); c.startTrial();
  frameAt(c, 1200); c.time(1205); c.onDir('d', 1195);
  assert.deepEqual(plain(c.recorder.run.ev.slice(-4).filter((x, i) => i % 2)), [32, 3], 'TICK (32) then d (3)');
});

test('replay: an input exactly on a 60Hz slot boundary (a 0.1ms browser clock lands on one every 50ms) keeps the slot the live run judged', () => {
  const a = boot();
  const result = liveRun(a, 'wave10', (a, go) => {
    const list = []; let t = go + 50;
    for(let k = 0; k < 24; k++){
      const B = Math.ceil((t - 25) / 50) * 50 + 25; // the next exact half-frame boundary, in whole ms
      for(const [at, dir] of [[B-60,'f'], [B-40,'n'], [B-20,'d'], [B,'df']]) list.push(ev(at, () => a.onDir(dir, at)));
      list.push(ev(B+5, () => a.onButton(2, B+5)), ev(B+40, () => a.onDir('n', B+40))); // RP 5ms after the d/f: same slot or the next, by the boundary
      t = B + 300;
    }
    return list;
  });
  const verdicts = r => r.attempts.map(x => x.kind+':'+x.frameOff).join(' ');
  assert.ok(result.attempts.length >= 20, 'the run made its tries');
  for(const cadence of [{step: F, phase: 0}, {step: 1000/144, phase: 3.3}, {step: 1000/30, phase: 11}]){
    const {b} = playBack(result.replay, cadence);
    assert.equal(verdicts(b.trial.result), verdicts(result), JSON.stringify(cadence));
  }
});
test('replay: bd10 — a 1(↙) exactly half a frame after the output (125·175·225ms on a 0.1ms clock) replays to the same distance (review 2026-10-17)', () => {
  const r1 = x => Math.round(x * 10) / 10;
  for(const X of [125, 175, 225]){
    const a = boot();
    const result = liveRun(a, 'bd10', (a, go) => {
      const list = []; let t = r1(go + 30);
      for(let k = 0; k < 14; k++){ // 4 N 4 → out at o → 1 at o+X: X ≡ 25 mod 50 is a .5 frame, which the slot-edge move in recPush must not tip
        const s = t, n = r1(s + 33.3), o = r1(s + 66.6), c = r1(o + X);
        list.push(ev(s, () => a.onDir('b', s)), ev(n, () => a.onDir('n', n)), ev(o, () => a.onDir('b', o)), ev(c, () => a.onDir('db', c)));
        t = r1(c + 33.3);
      }
      list.push(ev(t, () => a.onDir('n', t)));
      return list;
    }, {t0: 1000.3, jitter: 3.7});
    assert.ok(result.rec.dashes >= 10, X+': backdashes came out');
    for(const [phase, step] of [[0, F], [1.1, F], [2.2, 1000/144], [3.3, 1000/120], [5.5, 1000/144], [7.7, 1000/30]]){
      const {b} = playBack(result.replay, {step, phase});
      assert.equal(+b.trial.result.rec.score, +result.rec.score, X+'ms, cadence '+step.toFixed(2)+' phase '+phase);
    }
  }
});
test('replay: bd10 — the same distance, very-fast sets and chain; chords and the held direction survive', () => {
  const a = boot();
  const result = liveRun(a, 'bd10', (a, go) => {
    const list = [];
    let o = null;
    list.push(ev(go + 30, () => { o = bdOut(a, go + 30); }));
    for(let k = 0; k < 9; k++) list.push(ev(go + 400 + k * 330, () => { o = bdSet(a, o, 12 + (k % 3), 2, 2, 2); }));
    list.push(ev(go + 4000, () => { a.pads([]); a.onButton(1, go + 4000); }));
    return list;
  }, {step: 1000/120, phase: 1});
  const rec = result.rec;
  assert.ok(rec.dashes >= 5, 'backdashes came out: '+rec.dashes);
  const {b, end} = playBack(result.replay, {step: F, phase: 7});
  assert.deepEqual(plain(b.trial.result.rec).score, rec.score); assert.equal(b.trial.result.rec.top, rec.top); assert.equal(b.trial.result.rec.chain, rec.chain);
  assert.equal(end.score, rec.score);
  assert.equal(b.recButton(b.recCode('1+2')), '1+2'); assert.equal(b.recButton(b.recCode(2)), 2); assert.equal(b.recButton(b.recCode('1+3+4')), '1+3+4');
});

test('replay: rush30 — the seeded dummy order and the recorded hits give the same points on a screen of another width', () => {
  const a = boot({v:4, lang:'en'}), seen = [];
  const result = liveRun(a, 'rush30', (a, go) => {
    const list = [];
    let t = go + 50;
    for(let k = 0; k < 9; k++){
      const at = t;
      list.push(ev(at, () => { // the right move for the dummy it sees; every third one is left out of reach
        const type = a.world.dummy.type; seen.push(type); if(k % 3 !== 2) a.world.dummyX = a.world.charX + 60 * a.store.side;
        if(type === 'mid'){ a.onDir('f', at); a.onDir('n', at + 20); a.onDir('f', at + 40); a.onButton(2, at + 100); }
        else if(type === 'low'){ dash(a, at); a.onButton(4, at + 100); }
        else { dash(a, at); a.onButton(2, at + 61); }
      }));
      t += 900;
    }
    return list;
  }, {dummy: true});
  const rec = result.rec, replay = result.replay;
  assert.ok(Number.isSafeInteger(replay.seed)); assert.equal(replay.hits.length, rec.kills + rec.whiffs);
  assert.ok(rec.kills > 0 && rec.whiffs > 0, `a mix of hits and whiffs: ${rec.kills}/${rec.whiffs}`);
  const {b, end} = playBack(replay, {step: 1000/144, phase: 2, dummy: true});
  const got = b.trial.result.rec;
  assert.deepEqual([got.score, got.kills, got.whiffs, got.dashPts], [rec.score, rec.kills, rec.whiffs, rec.dashPts]);
  assert.equal(end.score, rec.score);
  // the dummy order is a pure function of the seed
  // a hidden tab plays in late bursts: a recorded hit can come due before the frame that spawns the next dummy — it still lands on that next one
  const struck = seen.filter((_, i) => replay.hits[i] === '1'), hitTypes = []; let used = 0;
  const burst = playBack(replay, {step: 400, phase: 7, dummy: true, onFrame: b => { const r = b.player.run; for(; used < r.hit; used++) if(r.hits[used] === '1') hitTypes.push(b.world.dummy.type); }});
  assert.deepEqual(hitTypes, struck, 'each recorded hit lands on the dummy the live run hit'); assert.equal(burst.end.score, rec.score);
  const order = s => { const g = a.rushSeed(s); return Array.from({length: 6}, () => Math.floor(g() * 3)); };
  assert.deepEqual(order(replay.seed), order(replay.seed)); assert.notDeepEqual(order(1), order(2));
  assert.equal(seen[0], a.DUMMY_TYPES[Math.floor(a.rushSeed(replay.seed)() * a.DUMMY_TYPES.length)], 'the first dummy came from the seed');
});

test('replay: the settings that judge (character, move toggles) travel with the run; a switched-off board records nothing', async () => {
  const w = await worker();
  const a = boot({v:4, moves:{kazuya:{ewgf:1, mist:1, tongbal:1, hellsweep:0, giwon:0}}});
  const result = liveRun(a, 'wave10', (a, go) => [ev(go + 100, () => dash(a, go + 100))]);
  assert.deepEqual(plain(result.replay.moves), {ewgf:1, mist:1, tongbal:1, hellsweep:0, giwon:0}); assert.equal(result.replay.char, 'kazuya');
  assert.ok(w.cleanReplay(plain(result.replay), 'wave10'));
  const {b} = playBack(result.replay, {saved: {v:4, char:'hwoarang'}}); // the viewer plays Hwoarang with every move on
  assert.equal(b.charId(), 'kazuya'); assert.equal(b.store.moves.kazuya.hellsweep, 0);
  const off = boot(); off.setMode('ewgf20'); off.startTrial(); assert.equal(off.recorder.run, null, '초풍 20회 is off (결정 38(challenge-mode))');
  const cancelled = boot(); cancelled.setMode('wave10'); cancelled.startTrial(); assert.ok(cancelled.recorder.run); cancelled.setMode('free'); assert.equal(cancelled.recorder.run, null, 'a cancelled run drops its recording');
});

test('replay window: writes nothing, sends nothing, ignores live input and pops no dialog at the end', () => {
  const a = boot();
  const result = liveRun(a, 'wave10', (a, go) => [ev(go + 100, () => dash(a, go + 100))]);
  const saved = {v:4, lang:'ko', nick:'viewer', nickToken:'ab'.repeat(24)};
  const {b, writes, fetches, posted} = playBack(result.replay, {saved});
  assert.deepEqual(writes, [], 'no localStorage write');
  assert.deepEqual(fetches, [], 'no request: no board submit of the replayed run under the viewer\'s nickname');
  assert.equal(b.trial.openTimer, null, 'no result card');
  assert.equal(b.get('boardCard').hidden, true); assert.equal(b.get('postsCard').hidden, true);
  const before = b.history.length;
  b.events.keydown({code:'KeyD', timeStamp:99999, preventDefault(){}, target:null}); b.events.blur();
  assert.equal(b.history.length, before, 'keys do nothing here');
  assert.ok(posted.some(m => m.type === 'mishima-replay-end'));
  assert.equal(b.history.length, 4, 'the inputs of the run are in the ledger');
  const parent = {postMessage(){}}, c = boot(undefined, undefined, {location:{search:'?replay=1', pathname:'/', hash:'', origin:'https://mishimaryu.com'}, URLSearchParams, window:{parent}});
  c.events.message({source: {}, origin: 'https://mishimaryu.com', data: {type:'mishima-replay', data: plain(result.replay)}});
  assert.equal(c.player.run, null, 'a message from anyone but the parent is ignored');
  c.events.message({source: parent, origin: 'https://evil.example', data: {type:'mishima-replay', data: plain(result.replay)}});
  assert.equal(c.player.run, null, 'another site framing ?replay=1 cannot feed it a run');
  c.events.message({source: parent, origin: 'https://mishimaryu.com', data: {type:'mishima-replay', data: plain(result.replay)}});
  assert.ok(c.player.run, "this site's own page can");
});

test('replay dialog: ▶ only on rows that kept one, fetches /replay on click, mounts the window and reports the end', async () => {
  const be = backend(), a = boot({v:4, lang:'ko', nick:'me', nickToken:'ab'.repeat(24)}, be.fetch, {location:{pathname:'/ko/', search:'', hash:''}, URLSearchParams});
  const row = {id:7, rank:1, nick:'top', score:8.4, tie:30, detail:{dashes:84, chain:30}, win:12, created_at:1, replay:true};
  const plainRow = {...row, id:8, rank:2, nick:'nope', replay:false};
  be.answer('/top?board=wave10', 'GET', {season:'all', board:'wave10', total:2, rows:[row, plainRow], me:null, cut10:8.4}); await be.flush();
  const html = a.get('boardList').innerHTML;
  assert.match(html, /data-replay-id="7"/); assert.doesNotMatch(html, /data-replay-id="8"/);
  const appended = []; a.get('replayFrame').appendChild = f => appended.push(f);
  a.get('replayDlg').showModal = function(){ this.open = true; };
  const iframe = {setAttribute(){}, contentWindow: {postMessage(m){ this.got = m; }}};
  const env = a.document; env.createElement = () => iframe;
  a.replayOpen(row, 'wave10');
  assert.equal(a.get('replayDlg').open, true); assert.equal(a.get('replayMsg').textContent, a.T('replay.loading'));
  assert.match(a.get('replayWho').textContent, /1위 top · 웨이브 10초 · 8\.4 대시\/초/);
  const replay = {v:1, board:'wave10', ev:[0, 33]};
  be.answer('/replay?id=7', 'GET', {ok:true, ...row, replay}); await be.flush();
  assert.equal(appended.length, 1); assert.match(iframe.src, /\?replay=1$/);
  a.events.message({source: iframe.contentWindow, data: {type:'mishima-replay-ready'}});
  assert.deepEqual(plain(iframe.contentWindow.got), {type:'mishima-replay', data:replay});
  a.events.message({source: iframe.contentWindow, data: {type:'mishima-replay-end', score:8.4, tie:30, label:'8.4 대시/초'}});
  assert.equal(a.get('replayMsg').textContent, a.T('replay.done', '8.4 대시/초'));
  a.events.message({source: iframe.contentWindow, data: {type:'mishima-replay-end', score:8.3, tie:30, label:'8.3 대시/초'}});
  assert.equal(a.get('replayMsg').textContent, a.T('replay.mismatch', '8.4 대시/초'), 'a different playback is said, not hidden');
  // a replay that left the top 10 meanwhile
  a.replayOpen(row, 'wave10'); be.answer('/replay?id=7', 'GET', {error:'replay'}, 404); await be.flush();
  assert.equal(a.get('replayMsg').textContent, a.T('replay.gone'));
});
