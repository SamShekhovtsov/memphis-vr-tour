import { PopulationZones, type PopulationZone } from './PopulationZones';
import {Scene,ShadowGenerator,Vector3} from '@babylonjs/core';
import type {HeroPerson} from './HeroPeople';
import {GroundContactIK} from './GroundContactIK';
import {DistrictNavigation} from './DistrictNavigation';
const angle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
export class DistrictLife {
 readonly zones:PopulationZones;readonly contacts:GroundContactIK[];private agents:{person:HeroPerson;heading:number;speed:number;wait:number;path:Vector3[];recent:number[];travel:number;pause:number;nextPose:number;stuck:number;zone:PopulationZone;pool:ReadonlySet<number>;allow:(x:number,z:number)=>boolean}[]=[];
 private shadows=new Map<number,{meshes:ReturnType<HeroPerson['root']['getChildMeshes']>;enabled:boolean}>();
 private previous?:number;private random:()=>number;private elapsed=0;
 readonly diagnostics={people:0,goals:0,pauses:0,blocked:0,minimumFacingDot:1,maxTurnPerSecond:0,poseRates:'9 live rigs; GPU residents, spatial neighbors and 4 path requests/frame',states:[] as object[]};
 constructor(private scene:Scene,private nav:DistrictNavigation,people:HeroPerson[]){
  let seed=1979;const deterministic=new URLSearchParams(location.search).has('qa');
  this.random=deterministic?()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
  this.zones=new PopulationZones(nav,people);
  this.contacts=people.map(p=>new GroundContactIK(p.root,p.legs,point=>{const h=nav.height(point.x,point.z);return h===undefined?undefined:{height:h,normal:Vector3.Up()};}));
  for(const [index,person]of people.entries()){
   this.zones.spawn(index,people,this.random);
   const p=person.root.getAbsolutePosition();if(!nav.walkable(p.x,p.z,.28)){const near=nav.nodes[nav.nearest(p)];person.root.setAbsolutePosition(near.add(new Vector3(0,.045,0)));}
   if(person.workPoint){const d=person.workPoint().subtract(person.root.getAbsolutePosition());d.y=0;if(d.lengthSquared()>1e-6)person.setFacing(d.normalize());}
   const face=person.facing();this.agents.push({person,heading:Math.atan2(face.x,face.z),speed:0,wait:person.workPoint?0:1+this.random()*4,path:[],recent:[],travel:0,pause:8+this.random()*22,nextPose:0,stuck:0,zone:this.zones.assignments[index],pool:this.zones.pool(index,p),allow:(x,z)=>this.zones.allows(index,x,z)});
  }
  for(const group of scene.animationGroups.filter(g=>g.name.startsWith('glbAnimatedStreetActors')))group.stop();
  const shadow=scene.getLightByName('lowGoldSun')?.getShadowGenerator();
  if(shadow instanceof ShadowGenerator)for(let i=3;i<people.length;i++){const meshes=people[i].root.getChildMeshes();this.shadows.set(i,{meshes,enabled:true});}
  this.diagnostics.people=people.length;scene.metadata.rendering.population=this.diagnostics;
 }
 update(time:number,poses=true){
  const dt=this.previous===undefined?0:Math.max(0,Math.min(.1,time-this.previous));this.previous=time;this.elapsed+=dt;
  const camera=this.scene.activeCamera?.globalPosition??Vector3.Zero();
  // Local neighbors replace quadratic all-pairs checks. Stale entries move at most 9 cm/frame.
  const buckets=new Map<string,typeof this.agents>();
  for(const agent of this.agents){const p=agent.person.root.getAbsolutePosition(),key=Math.floor(p.x/2)+','+Math.floor(p.z/2);const list=buckets.get(key)??[];list.push(agent);buckets.set(key,list);}
  const neighbors=(p:Vector3)=>{const result:typeof this.agents=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)result.push(...(buckets.get((Math.floor(p.x/2)+x)+','+(Math.floor(p.z/2)+z))??[]));return result;};
  let pathBudget=4;
  for(const [index,a]of this.agents.entries()){
   const {person}=a;let p=person.root.getAbsolutePosition().clone();
   person.root.metadata??={};
   const shadow=this.scene.getLightByName('lowGoldSun')?.getShadowGenerator(),cached=this.shadows.get(index);
   if(cached&&shadow instanceof ShadowGenerator){const distance=Vector3.Distance(p,camera),enabled=cached.enabled?distance<30:distance<24;if(enabled!==cached.enabled){for(const mesh of cached.meshes)enabled?shadow.addShadowCaster(mesh,false):shadow.removeShadowCaster(mesh,false);cached.enabled=enabled;}}
   if(person.workPoint&&dt>0){a.wait-=dt;a.pause-=dt;if(a.pause<=0){a.wait=1.5+this.random()*4;a.pause=6+this.random()*8;this.diagnostics.pauses++;}person.root.metadata.workActive=a.wait<=0;}
   if(!person.workPoint&&dt>0){
    a.wait-=dt;a.pause-=dt;
    if(a.wait<=0&&a.pause<=0){a.wait=1.5+this.random()*6;a.pause=8+this.random()*25;this.diagnostics.pauses++;person.root.metadata.gazeYaw=(this.random()-.5)*.6;}
    if(a.wait<=0&&!a.path.length&&pathBudget>0){
     pathBudget--;
     const goals=[...a.pool];
     for(let attempt=0;attempt<8;attempt++){const goal=goals[Math.floor(this.random()*goals.length)];if(a.recent.includes(goal)||Vector3.Distance(p,this.nav.nodes[goal])<3)continue;const path=this.nav.path(p,goal,a.pool,a.allow);if(path.length){a.path=path;a.recent.push(goal);if(a.recent.length>12)a.recent.shift();this.diagnostics.goals++;break;}}
     if(!a.path.length)a.wait=2+this.random()*3;
    }
    let desiredSpeed=0,turning=false;
    if(a.wait<=0&&a.path.length){
     let d=a.path[0].subtract(p);d.y=0;const distance=d.length();
     if(distance<.18){a.path.shift();if(!a.path.length)a.wait=2+this.random()*5;}
     else {
      const target=Math.atan2(d.x,d.z),turn=angle(target-a.heading),step=Math.max(-1.6*dt,Math.min(1.6*dt,turn));a.heading+=step;this.diagnostics.maxTurnPerSecond=Math.max(this.diagnostics.maxTurnPerSecond,Math.abs(step/dt));
      turning=Math.abs(turn)>=.35;
      if(!turning)desiredSpeed=Math.min(.65+index%3*.12,Math.sqrt(1.5*distance));
      const facing=new Vector3(Math.sin(a.heading),0,Math.cos(a.heading));
      for(const other of neighbors(p)){if(other===a)continue;const offset=other.person.root.getAbsolutePosition().subtract(p);offset.y=0;if(offset.length()<1.05&&Vector3.Dot(offset,facing)>.35*offset.length())desiredSpeed=0;}
      const observer=camera.subtract(p);observer.y=0;if(observer.length()<1.15&&Vector3.Dot(observer,facing)>0)desiredSpeed=0;
     }
    }
    if(a.wait<=0&&a.path.length&&desiredSpeed===0&&!turning)a.stuck+=dt;else a.stuck=0;
    if(a.stuck>1.5+(index%9)*.12){
     const side=new Vector3(Math.cos(a.heading),0,-Math.sin(a.heading)),back=new Vector3(-Math.sin(a.heading),0,-Math.cos(a.heading));
     const candidates=[p.add(side.scale(1.15)),p.subtract(side.scale(1.15)),p.add(back.scale(.9))];
     const detour=candidates.find(q=>this.nav.segment(p,q,.34,a.allow)&&neighbors(p).every(other=>other===a||Vector3.DistanceSquared(q,other.person.root.getAbsolutePosition())>=.85**2));
     // Replace a blocked intention, rather than indefinitely stacking stale detours.
     a.path=detour?[detour]:[];if(!detour)a.wait=.7+this.random();a.stuck=0;
    }
    a.speed+=Math.max(-1.1*dt,Math.min(.75*dt,desiredSpeed-a.speed));
    if(a.speed>.05)person.root.metadata.gazeYaw=0;
    person.setFacing(new Vector3(Math.sin(a.heading),0,Math.cos(a.heading)));
    const delta=new Vector3(Math.sin(a.heading),0,Math.cos(a.heading)).scale(a.speed*dt),next=p.add(delta);
    if(delta.lengthSquared()>1e-10){
     const occupied=neighbors(p).some(other=>{if(other===a)return false;const o=other.person.root.getAbsolutePosition();const after=(next.x-o.x)**2+(next.z-o.z)**2,before=(p.x-o.x)**2+(p.z-o.z)**2;return after<.65**2&&after<before;});
     if(!occupied&&this.nav.segment(p,next,.3,a.allow)){
      next.y=this.nav.height(next.x,next.z)!+.045;person.root.setAbsolutePosition(next);a.travel+=delta.length();this.diagnostics.minimumFacingDot=Math.min(this.diagnostics.minimumFacingDot,Vector3.Dot(person.facing(),delta.normalize()));
     }else{a.speed=0;a.path=[];a.wait=.5+this.random();this.diagnostics.blocked++;}
    }
   }
   if(poses&&(this.elapsed>=a.nextPose||this.previous===time&&this.elapsed===0)){
    this.contacts[index].restore();person.update(time);this.contacts[index].update(time);a.nextPose=this.elapsed+(!person.root.metadata?.gpuCrowd&&Vector3.Distance(p,camera)>35?1/15:0);
   }
  }
  this.diagnostics.states=this.agents.map(a=>({name:a.person.root.name,role:a.person.role,zone:a.zone,position:a.person.root.getAbsolutePosition().asArray(),speed:a.speed,waiting:a.wait>0,remainingWaypoints:a.path.length,travel:a.travel}));
 }
}
