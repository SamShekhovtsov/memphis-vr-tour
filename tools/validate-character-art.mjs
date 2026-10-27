import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {artRevision as revision} from './lib/character-art-revision.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),index=JSON.parse(fs.readFileSync('content/source-assets/character-art-baseline/index.json'));
const permitted=new Set(['tools/lib/purposeful-life-revision.mjs','tools/validate-purposeful-life.mjs','tools/validate-character-materials.mjs','apps/web-tour/public/assets/authored/people/manifest.json','apps/web-tour/public/assets/authored/people/crowd/manifest.json',...['male','female'].flatMap(s=>['apps/web-tour/public/assets/authored/people/hero_'+s+'.glb',...[1,2].flatMap(l=>['apps/web-tour/public/assets/authored/people/crowd/hero_'+s+'_lod'+l+'.glb','content/source-assets/characters/crowd-'+s+'-lod'+l+'.blend'])])]);
assert.deepEqual(new Set(Object.keys(index)),permitted);
for(const [f,r]of Object.entries(revision.files)){assert.ok(permitted.has(f));assert.equal(sha(fs.readFileSync(f)),r.afterRaw,f);assert.equal(sha(fs.readFileSync(r.baseline)),r.beforeRaw,r.baseline);}
function glb(path){const bytes=fs.readFileSync(path),n=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);const array=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType];assert.ok(!v.byteStride);return Array.from({length:a.count},(_,row)=>Array.from({length:width},(_,k)=>{const p=(v.byteOffset??0)+(a.byteOffset??0)+(row*width+k)*size;return a.componentType===5126?bin.readFloatLE(p):size===4?bin.readUInt32LE(p):size===2?bin.readUInt16LE(p):bin[p];}));};return {j,array,primitive:name=>j.meshes.find(m=>m.name===name).primitives[0]};}
const audit=JSON.parse(fs.readFileSync('content/source-assets/characters/character-art-audit.json'));
for(const sex of ['male','female']){
 const file='apps/web-tour/public/assets/authored/people/hero_'+sex+'.glb',before=glb(index[file]),after=glb(file),report=audit.find(r=>r.sex===sex);
 for(const key of ['nodes','skins','scenes','scene']){
  if(key==='skins'){assert.deepEqual(after.j.skins.map(s=>({...s,inverseBindMatrices:0})),before.j.skins.map(s=>({...s,inverseBindMatrices:0})));assert.deepEqual(after.array(after.j.skins[0].inverseBindMatrices),before.array(before.j.skins[0].inverseBindMatrices));}
  else assert.deepEqual(after.j[key],before.j[key],sex+' changed '+key);
 }
 assert.deepEqual(after.j.materials.slice(0,3),before.j.materials,'Existing material inputs changed');
 for(const name of ['base','wrapped-linen','cropped-hair','high-poly']){
  const b=before.primitive(name),a=after.primitive(name);
  for(const key of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0'])assert.deepEqual(after.array(a.attributes[key]),before.array(b.attributes[key]),sex+' '+name+' changed '+key);
  const bp=before.array(b.attributes.POSITION),ap=after.array(a.attributes.POSITION);assert.equal(ap.length,bp.length);
  for(let i=0;i<ap.length;i++){
   const d=Math.hypot(...ap[i].map((v,k)=>v-bp[i][k]));assert.ok(d<=(name==='base'?.00061:name==='wrapped-linen'?.041:0),name+' moved outside reference refinement');
   if(d>0&&name==='base'){assert.ok(bp[i][1]>Math.max(...bp.map(v=>v[1]))*.87);assert.ok(Math.abs(bp[i][0])<.095);}
  }
  for(const normal of after.array(a.attributes.NORMAL))assert.ok(Math.abs(Math.hypot(...normal)-1)<.02,'Invalid surface normal');
 }
 const b=before.primitive('base'),a=after.primitive('base'),old=before.array(b.indices).flat(),removed=new Set(report.concealedBodyTriangleIds),expected=[];
 for(let t=0;t<old.length/3;t++)if(!removed.has(t))expected.push(...old.slice(t*3,t*3+3));
 assert.deepEqual(after.array(a.indices).flat(),expected,'Anatomy removed outside explicit concealed faces');
 const positions=before.array(b.attributes.POSITION);
 for(const t of removed)for(const v of old.slice(t*3,t*3+3)){assert.ok(Math.abs(positions[v][0])<.191);assert.ok(positions[v][1]>.34&&positions[v][1]<1.261,'Exposed face/hand/hem skin removed');}
 if(sex==='female'){
  const p=after.primitive('linen-bodice'),pos=after.array(p.attributes.POSITION);assert.equal(pos.length,1850);assert.equal(after.array(p.indices).length,3456*3);
  assert.ok(pos.every(v=>Math.abs(v[0])<.23&&v[1]>=1.024&&v[1]<1.405),'Garment escaped torso/shoulder bounds');
  for(const weights of after.array(p.attributes.WEIGHTS_0))assert.ok(Math.abs(weights.reduce((n,w)=>n+w,0)-1)<.0001);
 }
 if(report.eyes){const p=after.primitive('high-poly');assert.equal(after.j.materials[p.material].name,'hero-eye');const rgb=after.array(p.attributes.COLOR_0);assert.ok(rgb.some(c=>c[0]<8)&&rgb.some(c=>c[0]>100),'Eye pupil/sclera detail missing');}
 console.log(sex+': fixed rig/UV/weights, covered-face removal, garment bounds and reference anatomy passed');
}
const lods=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/crowd/manifest.json'));
for(const r of lods.assets){assert.equal(sha(fs.readFileSync(r.file)),r.sha256);assert.equal(sha(fs.readFileSync('apps/web-tour/public/assets/authored/people/hero_'+r.sex+'.glb')),r.sourceSha256);}
console.log('Character-art revision integrity passed; LODs match current reference assets');
