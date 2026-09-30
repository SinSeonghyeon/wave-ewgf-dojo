/* ---------- boot ---------- */
renderAll(); setMode('free'); renderHistory(); updateStats(); bumpVisitDay(); backendInit(); noticeAutoSchedule();
world.camX = world.charX - W*0.43;
if(typeof location!=='undefined'&&/^https?:$/.test(location.protocol))bgmLoadTracks();
requestAnimationFrame(frame);
