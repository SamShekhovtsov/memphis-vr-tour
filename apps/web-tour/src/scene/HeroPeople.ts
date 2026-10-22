import { Quaternion, Scene, SceneLoader, ShadowGenerator, TransformNode, Vector3, AbstractMesh } from "@babylonjs/core";
import { solveContactLeg, type ContactLeg } from "./GroundContactIK";

export interface HeroPerson {
  root: TransformNode;
  legs: ContactLeg[];
  update(time: number): void;
}

/** Licensed anatomy lives under the existing path root; that root is never reset. */
export async function loadHeroPeople(scene: Scene): Promise<HeroPerson[]> {
  if (new URLSearchParams(location.search).has("legacyPeople")) return [];
  const people: HeroPerson[] = [];
  const containers = await Promise.all(["female", "male"].map(sex =>
    SceneLoader.LoadAssetContainerAsync("/assets/authored/people/", `hero_${sex}.glb`, scene)));
  for (const [index, role] of ["Carrier", "StoneWorker", "StreetWalker"].entries()) {
    const root = scene.transformNodes.find(n => n.name.endsWith(`actorHero${role}`));
    if (!root) continue;
    const oldMeshes = root.getChildMeshes();
    const container = containers[index === 0 ? 0 : 1];
    const prefix = `heroPerson-${role}-`;
    const instance = container.instantiateModelsToScene(name => prefix + name, false);
    const avatar = new TransformNode(prefix + "avatar", scene);
    avatar.parent = root;
    avatar.scaling.setAll(index === 0 ? 1.07 : .96);
    for (const node of instance.rootNodes) {
      node.parent = avatar;
      // The existing actor already supplies glTF handedness conversion.
      if (node.name.endsWith("__root__") && node instanceof TransformNode) {
        node.rotationQuaternion = Quaternion.Identity(); node.scaling.setAll(1);
      }
    }
    const nodes = avatar.getChildTransformNodes(false);
    const bone = (name: string) => nodes.find(n => n.name === prefix + name)!;
    if (!["upperleg01.L","lowerleg01.L","foot.L","upperarm01.L","wrist.L"].every(n => bone(n))) {
      avatar.dispose(); throw new Error(`Incomplete anatomical rig for ${role}`);
    }
    // Retain only the existing carried load from the old visible character.
    const jar = root.getChildTransformNodes().find(n => n.name.endsWith("headJarRoot"));
    const loadMeshes = new Set<AbstractMesh>(jar?.getChildMeshes() ?? []);
    for (const mesh of oldMeshes) if (!loadMeshes.has(mesh)) mesh.setEnabled(false);
    const head = bone("head");
    const rest = new Map(nodes.map(n => [n, n.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(n.rotation)]));
    const legs: ContactLeg[] = ["L","R"].map(side => {
      const foot = bone(`foot.${side}`);
      foot.computeWorldMatrix(true);
      const up = Vector3.TransformNormal(Vector3.Up(), foot.getWorldMatrix().clone().invert()).normalize();
      return { upper: bone(`upperleg01.${side}`), knee: bone(`lowerleg01.${side}`), foot,
        soleHeight: .074 * avatar.scaling.y, soleHalfLength: .13 * avatar.scaling.y, soleUpAxis: up, gaitScale: 2.1 };
    });
    const arms = ["L","R"].map(side => ({ upper: bone(`upperarm01.${side}`), knee: bone(`lowerarm01.${side}`), foot: bone(`wrist.${side}`), soleHeight: 0 }));
    const upperBody = nodes.filter(n => /upperarm|lowerarm|wrist|spine01|finger/.test(n.name));
    let previous: Vector3 | undefined, previousTime: number | undefined, phase = 0, blend = 0;
    people.push({ root, legs, update(time) {
      root.computeWorldMatrix(true);
      const current = root.getAbsolutePosition().clone();
      const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(.1, time - previousTime));
      const distance = previous ? Vector3.Distance(current, previous) : 0;
      const speed = dt > 0 ? distance / dt : 0;
      // Distance-driven arm rhythm; blend toward a relaxed idle when slowing.
      phase += distance * Math.PI * 2 / .85;
      blend += (Math.min(1, speed / .55) - blend) * (1 - Math.exp(-dt * 8));
      for (const n of upperBody) n.rotationQuaternion = rest.get(n)!.clone();
      const world = root.computeWorldMatrix(true);
      const forward = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
      for (const [side, arm] of arms.entries()) {
        const sign = side === 0 ? 1 : -1;
        let local = new Vector3(sign * .24, .84, .07 + Math.sin(phase + side * Math.PI) * .13 * blend);
        if (role === "Carrier") local = new Vector3(sign * .17, 1.76, .045);
        if (role === "StoneWorker") local = new Vector3(sign * .14, 1.00 + .035 * Math.sin(time * 3 + side), .29);
        solveContactLeg(arm, Vector3.TransformCoordinates(local, world), forward);
      }
      if (jar && head) {
        head.computeWorldMatrix(true);
        const localHead = Vector3.TransformCoordinates(head.getAbsolutePosition(), world.clone().invert());
        jar.position.y = localHead.y + .115;
      }
      previous = current; previousTime = time;
    }});
    for (const mesh of avatar.getChildMeshes()) {
      mesh.receiveShadows = true; mesh.isPickable = false;
      const shadows = scene.getLightByName("lowGoldSun")?.getShadowGenerator();
      if (shadows instanceof ShadowGenerator) shadows.addShadowCaster(mesh, false);
    }
  }
  scene.metadata.heroPeople = people;
  scene.metadata.heroPeopleSource = "CC0 MakeHuman-derived anatomy; project-authored linen";
  return people;
}
