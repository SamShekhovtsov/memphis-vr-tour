import fs from 'node:fs';import assert from 'node:assert/strict';
const path='content/scene-data/hero-street.steps78-revision.json';
export const finishRevision=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
const permitted=file=>['apps/web-tour/src/scene/RenderingTiers.ts','apps/web-tour/src/scene/HeroStreetMaterials.ts'].includes(file)||/^apps\/web-tour\/public\/assets\/authored\/hero-street\/(manifest\.json|(near|mid|far)-irradiance\.(png|webp)|hero_street_corridor_(near|mid|far)(\.lod[12])?\.glb)$/.test(file);
if(finishRevision)for(const [file,r] of Object.entries(finishRevision.files)){assert.ok(permitted(file),'Finish revision outside authorized visual scope: '+file);assert.match(r.before,/^[a-f0-9]{64}$/);assert.match(r.after,/^[a-f0-9]{64}$/);}
export function finishExpected(file,previous){const r=finishRevision?.files[file];if(!r)return previous;if(r.beforeRaw===previous)return r.afterRaw;assert.equal(r.before,previous,'Finish revision lost previous protected baseline: '+file);return r.after;}
