/* ---------- 더미 격파 (rush30) and 더미 격파 연습 (rush): typed targets, points only in the challenge ---------- */
// 결정 39(replay): each run draws its dummies from a generator seeded with its start time (ms), so a replay meets the same order
let rushRng = Math.random;
function rushSeed(seed){ // mulberry32 over the low and high halves of the ms timestamp; returns the generator it installs
  let a = ((seed % 4294967296) ^ Math.floor(seed / 4294967296)) | 0;
  return rushRng = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function rushSpawn(){ // a fresh typed dummy 140px … min(380, 60% of the stage) ahead; the type is random so the player has to read it
  const d = world.dummy; d.alive=true; d.hit=0; d.rot=0; d.y=0; d.vx=0; d.vy=0; d.respawn=0; d.crumpleUntil=0; d.move=null;
  d.type = DUMMY_TYPES[Math.floor(rushRng()*DUMMY_TYPES.length)];
  world.dummyX = world.charX + (140 + rushRng()*(Math.min(380, W*0.6)-140))*store.side;
}
function rushIdle(){ // 더미 격파 연습 (결정 38(challenge-mode)): typed dummies with no clock or points; any other mode outside a run gets the plain bag back
  const d = world.dummy;
  if(practiceOf('rush30')){ if(!d.type){ rushRng = Math.random; rushSpawn(); } }
  else if(d.type && !trial.running){ d.type = null; d.respawn = 0; }
}
function rushStrike(move, t){ // called after every judged move; scores while a rush30 trial is running, and in 더미 격파 연습 only knocks the target
  if(practiceOf('rush30') && world.dummy.type){ if(!tryHit(move)) pop(T('pop.whiff'), cssVar('--muted','#8C98AA'), 26, {y:-150}); return; } // the next dummy comes 700ms after a hit (updateDummy)
  if(!trial.running || mode!=='rush30') return;
  const hit = REPLAY ? replayHit(move) : tryHit(move); // 결정 39(replay): a hit hangs on screen positions, so the replay takes the recorded one
  recHit(hit);
  if(hit){
    const pts = move==='wgf' ? RUSH_PTS.wgf : RUSH_PTS.kill;
    trial.score += pts; trial.kills++;
    pop('+'+pts, cssVar(move==='wgf'?'--warn':'--gold', '#F5C542'), 46, {x:world.dummyX, y:-130, glow:14});
  } else {
    trial.whiffs++;
    pop(T('pop.whiff'), cssVar('--muted','#8C98AA'), 26, {y:-150});
  }
  renderRushHud();
}

