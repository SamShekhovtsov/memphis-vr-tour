import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve('apps/web-tour/public/assets/authored');
const before=path.resolve('content/generated/steps56-before');
const final=path.resolve('content/generated/steps56-final');
const files=['people/hero_male.glb','people/hero_female.glb','people/manifest.json','hero-street/manifest.json',
  ...['near','mid','far'].flatMap(p=>['png','webp'].map(ext=>`hero-street/${p}-irradiance.${ext}`))];
assert.ok(fs.existsSync(before+'/people/hero_male.glb'),'The original baseline archive is required');
for(const name of files){fs.mkdirSync(path.dirname(final+'/'+name),{recursive:true});fs.copyFileSync(root+'/'+name,final+'/'+name);}
const restore=folder=>{for(const name of files)fs.writeFileSync(root+'/'+name,fs.readFileSync(folder+'/'+name));};
const capture=(label,legacy,port,args=[])=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware',...args,...(legacy?['--legacy-steps56']:[])],
  {stdio:'inherit',env:{...process.env,CDP_PORT:String(port)}});
try {
  if(process.argv.includes('--control')) {
    restore(before);capture('steps56-control',true,9450,['--all']);
  } else for(let run=1;run<=3;run++)for(const phase of ['before','after']) {
    const legacy=phase==='before';restore(legacy?before:final);
    capture(`steps56-benchmark-${phase}-${run}`,legacy,9450+run*2+(legacy?0:1),['--benchmark']);
  }
} finally {restore(final);}
