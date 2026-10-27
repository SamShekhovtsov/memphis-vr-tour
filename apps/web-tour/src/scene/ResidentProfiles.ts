import type { PopulationZone } from './PopulationZones';

export type Occupation = 'attendant' | 'artisan' | 'porter' | 'visitor';
export interface ResidentProfile {
 readonly id:string; readonly seed:number; readonly zone:PopulationZone;
 readonly occupation:Occupation; readonly pace:number; readonly patience:number;
 readonly sociability:number; readonly diligence:number; readonly personalSpace:number;
 thirst:number; fatigue:number; socialNeed:number;
}
// Independent resident streams keep identity stable when frame rate/order changes.
export function residentRandom(seed:number){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function createProfile(index:number,zone:PopulationZone):ResidentProfile{
 const seed=(Math.imul(index+1,2654435761)^1979)>>>0,r=residentRandom(seed);
 const occupation:Occupation=zone==='temple'?(r()<.55?'attendant':'visitor'):zone==='street'?(r()<.6?'artisan':'porter'):zone==='route'?'porter':'visitor';
 return {id:`memphis-resident-${String(index).padStart(3,'0')}`,seed,zone,occupation,
  pace:.62+r()*.25,patience:8+r()*17,sociability:.15+r()*.75,diligence:.3+r()*.65,
  personalSpace:.8+r()*.25,thirst:r()*.35,fatigue:r()*.35,socialNeed:r()*.35};
}
/** Half of each region, with stable largest-remainder allocation (63/126).
 * The original attached craftsman remains under its contact-specific controller. */
export function profilePopulation(zones:readonly PopulationZone[],excluded:ReadonlySet<number>=new Set([1])){
 const result=new Map<number,ResidentProfile>(),total=Math.ceil(zones.length/2);
 const rows=(['temple','street','route','free'] as PopulationZone[]).map(zone=>{
  const ids=zones.flatMap((z,i)=>z===zone&&!excluded.has(i)?[i]:[]);
  return {zone,ids,count:Math.floor(zones.filter(z=>z===zone).length/2),remainder:zones.filter(z=>z===zone).length%2};
 });
 let remaining=total-rows.reduce((n,r)=>n+r.count,0);
 for(const row of [...rows].sort((a,b)=>b.remainder-a.remainder))if(remaining&&row.count<row.ids.length){row.count++;remaining--;}
 for(const row of rows)for(const i of row.ids.slice(0,row.count))result.set(i,createProfile(i,row.zone));
 return result;
}
