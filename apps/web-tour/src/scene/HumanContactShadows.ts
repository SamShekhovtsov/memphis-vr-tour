import { Scene, ShadowGenerator } from "@babylonjs/core";
import { configureRenderWork } from "./RenderWorkOptimization";

/** Keep stable architectural bias; use closer caster bias only on the people.
 * Both observables run before the SAME shadow-map draw. No extra pass/mesh.
 */
export function configureHumanContactShadows(shadows: ShadowGenerator, scene: Scene) {
  configureRenderWork(scene);
  const legacy = new URLSearchParams(location.search).get("steps56") === "legacy";
  scene.metadata.contactShadows = { mode: legacy ? "legacy" : "human-contact", extraPasses: 0,
    staticNormalBias: .035, humanNormalBias: legacy ? .035 : .012, humanDepthBias: legacy ? .0005 : .00025 };
  if (legacy) return;
  let human = false;
  shadows.onBeforeShadowMapRenderMeshObservable.add(mesh => {
    human = mesh.name.startsWith("heroPerson-");
  });
  shadows.onBeforeShadowMapRenderObservable.add(effect => {
    if (human) effect.setFloat3("biasAndScaleSM", .00025, .012, shadows.depthScale);
  });
}
