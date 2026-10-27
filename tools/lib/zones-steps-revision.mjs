import { lifeExpected, priorLifeSource } from './purposeful-life-revision.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='content/scene-data/zones-steps.revision.json';
export const zonesStepRevision=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
const allowed=new Set(['apps/web-tour/src/scene/DistrictLife.ts','apps/web-tour/src/scene/DistrictNavigation.ts','apps/web-tour/src/scene/GroundedVisitorCamera.ts','apps/web-tour/src/scene/InstancedDistrictCrowd.ts','tools/lib/crowd-clarity-revision.mjs','tools/validate-crowd-clarity.mjs']);
if(zonesStepRevision)for(const f of Object.keys(zonesStepRevision.files))assert.ok(allowed.has(f),'Zone/step revision escaped scope: '+f);
export function zonesStepExpected(f,previous,normalized=false){const r=zonesStepRevision?.files[f];if(!r)return lifeExpected(f,previous,normalized);if(!normalized&&previous===r.beforeRaw)return lifeExpected(f,r.afterRaw);assert.equal(previous,r.before,'Zone/step baseline mismatch: '+f);return lifeExpected(f,r.after,normalized);}
export function priorZonesStepSource(f){const r=zonesStepRevision?.files[f];if(!r)return priorLifeSource(f);assert.equal(hash(priorLifeSource(f)),r.afterRaw,'Unrecorded zone/step source: '+f);const b=fs.readFileSync(r.baseline);assert.equal(hash(b),r.beforeRaw,'Zone/step baseline changed: '+f);return b.toString('utf8');}
