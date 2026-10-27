import { Vector3 } from '@babylonjs/core';
import config from '../../../../content/scene-data/district-population.json';
import tour from '../../../../content/scene-data/memphis-white-walls.tour.json';
import type { DistrictNavigation } from './DistrictNavigation';
import type { HeroPerson } from './HeroPeople';
export type PopulationZone='temple'|'street'|'route'|'free';
export function populationQuotas(total:number):Record<PopulationZone,number>{
 const rows=config.zones.map((z,index)=>({id:z.id as PopulationZone,index,raw:total*z.weight/100,count:Math.floor(total*z.weight/100)}));
 const remaining=total-rows.reduce((n,r)=>n+r.count,0);
 for(const r of [...rows].sort((a,b)=>(b.raw-b.count)-(a.raw-a.count)||a.index-b.index).slice(0,remaining))r.count++;
 return Object.fromEntries(rows.map(r=>[r.id,r.count])) as Record<PopulationZone,number>;
}
/** Mutually exclusive world-space areas. Route overlap belongs to temple/street first. */
export class PopulationZones {
 readonly assignments:PopulationZone[]=[];readonly targets:Record<PopulationZone,number>;
 private component:Int32Array;
 private pools:{zone:PopulationZone;nodes:Set<number>}[]=[];
 private eligible=new Map<PopulationZone,number[]>();
 private points=tour.guidedRoute.waypoints.slice(0,tour.guidedRoute.waypoints.findIndex(p=>p.id==='ptah-main-gate-center')+1).map(p=>p.position);
 constructor(private nav:DistrictNavigation,people:HeroPerson[]){
  this.component=new Int32Array(nav.nodes.length).fill(-1);
  this.targets=populationQuotas(people.length);
  for(const z of config.zones)this.eligible.set(z.id as PopulationZone,[]);
  for(let start=0;start<nav.nodes.length;start++){
   if(this.component[start]!==-1)continue;
   const zone=this.classify(nav.nodes[start].x,nav.nodes[start].z),id=this.pools.length,ids=[start];this.component[start]=id;
   for(let cursor=0;cursor<ids.length;cursor++)for(const next of nav.adjacency[ids[cursor]]){
    const p=nav.nodes[next];if(this.component[next]!==-1||this.classify(p.x,p.z)!==zone||!nav.segment(nav.nodes[ids[cursor]],p,.38,(x,z)=>this.classify(x,z)===zone))continue;
    this.component[next]=id;ids.push(next);
   }
   this.pools.push({zone,nodes:new Set(ids)});
   if(ids.length>=12)this.eligible.get(zone)!.push(...ids);
  }
  const remaining={...this.targets};
  for(let i=0;i<people.length;i++){
   const p=people[i].root.getAbsolutePosition();
   const preferred=i<3?this.classify(p.x,p.z):undefined;
   const zone=preferred&&remaining[preferred]>0?preferred:(config.zones.find(z=>remaining[z.id as PopulationZone]>0)!.id as PopulationZone);
   this.assignments.push(zone);remaining[zone]--;
  }
  for(const [zone,count]of Object.entries(this.targets))if(count&&!this.eligible.get(zone as PopulationZone)?.length)throw Error('No connected population area for '+zone);
  nav.scene.metadata.populationZones={config,targets:this.targets,pools:Object.fromEntries([...this.eligible].map(([z,ids])=>[z,ids.length]))};
 }
 classify(x:number,z:number):PopulationZone{
  for(const area of config.zones){
   if('bounds'in area&&area.bounds){const b=area.bounds;if(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ)return area.id as PopulationZone;}
   if(area.id==='route'){
    for(let i=1;i<this.points.length;i++){
     const a=this.points[i-1],b=this.points[i],dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1)));
     if((x-a[0]-t*dx)**2+(z-a[2]-t*dz)**2<=area.corridorHalfWidth!**2)return 'route';
    }
   }
  }
  return 'free';
 }
 spawn(index:number,people:HeroPerson[],random:()=>number){
  const zone=this.assignments[index],original=people[index].root.getAbsolutePosition();
  if(index<3&&this.classify(original.x,original.z)===zone&&this.nav.walkable(original.x,original.z,.28))return;
  // The craftsman must remain beside his detached work block. Project an
  // obstructed original standing point locally instead of selecting a new job site.
  if(index<3&&this.classify(original.x,original.z)===zone){
   const candidates=[...this.eligible.get(zone)!].sort((a,b)=>Vector3.DistanceSquared(this.nav.nodes[a],original)-Vector3.DistanceSquared(this.nav.nodes[b],original));
   for(const id of candidates){const p=this.nav.nodes[id];if(people.slice(0,index).some(other=>{const q=other.root.getAbsolutePosition();return Math.hypot(p.x-q.x,p.z-q.z)<.95;}))continue;
    people[index].root.setAbsolutePosition(p.add(new Vector3(0,.045,0)));return;}
  }
  const ids=this.eligible.get(zone)!,offset=Math.floor(random()*ids.length),camera=this.nav.scene.activeCamera?.globalPosition;
  for(let n=0;n<ids.length;n++){
   const p=this.nav.nodes[ids[(offset+n*7919)%ids.length]];
   if(camera&&Math.hypot(p.x-camera.x,p.z-camera.z)<1.25)continue;
   if(people.slice(0,index).some(other=>{const q=other.root.getAbsolutePosition();return Math.hypot(p.x-q.x,p.z-q.z)<.95;}))continue;
   people[index].root.setAbsolutePosition(p.add(new Vector3(0,.045,0)));return;
  }
  throw Error('Population zone has insufficient personal space: '+zone);
 }
 pool(index:number,p:Vector3){
  const zone=this.assignments[index];let near=-1,best=Infinity;
  for(const id of this.eligible.get(zone)!){const n=this.nav.nodes[id],d=(n.x-p.x)**2+(n.z-p.z)**2;if(d<best){best=d;near=id;}}
  return this.pools[this.component[near]].nodes;
 }
 allows(index:number,x:number,z:number){return this.classify(x,z)===this.assignments[index];}
}
