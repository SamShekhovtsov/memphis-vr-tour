(async()=>{const {people,camera}=window.memphisDistrictQA,p=people[2],V=camera.position.constructor;
 const foot=p.root.getAbsolutePosition(),target=foot.add(new V(0,1.39,0));camera.position.copyFrom(target.add(p.facing().scale(1.4)).add(new V(.17,.05,0)));camera.setTarget(target);camera.fov=.65;
 for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);
 return {name:p.root.name,root:foot.asArray(),camera:camera.position.asArray(),target:target.asArray(),fov:camera.fov};})()
