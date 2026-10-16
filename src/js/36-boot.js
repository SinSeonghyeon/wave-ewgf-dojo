/* ---------- boot ---------- */
renderAll(); if(!charCap('wave')) coachForChar(); setMode('free'); renderHistory(); updateStats(); if(!REPLAY) bumpVisitDay(); backendInit(); noticeAutoSchedule();
world.camX = world.charX - W*0.43;
if(!REPLAY&&typeof location!=='undefined'&&/^https?:$/.test(location.protocol))bgmLoadTracks();
if(REPLAY) replayBoot(); // 결정 39(replay)
requestAnimationFrame(frame);
