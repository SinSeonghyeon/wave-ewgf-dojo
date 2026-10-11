/* ---------- characters (결정 34(char-select)) ----------
   A character is data, never a name check: capability flags, the moves it owns, and (for a non-legacy character)
   the just-frame recipe its button resolves through. The judging engine — the 60Hz grid, the staged 6N3 slot
   (mistDir/mistButton), the wave machine, the input log and the challenge plumbing — is shared by every character.
   caps: wave = 6N23 crouch dash and the 6 N 6N23 wave loop · kbd = Korean backdash judging (bd machine, bd10; every
   character shares BD.CURVE, 2026-10-11 user decision) · wsc = 웨캔기어 · giwon = 기원권 recovery and the 기원초 link.
   legacy: the existing button path (commandButton) stays byte-for-byte, so the default character never regresses.
   jf: {move, btn} — a 6N3 + btn same-60Hz-frame just frame judged through the staged 6N3 path (결정 33(jfsr)).
   portrait: the character-select image (official tekken.com fighter-select art, 2026-10-11 user decision — 결정 3(no-official-ip)
   exception, inlined from src/assets by tools/assemble.js); the player's SD doll and outfit are untouched. */
const CHARS = {
  kazuya:   {caps:{wave:true, kbd:true, wsc:true,  giwon:true},  moves:['ewgf','mist','tongbal','hellsweep','giwon'], legacy:true, portrait:'@@DATA_URI:assets/portrait-kazuya.webp@@'},
  hwoarang: {caps:{wave:true, kbd:true, wsc:false, giwon:false}, moves:['jfsr'], jf:{move:'jfsr', btn:4}, portrait:'@@DATA_URI:assets/portrait-hwoarang.webp@@'},
};
const CHAR_IDS = Object.keys(CHARS), CHAR_DEFAULT = 'kazuya';
const charId = () => CHARS[store.char] ? store.char : CHAR_DEFAULT;
const charOf = () => CHARS[charId()];
const charCap = k => !!charOf().caps[k];
const charHas = k => charOf().moves.includes(k);
// 기술 온오프는 캐릭터마다 따로 (결정 32(move-toggle), 2026-10-12): a character's moves are exactly its switchable list. 1 = 켜짐
const movesDefault = () => Object.fromEntries(CHAR_IDS.map(c => [c, Object.fromEntries(CHARS[c].moves.map(k => [k,1]))]));
// a character may word a shared string its own way: '<key>.<char id>' wins when it exists (the default character uses the plain key)
const charKey = k => !charOf().legacy && I18N.ko[k+'.'+charId()]!=null ? k+'.'+charId() : k;
