(async()=>{
 const {scene,camera:c,navigation:nav,people,life}=window.memphisDistrictQA,V=c.position.constructor,checks=[];
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 const zones=life.zones,targets=zones.targets,count=()=>{const result={temple:0,street:0,route:0,free:0};for(const p of people){const v=p.root.getAbsolutePosition();result[zones.classify(v.x,v.z)]++;}return result;};
 check('Population reduced by thirty percent',people.length===126,people.length);
 check('Whole-person quotas use largest-remainder rounding',JSON.stringify(targets)===JSON.stringify({temple:51,street:50,route:19,free:6}),targets);
 check('Actual initial positions match all four quotas',JSON.stringify(count())===JSON.stringify(targets),count());
 let zoneViolations=0,collisions=0,minGap=Infinity,time=2;
 for(let f=0;f<1800;f++){
  time+=.1;life.update(time,f%30===0);
  people.forEach((p,i)=>{const v=p.root.getAbsolutePosition();if(zones.classify(v.x,v.z)!==zones.assignments[i])zoneViolations++;if(!nav.walkable(v.x,v.z,.27))collisions++;});
  if(f%10===0)for(let i=0;i<people.length;i++)for(let j=0;j<i;j++){const a=people[i].root.getAbsolutePosition(),b=people[j].root.getAbsolutePosition();minGap=Math.min(minGap,Math.hypot(a.x-b.x,a.z-b.z));}
  if(f%180===0)await new Promise(requestAnimationFrame);
 }
 check('Quotas remain exact after three simulated minutes',zoneViolations===0&&JSON.stringify(count())===JSON.stringify(targets),{zoneViolations,actual:count()});
 check('NPCs remain outside building collisions',collisions===0,collisions);
 check('Personal clearance retained',minGap>=.64,minGap);
 check('Natural facing and bounded turns',life.diagnostics.minimumFacingDot>.99&&life.diagnostics.maxTurnPerSecond<=1.601,{dot:life.diagnostics.minimumFacingDot,turn:life.diagnostics.maxTurnPerSecond});
 check('Residents travel or finish a committed local activity',life.diagnostics.states.filter(p=>p.role!=='StoneWorker').every(p=>p.travel>2||[...life.brains].some(([i,b])=>people[i].root.name===p.name&&b.completed>0)),life.diagnostics.states.filter(p=>p.role!=='StoneWorker'&&p.travel<=2));
 const worker=people.find(p=>p.role==='StoneWorker');let handSamples=0,maxHandError=0;
 for(let f=0;f<300;f++){time+=.05;life.update(time,true);const errors=worker.handContactErrors();handSamples+=errors.length;maxHandError=Math.max(maxHandError,...errors);if(f%60===0)await new Promise(requestAnimationFrame);}
 const wp=worker.workPoint(),rp=worker.root.getAbsolutePosition();
 check('Craftsman stays beside his original work block',Math.hypot(wp.x-rp.x,wp.z-rp.z)<1.2,{root:rp.asArray(),block:wp.asArray()});
 check('Working hand contacts remain settled',maxHandError<.025&&handSamples>10,{maxHandError,handSamples});
 const key=(code,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
 const frames=async n=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
 const walk=async(start,look,n,codes=['KeyW'])=>{
  window.dispatchEvent(new Event('blur'));c.position.copyFromFloats(...start);c.cameraDirection.setAll(0);c.setTarget(new V(...look));
  let maxY=c.position.y,minY=c.position.y,maxRise=0,previous=c.position.y;
  codes.forEach(code=>key(code,true));
  for(let i=0;i<n;i++){await frames(1);maxY=Math.max(maxY,c.position.y);minY=Math.min(minY,c.position.y);maxRise=Math.max(maxRise,c.position.y-previous);previous=c.position.y;}
  codes.forEach(code=>key(code,false));await frames(10);return {end:c.position.asArray(),maxY,minY,maxRise};
 };
 check('Real quay participates in support',Math.abs(nav.height(-33,-49)-.34)<.001,nav.height(-33,-49));
 check('Ramp support follows its slope',nav.height(-29.5,-33)>nav.height(-29.5,-40),[nav.height(-29.5,-40),nav.height(-29.5,-33)]);
 const quay=await walk([-28.8,1.7,-49],[-36,1.7,-49],75);
 check('Observer climbs existing 34 cm quay lip',quay.end[0]<-31&&quay.maxY>=2.02,quay);
 const down=await walk([-33,2.04,-49],[-26,2.04,-49],75);
 check('Observer steps back off quay without freezing',down.end[0]>-29&&down.end[1]>=1.69,down);
 const ramp=await walk([-29,1.7,-43],[-29,1.7,-30],100);
 check('Observer traverses the real tilted arrival ramp',ramp.end[2]>-34&&ramp.maxY>1.9,ramp);
 const fixtures=[],template=scene.getMeshByName('riverLandingQuay');
 const box=(name,x,y,z,width,height,depth)=>{const m=template.clone(name,null,true);m.position.set(x,y,z);m.rotation.setAll(0);m.scaling.set(width/7,height/.34,depth/17);m.isVisible=false;m.checkCollisions=true;m.computeWorldMatrix(true);fixtures.push(m);c.traversal.refresh();return m;};
 for(const height of [.20,.35]){
  const m=box('qa-visitor-step',30,height/2,0,4,height,2);
  const run=await walk([30,1.7,-2],[30,1.7,3],65);
  check('Automatic step up/down at '+height+' m',run.end[2]>1.5&&run.maxY>=1.7+height-.015&&run.minY>=1.69,run);
  check('Bounded smooth camera rise at '+height+' m',run.maxRise<=.145,run.maxRise);m.dispose(false,false);c.traversal.refresh();
 }
 const tall=box('qa-too-tall-step',30,.3,0,4,.6,2);
 const blocked=await walk([30,1.7,-2],[30,1.7,3],45);
 check('Tall obstacles remain solid',blocked.end[2]<-1.25&&blocked.maxY<1.8,blocked);tall.dispose(false,false);c.traversal.refresh();
 const low=box('qa-ceiling-step',30,.15,0,4,.3,2),ceiling=box('qa-low-ceiling',30,1.95,0,4,.1,3);
 const head=await walk([30,1.7,-2],[30,1.7,3],45);
 check('Step-up respects overhead clearance',head.end[2]<-1.25&&head.maxY<1.8,head);low.dispose(false,false);ceiling.dispose(false,false);c.traversal.refresh();
 const wall=box('qa-tall-sliding-wall',27.5,1.2,0,.3,2.4,12);
 const slide=await walk([28.3,1.7,-4],[28.3,1.7,8],50,['KeyW','KeyA']);
 check('Diagonal wall contact slides instead of freezing',slide.end[2]>-2.5&&slide.end[0]>27.85,slide);wall.dispose(false,false);c.traversal.refresh();
 const flight=await walk([-6,1.752,-15],[-6,15,-5],18,['KeyF','KeyW']);
 check('Held-F flight and grounded landing remain',flight.maxY>2.2&&Math.abs(flight.end[1]-nav.height(flight.end[0],flight.end[2])-1.7)<.02,flight);
 c.position.set(-6,-20,-15);await frames(3);check('Below-ground recovery remains safe',c.position.y>1.7,c.position.asArray());
 const footprints=scene.meshes.filter(m=>m.name.startsWith('houseCollision-')&&m.checkCollisions);
 check('All fourteen solid house footprints retained',footprints.length===14,footprints.length);
 for(const m of fixtures)if(!m.isDisposed())m.dispose(false,false);
 return {passed:checks.every(c=>c.passed),checks,counts:count(),targets,populationConfig:scene.metadata.populationZones,visitor:scene.metadata.visitorTraversal,simulationSeconds:180};
})()
