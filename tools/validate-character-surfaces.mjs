import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {surfaceRevision as r} from './lib/character-surface-revision.mjs';
import {actionExpected} from './lib/character-action-revision.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const index=JSON.parse(fs.readFileSync('content/source-assets/character-surface-baseline/index.json'));
assert.deepEqual(Object.keys(index).sort(),['apps/web-tour/src/scene/HeroPeopleMaterials.ts','tools/lib/character-art-revision.mjs'].sort());
assert.deepEqual(Object.keys(r.files).sort(),Object.keys(index).sort());
for(const [f,v]of Object.entries(r.files)){assert.equal(sha(fs.readFileSync(f)),actionExpected(f,v.afterRaw),f);assert.equal(sha(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,h]of Object.entries(r.artifacts))assert.equal(sha(fs.readFileSync(f)),actionExpected(f,h),f);
const locked=JSON.parse(fs.readFileSync('content/source-assets/character-surface-baseline/locked.json'));
for(const [f,h]of Object.entries(locked))assert.equal(sha(fs.readFileSync(f)),actionExpected(f,h),'Locked geometry/simulation/camera/source changed: '+f);
const folder='apps/web-tour/public/assets/authored/people/surfaces-v2/',m=JSON.parse(fs.readFileSync(folder+'manifest.json'));
assert.equal(m.geometryChanged,false);assert.equal(Object.keys(m.maps).length,9);
let bytes=0;for(const [f,v]of Object.entries(m.maps)){const data=fs.readFileSync(folder+f);assert.equal(sha(data),v.sha256);assert.equal(data.length,v.bytes);assert.equal(v.width,512);assert.equal(v.height,512);bytes+=data.length;}
assert.ok(bytes<1200000,'Surface texture download exceeds previous nine-map budget');
const source=fs.readFileSync('apps/web-tour/src/scene/HeroPeopleMaterials.ts','utf8');
assert.ok(source.includes('family === "skin" && channel === "normal"'));
assert.ok(source.includes('material.metallicTexture = cinematic ? map(family, "orm") : null'));
assert.ok(!/subSurface|reflectionTexture|onBeforeRender/.test(source),'Unexpected runtime pass or transmission');
console.log(`Character surfaces passed: ${Object.keys(locked).length} locked files, nine shared 512px maps (${bytes} bytes), unchanged geometry/rigs/behavior/cameras`);
