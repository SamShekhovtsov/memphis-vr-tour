import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const file = 'apps/web-tour/public/assets/generated/glb/animated_street_actors.glb';
const bytes = fs.readFileSync(file);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20,20+jsonLength));
const binary = bytes.subarray(28+jsonLength);
const hash = data => createHash('sha256').update(data).digest('hex');
const floats = id => {
  const a=gltf.accessors[id], v=gltf.bufferViews[a.bufferView];
  assert.equal(a.componentType,5126,'Expected float skin/animation data');
  const width={SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const offset=(v.byteOffset??0)+(a.byteOffset??0), stride=v.byteStride??width*4;
  return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>binary.readFloatLE(offset+i*stride+j*4)));
};
const accessorHash = id => {
  const a=gltf.accessors[id], v=gltf.bufferViews[a.bufferView];
  return hash(binary.subarray(v.byteOffset ?? 0,(v.byteOffset ?? 0)+v.byteLength));
};
const motion = (gltf.animations ?? []).flatMap(animation => animation.channels.map(channel => {
  const sampler=animation.samplers[channel.sampler];
  return {node:gltf.nodes[channel.target.node].name,path:channel.target.path,
    input:accessorHash(sampler.input),output:accessorHash(sampler.output),interpolation:sampler.interpolation};
})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const roots=gltf.nodes.filter(n=>/^actorHero(Carrier|StoneWorker|StreetWalker)$/.test(n.name)).map(n=>({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale})).sort((a,b)=>a.name.localeCompare(b.name));
const locks=Object.fromEntries(['content/scene-data/hero-street.camera-lock.json','content/scene-data/memphis-white-walls.tour.json'].map(p=>[p,hash(fs.readFileSync(p))]));
const state={roots,motion,locks};
const lockFile='content/scene-data/hero-actors.motion-lock.json';
if(process.argv.includes('--record')) {
  assert.ok(!fs.existsSync(lockFile),'Do not overwrite an existing motion lock');
  fs.writeFileSync(lockFile,JSON.stringify(state,null,2)+'\n');
} else {
  const baseline = JSON.parse(fs.readFileSync(lockFile));
  const originalChannels = new Set(baseline.motion.map(c=>`${c.node}:${c.path}`));
  const lockedState = {...state,motion:motion.filter(c=>originalChannels.has(`${c.node}:${c.path}`))};
  assert.deepEqual(JSON.parse(JSON.stringify(lockedState)),baseline,'Actor placements, original motion or camera/route changed');
  const joints = gltf.nodes.filter(n=>/-elbow$|-knee$/.test(n.name));
  assert.equal(joints.length,12,'Expected six elbows and six knees');
  for (const joint of joints) assert.ok(motion.some(c=>c.node===joint.name && c.path==='rotation'),`${joint.name} is not animated`);
  const skinned = gltf.nodes.filter(n=>n.skin!==undefined);
  assert.equal(skinned.length,12,'Each limb must use continuous skin deformation');
  for (const node of skinned) for(const p of gltf.meshes[node.mesh].primitives) {
    assert.ok(p.attributes.JOINTS_0!==undefined && p.attributes.WEIGHTS_0!==undefined,'Missing skin weights');
    for(const weights of floats(p.attributes.WEIGHTS_0)) {
      assert.ok(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1),'Invalid skin weight');
      assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<.0001,'Skin weights must sum to one');
    }
  }
  for(const animation of gltf.animations) for(const channel of animation.channels) {
    const name=gltf.nodes[channel.target.node].name;
    if(!/-elbow$|-knee$/.test(name)||channel.target.path!=='rotation') continue;
    const values=floats(animation.samplers[channel.sampler].output);
    assert.ok(values.every(v=>v.every(Number.isFinite)),`${name}: invalid rotation`);
    assert.ok(values[0].every((v,i)=>Math.abs(v-values.at(-1)[i])<.0001),`${name}: loop seam`);
    if(!name.includes('StoneWorker')) {
      assert.ok(values.some(v=>v.some((c,i)=>Math.abs(c-values[0][i])>.02)),`${name} never bends`);
    }
  }
  assert.equal(roots.length,3);
  const bodyParts = gltf.nodes.filter(n => /-torso$|-limb$/.test(n.name));
  assert.equal(bodyParts.length,15,'Expected one torso and four limbs per actor');
  for (const node of bodyParts) {
    assert.ok(!node.matrix,'Actor body parts must use explicit TRS transforms');
    assert.ok(Math.hypot(...(node.translation ?? [0,0,0])) < 1,
      `${node.name} is detached from its actor/pivot; check Blender parent inverses`);
  }
  console.log('Actor lock passed: roots, original motion, district and cameras unchanged; 12 animated elbow/knee joints and skinned limbs.');
}
