import { Vector3 } from '@babylonjs/core';
import type { DistrictNavigation } from './DistrictNavigation';
import type { PopulationZones, PopulationZone } from './PopulationZones';
export type ActivityKind='inspect'|'work'|'rest'|'socialize'|'deliver';
export interface ActivityStation {
 readonly id:string; readonly kind:ActivityKind; readonly zone:PopulationZone;
 readonly node:number; readonly point:Vector3; readonly face:Vector3;
 readonly anchor:string; readonly capacity:1; readonly duration:number;
}
/** Scene-derived affordances. No decorative geometry or collider is added/moved.
 * Every standing point is a supported navigation node; path checks still apply. */
export function buildActivityStations(nav:DistrictNavigation,zones:PopulationZones):ActivityStation[]{
 const result:ActivityStation[]=[],used=new Set<number>();
 const anchors=nav.scene.meshes.filter(m=>m.isEnabled()&&m.isVisible&&!/human|person|crowd|collision|shadow|lod/i.test(m.name)&&/table|jar|offering|canopy|cloth|bench|pillar|pier/i.test(m.name));
 for(const mesh of anchors){
  mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox,center=b.centerWorld;
  if(b.maximumWorld.y>4||b.maximumWorld.y<.15)continue;
  const kind:ActivityKind=/table/i.test(mesh.name)?'work':/jar/i.test(mesh.name)?'deliver':/cloth|canopy|bench/i.test(mesh.name)?'rest':'inspect';
  const candidates=nav.nodes.map((p,node)=>({p,node,d:Math.hypot(p.x-center.x,p.z-center.z)})).filter(v=>v.d>=.7&&v.d<2.8&&!used.has(v.node)).sort((a,b)=>a.d-b.d);
  const found=candidates.find(({p})=>nav.walkable(p.x,p.z,.46));if(!found)continue;
  const {p,node}=found,face=center.subtract(p);face.y=0;face.normalize();
  result.push({id:`object-${mesh.uniqueId}`,kind,zone:zones.classify(p.x,p.z),node,point:p.clone(),face,anchor:mesh.name,capacity:1,duration:kind==='work'?24:kind==='rest'?20:10});used.add(node);
 }
 // Courtyard observation, road pauses and conversation places are valid even
 // when a GLB groups its props into a single chunk without semantic mesh names.
 for(let node=0;node<nav.nodes.length;node++){
  const p=nav.nodes[node];if(used.has(node)||node%11!==0)continue;
  if(result.some(s=>Vector3.DistanceSquared(s.point,p)<2.8**2))continue;
  const zone=zones.classify(p.x,p.z),kind:ActivityKind=node%3===0?'socialize':zone==='temple'?'inspect':'rest';
  const face=zone==='temple'?new Vector3(-p.x,0,89-p.z).normalize():new Vector3(0,0,1);
  result.push({id:`place-${node}`,kind,zone,node,point:p.clone(),face,anchor:zone==='temple'?'existing Ptah courtyard':'existing district ground',capacity:1,duration:kind==='rest'?18:12});used.add(node);
 }
 return result;
}
