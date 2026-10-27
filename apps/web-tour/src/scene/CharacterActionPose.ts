/** Presentation only: never chooses tasks or changes an actor's travel. */
export const smoothPose=(t:number)=>{t=Math.max(0,Math.min(1,t));return Math.max(0,Math.min(1,t*t*t*(10+t*(-15+6*t))));};
export function actionEnvelope(seconds:number){
 const t=((seconds%4)+4)%4;
 return t<.65?smoothPose(t/.65):t<1.65?1:t<2.35?1-smoothPose((t-1.65)/.7):0;
}
export function actionPose(kind:string,seconds:number,side:number,seed:number){
 const envelope=actionEnvelope(seconds),dominant=seed%2,active=side===dominant;
 const contact=kind==='work'||kind==='rest'||kind==='deliver';
 const lift=kind==='socialize'?(active?.24:.025):kind==='inspect'||kind==='deliver'?(active?.16:.015):kind==='work'?(active?.14:.02):.015;
 const reach=kind==='socialize'?(active?.12:0):kind==='work'||kind==='inspect'||kind==='deliver'?(active?.17:.01):0;
 return {envelope,lift:lift*envelope,reach:reach*envelope,curl:(active&&contact?.38:active?.16:.04)*envelope,contact:active&&contact&&envelope>.001,dominant};
}
/** Half-closed interval: closes quickly, reopens gently, with long relaxed gaps. */
export function blinkAmount(seconds:number,seed:number){
 const t=((seconds+seed*.617)%(4.1+(seed%7)*.37));
 return t<.075?smoothPose(t/.075):t<.11?1:t<.25?1-smoothPose((t-.11)/.14):0;
}
