import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,FreeCamera,MeshBuilder,PBRMaterial,Vector3} from '@babylonjs/core';
import {configureRenderWork} from '../apps/web-tour/src/scene/RenderWorkOptimization.ts';
globalThis.location=new URL('http://localhost/');
const engine=new NullEngine(),scene=new Scene(engine);scene.metadata={};
const camera=new FreeCamera('locked',new Vector3(0,2,-10),scene);scene.activeCamera=camera;
const surfaces=['dust','plaster','hero-plaster','cloth','dust','dust','dust'];
const meshes=surfaces.map((surfaceId,i)=>{
 const mesh=MeshBuilder.CreateBox('fixture-'+i,{},scene),material=new PBRMaterial('material-'+i,scene);
 material.metadata={bakeId:'fixture',surfaceId};mesh.material=material;return mesh;
});
meshes[4].material.metadata={surfaceId:'dust'};
meshes[5].material.alpha=.5;
meshes[6].material.disableDepthWrite=true;
const original=meshes.map(m=>({position:m.position.asArray(),vertices:Array.from(m.getVerticesData('position')),indices:Array.from(m.getIndices()),color:m.material.albedoColor.asArray(),depthFlag:m.material.needDepthPrePass}));
const opaque={data:meshes.map(m=>m.subMeshes[0]),length:meshes.length};
const depth={data:[],length:0,push(value){this.data[this.length++]=value;}};
const manager=scene._renderingManager;
const saved=manager.getRenderingGroup;manager.getRenderingGroup=()=>({_opaqueSubMeshes:opaque,_depthOnlySubMeshes:depth});
engine.currentRenderPassId=camera.renderPassId;
configureRenderWork(scene);
const invoke=(renderingManager=manager,renderingGroupId=0)=>scene.onBeforeRenderingGroupObservable.notifyObservers({renderingManager,renderingGroupId});
invoke();assert.deepEqual(depth.data.slice(0,depth.length),opaque.data.slice(0,3));
invoke();assert.equal(depth.length,3,'Existing depth entries duplicated');
for(let i=0;i<meshes.length;i++){
 const m=meshes[i];assert.deepEqual({position:m.position.asArray(),vertices:Array.from(m.getVerticesData('position')),indices:Array.from(m.getIndices()),color:m.material.albedoColor.asArray(),depthFlag:m.material.needDepthPrePass},original[i]);
 if(i<3)assert.equal(m.material.checkReadyOnEveryCall,true,'Depth/colour shader define must be refreshed');
}
const frames=scene.metadata.renderingOptimization.frames;
invoke({},0);invoke(manager,1);scene.forceWireframe=true;invoke();scene.forceWireframe=false;
engine.currentRenderPassId=camera.renderPassId+1;invoke();engine.currentRenderPassId=camera.renderPassId;
assert.equal(scene.metadata.renderingOptimization.frames,frames,'Non-camera render path modified');
manager.getRenderingGroup=()=>({});invoke();assert.equal(scene.metadata.renderingOptimization.fallback,true);
manager.getRenderingGroup=saved;
const result={opaqueOccluders:3,excludedSurfaces:4,duplicatePrevention:true,unchangedGeometryTransformsMaterialsAndDepthFlags:true,shaderReadiness:true,cameraPassOnly:true,otherGroupsAndWireframeUnchanged:true,unsupportedQueueFallback:true};
fs.writeFileSync('docs/design/render-depth-checks-2026-10-25.json',JSON.stringify(result,null,2)+'\n');
console.log(result);scene.dispose();engine.dispose();
