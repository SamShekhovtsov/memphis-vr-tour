import population from '../../../../content/scene-data/district-population.json';
import { BakedVertexAnimationManager, BoundingInfo, ThinEngine, Mesh, Quaternion, RawTexture, Scene, SceneLoader, Texture, VertexBuffer, TransformNode, Vector3, Vector4 } from '@babylonjs/core';
import type { HeroPerson } from './HeroPeople';
import { GroundContactIK } from './GroundContactIK';

/** Additional residents share the original anatomy, materials and GPU pose atlas.
 * No extra skeletons, textures per resident, or billboard replacements. */
export async function addInstancedDistrictCrowd(scene: Scene, people: HeroPerson[]) {
  if (people.length !== 9 || new URLSearchParams(location.search).get('crowd') === 'small') return;
  const caps=scene.getEngine().getCaps();
  if(!caps.instancedArrays||!caps.textureFloat){scene.metadata.gpuCrowd={requested:population.total,total:people.length,unsupported:true};return;}
  const lodInputs=await Promise.all(['female','male'].map(async sex=>Promise.all([1,2].map(level=>SceneLoader.LoadAssetContainerAsync('/assets/authored/people/crowd/', 'hero_'+sex+'_lod'+level+'.glb',scene)))));
  const skeletonsBefore=scene.skeletons.length;
  const actionFrames=48,actionLevels=4,walkLevels=7,prototypePairs=[10,50,100],actions=['inspect','work','rest','socialize'];
  const frames = 64, templates = [people[3], people[4]];
  const groups = templates.map((person, sex) => {
    const root = person.root, position = root.position.clone(), rotation = root.rotationQuaternion?.clone();
    const nodes = root.getChildTransformNodes(false);
    const saved = nodes.map(n => ({n, p:n.position.clone(), q:n.rotationQuaternion?.clone(), r:n.rotation.clone(), s:n.scaling.clone()}));
    const meshes = root.getChildMeshes().filter((m):m is Mesh => m instanceof Mesh && !!m.skeleton);
    if (meshes.length !== (sex===0?5:4)) throw new Error('Crowd source must retain all anatomical mesh parts: '+root.getChildMeshes().map(m=>m.name+':'+m.getClassName()+':'+!!m.skeleton).join(','));
    const local = meshes.map(m => m.computeWorldMatrix(true).multiply(root.computeWorldMatrix(true).clone().invert()));
    const skeleton = meshes[0].skeleton!, stride = .85;
    const matrixSize=(skeleton.bones.length+1)*16,levels=walkLevels;
    const bakedRows=frames*levels+actions.length*actionFrames*actionLevels,rows=bakedRows+prototypePairs.length;
    const atlas = new Float32Array(matrixSize*rows);
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
    const idle=skeleton.getTransformMatrices(meshes[0]).slice(),idles=new Float32Array(matrixSize*frames);
    for(let f=0;f<frames;f++){idleContact.restore();person.update(4+f/16);idleContact.update(4+f/16);skeleton.prepare(true);idles.set(skeleton.getTransformMatrices(meshes[0]),f*matrixSize);}
    for(let level=1;level<levels;level++)for(let f=0;f<frames;f++)for(let k=0;k<matrixSize;k++){
      const walk=atlas[f*matrixSize+k];atlas[(level*frames+f)*matrixSize+k]=walk+(idles[f*matrixSize+k]-walk)*level/(levels-1);
    }
    const actionBase=frames*levels;
    const savedMetadata=root.metadata;
    for(const [action,name]of actions.entries()){
      root.metadata={...savedMetadata,activity:name,atlasPose:true};
      for(let f=0;f<actionFrames;f++){
        idleContact.restore();person.update(8+action*4+f/12);idleContact.update(8+action*4+f/12);skeleton.prepare(true);
        const pose=skeleton.getTransformMatrices(meshes[0]);
        for(let level=1;level<=actionLevels;level++)for(let k=0;k<matrixSize;k++)atlas[(actionBase+(action*actionLevels+level-1)*actionFrames+f)*matrixSize+k]=idle[k]+(pose[k]-idle[k])*level/actionLevels;
      }
    }
    root.metadata=savedMetadata;
    // Restore the original live hero's bind/IK state; DistrictLife starts its own clock.
    for(const v of saved){v.n.position.copyFrom(v.p);v.n.scaling.copyFrom(v.s);v.n.rotation.copyFrom(v.r);v.n.rotationQuaternion=v.q?.clone()??null;}
    root.position.copyFrom(position);root.rotationQuaternion=rotation??null;root.computeWorldMatrix(true);skeleton.prepare(true);
    const manager = new BakedVertexAnimationManager(scene);
    manager.texture=RawTexture.CreateRGBATexture(atlas,(skeleton.bones.length+1)*4,rows,scene,false,false,Texture.NEAREST_SAMPLINGMODE,1);
    manager.texture.name='crowd-pose-atlas-'+sex;manager.time=0;
    const sources=meshes.map((mesh,i)=>{
      const source=mesh.clone('crowd-source-'+sex+'-'+i,null,true)!;
      source.parent=null;source.position.setAll(0);source.rotationQuaternion=Quaternion.Identity();source.scaling.setAll(1);
      // glTF's actor parent reflects Z. Matching the source determinant is essential:
      // Babylon otherwise renders every instance separately to reverse winding.
      source.scaling.z=Math.sign(mesh.computeWorldMatrix(true).determinant());
      source.bakedVertexAnimationManager=manager;source.isVisible=false;source.isPickable=false;
      if(source.material?.metadata?.family==='skin'){source.registerInstancedBuffer('characterBlinkSeed',1);source.instancedBuffers.characterBlinkSeed=0;}
      source.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced',4);
      source.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*(walkLevels-1),frames*(walkLevels-1),0,0);
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
        if(source.material?.metadata?.family==='skin'){lod.registerInstancedBuffer('characterBlinkSeed',1);lod.instancedBuffers.characterBlinkSeed=0;}
        lod.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced',4);
        lod.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*(walkLevels-1),frames*(walkLevels-1),0,0);
        source.addLODLevel(level===0?8:20,lod);
      }
      return source;
    });
    return {sources,local,manager,atlas,matrixSize,bakedRows,slots:new Map<number,number>(),row:new Float32Array(matrixSize),forward:person.facing().clone()};
  });
  for(let i=9;i<population.total;i++){
    const g=groups[i%2],root=new TransformNode('districtCrowdResident'+i,scene);
    root.parent=people[0].root.parent;root.metadata={resident:true,gpuCrowd:true};
    const parts=g.sources.map((source,j)=>{
      const part=source.createInstance('crowd-'+i+'-'+j);part.parent=root;
      part.rotationQuaternion=Quaternion.Identity();g.local[j].decompose(part.scaling,part.rotationQuaternion,part.position);
      // Skin deformation is done by the vertex shader, so use a conservative body bound.
      part.setBoundingInfo(new BoundingInfo(new Vector3(-.85,-.15,-.85),new Vector3(.85,2.35,.85)));
      part.receiveShadows=true;part.isPickable=false;
      if(source.material?.metadata?.family==='skin')part.instancedBuffers.characterBlinkSeed=i;
      part.instancedBuffers.bakedVertexAnimationSettingsInstanced=new Vector4(frames*(walkLevels-1),frames*(walkLevels-1),0,0);
      return part;
    });
    const localForward=Vector3.TransformNormal(g.forward,(people[0].root.parent as TransformNode).computeWorldMatrix(true).clone().invert()).normalize();
    let previous:Vector3|undefined,previousTime:number|undefined,blend=0,actionWeight=0,lastAction='inspect',phase=(i*.61803398875)%1;
    const facing=()=>Vector3.TransformNormal(localForward,root.computeWorldMatrix(true)).normalize();
    people.push({root,legs:[],role:'CrowdResident'+i,facing,setFacing(direction){
      const d=Vector3.TransformNormal(direction,(root.parent as TransformNode).computeWorldMatrix(true).clone().invert());
      root.rotationQuaternion=Quaternion.RotationAxis(Vector3.Up(),Math.atan2(d.x,d.z)-Math.atan2(localForward.x,localForward.z));
    },wristAngles:()=>[],handContactErrors:()=>[],update(time){
      const p=root.getAbsolutePosition();const distance=previous?Vector3.Distance(p,previous):0;
      const dt=previousTime===undefined?0:Math.max(0,Math.min(.2,time-previousTime));
      phase=(phase+distance/.85)%1;previous=p.clone();previousTime=time;
      blend+=(Math.min(1,dt>0?distance/dt/.55:0)-blend)*(1-Math.exp(-dt*9));
      const level=Math.round((1-blend)*(walkLevels-1));
      let frame=Math.floor((level===walkLevels-1?((time+i*.173)%4)/4:phase)*frames)+level*frames;
      const intent=root.metadata?.activity,active=actions.includes(intent==='deliver'?'inspect':intent)&&blend<.15;
      if(active)lastAction=intent==='deliver'?'inspect':intent;
      actionWeight+=((active?1:0)-actionWeight)*(1-Math.exp(-dt*4));
      const actionLevel=Math.round(actionWeight*actionLevels);
      if(actionLevel>0&&blend<.15)frame=frames*walkLevels+(actions.indexOf(lastAction)*actionLevels+actionLevel-1)*actionFrames+Math.floor(((time+i*.173)%4)/4*actionFrames);
      root.metadata.poseIntent=active?lastAction:'locomotion';
      const slot=g.slots.get(i)??-1,near=scene.activeCamera&&Vector3.DistanceSquared(p,scene.activeCamera.globalPosition)<20**2;
      root.metadata.poseInterpolated=false;
      if(slot>=0&&near){
        const idlePhase=((time+i*.173)%4)/4*frames,walkPhase=phase*frames;
        const wf=Math.floor(walkPhase),ifloor=Math.floor(idlePhase),wa=walkPhase-wf,ia=idlePhase-ifloor;
        const actionPhase=((time+i*.173)%4)/4*actionFrames,af=Math.floor(actionPhase),aa=actionPhase-af;
        const index=actions.indexOf(lastAction),base=frames*walkLevels+(index*actionLevels+actionLevels-1)*actionFrames;
        for(let k=0;k<g.matrixSize;k++){
          const walk=g.atlas[wf*g.matrixSize+k]*(1-wa)+g.atlas[((wf+1)%frames)*g.matrixSize+k]*wa;
          const idle=g.atlas[((walkLevels-1)*frames+ifloor)*g.matrixSize+k]*(1-ia)+g.atlas[((walkLevels-1)*frames+(ifloor+1)%frames)*g.matrixSize+k]*ia;
          const action=g.atlas[(base+af)*g.matrixSize+k]*(1-aa)+g.atlas[(base+(af+1)%actionFrames)*g.matrixSize+k]*aa;
          g.row[k]=(idle+(walk-idle)*blend)*(1-actionWeight)+action*actionWeight;
        }
        const texture=g.manager.texture!.getInternalTexture()!;frame=g.bakedRows+slot;
        (scene.getEngine() as ThinEngine).updateTextureData(texture,g.row,0,frame,(g.matrixSize/16)*4,1,0,0,false);
        root.metadata.poseInterpolated=true;
      }
      for(const part of parts){const settings=part.instancedBuffers.bakedVertexAnimationSettingsInstanced as Vector4;settings.set(frame,frame,0,0);}
    }});
  }
  let selectAfter=-Infinity;
  scene.onBeforeRenderObservable.add(()=>{
    const now=scene.metadata.characterActions?.time??0;if(now<selectAfter)return;selectAfter=now+.5;
    const camera=scene.activeCamera?.globalPosition;if(!camera)return;
    for(const [sex,g]of groups.entries()){
      const nearest=people.map((p,i)=>({i,d:Vector3.DistanceSquared(camera,p.root.getAbsolutePosition())})).filter(v=>v.i>=9&&v.i%2===sex&&v.d<20**2).sort((a,b)=>a.d-b.d).slice(0,prototypePairs.length);
      const kept=new Set(nearest.map(p=>p.i));for(const i of g.slots.keys())if(!kept.has(i))g.slots.delete(i);
      for(const {i}of nearest)if(!g.slots.has(i)){const used=new Set(g.slots.values());g.slots.set(i,[0,1,2].find(n=>!used.has(n))!);}
    }
  });
  scene.metadata.gpuCrowd={additional:population.total-9,total:population.total,poseAtlases:2,poseFrames:frames,actionFrames,actionLevels,actions,atlasRows:frames*walkLevels+actions.length*actionFrames*actionLevels+prototypePairs.length,transitionLevels:walkLevels,interpolationPrototype:{maximum:6,selection:"nearest three per sex",extraRowsPerSex:3},interpolationRadius:20,geometry:'original anatomy, shared instanced meshes',lodDistances:[8,20],nearGeometry:'original full detail',liveSkeletons:9,skeletonsBefore,skeletonsAfter:scene.skeletons.length};
  scene.onDisposeObservable.addOnce(()=>groups.forEach(g=>g.manager.dispose(true)));
}
