import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const lock = JSON.parse(fs.readFileSync('content/scene-data/hero-street.section-lock.json'));
const files = {};
for (const part of ['near','mid','far']) for (const suffix of ['','.lod1','.lod2']) {
  const name = `hero_street_corridor_${part}${suffix}.glb`;
  const file = 'apps/web-tour/public/assets/authored/hero-street/'+name;
  const before = hash('content/generated/surfaces34-before/hero-street/'+name);
  assert.equal(before,lock.protectedFiles[file], 'Retain the real steps 1–2 baseline');
  files[file] = {before,after:hash(file)};
}
const output = 'content/scene-data/hero-street.steps34-revision.json';
if (fs.existsSync(output)) {
  assert.ok(process.argv.includes('--refresh'),'Pass --refresh explicitly for a reviewed iteration');
  const previous = JSON.parse(fs.readFileSync(output));
  for (const [file,change] of Object.entries(previous.files)) assert.equal(change.before,files[file].before,'Original baseline must stay fixed');
}
fs.writeFileSync(output,JSON.stringify({date:'2026-10-24',scope:'Authorized steps 3–4, existing visual mesh finish only; original source meshes and all placement/camera/path/collision locks retained',files},null,2)+'\n');
