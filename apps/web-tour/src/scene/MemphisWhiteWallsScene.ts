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
  limestone: StandardMaterial;
  copper: StandardMaterial;
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
  const limestone = material(scene, "limestone", Color3.FromHexString("#cfc5ab"));
  const copper = material(scene, "copper", Color3.FromHexString("#9b6543"));
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
    limestone,
    copper,
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
  const river = MeshBuilder.CreateGround("nileBranch", { width: 32, height: 158, subdivisions: 8 }, scene);
  river.position.x = -53;
  river.position.y = 0.015;
  river.material = materials.river;

  const quay = MeshBuilder.CreateBox("riverLandingQuay", { width: 7, height: 0.34, depth: 17 }, scene);
  quay.position = new Vector3(-33.5, 0.17, -47);
  quay.material = materials.limestone;
  quay.checkCollisions = true;

  const ramp = MeshBuilder.CreateBox("landingRamp", { width: 5.8, height: 0.18, depth: 10 }, scene);
  ramp.position = new Vector3(-29.5, 0.09, -37);
  ramp.rotation.x = -0.04;
  ramp.material = materials.mudbrick;
  ramp.checkCollisions = true;

  for (let index = 0; index < 5; index += 1) {
    const post = MeshBuilder.CreateCylinder(`mooringPost-${index}`, { height: 1.05, diameter: 0.18, tessellation: 10 }, scene);
    post.position = new Vector3(-36.6, 0.52, -54 + index * 3.4);
    post.material = materials.wood;
  }

  for (let z = -66; z < 62; z += 7) {
    const reed = MeshBuilder.CreateCylinder(`reed-${z}`, { height: 1.6, diameter: 0.08 }, scene);
    reed.position = new Vector3(-36 + Math.sin(z) * 1.2, 0.8, z);
    reed.rotation.z = Math.sin(z * 0.2) * 0.18;
    reed.material = materials.reed;
  }

  for (let index = 0; index < 3; index += 1) {
    const boatRoot = new TransformNode(`boat-${index}`, scene);
    boatRoot.position = new Vector3(-47 - index * 4, 0.22, -52 + index * 29);

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

  for (let index = 0; index < 10; index += 1) {
    const jar = MeshBuilder.CreateCylinder(`landingJar-${index}`, {
      height: 0.68,
      diameterTop: 0.34,
      diameterBottom: 0.26,
      tessellation: 14
    }, scene);
    jar.position = new Vector3(-28 + (index % 5) * 0.9, 0.34, -51 + Math.floor(index / 5) * 2.5);
    jar.material = materials.mudbrick;
  }
}

