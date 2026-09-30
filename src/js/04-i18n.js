/* ---------- i18n ---------- */
const LOCALE = {ko:'ko-KR', en:'en-US', ja:'ja-JP'};
// Dictionaries: src/i18n/{ko,en,ja}.js, included just before this file.
const I18N = {ko:I18N_KO, en:I18N_EN, ja:I18N_JA};
const T = (key, ...args) => {
  const d = I18N[store.lang] || I18N.ko;
  const v = key in d ? d[key] : I18N.ko[key];
  if(v===undefined) return key;
  return typeof v==='function' ? v(...args) : v;
};
const msg = v => typeof v==='function' ? v() : Array.isArray(v) ? T(...v) : (v==null?'':v);
const displayFont = () => store.lang==='ja' ? '"Dela Gothic One", "Noto Sans JP", sans-serif' : '"Black Han Sans", "Noto Sans KR", sans-serif';

