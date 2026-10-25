import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
const mainFile='apps/web-tour/src/main.ts',sceneFile='apps/web-tour/src/scene/MemphisWhiteWallsScene.ts';
const originals=new Map([mainFile,sceneFile].map(f=>[f,fs.readFileSync(f)]));
const replace=(text,from,to)=>{assert.equal(text.split(from).length,2,'Harness anchor changed: '+from);return text.replace(from,to);};
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??'render-perf';
assert.match(label,/^[a-z0-9-]+$/);
const profile=process.argv.includes('--profile-only')||process.argv.includes('--profile-after');
const checkpoints=process.argv.includes('--checkpoints');
const uncapped=process.argv.includes('--uncapped');
const gpu=profile||process.argv.includes('--gpu-profile');
const heroSegment=process.argv.includes('--hero-street');
const quality=process.argv.find(a=>a.startsWith('--quality='))?.slice(10)??'balanced';
assert.ok(['balanced','cinematic','performance','headset'].includes(quality),'Unknown quality tier');
const runs=Number(process.argv.find(a=>a.startsWith('--runs='))?.slice(7)??3);
const isolateFrame=Number(process.argv.find(a=>a.startsWith('--isolate-frame='))?.slice(16)??0);
assert.ok(Number.isInteger(runs)&&runs>=1&&runs<=8);
let main=originals.get(mainFile).toString(),scene=originals.get(sceneFile).toString();
if(process.argv.includes('--crowd-warmup'))scene=replace(scene,'  const groundContacts = districtLife?.contacts','  if(districtLife)for(let warmup=0;warmup<=3000;warmup++)districtLife.update(-300+warmup/10,false);\n  const groundContacts = districtLife?.contacts');
scene=replace(scene,'benchmarkFrame++ / 179','benchmarkFrame++ / 599');
scene=replace(scene,'const time = ikAudit ?','const time = benchmark ? 2 + Math.max(0,benchmarkFrame-1)/30 : ikAudit ?');
scene=replace(scene,'if (review?.active) {','if (review?.active || benchmark) {');
if(heroSegment)scene=replace(scene,'const sample = sampleGuidedRoute(routeTrack, progress);','const sample = sampleGuidedRoute(routeTrack, (reviewSegment!.startDistance + progress * reviewSegment!.length) / routeTrack.totalLength);');
main=replace(main,'import { Engine, SceneInstrumentation }','import { Engine, SceneInstrumentation, EngineInstrumentation }');
main=replace(main,'let frames = 0;','const renderStopFrame=Number(searchParams.get("renderFrame")??600);\n    let frames = 0;');
main=replace(main,'searchParams.has("benchmark") ? 180','searchParams.has("benchmark") ? renderStopFrame');
main=replace(main,'if (frames > 10)','if (frames > 60)');
main=replace(main,'instrumentation.captureFrameTime = true;',`instrumentation.captureFrameTime = true;
    instrumentation.captureActiveMeshesEvaluationTime = true;
    instrumentation.captureRenderTargetsRenderTime = true;
    instrumentation.captureRenderTime = true;
    instrumentation.captureAnimationsTime = true;
    const gpuInstrumentation = new EngineInstrumentation(engine);
    gpuInstrumentation.captureShaderCompilationTime = true;
    gpuInstrumentation.captureGPUFrameTime = ${gpu} && !!engine.getCaps().timerQuery;
    const renderSamples: Record<string,number[]> = {frame:[],targets:[],main:[],active:[],animation:[],gpu:[],draws:[],shaderCompiles:[]};`);
main=replace(main,'if (frames > 60) frameIntervals.push(now-previousFrame);',`if (frames > 60 && frames < renderStopFrame) {
          frameIntervals.push(now-previousFrame);
          renderSamples.frame.push(instrumentation.frameTimeCounter.current);
          renderSamples.targets.push(instrumentation.renderTargetsRenderTimeCounter.current);
          renderSamples.main.push(instrumentation.renderTimeCounter.current);
          renderSamples.active.push(instrumentation.activeMeshesEvaluationTimeCounter.current);
          renderSamples.animation.push(instrumentation.animationsTimeCounter.current);
          renderSamples.draws.push(instrumentation.drawCallsCounter.current);
          renderSamples.shaderCompiles.push(gpuInstrumentation.shaderCompilationTimeCounter.count);
          const gpu=gpuInstrumentation.gpuFrameTimeCounter?.current;
          if(gpu&&gpu>0)renderSamples.gpu.push(gpu/1e6);
        }`);
