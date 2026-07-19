import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  SceneLoader,
  Texture,
  TransformNode,
  UniversalCamera,
  Vector3
} from "@babylonjs/core";
import type { EvidenceLevel, TourManifest, TourStop } from "@egyptvr/shared-scene";
import { evidenceColors } from "@egyptvr/shared-scene";
import cameraLockData from "../../../../content/scene-data/hero-street.camera-lock.json";

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
const textureRoot = "/assets/generated/textures/";
const audioRoot = "/assets/generated/audio/";
const glbRoot = "/assets/generated/glb/";

interface GuidedRoutePoint {
  id: string;
  position: Vector3;
  lookAt?: Vector3;
  stopId?: string;
}

interface GuidedRouteSegment {
  start: GuidedRoutePoint;
  end: GuidedRoutePoint;
  startDistance: number;
  length: number;
  direction: Vector3;
}

interface GuidedRouteTrack {
  points: GuidedRoutePoint[];
  segments: GuidedRouteSegment[];
  totalLength: number;
}

// Hero Street v2 placement lock. Keep these paired with the route stops and
// docs/design/hero-street-v2-layout-lock.md; move the road and GLB street as one unit.
const heroStreetOffsetX = -16.5;
const heroStreetCenterX = -6;

interface CameraShotBookmark {
  id: string;
  label: string;
  role: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  locked: boolean;
  notes: string[];
}

interface CameraLock {
  activeShotId: string;
  shots: CameraShotBookmark[];
}

const cameraLock = cameraLockData as unknown as CameraLock;
const cameraShotBookmarks: Record<string, CameraShotBookmark> = Object.fromEntries(
  cameraLock.shots.map((shot) => [shot.id, shot])
);

const canonicalCameraShotId = cameraLock.activeShotId;

interface SceneMaterials {
  sand: PBRMaterial;
  heroGround: PBRMaterial;
  mudbrick: PBRMaterial;
  plaster: PBRMaterial;
  river: PBRMaterial;
  reed: PBRMaterial;
  wood: PBRMaterial;
  linen: PBRMaterial;
  stone: PBRMaterial;
  limestone: PBRMaterial;
  copper: PBRMaterial;
  paint: PBRMaterial;
  shadow: PBRMaterial;
  contactShadow: PBRMaterial;
  dust: PBRMaterial;
  pottery: PBRMaterial;
  skin: PBRMaterial;
  smoke: PBRMaterial;
  ember: PBRMaterial;
  evidence: Record<EvidenceLevel, PBRMaterial>;
}

interface WalkerRoutine {
  root: TransformNode;
  start: Vector3;
  end: Vector3;
  speed: number;
  phase: number;
  parts: WalkerParts;
}

interface WalkerParts {
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  carriedLoad?: TransformNode;
}

interface BirdRoutine {
  root: TransformNode;
  radius: number;
  height: number;
  speed: number;
  phase: number;
}

interface CinematicHumanRoutine {
  root: TransformNode;
  basePosition: Vector3;
  pose: "carrier" | "worker" | "seated";
  phase: number;
  arms: TransformNode[];
  legs: TransformNode[];
  carriedLoad?: TransformNode;
}

interface GlbActorMotionRoutine {
  root: TransformNode;
  start: Vector3;
  end: Vector3;
  speed: number;
  phase: number;
  yawForward: number;
  yawBackward: number;
}

interface Soundscape {
  setEnabled(enabled: boolean): void;
}

interface AmbientLoop {
  fileName: string;
  volume: number;
  element?: HTMLAudioElement;
}

interface ModularAssetKitManifest {
  id: string;
  assets: ModularAssetEntry[];
}

interface ModularAssetEntry {
  id: string;
  fileName: string;
  label: string;
  category: "nile-arrival" | "residential-street";
  evidenceLevel: EvidenceLevel;
  runtimeAssetId: string;
}

interface ModularAssetPlacement {
  assetId: string;
  name: string;
  position: Vector3;
  rotationY?: number;
  scale?: number;
  collides?: boolean;
  animated?: boolean;
}

interface ModularAssetLoadResult {
  heroStreetLoaded: boolean;
  actorMotions: GlbActorMotionRoutine[];
}

export async function createMemphisWhiteWallsScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  manifest: TourManifest
): Promise<MemphisSceneController> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.55, 0.57, 0.53, 1);
  scene.ambientColor = new Color3(0.46, 0.39, 0.31);
  scene.fogColor = Color3.FromHexString("#a98054");
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0024;
  scene.collisionsEnabled = true;
  scene.imageProcessingConfiguration.exposure = 0.78;
  scene.imageProcessingConfiguration.contrast = 1.42;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.vignetteEnabled = true;
  scene.imageProcessingConfiguration.vignetteWeight = 1.18;
  scene.imageProcessingConfiguration.vignetteColor = new Color4(0.31, 0.22, 0.14, 1);

  const materials = createMaterials(scene);
  createSkyDome(scene);
  const firstStop = manifest.stops[0];
  const camera = new UniversalCamera("visitorCamera", vectorFromTuple(firstStop.position), scene);
  camera.setTarget(vectorFromTuple(firstStop.lookAt ?? firstStop.position));
  camera.attachControl(canvas, true);
  camera.speed = 0.34;
  camera.angularSensibility = 3600;
  camera.minZ = 0.04;
  camera.ellipsoid = new Vector3(0.45, 0.8, 0.45);
  camera.checkCollisions = true;
  applyCameraShotBookmark(camera);

  const skyLight = new HemisphericLight("skyLight", new Vector3(0, 1, 0), scene);
  skyLight.diffuse = Color3.FromHexString("#caa878");
  skyLight.groundColor = Color3.FromHexString("#3f3026");
  skyLight.intensity = 0.42;

  const sun = new DirectionalLight("lowGoldSun", new Vector3(-0.46, -0.86, 0.24), scene);
  sun.position = new Vector3(52, 74, -82);
  sun.diffuse = Color3.FromHexString("#ffc073");
  sun.specular = Color3.FromHexString("#d8b77f");
  sun.intensity = 2.12;

  const shrineGlow = new PointLight("shrineOilLampGlow", new Vector3(0, 2.2, 90), scene);
  shrineGlow.diffuse = Color3.FromHexString("#f2a451");
  shrineGlow.intensity = 0.56;
  shrineGlow.range = 17;

  const routeTrack = createGuidedRouteTrack(manifest);
  const ground = createBaseDistrict(scene, materials);
  createNileEdge(scene, materials);
  createResidentialStreet(scene, materials);
  createCraftsmenArea(scene, materials);
  createTemple(scene, materials);
  createRouteLine(scene, routeTrack.points);
  const modularAssets = await loadModularAssetKit(scene);
  if (modularAssets.heroStreetLoaded) {
    hideLegacyHeroStreetScaffold(scene);
    createHeroStreetCollisionGuides(scene);
  }
  const cinematicHumans = modularAssets.heroStreetLoaded ? [] : createHeroStreetV2FilmSet(scene, materials);
  const glbActorMotions = modularAssets.actorMotions;

  const evidenceRoot = createEvidenceMarkers(scene, manifest, materials);
  evidenceRoot.setEnabled(false);

  const walkers: WalkerRoutine[] = [];
  const smokeNodes = createSmoke(scene, materials);
  const birds = createBirds(scene, materials);
  const soundscape = createSoundscape(scene);

  let autoplay = false;
  let evidenceVisible = false;
  let narratorEnabled = false;
  let elapsedSeconds = 0;
  let currentStop = firstStop;
  const stopListeners = new Set<StopListener>();
  const routeDuration = Math.max(60, manifest.durationSeconds);

  scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;

    if (autoplay) {
      elapsedSeconds = Math.min(routeDuration, elapsedSeconds + deltaSeconds);
      const progress = elapsedSeconds / routeDuration;
      const routeSample = sampleGuidedRoute(routeTrack, progress);
      camera.position.copyFrom(routeSample.position);
      camera.position.y = 1.7;
      camera.setTarget(new Vector3(routeSample.lookAt.x, routeSample.lookAt.y, routeSample.lookAt.z));

      if (elapsedSeconds >= routeDuration) {
        autoplay = false;
      }
    }

    const time = performance.now() / 1000;
    updateWalkers(walkers, time);
    updateSmoke(smokeNodes, time);
    updateBirds(birds, time);
    updateCinematicHumans(cinematicHumans, time);
    updateGlbActorMotions(glbActorMotions, time);
    animateMaterials(materials, time);
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
      soundscape.setEnabled(narratorEnabled);
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
      const startPoint = routeTrack.points[0] ?? {
        id: firstStop.id,
        position: vectorFromTuple(firstStop.position),
        lookAt: vectorFromTuple(firstStop.lookAt ?? firstStop.position),
        stopId: firstStop.id
      };
      const start = startPoint.position;
      const lookAt = startPoint.lookAt ?? vectorFromTuple(firstStop.lookAt ?? firstStop.position);
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
  const sand = material(scene, "sand", "#a97945", {
    textureName: "sand-grain.jpg",
    uScale: 8,
    vScale: 12,
    roughness: 0.96,
    bump: true,
    bumpLevel: 0.08
  });
  const mudbrick = material(scene, "mudbrick", "#65412a", {
    textureName: "mudbrick-pbr.jpg",
    uScale: 2.25,
    vScale: 2.25,
    roughness: 0.96,
    bump: true,
    bumpLevel: 0.14
  });
  const heroGround = material(scene, "heroStreetGround", "#956036", {
    textureName: "hero-street-ground.jpg",
    bumpTextureName: "hero-street-normal.jpg",
    ambientTextureName: "hero-street-ao.jpg",
    lightmapTextureName: "hero-street-lightmap.jpg",
    uScale: 0.36,
    vScale: 0.82,
    lightmapUScale: 1,
    lightmapVScale: 1,
    ambientTextureStrength: 0.92,
    lightmapLevel: 0.86,
    useLightmapAsShadowmap: true,
    roughness: 0.98,
    bump: true,
    bumpLevel: 0.105
  });
  const plaster = material(scene, "plaster", "#bba883", {
    textureName: "plaster-aged.jpg",
    uScale: 1.55,
    vScale: 1.55,
    roughness: 0.95,
    bump: true,
    bumpLevel: 0.075
  });
  const reed = material(scene, "reed", "#5c7d4b", {
    textureName: "reed-bundle.jpg",
    uScale: 1.7,
    vScale: 2.8,
    roughness: 0.86
  });
  const wood = material(scene, "wood", "#5b3828", {
    textureName: "acacia-wood.jpg",
    uScale: 1.5,
    vScale: 3,
    roughness: 0.72,
    bump: true,
    bumpLevel: 0.06
  });
  const linen = material(scene, "linen", "#d3c49f", {
    textureName: "woven-linen.jpg",
    uScale: 2.6,
    vScale: 2.6,
    roughness: 0.97,
    bump: true,
    bumpLevel: 0.045
  });
  const stone = material(scene, "whiteStone", "#c8bea7", {
    textureName: "limestone-cut.jpg",
    uScale: 1.4,
    vScale: 1.4,
    roughness: 0.82
  });
  const limestone = material(scene, "limestone", "#beb296", {
    textureName: "limestone-cut.jpg",
    uScale: 1.7,
    vScale: 1.7,
    roughness: 0.78,
    bump: true,
    bumpLevel: 0.04
  });
  const copper = material(scene, "copper", "#9b6543", {
    textureName: "worn-copper.jpg",
    roughness: 0.48,
    metallic: 0.62
  });
  const shadow = material(scene, "deepShade", "#17120d", {
    alpha: 0.88,
    roughness: 1
  });
  const contactShadow = material(scene, "softContactShadow", "#17110c", {
    alpha: 0.52,
    roughness: 1
  });
  contactShadow.backFaceCulling = false;
  const dust = material(scene, "powderyStreetDust", "#8f5d36", {
    textureName: "hero-street-ground.jpg",
    bumpTextureName: "hero-street-normal.jpg",
    uScale: 0.34,
    vScale: 0.78,
    roughness: 0.98,
    bump: true,
    bumpLevel: 0.055
  });
  const pottery = material(scene, "warmPotteryClay", "#914624", {
    textureName: "mudbrick-pbr.jpg",
    uScale: 1.8,
    vScale: 1.8,
    roughness: 0.9,
    bump: true,
    bumpLevel: 0.035
  });
  const skin = material(scene, "warmSkinPlaceholder", "#8b5634", {
    roughness: 0.74
  });

  const river = material(scene, "river", "#2b7f91", {
    textureName: "nile-water.jpg",
    uScale: 3,
    vScale: 8,
    alpha: 0.82,
    roughness: 0.18
  });

  const smoke = material(scene, "smoke", "#c9aa82", {
    alpha: 0.115,
    roughness: 1,
    emissive: Color3.FromHexString("#51483d")
  });
  smoke.backFaceCulling = false;

  const ember = material(scene, "kilnEmber", "#e36b32", {
    roughness: 0.55,
    emissive: Color3.FromHexString("#f16f35")
  });

  const paint = material(scene, "paintedWall", "#ffffff", {
    textureName: "painted-relief-wall.jpg",
    uScale: 1.05,
    vScale: 1,
    roughness: 0.72,
    bump: true,
    bumpLevel: 0.025
  });

  return {
    sand,
    heroGround,
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
    contactShadow,
    dust,
    pottery,
    skin,
    smoke,
    ember,
    evidence: {
      confirmed: material(scene, "evidenceConfirmed", evidenceColors.confirmed, {
        emissive: Color3.FromHexString(evidenceColors.confirmed)
      }),
      inferred: material(scene, "evidenceInferred", evidenceColors.inferred, {
        emissive: Color3.FromHexString(evidenceColors.inferred)
      }),
      speculative: material(scene, "evidenceSpeculative", evidenceColors.speculative, {
        emissive: Color3.FromHexString(evidenceColors.speculative)
      })
    }
  };
}

interface MaterialOptions {
  textureName?: string;
  bumpTextureName?: string;
  ambientTextureName?: string;
  lightmapTextureName?: string;
  uScale?: number;
  vScale?: number;
  lightmapUScale?: number;
  lightmapVScale?: number;
  lightmapLevel?: number;
  roughness?: number;
  metallic?: number;
  alpha?: number;
  bump?: boolean;
  bumpLevel?: number;
  emissive?: Color3;
  ambientTextureStrength?: number;
  useLightmapAsShadowmap?: boolean;
}

function material(scene: Scene, name: string, color: string, options: MaterialOptions = {}): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = Color3.FromHexString(color);
  mat.metallic = options.metallic ?? 0;
  mat.roughness = options.roughness ?? 0.82;
  mat.environmentIntensity = 0.48;

  if (options.textureName) {
    mat.albedoTexture = createTiledTexture(scene, options.textureName, options.uScale ?? 1, options.vScale ?? 1);
  }

  if (options.bump && (options.bumpTextureName || options.textureName)) {
    mat.bumpTexture = createTiledTexture(scene, options.bumpTextureName ?? options.textureName!, options.uScale ?? 1, options.vScale ?? 1);
    mat.bumpTexture.level = options.bumpLevel ?? 0.05;
  }

  if (options.ambientTextureName) {
    mat.ambientTexture = createTiledTexture(scene, options.ambientTextureName, options.uScale ?? 1, options.vScale ?? 1);
    mat.ambientTextureStrength = options.ambientTextureStrength ?? 1;
  }

  if (options.lightmapTextureName) {
    mat.lightmapTexture = createTiledTexture(
      scene,
      options.lightmapTextureName,
      options.lightmapUScale ?? 1,
      options.lightmapVScale ?? 1
    );
    mat.lightmapTexture.level = options.lightmapLevel ?? 1;
    mat.useLightmapAsShadowmap = options.useLightmapAsShadowmap ?? true;
  }

  if (options.alpha !== undefined) {
    mat.alpha = options.alpha;
  }

  if (options.emissive) {
    mat.emissiveColor = options.emissive;
  }

  return mat;
}

