import fs from 'node:fs';import assert from 'node:assert/strict';
const folder='docs/design/screenshots/',read=name=>JSON.parse(fs.readFileSync(folder+name+'.json'));
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)],round=x=>Math.round(x*10)/10;
const runs=[];for(let i=1;i<=3;i++)for(const variant of ['control','final']){
 const name=`hero-street-main-crowd-clarity-${variant}-${i}-after-1`,j=read(name);
 assert.equal(j.heroPeople,variant==='control'?9:180);assert.equal(j.frameIntervalsMs.samples,539);
 assert.match(j.gpu.renderer,/HD Graphics 4600/);assert.equal(j.renderWidth,1280);assert.equal(j.renderHeight,720);
 runs.push({variant,run:i,file:folder+name+'.json',p50:j.frameIntervalsMs.p50,p95:j.frameIntervalsMs.p95,draws:median(j.renderProfile.samples.draws.slice()),gpu:j.gpu});
}
const summary=Object.fromEntries(['control','final'].map(v=>[v,Object.fromEntries(['p50','p95','draws'].map(k=>[k,round(median(runs.filter(r=>r.variant===v).map(r=>r[k])))]))]));
const cost=Object.fromEntries(['p50','p95'].map(k=>[k,round(100*(summary.final[k]/summary.control[k]-1))]));
const views=['hero-street-main','street-entry','hero-street-material'].map(shot=>{
 const b=read(shot+'-crowd-clarity-before'),a=read(shot+'-crowd-clarity-after');
 assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.layoutRoots,b.layoutRoots);assert.deepEqual(a.viewport,b.viewport);
 assert.equal(a.heroPeople,180);assert.equal(b.heroPeople,9);
 return {shot,camera:a.camera,before:shot+'-crowd-clarity-before.png',after:shot+'-crowd-clarity-after.png',layoutMatched:true};
});
const crowd=read('hero-street-main-crowd-clarity-audit'),regression=read('hero-street-main-crowd-clarity-regression');
assert.ok(crowd.interactionAudit.passed);assert.ok(regression.interactionAudit.passed);assert.ok(regression.collisionAudit.passed);
const lods=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/crowd/manifest.json'));
const lodAudit=JSON.parse(fs.readFileSync('docs/design/crowd-lod-audit.json'));
const cine=read('hero-street-main-crowd-clarity-cinematic-after-1');assert.equal(cine.heroPeople,180);
const data={date:'2026-10-26',population:{before:9,after:180,gpuInstances:171,liveRiggedPeople:9},protocol:'Three interleaved controls/finals; 600 full-tour frames, 61 excluded initial frames, 300 simulated seconds of seeded crowd warm-up. Same 1280x720 camera route and HD 4600 D3D11. Controls use nine people and the previous resolve/filter policy; finals use 180 and the enhanced policy.',summary,costPercent:cost,runs,views,crowdAudit:crowd.interactionAudit,regression:{interaction:regression.interactionAudit,collision:regression.collisionAudit},lods:lods.assets,lodAudit,extraLodBytes:lods.assets.reduce((s,a)=>s+fs.statSync(a.file).size,0),cinematicSmoke:{frames:cine.frameIntervalsMs,antialiasing:cine.rendering?.antialiasing,note:'One smoke run, not a repeated tier comparison.'}};
fs.writeFileSync('docs/design/crowd-and-clarity-2026-10-26.json',JSON.stringify(data,null,2)+'\n');
const initial=read('hero-street-main-crowd-clarity-after').rendering.population.states;
const houses=JSON.parse(fs.readFileSync('content/scene-data/district-navigation.json')).houses;
const x=v=>30+(v+38)*6,z=v=>80+(100-v)*6;
const boxes=houses.map(h=>'<rect x="'+x(h.minX)+'" y="'+z(h.maxZ)+'" width="'+((h.maxX-h.minX)*6)+'" height="'+((h.maxZ-h.minZ)*6)+'" fill="#c2a87a" stroke="#68553b"/>').join('');
const dots=initial.map((p,i)=>'<circle cx="'+x(p.position[0])+'" cy="'+z(p.position[2])+'" r="'+(i<9?3:2.2)+'" fill="'+(i<9?'#087f8c':'#c35520')+'"><title>'+p.name+'</title></circle>').join('');
fs.writeFileSync('docs/design/crowd-population-map.svg','<svg xmlns="http://www.w3.org/2000/svg" width="570" height="1140" viewBox="0 0 570 1140"><rect width="570" height="1140" fill="#f5f0e6"/><g font-family="Arial" fill="#302b23"><text x="30" y="26" font-size="18">180 residents — final seeded QA positions</text><text x="30" y="49" font-size="12">Blue: original 9. Orange: added 171. Tan: house footprints.</text><text x="30" y="68" font-size="11">Plan view of x/z positions; this is not a rendered screenshot.</text>'+boxes+dots+'<text x="30" y="1120" font-size="12">Each dot is one resident across the existing district.</text></g></svg>');
const pair=v=>`### ${v.shot}\n\nBefore: nine people, previous resolve. After: 180 distributed residents, new resolve. Identical camera and district roots.\n\n![Before](screenshots/${v.before})\n\n![After](screenshots/${v.after})`;
const table=runs.map(r=>`| ${r.variant} ${r.run} | ${round(r.p50)} | ${round(r.p95)} | ${r.draws} |`).join('\n');
fs.writeFileSync('docs/design/crowd-and-clarity-2026-10-26.md',`# Crowd and image clarity — 26 October 2026

The local scene now contains **180 people, twenty times the previous nine**. The additional 171 share the existing licensed anatomy and PBR materials through GPU instancing and two pose atlases. The original nine retain their live rigs and ground-contact IK. Building layout, camera bookmarks, ground support and house/temple colliders are unchanged. No deployment was performed.

## Image quality

FXAA retains its edge search but uses 0.5 subpixel smoothing instead of 1.0, with stronger coherent-edge detection. Luma-clamped detail enhancement is reduced from 0.20 to 0.12 to limit halos and brittle thin lines. This is one resolve pass, with no separate sharpen pass, supersampling, blur or depth-of-field masking.

Ground colour now uses 8x anisotropic filtering at oblique angles; other authored colour maps retain 4x balanced / 8x cinematic. Normal/physical maps retain 2x balanced / 4x cinematic, and lightmaps retain 2x. Trilinear mipmaps remain intact. Raw bone and crowd-pose textures are excluded from surface filtering and retain exact nearest sampling. Cinematic still uses MSAA4; balanced stays single-sample plus FXAA.

These are incremental improvements. FXAA cannot straighten genuinely curved or uneven mesh silhouettes, and the authored cloth sag remains. This does not establish reference-level cinematic fidelity or temporal antialiasing.

## Crowd rendering and movement

The glTF actor hierarchy reflects Z. Matching the sign of instance-source transforms prevents Babylon's per-instance winding fallback. The rejected first crowd candidate measured 116.4 / 187.7 ms p50/p95; correcting batching reduced its median draw calls from 778 to roughly the original street's range.

Additional residents retain full anatomy within 8 m. Real skinned replacements are used at 8 m and 20 m, never null/hide LODs. Female geometry is 33,371 → 9,746 → 2,638 triangles; male geometry is 30,594 → 8,971 → 2,365. UVs, vertex colours, named joints, weights and compatible inverse binds are checked. Source Blender files and the generator are retained. No building or original-character geometry was simplified.

The distant body LODs use four bone influences after comparing 16 articulated test poses against their eight-weight exports: body p99 errors below 0.15 mm and maximum below 3.7 mm. Clothing weights are unchanged. Existing full-detail meshes are untouched. Idle residents share one identical pose row; locomotion uses 64 distance-driven samples and five walk/idle blend levels. Added residents follow the existing flat-ground contact animation; they do not run 171 additional live foot-IK solvers.

Spawns are spread over the walkable navigation graph with initial clearance. Added residents choose district-wide goals with fewer shared purpose-zone goals. Existing bounded turns, acceleration, spontaneous pauses and collision avoidance remain. Spatial neighbor buckets replace quadratic all-pairs searches; at most four route searches start each update. Entropy drives production decisions and QA uses a seed. Finite-space travel may revisit places; no mathematically non-repeating-path claim is made.

## Intel HD 4600 performance

${data.protocol}

| Variant/run | p50 ms | p95 ms | Median draws |
|---|---:|---:|---:|
${table}
| Median control | ${summary.control.p50} | ${summary.control.p95} | ${summary.control.draws} |
| Median final | ${summary.final.p50} | ${summary.final.p95} | ${summary.final.draws} |

Median frame-time cost: **${cost.p50}% p50 / ${cost.p95}% p95**, including the requested 20x crowd. These controls isolate the previous nine-person experience on the current code, not historical captures taken under different machine load. The result still has stalls and does not demonstrate sustained 60 FPS. New LOD downloads total ${(data.extraLodBytes/1048576).toFixed(2)} MiB, plus two runtime float pose atlases. Headset testing remains deferred.

One cinematic smoke run: ${round(cine.frameIntervalsMs.p50)} / ${round(cine.frameIntervalsMs.p95)} ms p50/p95, 180 people. This is not a repeated cinematic comparison.

## Validation

Full production build and inherited integrity checks pass. Crowd audit: ${crowd.interactionAudit.checks.length} checks, including count, exact pose sampling, batching, real LODs, support, movement, spacing and facing. Existing nine-person movement/hand/grounded-flight regression: ${regression.interactionAudit.checks.length} checks; house/temple collision audit: ${regression.collisionAudit.checks.length} checks. All pass. The original regression runs with crowd=small; the separate crowd audit checks all 180 residents. Three locked views preserve exact camera positions, viewport and district-root transforms.

## Population distribution

This plan view plots all 180 final QA residents across the existing district. Tan boxes are the unchanged house footprints; dots are actual world positions. It helps distinguish district-wide population from the smaller number visible in one street view.

![Population distribution](crowd-population-map.svg)

## Matched views

${views.map(pair).join('\n\n')}

## Isolated image-quality comparison

The following view keeps nine people in both versions so the changed edge resolve and ground filtering can be judged separately from population.

![Previous quality](screenshots/street-entry-crowd-clarity-before.png)

![New quality, nine people](screenshots/street-entry-crowd-clarity-quality-only-after.png)

## Reproduce

- Build: npm run build.
- Derive LODs: Blender 5.1 --background --python tools/blender/build_crowd_lods.py. Check with tools/verify-crowd-lods.py (NumPy Python).
- Runtime diagnostic controls: crowd=small restores nine residents; clarity=previous restores the previous resolve and ground-colour filtering. These are comparison controls, not a change to camera or district data.
- Capture: node tools/capture-hero-shot.mjs crowd-clarity-after --hardware --all.
- Crowd audit: add --audit-script=tools/audit-crowd-clarity.js. Existing regression adds --small-crowd --collision-audit --audit-script=tools/audit-district-interactions.js.
- Benchmark: node tools/benchmark-rendering.mjs --optimized-only --runs=1 --crowd-warmup --label=<label>. Control adds --small-crowd --previous-clarity. Run controls/finals in interleaved order, without simultaneous builds or captures.

The new crowd/clarity revision layer preserves all original snapshots and checksums. Do not refresh old locks to conceal differences. The JSON report links every timing sample and records all audit results.
`);
console.log(JSON.stringify({summary,cost,checks:crowd.interactionAudit.checks.length+regression.interactionAudit.checks.length+regression.collisionAudit.checks.length}));
