import {zonesStepExpected,priorZonesStepSource} from "./zones-steps-revision.mjs";
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='content/scene-data/crowd-clarity.revision.json';
export const crowdRevision=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
const allowed=new Set(['apps/web-tour/src/scene/HeroPeople.ts','apps/web-tour/src/scene/DistrictLife.ts','apps/web-tour/src/scene/ImageQuality.ts','apps/web-tour/src/scene/CrispFxaa.ts','tools/lib/image-quality-revision.mjs','tools/validate-image-quality.mjs','tools/capture-hero-shot.mjs','tools/benchmark-rendering.mjs']);
if(crowdRevision)for(const f of Object.keys(crowdRevision.files))assert.ok(allowed.has(f),'Crowd/clarity scope escaped: '+f);
export function crowdExpected(f,previous,normalized=false){const r=crowdRevision?.files[f];if(!r)return zonesStepExpected(f,previous,normalized);if(!normalized&&previous===r.beforeRaw)return zonesStepExpected(f,r.afterRaw,normalized);assert.equal(previous,r.before,'Crowd/clarity baseline mismatch: '+f);return zonesStepExpected(f,r.after,normalized);}
export function priorCrowdSource(f){const r=crowdRevision?.files[f];const current=priorZonesStepSource(f);if(!r)return current;assert.equal(hash(current),r.afterRaw,'Unrecorded crowd change: '+f);const b=fs.readFileSync(r.baseline);assert.equal(hash(b),r.beforeRaw,'Crowd baseline changed: '+f);return b.toString('utf8');}
