import { Quaternion, Scene, SceneLoader, ShadowGenerator, TransformNode, Vector3, AbstractMesh } from "@babylonjs/core";
import { aim, solveContactLeg, type ContactLeg } from "./GroundContactIK";
import { workerLean, workerDrop, workerSupportHeight, finishWorkerHand } from "./HeroWorkerPose";
import { createPeopleMaterialBinder } from "./HeroPeopleMaterials";

export interface HeroPerson {
  root: TransformNode;
  legs: ContactLeg[];
  update(time: number): void;
}

/** Licensed anatomy lives under the existing path root; that root is never reset. */
export async function loadHeroPeople(scene: Scene): Promise<HeroPerson[]> {
  if (new URLSearchParams(location.search).has("legacyPeople")) return [];
  const people: HeroPerson[] = [];
  const bindPeopleMaterials = createPeopleMaterialBinder(scene);
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
    // The source A-pose has nearly straight knees. Reserve a small amount of
    // flexion in the body pose so planted feet can stay reached during travel.
    // The locked path root is untouched.
    avatar.position.y = -.035;
    for (const node of instance.rootNodes) {
      node.parent = avatar;
      // The existing actor already supplies glTF handedness conversion.
      if (node.name.endsWith("__root__") && node instanceof TransformNode) {
        node.rotationQuaternion = Quaternion.Identity(); node.scaling.setAll(1);
      }
    }
    const nodes = avatar.getChildTransformNodes(false);
    const rig = new Map(nodes.map(node => [node.name.slice(prefix.length), node]));
    const bone = (name: string) => rig.get(name)!;
    if (!["upperleg01.L","lowerleg01.L","foot.L","upperarm01.L","wrist.L"].every(n => bone(n))) {
      avatar.dispose(); throw new Error(`Incomplete anatomical rig for ${role}`);
    }
    // Retain only the existing carried load from the old visible character.
    const jar = root.getChildTransformNodes().find(n => n.name.endsWith("headJarRoot"));
    const pad = oldMeshes.find(n => n.name.endsWith("headPad"));
    const workBlock = oldMeshes.find(n => n.name.endsWith("workBlock"));
    const tool = oldMeshes.find(n => n.name.endsWith("woodTool"));
    const loadMeshes = new Set<AbstractMesh>(jar?.getChildMeshes() ?? []);
    if (pad) loadMeshes.add(pad);
    if (workBlock) loadMeshes.add(workBlock);
    if (tool) loadMeshes.add(tool);
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
    if (tool) {
      tool.setParent(arms[0].foot);
      tool.position.set(0,.12,0);
      tool.rotationQuaternion=Quaternion.Identity();
    }
    // Finger local poses are constant; changing their parent still updates them.
    // Do not reset and curl the same finger joints on every animation frame.
    const fingerCurl = Quaternion.RotationAxis(Vector3.Right(), .32);
    if (role === "Carrier") for (const node of nodes.filter(n => /finger[1-5]-[1-3]\./.test(n.name))) {
      node.rotationQuaternion = rest.get(node)!.multiply(fingerCurl);
    }
    const upperBody = nodes.filter(n => /upperarm|lowerarm|wrist|spine0[15]/.test(n.name));
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
      for (const n of upperBody) n.rotationQuaternion!.copyFrom(rest.get(n)!);
      const world = root.computeWorldMatrix(true);
      const forward = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
      let workPoint: Vector3 | undefined;
      if (workBlock) {
        workBlock.computeWorldMatrix(true);
        workPoint=workBlock.getAbsolutePosition().clone();
        workPoint.y=workBlock.getBoundingInfo().boundingBox.maximumWorld.y;
        const pelvis=bone('spine05');
        const headPoint=head.getAbsolutePosition().clone();
        const lean=workPoint.subtract(pelvis.getAbsolutePosition()); lean.y=0; lean.normalize().scaleInPlace(workerLean(pelvis.getAbsolutePosition().y, workPoint.y));
        aim(pelvis,headPoint.subtract(pelvis.getAbsolutePosition()),headPoint.subtract(pelvis.getAbsolutePosition()).add(lean).subtract(new Vector3(0,workerDrop(lean.length()),0)));
      }
      const spine = bone("spine01");
      if (spine) spine.rotationQuaternion = rest.get(spine)!.multiply(Quaternion.RotationAxis(Vector3.Up(), Math.sin(phase) * .025 * blend));
      for (const [side, arm] of arms.entries()) {
        const sign = side === 0 ? 1 : -1;
        let local = new Vector3(sign * .24, .84, .07 + Math.sin(phase + side * Math.PI) * .13 * blend);
        if (role === "Carrier") local = new Vector3(sign * .17, 1.84, .045);
        const target = role === "StoneWorker" && workPoint
          ? workPoint.add(new Vector3(0, side===0 ? .35 + .025*Math.sin(time*3) : workerSupportHeight(), 0)).add(Vector3.TransformNormal(new Vector3(side===0 ? -.035 : -.15,0,0),world))
          : Vector3.TransformCoordinates(local, world);
        solveContactLeg(arm, target, forward);
        if (tool && workPoint && side===0) {
          const axis=Vector3.TransformNormal(Vector3.Up(),arm.foot.computeWorldMatrix(true));
          aim(arm.foot,axis,workPoint.subtract(arm.foot.getAbsolutePosition()));
        }
        if (role === "StoneWorker" && workPoint) finishWorkerHand(side, arm.foot, workPoint, bone, rest, scene, target);
      }
      if (jar && head) {
        head.computeWorldMatrix(true);
        const localHead = Vector3.TransformCoordinates(head.getAbsolutePosition(), world.clone().invert());
        jar.position.y = localHead.y + .20;
        if (pad) pad.position.y = localHead.y + .17;
      }
      previous = current; previousTime = time;
    }});
    for (const mesh of avatar.getChildMeshes()) {
      bindPeopleMaterials(mesh);
      mesh.receiveShadows = true; mesh.isPickable = false;
      const shadows = scene.getLightByName("lowGoldSun")?.getShadowGenerator();
      if (shadows instanceof ShadowGenerator) shadows.addShadowCaster(mesh, false);
    }
  }
  scene.metadata.heroPeople = people;
  scene.metadata.heroPeopleSource = "CC0 MakeHuman-derived anatomy; project-authored linen";
  scene.metadata.heroInteractions = people.map(person=>({root:person.root.name,
    toolAttached:person.root.getChildMeshes().some(mesh=>mesh.name.endsWith('woodTool')&&mesh.parent?.name.includes('heroPerson')),
    workBlockRetained:person.root.getChildMeshes().some(mesh=>mesh.name.endsWith('workBlock')&&mesh.isEnabled())}));
  return people;
}
