import { Quaternion, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { aim } from "./GroundContactIK";

const prior = new URLSearchParams(location.search).get("steps56") === "legacy";
const grip = Quaternion.RotationAxis(Vector3.Right(), .5);
const gripped = new WeakSet<TransformNode>();
const supportFrames = new WeakMap<TransformNode, { input: number[]; block: Vector3; rotation: Quaternion }>();
type HandSample = { wrist: TransformNode; block: Vector3; target: Vector3; bone: (name: string) => TransformNode };
const sceneHands = new WeakMap<Scene, HandSample[]>();
export const workerLean = (pelvisY: number, blockY: number) => prior ? .16 : Math.max(.26, Math.min(.84, (pelvisY-blockY)*1.8+.16));
export const workerDrop = (lean: number) => prior ? .04 : lean*.35;
export const workerSupportHeight = () => prior ? .22 : .025;

/** Existing stationary worker only: no root movement, leg solve or path edits. */
export function finishWorkerHand(side: number, wrist: TransformNode, block: Vector3,
  bone: (name: string) => TransformNode, rest: Map<TransformNode, Quaternion>, scene: Scene, target: Vector3) {
  if (prior) return;
  if (side === 0) {
    if (!gripped.has(wrist)) {
      for (let digit=1;digit<=5;digit++) for (let joint=1;joint<=3;joint++) {
        const node=bone(`finger${digit}-${joint}.L`);
        if (node && rest.has(node)) rest.get(node)!.multiplyToRef(grip,node.rotationQuaternion!);
      }
      gripped.add(wrist);
    }
  } else {
    wrist.computeWorldMatrix(true);
    const input=wrist.getWorldMatrix().m;
    const cached=supportFrames.get(wrist);
    if (cached && cached.block.equals(block) && cached.input.every((v,i)=>v===input[i])) {
      wrist.rotationQuaternion!.copyFrom(cached.rotation);
      wrist.markAsDirty("rotation");
      rememberHand(side,wrist,block,target,bone,scene);
      return;
    }
    const original=Array.from(input);
    const position=wrist.getAbsolutePosition().clone();
    const middle=bone("finger3-1.R"),index=bone("finger2-1.R"),ring=bone("finger4-1.R");
    if (middle && index && ring) {
      middle.computeWorldMatrix(true);
      const along=middle.getAbsolutePosition().subtract(position);
      const toward=block.subtract(position);toward.y=0;
      if (along.lengthSquared()>1e-8 && toward.lengthSquared()>1e-8) aim(wrist,along,toward);
      index.computeWorldMatrix(true);ring.computeWorldMatrix(true);middle.computeWorldMatrix(true);
      const forward=middle.getAbsolutePosition().subtract(position).normalize();
      let palm=Vector3.Cross(index.getAbsolutePosition().subtract(position),ring.getAbsolutePosition().subtract(position));
      palm=palm.subtract(forward.scale(Vector3.Dot(palm,forward)));
      if (palm.lengthSquared()>1e-8) aim(wrist,palm,Vector3.Down());
    }
    supportFrames.set(wrist,{input:original,block:block.clone(),rotation:wrist.rotationQuaternion!.clone()});
  }
  rememberHand(side,wrist,block,target,bone,scene);
}

/** Diagnostics have no part in the pose solve; evaluate only for a QA snapshot. */
function rememberHand(side: number,wrist: TransformNode,block: Vector3,target: Vector3,
  bone: (name: string) => TransformNode,scene: Scene) {
  let hands=sceneHands.get(scene);
  if (!hands) {
    hands=[];sceneHands.set(scene,hands);
    scene.metadata.readWorkerInteraction=()=>hands!.map((hand,side)=>describeHand(hand,side));
  }
  hands[side]={wrist,block,target,bone};
}

function describeHand({wrist,block,target,bone}: HandSample,side: number) {
  wrist.computeWorldMatrix(true);
  const actual=wrist.getAbsolutePosition();
  const across=bone("upperarm01.L").getAbsolutePosition().subtract(bone("upperarm01.R").getAbsolutePosition());
  const up=bone("head").getAbsolutePosition().subtract(bone("spine05").getAbsolutePosition());
  const facing=Vector3.Cross(across,up);facing.y=0;facing.normalize();
  const towardStone=block.subtract(bone("spine05").getAbsolutePosition());towardStone.y=0;towardStone.normalize();
  return {hand:side===0?"hammer":"support",target:target.asArray(),actual:actual.asArray(),
    targetErrorMeters:Vector3.Distance(actual,target),wristAboveStoneMeters:actual.y-block.y,facingStoneDot:Vector3.Dot(facing,towardStone)};
}
