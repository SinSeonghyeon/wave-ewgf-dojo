// Builds the single-file app from src/. This is the only way to get index.html: the Pages build (tools/build-site.js),
// every test and every tool call assemble() instead of reading a checked-in index.html.
//
//   src/app.html                shell: <head>, markup, and `@@include <file>` lines in execution order
//   src/style.css               the one stylesheet
//   src/i18n/{ko,en,ja}.js      I18N_KO / I18N_EN / I18N_JA dictionaries
//   src/js/NN-*.js              app script, concatenated inside one strict IIFE (shared top-level scope)
//   src/assets/*                binaries inlined as data URIs through `@@DATA_URI:<file>@@`
//
// A line that is exactly `@@include <file>` is replaced by that file's contents. No nesting, no globbing:
// the include order in src/app.html is the execution order.
const fs = require('node:fs');
const path = require('node:path');
const SRC = path.resolve(__dirname, '..', 'src');
const MIME = {'.webp':'image/webp', '.png':'image/png'};

const text = file => fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r\n/g, '\n');
function assemble(){
  const seen = new Set();
  const html = text('app.html').replace(/^@@include ([^\s]+)\n/gm, (_, file) => {
    if(seen.has(file)) throw new Error('src/app.html includes '+file+' twice');
    seen.add(file);
    const body = text(file);
    if(!body.endsWith('\n')) throw new Error('src/'+file+' must end with a newline');
    if(/^@@include /m.test(body)) throw new Error('src/'+file+': nested @@include is not supported');
    return body;
  });
  if(/^@@include /m.test(html)) throw new Error('unresolved @@include in src/app.html');
  return html.replace(/@@DATA_URI:([^@\s]+)@@/g, (_, file) => {
    const mime = MIME[path.extname(file)];
    if(!mime) throw new Error('no MIME type for '+file);
    return 'data:'+mime+';base64,'+fs.readFileSync(path.join(SRC, file)).toString('base64');
  });
}
// Every src file the shell pulls in, in order (tools that rewrite a constant find its file here).
const includes = () => [...text('app.html').matchAll(/^@@include ([^\s]+)$/gm)].map(m => m[1]);
// The file under src/ whose text contains `needle` (exactly one), for tools that patch generated constants.
function sourceFileContaining(needle){
  const hits = includes().filter(f => text(f).includes(needle));
  if(hits.length !== 1) throw new Error(`expected one src file containing ${needle}, found ${hits.length}`);
  return path.join(SRC, hits[0]);
}
if(require.main === module){ // node tools/assemble.js [out.html] → writes the assembled page (default: stdout size only)
  const html = assemble(), out = process.argv[2];
  if(out) fs.writeFileSync(out, html); else console.log(html.length+' chars from '+includes().length+' src files');
}
module.exports = {assemble, includes, sourceFileContaining, SRC};
