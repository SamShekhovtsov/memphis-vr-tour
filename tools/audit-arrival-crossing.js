(async()=>{
 const {camera:c,navigation:nav}=window.memphisDistrictQA,V=c.position.constructor;
 c.position.set(-30,1.7,-50);c.cameraDirection.setAll(0);c.setTarget(new V(-36,1.7,-50));
 const start=c.position.clone();let maxEyeHeight=c.position.y;
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
 for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);maxEyeHeight=Math.max(maxEyeHeight,c.position.y);}
 window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
 return {start:start.asArray(),end:c.position.asArray(),supportAtQuay:nav.height(-33,-49),maxEyeHeight,blockedAtQuay:Math.abs(c.position.x-start.x)<.6,quayHeight:.34};
})()
