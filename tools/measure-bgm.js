// Match louder tracks to bgm/bgm.mp3 without rewriting/re-encoding audio.
// Requires ffmpeg on PATH. Refresh the playlist separately with update-bgm.js.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {tracksAt}=require('./update-bgm');
const root=path.join(__dirname,'..');
const tracks=tracksAt(path.join(root,'bgm'));
const reference='bgm/bgm.mp3';
if(!tracks.includes(reference))throw new Error('Reference missing: '+reference);
const levels={};
for(const track of tracks){
  const result=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',path.join(root,track),'-af','loudnorm=print_format=json','-f','null','-'],{encoding:'utf8',maxBuffer:4*1024*1024});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Measurement failed: '+track+'\n'+result.stderr);
  const match=result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if(!match)throw new Error('No loudness measurement: '+track);
  const level=Number(JSON.parse(match[0]).input_i);
  if(!Number.isFinite(level))throw new Error('Invalid/silent track: '+track);
  levels[track]=level;
  console.log(`${track}: ${level.toFixed(2)} LUFS`);
}
const gains={};
for(const track of tracks){
  const db=Math.min(0,levels[reference]-levels[track]);
  gains[track]=Number((10**(db/20)).toFixed(6));
  console.log(`${track}: ${db.toFixed(2)} dB / gain ${gains[track]}`);
}
const file=path.join(root,'index.html'),html=fs.readFileSync(file,'utf8');
const marker=/^const BGM_GAIN=.*; \/\/ Generated loudness gains.*$/m;
if(!marker.test(html))throw new Error('BGM gain marker missing');
const literal=JSON.stringify(gains).replace(/</g,'\\u003c');
fs.writeFileSync(file,html.replace(marker,()=>`const BGM_GAIN=${literal}; // Generated loudness gains: node tools/measure-bgm.js`));
