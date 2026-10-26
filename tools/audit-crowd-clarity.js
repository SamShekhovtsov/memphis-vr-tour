(async()=>{
 const {scene,people,navigation:nav,life,camera}=window.memphisDistrictQA,checks=[];
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 check('Exactly twenty times the former population',people.length===180,people.length);
 const crowd=people.filter(p=>p.root.metadata?.gpuCrowd);
 check('171 added residents use GPU instances',crowd.length===171&&crowd.every(p=>[4,5].includes(p.root.getChildMeshes().length)&&p.root.getChildMeshes().every(m=>!!m.sourceMesh)),crowd.length);
 check('Two shared pose atlases, no per-resident skeleton clones',scene.textures.filter(t=>t.name.startsWith('crowd-pose-atlas-')).length===2&&scene.metadata.gpuCrowd.skeletonsBefore===scene.metadata.gpuCrowd.skeletonsAfter,scene.skeletons.length);
 check('Pose atlases retain exact nearest sampling',scene.textures.filter(t=>t.name.startsWith('crowd-pose-atlas-')).every(t=>t.samplingMode===1));
 check('All residents begin on walkable ground',people.every(p=>{const v=p.root.getAbsolutePosition();return nav.walkable(v.x,v.z,.28)&&(!p.root.metadata?.gpuCrowd||Math.abs(v.y-nav.height(v.x,v.z)-.045)<.01);}));
 check('Native instancing is active, without reflected-instance fallback',crowd.every(p=>p.root.getChildMeshes().every(m=>!m._internalAbstractMeshDataInfo._actAsRegularMesh)));
 check('Two real LOD replacements per crowd mesh',crowd.every(p=>p.root.getChildMeshes().every(m=>m.sourceMesh.getLODLevels().length===2&&m.sourceMesh.getLODLevels().every(l=>!!l.mesh))));
 check('Ground albedo uses 8x oblique filtering',scene.textures.filter(t=>/\/hero-ground\/ground-albedo\./.test(t.url??'')).every(t=>t.anisotropicFilteringLevel===8));
 check('Original houses remain solid',scene.meshes.filter(m=>m.name.startsWith('houseCollision-')&&m.checkCollisions).length===14);
 const source= camera._postProcesses.filter(Boolean).find(p=>p.name==='fxaa')?.getEffect()?.fragmentSourceCode??'';
 check('Line-preserving AA shader compiled',source.includes('fxaaQualitySubpix=0.50')&&source.includes('0.12*(lumaM'));
 check('No separate sharpening pass or supersampling',!camera._postProcesses.filter(Boolean).some(p=>p.name==='sharpen')&&scene.getEngine().getHardwareScalingLevel()===1);
 let time=2,moved=new Set(),framesChanged=0,previous=crowd[0].root.getChildMeshes()[0].instancedBuffers.bakedVertexAnimationSettingsInstanced.x;
 for(let frame=0;frame<600;frame++){
  time+=1/30;life.update(time);
  for(const p of people){const v=p.root.getAbsolutePosition();if(!nav.walkable(v.x,v.z,.28)||(p.root.metadata?.gpuCrowd&&Math.abs(v.y-nav.height(v.x,v.z)-.045)>.01))throw Error('Resident left navigation support: '+p.role);}
  for(const a of life.diagnostics.states)if(a.travel>.1)moved.add(a.name);
  const value=crowd[0].root.getChildMeshes()[0].instancedBuffers.bakedVertexAnimationSettingsInstanced.x;if(value!==previous)framesChanged++;previous=value;
  if(frame%60===0)await new Promise(requestAnimationFrame);
 }
 check('Most residents move during twenty simulated seconds',moved.size>=140,moved.size);
 check('GPU animation frames change with locomotion',framesChanged>20,framesChanged);
 check('People face travel direction',life.diagnostics.minimumFacingDot>.99,life.diagnostics.minimumFacingDot);
 check('Turns stay bounded',life.diagnostics.maxTurnPerSecond<=1.601,life.diagnostics.maxTurnPerSecond);
 check('All positions remain on walkable support after movement',true);
 let gap=Infinity;for(let i=0;i<people.length;i++)for(let j=0;j<i;j++){const a=people[i].root.getAbsolutePosition(),b=people[j].root.getAbsolutePosition();gap=Math.min(gap,Math.hypot(a.x-b.x,a.z-b.z));}
 check('Residents maintain personal clearance',gap>=.64,gap);
 return {passed:checks.every(c=>c.passed),checks,gpuCrowd:scene.metadata.gpuCrowd,rendering:scene.metadata.rendering.imageQuality};
})()
