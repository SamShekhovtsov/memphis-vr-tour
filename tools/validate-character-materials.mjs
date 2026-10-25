import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {finishExpected} from './lib/street-finish-revision.mjs';
const root='apps/web-tour/public/assets/authored/people/';
const lockFile='content/scene-data/hero-people.material-lock.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const jsonHash=j=>hash(JSON.stringify(j));
const readGlb=file=>{const b=fs.readFileSync(file),n=b.readUInt32LE(12);return {j:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
const originalAvatar=()=>fs.readFileSync('content/generated/people-materials-before/HeroPeople.ts','utf8').replaceAll('\r\n','\n');
if(process.argv.includes('--record')) {
  assert.ok(!fs.existsSync(lockFile),'Do not overwrite the original material baseline');
  const files=['content/scene-data/hero-street.camera-lock.json','content/scene-data/memphis-white-walls.tour.json','content/scene-data/hero-actors.motion-lock.json',
    'content/scene-data/hero-street.daylight.json','apps/web-tour/src/scene/MemphisWhiteWallsScene.ts','apps/web-tour/src/scene/GroundContactIK.ts',
    'apps/web-tour/public/assets/generated/glb/animated_street_actors.glb',
    ...['hero-street','hero-ground'].flatMap(folder=>fs.readdirSync('apps/web-tour/public/assets/authored/'+folder).filter(n=>/\.(glb|json|webp|png)$/.test(n)).map(n=>'apps/web-tour/public/assets/authored/'+folder+'/'+n))];
  const avatars=Object.fromEntries(['male','female'].map(sex=>{
    const {j,bin}=readGlb(`content/generated/people-materials-before/hero_${sex}.glb`);
    return [sex,{binaryBytes:bin.length,binarySha:hash(bin),accessors:j.accessors,bufferViews:j.bufferViews,
      fixedFields:jsonHash({nodes:j.nodes,skins:j.skins,animations:j.animations,materials:j.materials,scenes:j.scenes}),
      primitives:j.meshes.map(m=>m.primitives)}];
  }));
  fs.writeFileSync(lockFile,JSON.stringify({date:'2026-10-25',avatars,avatarCodeSha:hash(originalAvatar()),protectedFiles:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(f))]))},null,2)+'\n');
}
const lock=JSON.parse(fs.readFileSync(lockFile));
const revisionFile='content/scene-data/hero-street.steps56-revision.json';
const revision=fs.existsSync(revisionFile)?JSON.parse(fs.readFileSync(revisionFile)):{files:{},avatars:{}};
for(const [file,change] of Object.entries(revision.files)) {
  assert.match(file,/^apps\/web-tour\/(src\/scene\/MemphisWhiteWallsScene\.ts|public\/assets\/authored\/hero-street\/(manifest\.json|(near|mid|far)-irradiance\.(png|webp)))$/,'Revision outside approved shadow scope');
  assert.equal(change.before,lock.protectedFiles[file],'Original baseline changed');
}
const performanceRevisionFile='content/scene-data/hero-people.performance-revision.json';
const performanceRevision=fs.existsSync(performanceRevisionFile)?JSON.parse(fs.readFileSync(performanceRevisionFile)):null;
for(const [file,sha] of Object.entries(lock.protectedFiles)){
  const edit=performanceRevision?.files[file];
  if(edit){
    assert.equal(file,'apps/web-tour/src/scene/GroundContactIK.ts','Performance exception outside IK matrix helper');
    assert.equal(edit.beforeSha,sha,'Original IK baseline changed');
  }
  assert.equal(hash(fs.readFileSync(file)),finishExpected(file,edit?.afterSha??revision.files[file]?.after??sha),'Scene/path/lighting changed: '+file);
}
if(revision.sourceEdits) {
  let original=fs.readFileSync('apps/web-tour/src/scene/MemphisWhiteWallsScene.ts','utf8');
  assert.equal(revision.sourceEdits.length,2);
  for(const edit of revision.sourceEdits) {
    assert.ok(['import { authoredHeroRoot, createHeroMaterialBinder, type HeroBakeManifest } from "./HeroStreetMaterials";','shadows.normalBias = .035;'].includes(edit.before));
    assert.ok(original.includes(edit.after));original=original.replace(edit.after,edit.before);
  }
  assert.equal(hash(original),lock.protectedFiles['apps/web-tour/src/scene/MemphisWhiteWallsScene.ts'],'More than shadow bias changed');
}
let checkedAvatarCode=fs.readFileSync('apps/web-tour/src/scene/HeroPeople.ts','utf8').replaceAll('\r\n','\n');
if(performanceRevision) {
  assert.deepEqual(Object.keys(performanceRevision.files).sort(),['apps/web-tour/src/main.ts','apps/web-tour/src/scene/HeroPeople.ts','apps/web-tour/src/scene/HeroWorkerPose.ts','apps/web-tour/src/scene/GroundContactIK.ts'].sort());
  for(const [file,edit] of Object.entries(performanceRevision.files)) {
    const code=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
    assert.equal(hash(code),edit.afterSha,'Unrecorded performance source change: '+file);
    assert.equal(code.slice(edit.offset,edit.offset+edit.after.length),edit.after);
    const original=code.slice(0,edit.offset)+edit.before+code.slice(edit.offset+edit.after.length);
    assert.equal(hash(original),edit.beforeSha,'Performance baseline changed');
    if(file.endsWith('/HeroPeople.ts'))checkedAvatarCode=original;
  }
}
const avatarCode=checkedAvatarCode
  .replace('import { createPeopleMaterialBinder } from "./HeroPeopleMaterials";\n','')
  .replace('  const bindPeopleMaterials = createPeopleMaterialBinder(scene);\n','')
  .replace('      bindPeopleMaterials(mesh);\n','');
