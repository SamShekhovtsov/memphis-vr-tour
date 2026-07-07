import {
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  UniversalCamera,
  Vector3
} from "@babylonjs/core";
import type { EvidenceLevel, TourManifest, TourStop } from "@egyptvr/shared-scene";
import { evidenceColors } from "@egyptvr/shared-scene";

export interface MemphisSceneController {
  scene: Scene;
  toggleAutoplay(): boolean;
  toggleEvidence(): boolean;
  toggleNarrator(): boolean;
  enterVr(): Promise<void>;
  resetTour(): void;
  onStopChanged(listener: StopListener): () => void;
}

type StopListener = (stop: TourStop) => void;

interface SceneMaterials {
  sand: StandardMaterial;
  mudbrick: StandardMaterial;
  plaster: StandardMaterial;
  river: StandardMaterial;
  reed: StandardMaterial;
  wood: StandardMaterial;
  linen: StandardMaterial;
  stone: StandardMaterial;
  paint: StandardMaterial;
  shadow: StandardMaterial;
  smoke: StandardMaterial;
  evidence: Record<EvidenceLevel, StandardMaterial>;
}

interface WalkerRoutine {
  root: TransformNode;
  start: Vector3;
  end: Vector3;
  speed: number;
  phase: number;
}

export async function createMemphisWhiteWallsScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  manifest: TourManifest
): Promise<MemphisSceneController> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.62, 0.8, 0.9, 1);
  scene.ambientColor = new Color3(0.72, 0.64, 0.52);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.006;
  scene.collisionsEnabled = true;

  const materials = createMaterials(scene);
  const firstStop = manifest.stops[0];
  const camera = new UniversalCamera("visitorCamera", vectorFromTuple(firstStop.position), scene);
  camera.setTarget(vectorFromTuple(firstStop.lookAt ?? firstStop.position));
  camera.attachControl(canvas, true);
  camera.speed = 0.34;
  camera.angularSensibility = 3600;
  camera.minZ = 0.04;
  camera.ellipsoid = new Vector3(0.45, 0.8, 0.45);
  camera.checkCollisions = true;

  new HemisphericLight("skyLight", new Vector3(0, 1, 0), scene).intensity = 0.76;
  const sun = new HemisphericLight("warmBounce", new Vector3(0.6, 1, -0.25), scene);
  sun.diffuse = new Color3(1, 0.78, 0.5);
  sun.groundColor = new Color3(0.36, 0.27, 0.18);
  sun.intensity = 0.42;

  const ground = createBaseDistrict(scene, materials);
  createNileEdge(scene, materials);
  createResidentialStreet(scene, materials);
  createCraftsmenArea(scene, materials);
  createTemple(scene, materials);
  createRouteLine(scene, manifest, materials);

  const evidenceRoot = createEvidenceMarkers(scene, manifest, materials);
  evidenceRoot.setEnabled(false);

  const walkers = createAmbientWalkers(scene, materials);
  const smokeNodes = createSmoke(scene, materials);

  let autoplay = false;
  let evidenceVisible = false;
  let narratorEnabled = false;
  let elapsedSeconds = 0;
  let currentStop = firstStop;
  const stopListeners = new Set<StopListener>();
  const routePoints = manifest.stops.map((stop) => vectorFromTuple(stop.position));
  const routeDuration = Math.max(60, manifest.durationSeconds);

  scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;

    if (autoplay) {
      elapsedSeconds = Math.min(routeDuration, elapsedSeconds + deltaSeconds);
      const progress = elapsedSeconds / routeDuration;
      const position = sampleRoute(routePoints, progress);
      const lookAt = sampleRoute(routePoints, Math.min(1, progress + 0.02));
      camera.position.copyFrom(position);
      camera.position.y = 1.7;
      camera.setTarget(new Vector3(lookAt.x, 1.65, lookAt.z));

      if (elapsedSeconds >= routeDuration) {
        autoplay = false;
      }
    }

    updateWalkers(walkers, performance.now() / 1000);
    updateSmoke(smokeNodes, performance.now() / 1000);
    const nearestStop = findNearestStop(manifest.stops, camera.position);

    if (nearestStop.id !== currentStop.id) {
      currentStop = nearestStop;
      stopListeners.forEach((listener) => listener(currentStop));
    }
  });

  let xrPromise: ReturnType<Scene["createDefaultXRExperienceAsync"]> | undefined;

  return {
    scene,
    toggleAutoplay() {
      autoplay = !autoplay;
      return autoplay;
    },
    toggleEvidence() {
      evidenceVisible = !evidenceVisible;
      evidenceRoot.setEnabled(evidenceVisible);
      return evidenceVisible;
    },
    toggleNarrator() {
      narratorEnabled = !narratorEnabled;
      return narratorEnabled;
    },
    async enterVr() {
      if (!navigator.xr) {
        throw new Error("WebXR is not available in this browser. Try a WebXR-capable headset browser or use desktop mode.");
      }

      xrPromise ??= scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground]
      });
      const xr = await xrPromise;
      await xr.baseExperience.enterXRAsync("immersive-vr", "local-floor");
    },
    resetTour() {
      autoplay = false;
      elapsedSeconds = 0;
      const start = vectorFromTuple(firstStop.position);
      const lookAt = vectorFromTuple(firstStop.lookAt ?? firstStop.position);
      camera.position.copyFrom(start);
      camera.setTarget(lookAt);
      currentStop = firstStop;
      stopListeners.forEach((listener) => listener(currentStop));
    },
    onStopChanged(listener: StopListener) {
      stopListeners.add(listener);
      listener(currentStop);
      return () => stopListeners.delete(listener);
    }
  };
}

