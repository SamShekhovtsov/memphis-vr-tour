import { AbstractMesh, Ray, Vector3 } from '@babylonjs/core';
import type { DistrictNavigation } from './DistrictNavigation';

/** Step support is actual collision geometry, never a raised whole-district floor. */
export class VisitorTraversal {
 readonly maxStep=.38;readonly eyeHeight=1.7;
 private meshes:AbstractMesh[]=[];
 constructor(private nav:DistrictNavigation){
  this.refresh();let queued=false;
  nav.scene.onNewMeshAddedObservable.add(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!nav.scene.isDisposed)this.refresh();});});
 }
 refresh(){this.meshes=this.nav.scene.meshes.filter(m=>m.isEnabled()&&m.checkCollisions);}
 private nearby(x:number,z:number,pad=0){return this.meshes.filter(m=>{
  if(m.isDisposed()||!m.isEnabled()||!m.checkCollisions)return false;
  const b=m.getBoundingInfo().boundingBox;return x>=b.minimumWorld.x-pad&&x<=b.maximumWorld.x+pad&&z>=b.minimumWorld.z-pad&&z<=b.maximumWorld.z+pad;
 });}
 support(x:number,z:number,feet:number,radius=.38):number|undefined{
  const centre=this.pointSupport(x,z,feet);if(centre===undefined)return undefined;
  let height=centre;
  if(radius>0)for(const [dx,dz]of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.7,radius*.7],[-radius*.7,radius*.7],[radius*.7,-radius*.7],[-radius*.7,-radius*.7]]){
   const y=this.pointSupport(x+dx,z+dz,feet);if(y!==undefined)height=Math.max(height,y);
  }
  return height;
 }
 private pointSupport(x:number,z:number,feet:number){
  if(x< -36.3||x>47.4)return undefined;
  const base=this.nav.height(x,z);if(base===undefined)return undefined;
  let height=base;
  const ray=new Ray(new Vector3(x,feet+this.maxStep+.025,z),Vector3.Down(),Math.max(4,feet-base+this.maxStep+.1));
  for(const mesh of this.nearby(x,z)){
   const hit=ray.intersectsMesh(mesh,false);if(!hit.hit||!hit.pickedPoint)continue;
   const normal=hit.getNormal(true);if(!normal||normal.y<.70)continue;
   const y=hit.pickedPoint.y;if(y<=feet+this.maxStep+.002&&y>height)height=y;
  }
  return height<=feet+this.maxStep+.002?height:undefined;
 }
 clearHead(x:number,z:number,feet:number){
  for(const [dx,dz]of [[0,0],[.32,0],[-.32,0],[0,.32],[0,-.32]]){
   const ray=new Ray(new Vector3(x+dx,feet+.04,z+dz),Vector3.Up(),this.eyeHeight-.04);
   for(const mesh of this.nearby(x+dx,z+dz)){
    const b=mesh.getBoundingInfo().boundingBox;
    if(b.maximumWorld.y<=feet+.025||b.minimumWorld.y>=feet+this.eyeHeight)continue;
    const hit=ray.intersectsMesh(mesh,false);if(hit.hit)return false;
   }
  }
  return true;
 }
 /** Probe the leading edge before the capsule reaches the riser. */
 prepare(position:Vector3,delta:Vector3,feet:number){
  const next=position.add(delta),direct=this.support(next.x,next.z,feet);
  if(direct===undefined)return undefined;
  let target=direct;
  const length=Math.hypot(delta.x,delta.z);
  if(length>1e-7){
   const ahead=this.support(next.x+delta.x/length*.40,next.z+delta.z/length*.40,feet,0);
   if(ahead!==undefined&&ahead>target)target=ahead;
  }
  if(target>feet+.003&&(!this.clearHead(position.x,position.z,target)||!this.clearHead(next.x,next.z,target)))return undefined;
  return target;
 }
 /** True geometric footprint/height prevents wall recovery from teleporting indoors. */
 bodyClear(x:number,z:number,feet:number){
  return !this.nearby(x,z,.35).some(mesh=>{
   const b=mesh.getBoundingInfo().boundingBox;
   if(b.maximumWorld.y<=feet+.025||b.minimumWorld.y>=feet+this.eyeHeight-.02)return false;
   // Low geometry is resolved by the swept capsule/step probe. Its broad AABB
   // (notably a tilted ramp's high end) must not reject the entire footprint.
   if(b.maximumWorld.y<=feet+this.maxStep+.002)return false;
   const surface=new Ray(new Vector3(x,feet+.025,z),Vector3.Down(),.06).intersectsMesh(mesh,false);
   if(surface.hit&&(surface.getNormal(true)?.y??0)>.70)return false;
   const nx=Math.max(b.minimumWorld.x,Math.min(b.maximumWorld.x,x)),nz=Math.max(b.minimumWorld.z,Math.min(b.maximumWorld.z,z));
   return (x-nx)**2+(z-nz)**2<.34**2;
  });
 }
}
