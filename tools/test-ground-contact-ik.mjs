import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GroundContactIK, solveContactLeg, swingContactPosition } from '../apps/web-tour/src/scene/GroundContactIK.ts';

// Contact transitions must join a stationary stance without velocity or
// acceleration impulses, including when the landing is at a different height.
const start = new Vector3(0,.088,0), end = new Vector3(.02,.095,.14);
const h = 1e-5;
const sample = t => swingContactPosition(start,end,t,.035);
for (const t of [0,1]) {
  const p = sample(t), left = sample(t-h), right = sample(t+h);
  assert.ok(right.subtract(left).scale(1/(2*h)).length()<1e-5,'Contact velocity must ease to zero');
  assert.ok(right.add(left).subtract(p.scale(2)).scale(1/(h*h)).length()<.002,'Contact acceleration must ease to zero');
}
assert.ok(sample(.5).y > Math.max(start.y,end.y),'Swing must clear the ground');
assert.ok(sample(0).equals(start) && sample(1).equals(end),'Swing must preserve contact endpoints');

const engine = new NullEngine();
const scene = new Scene(engine);
function fixture(reflected = false) {
  const root = new TransformNode('actor', scene);
  root.position.y = .43;
  root.scaling.z = reflected ? -1 : 1;
  const legs = [-1,1].map(side => {
    const upper = new TransformNode(`upper${side}`, scene); upper.parent = root; upper.position.x = side*.09;
    const knee = new TransformNode(`knee${side}`, scene); knee.parent = upper; knee.position.y = -.1725;
    const foot = new TransformNode(`foot${side}`, scene); foot.parent = knee; foot.position.set(0,-.1725,.08);
    for(const node of [upper,knee,foot]) node.rotationQuaternion=Quaternion.Identity();
    return {upper,knee,foot,soleHeight:.036};
  });
  return {root,legs};
}
for(const reflected of [false,true]) {
  const {root,legs}=fixture(reflected);
  const saved=root.position.clone();
  const target=new Vector3(-.09,.088,reflected ? -.06 : .06);
  assert.ok(solveContactLeg(legs[0],target,new Vector3(0,0,1))<.0001,'Reachable contact must solve under glTF handedness');
  assert.ok(root.position.equals(saved),'IK must not move root');
  assert.ok(Number.isFinite(solveContactLeg(legs[0],new Vector3(50,50,50),Vector3.Forward())),'Unreachable target must clamp safely');
}
const {root,legs}=fixture(true);
const controller = new GroundContactIK(root,legs,()=>.052);
let last = new Map(), plantedDrift=0, baselineDrift=0, comparisons=0, steps=0, maxError=0;
for(let frame=0;frame<1200;frame++) {
  const time=frame/60;
  controller.restore();
  root.position.z=2.9*Math.sin(time*.24+.2);
  const original=root.position.clone();
  controller.update(time);
  assert.ok(root.position.equals(original),'Contact controller changed the path');
  for(const contact of controller.diagnostics) {
    assert.ok(contact.position.every(Number.isFinite),'Non-finite foot transform');
    assert.ok(Math.abs(Vector3.Dot(Vector3.FromArray(contact.soleNormal),Vector3.FromArray(contact.groundNormal))-Math.cos(contact.ankleRoll))<1e-4,'Sole must track ground normal plus intended ankle roll');
    const previous=last.get(contact.name);
    if(previous && contact.planted && previous.planted && previous.placement===contact.placement) {
      plantedDrift+=Vector3.Distance(Vector3.FromArray(contact.position),Vector3.FromArray(previous.position));
      baselineDrift+=Math.abs(root.position.z-previous.rootZ);
      comparisons++;
    }
    if(previous && previous.placement!==contact.placement) steps++;
    maxError=Math.max(maxError,contact.error);
    last.set(contact.name,{...contact,rootZ:root.position.z});
  }
}
assert.ok(comparisons>100 && steps>10,'Simulation must exercise stance and steps');
assert.ok(plantedDrift<baselineDrift*.35,`Stance drift did not improve enough: ${plantedDrift}/${baselineDrift}`);
// No support: retain animation instead of inventing a floor.
const missing=fixture();
const noGround=new GroundContactIK(missing.root,missing.legs,()=>undefined);
noGround.update(0); assert.equal(noGround.diagnostics.length,0);
// The imported foot mesh has non-uniform scale; alignment must survive that,
// a reflected parent, and a sloping support plane without moving the root.
for (const reflected of [false,true]) {
  const slope=fixture(reflected), normal=new Vector3(.1,1,.15).normalize();
  for(const leg of slope.legs) leg.foot.scaling.set(.065,.035,.14);
  const ik=new GroundContactIK(slope.root,slope.legs,()=>({height:.052,normal}));
  const original=slope.root.position.clone();
  ik.update(0);
  assert.ok(slope.root.position.equals(original));
  for(const foot of ik.diagnostics) assert.ok(Vector3.Dot(Vector3.FromArray(foot.soleNormal),normal)>.9999,'Stationary sole must align with sloping ground');
}
console.log(JSON.stringify({comparisons,steps,plantedDrift,baselineDrift,reductionPercent:100*(1-plantedDrift/baselineDrift),maxReachError:maxError},null,2));
scene.dispose(); engine.dispose();
