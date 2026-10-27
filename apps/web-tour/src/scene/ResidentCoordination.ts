import type { ActivityStation } from './ResidentActivities';
import type { ResidentBrain } from './ResidentBrain';
type Lease={owner:string;expires:number};
/** One owner plus at most one physical waiting slot; no unbounded crowd queues. */
export class ResidentCoordination {
 readonly leases=new Map<string,Lease>(); readonly queues=new Map<string,Lease>();
 readonly residents=new Map<string,ResidentBrain>();private sessions=new Map<string,number>();
 conflicts=0;conversations=0;promotions=0;
 register(b:ResidentBrain){this.residents.set(b.profile.id,b);}
 prune(now:number){for(const map of [this.leases,this.queues])for(const [key,v]of map)if(v.expires<now)map.delete(key);}
 available(s:ActivityStation,id:string,now:number){this.prune(now);return !this.leases.has(s.id)||this.leases.get(s.id)!.owner===id||!!s.queue&&!this.queues.has(s.id);}
 acquire(s:ActivityStation,id:string,now:number){
  if(!this.available(s,id,now)){this.conflicts++;return false;}
  const map=this.leases.has(s.id)?this.queues:this.leases;map.set(s.id,{owner:id,expires:now+4});return true;
 }
 heartbeat(s:ActivityStation,id:string,now:number){
  this.prune(now);const queue=this.queues.get(s.id);
  if(queue?.owner===id&&!this.leases.has(s.id)){this.queues.delete(s.id);this.leases.set(s.id,{owner:id,expires:now+4});this.promotions++;}
  for(const map of [this.leases,this.queues]){const lease=map.get(s.id);if(lease?.owner===id)lease.expires=now+4;}
 }
 owns(s:ActivityStation,id:string){return this.leases.get(s.id)?.owner===id;}
 queued(s:ActivityStation,id:string){return this.queues.get(s.id)?.owner===id;}
 release(id:string){for(const map of [this.leases,this.queues])for(const [key,v]of map)if(v.owner===id)map.delete(key);}
 ready(s:ActivityStation,id:string,now:number){
  if(!this.owns(s,id))return false;if(!s.pair)return true;
  const partner=[...this.residents.values()].find(b=>b.profile.id!==id&&b.target?.pair===s.pair&&this.owns(b.target!,b.profile.id)&&['align','act'].includes(b.stage));
  if(!partner)return false;
  if(!this.sessions.has(s.pair)||this.sessions.get(s.pair)!<now){this.sessions.set(s.pair,now+14);this.conversations++;}
  return true;
 }
 endAt(s:ActivityStation){return s.pair?this.sessions.get(s.pair):undefined;}
}
