import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {interactionRevision as r} from './lib/district-interaction-revision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(r);
for(const [f,v]of Object.entries(r.files)){assert.equal(hash(fs.readFileSync(f)),v.afterRaw,f);assert.equal(hash(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,sha]of Object.entries(r.additions))assert.equal(hash(fs.readFileSync(f)),sha,f);
const nav=JSON.parse(fs.readFileSync('content/scene-data/district-navigation.json'));assert.equal(nav.houses.length,14);assert.equal(nav.spawns.length,6);assert.equal(new Set(nav.houses.map(h=>h.id)).size,14);
for(const h of nav.houses){assert.ok(h.minX<h.maxX&&h.minZ<h.maxZ&&h.height>1);assert.ok(!h.id.endsWith('-7'),'Removed houses must stay absent');}
const manifest=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-street/manifest.json'));assert.equal(manifest.exteriorRepair.vertexPositionsChanged,false);assert.equal(manifest.exteriorRepair.normalsCorrected,true);
for(const a of Object.values(manifest.exteriorRepair.audit)){assert.equal(a.clippedChannels,0);assert.equal(a.unchangedOutsideMask,true);}
console.log('District interaction integrity passed: bounded source/lighting/normal changes, original baselines retained, 14 houses and six new resident spawns');
