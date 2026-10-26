import { BakedVertexAnimationManager, BoundingInfo, Mesh, Quaternion, RawTexture, Scene, SceneLoader, Texture, VertexBuffer, TransformNode, Vector3, Vector4 } from '@babylonjs/core';
import type { HeroPerson } from './HeroPeople';
import { GroundContactIK } from './GroundContactIK';

/** Additional residents share the original anatomy, materials and GPU pose atlas.
 * No extra skeletons, textures per resident, or billboard replacements. */
export async function addInstancedDistrictCrowd(scene: Scene, people: HeroPerson[]) {
  if (people.length !== 9 || new URLSearchParams(location.search).get('crowd') === 'small') return;
  const caps=scene.getEngine().getCaps();
  if(!caps.instancedArrays||!caps.textureFloat){scene.metadata.gpuCrowd={requested:180,total:people.length,unsupported:true};return;}
  const lodInputs=await Promise.all(['female','male'].map(async sex=>Promise.all([1,2].map(level=>SceneLoader.LoadAssetContainerAsync('/assets/authored/people/crowd/', 'hero_'+sex+'_lod'+level+'.glb',scene)))));
  const skeletonsBefore=scene.skeletons.length;
  const frames = 64, templates = [people[3], people[4]];
  const groups = templates.map((person, sex) => {
    const root = person.root, position = root.position.clone(), rotation = root.rotationQuaternion?.clone();
    const nodes = root.getChildTransformNodes(false);
    const saved = nodes.map(n => ({n, p:n.position.clone(), q:n.rotationQuaternion?.clone(), r:n.rotation.clone(), s:n.scaling.clone()}));
    const meshes = root.getChildMeshes().filter((m):m is Mesh => m instanceof Mesh && !!m.skeleton);
    if (meshes.length !== (sex===0?5:4)) throw new Error('Crowd source must retain all anatomical mesh parts: '+root.getChildMeshes().map(m=>m.name+':'+m.getClassName()+':'+!!m.skeleton).join(','));
    const local = meshes.map(m => m.computeWorldMatrix(true).multiply(root.computeWorldMatrix(true).clone().invert()));
    const skeleton = meshes[0].skeleton!, stride = .85;
    const matrixSize=(skeleton.bones.length+1)*16,levels=5;
    const atlas = new Float32Array(matrixSize*frames*levels);
    const contact = new GroundContactIK(root, person.legs, () => ({height:0,normal:Vector3.Up()}));
    person.setFacing(Vector3.Forward());
    // Warm the same procedural contact solver before recording one complete stride.
    for (let f=0;f<frames*3;f++) {
      contact.restore(); root.setAbsolutePosition(new Vector3(0,.045,f*stride/frames));
      person.update(f/60); contact.update(f/60); skeleton.prepare(true);
      if(f>=frames*2)atlas.set(skeleton.getTransformMatrices(meshes[0]),(f-frames*2)*(skeleton.bones.length+1)*16);
    }
    contact.restore();
    for(const v of saved){v.n.position.copyFrom(v.p);v.n.scaling.copyFrom(v.s);v.n.rotation.copyFrom(v.r);v.n.rotationQuaternion=v.q?.clone()??null;}
    root.setAbsolutePosition(new Vector3(0,.045,0));
    const idleContact=new GroundContactIK(root,person.legs,()=>({height:0,normal:Vector3.Up()}));
    for(let f=0;f<90;f++){idleContact.restore();person.update(4+f/60);idleContact.update(4+f/60);}
    skeleton.prepare(true);
    const idle=skeleton.getTransformMatrices(meshes[0]).slice();
    for(let level=1;level<levels;level++)for(let f=0;f<frames;f++)for(let k=0;k<matrixSize;k++){
      const walk=atlas[f*matrixSize+k];atlas[(level*frames+f)*matrixSize+k]=walk+(idle[k]-walk)*level/(levels-1);
    }
    // Restore the original live hero's bind/IK state; DistrictLife starts its own clock.
    for(const v of saved){v.n.position.copyFrom(v.p);v.n.scaling.copyFrom(v.s);v.n.rotation.copyFrom(v.r);v.n.rotationQuaternion=v.q?.clone()??null;}
    root.position.copyFrom(position);root.rotationQuaternion=rotation??null;root.computeWorldMatrix(true);skeleton.prepare(true);
    const manager = new BakedVertexAnimationManager(scene);
    manager.texture=RawTexture.CreateRGBATexture(atlas,(skeleton.bones.length+1)*4,frames*levels,scene,false,false,Texture.NEAREST_SAMPLINGMODE,1);
    manager.texture.name='crowd-pose-atlas-'+sex;manager.time=0;
    const sources=meshes.map((mesh,i)=>{
      const source=mesh.clone('crowd-source-'+sex+'-'+i,null,true)!;
      source.parent=null;source.position.setAll(0);source.rotationQuaternion=Quaternion.Identity();source.scaling.setAll(1);
      // glTF's actor parent reflects Z. Matching the source determinant is essential:
      // Babylon otherwise renders every instance separately to reverse winding.
      source.scaling.z=Math.sign(mesh.computeWorldMatrix(true).determinant());
      source.bakedVertexAnimationManager=manager;source.isVisible=false;source.isPickable=false;
      source.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced',4);
      source.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*4,frames*4,0,0);
      const canonical=mesh.name.replace(/^heroPerson-[^-]+-/,'');
      for(const [level,container] of lodInputs[sex].entries()){
        const input=container.meshes.find(m=>m.name===canonical);
        if(!(input instanceof Mesh)||!input.skeleton)throw Error('Missing crowd LOD mesh '+canonical);
        const lod=input.clone(source.name+'-lod'+(level+1),null,true)!;
        lod.parent=null;lod.position.setAll(0);lod.rotationQuaternion=Quaternion.Identity();lod.scaling.copyFrom(source.scaling);lod.makeGeometryUnique();
        const originalIndices=new Map(skeleton.bones.map(b=>[b.name,b.getIndex()]));
        const remap=new Map(input.skeleton.bones.map(b=>[b.getIndex(),originalIndices.get(b.name)]));
        for(const kind of [VertexBuffer.MatricesIndicesKind,VertexBuffer.MatricesIndicesExtraKind]){
          const indices=lod.getVerticesData(kind);if(!indices)continue;
          const mapped=Float32Array.from(indices,v=>{const next=remap.get(v);if(next===undefined)throw Error('Crowd LOD lost joint '+v);return next;});
          lod.setVerticesData(kind,mapped,false,4);
        }
        lod.material=source.material;lod.skeleton=skeleton;lod.bakedVertexAnimationManager=manager;
        lod.useVertexColors=source.useVertexColors;lod.hasVertexAlpha=source.hasVertexAlpha;
        lod.isVisible=false;lod.isPickable=false;lod.receiveShadows=true;
        lod.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced',4);
        lod.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*4,frames*4,0,0);
        source.addLODLevel(level===0?8:20,lod);
      }
      return source;
    });
    return {sources,local,manager,forward:person.facing().clone()};
  });
  for(let i=9;i<180;i++){
    const g=groups[i%2],root=new TransformNode('districtCrowdResident'+i,scene);
    root.parent=people[0].root.parent;root.metadata={resident:true,gpuCrowd:true};
    const parts=g.sources.map((source,j)=>{
      const part=source.createInstance('crowd-'+i+'-'+j);part.parent=root;
      part.rotationQuaternion=Quaternion.Identity();g.local[j].decompose(part.scaling,part.rotationQuaternion,part.position);
      // Skin deformation is done by the vertex shader, so use a conservative body bound.
      part.setBoundingInfo(new BoundingInfo(new Vector3(-.85,-.15,-.85),new Vector3(.85,2.35,.85)));
      part.receiveShadows=true;part.isPickable=false;
      part.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*4,frames*4,0,0);
      return part;
    });
    const localForward=Vector3.TransformNormal(g.forward,(people[0].root.parent as TransformNode).computeWorldMatrix(true).clone().invert()).normalize();
    let previous:Vector3|undefined,previousTime:number|undefined,blend=0,phase=(i*.61803398875)%1;
    const facing=()=>Vector3.TransformNormal(localForward,root.computeWorldMatrix(true)).normalize();
    people.push({root,legs:[],role:'CrowdResident'+i,facing,setFacing(direction){
      const d=Vector3.TransformNormal(direction,(root.parent as TransformNode).computeWorldMatrix(true).clone().invert());
      root.rotationQuaternion=Quaternion.RotationAxis(Vector3.Up(),Math.atan2(d.x,d.z)-Math.atan2(localForward.x,localForward.z));
    },wristAngles:()=>[],handContactErrors:()=>[],update(time){
      const p=root.getAbsolutePosition();const distance=previous?Vector3.Distance(p,previous):0;
      const dt=previousTime===undefined?0:Math.max(0,Math.min(.2,time-previousTime));
      phase=(phase+distance/.85)%1;previous=p.clone();previousTime=time;
      blend+=(Math.min(1,dt>0?distance/dt/.55:0)-blend)*(1-Math.exp(-dt*9));
      const level=Math.round((1-blend)*4);
      const frame=(level===4?0:Math.floor(phase*frames))+level*frames;
      for(const part of parts){const settings=part.instancedBuffers.bakedVertexAnimationSettingsInstanced as Vector4;settings.set(frame,frame,0,0);}
    }});
  }
  scene.metadata.gpuCrowd={additional:171,total:180,poseAtlases:2,poseFrames:frames,transitionLevels:5,geometry:'original anatomy, shared instanced meshes',lodDistances:[8,20],nearGeometry:'original full detail',liveSkeletons:9,skeletonsBefore,skeletonsAfter:scene.skeletons.length};
  scene.onDisposeObservable.addOnce(()=>groups.forEach(g=>g.manager.dispose(true)));
}
