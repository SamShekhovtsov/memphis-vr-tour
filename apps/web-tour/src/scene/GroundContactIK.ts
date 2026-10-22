import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";

/** Joins a fixed stance with zero endpoint velocity and acceleration. */
export function swingContactPosition(from: Vector3, to: Vector3, phase: number, clearance: number): Vector3 {
  const t = Math.max(0, Math.min(1, phase));
  const travel = t * t * t * (10 + t * (-15 + 6 * t));
  const point = Vector3.Lerp(from, to, travel);
  point.y += clearance * 64 * (t * (1 - t)) ** 3;
  return point;
}

function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (10 + t * (-15 + 6 * t));
}

export function swingAnkleRoll(phase: number, toeRoll: number): number {
  return toeRoll * (1 - ease(phase * 2)) - .08 * ease((phase - .5) * 2);
}

/** Rotation and centre compensation about a fixed heel/toe support edge. */
export function soleContactFrame(normal: Vector3, forward: Vector3, roll: number, height: number, halfLength: number) {
  const tangent = forward.subtract(normal.scale(Vector3.Dot(forward, normal))).normalize();
  const up = normal.scale(Math.cos(roll)).add(tangent.scale(Math.sin(roll)));
  const rotatedForward = tangent.scale(Math.cos(roll)).subtract(normal.scale(Math.sin(roll)));
  const edge = roll >= 0 ? halfLength : -halfLength;
  const offset = tangent.subtract(rotatedForward).scale(edge).add(up.subtract(normal).scale(height));
  return { up, offset, tangent };
}

export type GroundSample = (point: Vector3) => number | { height: number; normal: Vector3 } | undefined;
export interface ContactLeg {
  upper: TransformNode;
  knee: TransformNode;
  foot: TransformNode;
  soleHeight: number;
  soleHalfLength?: number;
  soleUpAxis?: Vector3;
  gaitScale?: number;
}

function position(node: TransformNode): Vector3 {
  node.computeWorldMatrix(true);
  return node.getAbsolutePosition().clone();
}

function setWorldOrientation(node: TransformNode, world: Matrix): void {
  world.setTranslation(position(node));
  const parent = node.parent as TransformNode | null;
  const local = parent ? world.multiply(parent.computeWorldMatrix(true).clone().invert()) : world;
  const rotation = Quaternion.Identity();
  local.decompose(undefined, rotation);
  node.rotationQuaternion = rotation;
  node.computeWorldMatrix(true);
}

function aim(node: TransformNode, from: Vector3, to: Vector3): void {
  if (from.lengthSquared() < 1e-10 || to.lengthSquared() < 1e-10) return;
  const delta = Quaternion.Identity();
  Quaternion.FromUnitVectorsToRef(from.normalize(), to.normalize(), delta);
  const rotation = Matrix.Identity();
  delta.toRotationMatrix(rotation);
  setWorldOrientation(node, node.computeWorldMatrix(true).multiply(rotation));
}

/** Analytic two-bone solve in world metres, keeping the hip/root untouched. */
export function solveContactLeg(leg: ContactLeg, target: Vector3, forward: Vector3): number {
  const hip = position(leg.upper), knee = position(leg.knee), end = position(leg.foot);
  const upperLength = Vector3.Distance(hip, knee), lowerLength = Vector3.Distance(knee, end);
  const direction = target.subtract(hip);
  const requested = direction.length();
  if (requested < 1e-6 || upperLength < 1e-6 || lowerLength < 1e-6) return requested;
  direction.scaleInPlace(1 / requested);
  const distance = Math.max(Math.abs(upperLength - lowerLength) + .0001,
    Math.min(upperLength + lowerLength - .0001, requested));
  let pole = forward.subtract(direction.scale(Vector3.Dot(forward, direction)));
  if (pole.lengthSquared() < .0001) pole = Vector3.Cross(direction, Vector3.Right());
  if (pole.lengthSquared() < .0001) pole = Vector3.Cross(direction, Vector3.Forward());
  pole.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const kneeGoal = hip.add(direction.scale(along)).add(pole.scale(bend));
  const endGoal = hip.add(direction.scale(distance));
  const footRotation = leg.foot.computeWorldMatrix(true).clone();
  aim(leg.upper, knee.subtract(hip), kneeGoal.subtract(hip));
  const newKnee = position(leg.knee);
  aim(leg.knee, position(leg.foot).subtract(newKnee), endGoal.subtract(newKnee));
  // Preserve the authored ankle orientation while translating the foot to contact.
  setWorldOrientation(leg.foot, footRotation);
  return Vector3.Distance(position(leg.foot), target);
}

