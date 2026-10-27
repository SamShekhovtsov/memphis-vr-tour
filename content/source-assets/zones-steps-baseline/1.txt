import { Mesh,MeshBuilder,Ray,Scene,Vector3 } from '@babylonjs/core';
import data from '../../../../content/scene-data/district-navigation.json';
export interface Rect {minX:number;maxX:number;minZ:number;maxZ:number;id?:string}
export function contains(r:Rect,x:number,z:number,pad=0){return x>r.minX-pad&&x<r.maxX+pad&&z>r.minZ-pad&&z<r.maxZ+pad;}
export class DistrictNavigation {
 readonly obstacles:Rect[]=[];readonly nodes:Vector3[]=[];readonly adjacency:number[][]=[];readonly step=1.5;
 private cells=new Map<string,number>();private floors:Mesh[];private support: (Rect&{height:number})[]=[];private buckets=new Map<string,Rect[]>();
 constructor(readonly scene:Scene,floors:Mesh[]){
  this.floors=floors;scene.meshes.forEach(m=>m.computeWorldMatrix(true));
  this.support=floors.map(m=>{const b=m.getBoundingInfo().boundingBox;return {minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z,height:b.maximumWorld.y};});
  for(const name of ['heroStreetLeftCollisionRail','heroStreetRightCollisionRail']){const old=scene.getMeshByName(name);if(old){old.checkCollisions=false;old.setEnabled(false);}}
  for(const h of data.houses){
   const mesh=MeshBuilder.CreateBox('houseCollision-'+h.id,{width:h.maxX-h.minX,height:h.height,depth:h.maxZ-h.minZ},scene);
   mesh.position.set((h.minX+h.maxX)/2,h.height/2,(h.minZ+h.maxZ)/2);mesh.isVisible=false;mesh.isPickable=false;mesh.checkCollisions=true;mesh.metadata={buildingFootprint:h.id};mesh.computeWorldMatrix(true);
  }
  for(const m of scene.meshes){
   if(!m.isEnabled()||floors.includes(m as Mesh))continue;
   const b=m.getBoundingInfo().boundingBox;
   if(m.checkCollisions&&b.maximumWorld.y>.4&&b.minimumWorld.y<2.1)this.obstacles.push({id:m.name,minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z});
  }
  for(const r of this.obstacles)for(let x=Math.floor((r.minX-.75)/8);x<=Math.floor((r.maxX+.75)/8);x++)for(let z=Math.floor((r.minZ-.75)/8);z<=Math.floor((r.maxZ+.75)/8);z++){const key=x+','+z;const list=this.buckets.get(key)??[];list.push(r);this.buckets.set(key,list);}
  for(let ix=0;ix<=53;ix++)for(let iz=0;iz<=110;iz++){
   const x=-36+ix*this.step,z=-69+iz*this.step;
   if(!this.walkable(x,z,.46))continue;
   this.cells.set(ix+','+iz,this.nodes.length);this.nodes.push(new Vector3(x,this.height(x,z)!,z));this.adjacency.push([]);
  }
  for(const [key,index] of this.cells){const [x,z]=key.split(',').map(Number);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const neighbor=this.cells.get((x+dx)+','+(z+dz));if(neighbor===undefined)continue;
   if(dx&&dz&&(!this.cells.has((x+dx)+','+z)||!this.cells.has(x+','+(z+dz))))continue;
   if(Math.abs(this.nodes[index].y-this.nodes[neighbor].y)<=.3&&this.segment(this.nodes[index],this.nodes[neighbor],.4))this.adjacency[index].push(neighbor);
  }}
  scene.metadata.districtNavigation={houses:data.houses.length,nodes:this.nodes.length,obstacles:this.obstacles.length,spawns:data.spawns};
 }
 height(x:number,z:number):number|undefined{
  let height:number|undefined;for(const r of this.support)if(contains(r,x,z))height=Math.max(height??-Infinity,r.height);
  if(height!==undefined&&x>=-10.705&&x<=-1.555&&z>=-37.8&&z<=30)height=Math.max(height,.052);
  return height;
 }
 walkable(x:number,z:number,radius=.32){return x>=-36.3&&x<=47.4&&this.height(x,z)!==undefined&&!(this.buckets.get(Math.floor(x/8)+','+Math.floor(z/8))??[]).some(r=>contains(r,x,z,Math.max(0,radius-.006)));}
 segment(a:Vector3,b:Vector3,radius=.32){const n=Math.ceil(Vector3.Distance(a,b)/.25);for(let i=0;i<=n;i++){const t=n?i/n:0;if(!this.walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,radius))return false;}return true;}
 nearest(p:Vector3){let best=-1,d=Infinity;this.nodes.forEach((n,i)=>{const v=(n.x-p.x)**2+(n.z-p.z)**2;if(v<d){d=v;best=i;}});return best;}
 path(from:Vector3,goal:number):Vector3[]{
  const start=this.nearest(from);if(start<0||goal<0)return [];
  const open=[start],cost=new Map([[start,0]]),parent=new Map<number,number>();const closed=new Set<number>();
  while(open.length){let pick=0,best=Infinity;for(let k=0;k<open.length;k++){const id=open[k],v=cost.get(id)!+Vector3.Distance(this.nodes[id],this.nodes[goal]);if(v<best){best=v;pick=k;}}
   const id=open.splice(pick,1)[0];if(id===goal){const ids=[id];while(ids[0]!==start)ids.unshift(parent.get(ids[0])!);const result:Vector3[]=[];let anchor=from;for(let i=1;i<ids.length;i++){const next=this.nodes[ids[i+1]??ids[i]];if(i===ids.length-1||!this.segment(anchor,next,.38)){const p=this.nodes[ids[i]].clone();result.push(p);anchor=p;}}return result;}
   closed.add(id);for(const next of this.adjacency[id]){if(closed.has(next))continue;const g=cost.get(id)!+Vector3.Distance(this.nodes[id],this.nodes[next]);if(g<(cost.get(next)??Infinity)){cost.set(next,g);parent.set(next,id);if(!open.includes(next))open.push(next);}}
  }return [];
 }
}
