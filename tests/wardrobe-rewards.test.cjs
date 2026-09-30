// Wardrobe, achievements, daily gift and the pending reward chest.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {BANNED, boot, dash, J, kstToday} = require('./helpers/app.cjs');
test('wardrobe: lifetime counters grow with dashes, EWGFs and strikes, survive a session reset, and unlock items exactly once',()=>{
  const a=boot();
  assert.deepEqual(J(a.store.fit),{head:'base',top:'base',arms:'base',legs:'base',shoes:'base',skin:'base'});
  assert.equal(a.store.life.days,1,'boot counts the first visit day');assert.equal(a.store.life.dashes,0);
  dash(a,1000);a.onButton(2,1060);
  assert.equal(a.store.life.dashes,1);assert.equal(a.store.life.ewgf,1);assert.equal(a.store.life.tries,1);assert.equal(a.store.life.maxStreak,1);
  assert.ok(a.pendingReward('red_top'),'first EWGF reserves the crimson top');assert.equal(a.store.ach.red_head,undefined,'10 dashes not yet');
  assert.equal(a.store.pendingRewards.length,1);assert.equal(a.get('jackpot').hidden,true);assert.equal(a.owned('red_top'),false);assert.equal(a.setFit('top','red_top'),false);a.claimRewards();assert.equal(a.get('jpItem').textContent,'Crimson Dobok Top');
  a.resetSession();assert.equal(a.store.life.ewgf,1,'session reset keeps lifetime counters');assert.equal(a.session.hits,0);
  for(let i=0;i<9;i++){const t=3000+i*1000;a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}
  assert.equal(a.store.life.dashes,10);assert.ok(a.pendingReward('red_head'),'10 dashes → pending headband');assert.equal(a.store.life.maxChain,1);
  assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id)),['red_head'],'queued behind the reveal still playing');
  const before=a.store.ach.red_top;dash(a,20000);a.onButton(2,20060);assert.equal(a.store.ach.red_top,before,'an unlock is never rewritten');
  // strikes count too, and the 0.5f window feeds its own counter
  a.onDir('f',30000);a.onDir('n',30020);a.onDir('f',30040);a.onButton(2,30100);assert.equal(a.store.life.tongbal,1);
  dash(a,31000);a.onButton(4,31070);assert.equal(a.store.life.hellsweep,1);assert.ok(a.pendingReward('red_arms'),'one of each strike → pending wrist wraps');
  a.store.window=8;dash(a,32000);a.onButton(2,32060);assert.equal(a.store.life.tightEwgf,3);assert.equal(a.store.life.ewgf,3);
  assert.equal(a.session.tries,2,'session stats untouched by the wardrobe (reset above, then two EWGF attempts)');
});
test('wardrobe: donate and trials reserve rewards; closing dialogs and trials never claims automatically',()=>{
  const a=boot({v:4,lang:'ko'});
  a.get('donateTop').click();
  assert.equal(a.store.life.donate,1);assert.ok(a.pendingReward('bowl_head'));a.claimRewards();assert.equal(a.owned('bowl_head'),false);assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id)),['bowl_head'],'held: the donate dialog is open');
  a.get('donateDlg').open=false;a.get('donateDlg').close();for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.store.pendingRewards.length,1);assert.equal(a.get('jackpot').hidden,true);a.claimRewards();assert.equal(a.store.pendingRewards.length,0);assert.equal(a.get('jpTitle').textContent,'업적 달성!');assert.equal(a.get('jpAch').textContent,'후원 생각이 있었군요..!?');assert.equal(a.get('jpItem').textContent,'밥그릇 투구');
  for(let n=0;n<4;n++) for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();} // egg → white → reveal
  assert.equal(a.get('jackpot').dataset.phase,'reveal','the card waits for 확인');a.get('jpOk').click();assert.equal(a.get('jackpot').dataset.phase,'out');for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}assert.equal(a.get('jackpot').hidden,true);
  // a finished rush30 unlocks the foot guards but the reveal waits 2.3s behind the result
  const b=boot({v:4,lang:'en'});b.setMode('rush30');b.startTrial();const cd=b.timers.get(b.trial.cdTimer);b.time(4000);cd();cd();cd();
  b.time(34100);b.trialTick(34100);assert.equal(b.trial.running,false);assert.equal(b.store.life.trials.rush30,1);assert.ok(b.pendingReward('red_shoes'));
  assert.deepEqual(J(b.store.pendingRewards.map(j=>j.id)),['red_shoes'],'held during the result flash');
  const openTimer=b.trial.openTimer; // the result card draws on a canvas this harness does not have
  for(const [id,fn] of [...b.timers]) if(id!==openTimer){b.timers.delete(id);fn();} // let the fixed hold expire while card preparation remains pending
  b.renderRewards();assert.equal(b.get('rewardOpen').disabled,true);b.claimRewards();assert.equal(b.store.pendingRewards.length,1,'the pending result dialog still blocks claiming after the fixed hold');
  b.timers.delete(openTimer);b.trial.openTimer=null;b.renderRewards();
  assert.equal(b.get('rewardOpen').disabled,false);assert.equal(b.get('jackpot').hidden,true);b.claimRewards();assert.equal(b.store.pendingRewards.length,0);assert.equal(b.get('jpItem').textContent,'Foot Guards');
  // a cancelled trial (mode switch) releases a held reveal on the next tick without a result
  const c=boot();c.store.life.dashes=9;c.setMode('wave10');c.startTrial();const cd2=c.timers.get(c.trial.cdTimer);c.time(4000);cd2();cd2();cd2();
  dash(c,4100);assert.ok(c.pendingReward('red_head'));c.claimRewards();assert.equal(c.owned('red_head'),false);assert.equal(c.store.pendingRewards.length,1,'held during the trial');
  c.setMode('free');for(const [id,fn] of [...c.timers]){c.timers.delete(id);fn();}assert.equal(c.store.pendingRewards.length,1);assert.equal(c.get('jackpot').hidden,true);c.claimRewards();assert.equal(c.store.pendingRewards.length,0);
});
test('wardrobe: saved progress is validated on load, an unowned outfit falls back to base, and setFit refuses locked items',()=>{
  const a=boot({v:4,visitDay:'2000-01-01',life:{dashes:'x',ewgf:-1,tongbal:7,days:2,giftDay:'2026-09-01',trials:{rush30:1,bogus:3}},ach:{red_top:1,bogus:2,red_head:'x',daily_arms_blue:5},fit:{top:'red_top',head:'red_head',arms:'daily_arms_blue',legs:'nope',skin:42}});
  assert.equal(a.store.life.dashes,0);assert.equal(a.store.life.ewgf,0);assert.equal(a.store.life.tongbal,7);assert.equal(a.store.life.giftDay,'2026-09-01');
  assert.deepEqual(J(a.store.life.trials),{wave10:0,ewgf20:0,combo10:0,rush30:1,bd10:0},'an old save gains the bd10 counter at 0');
  assert.deepEqual(J(Object.keys(a.store.ach).sort()),['daily_arms_blue','red_top'],'only existing owned items restored');
  assert.equal(a.store.life.days,3,'a new KST day counts');assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id).sort()),['red_shoes','red_skin']);
  assert.deepEqual(J(a.store.fit),{head:'base',top:'red_top',arms:'daily_arms_blue',legs:'base',shoes:'base',skin:'base'});
  assert.equal(a.setFit('legs','devil_legs'),false);assert.equal(a.store.fit.legs,'base');
  assert.equal(a.setFit('top','base'),true);assert.equal(a.store.fit.top,'base');assert.equal(a.setFit('top','red_top'),true);
  assert.equal(a.setFit('hat','base'),false);assert.equal(a.setFit('top','nope'),false);
  assert.equal(a.currentLook().top,a.ITEMS.top.red_top);assert.equal(a.lookOf({top:'zzz'}).top,a.ITEMS.top.base);
  a.get('fitReset').click();assert.equal(a.store.fit.top,'base');
});
test('wardrobe: items, achievements and strings agree (25 achievements = 25 items, 12 daily gifts, ko/en/ja names, no official character names)',()=>{
  const {ACH,ITEMS,SLOTS,ITEM_SLOT,DAILY_IDS,I18N}=boot();
  assert.deepEqual(J(SLOTS),['head','top','arms','legs','shoes','skin']);
  const ids=Object.keys(ACH);assert.equal(ids.length,25);assert.equal(DAILY_IDS.length,12);
  for(const id of ids) assert.ok(ITEM_SLOT[id],id+' unlocks a real item');
  for(const s of SLOTS){ assert.ok(ITEMS[s].base,s+' has a base'); for(const id of Object.keys(ITEMS[s])){ if(id==='base') continue;
    const it=ITEMS[s][id]; if(it.set==='daily') assert.equal(ACH[id],undefined,id+' is a gift, not an achievement'); else assert.ok(ACH[id],id+' needs an achievement');
    if(it.set && it.set!=='daily') assert.equal(id,it.set+'_'+s,'set items are named set_slot'); }
    assert.equal(DAILY_IDS.filter(id=>ITEM_SLOT[id]===s).length,2,s+': two daily gifts'); assert.equal(ids.filter(id=>ITEM_SLOT[id]===s&&ITEMS[s][id].set).length,4,s+': four set items'); }
  for(const a of Object.values(ACH)){ assert.ok(a.target>0); assert.equal(typeof a.stat({dashes:0,ewgf:0,tries:0,tongbal:0,hellsweep:0,maxChain:0,maxStreak:0,tightEwgf:0,days:0,donate:0,giftDay:'',trials:{wave10:0,ewgf20:0,combo10:0,rush30:0}}),'number'); }
  const banned=new RegExp(BANNED.source+'|三島');
  for(const l of ['ko','en','ja']){ const D=I18N[l];
    for(const s of SLOTS){ assert.equal(typeof D['slot.'+s],'string',l+' slot.'+s); assert.equal(typeof D['item.base.'+s],'string',l+' item.base.'+s); }
    for(const id of Object.keys(ITEM_SLOT)) assert.equal(typeof D['item.'+id],'string',l+' item.'+id);
    for(const id of ids){ assert.equal(typeof D['ach.'+id],'string',l+' ach.'+id); assert.equal(typeof D['ach.'+id+'.d'],'string',l+' ach.'+id+'.d'); }
    for(const k of Object.keys(D)) if(/^(item|ach|set)\./.test(k) && typeof D[k]==='string') assert.doesNotMatch(D[k],banned,l+' '+k+' must not name an official character'); }
});
test('wardrobe: the daily gift is one random unowned item per KST day on the first gesture, never twice, nothing once the pool is empty',()=>{
  let a=boot(undefined,undefined,{Math:Object.assign(Object.create(Math),{random:()=>0})});
  assert.equal(a.store.life.giftDay,'');a.unlockAudio();
  assert.equal(a.store.life.giftDay,kstToday());assert.ok(a.pendingReward('daily_head_blue'));assert.equal(a.owned('daily_head_blue'),false);a.claimRewards();assert.ok(a.store.ach.daily_head_blue,'random()=0 → the first daily item');assert.equal(a.get('jpItem').textContent,'Blue Dye');assert.match(a.get('jpTitle').textContent,/^Day 1 /);
  a.unlockAudio();assert.equal(Object.keys(a.store.ach).filter(id=>id.startsWith('daily_')).length,1,'same day: nothing more');
  a=boot({v:4,visitDay:kstToday(),life:{days:4,giftDay:kstToday()},ach:{daily_head_blue:1}},undefined,{Math:Object.assign(Object.create(Math),{random:()=>0})});
  assert.equal(a.store.life.days,4,'same day again: not counted');assert.equal(a.dailyGift(),null,'already given today');
  a=boot({v:4,visitDay:'2000-01-01',life:{giftDay:'2000-01-01'},ach:{daily_head_blue:1}},undefined,{Math:Object.assign(Object.create(Math),{random:()=>0.99})});
  assert.equal(a.dailyGift(),'daily_skin_dark','random()→1 picks the last unowned item');assert.equal(a.dailyGift(),null);
  const all=Object.fromEntries(a.DAILY_IDS.map(id=>[id,1]));a=boot({v:4,visitDay:'2000-01-01',life:{giftDay:'2000-01-01'},ach:all});
  assert.equal(a.dailyGift(),null,'pool empty');assert.equal(a.store.life.giftDay,kstToday(),'still marked so the check runs once a day');
  a.openFit();assert.equal(a.get('fitDaily').textContent,'All daily gifts collected');
});
test('wardrobe dialog: opens from the stage button, cancels a trial, lists chips and achievements with progress, and re-renders on language switch',()=>{
  const a=boot({v:4,lang:'ko'});a.setMode('wave10');a.startTrial();
  a.get('fitOpen').click();assert.equal(a.get('fitDlg').open,true);assert.equal(a.trial.cdTimer,null,'countdown cancelled');
  assert.match(a.get('fitSlots').innerHTML,/data-id="red_top"[^>]*aria-disabled="true"/);assert.match(a.get('fitSlots').innerHTML,/🔒 붉은 도복 상의/);assert.match(a.get('fitSlots').innerHTML,/data-id="base" aria-pressed="true"/);
  assert.match(a.get('fitAch').innerHTML,/달성 0 \/ 25/);assert.match(a.get('fitAch').innerHTML,/첫 초풍<\/b><span class="d">초풍 1회 성공<\/span><span class="p">0 \/ 1<\/span><span class="i">보상: 붉은 도복 상의/);
  assert.match(a.get('fitAch').innerHTML,/특별/);assert.match(a.get('fitAch').innerHTML,/수령 대기/);
  a.get('fitDlg').open=false;a.get('fitDlg').close();dash(a,5000);a.onButton(2,5060);
  a.claimRewards();a.get('fitOpen').click();assert.match(a.get('fitSlots').innerHTML,/class="fit-chip" data-slot="top" data-id="red_top" aria-pressed="false">붉은 도복 상의/);
  assert.match(a.get('fitAch').innerHTML,/달성 1 \/ 25/);assert.match(a.get('fitAch').innerHTML,/class="ach-row done"><b>✓ 첫 초풍/);
  a.setLang('en');assert.match(a.get('fitSlots').innerHTML,/Bare chest/);assert.match(a.get('fitAch').innerHTML,/1 \/ 25 achieved/);assert.match(a.get('fitAch').innerHTML,/First EWGF/);
  assert.equal(a.get('fitDaily').textContent,'Daily gifts 1 / 12 · one on the first visit each day','the wardrobe button was the first gesture of the day: one gift');
  a.get('fitSlots').click({target:{closest:()=>({dataset:{slot:'top',id:'red_top'}})}});assert.equal(a.store.fit.top,'red_top');
  assert.match(a.get('fitSlots').innerHTML,/data-id="red_top" aria-pressed="true"/);
  a.get('fitDlg').open=false;a.get('fitDlg').close();assert.equal(a.setFit('top','red_top'),true);
  assert.deepEqual(Object.keys(a.currentLook()),['head','top','arms','legs','shoes','skin']);
});
test('settings: data reset wipes records, lifetime stats, achievements and the outfit but keeps nickname, settings and the visit day',()=>{
  const tok='ab'.repeat(24), a=boot({v:4,lang:'ko',window:8,sound:0,nick:'me',nickToken:tok,visitDay:kstToday(),records:{wave10:[{date:1,score:2,dashes:20,chain:5,label:'x',sub:'y'}]},life:{dashes:50,ewgf:7,days:9},ach:{red_top:1,daily_head_blue:2},fit:{top:'red_top'}},undefined,{confirm:()=>false});
  a.get('dataReset').click();assert.equal(a.store.life.dashes,50,'cancelled confirm changes nothing');
  const b=boot({v:4,lang:'ko',window:8,sound:0,nick:'me',nickToken:tok,visitDay:kstToday(),records:{wave10:[{date:1,score:2,dashes:20,chain:5,label:'x',sub:'y'}]},life:{dashes:50,ewgf:7,days:9},ach:{red_top:1,daily_head_blue:2},fit:{top:'red_top'}},undefined,{confirm:()=>true});
  dash(b,1000);b.get('dataReset').click();
  assert.equal(b.store.records.wave10.length,0);assert.equal(b.store.life.dashes,0);assert.equal(b.store.life.days,1);assert.deepEqual(J(b.store.ach),{});assert.equal(b.store.fit.top,'base');assert.equal(b.session.dashes,0,'session reset too');
  assert.equal(b.store.nick,'me');assert.equal(b.store.nickToken,tok);assert.equal(b.store.window,8);assert.equal(b.store.sound,0);assert.equal(b.store.visitDay,kstToday());
  assert.equal(b.get('coachMsg').innerHTML,'기록과 업적을 초기화했습니다.');
  const c=boot(undefined,undefined,{confirm:undefined});dash(c,1000);c.get('dataReset').click();assert.equal(c.store.life.dashes,0,'no confirm available (harness): resets');
});
test('rewards: pending items survive reload, exclude duplicates, and claim as one saved batch',()=>{
  let saved;
  const a=boot(undefined,undefined,{localStorage:{getItem:()=>null,setItem:(k,v)=>saved=JSON.parse(v)}});
  a.dailyGift();a.store.life.ewgf=1;a.checkAch();a.checkAch();
  assert.equal(a.store.pendingRewards.length,2);assert.equal(Object.keys(a.store.ach).length,0);
  assert.equal(a.get('rewardCount').textContent,'2');assert.equal(a.get('rewardOpen').disabled,false);
  assert.equal(a.get('rewardToast').textContent,'2 rewards arrived!');assert.equal(a.get('jackpot').hidden,true);
  const b=boot(saved);assert.deepEqual(J(b.store.pendingRewards),saved.pendingRewards);
  const ids=b.store.pendingRewards.map(j=>j.id);b.get('rewardOpen').click();b.get('rewardOpen').click();
  assert.equal(b.store.pendingRewards.length,0);for(const id of ids) assert.equal(b.owned(id),true);
  assert.match(b.get('jpAch').textContent,/\+1 more/);assert.equal(b.get('rewardOpen').disabled,true);
  b.store.life.dashes=10;b.checkAch();assert.equal(b.store.pendingRewards.length,1);b.claimRewards();assert.equal(b.owned('red_head'),false);
  b.get('setOpen').click();b.get('setDlg').open=false;b.get('setDlg').close();b.renderRewards();
  assert.equal(b.get('jackpot').hidden,true);assert.equal(b.store.pendingRewards.length,1);
  a.claimRewards();assert.equal(saved.pendingRewards.length,0);for(const id of ids) assert.ok(saved.ach[id]);
  const c=boot(saved);assert.equal(c.store.pendingRewards.length,0);assert.equal(c.get('jackpot').hidden,true);
});
test('rewards: saved queue validation, pending outfits, reset and static translated notices',()=>{
  const j={id:'red_top',kind:'ach',at:1,day:1};
  const a=boot({v:4,fx:0,visitDay:kstToday(),life:{days:1},ach:{red_head:1},fit:{top:'red_top'},pendingRewards:[j,j,null,{...j,id:'red_head'},{...j,id:'bogus'},{...j,kind:'daily'},{...j,id:'red_arms',at:-1},{...j,id:'red_legs',day:1.5}]});
  assert.deepEqual(J(a.store.pendingRewards),[j]);assert.equal(a.store.fit.top,'base');assert.equal(a.setFit('top','red_top'),false);
  a.renderFit();assert.match(a.get('fitAch').innerHTML,/Unclaimed/);
  a.dailyGift();assert.equal(a.get('rewardOpen').dataset.motion,'false');
  for(const lang of ['ko','ja','en']){a.setLang(lang);assert.equal(a.get('rewardToast').textContent,a.T('reward.daily'));}
  for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.get('rewardToast').hidden,true);assert.equal(a.get('jackpot').hidden,true);
  a.get('dataReset').click();assert.equal(a.store.pendingRewards.length,0);assert.equal(a.get('rewardCount').hidden,true);
});
test('reward toast batches arrivals, flies to the chest without claiming and cancels on reset',()=>{
  const a=boot(), toast=a.get('rewardToast');let flight, cancelled=0;
  toast.animate=(frames,options)=>{assert.equal(options.duration,550);assert.match(frames[1].transform,/scale\(\.12\)/);return flight={cancel(){cancelled++;}};};
  const step=()=>{for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}};
  a.dailyGift();a.store.life.ewgf=1;a.checkAch();assert.equal(toast.textContent,'2 rewards arrived!');step();
  assert.ok(flight);flight.onfinish();assert.equal(toast.hidden,true);assert.equal(a.get('rewardOpen').dataset.arrival,'true');
  assert.equal(a.store.pendingRewards.length,2);assert.equal(Object.keys(a.store.ach).length,0);assert.equal(a.get('jackpot').hidden,true);
  step();assert.equal(a.get('rewardOpen').dataset.arrival,'false');
  a.store.life.dashes=10;a.checkAch();step();a.get('dataReset').click();assert.equal(cancelled,2);assert.equal(toast.hidden,true);assert.equal(a.store.pendingRewards.length,0);
});