interface FootState {
  leg: ContactLeg;
  anchor?: Vector3;
  from?: Vector3;
  landing?: Vector3;
  swingStart?: number;
  swingDuration?: number;
  clearance?: number;
  normal?: Vector3;
  landingNormal?: Vector3;
  roll: number;
  toeRoll?: number;
  landedAt?: number;
  placement: number;
}

/** Per-character world-space contact state; never writes to the actor root. */
export class GroundContactIK {
  root: TransformNode;
  ground: GroundSample;
  feet: FootState[];
  saved = new Map<TransformNode, Quaternion>();
  previousRoot?: Vector3;
  previousForward?: Vector3;
  previousTime?: number;
  diagnostics: { name: string; planted: boolean; placement: number; error: number; position: number[]; animationPosition: number[]; target: number[]; ankleRoll: number; soleNormal: number[]; groundNormal: number[] }[] = [];

  constructor(root: TransformNode, legs: ContactLeg[], ground: GroundSample) {
    this.root = root;
    this.ground = ground;
    this.feet = legs.map(leg => ({ leg, placement: 0, roll: 0 }));
  }

  private sample(point: Vector3) {
    const value = this.ground(point);
    if (value === undefined) return undefined;
    if (typeof value === "number") return { height: value, normal: Vector3.Up() };
    return { height: value.height, normal: value.normal.clone().normalize() };
  }

  // Restore last frame's animation input before Babylon evaluates the next frame.
  restore(): void {
    for (const [node, rotation] of this.saved) {
      node.rotationQuaternion = rotation.clone();
      node.computeWorldMatrix(true);
    }
    this.saved.clear();
  }

