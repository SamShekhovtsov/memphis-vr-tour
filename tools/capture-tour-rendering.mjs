import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const commands=['balanced','cinematic'].map(tier=>['tools/benchmark-rendering.mjs','--batch','--checkpoints','--tour-checkpoints','--quality='+tier,'--label=render-tour-'+tier+'-quality']);
const request='content/generated/render-tour-cinematic-still-jobs.json';
fs.writeFileSync(request,JSON.stringify([{label:'render-tour-cinematic-still-before',legacyRenderPerf:true},{label:'render-tour-cinematic-still-after'}]));
commands.push(['tools/capture-hero-shot.mjs','render-tour-cinematic-still','--hardware','--all','--quality=cinematic','--batch-json='+request]);
for(const args of commands)execFileSync(process.execPath,args,{stdio:'inherit',env:{...process.env,CDP_PORT:'9555'}});