function createMaterials(scene: Scene): SceneMaterials {
  const sand = material(scene, "sand", Color3.FromHexString("#caa86f"));
  sand.specularColor = Color3.Black();

  const mudbrick = material(scene, "mudbrick", Color3.FromHexString("#8f6541"));
  const plaster = material(scene, "plaster", Color3.FromHexString("#ece1c7"));
  const reed = material(scene, "reed", Color3.FromHexString("#5c7d4b"));
  const wood = material(scene, "wood", Color3.FromHexString("#5b3828"));
  const linen = material(scene, "linen", Color3.FromHexString("#eee5cf"));
  const stone = material(scene, "whiteStone", Color3.FromHexString("#d8d0bc"));
  const shadow = material(scene, "deepShade", Color3.FromHexString("#2a2620"));
  shadow.alpha = 0.82;

  const river = material(scene, "river", Color3.FromHexString("#2b7f91"));
  river.alpha = 0.78;
  river.specularColor = Color3.FromHexString("#d7ffff");

  const smoke = material(scene, "smoke", Color3.FromHexString("#e4ded2"));
  smoke.alpha = 0.22;

  const paint = material(scene, "paintedWall", Color3.White());
  paint.diffuseTexture = createPaintedWallTexture(scene);

  return {
    sand,
    mudbrick,
    plaster,
    river,
    reed,
    wood,
    linen,
    stone,
    paint,
    shadow,
    smoke,
    evidence: {
      confirmed: material(scene, "evidenceConfirmed", Color3.FromHexString(evidenceColors.confirmed)),
      inferred: material(scene, "evidenceInferred", Color3.FromHexString(evidenceColors.inferred)),
      speculative: material(scene, "evidenceSpeculative", Color3.FromHexString(evidenceColors.speculative))
    }
  };
}

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.08, 0.07, 0.05);
  return mat;
}

function createPaintedWallTexture(scene: Scene): Texture {
  const texture = new DynamicTexture("paintedWallBands", { width: 1024, height: 512 }, scene, false);
  const ctx = texture.getContext();

  ctx.fillStyle = "#ead9ad";
  ctx.fillRect(0, 0, 1024, 512);

  const bands = ["#2d7792", "#b64b38", "#e5b94c", "#1e5f4d"];
  bands.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 54 + index * 32, 1024, 14);
  });

  for (let x = 44; x < 980; x += 116) {
    ctx.fillStyle = "#1e5f4d";
    ctx.fillRect(x, 230, 18, 128);
    ctx.beginPath();
    ctx.arc(x + 9, 208, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b64b38";
    ctx.fillRect(x - 20, 360, 58, 18);
  }

  ctx.fillStyle = "rgba(62, 43, 26, 0.34)";
  for (let x = 18; x < 1024; x += 64) {
    ctx.fillRect(x, 430, 32, 22);
  }

  texture.update();
  return texture;
}

function createBaseDistrict(scene: Scene, materials: SceneMaterials): Mesh {
  const ground = MeshBuilder.CreateGround("districtGround", { width: 96, height: 150, subdivisions: 8 }, scene);
  ground.material = materials.sand;
  ground.checkCollisions = true;
  return ground;
}

