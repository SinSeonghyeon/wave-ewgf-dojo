// Backend client: leaderboard submit/delete/races, votes, replies, cut10, D1 read budget, app↔worker contract.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {html, boot, dash, fr, bdOut, backend, topRes} = require('./helpers/app.cjs');
test('leaderboard entry is built only from a finished trial, one metric pair per board',()=>{
  const a=boot({v:4,lang:'ko',window:8});
  assert.match(a.BOARD_URL,/^$|^https:\/\/[^/]+$/,'BOARD_URL is empty or an https origin without trailing slash');
  assert.equal(a.boardEntry(null,'wave10'),null);assert.equal(a.boardEntry(a.trial.result,'free'),null);
  const plain=x=>JSON.parse(JSON.stringify(x)); // vm-realm objects have a foreign prototype; compare by value
  const run=(mode,play)=>{a.setMode(mode);a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();play();a.endTrial();return a.boardEntry(a.trial.result,mode);};
  const wave=run('wave10',()=>{dash(a,4100);a.time(14100);});
  assert.deepEqual(plain(wave),{board:'wave10',win:8,lang:'ko',score:0.1,tie:1,detail:{dashes:1,chain:1}});
  assert.deepEqual(plain(a.boardRowText('wave10',wave)),{label:'0.1 대시/초',sub:'1회 · 최고 연속 1'});
  const ewgf=run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);});
  assert.deepEqual(plain(ewgf),{board:'ewgf20',win:8,lang:'ko',score:5,tie:0,detail:{hits:1,target:20,mean:0}});
  assert.equal(Object.is(ewgf.tie,-0),false,'tie must not be -0');
  const combo=run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);});
  assert.equal(combo.board,'combo10');assert.equal(combo.score,10);assert.deepEqual(plain(Object.keys(combo.detail)),['hits','target','mean','dps']);
  assert.equal(combo.detail.hits,1);assert.ok(combo.detail.dps>4&&combo.detail.dps<8,'mean dash/s of the trial cycles');assert.equal(combo.tie,combo.detail.dps);
  assert.equal(a.boardRowText('combo10',combo).sub,'1/10 · 평균 +0.0f · '+combo.detail.dps.toFixed(1)+' 대시/초','combo10 shows its tie-breaker');
  assert.equal(a.boardRowText('combo10',{score:50,detail:{hits:5,target:10,mean:1}}).sub,'5/10 · 평균 +0.1f','rows without dps (old records) render as before');
  a.setLang('en');assert.equal(a.boardRowText('ewgf20',ewgf).sub,'1/20 · avg +0.0f');
  a.setMode('free');assert.equal(a.boardEntry(a.trial.result,'free'),null);
  for(const [n,ok] of [['ab',true],['한글닉네임열두글자까지만',true],['三島 道場',true],['ＡＢＣ',true],['🔥🔥',true],['a',false],['1234567890123',false],['ab\u200bcd',false],['a\u0000b',false],
    ['\u3164\u3164',false],['ab\u2060',false],['ab\u00ad',false],['ab\ufe0f',false],['ab\ue000',false]]) assert.equal(a.nickOk(n),ok,JSON.stringify(n)); // fillers, word joiner, soft hyphen, variation selector, private use: blank-looking names
});
test('trial end submits only with a claimed nickname (token); a failed submit shows retry; result card opens; tiers by top-%',async()=>{
  const t=boot();
  assert.equal(t.pctTop(1,1),100);assert.equal(t.pctTop(1,200),1);assert.equal(t.pctTop(3,42),8);assert.equal(t.pctTop(0,0),1);
  assert.deepEqual([[1,1000],[2,100],[10,100],[11,100],[20,100],[21,100],[50,100],[51,100],[70,100],[71,100],[1,1],[1,5],[2,10],[5,10],[7,10],[8,10]].map(([r,n])=>t.tierOf(r,n)),[0,1,1,2,2,3,3,4,4,5,1,1,2,3,4,5],'SS 1% · S 10% · A 20% · B 50% · C 70% · D; tiny boards are scored as ten players');
  assert.deepEqual([0,1,2,3,4,5].map(i=>t.T('tier.'+i+'.title')),['SS','S','A','B','C','D']);
  const run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  const noToken=boot({v:4,lang:'ko',window:12,nick:'tester'}); run(noToken); await new Promise(r=>setImmediate(r));
  assert.equal(noToken.trial.result.submit,undefined,'a nickname without its token is not ours to submit with');
  assert.equal(noToken.get('dRank').textContent,'닉네임을 정하면 순위에 등록됩니다.');assert.equal(noToken.get('dRankRetry').hidden,true);
  assert.equal(noToken.get('nickBtn').hidden,false);assert.equal(noToken.get('nickBtn').textContent,'닉네임 정하기','the header button is the way back into the gate');
  assert.equal(boot({v:4,nickToken:'ab'.repeat(24)}).store.nickToken,'','a token without its nickname is dropped');
  assert.ok(noToken.timers.get(noToken.trial.openTimer),'result card is scheduled to open');
  const tok='ab'.repeat(24);
  const owner=boot({v:4,lang:'ko',window:12,nick:'tester',nickToken:tok}); assert.equal(owner.store.nickToken,tok);
  run(owner); await new Promise(r=>setImmediate(r));
  const s=owner.trial.result.submit; // the vm has no fetch, so the auto-submit fails and the retry button appears
  assert.equal(s.state,'fail');assert.equal(owner.get('dRankRetry').hidden,false);
  assert.equal(owner.get('dRank').textContent,'등록에 실패했습니다. 잠시 후 다시 시도하세요.');
  owner.setLang('en');assert.equal(owner.get('dRank').textContent,'Submission failed. Try again later.');
  owner.setMode('free');assert.equal(owner.get('dRank').textContent,'');assert.equal(owner.get('dRankRetry').hidden,true);
  assert.equal(boot({v:4,nickToken:'zz'}).store.nickToken,'','malformed token is dropped');
  // share card model carries the rank line and tier title when the submit succeeded
  const card=boot({v:4,lang:'ko',window:12}); run(card); card.trial.result.submit={state:'done',rank:3,total:42,improved:true};
  const m=card.buildCard(card.shareSource());
  assert.equal(m.rankText,'3위 / 42명 · 상위 8% · S');assert.match(m.tweet,/\n3위 \/ 42명 · 상위 8% · S\n/);
  // the banner comment is per trial mode (tier.N.<mode>): the same grade reads differently in wave10 and rush30, and every mode has all six in every language
  for(const l of ['ko','en','ja']){card.setLang(l);for(const mode of card.TRIAL_MODES)for(let i=0;i<6;i++)assert.notEqual(card.T('tier.'+i+'.'+mode),'tier.'+i+'.'+mode,l+' '+mode+' '+i);}
  card.setLang('ko');const banner=card.get('shareTierMsg');
  await card.openShare().catch(()=>{}); // the banner is filled synchronously; the canvas draw rejects in this harness (no 2d context)
  assert.equal(card.trial.result.personalBest,true);assert.equal(card.get('donateShare').hidden,false,'the first personal best gets today\'s result prompt');
  assert.equal(card.get('shareTier').textContent,'S');assert.equal(card.get('shareRank').className,'share-rank t1');assert.equal(banner.textContent,card.T('tier.1.wave10'));
  card.trial.result.submit={state:'done',rank:40,total:42,improved:true};await card.openShare().catch(()=>{});
  assert.equal(card.get('donateShare').hidden,false,'a duplicate opening keeps the prompt claimed for this result');
  assert.equal(card.get('shareTier').textContent,'D');assert.equal(banner.textContent,'사람이... 맞으시죠? 6N23 6 N, 다시 갑시다.');
  card.trial.result.submit={state:'busy'};assert.equal(card.buildCard(card.shareSource()).rankText,'');
});
test('board reads share in-flight requests across tab round trips and allow fresh retries after failure',async()=>{
  const b=backend(), a=boot({v:4,nick:'me',nickToken:'ab'.repeat(24)},b.fetch);
  const count=()=>b.calls.filter(c=>c.url.includes('/top?board=wave10')).length;
  a.boardLoad(); a.boardLoad(); assert.equal(count(),1); assert.equal(a.get('boardRefresh').disabled,true);
  a.board.tab='ewgf20'; a.boardLoad();
  a.board.tab='wave10'; const back=a.boardLoad(); assert.equal(count(),1);
  b.answer('/top?board=wave10','GET',topRes('me')); await back;
  assert.equal(a.board.data.wave10.me.nick,'me'); assert.equal(a.get('boardRefresh').disabled,false);
  b.answer('/top?board=ewgf20','GET',{...topRes('me'),board:'ewgf20'}); await b.flush();
  assert.equal(a.board.tab,'wave10'); assert.equal(a.board.msg,'');
  const failed=a.boardLoad(); assert.equal(count(),2);
  b.answer('/top?board=wave10','GET',{error:'server'},500); await failed;
  assert.equal(a.get('boardRefresh').disabled,false); assert.equal(a.board.msg[0],'board.loadFail');
  const retry=a.boardLoad(); assert.equal(count(),3);
  b.answer('/top?board=wave10','GET',topRes('me')); await retry; assert.equal(a.board.msg,'');
});
test('expired identity releases the leaderboard loading state and ignores its late response',async()=>{
  const b=backend(), a=boot({v:4,nick:'me',nickToken:'ab'.repeat(24)},b.fetch);
  const loading=a.boardLoad();
  const vote=a.postVote(7,1);
  b.answer('/vote','POST',{error:'auth'},403); await vote;
  assert.equal(a.store.nickToken,'');
  assert.equal(a.board.msg,'','an invalidated identity must not leave a permanent loading message');
  assert.equal(a.get('boardRefresh').disabled,false,'retry is immediately available without waiting for the old request');
  const retry=a.boardLoad();
  b.answer('/top?board=wave10','GET',topRes('me')); await loading;
  assert.equal(a.board.data.wave10,undefined,'the expired identity response is discarded');
  assert.equal(a.get('boardRefresh').disabled,true,'the anonymous retry still owns the loading state');
  b.answer('/top?board=wave10','GET',{...topRes('other'),me:null}); await retry;
  assert.equal(a.board.msg,''); assert.equal(a.get('boardRefresh').disabled,false);
});
test('deleting a score prevents reuse of an older in-flight board read',async()=>{
  const b=backend(), a=boot({v:4,nick:'me',nickToken:'ab'.repeat(24)},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('me');
  const deleting=a.boardDelete(); a.boardLoad();
  const empty={season:'all',board:'wave10',total:0,rows:[],me:null,cut10:null};
  b.answer('/score','DELETE',{...empty,ok:true,deleted:1}); await deleting; await b.flush();
  assert.equal(b.calls.filter(c=>c.url.includes('/top?board=wave10')).length,2,'post-delete read is fresh');
  b.answer('/top?board=wave10','GET',topRes('me')); await b.flush();
  assert.equal(a.board.data.wave10.me,null,'old read cannot restore the deleted row');
  assert.equal(a.get('boardRefresh').disabled,true,'fresh request remains in flight');
  b.answer('/top?board=wave10','GET',empty); await b.flush();
  assert.equal(a.board.data.wave10.me,null); assert.equal(a.get('boardRefresh').disabled,false);
});
test('backend races: a late submit after a rename or a tab switch does not overwrite the board; a 403 mid-card waits; visits count once',async()=>{
  const tok='ab'.repeat(24), run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  // rename while the submit is in flight: the submit's board snapshot belongs to the old nickname and is discarded
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'old',nickToken:tok},b.fetch);
  assert.ok(b.find('/top?board=wave10&nick=old'),'my row is requested only with a claimed nickname');
  run(a); await b.flush(); const sub=b.find('/submit','POST'); assert.equal(sub.body.nick,'old'); assert.equal(sub.body.token,tok);
  a.claimNick('new'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'new',token:'cd'.repeat(24)}); await b.flush();
  assert.equal(a.store.nick,'new'); assert.ok(b.find('/top?board=wave10&nick=new'),'board reloaded for the new nickname');
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('old')}); await b.flush();
  assert.equal(a.trial.result.submit.state,'done'); assert.equal(a.board.data.wave10,undefined,'stale board for the old nickname is not shown');
  b.answer('/top?board=wave10&nick=new','GET',{...topRes('new'),me:null}); await b.flush(); assert.equal(a.board.data.wave10.me,null);
  // tab switched while the submit is in flight: the response is stored for its board but the user is not yanked back and their load survives
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch); run(a); await b.flush();
  a.board.tab='ewgf20'; a.boardLoad(); await b.flush(); assert.ok(b.find('/top?board=ewgf20'));
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.tab,'ewgf20'); assert.equal(a.board.data.wave10.me.nick,'me');
  b.answer('/top?board=ewgf20','GET',{...topRes('me'),board:'ewgf20',rows:[],me:null,total:0}); await b.flush();
  assert.equal(a.board.data.ewgf20.total,0,'the ewgf20 load was not dropped by the submit'); assert.equal(a.board.msg,'');
  // token rejected while the result card is about to open: the gate waits for the card to close, then asks once
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch); run(a); await b.flush();
  b.answer('/submit','POST',{error:'auth'},403); await b.flush();
  assert.equal(a.trial.result.submit.error,'auth'); assert.equal(a.store.nickToken,''); assert.equal(a.live.nickLost,true); assert.equal(a.live.nickMsg,'','gate not opened over the card');
  assert.equal(a.get('nickBtn').textContent,'닉네임 정하기'); assert.equal(a.get('dRank').textContent,'닉네임 확인에 실패했습니다. 닉네임을 다시 정해 주세요.');
  a.get('shareDlg').close(); assert.equal(a.live.nickLost,false); assert.deepEqual([...a.live.nickMsg],['nick.expired'],'gate opens once the card is closed');
  a.claimNick('me2'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'me2',token:'ef'.repeat(24)}); await b.flush();
  assert.equal(b.find('/submit','POST').body.nick,'me2','the failed result is resubmitted under the new nickname');
  // visit counter: the day is marked before the POST answers, and a second load meanwhile neither POSTs nor GETs again
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch);
  assert.equal(b.find('/visits','POST').method,'POST'); assert.match(a.store.visitDay,/^\d{4}-\d\d-\d\d$/,'marked at once');
  a.visitsLoad(); await b.flush(); assert.equal(b.calls.filter(c=>c.url.includes('/visits')).length,1,'no second request while one is in flight');
  b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush(); assert.equal(a.live.visits.today,1);
  a.visitsLoad(); await b.flush(); assert.equal(b.find('/visits','GET').method,'GET','same day again: read only');
  // a nickname claim that fails on the server side (not a taken name) offers to practise without a ranking; a taken name does not
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); a.claimNick('fresh'); await b.flush(); b.answer('/nick','POST',{error:'server'},500); await b.flush();
  assert.equal(a.live.nickLater,true); assert.equal(a.get('nickLater').hidden,false);
  a.claimNick('fresh'); await b.flush(); b.answer('/nick','POST',{error:'taken'},409); await b.flush(); assert.equal(a.live.nickLater,false); assert.equal(a.get('nickLater').hidden,true);
});
test('leaderboard delete is shown only on my row, confirms, sends owner credentials and refreshes from the server response',async()=>{
  const tok='ab'.repeat(24), b=backend(); let allow=false;
  const a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>allow});
  a.board.data.wave10={...topRes('me'),rows:[{...topRes('other').rows[0],id:8},topRes('me').rows[0]]}; a.renderBoard();
  let html=a.get('boardList').innerHTML;
  assert.equal((html.match(/data-delete-score/g)||[]).length,1,'only my row has a delete button');
  assert.match(html,/class="me"[\s\S]*data-delete-score[\s\S]*>삭제</);
  await a.boardDelete(); assert.equal(b.find('/score','DELETE'),undefined,'cancel sends nothing');
  allow=true; const pending=a.boardDelete(); await b.flush();
  const call=b.find('/score','DELETE'); assert.deepEqual(call.body,{board:'wave10',nick:'me',token:tok});
  assert.equal(a.board.deleting,true); assert.equal(a.get('boardMsg').textContent,'기록 삭제 중…');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:1,rows:[{...topRes('other').rows[0],id:8}],me:null,cut10:.1}); await pending;
  assert.equal(a.board.deleting,false); assert.equal(a.board.data.wave10.me,null); assert.equal(a.get('boardMe').textContent,'등록한 기록이 없습니다');
  assert.equal(a.get('boardMsg').textContent,'내 기록을 삭제했습니다.'); assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score/);
});
test('leaderboard delete reloads after a rename and never marks the old nickname as mine',async()=>{
  const oldToken='ab'.repeat(24), newToken='cd'.repeat(24), b=backend();
  const a=boot({v:4,lang:'ko',window:12,nick:'old',nickToken:oldToken},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('old'); a.renderBoard();
  const deleting=a.boardDelete(); await b.flush();
  a.claimNick('new'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'new',token:newToken}); await b.flush();
  assert.equal(a.board.loadAfterDelete,true,'the new owner load is queued while deletion is active');
  assert.equal(b.find('/top?board=wave10&nick=new'),undefined,'the queued load does not race the delete');
  assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score/,'the old owner row immediately loses its delete button');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting; await b.flush();
  assert.ok(b.find('/top?board=wave10&nick=new'),'deletion completion reloads the board for the new owner');
  b.answer('/top?board=wave10&nick=new','GET',{season:'all',board:'wave10',total:0,rows:[],me:null,cut10:null}); await b.flush();
  assert.equal(a.board.data.wave10.me,null); assert.equal(a.get('boardMe').textContent,'등록한 기록이 없습니다');
});
test('a delayed board load cannot overwrite a newer submit for the same board',async()=>{
  const tok='ab'.repeat(24), b=backend();
  const a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch);
  b.answer('/top?board=wave10&nick=me','GET',topRes('me')); await b.flush();
  a.setMode('wave10'); a.startTrial(); const cd=a.timers.get(a.trial.cdTimer);
  a.time(4000); cd(); cd(); cd(); dash(a,4100); a.time(14100); a.endTrial(); await b.flush();
  const submit=a.boardSubmit(); await b.flush();
  a.board.tab='wave10'; const load=a.boardLoad(); await b.flush();
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('me')}); await submit; await b.flush();
  b.answer('/top?board=wave10&nick=me','GET',{season:'all',board:'wave10',total:0,rows:[],me:null,cut10:null}); await load; await b.flush();
  assert.equal(a.board.data.wave10.me.nick,'me');
});
test('leaderboard submit and delete are serialized in both directions',async()=>{
  const tok='ab'.repeat(24), run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  // An existing in-flight submit disables and rejects deletion until its response has settled.
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('me'); run(a); await b.flush();
  assert.equal(a.board.submitting,true); assert.match(a.get('boardList').innerHTML,/data-delete-score[^>]* disabled/);
  await a.boardDelete(); assert.equal(b.find('/score','DELETE'),undefined,'delete cannot overlap an active submit');
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.submitting,false); assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score[^>]* disabled/);
  let deleting=a.boardDelete(); await b.flush(); assert.ok(b.find('/score','DELETE'),'delete is available once submit settles');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting;

  // If deletion starts first, a newly completed trial waits and submits only after deletion finishes.
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('me'); deleting=a.boardDelete(); await b.flush(); run(a); await b.flush();
  assert.equal(a.board.submitQueue.length,1); assert.equal(b.find('/submit','POST'),undefined,'submit is queued behind delete');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting; await b.flush();
  assert.ok(b.find('/submit','POST'),'queued trial submits after delete settles');
  b.answer('/submit','POST',{ok:true,id:9,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.submitting,false); assert.equal(a.trial.result.submit.state,'done');
});
test('post votes: cancel/switch through an idempotent set, validated local cache, cleared on rename, nickname gate, deleted post',async()=>{
  const tok='ab'.repeat(24), rows=(up,down)=>[{id:7,nick:'x',text:'hi',created_at:1,up,down}], mine=()=>JSON.parse(JSON.stringify(a.store.votes)); // votes come from the vm realm: compare as plain JSON
  let b=backend(); let a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok,votes:{'7':1,'x':1,'8':5,'9':-1,'12345678901234':1}},b.fetch);
  assert.deepEqual(mine(),{'7':1,'9':-1},'only numeric ids with 1/-1 survive the loader');
  b.answer('/posts','GET',{rows:rows(1,0)}); await b.flush();
  assert.deepEqual(mine(),{'7':1},'votes on posts no longer listed are forgotten');
  let html=a.get('postList').innerHTML;
  assert.match(html,/data-id="7" data-v="1" aria-pressed="true"[^>]*aria-label="좋아요"[^>]*>👍 1</,'my like is marked');
  assert.match(html,/data-id="7" data-v="-1" aria-pressed="false"[^>]*aria-label="싫어요"[^>]*>👎 0</);
  // pressing my current vote cancels (v:0); the response's `mine` and rows replace the cache and the list
  a.postVote(7,1); await b.flush(); let c=b.find('/vote','POST'); assert.deepEqual(c.body,{nick:'me',token:tok,id:7,v:0});
  assert.match(a.get('postList').innerHTML,/data-id="7" data-v="1" aria-pressed="true" [^>]*disabled/,'vote buttons are disabled while a request is in flight');
  a.postVote(7,-1); await b.flush(); assert.equal(b.calls.filter(x=>x.url.includes('/vote')).length,1,'no second request while one is in flight');
  b.answer('/vote','POST',{ok:true,id:7,mine:0,rows:rows(0,0)}); await b.flush();
  assert.deepEqual(mine(),{}); assert.match(a.get('postList').innerHTML,/data-v="1" aria-pressed="false"[^>]*>👍 0</);
  // the other button switches; a stale cache is corrected by the server's answer, not by the click
  a.postVote(7,-1); await b.flush(); assert.equal(b.find('/vote','POST').body.v,-1);
  b.answer('/vote','POST',{ok:true,id:7,mine:-1,rows:rows(0,1)}); await b.flush(); assert.deepEqual(mine(),{'7':-1});
  assert.match(a.get('postList').innerHTML,/data-v="-1" aria-pressed="true"[^>]*>👎 1</);
  // errors: rate → message, 404 post → list reload, 403 → nickname lost and votes dropped
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'rate'},429); await b.flush();
  assert.deepEqual([...a.live.postsMsg],['posts.voteFast']); assert.equal(a.get('postMsg').textContent,'너무 빠릅니다. 잠시 후 다시 눌러 주세요.'); assert.deepEqual(mine(),{'7':-1});
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows(1,0)}); await b.flush(); assert.equal(a.live.postsMsg,'','a success clears the vote message');
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'post'},404); await b.flush();
  assert.ok(b.find('/posts','GET'),'a deleted post triggers a list reload'); assert.deepEqual(mine(),{}); b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.match(a.get('postList').innerHTML,/class="empty"/);
  a.get('nickDlg').showModal=function(){this.open=true;}; // the stub dialog has no showModal by default
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'auth'},403); await b.flush();
  assert.equal(a.store.nickToken,''); assert.deepEqual(mine(),{}); assert.equal(a.get('nickDlg').open,true,'gate opens on a lost token');
  // without a nickname the gate opens and nothing is sent
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); const before=b.calls.length;
  a.get('nickDlg').showModal=function(){this.open=true;}; a.get('nickDlg').open=false; a.postVote(7,1); await b.flush(); assert.equal(b.calls.length,before); assert.equal(a.get('nickDlg').open,true);
  // bad arguments are ignored; a rename to another nickname drops the cache, a case change of the same name keeps it
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok,votes:{'7':1}},b.fetch); b.answer('/posts','GET',{rows:rows(1,0)}); await b.flush();
  a.postVote('7',1); a.postVote(7,2); await b.flush(); assert.equal(b.find('/vote','POST'),undefined);
  a.claimNick('ME'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'ME',token:'cd'.repeat(24)}); await b.flush(); assert.deepEqual(mine(),{'7':1});
  a.claimNick('other'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'other',token:'ef'.repeat(24)}); await b.flush(); assert.deepEqual(mine(),{});
  // a rename while a vote is in flight: the answer updates the list but not the new nickname's cache; a saved cache without a nickname is dropped on load
  a.postVote(7,1); await b.flush(); a.claimNick('third'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'third',token:'ab'.repeat(24)}); await b.flush();
  b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows(1,0)}); await b.flush(); assert.deepEqual(mine(),{},'the old nickname\'s vote is not remembered under the new one'); assert.equal(a.live.voting,false); assert.match(a.get('postList').innerHTML,/>👍 1</);
  a=boot({v:4,lang:'ko',window:12,votes:{'7':1}},b.fetch); assert.deepEqual(JSON.parse(JSON.stringify(a.store.votes)),{});
  // old worker without counts: buttons still render with 0
  a.live.posts=[{id:7,nick:'x',text:'hi',created_at:1}]; a.renderPosts(); assert.match(a.get('postList').innerHTML,/>👍 0<[\s\S]*>👎 0</);

  // An old vote response must not log out a newly claimed nickname.
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'old',nickToken:tok},b.fetch);
  a.postVote(7,1); await b.flush();
  a.store.nick='new'; a.store.nickToken='cd'.repeat(24);
  b.answer('/vote','POST',{error:'auth'},403); await b.flush();
  assert.equal(a.store.nick,'new'); assert.equal(a.store.nickToken,'cd'.repeat(24));
});
test('post replies: render many, submit one level deep, keep text on failure, close on success, and gate by nickname',async()=>{
  const tok='ab'.repeat(24), rows=replies=>[{id:7,nick:'original',text:'question',created_at:1,up:0,down:0,replies}];
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch);
  b.answer('/posts','GET',{rows:rows([{id:1,post_id:7,nick:'one',text:'first',created_at:2},{id:2,post_id:7,nick:'two',text:'second',created_at:3}])}); await b.flush();
  let html=a.get('postList').innerHTML; assert.match(html,/답글 2/); assert.ok(html.indexOf('first')<html.indexOf('second'),'replies render oldest first');
  a.live.replyTo=7; a.live.replyText='draft'; a.renderPosts(); html=a.get('postList').innerHTML;
  assert.match(html,/class="reply-form" data-id="7"/); assert.match(html,/value="draft"/); assert.match(html,/placeholder="답글 쓰기 \(200자\)"/);
  a.postVote(7,1); await b.flush(); a.replySend(7,'must wait'); await b.flush();
  assert.equal(b.calls.filter(x=>x.url.includes('/reply')).length,0,'a reply cannot race a vote snapshot');
  assert.match(a.get('postList').innerHTML,/class="reply-form"[\s\S]*<input[^>]* disabled/);
  b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows([{id:1,post_id:7,nick:'one',text:'first',created_at:2},{id:2,post_id:7,nick:'two',text:'second',created_at:3}])}); await b.flush();
  a.replySend(7,' hello   reply '); await b.flush(); let c=b.find('/reply','POST');
  assert.deepEqual(c.body,{nick:'me',token:tok,id:7,text:'hello reply'}); assert.equal(a.live.replying,true); assert.match(a.get('postMsg').textContent,/답글 보내는 중/);
  const votesBefore=b.calls.filter(x=>x.url.includes('/vote')).length; a.postVote(7,-1); await b.flush();
  assert.equal(b.calls.filter(x=>x.url.includes('/vote')).length,votesBefore,'a vote cannot race a reply snapshot');
  b.answer('/reply','POST',{ok:true,id:3,postId:7,rows:rows([{id:3,post_id:7,nick:'me',text:'hello reply',created_at:4}])}); await b.flush();
  assert.equal(a.live.replying,false); assert.equal(a.live.replyTo,0); assert.equal(a.live.replyText,''); assert.match(a.get('postList').innerHTML,/hello reply/); assert.doesNotMatch(a.get('postList').innerHTML,/reply-form/);
  a.live.replyTo=7; a.replySend(7,'retry me'); await b.flush(); b.answer('/reply','POST',{error:'rate'},429); await b.flush();
  assert.equal(a.live.replyText,'retry me'); assert.equal(a.live.replyTo,7); assert.equal(a.get('postMsg').textContent,'너무 빠릅니다. 1분에 3개까지 남길 수 있습니다.');
  a.setLang('ja'); assert.match(a.get('postList').innerHTML,/返信 1件/); assert.match(a.get('postList').innerHTML,/キャンセル/);
  a.replySend(7,'gone'); await b.flush(); b.answer('/reply','POST',{error:'post'},404); await b.flush(); assert.ok(b.find('/posts','GET'),'a deleted parent reloads the list');
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); const before=b.calls.length; a.get('nickDlg').showModal=function(){this.open=true;};
  a.replySend(7,'hi'); await b.flush(); assert.equal(b.calls.length,before); assert.equal(a.get('nickDlg').open,true);
});
test('app and worker agree on the leaderboard contract (boards, windows, detail fields)',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const a=boot({v:4,lang:'ko',window:15});
  assert.deepEqual([...a.WINDOWS],w.WINDOWS);assert.deepEqual([...a.BOARDS],Object.keys(w.BOARDS));
  assert.deepEqual(html.match(/<button data-board="(\w+)"/g).map(x=>x.match(/"(\w+)"/)[1]),Object.keys(w.BOARDS),'#boardTabs buttons');
  const run=(mode,play)=>{a.setMode(mode);a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();play();a.endTrial();return JSON.parse(JSON.stringify(a.boardEntry(a.trial.result,mode)));};
  const entries={wave10:run('wave10',()=>{dash(a,4100);a.time(14100);}),ewgf20:run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);}),
    combo10:run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);}),
    rush30:run('rush30',()=>{dash(a,4100);a.world.dummyX=a.world.charX+60;a.world.dummy.type='low';dash(a,4300);a.onButton(4,4400);a.time(34100);a.trialTick(34100);}),
    bd10:run('bd10',()=>{const o=bdOut(a,4100);a.onDir('db',o+fr(a.BD.MOVE_F));a.time(14100);})};
  for(const [m,e] of Object.entries(entries)){
    const v=w.validate({...e,nick:'smoke'});assert.equal(v.error,undefined,m+': '+JSON.stringify(e));
    assert.deepEqual(Object.keys(v.value.detail),Object.keys(e.detail),m+' detail fields');assert.equal(v.value.win,15);
  }
});
test('wave chart top band and coach tempo follow the wave10 top-10% cut (cut10), falling back to 5 dashes/s',()=>{
  const a=boot({v:4,lang:'ko',window:12}), chart=a.get('waveChart'), coach=a.get('coachMsg');
  const chain=t=>{dash(a,t);for(const d of [t+100,t+300]){a.onDir('f',d);a.onDir('n',d+20);dash(a,d+40);}}; // start 6 every 200ms = 5.0 dashes/s
  assert.equal(a.waveTop(),null);a.renderWave();assert.match(chart.innerHTML,/상급 \(5 이상\)/,'no board yet: fixed label');
  assert.doesNotMatch(chart.innerHTML,/>10</,'default axis tops out at 8');
  chain(1000);assert.ok(coach.innerHTML.startsWith('<strong>상위권 속도</strong>'),coach.innerHTML);
  a.board.data.wave10={...topRes('x'),cut10:8.5};assert.equal(a.waveTop(),8.5);a.renderWave();
  assert.match(chart.innerHTML,/상위 10% \(8\.5 이상\)/);assert.match(chart.innerHTML,/>10</,'axis grows so the band stays on the chart');
  a.clearCommand();chain(3000);assert.ok(coach.innerHTML.startsWith('빠른 편입니다.'),'5.0 dashes/s is below an 8.5 cut: '+coach.innerHTML);
  a.board.data.wave10={...topRes('x'),cut10:4.5};a.clearCommand();chain(5000);assert.ok(coach.innerHTML.startsWith('<strong>상위권 속도</strong>'),'5.0 dashes/s clears a 4.5 cut: '+coach.innerHTML);a.board.data.wave10={...topRes('x'),cut10:6.2};
  assert.equal(a.buildCard(a.shareSource()).chart.top,6.2,'the share card shades the same band');
  a.setLang('en');a.renderWave();assert.match(chart.innerHTML,/Top 10% \(6\.2\+\)/);
  for(const bad of [{cut10:null},{cut10:0},{cut10:'7'},{}]){a.board.data.wave10={...topRes('x'),...bad,cut10:bad.cut10};assert.equal(a.waveTop(),null,JSON.stringify(bad));}
});
test('backend does no recurring D1 reads; shoutbox refresh is explicit and the last wave cut stays cached',async()=>{
  const b=backend(),a=boot({v:4,lang:'ko'},b.fetch);
  b.answer('/top?board=wave10','GET',{...topRes('x'),cut10:8.5});
  b.answer('/posts','GET',{rows:[]}); b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush();
  const before=b.calls.length, periodic=[...a.timers.values()].find(fn=>String(fn).includes('bumpVisitDay()'));
  assert.ok(periodic,'the local KST-day rollover timer remains');
  for(let i=0;i<20;i++) periodic();
  assert.equal(b.calls.length,before,'the timer does not poll rankings, posts or visits during the same KST day');
  assert.equal(a.waveTop(),8.5,'the last successful cut remains cached until a user action or submission updates it');
  assert.equal(a.get('postsRefresh').disabled,false); assert.equal(a.get('postsRefresh').textContent,'새로고침');
  a.get('postsRefresh').click(); await b.flush();
  assert.equal(b.calls.filter(c=>c.url.endsWith('/posts')).length,2,'the refresh button performs exactly one new posts request');
  assert.equal(a.get('postsRefresh').disabled,true); assert.equal(a.get('postsRefresh').textContent,'불러오는 중…');
  a.get('postsRefresh').click(); await b.flush();
  assert.equal(b.calls.filter(c=>c.url.endsWith('/posts')).length,2,'repeat clicks are ignored while loading');
  b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.equal(a.get('postsRefresh').disabled,false); assert.equal(a.get('postsRefresh').textContent,'새로고침');
  a.setLang('en'); assert.equal(a.get('postsRefresh').textContent,'Refresh');
});
test('shoutbox explains only a real D1 quota failure in plain language',async()=>{
  const b=backend(),a=boot({v:4,lang:'ko'},b.fetch);
  b.answer('/top?board=wave10','GET',{...topRes('x'),cut10:8.5});
  b.answer('/posts','GET',{error:'server',message:"Exceeded D1's free tier daily row read limit"},500); b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush();
  assert.equal(a.get('postMsg').textContent,'오늘 무료 서버 사용량을 다 써서 한마디를 이용할 수 없습니다. 더 좋은 서버를 쓰려면 후원이 절실합니다 ㅜㅜ');
  a.get('postsRefresh').click(); await b.flush(); b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.equal(a.get('postMsg').textContent,'','a later successful refresh clears the quota notice');
});
