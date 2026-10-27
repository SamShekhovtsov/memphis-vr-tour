import fs from 'node:fs';import assert from 'node:assert/strict';
const folder='docs/design/screenshots/',read=name=>JSON.parse(fs.readFileSync(folder+name+'.json'));
const config=JSON.parse(fs.readFileSync('content/scene-data/district-population.json'));
const audit=read('street-entry-zones-steps-after').interactionAudit,regression=read('street-entry-zones-steps-regression');
assert.ok(audit.passed);assert.ok(regression.interactionAudit.passed);assert.ok(regression.collisionAudit.passed);
const crossing=JSON.parse(fs.readFileSync('docs/design/arrival-crossing-comparison.json'));
assert.ok(!crossing.after.blockedAtQuay&&crossing.before.supportAtQuay<.001&&crossing.after.supportAtQuay>.33);
const benchmark=read('hero-street-main-zones-steps-tour-after-1');assert.equal(benchmark.heroPeople,126);assert.equal(benchmark.frameIntervalsMs.samples,539);
const shots=['hero-street-main','street-entry','hero-street-material'];
const views=shots.map(shot=>{const j=read(shot+'-zones-steps-views'),old=read(shot+'-crowd-clarity-after');assert.deepEqual(j.camera,old.camera);assert.deepEqual(j.layoutRoots,old.layoutRoots);assert.deepEqual(j.viewport,old.viewport);assert.equal(j.heroPeople,126);return {shot,camera:j.camera,file:shot+'-zones-steps-views.png'};});
const people=read('hero-street-main-zones-steps-views').rendering.population.states;
assert.equal(people.length,126);const counts={temple:0,street:0,route:0,free:0};for(const p of people)counts[p.zone]++;
assert.deepEqual(counts,audit.targets);
const data={date:'2026-10-27',population:{previous:180,total:126,reductionPercent:30,counts,requestedPercent:Object.fromEntries(config.zones.map(z=>[z.id,z.weight])),rounding:config.rounding},audit,regression:{interaction:regression.interactionAudit,collision:regression.collisionAudit},crossing,views,performanceSmoke:{file:'hero-street-main-zones-steps-tour-after-1.json',frames:benchmark.frameIntervalsMs,gpu:benchmark.gpu,protocol:benchmark.benchmarkProtocol,note:'Single 600-frame full-tour smoke run; 61 initial frames excluded, 300 simulated seconds crowd warm-up. No paired regression or repeated-run claim.'}};
fs.writeFileSync('docs/design/population-zones-and-steps-2026-10-27.json',JSON.stringify(data,null,2)+'\n');
const x=v=>30+(v+38)*6,z=v=>80+(100-v)*6,colours={temple:'#196baa',street:'#bf531c',route:'#287c46',free:'#8038a1'};
const route=JSON.parse(fs.readFileSync('content/scene-data/memphis-white-walls.tour.json')).guidedRoute.waypoints;
const end=route.findIndex(p=>p.id==='ptah-main-gate-center');
const routeLine='<polyline points="'+route.slice(0,end+1).map(p=>x(p.position[0])+','+z(p.position[2])).join(' ')+'" fill="none" stroke="#287c46" stroke-width="28.8" opacity=".16"/>';
const areas=config.zones.filter(a=>a.bounds).map(a=>'<rect x="'+x(a.bounds.minX)+'" y="'+z(a.bounds.maxZ)+'" width="'+((a.bounds.maxX-a.bounds.minX)*6)+'" height="'+((a.bounds.maxZ-a.bounds.minZ)*6)+'" fill="'+colours[a.id]+'" opacity=".12"/>').join('');
const houses=JSON.parse(fs.readFileSync('content/scene-data/district-navigation.json')).houses.map(h=>'<rect x="'+x(h.minX)+'" y="'+z(h.maxZ)+'" width="'+((h.maxX-h.minX)*6)+'" height="'+((h.maxZ-h.minZ)*6)+'" fill="#c5bba9" stroke="#6c604d"/>').join('');
const dots=people.map(p=>'<circle cx="'+x(p.position[0])+'" cy="'+z(p.position[2])+'" r="2.8" fill="'+colours[p.zone]+'"><title>'+p.name+' ('+p.zone+')</title></circle>').join('');
fs.writeFileSync('docs/design/population-zones-map.svg','<svg xmlns="http://www.w3.org/2000/svg" width="580" height="1150" viewBox="0 0 580 1150"><rect width="580" height="1150" fill="#f6f1e7"/><g font-family="Arial" fill="#302b23"><text x="30" y="25" font-size="18">126 residents — assigned population areas</text><text x="30" y="47" font-size="12">Blue: temple 51. Orange: street 50. Green: route 19.</text><text x="30" y="64" font-size="12">Purple: open space 6. Grey: unchanged house footprints.</text>'+routeLine+areas+houses+dots+'<text x="30" y="1120" font-size="12">Plan view of actual final QA positions, not a render.</text></g></svg>');
const round=n=>Math.round(n*10)/10;
const table=config.zones.map(a=>'| '+a.id+' | '+a.weight+'% | '+counts[a.id]+' | '+round(counts[a.id]/126*100)+'% |').join('\n');
const testCount=audit.checks.length+regression.interactionAudit.checks.length+regression.collisionAudit.checks.length;
fs.writeFileSync('docs/design/population-zones-and-steps-2026-10-27.md',`# Population areas and grounded step-up — 27 October 2026

Default population is **126**, a 30% reduction from 180. Distribution uses persistent, mutually exclusive areas, not just a weighted spawn pass.

| Area | Requested | People | Actual share |
|---|---:|---:|---:|
${table}

Whole-person allocation uses largest-remainder rounding. The temple/street fractional tie gives the extra person to the temple, following configuration order. Definitions are editable in content/scene-data/district-population.json.

## Where people go

- Temple: inside the existing Ptah enclosure, courtyard and shrine, x −12.6…12.6, z 49.2…91 m. Walls and pillars still constrain navigation.
- Village: the lane between existing house fronts, x −10.3…−1.95, z −24.4…22 m. This includes the end approaches and the craftsman's existing work station.
- Route: a 2.4 m half-width corridor around the existing arrival-to-temple waypoints. Temple and village take priority where regions overlap; route residents occupy the remaining approach sections.
- Open: other connected walkable space. The river-side world boundary and building collisions remain.

Each person chooses spontaneous goals and pauses within their assigned connected area. Pathfinding, shortcuts, detours and actual movement all enforce the same boundary, so quotas hold over time. Route sections separated by the village are separate local wandering components; this is area occupancy management, not a promise that each route resident walks the entire tour. The craftsman remains at the nearest safe standing point beside his original work block. Original close characters, GPU animation, materials and rendering tiers are retained; the additional GPU population is now 117.

Higher local density exposed two avoidance defects: lateral neighbors could stop motion unnecessarily, and blocked paths could accumulate stale detours. Residents now distinguish turning from blocking, permit safe lateral passage, and replace a blocked intention with a clear side-step or a turned, forward-facing retreat. The 65 cm hard clearance and 1.6 rad/s turn bound remain.

![Area allocation and resident positions](population-zones-map.svg)

## Arrival blockage and step-up fix

The quay already had a real 34 cm collision box, and the ramp was tilted collision geometry. The old support service ignored both and kept restoring the visitor to the underlying ground. The capsule consequently collided with the raised edge without receiving a supported step-up.

Navigation now includes the quay and the actual ramp plane, rather than using the ramp's maximum AABB height everywhere. VisitorTraversal additionally probes collision surfaces beneath the capsule and just ahead of travel. Automatic step-up is bounded to **38 cm**, requires overhead clearance and keeps a short leading/trailing-foot lift while crossing the riser. Native swept-ellipsoid collision and wall sliding remain active. The visible eye height moves smoothly while the physical capsule receives the clearance it needs. Tall walls and oversized obstacles remain solid.

No jump key is needed for these low steps. F + movement remains the deliberate flight override; release lands safely. Looking up/down does not turn walking into flight. Below-ground recovery and unsupported-edge protection remain. Stored camera bookmarks, route data, building geometry and colliders are unchanged.

## Direct before/after reproduction

The comparison temporarily loads only the immutable pre-change camera/navigation sources, then restores current bytes in finally with SHA verification. Both versions start at ${JSON.stringify(crossing.before.start)}, face across the same quay and hold W for 90 rendered frames. Timing varies, so this is a traversal test, not a speed comparison.

| Result | Before | After |
|---|---:|---:|
| Quay support height | ${round(crossing.before.supportAtQuay)} m | ${round(crossing.after.supportAtQuay*100)/100} m |
| Final x position | ${round(crossing.before.end[0])} m | ${round(crossing.after.end[0])} m |
| Blocked at quay | ${crossing.before.blockedAtQuay} | ${crossing.after.blockedAtQuay} |
| Maximum eye height | ${round(crossing.before.maxEyeHeight*100)/100} m | ${round(crossing.after.maxEyeHeight*100)/100} m |

Raw proof: arrival-crossing-comparison.json. The actual quay and ramp also pass the combined live suite in both travel directions. In the control, the reliable defect is missing raised-surface support; complete stalling can depend on the initial capsule overlap and frame timing. The raw blocked-at-edge flag records what occurred rather than assuming every control run freezes.

## Verification

**${testCount} live checks pass**: ${audit.checks.length} new zone/step checks, ${regression.interactionAudit.checks.length} retained movement/hand/grounded-flight checks and ${regression.collisionAudit.checks.length} house/temple collision checks. The new suite tests all 126 residents over three simulated minutes, including exact quotas at every sample, no building crossings, minimum personal clearance, forward-facing travel and continued movement. An extra full-pose interval checks working hand contacts.

Physical tests cover the real quay and tilted ramp, 20/35 cm up/down steps, a blocked 60 cm obstacle, low headroom, continuous-wall sliding, held-F flight, landing and below-ground recovery. The retained interaction suite uses the nine-person diagnostic mode; the new suite separately exercises the full population. The complete production build and inherited asset/layout/camera integrity checks pass.

One HD 4600/D3D11 full-tour smoke run at 1280×720: **${round(benchmark.frameIntervalsMs.p50)} ms p50 / ${round(benchmark.frameIntervalsMs.p95)} ms p95**, 539 measured frame intervals after 61 initial frames, with 300 simulated seconds of crowd warm-up. This is not a repeated or paired performance comparison. Concentrating residents changes how many are visible in a view, so the reduced global count alone does not establish a speedup.

## Final views

The three existing bookmarks retain their exact positions, viewport and static district roots. These screenshots show the new allocation, so NPC positions intentionally differ from the previous diffuse population.

${views.map(v=>'### '+v.shot+'\n\n![Final view](screenshots/'+v.file+')').join('\n\n')}

### Temple diagnostic view

This temporary inspection camera shows the courtyard population. No stored camera definition was edited.

![Temple courtyard](screenshots/street-entry-zones-steps-temple.png)

## Reproduce

- npm run build includes validate:zones-steps alongside all earlier guards.
- node tools/capture-hero-shot.mjs zones-steps-after --hardware --shot=street-entry --audit-script=tools/audit-zones-steps.js
- node tools/compare-arrival-crossing.mjs reproduces the original blockage, verifies the fix and restores source bytes. Do not run it concurrently with builds/captures/benchmarks.
- node tools/benchmark-rendering.mjs --optimized-only --runs=1 --crowd-warmup --label=zones-steps-tour
- node tools/report-zones-steps.mjs regenerates this report from saved evidence.

The new revision layer preserves the original crowd/clarity and interaction snapshots. No lighting, texture, mesh-layout or stored camera changes were made. Headset qualification remains deferred. Changes are local; no deployment was performed.
`);
console.log(JSON.stringify({people:126,counts,checks:testCount,p50:round(benchmark.frameIntervalsMs.p50),p95:round(benchmark.frameIntervalsMs.p95)}));
