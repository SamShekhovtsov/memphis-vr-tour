import { Quaternion, Scene, SceneLoader, ShadowGenerator, TransformNode, Vector3, AbstractMesh } from "@babylonjs/core";
import { addInstancedDistrictCrowd } from "./InstancedDistrictCrowd";
import { aim, solveContactLeg, type ContactLeg } from "./GroundContactIK";
import { workerLean, workerDrop, workerSupportHeight, finishWorkerHand } from "./HeroWorkerPose";
import { solveArm } from "./NaturalArmPose";
import { createPeopleMaterialBinder } from "./HeroPeopleMaterials";

export interface HeroPerson {
  root: TransformNode;
  legs: ContactLeg[];
  role:string;
  facing():Vector3;
  setFacing(direction:Vector3):void;
  workPoint?:()=>Vector3;
  wristAngles():number[];
  handContactErrors():number[];
  update(time: number): void;
}

/** Licensed anatomy lives under the existing path root; that root is never reset. */
export async function loadHeroPeople(scene: Scene): Promise<HeroPerson[]> {
  if (new URLSearchParams(location.search).has("legacyPeople")) return [];
  const people: HeroPerson[] = [];
  const bindPeopleMaterials = createPeopleMaterialBinder(scene);
  const containers = await Promise.all(["female", "male"].map(sex =>
    SceneLoader.LoadAssetContainerAsync("/assets/authored/people/", `hero_${sex}.glb`, scene)));
  const legacy = new URLSearchParams(location.search).get('population')==='legacy';
  const roles=['Carrier','StoneWorker','StreetWalker',...(!legacy&&!new URLSearchParams(location.search).has('ikAudit')?Array.from({length:6},(_,i)=>'Resident'+i):[])];
  for (const [index, role] of roles.entries()) {
    let root = scene.transformNodes.find(n => n.name.endsWith(`actorHero${role}`));
    if(index>2){root=new TransformNode('district'+role,scene);root.parent=people[0].root.parent;root.metadata={resident:true};}
    if (!root) continue;
    const oldMeshes = root.getChildMeshes();
    const container = containers[index === 0 || index>2&&index%2===1 ? 0 : 1];
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
    if(workBlock&&!legacy){workBlock.setParent(null);workBlock.checkCollisions=true;}
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
    // Relax fingers individually; thumbs need less curl than the other digits.
    if(!legacy)for(const side of ['L','R'])for(let digit=1;digit<=5;digit++)for(let joint=1;joint<=3;joint++){
      const node=bone(`finger${digit}-${joint}.${side}`);if(!node)continue;
      const gripPose=role==='Carrier'||role==='StoneWorker'&&side==='L';
      const curl=(digit===1?.11:joint===2?.22:.13)*(role==='StoneWorker'&&side==='L'?3:gripPose?2:1);
      node.rotationQuaternion=rest.get(node)!.multiply(Quaternion.RotationAxis(Vector3.Right(),curl));
    }
    head.computeWorldMatrix(true);bone('eye.L')?.computeWorldMatrix(true);bone('eye.R')?.computeWorldMatrix(true);
    let face=bone('eye.L')&&bone('eye.R')?bone('eye.L').getAbsolutePosition().add(bone('eye.R').getAbsolutePosition()).scale(.5).subtract(head.getAbsolutePosition()):Vector3.Forward();face.y=0;
    if(face.lengthSquared()<1e-6)face=Vector3.Cross(bone('upperarm01.L').getAbsolutePosition().subtract(bone('upperarm01.R').getAbsolutePosition()),Vector3.Up());
    const localFace=Vector3.TransformNormal(face.normalize(),root.computeWorldMatrix(true).clone().invert()).normalize();
    const facing=()=>Vector3.TransformNormal(localFace,root!.computeWorldMatrix(true)).normalize();
    const setFacing=(direction:Vector3)=>{const parent=root!.parent as TransformNode|null;const d=parent?Vector3.TransformNormal(direction,parent.computeWorldMatrix(true).clone().invert()):direction;root!.rotationQuaternion=Quaternion.RotationAxis(Vector3.Up(),Math.atan2(d.x,d.z)-Math.atan2(localFace.x,localFace.z));root!.computeWorldMatrix(true);};
    const wristAngles=()=>arms.map(arm=>{arm.foot.computeWorldMatrix(true);const along=bone(arm.foot.name.endsWith('.L')?'finger3-1.L':'finger3-1.R');along?.computeWorldMatrix(true);const hand=along?.getAbsolutePosition().subtract(arm.foot.getAbsolutePosition()).normalize()??Vector3.Down();const forearm=arm.foot.getAbsolutePosition().subtract(arm.knee.getAbsolutePosition()).normalize();return Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(hand,forearm))));});
    const hip=bone('root'),restHip=hip.position.clone(),handGoals:Vector3[]=[];
    const handContactErrors=()=>workBlock&&workBlend>.985?arms.map((arm,i)=>{arm.foot.computeWorldMatrix(true);return handGoals[i]?Vector3.Distance(arm.foot.getAbsolutePosition(),handGoals[i]):0;}):[];
    const upperBody = nodes.filter(n => /upperarm|lowerarm|wrist|spine0[15]|-head$/.test(n.name));
    let previous: Vector3 | undefined, previousTime: number | undefined, phase = 0, blend = 0, gaze = 0, workBlend = 1, intentWeight=0;
    people.push({ root, legs, role, facing, setFacing, wristAngles, handContactErrors, workPoint:workBlock?()=>workBlock.getAbsolutePosition().clone():undefined, update(time) {
      root.computeWorldMatrix(true);
      const current = root.getAbsolutePosition().clone();
      const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(.1, time - previousTime));
      if(!legacy)workBlend+=((root.metadata?.workActive===false?0:1)-workBlend)*(1-Math.exp(-dt*4));
      if(!legacy&&workBlock){
        const offset=facing().scale(.13*workBlend).add(Vector3.Down().scale(.15*workBlend));
        hip.position.copyFrom(restHip).addInPlace(Vector3.TransformNormal(offset,(hip.parent as TransformNode).computeWorldMatrix(true).clone().invert()));hip.computeWorldMatrix(true);
      }
      const distance = previous ? Vector3.Distance(current, previous) : 0;
      const speed = dt > 0 ? distance / dt : 0;
      const activity=root.metadata?.activity??'idle';
      intentWeight=root.metadata?.atlasPose?1:intentWeight+((activity==='idle'?0:1)-intentWeight)*(1-Math.exp(-dt*4));
      // Distance-driven arm rhythm; blend toward a relaxed idle when slowing.
      phase += distance * Math.PI * 2 / .85;
      blend += (Math.min(1, speed / .55) - blend) * (1 - Math.exp(-dt * 8));
      for (const n of upperBody) n.rotationQuaternion!.copyFrom(rest.get(n)!);
      const world = root.computeWorldMatrix(true);
      const forward = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
      let workPoint: Vector3 | undefined;
      if (workBlock && (legacy||workBlend>.001)) {
        workBlock.computeWorldMatrix(true);
        workPoint=workBlock.getAbsolutePosition().clone();
        workPoint.y=workBlock.getBoundingInfo().boundingBox.maximumWorld.y;
        const pelvis=bone('spine05');
        pelvis.computeWorldMatrix(true);head.computeWorldMatrix(true);
        const headPoint=head.getAbsolutePosition().clone();
        const lean=workPoint.subtract(pelvis.getAbsolutePosition()); lean.y=0; lean.normalize().scaleInPlace(workerLean(pelvis.getAbsolutePosition().y+(legacy?0:.15*workBlend), workPoint.y)*(legacy?1:workBlend));
        aim(pelvis,headPoint.subtract(pelvis.getAbsolutePosition()),headPoint.subtract(pelvis.getAbsolutePosition()).add(lean).subtract(new Vector3(0,workerDrop(lean.length()),0)));
      }
      const spine = bone("spine01");
      if (spine) spine.rotationQuaternion = rest.get(spine)!.multiply(Quaternion.RotationAxis(Vector3.Up(), Math.sin(phase) * .025 * blend));
      if(!legacy&&role!=='Carrier'&&!workBlock&&spine){
        const breath=Math.sin(time*Math.PI)*.008*(1-blend);
        spine.rotationQuaternion=spine.rotationQuaternion!.multiply(Quaternion.RotationAxis(Vector3.Right(),breath+(activity==='rest'?.025:activity==='work'?.045:0)*intentWeight));
      }
      for (const [side, arm] of arms.entries()) {
        const sign = side === 0 ? 1 : -1;
        let local = new Vector3(sign * .24, .84, .07 + Math.sin(phase + side * Math.PI) * .13 * blend);
        if (role === "Carrier") local = new Vector3(sign * .17, 1.84, .045);
        const target = role === "StoneWorker" && workPoint
          ? workPoint.add(new Vector3(0, side===0 ? .35 + .025*Math.sin(time*3) : workerSupportHeight(), 0)).add(Vector3.TransformNormal(new Vector3(side===0 ? -.035 : -.15,0,0),world))
          : Vector3.TransformCoordinates(local, world);
        if(legacy)solveContactLeg(arm,target,forward);
        else {
          arm.upper.computeWorldMatrix(true);bone('upperarm01.L').computeWorldMatrix(true);bone('upperarm01.R').computeWorldMatrix(true);
          const shoulder=arm.upper.getAbsolutePosition().clone();
          const left=bone('upperarm01.L').getAbsolutePosition(),right=bone('upperarm01.R').getAbsolutePosition();
          const outward=(side===0?left.subtract(right):right.subtract(left)).normalize();
          const front=facing();front.y=0;front.normalize();
          let goal=target;
          if(role!=='Carrier'){
            arm.knee.computeWorldMatrix(true);arm.foot.computeWorldMatrix(true);
            const length=Vector3.Distance(shoulder,arm.knee.getAbsolutePosition())+Vector3.Distance(arm.knee.getAbsolutePosition(),arm.foot.getAbsolutePosition());
            goal=shoulder.add(Vector3.Down().scale(length*.94)).add(outward.scale(.025)).add(front.scale(.025+Math.sin(phase+side*Math.PI)*.11*blend));
            if(role==='StoneWorker'&&workPoint){
              const right=Vector3.Cross(Vector3.Up(),front);
              const contact=workPoint.subtract(front.scale(side===0?.08:.12)).add(right.scale(side===0?-.09:.12)).add(Vector3.Up().scale(side===0?.24+.025*Math.sin(time*3):.035));
              goal=Vector3.Lerp(goal,contact,workBlend);
            }
            if(!workBlock&&activity!=='idle'){
              // Modest empty-hand inspection and conversational gestures. Do not
              // pretend to grip distant props or break the forearm/wrist chain.
              const wave=Math.sin(time*Math.PI),weight=intentWeight*(1-blend);
              const lift=activity==='work'?.25:activity==='socialize'?(side===0?.24:.12):activity==='inspect'||activity==='deliver'?.12:.01;
              const reach=activity==='work'?.25:activity==='socialize'?.13:activity==='inspect'||activity==='deliver'?.1:0;
              goal=goal.add(Vector3.Up().scale(lift*weight)).add(front.scale((reach+(activity==='socialize'||activity==='work'?.025*wave:0))*weight));
            }
          }else if(role==='Carrier'){
            head.computeWorldMatrix(true);goal=head.getAbsolutePosition().add(Vector3.Up().scale(.16)).add(outward.scale(.14)).add(front.scale(.02));
          }
          handGoals[side]=goal.clone();
          solveArm(arm,goal,outward.add(front.scale(.35)));
          const middle=bone(`finger3-1.${side===0?'L':'R'}`);middle.computeWorldMatrix(true);arm.foot.computeWorldMatrix(true);arm.knee.computeWorldMatrix(true);
          const along=middle.getAbsolutePosition().subtract(arm.foot.getAbsolutePosition());
          const forearm=arm.foot.getAbsolutePosition().subtract(arm.knee.getAbsolutePosition()).normalize();
          let desired=role==='Carrier'?Vector3.Up():role==='StoneWorker'&&workPoint&&side===1?Vector3.Lerp(forearm,front,workBlend).normalize():forearm;
          const angle=Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(forearm,desired))));if(angle>.6)desired=Vector3.Lerp(forearm,desired,.6/angle).normalize();
          aim(arm.foot,along,desired);
          if(tool&&workPoint&&side===0){
            const inverse=arm.foot.computeWorldMatrix(true).clone().invert();
            tool.position.copyFrom(Vector3.TransformCoordinates(middle.getAbsolutePosition(),inverse));
            const axis=Vector3.TransformNormal(workPoint.subtract(arm.foot.getAbsolutePosition()),inverse).normalize();
            tool.rotationQuaternion=Quaternion.Identity();Quaternion.FromUnitVectorsToRef(Vector3.Up(),axis,tool.rotationQuaternion);
          }
        }
        if (legacy && tool && workPoint && side===0) {
          const axis=Vector3.TransformNormal(Vector3.Up(),arm.foot.computeWorldMatrix(true));
          aim(arm.foot,axis,workPoint.subtract(arm.foot.getAbsolutePosition()));
        }
        if (legacy && role === "StoneWorker" && workPoint) finishWorkerHand(side, arm.foot, workPoint, bone, rest, scene, target);
      }
      if (jar && head) {
        head.computeWorldMatrix(true);
        const localHead = Vector3.TransformCoordinates(head.getAbsolutePosition(), world.clone().invert());
        jar.position.y = localHead.y + .20;
        if (pad) pad.position.y = localHead.y + .17;
      }
      if(!legacy&&role!=='Carrier'){
        gaze+=((root.metadata?.gazeYaw??(activity==='inspect'?.16*Math.sin(time*Math.PI):activity==='socialize'?.06*Math.sin(time*Math.PI):0))-gaze)*(1-Math.exp(-dt*2));
        const eye=bone('eye.L');eye?.computeWorldMatrix(true);head.computeWorldMatrix(true);
        if(eye&&Math.abs(gaze)>.001){const v=eye.getAbsolutePosition().subtract(head.getAbsolutePosition()),c=Math.cos(gaze),s=Math.sin(gaze);aim(head,v,new Vector3(v.x*c+v.z*s,v.y,v.z*c-v.x*s));}
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
  await addInstancedDistrictCrowd(scene,people);
  scene.metadata.heroPeople = people;
  scene.metadata.heroPeopleSource = "CC0 MakeHuman-derived anatomy; project-authored linen";
  scene.metadata.heroInteractions = people.map(person=>({root:person.root.name,
    toolAttached:person.root.getChildMeshes().some(mesh=>mesh.name.endsWith('woodTool')&&mesh.parent?.name.includes('heroPerson')),
    workBlockRetained:!!person.workPoint}));
  return people;
}
