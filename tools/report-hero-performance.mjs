import fs from 'node:fs';
import assert from 'node:assert/strict';
const shots='docs/design/screenshots/';
const read=name=>JSON.parse(fs.readFileSync(shots+name+'.json'));
const pairs={};
for(const shot of ['hero-street-main','street-entry']){
  const before=read(shot+'-stages567-before'),after=read(shot+'-stages567-after');
  for(const key of ['viewport','camera','animationSeconds','actorAnimationGroups'])assert.deepEqual(before[key],after[key],`${shot}: unmatched ${key}`);
  assert.equal(after.heroPeople,3);assert.equal(after.groundContacts.length,6);assert.deepEqual(after.textureErrors,[]);
  assert.ok(after.streetLods.every(l=>l.failed.length===0));
  const worker=after.heroInteractions.find(p=>p.root.endsWith('actorHeroStoneWorker'));
  assert.ok(worker?.toolAttached && worker?.workBlockRetained,'Worker lost its tool or original work block');
  pairs[shot]={camera:after.camera,viewport:after.viewport,drawCallsBefore:before.drawCalls,drawCallsAfter:after.drawCalls,
    activeIndicesBefore:before.activeIndices,activeIndicesAfter:after.activeIndices,
    note:'Timing comparison omitted: baseline captures used SwiftShader; route benchmarks below use the real GPU.'};
}
const profiles={};
for(const tier of ['performance','balanced','cinematic']){
  const q=read('hero-street-main-stages567-benchmark-'+tier);
  assert.equal(q.benchmarkProgress,1,'Route sweep incomplete');
  assert.ok(!/SwiftShader/i.test(q.gpu.renderer),'Hardware benchmark unexpectedly used software rendering');
  assert.ok(q.streetLods.every(l=>l.failed.length===0));assert.deepEqual(q.textureErrors,[]);
  profiles[tier]={gpu:q.gpu,renderSize:[q.renderWidth,q.renderHeight],frameIntervalsMs:q.frameIntervalsMs,
    medianEquivalentFps:1000/q.frameIntervalsMs.p50,rendering:q.rendering,lodsAtEnd:q.streetLods};
}
const street=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-street/manifest.json'));
const geometry=[0,1,2].map(level=>street.assets.reduce((sum,a)=>sum+(level?a.lods[level-1].triangles:a.triangles),0));
const motion=read('hero-street-main-stages567-motion');
assert.equal(motion.groundContactAudit.rootChanges,0);
const headset=read('hero-street-main-stages567-headset-preview');
assert.equal(headset.rendering.tier,'headset');assert.equal(headset.rendering.shadowMapSize,1024);assert.equal(headset.heroPeople,3);
const report={date:'2026-10-22',method:'One accelerated 180-rendered-frame guided-route sweep per tier, 169 wall-clock frame intervals after warmup. Includes on-demand LOD loading. Headless desktop Chrome, not a headset or thermal-duration test.',
  pairs,profiles,streetTrianglesByLod:geometry,textureDelivery:street.deliveryCompression,
  motionAudit:motion.groundContactAudit,headsetConfigurationBooted:true,physicalHeadsetTested:false};
fs.writeFileSync('docs/design/hero-street-performance-2026-10-22.json',JSON.stringify(report,null,2)+'\n');
const designPath='docs/design/hero-street-stages-5-7-2026-10-22.md';
let design=fs.readFileSync(designPath,'utf8');
for(const [tier,p]of Object.entries(profiles)){
  const label=tier[0].toUpperCase()+tier.slice(1);
  const row=`| ${label} | ${p.renderSize.join(' × ')} | ${p.frameIntervalsMs.p50.toFixed(1)} ms | ${p.frameIntervalsMs.p95.toFixed(1)} ms | ${p.medianEquivalentFps.toFixed(1)} |`;
  design=design.replace(new RegExp(`^\\| ${label} \\|.*$`,'m'),row);
}
const main=pairs['hero-street-main'];
design=design.replace(/draw calls fell from \d+ to \d+/,`draw calls fell from ${main.drawCallsBefore} to ${main.drawCallsAfter}`);
fs.writeFileSync(designPath,design);
for(const [tier,p]of Object.entries(profiles))console.log(`${tier}: p50 ${p.frameIntervalsMs.p50.toFixed(1)} ms; p95 ${p.frameIntervalsMs.p95.toFixed(1)} ms; ${p.medianEquivalentFps.toFixed(1)} median-equivalent FPS`);
console.log(`Street triangles: ${geometry.join(' / ')}; all screenshot, GPU, contact and LOD assertions passed.`);
