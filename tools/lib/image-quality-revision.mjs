import {crowdExpected,priorCrowdSource} from "./crowd-clarity-revision.mjs";
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const file='content/scene-data/hero-street.image-quality-revision.json';
export const qualityRevision=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
const allowed=f=>['apps/web-tour/src/scene/RenderingTiers.ts','apps/web-tour/src/scene/MemphisWhiteWallsScene.ts','tools/lib/district-interaction-revision.mjs','tools/validate-district-interactions.mjs','tools/capture-hero-shot.mjs','tools/benchmark-rendering.mjs','tools/repair-district-exteriors.mjs'].includes(f)||/^apps\/web-tour\/public\/assets\/authored\/hero-street\/(manifest\.json|hero_street_corridor_(mid|far)(\.lod[12])?\.glb)$/.test(f);
if(qualityRevision)for(const f of Object.keys(qualityRevision.files))assert.ok(allowed(f),'Image quality change escaped authorized rendering/cloth scope: '+f);
export function qualityExpected(file,previous,normalized=false){const r=qualityRevision?.files[file];if(!r)return crowdExpected(file,previous,normalized);if(!normalized&&r.beforeRaw===previous)return crowdExpected(file,r.afterRaw,normalized);assert.equal(previous,r.before,'Image-quality revision lost original baseline: '+file);return crowdExpected(file,r.after,normalized);}
export function priorQualitySource(file){const r=qualityRevision?.files[file];const current=priorCrowdSource(file);if(!r)return current;assert.equal(hash(current),r.afterRaw,'Unrecorded image quality source: '+file);const b=fs.readFileSync(r.baseline);assert.equal(hash(b),r.beforeRaw,'Image quality baseline changed: '+file);return b.toString('utf8');}
