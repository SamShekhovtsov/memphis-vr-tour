import { Scene, SceneLoader, ShadowGenerator, TransformNode, Vector3 } from "@babylonjs/core";
import { authoredHeroRoot, type HeroBakeManifest } from "./HeroStreetMaterials";

/** Stream actual reduced geometry when needed. Never use null as a street LOD. */
export async function attachStreetLods(scene: Scene, root: TransformNode, asset: HeroBakeManifest["assets"][number], multiplier: number) {
  if (!asset.lods?.length) return;
  const high = root.getChildren().filter((node): node is TransformNode => node instanceof TransformNode);
  const bounds = root.getHierarchyBoundingVectors(true);
  const levels = new Map<number, TransformNode[]>([[0, high]]);
  const pending = new Map<number, Promise<void>>();
  const failed = new Set<number>();
  const entry = { assetId: asset.assetId, level: 0, loaded: [0], triangles: asset.triangles, failed: [] as number[] };
  (scene.metadata.streetLods ??= []).push(entry);
  let selected = 0;
  function desired() {
    const p = scene.activeCamera?.globalPosition ?? Vector3.Zero();
    const dx = Math.max(bounds.min.x-p.x,0,p.x-bounds.max.x);
    const dz = Math.max(bounds.min.z-p.z,0,p.z-bounds.max.z);
    const d = Math.hypot(dx,dz);
    const pad = selected > 0 ? -2 : 2;
    return d > 48*multiplier+pad ? 2 : d > 24*multiplier+pad ? 1 : 0;
  }
  function select(level: number) {
    if (!levels.has(level)) return;
    for (const [index,nodes] of levels) for (const node of nodes) node.setEnabled(index===level);
    selected=level; entry.level=level;
    entry.triangles=level===0 ? asset.triangles : asset.lods![level-1].triangles;
  }
  async function ensure(level: number) {
    if (levels.has(level) || failed.has(level)) return;
    if (pending.has(level)) return pending.get(level);
    const task=(async()=>{
      try {
        const container=await SceneLoader.LoadAssetContainerAsync(authoredHeroRoot,asset.lods![level-1].fileName,scene);
        if (scene.isDisposed) { container.dispose(); return; }
        const instance=container.instantiateModelsToScene(name=>`${root.name}-lod${level}-${name}`,false);
        const nodes=instance.rootNodes as TransformNode[];
        for(const node of nodes) {
          node.parent=root; node.setEnabled(false);
          for(const mesh of node.getChildMeshes()) {
            scene.metadata.bindHeroMaterial(mesh,asset.assetId);
            mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=true;
            const shadows=scene.getLightByName('lowGoldSun')?.getShadowGenerator();
            if(shadows instanceof ShadowGenerator) shadows.addShadowCaster(mesh,false);
            for(const name of ['skyLight','warmDustBounce','shrineOilLampGlow']) scene.getLightByName(name)?.excludedMeshes.push(mesh);
          }
        }
        levels.set(level,nodes);entry.loaded.push(level);
        select(desired());
      } catch(error) {
        failed.add(level);entry.failed.push(level);
        console.warn(`Keeping available street geometry after LOD load failure: ${asset.assetId}`,error);
      }
    })();
    pending.set(level,task); await task; pending.delete(level);
  }
  await ensure(desired()); select(desired());
  scene.onBeforeRenderObservable.add(()=>{
    const level=desired();
    if(level!==selected) { if(levels.has(level))select(level);else void ensure(level); }
  });
}
