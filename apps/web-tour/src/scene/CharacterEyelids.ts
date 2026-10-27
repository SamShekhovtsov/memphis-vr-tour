import {MaterialPluginBase,Mesh,PBRMaterial,Scene,UniformBuffer,AbstractEngine,SubMesh} from '@babylonjs/core';
const installed=new WeakSet<PBRMaterial>();
/** Close the existing skin eyelid rims over the original eyes. No transparent
 * overlay, extra draw, texture, eye scaling or replacement eyeball is used. */
class EyelidPlugin extends MaterialPluginBase {
 constructor(material:PBRMaterial,readonly eye:[number,number,number,number]){
  super(material,'CharacterEyelids',210,{},true,false);this.registerForExtraEvents=true;this._enable(true);
 }
 getAttributes(attributes:string[]){attributes.push('characterBlinkSeed');}
 getUniforms(){return {ubo:[{name:'characterLidClock',size:2,type:'vec2'}],vertex:'uniform vec2 characterLidClock;'};}
 hardBindForSubMesh(buffer:UniformBuffer,scene:Scene,_engine:AbstractEngine,subMesh:SubMesh){buffer.updateFloat2('characterLidClock',scene.metadata.characterActions?.time??0,subMesh.getRenderingMesh().metadata?.characterSeed??0);}
 getCustomCode(type:string){
  if(type!=='vertex')return null;
  const [x,y,z,r]=this.eye??[.03,1.7,.1,.01];
  return {CUSTOM_VERTEX_DEFINITIONS:`
   #ifdef INSTANCES
   attribute float characterBlinkSeed;
   #endif
   float lidEase(float t){t=clamp(t,0.0,1.0);return t*t*t*(10.0+t*(-15.0+6.0*t));}
  `,CUSTOM_VERTEX_UPDATE_POSITION:`
   float lidSeed=characterLidClock.y;
   #ifdef INSTANCES
   lidSeed=characterBlinkSeed;
   #endif
   float lidTime=mod(characterLidClock.x+lidSeed*.617,4.1+mod(lidSeed,7.0)*.37);
   float lidBlink=lidTime<.075?lidEase(lidTime/.075):(lidTime<.11?1.0:1.0-lidEase((lidTime-.11)/.14));
   float lidX=abs(abs(positionUpdated.x)-${x.toFixed(8)});
   float lidY=positionUpdated.y-${y.toFixed(8)};
   float lidMask=(1.0-smoothstep(${(r*.72).toFixed(8)},${(r*1.38).toFixed(8)},lidX))*(1.0-smoothstep(${(r*.75).toFixed(8)},${(r*1.65).toFixed(8)},abs(lidY)))*smoothstep(${(z-.005).toFixed(8)},${(z+.004).toFixed(8)},positionUpdated.z);
   positionUpdated.y+=lidBlink*lidMask*(lidY>0.0?-1.0:1.0)*(min(abs(lidY),${(r*.72).toFixed(8)})+${(r*.08).toFixed(8)});
   positionUpdated.z+=lidBlink*lidMask*max(0.0,${(z+r*1.02).toFixed(8)}-positionUpdated.z);
  `};
 }
}
export function bindCharacterEyelids(mesh:Mesh,seed:number){
 if(!(mesh.material instanceof PBRMaterial)||mesh.material.metadata?.family!=='skin')return;
 mesh.metadata={...mesh.metadata,characterSeed:seed};if(installed.has(mesh.material))return;
 const eyes=mesh.parent?.parent?.getChildMeshes().find(m=>m.name.endsWith('high-poly')) as Mesh|undefined;
 const positions=eyes?.getVerticesData('position');if(!positions)return;
 const points:number[][]=[];for(let i=0;i<positions.length;i+=3)if(positions[i]>0)points.push([positions[i],positions[i+1],positions[i+2]]);
 if(!points.length)return;
 const lo=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));
 const center=lo.map((n,k)=>(n+hi[k])*.5);new EyelidPlugin(mesh.material,[center[0],center[1],center[2],(hi[0]-lo[0])*.5]);installed.add(mesh.material);
 mesh.getScene().metadata.characterActions.eyelids??=[];mesh.getScene().metadata.characterActions.eyelids.push({material:mesh.material.name,center,radius:(hi[0]-lo[0])*.5});
}
