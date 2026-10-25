import { AbstractMesh, Octree, PBRMaterial, Scene, TransformNode, Vector3 } from "@babylonjs/core";

/** Cull immutable imported geometry before expensive material/mesh readiness
 * checks. Moving/skinned/action meshes remain dynamic; preserve scene order. */
export function configureRenderWork(scene: Scene) {
  const mode=new URLSearchParams(location.search).get("renderPerf")??"optimized";
  const stats=scene.metadata.renderingOptimization={mode,staticMeshes:0,dynamicMeshes:0,
    candidates:0,enabledCandidates:0,sceneMeshes:0,frozenMaterials:0};
  if(mode==="legacy")return;
  scene.onAfterRenderObservable.addOnce(()=>{
    if(mode!=="materials"){
      // This district's procedural movers are driven outside AnimationGroups.
      // Imported animation targets and every descendant stay unfrozen too.
      const animated=new Set(scene.animationGroups.flatMap(group=>group.targetedAnimations.map(animation=>animation.target)));
      const moves=(mesh:AbstractMesh)=>{
        if(mesh.skeleton||mesh.morphTargetManager||mesh.actionManager||mesh.isWorldMatrixCameraDependent())return true;
        for(let node:TransformNode|null=mesh;node;node=node.parent instanceof TransformNode?node.parent:null)
          if(animated.has(node)||node.animations.length||/^(glbAnimatedStreetActors|heroPerson-|incenseSmoke-|distantBird-)/.test(node.name))return true;
        return false;
      };
      for(const mesh of scene.meshes)if(!mesh.isWorldMatrixFrozen&&!moves(mesh))mesh.freezeWorldMatrix();
      const staticMeshes=scene.meshes.filter(mesh=>mesh.isWorldMatrixFrozen&&!mesh.skeleton&&!mesh.morphTargetManager&&!mesh.isWorldMatrixCameraDependent()&&!mesh.alwaysSelectAsActiveMesh&&!mesh.actionManager&&!mesh.isAnInstance&&!mesh.hasInstances);
      const fixed=new Set(staticMeshes);
      const dynamic=scene.meshes.filter(mesh=>!fixed.has(mesh));
      const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
      for(const mesh of staticMeshes){const box=mesh.getBoundingInfo().boundingBox;min.minimizeInPlace(box.minimumWorld);max.maximizeInPlace(box.maximumWorld);}
      if(!staticMeshes.length){min.set(-1,-1,-1);max.set(1,1,1);}
      const tree=new Octree<AbstractMesh>(Octree.CreationFuncForMeshes,32,3);
      tree.update(min,max,staticMeshes);tree.dynamicContent=dynamic;
      stats.staticMeshes=staticMeshes.length;stats.dynamicMeshes=dynamic.length;
      const order=new Map<AbstractMesh,number>();let dirty=true;
      const known=new Set(scene.meshes);let last:AbstractMesh|undefined;
      const add=(mesh:AbstractMesh)=>{if(!known.has(mesh)){known.add(mesh);tree.dynamicContent.push(mesh);}dirty=true;};
      const remove=(mesh:AbstractMesh)=>{known.delete(mesh);tree.removeMesh(mesh);const index=tree.dynamicContent.indexOf(mesh);if(index>=0)tree.dynamicContent.splice(index,1);dirty=true;};
      const original=scene.getActiveMeshCandidates;
      const result={data:[] as AbstractMesh[],length:0};
      scene.onNewMeshAddedObservable.add(add);
      scene.onMeshRemovedObservable.add(remove);
      scene.getActiveMeshCandidates=()=>{
        // Babylon's mesh-added notification is deferred. Detect a newly added
        // mesh before that notification so its very first frame is retained.
        if(dirty||scene.meshes.length!==known.size||scene.meshes.at(-1)!==last){
          const current=new Set(scene.meshes);
          for(const mesh of known)if(!current.has(mesh))remove(mesh);
          for(const mesh of scene.meshes)if(!known.has(mesh))add(mesh);
          order.clear();scene.meshes.forEach((mesh,index)=>order.set(mesh,index));last=scene.meshes.at(-1);dirty=false;
        }
        const selected=scene.skipFrustumClipping?original.call(scene):tree.select(scene.frustumPlanes);
        let count=0;
        for(let i=0;i<selected.length;i++){const mesh=selected.data[i];if(!mesh.isDisposed()&&mesh.isEnabled())result.data[count++]=mesh;}
        result.data.length=count;result.data.sort((a,b)=>order.get(a)!-order.get(b)!);result.length=count;
        stats.candidates=selected.length;stats.enabledCandidates=count;stats.sceneMeshes=scene.meshes.length;
        return result;
      };
    }
    if(mode!=="selection"){
      const pending=new Set(scene.materials);
      const cached=new Set<PBRMaterial>();
      scene.onNewMaterialAddedObservable.add(material=>pending.add(material));
      // Entering XR changes image-processing shader defines. Release the cache
      // for the next render, then cache the new settled configuration again.
      scene.imageProcessingConfiguration.onUpdateParameters.add(()=>{
        for(const material of cached){material.unfreeze();pending.add(material);}
        stats.frozenMaterials=0;
      });
      const freeze=()=>{
        for(const material of pending){
          if(material instanceof PBRMaterial&&(material.metadata?.bakeId||material.metadata?.family)){
            material.freeze();cached.add(material);
          }
          pending.delete(material);
        }
        stats.frozenMaterials=cached.size;
      };
      freeze();scene.onAfterRenderObservable.add(freeze);
    }
  });
}
