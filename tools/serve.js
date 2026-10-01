// Local preview server for _site/ (preview.cmd). Serves folders the way GitHub Pages does: /ko/guide/ → /ko/guide/index.html.
// Opening _site/index.html as a file:// page cannot do that, so folder links showed the browser's directory listing instead.
//   node tools/serve.js [port]      (default 8080; the next free port is used when it is taken)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '_site');
const TYPES = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg', '.ico':'image/x-icon'};

// Map a request path to a file inside _site/, or null. Folders need the trailing slash, like Pages (it redirects /ko → /ko/).
function resolve(urlPath){
  const [pathname, query=''] = urlPath.split(/\?(.*)/s);
  let rel;
  try{ rel = decodeURIComponent(pathname); }catch(e){ return null; }
  if(!rel.startsWith('/') || /[\\\x00-\x1f\x7f]/.test(rel)) return null;
  const file = path.resolve(ROOT, '.'+rel);
  if(file !== ROOT && !file.startsWith(ROOT+path.sep)) return null; // no ../ escapes
  // A rebuild can remove files between requests; stat/open failures must not stop the server.
  try{
    const stat = fs.statSync(file);
    if(stat.isDirectory()){
      if(!rel.endsWith('/')){
        const canonical = '/'+path.relative(ROOT,file).split(path.sep).filter(Boolean).map(encodeURIComponent).join('/');
        return {redirect: canonical.replace(/\/$/,'')+'/'+(query?'?'+query:'')};
      }
      const index = path.join(file, 'index.html');
      return fs.statSync(index).isFile() ? {file: index} : null;
    }
    return stat.isFile() ? {file} : null;
  }catch(e){
    return null;
  }
}

function createServer(){
  return http.createServer((req, res) => {
    const hit = resolve(req.url);
    if(hit && hit.redirect){ res.writeHead(301, {Location: hit.redirect}); return res.end(); }
    if(!hit){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('404 Not Found'); }
    const stream = fs.createReadStream(hit.file);
    stream.on('error', e => {
      if(res.headersSent) return res.destroy();
      res.writeHead(e.code==='ENOENT'?404:500, {'Content-Type':'text/plain; charset=utf-8'});
      res.end(e.code==='ENOENT'?'404 Not Found':'500 Read Error');
    });
    stream.on('open', () => {
      res.writeHead(200, {'Content-Type': TYPES[path.extname(hit.file).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store'});
      stream.pipe(res);
    });
    res.on('close', () => stream.destroy());
  });
}

function serve(port){
  const server = createServer();
  server.on('error', e => {
    if(e.code === 'EADDRINUSE' && port < 8100) return serve(port+1);
    console.error(e.message); process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const url = 'http://localhost:'+port+'/';
    console.log('Mishima Dojo preview: '+url+'  (close this window or press Ctrl+C to stop)');
    if(process.argv.includes('--open')) require('node:child_process').exec('start "" "'+url+'"');
  });
}
if(require.main === module){
  if(!fs.existsSync(path.join(ROOT, 'index.html'))){ console.error('_site/ is empty. Run: node tools/build-site.js'); process.exit(1); }
  serve(Number(process.argv.find(a => /^\d+$/.test(a))) || 8080);
}
module.exports = {resolve, createServer, ROOT};
