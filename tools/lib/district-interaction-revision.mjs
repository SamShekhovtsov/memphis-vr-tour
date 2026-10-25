import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const file='content/scene-data/district.interaction-revision.json';
export const interactionRevision=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
const allowed=f=>f==='tools/blender/generate_memphis_asset_kit.py'||/^apps\/web-tour\/src\/scene\/(MemphisWhiteWallsScene|HeroPeople|HeroStreetMaterials)\.ts$/.test(f)||/^apps\/web-tour\/public\/assets\/authored\/hero-street\/(manifest\.json|(near|mid|far)-irradiance\.(png|webp)|hero_street_corridor_(near|mid|far)(\.lod[12])?\.glb)$/.test(f);
if(interactionRevision)for(const f of Object.keys(interactionRevision.files))assert.ok(allowed(f),'Interaction change escaped reviewed scope: '+f);
export function interactionExpected(file,previous,normalized=false){const r=interactionRevision?.files[file];if(!r)return previous;if(!normalized&&previous===r.beforeRaw)return r.afterRaw;assert.equal(previous,r.before,'Original visual baseline lost: '+file);return r.after;}
export function priorInteractionSource(file){const r=interactionRevision?.files[file];if(!r)return fs.readFileSync(file,'utf8');assert.equal(hash(fs.readFileSync(file)),r.afterRaw,'Unrecorded interaction source change: '+file);const b=fs.readFileSync(r.baseline);assert.equal(hash(b),r.beforeRaw,'Interaction baseline modified: '+file);return b.toString('utf8');}
