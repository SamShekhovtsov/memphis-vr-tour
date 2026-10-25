import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,FreeCamera,MeshBuilder,TransformNode,Vector3,Animation,AnimationGroup,PBRMaterial} from '@babylonjs/core';
globalThis.location=new URL('http://localhost/');
// Archived, rejected candidate: retained to reproduce the selection experiment.
const {configureRenderWork}=await import('../content/source-assets/performance/RenderSelectionExperiment.ts');
const engine=new NullEngine({renderWidth:1280,renderHeight:720});
const scene=new Scene(engine);scene.metadata={};
const camera=new FreeCamera('camera',new Vector3(0,4,-15),scene);camera.minZ=.1;camera.maxZ=120;
for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){
  const mesh=MeshBuilder.CreateBox(`fixed-${x}-${z}`,{size:1},scene);mesh.position.set(x*4,0,z*4);
}
const animated=new TransformNode('imported-animation-root',scene);
const moving=MeshBuilder.CreateBox('moving',{size:2},scene);moving.parent=animated;
const animation=new Animation('move','position.x',30,Animation.ANIMATIONTYPE_FLOAT);animation.setKeys([{frame:0,value:0},{frame:30,value:5}]);
const group=new AnimationGroup('imported',scene);group.addTargetedAnimation(animation,animated);
const birdRoot=new TransformNode('distantBird-fixture',scene),bird=MeshBuilder.CreateBox('bird',{size:1},scene);bird.parent=birdRoot;
const billboard=MeshBuilder.CreatePlane('label',{size:1},scene);billboard.billboardMode=7;
const always=MeshBuilder.CreateBox('always',{size:1},scene);always.alwaysSelectAsActiveMesh=true;always.position.x=200;
const authored=new PBRMaterial('authored',scene);authored.metadata={bakeId:'fixture'};moving.material=authored;
const water=new PBRMaterial('water',scene);water.alpha=.8;
configureRenderWork(scene);scene.render();
assert.ok(!moving.isWorldMatrixFrozen&&!bird.isWorldMatrixFrozen&&!billboard.isWorldMatrixFrozen);
assert.ok(scene.getMeshByName('fixed-0-0').isWorldMatrixFrozen);
assert.ok(authored.isFrozen&&!water.isFrozen);
scene.imageProcessingConfiguration.exposure=1.2;
assert.ok(!authored.isFrozen,'Image-processing changes must invalidate cached materials');
scene.render();assert.ok(authored.isFrozen,'Settled image processing should be cached again');
const late=MeshBuilder.CreateBox('late',{size:1},scene);late.position.set(120,2,0);
const hidden=scene.getMeshByName('fixed-0-0');hidden.setEnabled(false);
let visibleChecks=0,poses=0;
for(let step=0;step<32;step++){
  const angle=step*Math.PI/16;camera.position.set(Math.sin(angle)*38,4,Math.cos(angle)*38);camera.setTarget(Vector3.Zero());
  animated.position.set(Math.cos(angle)*28,1,Math.sin(angle)*28);birdRoot.position.set(Math.sin(angle)*45,6,Math.cos(angle)*45);
  if(step===8)hidden.setEnabled(true);
  if(step===12)scene.getMeshByName('fixed-1-1').dispose();
  scene.render();
  const selected=scene.getActiveMeshCandidates(),array=selected.data.slice(0,selected.length),set=new Set(array);
  assert.equal(set.size,array.length);assert.ok(array.every(mesh=>mesh.isEnabled()&&!mesh.isDisposed()));
  assert.deepEqual(array,[...array].sort((a,b)=>scene.meshes.indexOf(a)-scene.meshes.indexOf(b)),'Draw order changed');
  for(const mesh of scene.meshes){
    if(mesh.isEnabled()&&(mesh.alwaysSelectAsActiveMesh||mesh.isInFrustum(scene.frustumPlanes))){assert.ok(set.has(mesh),'Visible candidate dropped: '+mesh.name);visibleChecks++;}
  }
  assert.ok(set.has(moving)&&set.has(bird)&&set.has(late)&&set.has(always),'Dynamic/late/always-active mesh lost');poses++;
}
scene.skipFrustumClipping=true;
const unculled=scene.getActiveMeshCandidates();assert.equal(unculled.length,scene.meshes.filter(mesh=>mesh.isEnabled()).length);
const result={cameraPoses:poses,visibleCandidateChecks:visibleChecks,movingAndAnimatedRootsUnfrozen:true,stableDrawOrder:true,lateMeshes:true,enableAndDispose:true,skipFrustumClippingFallback:true,waterMaterialUnfrozen:true,imageProcessingInvalidatesCache:true};
fs.writeFileSync('docs/design/render-selection-checks-2026-10-25.json',JSON.stringify(result,null,2)+'\n');
console.log(result);scene.dispose();engine.dispose();
