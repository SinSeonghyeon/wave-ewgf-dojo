/* ---------- announcements ---------- */
// Newest first. For each patch, add one entry and the matching notice.<id> strings to all three I18N dictionaries.
// The latest id is the read marker saved in this browser; no backend or deployment-time request is involved.
const NOTICES = [
  {id:'2026-10-04-backdash',date:'2026-10-04',kind:'notice.kind.update',title:'notice.20261004.title',summary:'notice.20261004.summary',items:['notice.20261004.1','notice.20261004.2','notice.20261004.3','notice.20261004.4']},
  {id:'2026-09-30-roundup',date:'2026-09-30',kind:'notice.kind.update',title:'notice.20260930.title',summary:'notice.20260930.summary',highlight:{kind:'notice.wedding.kind',title:'notice.wedding.title',summary:'notice.wedding.summary',items:['notice.wedding.1','notice.wedding.2']},items:['notice.20260930.1','notice.20260930.2','notice.20260930.3','notice.20260930.4','notice.20260930.5','notice.20260930.6','notice.20260930.7','notice.20260930.8']},
  {id:'2026-09-21-roundup', date:'2026-09-21', kind:'notice.kind.update', title:'notice.20260921roundup.title', summary:'notice.20260921roundup.summary', items:['notice.20260921roundup.1','notice.20260921roundup.2','notice.20260921roundup.3','notice.20260921roundup.4','notice.20260921roundup.5']},
  {id:'2026-09-21-mist', date:'2026-09-21', kind:'notice.kind.update', title:'notice.20260921.title', summary:'notice.20260921.summary', items:['notice.20260921.1','notice.20260921.2','notice.20260921.3']},
  {id:'2026-09-19-dojo', date:'2026-09-19', kind:'notice.kind.update', title:'notice.20260919.title', summary:'notice.20260919.summary', items:['notice.20260919.1','notice.20260919.2','notice.20260919.3','notice.20260919.4','notice.20260919.5','notice.20260919.6']},
  {id:'2026-09-15-notices', date:'2026-09-15', kind:'notice.kind.update', title:'notice.20260915.title', summary:'notice.20260915.summary', items:['notice.20260915.1','notice.20260915.2','notice.20260915.3','notice.20260915.4','notice.20260915.5']},
];
const NOTICE_LATEST = NOTICES[0]?.id || '';
