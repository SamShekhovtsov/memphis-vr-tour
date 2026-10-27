import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {actionRevision as r} from './lib/character-action-revision.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),index=JSON.parse(fs.readFileSync('content/source-assets/character-action-baseline/index.json'));
const allowed=['apps/web-tour/src/scene/HeroPeople.ts','apps/web-tour/src/scene/InstancedDistrictCrowd.ts','apps/web-tour/src/scene/DistrictLife.ts','tools/lib/character-surface-revision.mjs','tools/validate-character-surfaces.mjs'];
assert.deepEqual(Object.keys(index).sort(),allowed.sort());assert.deepEqual(Object.keys(r.files).sort(),Object.keys(index).sort());
for(const [f,v]of Object.entries(r.files)){assert.equal(sha(fs.readFileSync(f)),v.afterRaw,f);assert.equal(sha(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,h]of Object.entries(r.artifacts))assert.equal(sha(fs.readFileSync(f)),h,f);
const locked=JSON.parse(fs.readFileSync('content/source-assets/character-action-baseline/locked.json'));for(const [f,h]of Object.entries(locked))assert.equal(sha(fs.readFileSync(f)),h,f);
const f='apps/web-tour/src/scene/DistrictLife.ts',source=fs.readFileSync(f,'utf8'),before=fs.readFileSync(index[f],'utf8');
const edits=["     if(person.root.metadata.activity!==brain.intent)person.root.metadata.actionStarted=time;\n","     person.root.metadata.actionStation=brain.stage==='act'?brain.target:undefined;\n"];
let restored=source;for(const e of edits){assert.equal(restored.split(e).length,2);restored=restored.replace(e,'');}assert.equal(restored.replaceAll('\r\n','\n'),before.replaceAll('\r\n','\n'),'Movement/brain behavior changed beyond presentation metadata');
for(const f of allowed.filter(f=>/HeroPeople|InstancedDistrictCrowd/.test(f))){const s=fs.readFileSync(f,'utf8');assert.ok(!s.includes('registerBeforeRender'));}
console.log(`Action integrity passed: ${Object.keys(locked).length} original source/data/assets locked; movement/decision code reconstructed exactly; six-resident interpolation prototype`);
