import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const source=fs.readFileSync('apps/web-tour/src/scene/ResidentProfiles.ts','utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const zones=[...Array(51).fill('temple'),...Array(50).fill('street'),...Array(19).fill('route'),...Array(6).fill('free')];
const profiles=api.profilePopulation(zones,new Set([52]));
assert.equal(profiles.size,63);assert.equal(new Set([...profiles.values()].map(p=>p.id)).size,63);
assert.deepEqual([...profiles], [...api.profilePopulation(zones,new Set([52]))]);
assert.deepEqual(Object.fromEntries(['temple','street','route','free'].map(z=>[z,[...profiles.values()].filter(p=>p.zone===z).length])),{temple:26,street:25,route:9,free:3});
assert.ok(new Set([...profiles.values()].map(p=>p.pace)).size>60);
console.log('63 stable, distinct resident profiles; stratified 26/25/9/3 coverage passed');

const profileModule='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const brainSource=fs.readFileSync('apps/web-tour/src/scene/ResidentBrain.ts','utf8').replaceAll("'./ResidentProfiles'",JSON.stringify(profileModule));
const {ResidentBrain}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(brainSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const stations=Array.from({length:8},(_,i)=>({id:'s'+i,kind:i%2?'rest':'work',zone:'street',node:i,point:{x:i*3,z:0},face:{x:0,z:1},duration:12,capacity:1,anchor:'test'}));
const brain=new ResidentBrain(api.createProfile(42,'street'),stations,new Set(stations.map(s=>s.node)));
brain.tick(1,{x:0,z:0},1);assert.equal(brain.stage,'travel');const target=brain.target;
brain.tick(2,{x:0,z:2},1);assert.equal(brain.target,target,'Do not switch an active intention');
brain.tick(3,target.point,0);assert.equal(brain.stage,'align');
brain.tick(4,target.point,1);assert.equal(brain.stage,'act');
brain.tick(5,target.point,1);assert.equal(brain.completed,0,'Actions require dwell time');
brain.tick(60,target.point,1);assert.equal(brain.completed,1);assert.equal(brain.stage,'cooldown');
brain.tick(70,target.point,1);assert.equal(brain.stage,'travel');assert.notEqual(brain.target.id,target.id,'Recent station cooldown prevents immediate repetition');
brain.tick(200,{x:999,z:999},1);assert.equal(brain.failed,1,'Unreachable/blocked tasks expire');
console.log('Committed task sequence, facing, dwell, completion, recent-memory and timeout tests passed');

