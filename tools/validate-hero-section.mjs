import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const lockFile = 'content/scene-data/hero-street.section-lock.json';
const dir = 'apps/web-tour/public/assets/';
const files = ['content/scene-data/hero-street.camera-lock.json', 'content/scene-data/memphis-white-walls.tour.json',
  'content/scene-data/hero-street.anchors-lock.json', 'content/scene-data/hero-actors.motion-lock.json', 'content/scene-data/hero-street.daylight.json',
  dir + 'generated/glb/animated_street_actors.glb', ...['near','mid','far'].flatMap(part =>
    [dir + `generated/glb/hero_street_corridor_${part}.glb`, ...['','.lod1','.lod2'].map(lod => dir + `authored/hero-street/hero_street_corridor_${part}${lod}.glb`)])];
const sceneFile = 'apps/web-tour/src/scene/MemphisWhiteWallsScene.ts';
const protectedFunctions = ['createModularAssetPlacements','applyCameraShotBookmark','createTemple','createBaseDistrict','createResidentialStreet','createCraftsmenArea','createHeroStreetCollisionGuides','updateGlbActorMotions'];
const functionHash = (source, name) => {
  const body = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0];
  assert.ok(body, `Protected function missing: ${name}`);
  return createHash('sha256').update(body.replaceAll('\r\n','\n')).digest('hex');
};
if (process.argv.includes('--record-code')) {
  const state = JSON.parse(fs.readFileSync(lockFile));
  assert.ok(!state.protectedCode, 'Do not overwrite the protected code baseline');
  const original = execFileSync('git', ['show', `HEAD:${sceneFile}`], {encoding:'utf8'});
  state.protectedCode = Object.fromEntries(protectedFunctions.map(name => [name, functionHash(original,name)]));
  fs.writeFileSync(lockFile, JSON.stringify(state,null,2)+'\n');
} else if (process.argv.includes('--record')) {
  assert.ok(!fs.existsSync(lockFile), 'Do not overwrite the protected baseline');
  fs.writeFileSync(lockFile, JSON.stringify({ date: '2026-10-24', protectedFiles: Object.fromEntries(files.map(file => [file, hash(file)])) }, null, 2)+'\n');
} else {
  const lock = JSON.parse(fs.readFileSync(lockFile));
  for (const [file, checksum] of Object.entries(lock.protectedFiles)) assert.equal(hash(file), checksum, `Protected scene data changed: ${file}`);
  const scene = fs.readFileSync(sceneFile,'utf8');
  assert.equal(Object.keys(lock.protectedCode).length, protectedFunctions.length);
  for (const [name, checksum] of Object.entries(lock.protectedCode)) assert.equal(functionHash(scene,name),checksum,`Placement/camera/collision function changed: ${name}`);
  const manifest = JSON.parse(fs.readFileSync(dir + 'authored/hero-ground/manifest.json'));
  const budget = JSON.parse(fs.readFileSync('content/scene-data/hero-street.acceptance.json')).budgets;
  assert.equal(manifest.collisionOrGeometryChanged, false);
  const bytes = Object.entries(manifest.runtime).reduce((sum, [file, info]) => {
    const asset = dir + 'authored/hero-ground/' + file;
    assert.equal(hash(asset), info.sha256, 'Stale ground material manifest');
    return sum + fs.statSync(asset).size;
  }, 0);
  assert.ok(bytes <= budget.additionalRuntimeTextureBytes, 'Ground download exceeds the agreed budget');
  assert.equal(Object.keys(manifest.runtime).length, 3);
  for (const [file, checksum] of Object.entries(manifest.source.sha256)) assert.equal(hash('content/source-assets/ground/polyhaven-brown-mud-dry/'+file), checksum, 'Ground source hash mismatch');
  console.log(`Hero section passed: ${files.length} protected files and ${protectedFunctions.length} placement/camera/collision functions unchanged; ${bytes} ground texture bytes.`);
}
