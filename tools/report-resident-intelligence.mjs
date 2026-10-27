import {gunzipSync} from 'node:zlib';
import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='docs/design/screenshots/',read=name=>JSON.parse(fs.existsSync(dir+name+'.json')?fs.readFileSync(dir+name+'.json'):gunzipSync(fs.readFileSync('docs/design/performance/purposeful-residents/'+name+'.json.gz')));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const rows=[];
for(const [label,runs]of [['purposeful-tour',3],['purposeful-cinematic',3]]){
 const pairs=[];
 for(let i=1;i<=runs;i++){
  const before=read(`hero-street-main-${label}-before-${i}`),after=read(`hero-street-main-${label}-after-${i}`);
  assert.match(before.url,/intelligence=legacy/);assert.ok(!after.url.includes('intelligence=legacy'));
  assert.equal(before.quality,after.quality);assert.deepEqual(before.camera,after.camera);assert.deepEqual(before.viewport,after.viewport);
  assert.equal(before.frameIntervalsMs.samples,539);assert.equal(after.frameIntervalsMs.samples,539);assert.match(after.gpu.renderer,/HD Graphics 4600/);
  pairs.push({run:i,before:before.frameIntervalsMs,after:after.frameIntervalsMs,brain:after.residentDecisionTiming?{averageMs:after.residentDecisionTiming.totalMs/after.residentDecisionTiming.frames,maxFrameMs:after.residentDecisionTiming.maxFrameMs}:null});
 }
 const before={p50:median(pairs.map(p=>p.before.p50)),p95:median(pairs.map(p=>p.before.p95))},after={p50:median(pairs.map(p=>p.after.p50)),p95:median(pairs.map(p=>p.after.p95))};
 rows.push({order:label.includes('cinematic')?['final/control','control/final','control/final']:['control/final','final/control','control/final'],tier:label.includes('cinematic')?'cinematic':'balanced',runs,pairs,before,after,changePercent:{p50:(after.p50/before.p50-1)*100,p95:(after.p95/before.p95-1)*100}});
}
const behavior=read('hero-street-main-purposeful-final-audit').interactionAudit;assert.equal(behavior.passed,true);
const output={baseline:'7556d34',population:126,participants:63,hardware:'Intel HD 4600 / D3D11',viewport:'1280x720',comparison:'Same final rendering/navigation; intelligence=legacy disables the 63 task brains. Counterbalanced separate Chrome sessions, 300 simulated seconds of crowd warmup, 600 tour frames; 61 warmup frames excluded. Median of three run percentiles in each quality tier.',pilotSummary:'purposeful-residents-pilot-2026-10-27.json',performance:rows,behavior:{checks:behavior.checks,completedResidents:behavior.tasks.filter(t=>t.completed>0).length,completions:behavior.tasks.reduce((n,t)=>n+t.completed,0),averageLifeUpdateMs:behavior.averageLifeUpdateMs,decisionAverageMs:behavior.brainTiming.totalMs/behavior.brainTiming.frames}};
fs.writeFileSync('docs/design/purposeful-residents-2026-10-27.json',JSON.stringify(output,null,2)+'\n');
for(const row of rows)console.log(`${row.tier}: ${row.before.p50.toFixed(1)}/${row.before.p95.toFixed(1)} -> ${row.after.p50.toFixed(1)}/${row.after.p95.toFixed(1)} ms (p50/p95), ${row.changePercent.p50.toFixed(1)}% / ${row.changePercent.p95.toFixed(1)}%`);
