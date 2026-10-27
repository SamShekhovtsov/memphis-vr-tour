(async()=>{
 const {scene,people,life,navigation:nav}=window.memphisDistrictQA,checks=[];
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 check('126 residents and 63 purposeful participants',people.length===126&&life.brains.size===63,{population:people.length,participants:life.brains.size});
 check('Every purposeful resident has reachable activities',[...life.brains.values()].every(b=>b.candidates.length>=2),[...life.brains.values()].map(b=>({id:b.profile.id,candidates:b.candidates.length})));
 let time=2,violations=0,collisions=0,minGap=Infinity,actionSamples=0,queueSamples=0,brainMs=0;
 const actions={},last=new Map(),earlyEnds=[];
 for(let f=0;f<6000;f++){
  time+=.1;const start=performance.now();life.update(time,f%20===0);brainMs+=performance.now()-start;
  for(const [i,b]of life.brains){
   const p=people[i].root.getAbsolutePosition();if(!life.zones.allows(i,p.x,p.z))violations++;if(!nav.walkable(p.x,p.z,.27))collisions++;
   if(b.stage==='act'){actionSamples++;actions[b.intent]=(actions[b.intent]??0)+1;}
   if(b.target&&life.coordination.queued(b.target,b.profile.id))queueSamples++;
   const before=last.get(i);if(before?.stage==='act'&&b.completed>before.completed&&life.elapsed<before.end-.2)earlyEnds.push(i);
   last.set(i,{stage:b.stage,completed:b.completed,end:b.actionUntil});
  }
  if(f%10===0)for(let i=0;i<people.length;i++)for(let j=0;j<i;j++){const a=people[i].root.getAbsolutePosition(),b=people[j].root.getAbsolutePosition();minGap=Math.min(minGap,Math.hypot(a.x-b.x,a.z-b.z));}
  if(f%300===0)await new Promise(requestAnimationFrame);
 }
 const tasks=[...life.brains].map(([i,b])=>({index:i,id:b.profile.id,zone:b.profile.zone,role:b.profile.occupation,completed:b.completed,failed:b.failed,stage:b.stage,target:b.target?.id,candidates:b.candidates.length,position:people[i].root.getAbsolutePosition().asArray()}));
 check('At least 90% complete meaningful tasks within ten minutes',tasks.filter(b=>b.completed>0).length>=57,tasks.filter(b=>b.completed===0));
 check('No zone or building violations',violations===0&&collisions===0,{violations,collisions});
 check('65 cm personal clearance retained',minGap>=.64,minGap);
 check('No early action completion',earlyEnds.length===0,earlyEnds);
 check('No backward locomotion or abrupt body reversals',life.diagnostics.minimumFacingDot>.99&&life.diagnostics.maxTurnPerSecond<=1.601,{dot:life.diagnostics.minimumFacingDot,turn:life.diagnostics.maxTurnPerSecond});
 check('Intent animation shared across GPU residents',scene.metadata.gpuCrowd.actions?.length===4&&scene.metadata.gpuCrowd.liveSkeletons===9,scene.metadata.gpuCrowd);
 check('Activity variation and paired conversations observed',Object.keys(actions).length>=3&&life.coordination.conversations>0,{actions,conversations:life.coordination.conversations,queueSamples,promotions:life.coordination.promotions});
 return {passed:checks.every(c=>c.passed),checks,tasks,actionSamples,averageLifeUpdateMs:brainMs/6000,brainTiming:life.brainTiming,elapsed:life.elapsed};
})()
