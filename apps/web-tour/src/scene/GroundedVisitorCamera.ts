import { UniversalCamera,Vector3,type ICameraInput } from '@babylonjs/core';
import type { DistrictNavigation } from './DistrictNavigation';
import { VisitorTraversal } from './VisitorTraversal';
/** Grounded desktop observer, automatic low steps, native wall sliding and held-F flight. */
export class GroundedVisitorCamera extends UniversalCamera {
 navigation?:DistrictNavigation;traversal?:VisitorTraversal;
 private input?:VisitorKeys;private safe?:Vector3;private feet?:number;private hold=0;private wasFlying=false;
 configureGrounding(nav:DistrictNavigation){
  this.navigation=nav;this.traversal=new VisitorTraversal(nav);this.applyGravity=false;this.checkCollisions=true;
  this.ellipsoid.set(.38,.85,.38);this.inputs.removeByType('FreeCameraKeyboardMoveInput');this.input=new VisitorKeys(this);this.inputs.add(this.input);
  nav.scene.metadata.visitorTraversal={maxStepMetres:this.traversal.maxStep,eyeHeight:1.7,automaticStep:true,wallSliding:true,flightKey:'Hold F'};
 }
 prepareWalk(delta:Vector3){
  const nav=this.navigation,t=this.traversal;if(!nav||!t)return;
  if(this.feet===undefined||this.wasFlying||Math.abs(this.position.y-(this.feet+1.7))>1.2)this.feet=nav.height(this.position.x,this.position.z)??0;
  const target=t.prepare(this.position,delta,this.feet);
  if(target===undefined){delta.setAll(0);return;}
  if(target>this.feet+.003){this.feet=target;this.hold=.25;}
  this.ellipsoidOffset.set(0,this.feet+1.708-this.position.y,0);
 }
 override _checkInputs(){
  super._checkInputs();const nav=this.navigation,t=this.traversal;if(!nav||!t)return;
  if(this.input?.flying){this.wasFlying=true;this.feet=undefined;this.ellipsoidOffset.setAll(0);return;}
  if(!this.input?.used&&new URLSearchParams(location.search).has('shot'))return;
  const dt=Math.min(.05,this.getEngine().getDeltaTime()/1000);
  const reference=this.feet??nav.height(this.position.x,this.position.z)??0;
  let support=t.support(this.position.x,this.position.z,reference);
  this.hold=Math.max(0,this.hold-dt);
  if(support!==undefined){
   if(this.hold>0&&this.feet!==undefined&&support<this.feet-.025)support=this.feet;
   else this.hold=0;
  }
  if(support!==undefined&&t.bodyClear(this.position.x,this.position.z,support)){
   this.feet=support;this.safe=new Vector3(this.position.x,support,this.position.z);
  }else{
   let p=this.safe;
   if(!p||!t.bodyClear(p.x,p.z,p.y)){
    let best=Infinity;for(const node of nav.nodes){const d=(node.x-this.position.x)**2+(node.z-this.position.z)**2;if(d<best&&t.bodyClear(node.x,node.z,node.y)){p=node;best=d;}}
   }
   if(p){this.position.x=p.x;this.position.z=p.z;this.feet=p.y;this.safe=p.clone();}
   this.hold=0;
  }
  const target=(this.feet??reference)+1.7;
  if(this.wasFlying||Math.abs(target-this.position.y)>1.0)this.position.y=target;
  else this.position.y+=Math.sign(target-this.position.y)*Math.min(Math.abs(target-this.position.y),dt*2.8);
  this.wasFlying=false;this.ellipsoidOffset.set(0,target+.008-this.position.y,0);this.cameraDirection.y=0;
 }
}
class VisitorKeys implements ICameraInput<GroundedVisitorCamera>{
 keys=new Set<string>();used=false;private forward=Vector3.Forward();
 constructor(public camera:GroundedVisitorCamera){}
 get flying(){return this.keys.has('KeyF');}
 getClassName(){return 'GroundedVisitorKeys';}getSimpleName(){return 'visitorKeyboard';}
 private down=(e:KeyboardEvent)=>{if(['Space','ControlLeft','ControlRight'].includes(e.code)&&!this.flying)return;if(e.code==='KeyF'&&(e.ctrlKey||e.metaKey||e.altKey))return;if((e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF','Space','ControlLeft','ControlRight'].includes(e.code)){this.keys.add(e.code);this.used=true;e.preventDefault();}};
 private up=(e:KeyboardEvent)=>{this.keys.delete(e.code);};private clear=()=>this.keys.clear();
 attachControl(){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.clear);document.addEventListener('visibilitychange',this.clear);}
 detachControl(){window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.clear);document.removeEventListener('visibilitychange',this.clear);this.clear();}
 checkInputs(){
  if(!this.used&&new URLSearchParams(location.search).has('shot'))return;
  const c=this.camera,dt=Math.min(.05,c.getEngine().getDeltaTime()/1000);let f=c.getForwardRay().direction.clone();
  const horizontal=new Vector3(f.x,0,f.z);if(horizontal.lengthSquared()>1e-6)this.forward=horizontal.normalize();if(!this.flying)f=this.forward.clone();
  const right=Vector3.Cross(Vector3.Up(),this.forward).normalize();const has=(...codes:string[])=>codes.some(k=>this.keys.has(k))?1:0;
  const d=f.scale(has('KeyW','ArrowUp')-has('KeyS','ArrowDown')).add(right.scale(has('KeyD','ArrowRight')-has('KeyA','ArrowLeft')));
  if(this.flying){d.y+=has('Space')-has('ControlLeft','ControlRight');c.ellipsoidOffset.setAll(0);}
  if(d.lengthSquared()>1)d.normalize();d.scaleInPlace(dt*(this.flying?5:2.2));
  if(!this.flying)c.prepareWalk(d);
  c.cameraDirection.copyFrom(d);
 }
}
