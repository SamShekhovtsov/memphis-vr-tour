import authored from '../../../../content/scene-data/hero-street.anchors-lock.json';
import {Ray,Scene,Vector3} from '@babylonjs/core';
import type {ActivityStation} from './ResidentActivities';
/** Cache real static triangle hits. Unsupported/unreachable objects get an
 * observation gesture, never a fabricated contact or an extended arm hold. */
export function characterContactTargets(scene:Scene){
 const cache=new Map<string,Vector3|null>();
 return (station:ActivityStation|undefined,shoulder:Vector3,reach:number)=>{
  if(!station||!['work','rest','deliver'].includes(station.kind))return undefined;
  if(!cache.has(station.id)){
   const anchor=authored.anchors.find(a=>a.name===station.anchor),mesh=scene.getMeshByName(station.anchor);
   const center=anchor?new Vector3(-anchor.matrix[3]-16.5,anchor.matrix[11],-anchor.matrix[7]):mesh?.getBoundingInfo().boundingBox.centerWorld.clone();
   let point:Vector3|null=null;
   if(center){
    // Probe the edge nearest the already locked standing point, then the center.
    const toward=station.point.subtract(center);toward.y=0;if(toward.lengthSquared()>0)toward.normalize();
    for(const offset of [.28,.12,0]){
     const origin=center.add(toward.scale(offset)).add(new Vector3(0,1.25,0));
     const hit=scene.pickWithRay(new Ray(origin,Vector3.Down(),2.5),m=>m.isEnabled()&&m.isVisible&&m.visibility>.01&&!/heroPerson|crowd-|shadow|collision|human|actor/i.test(m.name));
     if(hit?.pickedPoint&&hit.getNormal(true)?.y!>.5&&hit.pickedPoint.y>.27&&hit.pickedPoint.y<1.5){point=hit.pickedPoint.clone();break;}
    }
   }
   cache.set(station.id,point);
   if(scene.metadata?.characterActions){scene.metadata.characterActions.targets??=[];scene.metadata.characterActions.targets.push({id:station.id,anchor:station.anchor,point:point?.asArray()??null});}
  }
  const point=cache.get(station.id);return point&&Vector3.Distance(shoulder,point)<reach*.98+.055?point:undefined;
 };
}
