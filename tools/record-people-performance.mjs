import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const file='content/scene-data/hero-people.performance-revision.json';
const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
assert.ok(!previous||process.argv.includes('--refresh'),'Explicit --refresh required; original baseline must be retained');
const sources=['apps/web-tour/src/scene/HeroPeople.ts','apps/web-tour/src/scene/HeroWorkerPose.ts','apps/web-tour/src/main.ts','apps/web-tour/src/scene/GroundContactIK.ts'];
const files={};
for(const path of sources){
  const before=normalize(fs.readFileSync('content/generated/steps56-perf-before/'+path.split('/').at(-1),'utf8'));
  const after=normalize(fs.readFileSync(path,'utf8'));
  let prefix=0,suffix=0;
  while(prefix<Math.min(before.length,after.length)&&before[prefix]===after[prefix])prefix++;
  while(suffix<Math.min(before.length,after.length)-prefix&&before.at(-suffix-1)===after.at(-suffix-1))suffix++;
  files[path]={beforeSha:sha(before),afterSha:sha(after),offset:prefix,before:before.slice(prefix,before.length-suffix),after:after.slice(prefix,after.length-suffix)};
  if(previous?.files[path])assert.equal(files[path].beforeSha,previous.files[path].beforeSha,'Original source baseline changed');
}
fs.writeFileSync(file,JSON.stringify({date:'2026-10-25',scope:'CPU-only rig lookup, constant finger poses, exact-input support-wrist cache, reuse of refreshed IK ancestor matrices and on-demand QA diagnostics. No IK solve math, shadow, material, geometry, path or camera changes.',files},null,2)+'\n');
console.log('Recorded explicit CPU-only source revision');