function createNileEdge(scene: Scene, materials: SceneMaterials): void {
  const river = MeshBuilder.CreateGround("nileRiver", { width: 42, height: 158, subdivisions: 8 }, scene);
  river.position.x = -48;
  river.position.y = 0.015;
  river.material = materials.river;

  for (let z = -66; z < 62; z += 7) {
    const reed = MeshBuilder.CreateCylinder(`reed-${z}`, { height: 1.6, diameter: 0.08 }, scene);
    reed.position = new Vector3(-27 + Math.sin(z) * 1.2, 0.8, z);
    reed.rotation.z = Math.sin(z * 0.2) * 0.18;
    reed.material = materials.reed;
  }

  for (let index = 0; index < 3; index += 1) {
    const boatRoot = new TransformNode(`boat-${index}`, scene);
    boatRoot.position = new Vector3(-43 - index * 4, 0.22, -38 + index * 31);

    const hull = MeshBuilder.CreateBox(`boat-hull-${index}`, { width: 5.4, depth: 1.2, height: 0.34 }, scene);
    hull.parent = boatRoot;
    hull.material = materials.wood;

    const mast = MeshBuilder.CreateCylinder(`boat-mast-${index}`, { height: 2.6, diameter: 0.08 }, scene);
    mast.position.y = 1.38;
    mast.parent = boatRoot;
    mast.material = materials.wood;

    const sail = MeshBuilder.CreatePlane(`boat-sail-${index}`, { width: 1.4, height: 1.8 }, scene);
    sail.position = new Vector3(0.52, 1.42, 0);
    sail.rotation.y = Math.PI / 2;
    sail.parent = boatRoot;
    sail.material = materials.linen;
  }
}

function createResidentialStreet(scene: Scene, materials: SceneMaterials): void {
  for (let index = 0; index < 9; index += 1) {
    const z = -30 + index * 5.6;
    createMudbrickHouse(scene, materials, new Vector3(-18, 1.45, z), new Vector3(7.5, 2.9, 4.2));
    createMudbrickHouse(scene, materials, new Vector3(-4, 1.2, z + 2.4), new Vector3(5.8, 2.4, 3.8));

    if (index % 2 === 0) {
      const awning = MeshBuilder.CreateBox(`awning-${index}`, { width: 5.6, height: 0.08, depth: 2.4 }, scene);
      awning.position = new Vector3(-10.8, 2.55, z + 1);
      awning.rotation.z = 0.08;
      awning.material = materials.linen;
    }
  }

  for (let index = 0; index < 12; index += 1) {
    const jar = MeshBuilder.CreateCylinder(`storageJar-${index}`, { height: 0.9, diameterTop: 0.46, diameterBottom: 0.34 }, scene);
    jar.position = new Vector3(-20 + (index % 4) * 1.4, 0.45, -22 + Math.floor(index / 4) * 11);
    jar.material = materials.mudbrick;
  }
}

function createMudbrickHouse(scene: Scene, materials: SceneMaterials, position: Vector3, size: Vector3): void {
  const house = MeshBuilder.CreateBox(`house-${position.x}-${position.z}`, {
    width: size.x,
    height: size.y,
    depth: size.z
  }, scene);
  house.position = position;
  house.material = materials.mudbrick;
  house.checkCollisions = true;

  const plasterBand = MeshBuilder.CreateBox(`house-plaster-${position.x}-${position.z}`, {
    width: size.x + 0.04,
    height: 0.32,
    depth: size.z + 0.04
  }, scene);
  plasterBand.position = new Vector3(position.x, position.y + size.y / 2 - 0.32, position.z);
  plasterBand.material = materials.plaster;
}

function createCraftsmenArea(scene: Scene, materials: SceneMaterials): void {
  for (let index = 0; index < 8; index += 1) {
    const table = MeshBuilder.CreateBox(`craftTable-${index}`, { width: 2.2, height: 0.18, depth: 1.1 }, scene);
    table.position = new Vector3(8 + (index % 2) * 5, 0.72, -2 + Math.floor(index / 2) * 5.6);
    table.material = materials.wood;

    const shade = MeshBuilder.CreateBox(`craftShade-${index}`, { width: 3.4, height: 0.08, depth: 2.4 }, scene);
    shade.position = new Vector3(table.position.x, 2.28, table.position.z);
    shade.material = materials.linen;
  }

  for (let index = 0; index < 6; index += 1) {
    const kiln = MeshBuilder.CreateCylinder(`kiln-${index}`, { height: 1.3, diameter: 1.25, tessellation: 18 }, scene);
    kiln.position = new Vector3(18, 0.65, -4 + index * 5.2);
    kiln.material = materials.mudbrick;
  }

  for (let index = 0; index < 18; index += 1) {
    const vessel = MeshBuilder.CreateCylinder(`freshPot-${index}`, {
      height: 0.62,
      diameterTop: 0.36,
      diameterBottom: 0.26,
      tessellation: 16
    }, scene);
    vessel.position = new Vector3(3 + (index % 6) * 1.2, 0.31, 7 + Math.floor(index / 6) * 1.2);
    vessel.material = materials.mudbrick;
  }
}

