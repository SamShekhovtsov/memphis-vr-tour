import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('apps/web-tour/src/scene/CharacterActionPose.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {actionEnvelope,actionPose,blinkAmount}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(const kind of ['work','inspect','rest','socialize','deliver'])for(let seed=0;seed<126;seed++){
 let resting=0;for(let i=0;i<400;i++){const a=actionPose(kind,i/100,0,seed),b=actionPose(kind,i/100,1,seed);assert.ok(a.lift>=0&&b.lift>=0&&a.lift<=.25&&b.lift<=.25);if(a.envelope===0)resting++;if(kind==='work'||kind==='socialize')assert.ok(a.lift!==b.lift||a.envelope===0);}
 assert.ok(resting>=150,'Unsupported pose never relaxes');
}
for(const t of [0,.65,1.65,2.35,4])assert.ok(Math.abs(actionEnvelope(t+1e-5)-actionEnvelope(t-1e-5))<1e-6,'Gesture boundary has a position jump');
for(let seed=0;seed<126;seed++){let closed=0;for(let i=0;i<10000;i++){const b=blinkAmount(i/1000,seed);assert.ok(b>=0&&b<=1);if(b>.95)closed++;}assert.ok(closed>10&&closed<500);}
console.log('126 stable phase streams: asymmetric actions relax, preparation/return boundaries are continuous, blinks are brief and bounded');
const {pathToFileURL}=await import('node:url');
const core=pathToFileURL(process.cwd()+'/node_modules/@babylonjs/core/index.js').href;
let source=fs.readFileSync('apps/web-tour/src/scene/CharacterContactTargets.ts','utf8').replace("import authored from '../../../../content/scene-data/hero-street.anchors-lock.json';",'const authored='+fs.readFileSync('content/scene-data/hero-street.anchors-lock.json','utf8')+';').replace("'@babylonjs/core'",JSON.stringify(core));
const {characterContactTargets}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const {NullEngine,Scene,MeshBuilder,Vector3}=await import(core),engine=new NullEngine(),scene=new Scene(engine);scene.metadata={};
const bench=MeshBuilder.CreateBox('qaBench',{width:.8,depth:.8,height:.2},scene);bench.position.y=.8;bench.computeWorldMatrix(true);
const station={id:'bench',kind:'rest',anchor:'qaBench',point:new Vector3(0,0,-.9)},resolve=characterContactTargets(scene);
const point=resolve(station,new Vector3(0,1.3,-.65),.75);assert.ok(point&&Math.abs(point.y-.9)<1e-5,'Contact must hit an actual top triangle');assert.equal(resolve(station,new Vector3(0,1.3,-4),.75),undefined,'Do not reach an unreachable object');
assert.equal(resolve({...station,id:'empty',anchor:'missing'},new Vector3(0,1.3,-.65),.75),undefined,'Do not fabricate contact with absent props');
scene.dispose();engine.dispose();console.log('Real bench triangle contact, reach limits and absent-object rejection passed');