function createResidentialStreet(scene: Scene, materials: SceneMaterials): void {
  createWhiteWallsThreshold(scene, materials);

  const drain = MeshBuilder.CreateBox("streetDrainageChannel", { width: 0.46, height: 0.08, depth: 44 }, scene);
  drain.position = new Vector3(-9.4, 0.055, -8);
  drain.material = materials.shadow;

  for (let index = 0; index < 8; index += 1) {
    const z = -26 + index * 5.8;
    createMudbrickHouse(scene, materials, new Vector3(-18.5, 1.25, z), new Vector3(7.2, 2.5, 4.1));
    createMudbrickHouse(scene, materials, new Vector3(-3.6, 1.12, z + 2.1), new Vector3(5.8, 2.24, 3.6));

    if (index % 2 === 0) {
      const awning = MeshBuilder.CreateBox(`awning-${index}`, { width: 5.6, height: 0.08, depth: 2.4 }, scene);
      awning.position = new Vector3(-10.6, 2.35, z + 1);
      awning.rotation.z = 0.08;
      awning.material = materials.linen;
    }

    if (index % 3 === 1) {
      createCourtyard(scene, materials, new Vector3(-14.8, 0.03, z + 2.6));
    }
  }

  for (let index = 0; index < 16; index += 1) {
    const jar = MeshBuilder.CreateCylinder(`storageJar-${index}`, { height: 0.9, diameterTop: 0.46, diameterBottom: 0.34 }, scene);
    jar.position = new Vector3(-21 + (index % 4) * 1.15, 0.45, -21 + Math.floor(index / 4) * 9.2);
    jar.material = materials.mudbrick;
  }

  const well = MeshBuilder.CreateCylinder("districtWell", { height: 0.74, diameter: 1.5, tessellation: 24 }, scene);
  well.position = new Vector3(-7, 0.37, 5);
  well.material = materials.limestone;

  const wellVoid = MeshBuilder.CreateCylinder("districtWellVoid", { height: 0.76, diameter: 0.82, tessellation: 24 }, scene);
  wellVoid.position = new Vector3(-7, 0.4, 5);
  wellVoid.material = materials.shadow;

  for (let index = 0; index < 5; index += 1) {
    const bin = MeshBuilder.CreateCylinder(`grainBin-${index}`, {
      height: 1.35,
      diameterTop: 1.25,
      diameterBottom: 1.05,
      tessellation: 16
    }, scene);
    bin.position = new Vector3(-22 + index * 1.7, 0.68, 21);
    bin.material = materials.plaster;
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

  const doorway = MeshBuilder.CreateBox(`house-doorway-${position.x}-${position.z}`, {
    width: 1.05,
    height: 1.55,
    depth: 0.08
  }, scene);
  doorway.position = new Vector3(position.x + size.x / 2 + 0.03, 0.78, position.z - size.z * 0.2);
  doorway.material = materials.shadow;
}

function createWhiteWallsThreshold(scene: Scene, materials: SceneMaterials): void {
  const wallSpecs = [
    { name: "whiteWallWestSegment", position: new Vector3(-35.5, 2.1, -33), size: new Vector3(13, 4.2, 1.2) },
    { name: "whiteWallEastSegment", position: new Vector3(-6, 2.1, -33), size: new Vector3(24, 4.2, 1.2) }
  ];

  wallSpecs.forEach((spec) => {
    const wall = MeshBuilder.CreateBox(spec.name, {
      width: spec.size.x,
      height: spec.size.y,
      depth: spec.size.z
    }, scene);
    wall.position = spec.position;
    wall.material = materials.plaster;
    wall.checkCollisions = true;

    const base = MeshBuilder.CreateBox(`${spec.name}MudbrickCore`, {
      width: spec.size.x,
      height: 0.8,
      depth: spec.size.z + 0.12
    }, scene);
    base.position = new Vector3(spec.position.x, 0.4, spec.position.z);
    base.material = materials.mudbrick;
  });

  const gateLintel = MeshBuilder.CreateBox("whiteWallGateLintel", { width: 10, height: 0.55, depth: 1.35 }, scene);
  gateLintel.position = new Vector3(-23.2, 3.35, -33);
  gateLintel.material = materials.plaster;

  const guardStore = MeshBuilder.CreateBox("riverGateStorehouse", { width: 5.2, height: 2.5, depth: 4.6 }, scene);
  guardStore.position = new Vector3(-31.5, 1.25, -26.5);
  guardStore.material = materials.mudbrick;
  guardStore.checkCollisions = true;
}

function createCourtyard(scene: Scene, materials: SceneMaterials, position: Vector3): void {
  const floor = MeshBuilder.CreateBox(`courtyardFloor-${position.z}`, { width: 4.3, height: 0.06, depth: 3.6 }, scene);
  floor.position = position;
  floor.material = materials.plaster;

  const hearth = MeshBuilder.CreateCylinder(`courtyardHearth-${position.z}`, { height: 0.16, diameter: 0.95, tessellation: 18 }, scene);
  hearth.position = new Vector3(position.x - 1.1, 0.16, position.z + 0.5);
  hearth.material = materials.shadow;
}

function createCraftsmenArea(scene: Scene, materials: SceneMaterials): void {
  for (let index = 0; index < 8; index += 1) {
    const table = MeshBuilder.CreateBox(`craftTable-${index}`, { width: 2.2, height: 0.18, depth: 1.1 }, scene);
    table.position = new Vector3(8 + (index % 2) * 5, 0.72, 2 + Math.floor(index / 2) * 5.6);
    table.material = materials.wood;

    const shade = MeshBuilder.CreateBox(`craftShade-${index}`, { width: 3.4, height: 0.08, depth: 2.4 }, scene);
    shade.position = new Vector3(table.position.x, 2.28, table.position.z);
    shade.material = materials.linen;
  }

  for (let index = 0; index < 6; index += 1) {
    const kiln = MeshBuilder.CreateCylinder(`kiln-${index}`, { height: 1.3, diameter: 1.25, tessellation: 18 }, scene);
    kiln.position = new Vector3(18, 0.65, 0 + index * 5.2);
    kiln.material = materials.mudbrick;
  }

  for (let index = 0; index < 18; index += 1) {
    const vessel = MeshBuilder.CreateCylinder(`freshPot-${index}`, {
      height: 0.62,
      diameterTop: 0.36,
      diameterBottom: 0.26,
      tessellation: 16
    }, scene);
    vessel.position = new Vector3(3 + (index % 6) * 1.2, 0.31, 14 + Math.floor(index / 6) * 1.2);
    vessel.material = materials.mudbrick;
  }

  const stoneBlock = MeshBuilder.CreateBox("stoneDressingBlock", { width: 2.4, height: 0.7, depth: 1.2 }, scene);
  stoneBlock.position = new Vector3(11.5, 0.35, 28);
  stoneBlock.material = materials.limestone;

  for (let index = 0; index < 4; index += 1) {
    const tool = MeshBuilder.CreateBox(`copperTool-${index}`, { width: 0.12, height: 0.08, depth: 1.1 }, scene);
    tool.position = new Vector3(8.6 + index * 0.5, 0.86, 19);
    tool.rotation.y = 0.4 + index * 0.2;
    tool.material = materials.copper;
  }
}

function createTemple(scene: Scene, materials: SceneMaterials): void {
  const outerCourt = MeshBuilder.CreateGround("ptahPrecinctCourt", { width: 28, height: 44 }, scene);
  outerCourt.position.z = 69;
  outerCourt.position.y = 0.03;
  outerCourt.material = materials.plaster;

  createPrecinctWall(scene, materials, "ptahFrontWallWest", new Vector3(-8.5, 2.05, 48), new Vector3(11, 4.1, 1.4));
  createPrecinctWall(scene, materials, "ptahFrontWallEast", new Vector3(8.5, 2.05, 48), new Vector3(11, 4.1, 1.4));
  createPrecinctWall(scene, materials, "ptahWestWall", new Vector3(-14, 2.05, 70), new Vector3(1.4, 4.1, 45));
  createPrecinctWall(scene, materials, "ptahEastWall", new Vector3(14, 2.05, 70), new Vector3(1.4, 4.1, 45));
  createPrecinctWall(scene, materials, "ptahBackWall", new Vector3(0, 2.05, 92), new Vector3(28, 4.1, 1.4));

  const gateLintel = MeshBuilder.CreateBox("ptahPrecinctGateLintel", { width: 7.2, height: 0.55, depth: 1.5 }, scene);
  gateLintel.position = new Vector3(0, 3.5, 48);
  gateLintel.material = materials.plaster;

  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 3; index += 1) {
      const post = MeshBuilder.CreateCylinder(`ptahCourtTimberPost-${side}-${index}`, {
        height: 3.2,
        diameter: 0.34,
        tessellation: 12
      }, scene);
      post.position = new Vector3(side * 5.8, 1.6, 57 + index * 6.2);
      post.material = materials.wood;
      post.checkCollisions = true;
    }
  }

  const processionalStrip = MeshBuilder.CreateBox("ptahPackedEarthAxis", { width: 4.2, height: 0.07, depth: 37 }, scene);
  processionalStrip.position = new Vector3(0, 0.08, 67);
  processionalStrip.material = materials.limestone;

  const shrineCourt = MeshBuilder.CreateGround("ptahInnerShrineFloor", { width: 18, height: 18 }, scene);
  shrineCourt.position.z = 84;
  shrineCourt.position.y = 0.04;
  shrineCourt.material = materials.shadow;

  createPaintedWall(scene, materials, "paintedBackWall", new Vector3(0, 2.7, 94), new Vector3(17, 5.4, 0.28));
  createPaintedWall(scene, materials, "paintedLeftWall", new Vector3(-8.5, 2.7, 85), new Vector3(0.28, 5.4, 18));
  createPaintedWall(scene, materials, "paintedRightWall", new Vector3(8.5, 2.7, 85), new Vector3(0.28, 5.4, 18));

  const roof = MeshBuilder.CreateBox("ptahShrineFlatRoof", { width: 17.4, height: 0.42, depth: 18.5 }, scene);
  roof.position = new Vector3(0, 5.65, 85);
  roof.material = materials.wood;

  for (let x = -5.2; x <= 5.2; x += 5.2) {
    for (let z = 79; z <= 88; z += 9) {
      const pier = MeshBuilder.CreateBox(`earlyShrinePier-${x}-${z}`, {
        width: 0.82,
        height: 4.5,
        depth: 0.82
      }, scene);
      pier.position = new Vector3(x, 2.25, z);
      pier.material = materials.limestone;
      pier.checkCollisions = true;
    }
  }

  const altar = MeshBuilder.CreateBox("lowOfferingTable", { width: 3.8, height: 0.8, depth: 1.5 }, scene);
  altar.position = new Vector3(0, 0.4, 89);
  altar.material = materials.limestone;

  const cultBlock = MeshBuilder.CreateBox("ptahCultFocusBlock", { width: 1.4, height: 1.8, depth: 0.9 }, scene);
  cultBlock.position = new Vector3(0, 0.9, 93);
  cultBlock.material = materials.stone;
}

function createPrecinctWall(scene: Scene, materials: SceneMaterials, name: string, position: Vector3, size: Vector3): void {
  const wall = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  wall.position = position;
  wall.material = materials.plaster;
  wall.checkCollisions = true;

  const mudbrickBase = MeshBuilder.CreateBox(`${name}MudbrickBase`, {
    width: size.x + 0.05,
    height: 1,
    depth: size.z + 0.05
  }, scene);
  mudbrickBase.position = new Vector3(position.x, 0.5, position.z);
  mudbrickBase.material = materials.mudbrick;
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