function createTemple(scene: Scene, materials: SceneMaterials): void {
  const court = MeshBuilder.CreateGround("templeCourt", { width: 26, height: 34 }, scene);
  court.position.z = 55;
  court.position.y = 0.03;
  court.material = materials.plaster;

  const leftPylon = MeshBuilder.CreateBox("leftPylon", { width: 8, height: 10, depth: 4.4 }, scene);
  leftPylon.position = new Vector3(-6.5, 5, 50);
  leftPylon.material = materials.stone;
  leftPylon.checkCollisions = true;

  const rightPylon = leftPylon.clone("rightPylon");
  rightPylon.position.x = 6.5;

  const lintel = MeshBuilder.CreateBox("templeLintel", { width: 18, height: 1.4, depth: 4.6 }, scene);
  lintel.position = new Vector3(0, 8.7, 50);
  lintel.material = materials.stone;

  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 4; index += 1) {
      const column = MeshBuilder.CreateCylinder(`forecourtColumn-${side}-${index}`, {
        height: 5.8,
        diameter: 1.05,
        tessellation: 24
      }, scene);
      column.position = new Vector3(side * 8.5, 2.9, 58 + index * 5.5);
      column.material = materials.stone;
      column.checkCollisions = true;
    }
  }

  const hallFloor = MeshBuilder.CreateGround("paintedHallFloor", { width: 22, height: 28 }, scene);
  hallFloor.position.z = 82;
  hallFloor.position.y = 0.04;
  hallFloor.material = materials.shadow;

  createPaintedWall(scene, materials, "paintedBackWall", new Vector3(0, 3.1, 96), new Vector3(22, 6.2, 0.22));
  createPaintedWall(scene, materials, "paintedLeftWall", new Vector3(-11, 3.1, 82), new Vector3(0.22, 6.2, 28));
  createPaintedWall(scene, materials, "paintedRightWall", new Vector3(11, 3.1, 82), new Vector3(0.22, 6.2, 28));

  for (let x = -6; x <= 6; x += 6) {
    for (let z = 75; z <= 89; z += 7) {
      const column = MeshBuilder.CreateCylinder(`interiorColumn-${x}-${z}`, {
        height: 6.2,
        diameter: 1.1,
        tessellation: 26
      }, scene);
      column.position = new Vector3(x, 3.1, z);
      column.material = materials.stone;
      column.checkCollisions = true;

      const capital = MeshBuilder.CreateCylinder(`interiorCapital-${x}-${z}`, {
        height: 0.6,
        diameterTop: 1.45,
        diameterBottom: 1.05,
        tessellation: 26
      }, scene);
      capital.position = new Vector3(x, 6.35, z);
      capital.material = materials.plaster;
    }
  }

  const altar = MeshBuilder.CreateBox("lowOfferingTable", { width: 3.8, height: 0.8, depth: 1.5 }, scene);
  altar.position = new Vector3(0, 0.4, 91);
  altar.material = materials.stone;
}

function createPaintedWall(scene: Scene, materials: SceneMaterials, name: string, position: Vector3, size: Vector3): void {
  const wall = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  wall.position = position;
  wall.material = materials.paint;
  wall.checkCollisions = true;
}

function createRouteLine(scene: Scene, manifest: TourManifest, materials: SceneMaterials): void {
  const points = manifest.stops.map((stop) => {
    const point = vectorFromTuple(stop.position);
    point.y = 0.08;
    return point;
  });
  const line = MeshBuilder.CreateLines("guidedRouteLine", { points }, scene);
  line.color = Color3.FromHexString("#2e6f7d");
  line.visibility = 0.42;
  line.material = materials.river;
}

