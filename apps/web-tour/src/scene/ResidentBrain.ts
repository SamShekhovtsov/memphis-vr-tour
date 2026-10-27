import type { Vector3 } from '@babylonjs/core';
import type { ResidentProfile } from './ResidentProfiles';
import { residentRandom } from './ResidentProfiles';
import type { ActivityStation } from './ResidentActivities';
export type TaskStage='choose'|'travel'|'align'|'act'|'cooldown';
/** Small utility selector + explicit committed task sequence, without inference.
 * choose -> travel -> align -> act -> cooldown; only failure/timeouts interrupt. */
export class ResidentBrain {
 readonly random:()=>number; readonly candidates:ActivityStation[];
 stage:TaskStage='choose'; target?:ActivityStation; actionUntil=0; nextDecision=0;
 completed=0; failed=0; decisions=0; started=0; readonly recent:string[]=[];
 private previous=0; private retryAt=0;
 constructor(readonly profile:ResidentProfile,stations:ActivityStation[],pool:ReadonlySet<number>){
  this.random=residentRandom(profile.seed);this.candidates=stations.filter(s=>s.zone===profile.zone&&pool.has(s.node));
 }
 available(_station:ActivityStation,_now:number){return true;}
 acquire(_station:ActivityStation,_now:number){return true;}
 release(){}
 score(s:ActivityStation,p:Vector3){
  const a=this.profile,work=(a.occupation==='artisan'&&s.kind==='work')||(a.occupation==='porter'&&s.kind==='deliver')||(a.occupation==='attendant'&&s.kind==='inspect');
  return (work?1+a.diligence:0)+(s.kind==='rest'?a.fatigue*3:0)+(s.kind==='deliver'?a.thirst:0)+(s.kind==='socialize'?a.socialNeed*2+a.sociability:0)+(s.kind==='inspect'&&a.occupation==='visitor'?1:0)-Math.hypot(s.point.x-p.x,s.point.z-p.z)*.025-(this.recent.includes(s.id)?2:0)+this.random()*.3;
 }
 tick(now:number,p:Vector3,facingDot:number){
  const dt=this.previous?Math.max(0,Math.min(2,now-this.previous)):0;this.previous=now;
  const a=this.profile;a.fatigue=Math.min(1,a.fatigue+dt*.0018);a.thirst=Math.min(1,a.thirst+dt*.001);a.socialNeed=Math.min(1,a.socialNeed+dt*.0015);
  if(this.target&&now-this.started>100){this.abort(now);return;}
  if(this.stage==='travel'&&this.target&&Math.hypot(p.x-this.target.point.x,p.z-this.target.point.z)<.24)this.stage='align';
  if(this.stage==='align'&&facingDot>.985){this.stage='act';this.actionUntil=now+this.target!.duration*(.8+a.patience/40);}
  if(this.stage==='act'&&now>=this.actionUntil){
   const kind=this.target!.kind;if(kind==='rest')a.fatigue=Math.max(0,a.fatigue-.65);if(kind==='deliver')a.thirst=Math.max(0,a.thirst-.4);if(kind==='socialize')a.socialNeed=Math.max(0,a.socialNeed-.6);
   this.completed++;this.recent.push(this.target!.id);if(this.recent.length>5)this.recent.shift();this.release();this.target=undefined;this.stage='cooldown';this.retryAt=now+2+this.random()*3;
  }
  if(this.stage==='cooldown'&&now>=this.retryAt)this.stage='choose';
  if(this.stage!=='choose'||now<this.nextDecision)return;
  this.decisions++;this.nextDecision=now+.5+this.random()*.5;
  let best:ActivityStation|undefined,score=-Infinity;
  for(const s of this.candidates){if(!this.available(s,now))continue;const value=this.score(s,p);if(value>score){score=value;best=s;}}
  if(best&&this.acquire(best,now)){this.target=best;this.stage='travel';this.started=now;}
 }
 abort(now:number){this.release();this.failed++;if(this.target){this.recent.push(this.target.id);if(this.recent.length>5)this.recent.shift();}this.target=undefined;this.stage='cooldown';this.retryAt=now+2+this.random()*3;}
 get intent(){return this.stage==='act'?this.target?.kind??'idle':'idle';}
}
