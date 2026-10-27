import { UniversalCamera,Vector3,type ICameraInput } from '@babylonjs/core';
import type { DistrictNavigation } from './DistrictNavigation';
/** Desktop observer: horizontal walking, safe support, held-F collision-aware flight. */
export class GroundedVisitorCamera extends UniversalCamera {
 navigation?:DistrictNavigation;private input?:VisitorKeys;private safe?:Vector3;
 configureGrounding(nav:DistrictNavigation){this.navigation=nav;this.applyGravity=false;this.checkCollisions=true;this.ellipsoid.set(.38,.85,.38);this.inputs.removeByType('FreeCameraKeyboardMoveInput');this.input=new VisitorKeys(this);this.inputs.add(this.input);}
 override _checkInputs(){
  super._checkInputs();const nav=this.navigation;if(!nav||this.input?.flying)return;
  if(!this.input?.used&&new URLSearchParams(location.search).has('shot'))return;
  if(nav.walkable(this.position.x,this.position.z,.38)){
   this.position.y=nav.height(this.position.x,this.position.z)!+1.7;this.safe=this.position.clone();
  }else{
   const index=nav.nearest(this.safe??this.position);const p=this.safe??nav.nodes[index];if(p)this.position.set(p.x,nav.height(p.x,p.z)!+1.7,p.z);
  }
  this.cameraDirection.y=0;
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
  if(this.flying)d.y+=has('Space')-has('ControlLeft','ControlRight');
  if(d.lengthSquared()>1)d.normalize();d.scaleInPlace(dt*(this.flying?5:2.2));
  if(!this.flying&&c.navigation){const next=c.position.add(d);if(!c.navigation.segment(c.position,next,.38))d.setAll(0);else{const y=c.navigation.height(next.x,next.z)!+1.7;if(y>c.position.y&&y-c.position.y<=.31)c.position.y=y;}}
  c.cameraDirection.copyFrom(d);
 }
}
