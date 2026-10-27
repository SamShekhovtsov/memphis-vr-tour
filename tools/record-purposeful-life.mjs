import fs from 'node:fs';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=b=>b.toString().replaceAll('\r\n','\n');
const index=JSON.parse(fs.readFileSync('content/source-assets/purposeful-life-baseline/index.json'));
const files=Object.fromEntries(Object.entries(index).filter(([f,b])=>hash(fs.readFileSync(f))!==hash(fs.readFileSync(b))).map(([f,baseline])=>{const a=fs.readFileSync(f),b=fs.readFileSync(baseline);return[f,{baseline,beforeRaw:hash(b),afterRaw:hash(a),before:hash(norm(b)),after:hash(norm(a))}];}));
const additions=['ResidentProfiles','ResidentActivities','ResidentBrain','ResidentCoordination'].map(n=>'apps/web-tour/src/scene/'+n+'.ts').filter(f=>fs.existsSync(f));
fs.writeFileSync('content/scene-data/purposeful-life.revision.json',JSON.stringify({date:'2026-10-27',scope:'63 purposeful residents; no static layout, camera, traversal, material or population changes',files,additions:Object.fromEntries(additions.map(f=>[f,hash(fs.readFileSync(f))]))},null,2)+'\n');
