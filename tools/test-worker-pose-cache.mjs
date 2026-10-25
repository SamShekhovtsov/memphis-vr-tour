import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {NullEngine,Scene,TransformNode,Quaternion,Vector3} from '@babylonjs/core';
globalThis.location=new URL('http://localhost/');
const file='apps/web-tour/src/scene/HeroWorkerPose.ts';
const current=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
const edit=JSON.parse(fs.readFileSync('content/scene-data/hero-people.performance-revision.json')).files[file];
const original=current.slice(0,edit.offset)+edit.before+current.slice(edit.offset+edit.after.length);
fs.mkdirSync('content/generated',{recursive:true});
const groundFile='apps/web-tour/src/scene/GroundContactIK.ts';
const ground=fs.readFileSync(groundFile,'utf8').replaceAll('\r\n','\n');
const groundEdit=JSON.parse(fs.readFileSync('content/scene-data/hero-people.performance-revision.json')).files[groundFile];
fs.writeFileSync('content/generated/worker-ground-reference.ts',ground.slice(0,groundEdit.offset)+groundEdit.before+ground.slice(groundEdit.offset+groundEdit.after.length));
const modules=[];
for(const [name,code] of [['old',original],['new',current]]) {
  const path=`content/generated/worker-cache-test-${name}.ts`;
  fs.writeFileSync(path,code.replace('"./GroundContactIK"',name==='old'?'"./worker-ground-reference.ts"':'"../../apps/web-tour/src/scene/GroundContactIK.ts"'));
  modules.push(await import(pathToFileURL(fs.realpathSync(path)).href));
}
const engine=new NullEngine();
const matrixCalls=[{all:0,forced:0},{all:0,forced:0}];
let measured=-1;
const computeWorldMatrix=TransformNode.prototype.computeWorldMatrix;
TransformNode.prototype.computeWorldMatrix=function(force,...args){
  if(measured>=0){matrixCalls[measured].all++;if(force)matrixCalls[measured].forced++;}
  return computeWorldMatrix.call(this,force,...args);
};
function fixture(reflected){
  const scene=new Scene(engine);scene.metadata={};
  const nodes=new Map();
  const add=(name,parent,position)=>{
    const node=new TransformNode(name,scene);node.parent=parent;node.position.copyFrom(position);node.rotationQuaternion=Quaternion.Identity();nodes.set(name,node);return node;
  };
  const root=add('root',null,Vector3.Zero());root.scaling.z=reflected?-1:1;
  const spine=add('spine05',root,new Vector3(0,1,0));add('head',spine,new Vector3(0,.7,0));
  const wrists=[];
  for(const [index,side] of ['L','R'].entries()){
    const arm=add('upperarm01.'+side,spine,new Vector3(index?.2:-.2,.35,0));
    const wrist=add('wrist.'+side,arm,new Vector3(0,-.4,.1));wrists.push(wrist);
    for(let digit=1;digit<=5;digit++)for(let joint=1;joint<=3;joint++)
      add(`finger${digit}-${joint}.${side}`,wrist,new Vector3((digit-3)*.02,.025,digit===3?.12:.08));
  }
  return {scene,nodes,root,wrists,bone:n=>nodes.get(n),rest:new Map([...nodes.values()].map(n=>[n,n.rotationQuaternion.clone()]))};
}
let comparisons=0;
for(const reflected of [false,true]){
  const fixtures=[fixture(reflected),fixture(reflected)];
  for(let frame=0;frame<6;frame++){
    const block=new Vector3(frame===3?.3:.15,.5,.6);
    for(const [index,f] of fixtures.entries()){
      f.root.position.x=frame===2?.4:0;
      f.root.rotationQuaternion.copyFrom(Quaternion.RotationYawPitchRoll(frame===4?.45:0,0,0));
      for(const [name,node] of f.nodes)if(index===0||!name.startsWith('finger'))node.rotationQuaternion.copyFrom(name==='root'?f.root.rotationQuaternion:f.rest.get(node));
      for(const [side,wrist] of f.wrists.entries()){
        // Production calls the hand finish after its arm IK has refreshed the
        // incoming wrist world transform. Reproduce that input contract.
        wrist.computeWorldMatrix(true);
        measured=index;
        try{modules[index].finishWorkerHand(side,wrist,block,f.bone,f.rest,f.scene,block);}finally{measured=-1;}
      }
    }
    for(const [name,a] of fixtures[0].nodes){
      // The cached orientation must also be visible to ordinary render queries,
      // without a forced matrix refresh masking stale same-frame cache data.
      if(name.startsWith('wrist.')) {
        const expected=a.computeWorldMatrix(true).m,actual=fixtures[1].nodes.get(name).getWorldMatrix().m;
        assert.ok(expected.every((v,i)=>Math.abs(v-actual[i])<1e-6),`Stale cached wrist world matrix: ${name}, frame ${frame}`);
      }
      const b=fixtures[1].nodes.get(name),ma=a.computeWorldMatrix(true).m,mb=b.computeWorldMatrix(true).m;
      assert.ok(ma.every((v,i)=>Math.abs(v-mb[i])<1e-6),`Changed pose: ${name}, frame ${frame}, reflected ${reflected}`);comparisons++;
    }
  }
  fixtures.forEach(f=>f.scene.dispose());
}
engine.dispose();
TransformNode.prototype.computeWorldMatrix=computeWorldMatrix;
assert.ok(matrixCalls[1].forced<matrixCalls[0].forced,'Optimization must remove forced matrix work');
fs.writeFileSync('docs/design/hero-people-performance-cpu-checks-2026-10-25.json',JSON.stringify({worldMatrixComparisons:comparisons,before:matrixCalls[0],after:matrixCalls[1],forcedCallReduction:1-matrixCalls[1].forced/matrixCalls[0].forced,method:'Forced and total TransformNode.computeWorldMatrix calls inside the original and optimized hand finish over the same six repeated/changed-input cases for normal and reflected roots. Includes removed per-frame diagnostic work; excludes test setup and matrix comparisons. A CPU operation-count check, not a browser FPS measurement.'},null,2)+'\n');
console.log(`Worker cache: ${comparisons} world-matrix comparisons match the original solve, including repeated inputs, changed parents/targets and reflected roots`);
console.log({matrixCalls});
