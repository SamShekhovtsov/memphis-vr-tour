import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {finishExpected} from './lib/street-finish-revision.mjs';
const path='content/scene-data/hero-street.render-performance-revision.json';
const previous=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
assert.ok(!previous||process.argv.includes('--refresh'),'Explicit --refresh required; original protected hashes must be retained');
const sha=b=>createHash('sha256').update(b).digest('hex');
const text=f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n');
const hook='apps/web-tour/src/scene/HumanContactShadows.ts';
const edits=[{before:'',after:'import { configureRenderWork } from "./RenderWorkOptimization";\n'},{before:'',after:'  configureRenderWork(scene);\n'}];
let restored=text(hook);for(const edit of edits){assert.equal(restored.split(edit.after).length,2);restored=restored.replace(edit.after,edit.before);}
const original=text('content/generated/render-perf-before/HumanContactShadows.ts');assert.equal(restored,original,'Shadow behavior changed beyond the render-work hook');
const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(folder+'/'+e.name):[folder+'/'+e.name]);
const newFile='apps/web-tour/src/scene/RenderWorkOptimization.ts';
const files=[...walk('apps/web-tour/src/scene').filter(f=>f.endsWith('.ts')&&f!==hook&&f!==newFile),'apps/web-tour/src/main.ts',...walk('apps/web-tour/public/assets/authored'),...walk('content/scene-data').filter(f=>f.endsWith('.json')&&f!==path)];
const protectedFiles=previous?.protectedFiles??Object.fromEntries(files.map(file=>[file,{normalizedText:/\.(ts|json)$/.test(file),sha256:sha(/\.(ts|json)$/.test(file)?text(file):fs.readFileSync(file))}]));
if(previous){assert.equal(previous.hook.beforeSha,sha(original));for(const [file,record]of Object.entries(protectedFiles))assert.equal(sha(record.normalizedText?text(file):fs.readFileSync(file)),finishExpected(file,record.sha256),'Protected baseline changed: '+file);}
fs.writeFileSync(path,JSON.stringify({date:'2026-10-25',scope:'Opaque authored-surface camera depth occlusion pass using original shaders/geometry. No geometry, texture, lighting, tier, colour order, motion/path/camera or IK changes.',hook:{file:hook,beforeSha:sha(original),afterSha:sha(text(hook)),edits},implementation:{file:newFile,sha256:sha(text(newFile))},protectedFiles},null,2)+'\n');
console.log(`Recorded renderer-only hook and ${files.length} unchanged source/data/asset hashes`);