let originalAvatarCode=avatarCode;
for(const edit of revision.avatarPoseEdits??[]) {
  const after=edit.after.replaceAll('\r\n','\n'),before=edit.before.replaceAll('\r\n','\n');
  assert.ok(originalAvatarCode.includes(after),'Worker edit missing');originalAvatarCode=originalAvatarCode.replace(after,before);
}
assert.equal(hash(originalAvatarCode),lock.avatarCodeSha,'Avatar changes escaped the explicit worker pose refinements');
for(const sex of ['male','female']) {
  const {j,bin}=readGlb(root+`hero_${sex}.glb`),old=lock.avatars[sex];
  const fit=revision.avatars[sex],restored=Buffer.from(bin.subarray(0,old.binaryBytes));
  const allowed=new Map();
  if(fit) {
    const payload=fs.readFileSync(revision.baselinePayload.file);
    assert.equal(hash(payload),revision.baselinePayload.sha256);
    for(const stream of fit.streams) {
      assert.ok(['POSITION','NORMAL','JOINTS_0','WEIGHTS_0'].includes(stream.semantic));
      assert.ok(j.nodes.some(n=>n.name==='wrapped-linen'&&n.mesh===stream.mesh),'Only the existing wrap may change');
      assert.ok(old.primitives[stream.mesh].some(p=>p.attributes[stream.semantic]===stream.accessor));
      const a=old.accessors[stream.accessor],v=old.bufferViews[a.bufferView];
      assert.equal(stream.offset,v.byteOffset??0);assert.equal(stream.bytes,v.byteLength);
      assert.equal(hash(bin.subarray(stream.offset,stream.offset+stream.bytes)),stream.afterSha);
      const prior=payload.subarray(stream.beforeOffset,stream.beforeOffset+stream.bytes);
      prior.copy(restored,stream.offset);
      const expected={...a};
      if(stream.semantic==='POSITION') {
        expected.min=stream.accessorAfter.min;expected.max=stream.accessorAfter.max;
        for(let n=0;n<a.count;n++) {
          const at=stream.offset+n*12;
          const before=[0,4,8].map(o=>prior.readFloatLE(n*12+o));
          const after=[0,4,8].map(o=>bin.readFloatLE(at+o));
          assert.equal(after[1],before[1],'Garment height changed');
          assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])<=.071,'Clearance exceeds 71mm');
        }
      }
      if(stream.semantic==='NORMAL') for(let n=0;n<a.count;n++) {
        const at=stream.offset+n*12;
        assert.ok(Math.abs(Math.hypot(bin.readFloatLE(at),bin.readFloatLE(at+4),bin.readFloatLE(at+8))-1)<.015,'Garment normal is not unit length');
      }
      assert.deepEqual(stream.accessorAfter,expected,'Accessor schema changed');
      allowed.set(stream.accessor,stream.accessorAfter);
    }
    assert.equal(hash(bin.subarray(old.binaryBytes)),fit.materialTailSha,'Material UV/colour payload changed');
  }
  assert.equal(hash(restored),old.binarySha,'Body/rig/original data changed outside approved garment streams');
  j.accessors.slice(0,old.accessors.length).forEach((a,i)=>assert.deepEqual(a,allowed.get(i)??old.accessors[i]));
  assert.deepEqual(j.bufferViews.slice(0,old.bufferViews.length),old.bufferViews);
  assert.equal(jsonHash({nodes:j.nodes,skins:j.skins,animations:j.animations,materials:j.materials,scenes:j.scenes}),old.fixedFields,'Rig/material baseline/root changed');
  j.meshes.forEach((mesh,m)=>mesh.primitives.forEach((p,i)=>{
    const original=old.primitives[m][i];
    for(const [key,value] of Object.entries(original.attributes))assert.equal(p.attributes[key],value);
    assert.equal(p.indices,original.indices);assert.equal(p.material,original.material);
    assert.ok(p.attributes.TEXCOORD_0!==undefined);
    const a=j.accessors[p.attributes.COLOR_0],v=j.bufferViews[a.bufferView];
    assert.equal(a.componentType,5121);assert.equal(a.normalized,true);
    const skin=j.materials[p.material].name==='hero-skin';
    const pos=j.accessors[p.attributes.POSITION],pv=j.bufferViews[pos.bufferView];
    for(let n=0;n<a.count;n++) {
      const alpha=bin[(v.byteOffset??0)+n*4+3];
      assert.ok(alpha===255 || (skin && alpha===0),'Only binary skin coverage may use alpha');
      if(alpha===0) {
        const offset=(pv.byteOffset??0)+(pos.byteOffset??0)+n*(pv.byteStride??12);
        const x=bin.readFloatLE(offset),y=bin.readFloatLE(offset+4),t=y/(sex==='male'?1.78645:1.5929);
        assert.ok(Math.abs(x)<.245 && t>(sex==='male'?.4:.3) && t<(sex==='male'?.55:.66),'Skin coverage escaped garment interior');
      }
    }
  }));
}
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
let bytes=0;
for(const [name,record] of Object.entries(manifest.materialRefinement.maps)){
  const data=fs.readFileSync(root+name);assert.equal(hash(data),record.sha256);bytes+=data.length;
}
assert.ok(bytes<=1500000,'Character texture download exceeds 1.5MB');
console.log(`Character integrity passed: body/rig/paths unchanged, ${Object.keys(revision.avatars).length} explicit garment revisions and ${Object.keys(revision.files).length} shadow revisions checked; ${Object.keys(lock.protectedFiles).length} scene files verified; ${bytes} texture bytes.`);