  update(time: number): void {
    const rootPosition = position(this.root);
    const forward = Vector3.TransformNormal(new Vector3(0, 0, 1), this.root.getWorldMatrix());
    forward.y = 0; forward.normalize();
    const dt = this.previousTime === undefined ? 0 : time - this.previousTime;
    const velocity = dt > 0 && dt < .25 && this.previousRoot ? rootPosition.subtract(this.previousRoot).scale(1 / dt) : Vector3.Zero();
    velocity.y = 0;
    const reset = dt < 0 || dt > .25 || (this.previousForward && Vector3.Dot(forward, this.previousForward) < .2);
    if (reset) for (const foot of this.feet) {
      foot.anchor = undefined; foot.swingStart = undefined; foot.landedAt = undefined; foot.roll = 0;
    }
    for (const { leg } of this.feet) for (const node of [leg.upper, leg.knee, leg.foot]) {
      this.saved.set(node, node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation));
    }
    for (const state of this.feet) {
      if (!state.anchor) {
        const point = position(state.leg.foot);
        const surface = this.sample(point);
        if (surface) {
          point.y = surface.height + state.leg.soleHeight;
          state.normal = surface.normal;
          // Start with a reachable contact even when the frozen authored pose
          // projects an extended swinging foot too far ahead of the hip.
          const hip = position(state.leg.upper), knee = position(state.leg.knee);
          const reach = Vector3.Distance(hip, knee) + Vector3.Distance(knee, position(state.leg.foot)) - .0002;
          const horizontal = point.subtract(hip); horizontal.y = 0;
          const radius = .9 * Math.sqrt(Math.max(0, reach ** 2 - (hip.y - point.y) ** 2));
          if (horizontal.length() > radius) {
            horizontal.normalize().scaleInPlace(radius);
            point.x = hip.x + horizontal.x; point.z = hip.z + horizontal.z;
          }
          state.anchor = point; state.placement++;
        }
      }
    }
    // Alternate short steps when the moving hip approaches its contact reach.
    // Use root speed, not clip index, because browser paths are applied after clips.
    if (!this.feet.some(foot => foot.swingStart !== undefined) && velocity.length() > .025) {
      const candidates = this.feet.filter(foot => foot.anchor).map(foot => {
        const hip = position(foot.leg.upper);
        const delta = hip.subtract(foot.anchor!); delta.y = 0;
        return { foot, hip, behind: Vector3.Dot(delta, velocity.normalizeToNew()) };
      }).sort((a, b) => b.behind - a.behind);
      const candidate = candidates[0];
      const gaitScale = candidate?.foot.leg.gaitScale ?? 1;
      if (candidate && candidate.behind > .035 * gaitScale) {
        // Slower walkers take gentler, longer swings. Freeze timing at toe-off
        // so a changing root speed cannot jump the foot along its trajectory.
        const duration = Math.max(.12, Math.min(.24, .24 - velocity.length() * .17)) * gaitScale;
        const landing = candidate.hip.add(velocity.scale(duration + .04 * gaitScale));
        const surface = this.sample(landing);
        if (surface) {
          landing.y = surface.height + candidate.foot.leg.soleHeight;
          candidate.foot.from = candidate.foot.anchor!.clone();
          candidate.foot.landing = landing;
          candidate.foot.swingStart = time;
          candidate.foot.landingNormal = surface.normal;
          candidate.foot.toeRoll = candidate.foot.roll;
          candidate.foot.swingDuration = duration;
          candidate.foot.clearance = (.02 + .015 * Math.min(1, velocity.length() / .7)) * Math.sqrt(gaitScale);
        }
      }
    }
    this.diagnostics = [];
    for (const state of this.feet) {
      if (!state.anchor) continue;
      let target = state.anchor;
      let normal = state.normal ?? Vector3.Up();
      let roll = 0;
      if (state.swingStart !== undefined && state.from && state.landing) {
        const t = Math.max(0, Math.min(1, (time - state.swingStart) / state.swingDuration!));
        target = swingContactPosition(state.from, state.landing, t, state.clearance!);
        normal = Vector3.Lerp(normal, state.landingNormal ?? normal, ease(t)).normalize();
        roll = swingAnkleRoll(t, state.toeRoll ?? 0);
        if (t >= 1) {
          state.anchor = state.landing; state.swingStart = undefined; state.placement++;
          state.normal = normal; state.landedAt = time;
        }
      } else {
        // Heel settles first; only the trailing foot lifts its heel before toe-off.
        const behind = Vector3.Dot(position(state.leg.upper).subtract(state.anchor), forward);
        const moving = Math.min(1, velocity.length() / .08);
        roll = .12 * ease(behind / (.035 * (state.leg.gaitScale ?? 1))) * moving;
        if (state.landedAt !== undefined) roll -= .08 * (1 - ease((time - state.landedAt) / .08));
      }
      state.roll = roll;
      const sole = soleContactFrame(normal, forward, roll, state.leg.soleHeight, state.leg.soleHalfLength ?? .16);
      // Translate around the support edge, including the slope's normal offset.
      target = target.add(sole.offset).add(normal.subtract(Vector3.Up()).scale(state.leg.soleHeight));
      const animationPosition = position(state.leg.foot).asArray();
      const error = solveContactLeg(state.leg, target, forward);
      const soleAxis = state.leg.soleUpAxis ?? Vector3.Up();
      let currentUp = Vector3.TransformNormal(soleAxis, state.leg.foot.computeWorldMatrix(true)).normalize();
      if (currentUp.y < 0) currentUp = currentUp.negate();
      aim(state.leg.foot, currentUp, sole.up);
      let soleNormal = Vector3.TransformNormal(soleAxis, state.leg.foot.computeWorldMatrix(true)).normalize();
      if (soleNormal.y < 0) soleNormal = soleNormal.negate();
      this.diagnostics.push({ name: state.leg.foot.name, planted: state.swingStart === undefined,
        placement: state.placement, error, position: position(state.leg.foot).asArray(), animationPosition, target: target.asArray(),
        ankleRoll: roll, soleNormal: soleNormal.asArray(), groundNormal: normal.asArray() });
    }
    this.previousRoot = rootPosition; this.previousForward = forward; this.previousTime = time;
  }
}
