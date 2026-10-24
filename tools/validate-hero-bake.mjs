import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = path.join(root, "apps/web-tour/public/assets/authored/hero-street");
const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(manifest.bake.includesAlbedo, false, "Runtime expects irradiance, not baked surface colour");
assert.equal(manifest.bake.includesSunDirect, false, "Real-time sun must not be baked twice");
assert.equal(manifest.bake.colorSpace, "linear");
assert.equal(manifest.bake.uvSet, 1);
assert.equal(manifest.assets.length, 3);
assert.equal(Object.keys(manifest.lockedInputs).length, 2);
for (const [file, hash] of Object.entries(manifest.lockedInputs)) {
  assert.equal(sha(await readFile(path.join(root, file))), hash, `Locked camera/route changed: ${file}`);
}
let glbBytes = 0, textureBytes = 0;
for (const asset of manifest.assets) {
  const original = await readFile(path.join(root, "apps/web-tour/public/assets/generated/glb", asset.fileName));
  assert.equal(sha(original), manifest.sourceHashes[asset.fileName], "Rebake after changing source geometry");
  const bytes = await readFile(path.join(dir, asset.fileName));
  glbBytes += bytes.length;
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const sourceGltf = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)).toString());
  const materialKey = name => name.replace(/\.\d+$/, "");
  const retiredSheets = new Set(sourceGltf.materials.filter(material =>
    material.alphaMode === "BLEND" && (material.pbrMetallicRoughness?.baseColorFactor?.[3] ?? 1) < .99
  ).map(material => materialKey(material.name)));
  const transforms = document => document.nodes.filter(node => node.mesh !== undefined).map(node => ({
    translation: node.translation ?? [0, 0, 0], rotation: node.rotation ?? [0, 0, 0, 1], scale: node.scale ?? [1, 1, 1], matrix: node.matrix ?? null
  }));
  assert.deepEqual(transforms(gltf), transforms(sourceGltf), "Street chunk transforms must stay locked");
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert.notEqual(primitive.attributes.TEXCOORD_0, undefined, "Missing surface UVs");
    assert.notEqual(primitive.attributes.TEXCOORD_1, undefined, "Missing lightmap UVs");
    const material = gltf.materials[primitive.material];
    assert.ok(!retiredSheets.has(materialKey(material.name)), `Opaque legacy decal survived bake: ${material.name}`);
    assert.ok(Object.hasOwn(manifest.materials, material.name), `Unbound material: ${material.name}`);
    if (manifest.foregroundFinish) {
      assert.notEqual(primitive.attributes.COLOR_0,undefined,'Foreground finish colours were lost during export');
      const accessor = gltf.accessors[primitive.attributes.COLOR_0];
      assert.equal(accessor.type,'VEC4');
      const view = gltf.bufferViews[accessor.bufferView];
      const start = 20 + bytes.readUInt32LE(12) + 8 + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const width = accessor.componentType === 5126 ? 4 : accessor.componentType === 5123 ? 2 : 1;
      const stride = view.byteStride ?? width*4;
      for (let i=0;i<accessor.count;i++) {
        const offset = start+i*stride+width*3;
        const alpha = width===4 ? bytes.readFloatLE(offset) : width===2 ? bytes.readUInt16LE(offset)/65535 : bytes.readUInt8(offset)/255;
        assert.equal(alpha,1,'Finish colour must never make a surface transparent');
      }
    }
  }
  const png = await readFile(path.join(dir, asset.irradiance));
  let previousTriangles = asset.triangles;
  for (const lod of asset.lods ?? []) {
    const lowBytes = await readFile(path.join(dir,lod.fileName));
    const low = JSON.parse(lowBytes.subarray(20,20+lowBytes.readUInt32LE(12)));
    let triangles=0;
    for(const mesh of low.meshes) for(const primitive of mesh.primitives) {
      assert.notEqual(primitive.attributes.TEXCOORD_1,undefined,'LOD lost its lightmap UVs');
      if (manifest.foregroundFinish) assert.notEqual(primitive.attributes.COLOR_0,undefined,'LOD lost finish colours');
      assert.ok(Object.hasOwn(manifest.materials,low.materials[primitive.material].name),'Unbound LOD material');
      assert.ok(!retiredSheets.has(materialKey(low.materials[primitive.material].name)), 'Opaque legacy decal survived in LOD');
      triangles+=low.accessors[primitive.indices].count/3;
    }
    assert.equal(triangles,lod.triangles,'LOD statistics stale');
    assert.ok(triangles<previousTriangles*.9,'LOD must reduce real geometry');
    previousTriangles=triangles;
  }
  assert.equal(png.readUInt32BE(16), manifest.bake.resolution);
  assert.equal(png.readUInt32BE(20), manifest.bake.resolution);
  textureBytes += png.length;
}
const surfaces = manifest.surfaceFamilies ?? (manifest.id === "hero-street-authored-v2" ? ["dust", "plaster", "linen", "pottery", "wood"] : ["dust", "plaster"]);
for (const surface of surfaces) for (const channel of ["albedo", "normal", "orm"]) {
  textureBytes += (await stat(path.join(dir, `${surface}-${channel}.png`))).size;
}
// Authored assets have their own honest delivery budgets; source height maps
// are not loaded by the browser. Existing fallback budgets remain separate.
// V2 explicitly budgets the rounded plaster and subdivided cloth/prop surfaces.
// Solid cloth backs/hems and rounded lips explicitly add geometry. LOD files
// are streamed separately and checked below, rather than hidden in this budget.
const geometryBudget = manifest.surfaceRefinement?.clothThicknessMeters ? 14_000_000 : manifest.id === "hero-street-authored-v2" ? 10_000_000 : 7_000_000;
assert.ok(glbBytes < geometryBudget, `Authored GLBs exceed ${geometryBudget/1e6} MB: ${glbBytes}`);
assert.ok(textureBytes < 20_000_000, `Authored maps exceed 20 MB: ${textureBytes}`);
console.log(`Hero bake validated: locked camera/route, source hashes, 3 UV1 GLBs, explicit materials, linear irradiance. GLBs ${(glbBytes/1e6).toFixed(2)} MB; runtime maps ${(textureBytes/1e6).toFixed(2)} MB.`);
