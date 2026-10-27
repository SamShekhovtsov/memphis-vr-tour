(async()=>{const {life,scene}=window.memphisDistrictQA;let time=2;
 for(let f=0;f<1800;f++){time+=.1;life.update(time,false);}
 for(let f=0;f<30;f++){time+=1/30;life.update(time,true);await new Promise(requestAnimationFrame);}
 return {simulationSeconds:181,participants:life.brains.size,completed:[...life.brains.values()].reduce((n,b)=>n+b.completed,0),gpu:scene.metadata.gpuCrowd,poseTextures:scene.textures.filter(t=>t.name.startsWith('crowd-pose-atlas')).map(t=>({name:t.name,...t.getSize(),estimatedMiB:t.getSize().width*t.getSize().height*16/1048576})),camera:scene.activeCamera.position.asArray()};})()
