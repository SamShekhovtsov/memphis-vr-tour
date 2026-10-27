import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const index=JSON.parse(fs.readFileSync('content/source-assets/zones-steps-baseline/index.json'));
const files=['apps/web-tour/src/scene/GroundedVisitorCamera.ts','apps/web-tour/src/scene/DistrictNavigation.ts'];
const buffers=new Map(files.map(f=>[f,fs.readFileSync(f)])),hash=b=>createHash('sha256').update(b).digest('hex');
const capture=label=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware','--small-crowd','--shot=street-entry','--audit-script=tools/audit-arrival-crossing.js'],{stdio:'inherit',env:{...process.env,CDP_PORT:'9249'}});
try{
 for(const f of files)fs.copyFileSync(index[f],f);
 capture('arrival-crossing-before');
}finally{
 for(const [f,b]of buffers){fs.writeFileSync(f,b);assert.equal(hash(fs.readFileSync(f)),hash(b));}
 console.log('Current traversal and navigation restored and hash verified');
}
capture('arrival-crossing-after');
const read=label=>JSON.parse(fs.readFileSync('docs/design/screenshots/street-entry-'+label+'.json')).interactionAudit;
const before=read('arrival-crossing-before'),after=read('arrival-crossing-after');
assert.deepEqual(before.start,after.start);assert.ok(Math.abs(before.supportAtQuay)<.001&&before.maxEyeHeight<1.8);assert.ok(!after.blockedAtQuay&&after.maxEyeHeight>=2.02);assert.ok(Math.abs(after.supportAtQuay-.34)<.001);
fs.writeFileSync('docs/design/arrival-crossing-comparison.json',JSON.stringify({before,after,matchedStart:true},null,2)+'\n');
console.log('Original quay support error confirmed; same start/input crosses on the correct surface after');
