import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),norm=b=>b.toString().replaceAll('\r\n','\n');
const index=JSON.parse(fs.readFileSync('content/source-assets/character-art-baseline/index.json'));
const files=Object.fromEntries(Object.entries(index).filter(([f,b])=>sha(fs.readFileSync(f))!==sha(fs.readFileSync(b))).map(([f,baseline])=>{const a=fs.readFileSync(f),b=fs.readFileSync(baseline);return[f,{baseline,beforeRaw:sha(b),afterRaw:sha(a),before:sha(norm(b)),after:sha(norm(a))}];}));
fs.writeFileSync('content/scene-data/character-art.revision.json',JSON.stringify({date:'2026-10-27',scope:'Garment coverage/clearance and two reference character bases; scene, behavior, cameras, rig and material textures preserved',files},null,2)+'\n');
