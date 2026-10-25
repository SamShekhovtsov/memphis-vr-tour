import { PBRMaterial, Scene, type SubMesh } from "@babylonjs/core";

type Queue = { data: SubMesh[]; length: number; push(value:SubMesh):void };

/** Camera-only early depth, using Babylon's native depth-pass sequencing.
 * No material flags, shaders, poses, shadow lists or colour ordering change.
 */
export function configureRenderWork(scene: Scene) {
  const mode=new URLSearchParams(location.search).get("renderPerf")??"optimized";
  const stats=scene.metadata.renderingOptimization={mode,strategy:"authored-occluder-depth",frames:0,depthDraws:0,lastDepthDraws:0,fallback:false};
  if(mode==="legacy")return;
  const engine=scene.getEngine();
  scene.onBeforeRenderingGroupObservable.add(info=>{
    const main=(scene as unknown as {_renderingManager?:unknown})._renderingManager;
    if(info.renderingManager!==main||info.renderingGroupId!==0||engine.currentRenderPassId!==scene.activeCamera?.renderPassId||scene.forceWireframe||scene.forcePointsCloud)return;
    const group=info.renderingManager.getRenderingGroup(0) as unknown as {_opaqueSubMeshes?:Queue;_depthOnlySubMeshes?:Queue};
    // Guard the pinned Babylon 7 queue adapter; future changes fall back to
    // unmodified rendering rather than missing geometry or altering shadows.
    const opaque=group._opaqueSubMeshes,depth=group._depthOnlySubMeshes;
    if(!opaque||!depth||!Array.isArray(opaque.data)||!Array.isArray(depth.data)||typeof depth.push!=="function"){stats.fallback=true;return;}
    const present=new Set(depth.data.slice(0,depth.length));let draws=0;
    for(let index=0;index<opaque.length;index++){
      const subMesh=opaque.data[index],mesh=subMesh.getRenderingMesh(),material=subMesh.getMaterial();
      if(!(material instanceof PBRMaterial)||!material.metadata?.bakeId)continue;
      if(!["dust","plaster","hero-plaster"].includes(material.metadata.surfaceId))continue;
      if(material.disableDepthWrite||material.disableColorWrite||material.needAlphaBlendingForMesh(mesh)||material.needAlphaTestingForMesh(mesh)||present.has(subMesh))continue;
      depth.push(subMesh);present.add(subMesh);draws++;
    }
    stats.frames++;stats.depthDraws+=draws;stats.lastDepthDraws=draws;
  });
}