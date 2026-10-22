import { Scene, Vector3 } from "@babylonjs/core";

/** Exercise the live collision meshes without moving the visitor or locked cameras. */
export function auditDistrictCollisions(scene: Scene) {
  scene.meshes.forEach(mesh => mesh.computeWorldMatrix(true));
  const coordinator = scene.collisionCoordinator;
  const move = (position: Vector3, displacement: Vector3): Vector3 => {
    const collider = coordinator.createCollider();
    collider._radius = new Vector3(.45, .8, .45);
    let result: Vector3 | undefined;
    coordinator.getNewPosition(position, displacement, collider, 3, null, (_id, next) => {
      result = next.clone();
    }, 0);
    if (!result) throw new Error("Collision audit requires the synchronous collision coordinator.");
    return result;
  };
  const checks: { name: string; passed: boolean; position: number[] }[] = [];
  // Centers use the same eye-minus-ellipsoid-height convention as FreeCamera.
  for (const [x, z] of [
    [0, 50], [-10, 70], [10, 74.5], [10, 76], [-10, 90], [10, 91],
    [-3, 76], [3, 82], [-3, 90], [3, 93.3], [-3, 93.3]
  ]) {
    let position = new Vector3(x, 1.1, z);
    for (let frame = 0; frame < 60; frame++) position = move(position, new Vector3(0, -.05, 0));
    checks.push({ name: `temple floor (${x}, ${z})`, passed: position.y >= .79, position: position.asArray() });
  }
  for (const z of [22, 28, 34, 38, 42]) {
    for (const targetX of [-14, 3]) {
      let position = new Vector3(-6, .9, z);
      const step = Math.sign(targetX + 6) * .2;
      for (let frame = 0; frame < Math.round(Math.abs(targetX + 6) / .2); frame++) {
        position = move(position, new Vector3(step, 0, 0));
      }
      checks.push({ name: `open ${targetX < -6 ? "west" : "east"} approach z=${z}`,
        passed: Math.abs(position.x - targetX) < .05, position: position.asArray() });
    }
  }
  for (const direction of [-1, 1]) {
    let position = new Vector3(-6, .9, 0);
    for (let frame = 0; frame < 40; frame++) position = move(position, new Vector3(direction * .2, 0, 0));
    checks.push({ name: `${direction < 0 ? "west" : "east"} house frontage still solid`,
      passed: direction < 0 ? position.x > -10.3 : position.x < -1.7, position: position.asArray() });
  }
  for (const route of [
    { name: "enter gate and cross district/court/shrine floor joins", points: [[0, 45], [0, 73], [3, 73], [3, 90.5]] },
    { name: "cross raised processional strip in both directions", points: [[-3, 60], [3, 60], [-3, 60]] }
  ]) {
    let position = new Vector3(route.points[0][0], .95, route.points[0][1]);
    let minimumHeight = position.y;
    for (const [x, z] of route.points.slice(1)) {
      for (let frame = 0; frame < 600; frame++) {
        const difference = new Vector3(x - position.x, 0, z - position.z);
        const distance = difference.length();
        if (distance < .025) break;
        const displacement = difference.scale(Math.min(.1, distance) / distance);
        displacement.y = -.025;
        position = move(position, displacement);
        minimumHeight = Math.min(minimumHeight, position.y);
      }
    }
    const [x, z] = route.points[route.points.length - 1];
    checks.push({ name: route.name,
      passed: minimumHeight >= .79 && Math.hypot(position.x - x, position.z - z) < .05,
      position: position.asArray() });
  }
  let position = new Vector3(11, .9, 60);
  for (let frame = 0; frame < 30; frame++) position = move(position, new Vector3(.2, 0, 0));
  checks.push({ name: "visible temple side wall still solid", passed: position.x < 13, position: position.asArray() });
  return { passed: checks.every(check => check.passed), checks };
}
