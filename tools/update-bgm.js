// Local/file:// preview fallback. tools/build-site.js independently scans bgm/ for the Pages artifact.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
function tracksAt(dir) {
  return fs.readdirSync(dir, {withFileTypes:true})
    .filter(f => f.isFile() && !/^[._#]/.test(f.name) && /\.mp3$/i.test(f.name))
    .map(f => 'bgm/' + f.name).sort();
}
if (require.main === module) {
  const tracks = tracksAt(path.join(root, 'bgm'));
  const file = path.join(root, 'index.html'), html = fs.readFileSync(file, 'utf8');
  const pattern = /^const BGM_TRACKS=.*; \/\/ Generated local fallback.*$/m;
  if (!pattern.test(html)) throw new Error('BGM fallback marker missing');
  const literal = JSON.stringify(tracks).replace(/</g, '\\u003c');
  fs.writeFileSync(file, html.replace(pattern, () => 'const BGM_TRACKS='+literal+'; // Generated local fallback: node tools/update-bgm.js'));
  console.log(`BGM: ${tracks.length} tracks`);
}
module.exports = {tracksAt};