function createEvidenceMarkers(scene: Scene, manifest: TourManifest, materials: SceneMaterials): TransformNode {
  const root = new TransformNode("evidenceMarkers", scene);

  manifest.stops.forEach((stop) => {
    const position = vectorFromTuple(stop.position);

    const marker = MeshBuilder.CreateSphere(`evidence-${stop.id}`, { diameter: 1.2, segments: 18 }, scene);
    marker.position = new Vector3(position.x, 2.8, position.z);
    marker.material = materials.evidence[stop.evidenceLevel];
    marker.parent = root;

    const ring = MeshBuilder.CreateTorus(`evidence-ring-${stop.id}`, {
      diameter: 3.1,
      thickness: 0.05,
      tessellation: 48
    }, scene);
    ring.position = new Vector3(position.x, 0.08, position.z);
    ring.rotation.x = Math.PI / 2;
    ring.material = materials.evidence[stop.evidenceLevel];
    ring.parent = root;
  });

  return root;
}

function createAmbientWalkers(scene: Scene, materials: SceneMaterials): WalkerRoutine[] {
  const routes: Array<[Vector3, Vector3]> = [
    [new Vector3(-24, 0, -32), new Vector3(-7, 0, -10)],
    [new Vector3(-11, 0, -2), new Vector3(-3, 0, 22)],
    [new Vector3(11, 0, 1), new Vector3(19, 0, 19)],
    [new Vector3(8, 0, 24), new Vector3(-5, 0, 38)],
    [new Vector3(-7, 0, 54), new Vector3(7, 0, 65)]
  ];

  return routes.map(([start, end], index) => {
    const root = new TransformNode(`ambientWalker-${index}`, scene);
    root.position = start.clone();

    const body = MeshBuilder.CreateCylinder(`walkerBody-${index}`, {
      height: 1.25,
      diameterTop: 0.38,
      diameterBottom: 0.45,
      tessellation: 14
    }, scene);
    body.position.y = 0.78;
    body.parent = root;
    body.material = index % 2 === 0 ? materials.linen : materials.plaster;

    const head = MeshBuilder.CreateSphere(`walkerHead-${index}`, { diameter: 0.34, segments: 14 }, scene);
    head.position.y = 1.57;
    head.parent = root;
    head.material = materials.mudbrick;

    return {
      root,
      start,
      end,
      speed: 0.25 + index * 0.04,
      phase: index * 1.7
    };
  });
}

function updateWalkers(walkers: WalkerRoutine[], time: number): void {
  walkers.forEach((walker) => {
    const mix = (Math.sin(time * walker.speed + walker.phase) + 1) / 2;
    const position = Vector3.Lerp(walker.start, walker.end, mix);
    walker.root.position.copyFrom(position);

    const direction = walker.end.subtract(walker.start);
    walker.root.rotation.y = Math.atan2(direction.x, direction.z) + (mix > 0.5 ? Math.PI : 0);
  });
}

function createSmoke(scene: Scene, materials: SceneMaterials): TransformNode[] {
  return Array.from({ length: 10 }, (_, index) => {
    const smoke = MeshBuilder.CreateSphere(`incenseSmoke-${index}`, { diameter: 0.72 + index * 0.06, segments: 12 }, scene);
    smoke.position = new Vector3((index % 2) * 0.5 - 0.25, 1.1 + index * 0.32, 90.5 + Math.sin(index) * 0.3);
    smoke.material = materials.smoke;
    smoke.isPickable = false;
    return smoke;
  });
}

function updateSmoke(nodes: TransformNode[], time: number): void {
  nodes.forEach((node, index) => {
    node.position.x = Math.sin(time * 0.45 + index) * 0.35;
    node.position.y = 1.1 + index * 0.32 + Math.sin(time * 0.7 + index) * 0.18;
    node.scaling.setAll(0.84 + Math.sin(time * 0.55 + index) * 0.08);
  });
}

function sampleRoute(points: Vector3[], progress: number): Vector3 {
  if (points.length === 1) {
    return points[0].clone();
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = smoothStep(scaled - index);
  return Vector3.Lerp(points[index], points[index + 1], local);
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function findNearestStop(stops: readonly TourStop[], position: Vector3): TourStop {
  return stops.reduce((nearest, stop) => {
    const nearestPoint = vectorFromTuple(nearest.position);
    const stopPoint = vectorFromTuple(stop.position);
    const nearestDistance = Vector3.DistanceSquared(position, nearestPoint);
    const stopDistance = Vector3.DistanceSquared(position, stopPoint);
    return stopDistance < nearestDistance ? stop : nearest;
  });
}

function vectorFromTuple(tuple: readonly [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}
