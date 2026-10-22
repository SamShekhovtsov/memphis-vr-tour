import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { soleContactFrame, swingAnkleRoll } from '../apps/web-tour/src/scene/GroundContactIK.ts';

for (const normal of [Vector3.Up(), new Vector3(.1,1,.15).normalize()]) {
  for (const heading of [Vector3.Forward(), new Vector3(0,0,-1)]) {
    for (const roll of [-.08,0,.12]) {
      const { up, offset, tangent } = soleContactFrame(normal,heading,roll,.036,.16);
      assert.ok(Math.abs(up.length()-1)<1e-6);
      assert.ok(Math.abs(Vector3.Dot(normal,tangent))<1e-6);
      if (roll === 0) assert.ok(Vector3.Distance(up,normal)<1e-6,'Mid-stance sole must follow the surface');
      const edge = roll >= 0 ? .16 : -.16;
      const rotatedForward = tangent.scale(Math.cos(roll)).subtract(normal.scale(Math.sin(roll)));
      const pivotAfter = normal.scale(.036).add(offset).add(rotatedForward.scale(edge)).subtract(up.scale(.036));
      assert.ok(Vector3.Distance(pivotAfter,tangent.scale(edge))<1e-6,'Ankle roll must preserve the support edge');
    }
  }
}
for (const t of [0,.5,1]) {
  const h=1e-5;
  const velocity=(swingAnkleRoll(t+h,.12)-swingAnkleRoll(t-h,.12))/(2*h);
  assert.ok(Math.abs(velocity)<1e-6,'Ankle roll must ease through lift, swing and heel strike');
}
console.log('Ankle contact passed: flat/sloped soles, reversed headings, fixed support edges and smooth swing roll.');
