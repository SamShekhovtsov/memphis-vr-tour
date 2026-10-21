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
  const transforms = document => document.nodes.filter(node => node.mesh !== undefined).map(node => ({
    translation: node.translation ?? [0, 0, 0], rotation: node.rotation ?? [0, 0, 0, 1], scale: node.scale ?? [1, 1, 1], matrix: node.matrix ?? null
  }));
  assert.deepEqual(transforms(gltf), transforms(sourceGltf), "Street chunk transforms must stay locked");
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert.notEqual(primitive.attributes.TEXCOORD_0, undefined, "Missing surface UVs");
    assert.notEqual(primitive.attributes.TEXCOORD_1, undefined, "Missing lightmap UVs");
    const material = gltf.materials[primitive.material];
    assert.ok(Object.hasOwn(manifest.materials, material.name), `Unbound material: ${material.name}`);
  }
  const png = await readFile(path.join(dir, asset.irradiance));
  assert.equal(png.readUInt32BE(16), manifest.bake.resolution);
  assert.equal(png.readUInt32BE(20), manifest.bake.resolution);
  textureBytes += png.length;
}
for (const surface of ["dust", "plaster"]) for (const channel of ["albedo", "normal", "orm"]) {
  textureBytes += (await stat(path.join(dir, `${surface}-${channel}.png`))).size;
}
// Authored assets have their own honest delivery budgets; source height maps
// are not loaded by the browser. Existing fallback budgets remain separate.
assert.ok(glbBytes < 7_000_000, `Authored GLBs exceed 7 MB: ${glbBytes}`);
assert.ok(textureBytes < 20_000_000, `Authored maps exceed 20 MB: ${textureBytes}`);
console.log(`Hero bake validated: locked camera/route, source hashes, 3 UV1 GLBs, explicit materials, linear irradiance. GLBs ${(glbBytes/1e6).toFixed(2)} MB; runtime maps ${(textureBytes/1e6).toFixed(2)} MB.`);
