import {Vector3} from '@babylonjs/core';
import {aim,type ContactLeg} from './GroundContactIK';
/** Arm IK lets the hand inherit forearm orientation; a foot's fixed-world frame bends wrists incorrectly. */
export function solveArm(arm:ContactLeg,target:Vector3,pole:Vector3){
 const position=(n:typeof arm.upper)=>{n.computeWorldMatrix(true);return n.getAbsolutePosition().clone();};
 const a=position(arm.upper),b=position(arm.knee),c=position(arm.foot),l1=Vector3.Distance(a,b),l2=Vector3.Distance(b,c),delta=target.subtract(a);let distance=delta.length();if(distance<1e-5)return;
 const dir=delta.scale(1/distance);distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.003,distance));
 let bend=pole.subtract(dir.scale(Vector3.Dot(pole,dir)));if(bend.lengthSquared()<1e-6)bend=Vector3.Cross(dir,Vector3.Right());bend.normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const elbow=a.add(dir.scale(along)).add(bend.scale(height));aim(arm.upper,b.subtract(a),elbow.subtract(a));
 const actual=position(arm.knee);aim(arm.knee,position(arm.foot).subtract(actual),a.add(dir.scale(distance)).subtract(actual));
}
