/* ---------- 더미 격파 (rush30): typed targets and points ---------- */
function rushSpawn(){ // a fresh typed dummy 140px … min(380, 60% of the stage) ahead; the type is random so the player has to read it
  const d = world.dummy; d.alive=true; d.hit=0; d.rot=0; d.y=0; d.vx=0; d.vy=0; d.respawn=0; d.crumpleUntil=0; d.move=null;
  d.type = DUMMY_TYPES[Math.floor(Math.random()*DUMMY_TYPES.length)];
  world.dummyX = world.charX + (140 + Math.random()*(Math.min(380, W*0.6)-140))*store.side;
}
function rushStrike(move, t){ // called after every judged move; only scores while a rush30 trial is running
  if(!trial.running || mode!=='rush30') return;
  if(tryHit(move)){
    const pts = move==='wgf' ? RUSH_PTS.wgf : RUSH_PTS.kill;
    trial.score += pts; trial.kills++;
    pop('+'+pts, cssVar(move==='wgf'?'--warn':'--gold', '#F5C542'), 46, {x:world.dummyX, y:-130, glow:14});
  } else {
    trial.whiffs++;
    pop(T('pop.whiff'), cssVar('--muted','#8C98AA'), 26, {y:-150});
  }
  renderRushHud();
}