main=replace(main,'animationSeconds: 2,',`animationSeconds: 2 + (renderStopFrame-1)/30,
          benchmarkProtocol:{frames:renderStopFrame,warmupFrames:61,deterministicActorTime:true,crowdWarmupSeconds:${process.argv.includes('--crowd-warmup')?300:0},route:${JSON.stringify(heroSegment?'hero-street':'full-tour')}},
          renderProfile:{gpuTimerSupported:!!engine.getCaps().timerQuery,gpuTimerEnabled:${gpu},samples:renderSamples},
          renderingOptimization:scene.metadata.renderingOptimization??null,
          activeMeshPoseMatrices:scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).map(mesh=>({name:mesh.name,world:Array.from(mesh.computeWorldMatrix(true).m),material:mesh.material?.name,materialId:mesh.material?.uniqueId})),
          moverPoseMatrices:[...new Set([...scene.meshes,...scene.transformNodes].filter(node=>/^(incenseSmoke-|distantBird-)/.test(node.name)).flatMap(node=>[node,...node.getChildTransformNodes(false)]))].map(node=>({name:node.name,world:Array.from(node.computeWorldMatrix(true).m)})),
          peoplePoseMatrices:scene.metadata.heroPeople.flatMap((person:{root:import("@babylonjs/core").TransformNode})=>person.root.getChildTransformNodes(false).filter(node=>node.name.startsWith("heroPerson-")).map(node=>({name:node.name,world:Array.from(node.computeWorldMatrix(true).m)}))),`);
main=replace(main,'instrumentation.dispose();','instrumentation.dispose(); gpuInstrumentation.dispose(); engine.stopRenderLoop();');
try{
  fs.writeFileSync(mainFile,main);fs.writeFileSync(sceneFile,scene);
  const orders=process.argv.includes('--optimized-only')?Array.from({length:runs},()=>['after']):process.argv.includes('--after-only')?[['after']]:profile?[[process.argv.includes('--profile-after')?'after':'before']]:process.argv.includes('--pilot')?[['before','after']]:Array.from({length:runs},(_,i)=>i%2?['after','before']:['before','after']);
  let port=9510;
  const capture=(name,phase,args=[])=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',name,'--hardware','--benchmark',`--quality=${quality}`,...(phase==='before'?['--legacy-render-perf']:[]),...(profile?['--profile']:[]),...(uncapped?['--uncapped']:[]),...args],{stdio:'inherit',env:{...process.env,CDP_PORT:String(port++)}});
  if(process.argv.includes('--batch')){
    const jobs=[];
    if(isolateFrame)for(const mode of ['legacy-a','legacy-b','selection','materials','optimized'])jobs.push({label:`${label}-${mode}`,renderMode:mode.startsWith('legacy')?'legacy':mode,renderFrame:isolateFrame});
    else if(checkpoints)for(const frame of (process.argv.includes("--tour-checkpoints")?[90,180,360,600]:process.argv.includes("--three-checkpoints")?[180,360,600]:[90,180,270,360,450,540,600]))for(const phase of (process.argv.includes('--optimized-only')?['after']:['before','after']))jobs.push({label:`${label}-checkpoint-${frame}-${phase}`,legacyRenderPerf:phase==='before',renderFrame:frame});
    else if(process.argv.includes('--isolate'))for(const mode of ['legacy','selection','materials','optimized'])jobs.push({label:`${label}-${mode}`,renderMode:mode});
    else for(const [index,order] of orders.entries())for(const phase of order)jobs.push({label:`${label}-${phase}-${index+1}`,legacyRenderPerf:phase==='before'});
    fs.mkdirSync('content/generated',{recursive:true});
    const request=`content/generated/render-batch-${process.pid}.json`;fs.writeFileSync(request,JSON.stringify(jobs));
    execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware','--benchmark',`--quality=${quality}`,`--batch-json=${request}`,...(uncapped?['--uncapped']:[]),...(profile?['--profile']:[])],{stdio:'inherit',env:{...process.env,CDP_PORT:'9530'}});
  }
  else if(checkpoints){for(const frame of (process.argv.includes("--tour-checkpoints")?[90,180,360,600]:process.argv.includes("--three-checkpoints")?[180,360,600]:[90,180,270,360,450,540,600]))for(const phase of (process.argv.includes('--optimized-only')?['after']:['before','after']))capture(`${label}-checkpoint-${frame}-${phase}`,phase,[`--render-frame=${frame}`]);}
  else for(const [index,order] of orders.entries())for(const phase of order)capture(`${label}-${phase}-${index+1}`,phase);
}finally{
  for(const [file,data] of originals){fs.writeFileSync(file,data);assert.equal(sha(fs.readFileSync(file)),sha(data));}
  console.log('Original scene and main restored and hash verified');
}
