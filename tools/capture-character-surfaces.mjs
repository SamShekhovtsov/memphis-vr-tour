import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const file='apps/web-tour/src/scene/HeroPeopleMaterials.ts',final=fs.readFileSync(file),sha=b=>createHash('sha256').update(b).digest('hex');
const index=JSON.parse(fs.readFileSync('content/source-assets/character-surface-baseline/index.json'));
try{
 for(const phase of ['before','after']){
  fs.writeFileSync(file,phase==='before'?fs.readFileSync(index[file]):final);
  for(const shot of ['hero-street-main','street-entry','hero-street-material'])execFileSync(process.execPath,['tools/capture-hero-shot.mjs',`character-surface-${phase}`,'--hardware',`--shot=${shot}`],{stdio:'inherit'});
  for(const sex of ['female','male'])for(const tier of ['balanced','cinematic'])execFileSync(process.execPath,['tools/capture-hero-shot.mjs',`character-surface-${sex}-${tier==='cinematic'?'cinematic-':''}${phase}`,'--hardware',`--quality=${tier}`,`--audit-script=tools/view-character-art-${sex}.js`],{stdio:'inherit'});
 }
}finally{fs.writeFileSync(file,final);assert.equal(sha(fs.readFileSync(file)),sha(final));console.log('Final surface binder restored; byte hash verified');}
