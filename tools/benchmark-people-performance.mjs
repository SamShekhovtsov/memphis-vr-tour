import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
const revision=JSON.parse(fs.readFileSync('content/scene-data/hero-people.performance-revision.json'));
const sources=new Map(),beforeSources=new Map();
for(const [file,edit] of Object.entries(revision.files)){
  const raw=fs.readFileSync(file),text=raw.toString().replaceAll('\r\n','\n');
  assert.equal(sha(text),edit.afterSha,'Expected final performance code: '+file);
  sources.set(file,raw);
  const original=text.slice(0,edit.offset)+edit.before+text.slice(edit.offset+edit.after.length);
  assert.equal(sha(original),edit.beforeSha);beforeSources.set(file,Buffer.from(original));
}
const root='apps/web-tour/public/assets/authored/';
const names=['people/hero_male.glb','people/hero_female.glb','people/manifest.json','hero-street/manifest.json',...['near','mid','far'].flatMap(p=>['png','webp'].map(e=>`hero-street/${p}-irradiance.${e}`))];
const assets=new Map(names.map(n=>[root+n,fs.readFileSync(root+n)]));
const baseline=new Map(names.map(n=>[root+n,fs.readFileSync('content/generated/steps56-before/'+n)]));
const write=files=>{for(const [file,data] of files)fs.writeFileSync(file,data);};
const capture=(label,port,args=[])=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware',...args],{stdio:'inherit',env:{...process.env,CDP_PORT:String(port)}});
const extended=process.argv.includes('--extended');
const sceneFile='apps/web-tour/src/scene/MemphisWhiteWallsScene.ts';
const sceneSource=fs.readFileSync(sceneFile);
const replaceOnce=(text,from,to)=>{assert.equal(text.split(from).length,2,'Benchmark injection anchor changed: '+from);return text.replace(from,to);};
function harness(main){
  let code=main.toString();
  code=replaceOnce(code,'searchParams.has("benchmark") ? 180','searchParams.has("benchmark") ? 600');
  code=replaceOnce(code,'if (frames > 10)','if (frames > 60)');
  code=replaceOnce(code,'animationSeconds: 2,','animationSeconds: 2 + 599 / 30,\n          benchmarkProtocol: {frames:600,warmupFrames:61,deterministicActorTime:true},\n          peoplePoseMatrices: scene.metadata.heroPeople.flatMap((person: { root: import("@babylonjs/core").TransformNode }) => person.root.getChildTransformNodes(false).filter(node=>node.name.startsWith("heroPerson-")).map(node=>({name:node.name,world:Array.from(node.computeWorldMatrix(true).m)}))),');
  return code;
}
try {
  if(process.argv.includes('--control')){
    write(beforeSources);capture('steps56-perf-control',9473,['--all']);
  }else{
    // Rotate order so every variant occupies each position once.
    const orders=[['baseline','before','after'],['after','baseline','before'],['before','after','baseline']];
    let port=extended?9490:9474;
    if(extended){
      let code=sceneSource.toString();
      code=replaceOnce(code,'benchmarkFrame++ / 179','benchmarkFrame++ / 599');
      code=replaceOnce(code,'const time = ikAudit ?','const time = benchmark ? 2 + Math.max(0,benchmarkFrame-1)/30 : ikAudit ?');
      code=replaceOnce(code,'if (review?.active) {','if (review?.active || benchmark) {');
      fs.writeFileSync(sceneFile,code);
    }
    for(const [index,order] of orders.entries())for(const phase of order){
      write(phase==='after'?sources:beforeSources);
      if(extended)fs.writeFileSync('apps/web-tour/src/main.ts',harness((phase==='after'?sources:beforeSources).get('apps/web-tour/src/main.ts')));
      write(phase==='baseline'?baseline:assets);
      capture(`steps56-perf-${extended?'extended':'benchmark'}-${phase}-${index+1}`,port++,['--benchmark',...(phase==='baseline'?['--legacy-steps56']:[])]);
    }
  }
}finally{
  write(sources);write(assets);fs.writeFileSync(sceneFile,sceneSource);
  assert.equal(sha(fs.readFileSync(sceneFile)),sha(sceneSource),'Benchmark scene not restored');
  for(const [file,buffer] of [...sources,...assets])assert.equal(sha(fs.readFileSync(file)),sha(buffer),'Final file not restored: '+file);
  console.log('Final source and visual assets restored and hash verified');
}
