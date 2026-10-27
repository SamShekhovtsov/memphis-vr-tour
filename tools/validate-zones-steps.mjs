import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {zonesStepRevision as r} from './lib/zones-steps-revision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(r);
for(const [f,v]of Object.entries(r.files)){assert.equal(hash(fs.readFileSync(f)),v.afterRaw,f);assert.equal(hash(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,h]of Object.entries(r.additions))assert.equal(hash(fs.readFileSync(f)),h,f);
const p=JSON.parse(fs.readFileSync('content/scene-data/district-population.json'));assert.equal(p.total,p.previousTotal*70/100);assert.equal(p.total,126);assert.deepEqual(p.zones.map(z=>z.weight),[40,40,15,5]);
console.log('Population/step integrity passed: 30% population reduction, bounded area/movement changes, original baselines preserved');