function createTiledTexture(scene: Scene, fileName: string, uScale: number, vScale: number): Texture {
  const texture = new Texture(`${textureRoot}${fileName}`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
  texture.uScale = uScale;
  texture.vScale = vScale;
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  return texture;
}

function createSkyDome(scene: Scene): void {
  const sky = MeshBuilder.CreateSphere("goldenDesertSky", { diameter: 220, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  const mat = new PBRMaterial("goldenDesertSkyMaterial", scene);
  mat.unlit = true;
  mat.albedoColor = Color3.FromHexString("#9fa8a2");
  mat.emissiveColor = Color3.FromHexString("#7c6649");
  mat.backFaceCulling = false;
  sky.material = mat;
  sky.isPickable = false;
}

function hideLegacyHeroStreetScaffold(scene: Scene): void {
  ["heroStreetGroundDetail", "streetDrainageChannel"].forEach((meshName) => {
    scene.getMeshByName(meshName)?.setEnabled(false);
  });
}

function createHeroStreetCollisionGuides(scene: Scene): void {
  const guideSpecs = [
    {
      name: "heroStreetLeftCollisionRail",
      position: new Vector3(heroStreetCenterX - 4.95, 1.28, 4),
      size: new Vector3(0.72, 2.56, 70)
    },
    {
      name: "heroStreetRightCollisionRail",
      position: new Vector3(heroStreetCenterX + 4.95, 1.28, 4),
      size: new Vector3(0.72, 2.56, 70)
    }
  ];

  guideSpecs.forEach(({ name, position, size }) => {
    const guide = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    guide.position = position;
    guide.checkCollisions = true;
    guide.isPickable = false;
    guide.isVisible = false;
  });
}

function createGlbActorMotionRoutines(root: TransformNode): GlbActorMotionRoutine[] {
  return [
    createGlbActorMotion(root, "actorHeroCarrier", new Vector3(0, 0, 5.8), 0.24, 0.2),
    createGlbActorMotion(root, "actorHeroStreetWalker", new Vector3(0, 0, -7.4), 0.3, 1.4)
  ].filter((routine): routine is GlbActorMotionRoutine => Boolean(routine));
}

function createGlbActorMotion(
  root: TransformNode,
  actorName: string,
  travel: Vector3,
  speed: number,
  phase: number
): GlbActorMotionRoutine | undefined {
  const actorRoot = root.getChildTransformNodes(false).find((node) => node.name.endsWith(actorName));

  if (!actorRoot) {
    return undefined;
  }

  const baseRotation = actorRoot.rotationQuaternion?.toEulerAngles() ?? actorRoot.rotation;
  actorRoot.rotationQuaternion = null;

  return {
    root: actorRoot,
    start: actorRoot.position.clone(),
    end: actorRoot.position.add(travel),
    speed,
    phase,
    yawForward: baseRotation.y,
    yawBackward: baseRotation.y + Math.PI
  };
}

async function loadModularAssetKit(scene: Scene): Promise<ModularAssetLoadResult> {
  try {
    const response = await fetch(`${glbRoot}asset-kit.manifest.json`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = (await response.json()) as ModularAssetKitManifest;
    const entriesById = new Map(manifest.assets.map((entry) => [entry.id, entry]));
    const placements = createModularAssetPlacements();
    const containers = new Map<string, Awaited<ReturnType<typeof SceneLoader.LoadAssetContainerAsync>>>();
    let heroStreetLoaded = false;
    const actorMotions: GlbActorMotionRoutine[] = [];

    await Promise.all(
      [...new Set(placements.map((placement) => placement.assetId))].map(async (assetId) => {
        const entry = entriesById.get(assetId);

        if (!entry) {
          console.warn(`Memphis GLB asset "${assetId}" is missing from the asset-kit manifest.`);
          return;
        }

        const container = await SceneLoader.LoadAssetContainerAsync(glbRoot, entry.fileName, scene);
        containers.set(assetId, container);
      })
    );

    for (const placement of placements) {
      const entry = entriesById.get(placement.assetId);
      const container = containers.get(placement.assetId);

      if (!entry || !container) {
        continue;
      }

      const instance = container.instantiateModelsToScene((sourceName) => `${placement.name}-${sourceName}`, false);
      const root = new TransformNode(placement.name, scene);
      root.metadata = {
        category: entry.category,
        evidenceLevel: entry.evidenceLevel,
        runtimeAssetId: entry.runtimeAssetId
      };

      for (const node of instance.rootNodes) {
        node.parent = root;
      }

      root.position.copyFrom(placement.position);
      root.rotation.y = placement.rotationY ?? 0;
      root.scaling.setAll(placement.scale ?? 1);

      for (const mesh of root.getChildMeshes(false)) {
        mesh.checkCollisions = false;
        mesh.isPickable = false;

        if (placement.assetId === "hero-street-corridor" && /heroV2Low(ForegroundCanopy|Canopy)/.test(mesh.name)) {
          mesh.setEnabled(false);
          continue;
        }

        if (!placement.animated) {
          mesh.freezeWorldMatrix();
        }
      }

      if (placement.assetId === "hero-street-corridor") {
        heroStreetLoaded = true;
      }

      if (placement.animated && "animationGroups" in instance) {
        instance.rootNodes.forEach((node, index) => {
          if (placement.assetId === "animated-street-actors" && index > 2) {
            node.setEnabled(false);
          }
        });

        instance.animationGroups?.forEach((group, index) => {
          group.speedRatio = 0.82 + index * 0.04;
          group.start(true);
        });

        if (placement.assetId === "animated-street-actors") {
          actorMotions.push(...createGlbActorMotionRoutines(root));
        }
      }
    }

    return { heroStreetLoaded, actorMotions };
  } catch (error) {
    console.warn("Memphis modular GLB asset kit could not be loaded.", error);
    return { heroStreetLoaded: false, actorMotions: [] };
  }
}

function createModularAssetPlacements(): ModularAssetPlacement[] {
  return [
    {
      assetId: "nile-boat-large",
      name: "glbNileBoatLandingMain",
      position: new Vector3(-47.4, 0.16, -51.6),
      rotationY: 0.06,
      scale: 1.12
    },
    {
      assetId: "nile-boat-large",
      name: "glbNileBoatMooredNorth",
      position: new Vector3(-51.8, 0.13, -24),
      rotationY: -0.18,
      scale: 0.82
    },
    {
      assetId: "nile-boat-large",
      name: "glbNileBoatMooredSouth",
      position: new Vector3(-49.6, 0.12, 23.5),
      rotationY: 0.14,
      scale: 0.9
    },
    ...[-63, -43, -23, -3, 17, 37, 57].map((z, index) => ({
      assetId: "reed-bank-cluster",
      name: `glbReedBank-${index}`,
      position: new Vector3(-36.1 + (index % 2) * 0.5, 0, z),
      rotationY: index * 0.38,
      scale: 0.82 + (index % 3) * 0.08
    })),
    {
      assetId: "hero-street-corridor",
      name: "glbHeroStreetCorridor",
      position: new Vector3(heroStreetOffsetX, 0, 0),
      rotationY: 0,
      scale: 1,
      collides: true
    },
    {
      assetId: "animated-street-actors",
      name: "glbAnimatedStreetActors",
      position: new Vector3(heroStreetOffsetX, 0, 0),
      rotationY: 0,
      scale: 1,
      animated: true
    }
  ];
}

function animateMaterials(materials: SceneMaterials, time: number): void {
  const waterTexture = materials.river.albedoTexture;
  if (waterTexture instanceof Texture) {
    waterTexture.uOffset = time * 0.012;
    waterTexture.vOffset = Math.sin(time * 0.12) * 0.035;
  }

  materials.river.alpha = 0.78 + Math.sin(time * 0.7) * 0.035;
}

function createBaseDistrict(scene: Scene, materials: SceneMaterials): Mesh {
  const ground = MeshBuilder.CreateGround("districtGround", { width: 96, height: 150, subdivisions: 16 }, scene);
  ground.material = materials.sand;
  ground.checkCollisions = true;

  for (let index = 0; index < 7; index += 1) {
    const mound = MeshBuilder.CreateSphere(`distantSandMound-${index}`, {
      diameterX: 18 + index * 2,
      diameterY: 1.8 + (index % 2) * 0.7,
      diameterZ: 7 + (index % 3) * 2,
      segments: 12
    }, scene);
    mound.position = new Vector3(18 + index * 9, -0.45, -62 + index * 19);
    mound.rotation.y = index * 0.42;
    mound.material = materials.sand;
    mound.isPickable = false;
  }

  return ground;
}

function createNileEdge(scene: Scene, materials: SceneMaterials): void {
  const river = MeshBuilder.CreateGround("nileBranch", { width: 32, height: 158, subdivisions: 8 }, scene);
  river.position.x = -53;
  river.position.y = 0.015;
  river.material = materials.river;

  const wetBank = MeshBuilder.CreateGround("wetNileBank", { width: 8, height: 158, subdivisions: 4 }, scene);
  wetBank.position.x = -35.8;
  wetBank.position.y = 0.025;
  wetBank.material = materials.reed;

  for (let index = 0; index < 9; index += 1) {
    createWaterHighlight(scene, materials, new Vector3(-55 + Math.sin(index) * 5, 0.035, -64 + index * 15.5), index);
  }

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

  for (let index = 0; index < 4; index += 1) {
    createBasket(scene, materials, new Vector3(-30.6 + index * 1.15, 0.24, -55.6));
  }

  createDatePalm(scene, materials, new Vector3(-34.2, 0, -20), 0.96);
  createDatePalm(scene, materials, new Vector3(-32.6, 0, -10.5), 0.72);
  createDatePalm(scene, materials, new Vector3(-33.5, 0, 4), 1.08);
  createDatePalm(scene, materials, new Vector3(-32.4, 0, 19), 0.84);
  createDatePalm(scene, materials, new Vector3(-33.1, 0, 34), 0.9);
}

function createResidentialStreet(scene: Scene, materials: SceneMaterials): void {
  createWhiteWallsThreshold(scene, materials);

  const heroStreetGround = MeshBuilder.CreateGround("heroStreetGroundDetail", { width: 10.5, height: 70, subdivisions: 6 }, scene);
  heroStreetGround.position = new Vector3(heroStreetCenterX, 0.048, 4);
  heroStreetGround.material = materials.heroGround;

  const drain = MeshBuilder.CreateGround("streetDrainageChannel", { width: 0.16, height: 44, subdivisions: 1 }, scene);
  drain.position = new Vector3(heroStreetCenterX + 1.1, 0.056, -8);
  drain.material = materials.dust;

  const well = MeshBuilder.CreateCylinder("districtWell", { height: 0.74, diameter: 1.5, tessellation: 24 }, scene);
  well.position = new Vector3(heroStreetCenterX + 3.5, 0.37, 5);
  well.material = materials.limestone;

  const wellVoid = MeshBuilder.CreateCylinder("districtWellVoid", { height: 0.76, diameter: 0.82, tessellation: 24 }, scene);
  wellVoid.position = new Vector3(heroStreetCenterX + 3.5, 0.4, 5);
  wellVoid.material = materials.shadow;

  for (let index = 0; index < 6; index += 1) {
    const jar = MeshBuilder.CreateCylinder(`wellJar-${index}`, {
      height: 0.78,
      diameterTop: 0.34,
      diameterBottom: 0.44,
      tessellation: 16
    }, scene);
    jar.position = new Vector3(heroStreetCenterX + 2.1 + (index % 3) * 0.68, 0.39, 3.6 + Math.floor(index / 3) * 2.65);
    jar.material = materials.mudbrick;
  }
}

function createHeroStreetV2FilmSet(scene: Scene, materials: SceneMaterials): CinematicHumanRoutine[] {
  const centerX = heroStreetCenterX;

  [
    { x: centerX - 4.5, z: -22, width: 1.15, depth: 10, alpha: 0.22 },
    { x: centerX + 4.25, z: -20, width: 1.05, depth: 9, alpha: 0.2 },
    { x: centerX - 4.75, z: -2, width: 1.05, depth: 17, alpha: 0.18 },
    { x: centerX + 4.35, z: 7, width: 1.18, depth: 19, alpha: 0.18 }
  ].forEach((spec, index) => {
    createGroundShadow(scene, materials, `heroV2WallContactShadow-${index}`, new Vector3(spec.x, 0.066, spec.z), spec.width, spec.depth, spec.alpha);
  });

  [
    { z: -18.1, width: 8.2, depth: 2.65, y: 3.42, tilt: -0.026 },
    { z: -7.8, width: 8.0, depth: 3.7, y: 3.28, tilt: 0.022 },
    { z: 7.2, width: 8.2, depth: 3.55, y: 3.18, tilt: -0.018 }
  ].forEach((cloth, index) => {
    const canopy = MeshBuilder.CreateBox(`heroV2SunCloth-${index}`, {
      width: cloth.width,
      height: 0.045,
      depth: cloth.depth
    }, scene);
    canopy.position = new Vector3(centerX + Math.sin(index) * 0.28, cloth.y, cloth.z);
    canopy.rotation.z = cloth.tilt;
    canopy.rotation.x = Math.sin(index * 1.7) * 0.025;
    const canopyMaterial = materials.linen.clone(`heroV2SunClothMaterial-${index}`) as PBRMaterial | null;
    if (canopyMaterial) {
      canopyMaterial.unlit = true;
      canopyMaterial.alpha = 0.92;
      canopy.material = canopyMaterial;
    } else {
      canopy.material = materials.linen;
    }
    canopy.isPickable = false;

    createGroundShadow(scene, materials, `heroV2ClothShadow-${index}`, new Vector3(centerX + 0.2, 0.071, cloth.z + 0.45), cloth.width * 0.72, cloth.depth * 0.54, 0.1);

    [-1, 1].forEach((side) => {
      const rope = MeshBuilder.CreateBox(`heroV2SunClothRope-${index}-${side}`, {
        width: cloth.width,
        height: 0.018,
        depth: 0.035
      }, scene);
      rope.position = new Vector3(centerX, cloth.y + 0.03, cloth.z + side * cloth.depth * 0.42);
      rope.rotation.z = cloth.tilt * 0.6;
      rope.material = materials.wood;
      rope.isPickable = false;
    });
  });

  [
    { x: centerX - 4.85, z: -23.2, side: -1 },
    { x: centerX + 4.65, z: -18.6, side: 1 },
    { x: centerX - 4.75, z: -7.2, side: -1 },
    { x: centerX + 4.55, z: 2.8, side: 1 },
    { x: centerX - 4.82, z: 13.6, side: -1 }
  ].forEach((wall, index) => {
    createWallDetailCluster(scene, materials, `heroV2WallDetail-${index}`, wall.x, wall.z, wall.side);
  });

  createForegroundMarketCluster(scene, materials, new Vector3(centerX - 3.65, 0, -25.5), -0.18, "left");
  createForegroundMarketCluster(scene, materials, new Vector3(centerX + 3.65, 0, -22.5), 0.22, "right");
  createWorkTable(scene, materials, new Vector3(centerX + 3.8, 0.56, -7.2), 0.08, "rightStoneTable");
  createWorkTable(scene, materials, new Vector3(centerX - 3.6, 0.56, -11.5), -0.12, "leftPotteryTable");

  const humans = [
    createCinematicHuman(scene, materials, new Vector3(centerX - 0.2, 0, -17.3), 0.02, "carrier", 0.2),
    createCinematicHuman(scene, materials, new Vector3(centerX + 3.2, 0, -8.4), -1.35, "worker", 1.4),
    createCinematicHuman(scene, materials, new Vector3(centerX - 3.15, 0, -4.6), 1.45, "seated", 2.6)
  ];

  for (let index = 0; index < 34; index += 1) {
    const x = centerX - 4.1 + (index % 7) * 1.26 + Math.sin(index * 2.1) * 0.18;
    const z = -26 + Math.floor(index / 7) * 7.2 + Math.cos(index * 1.6) * 0.55;
    createGroundPebble(scene, materials, new Vector3(x, 0.085, z), index);
  }

  return humans;
}

function createGroundShadow(
  scene: Scene,
  materials: SceneMaterials,
  name: string,
  position: Vector3,
  width: number,
  depth: number,
  alpha: number
): void {
  const shadow = MeshBuilder.CreateGround(name, { width, height: depth, subdivisions: 1 }, scene);
  shadow.position = position;
  shadow.material = materials.contactShadow;
  shadow.visibility = alpha;
  shadow.isPickable = false;
}

function createWallDetailCluster(scene: Scene, materials: SceneMaterials, name: string, x: number, z: number, side: number): void {
  const plasterPatch = MeshBuilder.CreateBox(`${name}-plasterPatch`, { width: 0.05, height: 0.74, depth: 1.28 }, scene);
  plasterPatch.position = new Vector3(x, 1.28, z);
  plasterPatch.material = materials.plaster;
  plasterPatch.isPickable = false;

  for (let index = 0; index < 4; index += 1) {
    const crack = MeshBuilder.CreateBox(`${name}-hairlineCrack-${index}`, {
      width: 0.035,
      height: 0.48 + index * 0.08,
      depth: 0.025
    }, scene);
    crack.position = new Vector3(x + side * 0.035, 1.02 + index * 0.24, z - 0.48 + index * 0.31);
    crack.rotation.y = side * 0.05;
    crack.rotation.z = Math.sin(index) * 0.18;
    crack.material = materials.shadow;
    crack.isPickable = false;
  }

  const darkBase = MeshBuilder.CreateBox(`${name}-baseDirt`, { width: 0.06, height: 0.28, depth: 1.7 }, scene);
  darkBase.position = new Vector3(x + side * 0.025, 0.19, z + 0.1);
  darkBase.material = materials.contactShadow;
  darkBase.visibility = 0.72;
  darkBase.isPickable = false;
}

function createForegroundMarketCluster(
  scene: Scene,
  materials: SceneMaterials,
  origin: Vector3,
  rotationY: number,
  side: string
): void {
  for (let index = 0; index < 4; index += 1) {
    const jar = MeshBuilder.CreateCylinder(`heroV2${side}Jar-${index}`, {
      height: 0.72 + index * 0.06,
      diameterTop: 0.38,
      diameterBottom: 0.52,
      tessellation: 18
    }, scene);
    jar.position = new Vector3(origin.x + (index % 2) * 0.62, 0.38, origin.z + Math.floor(index / 2) * 0.82);
    jar.rotation.y = rotationY + index * 0.18;
    jar.material = materials.pottery;
    jar.isPickable = false;

    createGroundShadow(scene, materials, `heroV2${side}JarShadow-${index}`, new Vector3(jar.position.x, 0.082, jar.position.z), 0.82, 0.62, 0.28);
  }

  createBasket(scene, materials, new Vector3(origin.x - 0.52, 0.24, origin.z + 0.5));
  createFloorMat(scene, materials, new Vector3(origin.x + 0.36, 0.082, origin.z + 1.55));
}

function createWorkTable(scene: Scene, materials: SceneMaterials, position: Vector3, rotationY: number, name: string): void {
  const table = MeshBuilder.CreateBox(`heroV2${name}`, { width: 1.65, height: 0.18, depth: 0.82 }, scene);
  table.position = position;
  table.rotation.y = rotationY;
  table.material = materials.wood;
  table.isPickable = false;

  [-0.58, 0.58].forEach((xOffset) => {
    [-0.26, 0.26].forEach((zOffset) => {
      const leg = MeshBuilder.CreateBox(`heroV2${name}Leg-${xOffset}-${zOffset}`, { width: 0.12, height: 0.8, depth: 0.12 }, scene);
      leg.position = new Vector3(position.x + xOffset, 0.28, position.z + zOffset);
      leg.rotation.y = rotationY;
      leg.material = materials.wood;
      leg.isPickable = false;
    });
  });

  for (let index = 0; index < 5; index += 1) {
    const tool = MeshBuilder.CreateBox(`heroV2${name}Tool-${index}`, { width: 0.08, height: 0.06, depth: 0.54 }, scene);
    tool.position = new Vector3(position.x - 0.55 + index * 0.27, position.y + 0.16, position.z + Math.sin(index) * 0.18);
    tool.rotation.y = rotationY + Math.sin(index * 1.2) * 0.7;
    tool.material = index % 2 ? materials.copper : materials.limestone;
    tool.isPickable = false;
  }

  createGroundShadow(scene, materials, `heroV2${name}Shadow`, new Vector3(position.x, 0.083, position.z), 1.8, 1.05, 0.2);
}

function createCinematicHuman(
  scene: Scene,
  materials: SceneMaterials,
  position: Vector3,
  rotationY: number,
  pose: "carrier" | "worker" | "seated",
  phase: number
): CinematicHumanRoutine {
  const root = new TransformNode(`heroV2Human-${pose}`, scene);
  root.position = position;
  root.rotation.y = rotationY;
  const arms: TransformNode[] = [];
  const legs: TransformNode[] = [];
  let carriedLoad: TransformNode | undefined;

  const bodyHeight = pose === "seated" ? 0.85 : 1.08;
  const torso = MeshBuilder.CreateCylinder(`heroV2Human-${pose}-torso`, {
    height: bodyHeight,
    diameterTop: 0.32,
    diameterBottom: 0.42,
    tessellation: 14
  }, scene);
  torso.position.y = pose === "seated" ? 0.82 : 0.96;
  torso.material = materials.skin;
  torso.parent = root;

  const kilt = MeshBuilder.CreateCylinder(`heroV2Human-${pose}-linen`, {
    height: 0.46,
    diameterTop: 0.46,
    diameterBottom: 0.54,
    tessellation: 14
  }, scene);
  kilt.position.y = pose === "seated" ? 0.43 : 0.52;
  kilt.material = materials.linen;
  kilt.parent = root;

  const head = MeshBuilder.CreateSphere(`heroV2Human-${pose}-head`, { diameter: 0.32, segments: 14 }, scene);
  head.position.y = pose === "seated" ? 1.42 : 1.65;
  head.material = materials.skin;
  head.parent = root;

  const hair = MeshBuilder.CreateSphere(`heroV2Human-${pose}-hair`, { diameterX: 0.34, diameterY: 0.18, diameterZ: 0.34, segments: 10 }, scene);
  hair.position.y = head.position.y + 0.12;
  hair.position.z = -0.02;
  hair.material = materials.shadow;
  hair.parent = root;

  if (pose === "carrier") {
    const jar = MeshBuilder.CreateCylinder(`heroV2Human-${pose}-headJar`, {
      height: 0.46,
      diameterTop: 0.26,
      diameterBottom: 0.36,
      tessellation: 16
    }, scene);
    jar.position.y = 2.02;
    jar.material = materials.pottery;
    jar.parent = root;
    carriedLoad = jar;
  }

  const armY = pose === "seated" ? 1.0 : 1.15;
  [-1, 1].forEach((side) => {
    const arm = MeshBuilder.CreateCylinder(`heroV2Human-${pose}-arm-${side}`, {
      height: 0.7,
      diameter: 0.08,
      tessellation: 10
    }, scene);
    arm.position = new Vector3(side * 0.28, armY, pose === "worker" ? -0.18 : 0);
    arm.rotation.z = side * (pose === "carrier" ? 0.12 : 0.48);
    arm.rotation.x = pose === "worker" ? 0.82 : 0.2;
    arm.material = materials.skin;
    arm.parent = root;
    arms.push(arm);

    const leg = MeshBuilder.CreateCylinder(`heroV2Human-${pose}-leg-${side}`, {
      height: pose === "seated" ? 0.62 : 0.78,
      diameter: 0.09,
      tessellation: 10
    }, scene);
    leg.position = new Vector3(side * 0.13, pose === "seated" ? 0.2 : 0.18, pose === "seated" ? 0.28 : 0);
    leg.rotation.x = pose === "seated" ? 1.2 : 0.04;
    leg.material = materials.skin;
    leg.parent = root;
    legs.push(leg);
  });

  createGroundShadow(scene, materials, `heroV2Human-${pose}-shadow`, new Vector3(position.x, 0.084, position.z), 0.72, 0.48, 0.32);

  return {
    root,
    basePosition: position.clone(),
    pose,
    phase,
    arms,
    legs,
    carriedLoad
  };
}

function updateCinematicHumans(humans: CinematicHumanRoutine[], time: number): void {
  humans.forEach((human) => {
    const slow = Math.sin(time * 1.15 + human.phase);
    const fast = Math.sin(time * 3.4 + human.phase);

    if (human.pose === "carrier") {
      human.root.position.z = human.basePosition.z + Math.sin(time * 0.5 + human.phase) * 0.22;
      human.root.position.y = Math.abs(fast) * 0.018;
      human.arms.forEach((arm, index) => {
        arm.rotation.x = -0.18 + slow * 0.07;
        arm.rotation.z = (index === 0 ? -1 : 1) * (0.15 + slow * 0.04);
      });
      human.legs.forEach((leg, index) => {
        leg.rotation.x = (index === 0 ? 1 : -1) * fast * 0.18;
      });
      if (human.carriedLoad) {
        human.carriedLoad.rotation.z = slow * 0.035;
      }
      return;
    }

    if (human.pose === "worker") {
      human.root.position.y = Math.max(0, slow) * 0.012;
      human.arms.forEach((arm, index) => {
        arm.rotation.x = 0.75 + (index === 0 ? slow : -slow) * 0.24;
        arm.rotation.z = (index === 0 ? -1 : 1) * (0.42 + Math.abs(slow) * 0.08);
      });
      human.legs.forEach((leg, index) => {
        leg.rotation.x = (index === 0 ? 0.08 : -0.08) + slow * 0.035;
      });
      return;
    }

    human.root.rotation.z = slow * 0.018;
    human.arms.forEach((arm, index) => {
      arm.rotation.x = 0.15 + (index === 0 ? slow : -slow) * 0.055;
    });
  });
}

function createGroundPebble(scene: Scene, materials: SceneMaterials, position: Vector3, index: number): void {
  const pebble = MeshBuilder.CreateSphere(`heroV2GroundPebble-${index}`, {
    diameterX: 0.08 + (index % 3) * 0.025,
    diameterY: 0.035,
    diameterZ: 0.12 + (index % 4) * 0.018,
    segments: 8
  }, scene);
  pebble.position = position;
  pebble.rotation.y = index * 0.91;
  pebble.material = index % 3 === 0 ? materials.pottery : materials.limestone;
  pebble.isPickable = false;
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

  const roofLip = MeshBuilder.CreateBox(`house-rooflip-${position.x}-${position.z}`, {
    width: size.x + 0.24,
    height: 0.18,
    depth: size.z + 0.24
  }, scene);
  roofLip.position = new Vector3(position.x, position.y + size.y / 2 + 0.11, position.z);
  roofLip.material = materials.plaster;

  const smallWindow = MeshBuilder.CreateBox(`house-window-${position.x}-${position.z}`, {
    width: 0.62,
    height: 0.42,
    depth: 0.07
  }, scene);
  smallWindow.position = new Vector3(position.x - size.x / 2 - 0.03, position.y + 0.38, position.z + size.z * 0.24);
  smallWindow.material = materials.shadow;
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

  const guardStore = MeshBuilder.CreateBox("riverGateStorehouse", { width: 4.8, height: 2.5, depth: 4.6 }, scene);
  guardStore.position = new Vector3(-37.2, 1.25, -26.5);
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
    shade.rotation.x = Math.sin(index) * 0.06;
    shade.material = materials.linen;

    createBasket(scene, materials, new Vector3(table.position.x - 1.25, 0.24, table.position.z + 1.1));
  }

  for (let index = 0; index < 6; index += 1) {
    const kiln = MeshBuilder.CreateCylinder(`kiln-${index}`, { height: 1.3, diameter: 1.25, tessellation: 18 }, scene);
    kiln.position = new Vector3(18, 0.65, 0 + index * 5.2);
    kiln.material = materials.mudbrick;

    const mouth = MeshBuilder.CreateBox(`kilnMouth-${index}`, { width: 0.52, height: 0.34, depth: 0.08 }, scene);
    mouth.position = new Vector3(17.38, 0.43, 0 + index * 5.2);
    mouth.material = index % 2 === 0 ? materials.ember : materials.shadow;
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

  for (let index = 0; index < 5; index += 1) {
    const chip = MeshBuilder.CreateBox(`limestoneChip-${index}`, { width: 0.32, height: 0.11, depth: 0.22 }, scene);
    chip.position = new Vector3(10.2 + index * 0.54, 0.08, 29.1 + Math.sin(index) * 0.5);
    chip.rotation.y = index * 0.7;
    chip.material = materials.limestone;
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

  createReliefPanel(scene, materials, new Vector3(-4.1, 2.25, 47.2), new Vector3(3.4, 1.3, 0.08), "ptahGateReliefWest");
  createReliefPanel(scene, materials, new Vector3(4.1, 2.25, 47.2), new Vector3(3.4, 1.3, 0.08), "ptahGateReliefEast");

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

      const banner = MeshBuilder.CreateBox(`ptahCourtBanner-${side}-${index}`, { width: 0.08, height: 1.35, depth: 0.72 }, scene);
      banner.position = new Vector3(side * 5.8, 2.6, 57 + index * 6.2);
      banner.material = index % 2 === 0 ? materials.linen : materials.paint;
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

  createOfferingSet(scene, materials, new Vector3(0, 0.84, 88.4));
  createBrazier(scene, materials, new Vector3(-2.4, 0.4, 89.9), "leftShrineBrazier");
  createBrazier(scene, materials, new Vector3(2.4, 0.4, 89.9), "rightShrineBrazier");

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

function createWaterHighlight(scene: Scene, materials: SceneMaterials, position: Vector3, index: number): void {
  const glint = MeshBuilder.CreateBox(`nileGlint-${index}`, {
    width: 6.5 + (index % 3) * 1.8,
    height: 0.018,
    depth: 0.08
  }, scene);
  glint.position = position;
  glint.rotation.y = Math.sin(index) * 0.18;
  glint.material = materials.linen;
  glint.isPickable = false;
}

function createDatePalm(scene: Scene, materials: SceneMaterials, position: Vector3, scale: number): void {
  const trunkHeight = 4.8 * scale;
  const segmentCount = 9;
  const bend = Math.sin(position.z * 0.17) * 0.22 * scale;

  for (let index = 0; index < segmentCount; index += 1) {
    const mix = index / segmentCount;
    const segment = MeshBuilder.CreateCylinder(`datePalmTrunk-${position.z}-${index}`, {
      height: trunkHeight / segmentCount + 0.08 * scale,
      diameterTop: (0.36 - mix * 0.08) * scale,
      diameterBottom: (0.46 - mix * 0.08) * scale,
      tessellation: 9
    }, scene);
    segment.position = new Vector3(
      position.x + bend * mix,
      (trunkHeight / segmentCount) * (index + 0.5),
      position.z + Math.sin(index * 0.8 + position.x) * 0.035 * scale
    );
    segment.rotation.z = Math.sin(index * 0.45 + position.z) * 0.035;
    segment.material = materials.wood;
    segment.isPickable = false;
  }

  const crown = new Vector3(position.x + bend, trunkHeight + 0.05 * scale, position.z);

  for (let index = 0; index < 16; index += 1) {
    const angle = (Math.PI * 2 * index) / 16;
    const leaf = MeshBuilder.CreatePlane(`datePalmLeaf-${position.z}-${index}`, {
      width: (0.34 + (index % 3) * 0.08) * scale,
      height: (2.7 + (index % 4) * 0.24) * scale,
      sideOrientation: Mesh.DOUBLESIDE
    }, scene);
    leaf.position = new Vector3(
      crown.x + Math.cos(angle) * 0.42 * scale,
      crown.y - 0.16 * scale,
      crown.z + Math.sin(angle) * 0.42 * scale
    );
    leaf.rotation.y = angle;
    leaf.rotation.x = Math.PI / 2.6 + Math.sin(index * 1.7) * 0.12;
    leaf.rotation.z = 0.18 + Math.cos(index) * 0.16;
    leaf.material = materials.reed;
    leaf.isPickable = false;
  }

  for (let index = 0; index < 11; index += 1) {
    const date = MeshBuilder.CreateSphere(`datePalmFruit-${position.z}-${index}`, {
      diameterX: 0.08 * scale,
      diameterY: 0.12 * scale,
      diameterZ: 0.08 * scale,
      segments: 8
    }, scene);
    const angle = index * 1.68;
    date.position = new Vector3(
      crown.x + Math.cos(angle) * 0.22 * scale,
      crown.y - (0.28 + (index % 4) * 0.08) * scale,
      crown.z + Math.sin(angle) * 0.22 * scale
    );
    date.material = materials.mudbrick;
    date.isPickable = false;
  }
}

function createBasket(scene: Scene, materials: SceneMaterials, position: Vector3): void {
  const basket = MeshBuilder.CreateCylinder(`basket-${position.x}-${position.z}`, {
    height: 0.48,
    diameterTop: 0.72,
    diameterBottom: 0.54,
    tessellation: 14
  }, scene);
  basket.position = position;
  basket.material = materials.reed;

  const rim = MeshBuilder.CreateTorus(`basketRim-${position.x}-${position.z}`, {
    diameter: 0.72,
    thickness: 0.045,
    tessellation: 18
  }, scene);
  rim.position = new Vector3(position.x, position.y + 0.24, position.z);
  rim.material = materials.wood;
}

function createFloorMat(scene: Scene, materials: SceneMaterials, position: Vector3): void {
  const mat = MeshBuilder.CreateBox(`wovenMat-${position.x}-${position.z}`, { width: 2.2, height: 0.035, depth: 1.18 }, scene);
  mat.position = position;
  mat.rotation.y = Math.sin(position.z) * 0.45;
  mat.material = materials.linen;
}

function createReliefPanel(scene: Scene, materials: SceneMaterials, position: Vector3, size: Vector3, name: string): void {
  const panel = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  panel.position = position;
  panel.material = materials.paint;
}

function createOfferingSet(scene: Scene, materials: SceneMaterials, position: Vector3): void {
  for (let index = 0; index < 5; index += 1) {
    const vessel = MeshBuilder.CreateCylinder(`offeringCup-${index}`, {
      height: 0.34,
      diameterTop: 0.28,
      diameterBottom: 0.18,
      tessellation: 14
    }, scene);
    vessel.position = new Vector3(position.x - 0.82 + index * 0.42, position.y, position.z);
    vessel.material = index % 2 === 0 ? materials.copper : materials.limestone;
  }

  for (let index = 0; index < 4; index += 1) {
    const loaf = MeshBuilder.CreateSphere(`offeringLoaf-${index}`, {
      diameterX: 0.34,
      diameterY: 0.18,
      diameterZ: 0.24,
      segments: 10
    }, scene);
    loaf.position = new Vector3(position.x - 0.48 + index * 0.32, position.y + 0.26, position.z + 0.36);
    loaf.material = materials.mudbrick;
  }
}

function createBrazier(scene: Scene, materials: SceneMaterials, position: Vector3, name: string): void {
  const bowl = MeshBuilder.CreateCylinder(name, {
    height: 0.34,
    diameterTop: 0.72,
    diameterBottom: 0.48,
    tessellation: 18
  }, scene);
  bowl.position = position;
  bowl.material = materials.copper;

  const ember = MeshBuilder.CreateSphere(`${name}Ember`, { diameter: 0.38, segments: 12 }, scene);
  ember.position = new Vector3(position.x, position.y + 0.22, position.z);
  ember.material = materials.ember;
}

function createRouteLine(scene: Scene, routePoints: readonly GuidedRoutePoint[]): void {
  const points = routePoints.map((routePoint) => {
    const point = routePoint.position.clone();
    point.y = 0.08;
    return point;
  });
  const line = MeshBuilder.CreateLines("guidedRouteLine", { points }, scene);
  line.color = Color3.FromHexString("#7f6b45");
  line.visibility = new URLSearchParams(window.location.search).get("chrome") === "0" ? 0 : 0.16;
  line.isPickable = false;
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
  const routes: Array<{ start: Vector3; end: Vector3; carry?: boolean; scale?: number; speed?: number }> = [
    { start: new Vector3(-31, 0, -54), end: new Vector3(-27.5, 0, -38), carry: true, scale: 0.98, speed: 0.24 },
    { start: new Vector3(-23, 0, -31), end: new Vector3(-8.5, 0, -14), scale: 0.96, speed: 0.27 },
    { start: new Vector3(-12.5, 0, -22), end: new Vector3(-6.5, 0, 4), carry: true, scale: 0.94, speed: 0.23 },
    { start: new Vector3(-7.2, 0, -4), end: new Vector3(-12.2, 0, 20), scale: 1.02, speed: 0.21 },
    { start: new Vector3(7.5, 0, 3), end: new Vector3(18.5, 0, 19), scale: 0.95, speed: 0.26 },
    { start: new Vector3(8, 0, 24), end: new Vector3(-4.5, 0, 38), carry: true, scale: 0.92, speed: 0.22 },
    { start: new Vector3(-7, 0, 54), end: new Vector3(7, 0, 65), scale: 1, speed: 0.2 }
  ];

  return routes.map(({ start, end, carry, scale = 1, speed }, index) => {
    const root = new TransformNode(`ambientWalker-${index}`, scene);
    root.position = start.clone();
    const parts = createHumanFigure(scene, materials, root, index, scale, Boolean(carry));

    return {
      root,
      start,
      end,
      speed: speed ?? 0.25 + index * 0.04,
      phase: index * 1.7,
      parts
    };
  });
}

function createHumanFigure(
  scene: Scene,
  materials: SceneMaterials,
  root: TransformNode,
  index: number,
  scale: number,
  carryLoad: boolean
): WalkerParts {
  const skin = materials.mudbrick;
  const clothing = index % 2 === 0 ? materials.linen : materials.plaster;

  const torso = MeshBuilder.CreateCylinder(`walkerTorso-${index}`, {
    height: 0.72 * scale,
    diameterTop: 0.24 * scale,
    diameterBottom: 0.32 * scale,
    tessellation: 14
  }, scene);
  torso.position.y = 0.96 * scale;
  torso.parent = root;
  torso.material = skin;

  const kilt = MeshBuilder.CreateCylinder(`walkerKilt-${index}`, {
    height: 0.46 * scale,
    diameterTop: 0.36 * scale,
    diameterBottom: 0.46 * scale,
    tessellation: 14
  }, scene);
  kilt.position.y = 0.58 * scale;
  kilt.parent = root;
  kilt.material = clothing;

  const sash = MeshBuilder.CreateBox(`walkerSash-${index}`, {
    width: 0.38 * scale,
    height: 0.08 * scale,
    depth: 0.08 * scale
  }, scene);
  sash.position = new Vector3(0, 0.82 * scale, -0.18 * scale);
  sash.parent = root;
  sash.material = clothing;

  const head = MeshBuilder.CreateSphere(`walkerHead-${index}`, {
    diameterX: 0.28 * scale,
    diameterY: 0.32 * scale,
    diameterZ: 0.28 * scale,
    segments: 14
  }, scene);
  head.position.y = 1.47 * scale;
  head.parent = root;
  head.material = skin;

  const hair = MeshBuilder.CreateBox(`walkerHair-${index}`, {
    width: 0.3 * scale,
    height: 0.2 * scale,
    depth: 0.24 * scale
  }, scene);
  hair.position = new Vector3(0, 1.6 * scale, -0.02 * scale);
  hair.parent = root;
  hair.material = materials.shadow;

  const leftArm = createHumanLimb(scene, `walkerLeftArm-${index}`, root, materials, new Vector3(-0.26 * scale, 0.95 * scale, 0), 0.58 * scale, 0.055 * scale);
  const rightArm = createHumanLimb(scene, `walkerRightArm-${index}`, root, materials, new Vector3(0.26 * scale, 0.95 * scale, 0), 0.58 * scale, 0.055 * scale);
  const leftLeg = createHumanLimb(scene, `walkerLeftLeg-${index}`, root, materials, new Vector3(-0.12 * scale, 0.28 * scale, 0), 0.56 * scale, 0.065 * scale);
  const rightLeg = createHumanLimb(scene, `walkerRightLeg-${index}`, root, materials, new Vector3(0.12 * scale, 0.28 * scale, 0), 0.56 * scale, 0.065 * scale);

  let carriedLoad: TransformNode | undefined;

  if (carryLoad) {
    carriedLoad = new TransformNode(`walkerCarriedLoad-${index}`, scene);
    carriedLoad.parent = root;
    carriedLoad.position.y = 1.84 * scale;

    const jar = MeshBuilder.CreateCylinder(`walkerHeadJar-${index}`, {
      height: 0.42 * scale,
      diameterTop: 0.18 * scale,
      diameterBottom: 0.3 * scale,
      tessellation: 16
    }, scene);
    jar.parent = carriedLoad;
    jar.material = materials.mudbrick;

    leftArm.rotation.x = -0.55;
    rightArm.rotation.x = -0.55;
    leftArm.rotation.z = -0.38;
    rightArm.rotation.z = 0.38;
  }

  return {
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    carriedLoad
  };
}

function createHumanLimb(
  scene: Scene,
  name: string,
  root: TransformNode,
  materials: SceneMaterials,
  position: Vector3,
  height: number,
  diameter: number
): TransformNode {
  const limb = MeshBuilder.CreateCylinder(name, {
    height,
    diameter,
    tessellation: 10
  }, scene);
  limb.position = position;
  limb.parent = root;
  limb.material = materials.mudbrick;
  return limb;
}

function updateWalkers(walkers: WalkerRoutine[], time: number): void {
  walkers.forEach((walker) => {
    const mix = (Math.sin(time * walker.speed + walker.phase) + 1) / 2;
    const position = Vector3.Lerp(walker.start, walker.end, mix);
    const stride = Math.sin(time * 5.4 + walker.phase) * 0.42;
    position.y += Math.abs(stride) * 0.035;
    walker.root.position.copyFrom(position);

    const direction = walker.end.subtract(walker.start);
    walker.root.rotation.y = Math.atan2(direction.x, direction.z) + (mix > 0.5 ? Math.PI : 0);
    walker.parts.leftArm.rotation.x = walker.parts.carriedLoad ? -0.52 + stride * 0.12 : stride;
    walker.parts.rightArm.rotation.x = walker.parts.carriedLoad ? -0.52 - stride * 0.12 : -stride;
    walker.parts.leftLeg.rotation.x = -stride * 0.78;
    walker.parts.rightLeg.rotation.x = stride * 0.78;

    if (walker.parts.carriedLoad) {
      walker.parts.carriedLoad.rotation.z = Math.sin(time * 2.2 + walker.phase) * 0.035;
    }
  });
}

function updateGlbActorMotions(actors: GlbActorMotionRoutine[], time: number): void {
  actors.forEach((actor) => {
    const cycle = time * actor.speed + actor.phase;
    const mix = (Math.sin(cycle) + 1) / 2;
    const position = Vector3.Lerp(actor.start, actor.end, mix);

    actor.root.position.copyFrom(position);
    actor.root.rotation.y = Math.cos(cycle) >= 0 ? actor.yawForward : actor.yawBackward;
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

function createBirds(scene: Scene, materials: SceneMaterials): BirdRoutine[] {
  return Array.from({ length: 7 }, (_, index) => {
    const root = new TransformNode(`distantBird-${index}`, scene);
    const wingColor = index % 2 === 0 ? "#4d4333" : "#5d5948";

    const leftWing = MeshBuilder.CreateLines(`distantBirdLeftWing-${index}`, {
      points: [new Vector3(0, 0, 0), new Vector3(-0.55, 0.12, 0.18)]
    }, scene);
    leftWing.color = Color3.FromHexString(wingColor);
    leftWing.parent = root;

    const rightWing = MeshBuilder.CreateLines(`distantBirdRightWing-${index}`, {
      points: [new Vector3(0, 0, 0), new Vector3(0.55, 0.12, 0.18)]
    }, scene);
    rightWing.color = Color3.FromHexString(wingColor);
    rightWing.parent = root;

    const body = MeshBuilder.CreateSphere(`distantBirdBody-${index}`, { diameter: 0.08, segments: 6 }, scene);
    body.material = materials.shadow;
    body.parent = root;

    return {
      root,
      radius: 44 + index * 3.7,
      height: 14 + (index % 3) * 2.1,
      speed: 0.035 + index * 0.006,
      phase: index * 1.17
    };
  });
}

function updateBirds(birds: BirdRoutine[], time: number): void {
  birds.forEach((bird) => {
    const angle = time * bird.speed + bird.phase;
    bird.root.position = new Vector3(
      Math.sin(angle) * bird.radius - 8,
      bird.height + Math.sin(time * 1.4 + bird.phase) * 0.6,
      Math.cos(angle * 0.86) * 52 + 18
    );
    bird.root.rotation.y = -angle + Math.PI / 2;
    bird.root.scaling.setAll(0.9 + Math.sin(time * 5.4 + bird.phase) * 0.08);
  });
}

function createSoundscape(scene: Scene): Soundscape {
  const loops: AmbientLoop[] = [
    { fileName: "nile-water-boats.wav", volume: 0.52 },
    { fileName: "birds-wind-insects.wav", volume: 0.28 },
    { fileName: "market-craft-murmur.wav", volume: 0.42 },
    { fileName: "temple-incense-chant.wav", volume: 0.34 },
    { fileName: "dust-footsteps.wav", volume: 0.18 }
  ];

  loops.forEach((loop) => {
    ensureAudio(loop);
  });

  scene.onDisposeObservable.add(() => {
    loops.forEach((loop) => {
      loop.element?.pause();
    });
  });

  return {
    setEnabled(enabled: boolean) {
      loops.forEach((loop) => {
        const audio = ensureAudio(loop);

        if (!audio) {
          return;
        }

        if (enabled) {
          audio.volume = loop.volume;
          audio.dataset.soundscapeState = "play-requested";
          void audio.play().catch((error: unknown) => {
            audio.dataset.soundscapeState = "blocked";
            console.warn("Soundscape playback was blocked by the browser.", error);
          }).then(() => {
            if (!audio.paused) {
              audio.dataset.soundscapeState = "playing";
            }
          });
        } else {
          audio.pause();
          audio.dataset.soundscapeState = "paused";
        }
      });
    }
  };
}

function ensureAudio(loop: AmbientLoop): HTMLAudioElement | undefined {
  if (loop.element) {
    return loop.element;
  }

  if (typeof document === "undefined") {
    return undefined;
  }

  const audio =
    document.querySelector<HTMLAudioElement>(`audio[data-soundscape-file="${loop.fileName}"]`) ??
    document.createElement("audio");

  if (!audio.parentElement) {
    audio.dataset.soundscapeFile = loop.fileName;
    audio.src = `${audioRoot}${loop.fileName}`;
    document.body.append(audio);
  }

  audio.loop = true;
  audio.preload = "auto";
  audio.volume = loop.volume;
  audio.load();
  loop.element = audio;
  return audio;
}

function applyCameraShotBookmark(camera: UniversalCamera): void {
  if (typeof window === "undefined") {
    return;
  }

  const requestedShot = new URLSearchParams(window.location.search).get("shot");
  const shot = requestedShot === "canonical" ? canonicalCameraShotId : requestedShot;
  const bookmark = shot ? cameraShotBookmarks[shot] : undefined;

  if (!bookmark) {
    return;
  }

  camera.position.copyFrom(vectorFromTuple(bookmark.position));
  camera.setTarget(vectorFromTuple(bookmark.lookAt));
}

function createGuidedRouteTrack(manifest: TourManifest): GuidedRouteTrack {
  const sourcePoints = manifest.guidedRoute?.waypoints?.length
    ? manifest.guidedRoute.waypoints
    : manifest.stops.map((stop) => ({
      id: stop.id,
      position: stop.position,
      lookAt: stop.lookAt,
      stopId: stop.id
    }));

  const points = sourcePoints.map((point) => ({
    id: point.id,
    position: vectorFromTuple(point.position),
    lookAt: point.lookAt ? vectorFromTuple(point.lookAt) : undefined,
    stopId: point.stopId
  }));

  const segments: GuidedRouteSegment[] = [];
  let totalLength = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const delta = end.position.subtract(start.position);
    delta.y = 0;
    const length = delta.length();

    if (length < 0.01) {
      continue;
    }

    const direction = delta.scale(1 / length);
    segments.push({
      start,
      end,
      startDistance: totalLength,
      length,
      direction
    });
    totalLength += length;
  }

  return { points, segments, totalLength };
}

function sampleGuidedRoute(track: GuidedRouteTrack, progress: number): { position: Vector3; lookAt: Vector3 } {
  if (track.segments.length === 0) {
    const point = track.points[0];
    const position = point?.position.clone() ?? Vector3.Zero();
    const lookAt = point?.lookAt?.clone() ?? position.add(new Vector3(0, 0, 4));
    return { position, lookAt };
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const routeDistance = clamped * track.totalLength;
  const fallbackSegment = track.segments[track.segments.length - 1];
  const segment = track.segments.find((candidate) => (
    routeDistance <= candidate.startDistance + candidate.length
  )) ?? fallbackSegment;
  const local = Math.min(1, Math.max(0, (routeDistance - segment.startDistance) / segment.length));
  const position = Vector3.Lerp(segment.start.position, segment.end.position, local);

  if (clamped >= 0.998 && segment.end.lookAt) {
    return { position, lookAt: segment.end.lookAt.clone() };
  }

  return {
    position,
    lookAt: new Vector3(
      position.x + segment.direction.x * 5.5,
      1.65,
      position.z + segment.direction.z * 5.5
    )
  };
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
