import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='apps/web-tour/public/assets/authored/people/';
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
let total=0;
for(const asset of manifest.assets){
  assert.equal(asset.license,'CC0-1.0');
  const source=fs.readFileSync(`content/source-assets/characters/${asset.id}.glb`);
  assert.equal(createHash('sha256').update(source).digest('hex'),asset.sourceSha256);
  const bytes=fs.readFileSync(root+asset.fileName);total+=bytes.length;
  const length=bytes.readUInt32LE(12), gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
  assert.ok(gltf.skins.some(s=>s.joints.length>=150),'Full anatomical rig missing');
  assert.ok(gltf.nodes.some(n=>n.name==='wrapped-linen'),'Clothing missing');
  if(asset.id==='female')assert.ok(gltf.nodes.some(n=>n.name==='linen-bodice'),'Upper garment missing');
  let triangles=0;
  for(const mesh of gltf.meshes)for(const p of mesh.primitives){
    triangles+=gltf.accessors[p.indices].count/3;
    assert.notEqual(p.attributes.JOINTS_0,undefined,'Unskinned body/garment');
    const a=gltf.accessors[p.attributes.WEIGHTS_0],v=gltf.bufferViews[a.bufferView];
    assert.equal(a.componentType,5126);
    for(let i=0;i<a.count;i++){
      const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??16);
      const weights=Array.from({length:4},(_,j)=>bin.readFloatLE(offset+j*4));
      assert.ok(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1));
      assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<.0001,'Unnormalized weights');
    }
  }
  assert.ok(triangles<45000,`Character exceeds triangle budget: ${triangles}`);
  console.log(`${asset.id}: ${triangles} triangles; anatomical rig, clothing, weights and provenance passed`);
}
assert.ok(total<4000000,`Shared character download exceeds 4 MB: ${total}`);
