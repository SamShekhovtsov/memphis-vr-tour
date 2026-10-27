import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const index=JSON.parse(fs.readFileSync('content/source-assets/character-action-baseline/index.json'));
const assets=Object.keys(index).filter(f=>f.startsWith('apps/web-tour/src/scene/'));
const originals=new Map([...assets,'apps/web-tour/src/main.ts','apps/web-tour/src/scene/MemphisWhiteWallsScene.ts'].map(f=>[f,fs.readFileSync(f)]));
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??'character-action';assert.match(label,/^[a-z0-9-]+$/);
fs.mkdirSync('docs/design/performance/character-action',{recursive:true});
const phaseLog='docs/design/performance/character-action/'+label+'-phases.json';
const temp=`tools/.character-action-benchmark-${process.pid}.mjs`;
let harness=fs.readFileSync('tools/benchmark-rendering.mjs','utf8');
const anchor="import {execFileSync} from 'node:child_process';";assert.equal(harness.split(anchor).length,2);
harness=harness.replace(anchor,"import {execFileSync as nativeExecFileSync} from 'node:child_process';");
const hook=`
const artIndex=JSON.parse(fs.readFileSync('content/source-assets/character-action-baseline/index.json'));
const artFiles=Object.keys(artIndex).filter(f=>f.startsWith('apps/web-tour/src/scene/'));
const artPhases=[];
const artFinal=new Map(artFiles.map(f=>[f,fs.readFileSync(f)]));
function execFileSync(file,args,options){
 if(file===process.execPath&&args[0]==='tools/capture-hero-shot.mjs'){
  const before=/-before-\\d+$/.test(args[1]);
  for(const f of artFiles){let data=before?fs.readFileSync(artIndex[f]):artFinal.get(f);if(process.env.CHARACTER_ACTION_PROTOTYPE==='1'){data=artFinal.get(f);if(before&&f.endsWith('InstancedDistrictCrowd.ts'))data=Buffer.from(data.toString().replace('if(slot>=0&&near){','if(false&&slot>=0&&near){'));}fs.writeFileSync(f,data);}
  artPhases.push({label:args[1],phase:before?'before':'after',assets:Object.fromEntries(artFiles.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))});
  fs.writeFileSync(process.env.CHARACTER_ART_PHASE_LOG,JSON.stringify(artPhases,null,2)+'\\n');
  args=args.filter(a=>!['--legacy-render-perf','--legacy-intelligence'].includes(a));
 }
 return nativeExecFileSync(file,args,options);
}
`;
assert.ok(!process.argv.includes('--batch'),'Character-art comparisons require separate sessions');
try{
 fs.writeFileSync(temp,hook+harness);
 execFileSync(process.execPath,[temp,...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,CHARACTER_ART_PHASE_LOG:phaseLog,CHARACTER_ACTION_PROTOTYPE:process.argv.includes('--prototype-comparison')?'1':'0'}});
}finally{
 for(const [f,b]of originals){fs.writeFileSync(f,b);assert.equal(sha(fs.readFileSync(f)),sha(b));}
 if(fs.existsSync(temp))fs.unlinkSync(temp);
 console.log('Final character assets, main and scene restored; exact hashes verified');
}
