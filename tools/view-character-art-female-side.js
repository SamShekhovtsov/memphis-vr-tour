(async()=>{const {people,camera,scene}=window.memphisDistrictQA,p=people[3],V=camera.position.constructor;
 const foot=p.root.getAbsolutePosition(),target=foot.add(new V(0,1.23,0));camera.position.copyFrom(target.add(V.Cross(new V(0,1,0),p.facing()).scale(1.4)).add(p.facing().scale(.17)).add(new V(0,.05,0)));camera.setTarget(target);camera.fov=.65;
 for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);
 return {name:p.root.name,root:foot.asArray(),camera:camera.position.asArray(),target:target.asArray(),fov:camera.fov};})()
