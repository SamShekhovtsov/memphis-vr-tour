import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {artRevision as revision} from './lib/character-art-revision.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),index=JSON.parse(fs.readFileSync('content/source-assets/character-art-baseline/index.json'));
const permitted=new Set(['tools/lib/purposeful-life-revision.mjs','tools/validate-purposeful-life.mjs','tools/validate-character-materials.mjs','apps/web-tour/public/assets/authored/people/manifest.json','apps/web-tour/public/assets/authored/people/crowd/manifest.json',...['male','female'].flatMap(s=>['apps/web-tour/public/assets/authored/people/hero_'+s+'.glb',...[1,2].flatMap(l=>['apps/web-tour/public/assets/authored/people/crowd/hero_'+s+'_lod'+l+'.glb','content/source-assets/characters/crowd-'+s+'-lod'+l+'.blend'])])]);
assert.deepEqual(new Set(Object.keys(index)),permitted);
for(const [f,r]of Object.entries(revision.files)){assert.ok(permitted.has(f));assert.equal(sha(fs.readFileSync(f)),r.afterRaw,f);assert.equal(sha(fs.readFileSync(r.baseline)),r.beforeRaw,r.baseline);}
for(const [f,hash]of Object.entries(revision.artifacts??{}))assert.equal(sha(fs.readFileSync(f)),hash,'Unrecorded authoring artifact: '+f);
function glb(path){const bytes=fs.readFileSync(path),n=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);const array=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType];assert.ok(!v.byteStride);return Array.from({length:a.count},(_,row)=>Array.from({length:width},(_,k)=>{const p=(v.byteOffset??0)+(a.byteOffset??0)+(row*width+k)*size;return a.componentType===5126?bin.readFloatLE(p):size===4?bin.readUInt32LE(p):size===2?bin.readUInt16LE(p):bin[p];}));};return {j,array,primitive:name=>j.meshes.find(m=>m.name===name).primitives[0]};}
const audit=JSON.parse(fs.readFileSync('content/source-assets/characters/character-art-audit.json'));
for(const sex of ['male','female']){
 const file='apps/web-tour/public/assets/authored/people/hero_'+sex+'.glb',before=glb(index[file]),after=glb(file),report=audit.find(r=>r.sex===sex);
 const reference=report.referenceAnatomy?glb('content/source-assets/characters/character-art-reference-'+sex+'.glb'):before;
 for(const key of ['nodes','skins','scenes','scene']){
  if(key==='skins'){assert.deepEqual(after.j.skins.map(s=>({...s,inverseBindMatrices:0})),before.j.skins.map(s=>({...s,inverseBindMatrices:0})));assert.deepEqual(after.array(after.j.skins[0].inverseBindMatrices),before.array(before.j.skins[0].inverseBindMatrices));}
  else assert.deepEqual(after.j[key],before.j[key],sex+' changed '+key);
 }
 assert.deepEqual(after.j.materials.slice(0,3),before.j.materials,'Existing material inputs changed');
 for(const name of ['base','wrapped-linen','cropped-hair','high-poly']){
  const b=before.primitive(name),a=after.primitive(name);
  if(report.referenceAnatomy&&name==='base'){
   const source=reference.primitive('base');for(const key of ['POSITION','WEIGHTS_0','TEXCOORD_0'])assert.deepEqual(after.array(a.attributes[key]),reference.array(source.attributes[key]),'Reference '+key+' changed');
   const names=after.j.skins[0].joints.map(i=>after.j.nodes[i].name),sourceNames=reference.j.skins[0].joints.map(i=>reference.j.nodes[i].name);
   assert.deepEqual(after.array(a.attributes.JOINTS_0),reference.array(source.attributes.JOINTS_0).map(row=>row.map(i=>names.indexOf(sourceNames[i]))));
   const pos=after.array(a.attributes.POSITION),tri=after.array(a.indices).flat(),groups=new Map(),weld=pos.map(v=>{const k=v.map(x=>x.toFixed(5)).join();if(!groups.has(k))groups.set(k,groups.size);return groups.get(k);}),edges=new Map();
   for(let t=0;t<tri.length;t+=3)for(const [u,v]of [[0,1],[1,2],[2,0]])if(pos[tri[t+u]][1]>1.37&&pos[tri[t+v]][1]>1.37){const k=[weld[tri[t+u]],weld[tri[t+v]]].sort((a,b)=>a-b).join();edges.set(k,(edges.get(k)??0)+1);}
   assert.equal([...edges.values()].filter(n=>n===1).length,0,'Reference head has geometric cracks');
   continue;
  }
  if(report.referenceAnatomy&&name==='cropped-hair'){
   const pos=after.array(a.attributes.POSITION),h=Math.max(...after.array(after.primitive('base').attributes.POSITION).map(v=>v[1]));assert.ok(pos.every(v=>v[1]>.955*h-.001&&v[1]<h+.005&&Math.abs(v[0])<.1));
   const joints=after.array(a.attributes.JOINTS_0),weights=after.array(a.attributes.WEIGHTS_0),head=after.j.skins[0].joints.findIndex(i=>after.j.nodes[i].name==='head');assert.ok(joints.every(row=>row[0]===head));assert.ok(weights.every(row=>row[0]===1));continue;
  }
  for(const key of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0'])assert.deepEqual(after.array(a.attributes[key]),before.array(b.attributes[key]),sex+' '+name+' changed '+key);
  const bp=before.array(b.attributes.POSITION),ap=after.array(a.attributes.POSITION),height=Math.max(...before.array(before.primitive('base').attributes.POSITION).map(v=>v[1]));assert.equal(ap.length,bp.length);
  const oldColor=before.array(b.attributes.COLOR_0),newColor=after.array(a.attributes.COLOR_0);
  for(let i=0;i<oldColor.length;i++)if(JSON.stringify(oldColor[i])!==JSON.stringify(newColor[i])){assert.ok(report.eyes);if(name==='base')assert.ok(bp[i][1]>.87*height&&Math.abs(bp[i][0])<.105&&bp[i][2]>.05,'Colour escaped facial landmarks');else assert.equal(name,'high-poly','Colour changed outside face/eyes');assert.equal(newColor[i][3],255);}
  for(let i=0;i<ap.length;i++){
   const d=Math.hypot(...ap[i].map((v,k)=>v-bp[i][k]));assert.ok(d<=(name==='base'?.00061:name==='wrapped-linen'?.041:0),name+' moved outside reference refinement');
   if(d>0&&name==='base'){assert.ok(bp[i][1]>height*.87);assert.ok(Math.abs(bp[i][0])<.095);}
  }
  for(const normal of after.array(a.attributes.NORMAL))assert.ok(Math.abs(Math.hypot(...normal)-1)<.02,'Invalid surface normal');
 }
 const b=reference.primitive('base'),a=after.primitive('base'),old=reference.array(b.indices).flat(),removed=new Set(report.concealedBodyTriangleIds),expected=[];
 for(let t=0;t<old.length/3;t++)if(!removed.has(t))expected.push(...old.slice(t*3,t*3+3));
 assert.deepEqual(after.array(a.indices).flat(),expected,'Anatomy removed outside explicit concealed faces');
 const positions=reference.array(b.attributes.POSITION);
 for(const t of removed)for(const v of old.slice(t*3,t*3+3)){assert.ok(Math.abs(positions[v][0])<.191);assert.ok(positions[v][1]>.34&&positions[v][1]<1.261,'Exposed face/hand/hem skin removed');}
 if(sex==='female'){
  const p=after.primitive('linen-bodice'),pos=after.array(p.attributes.POSITION);assert.equal(pos.length,1850);assert.equal(after.array(p.indices).length,3456*3);
  assert.ok(pos.every(v=>Math.abs(v[0])<.23&&v[1]>=1.024&&v[1]<1.405),'Garment escaped torso/shoulder bounds');
  for(const weights of after.array(p.attributes.WEIGHTS_0))assert.ok(Math.abs(weights.reduce((n,w)=>n+w,0)-1)<.0001);
 }
 if(report.eyes){const p=after.primitive('high-poly');assert.equal(after.j.materials[p.material].name,'hero-eye');const rgb=after.array(p.attributes.COLOR_0);assert.ok(rgb.some(c=>c[0]<8)&&rgb.some(c=>c[0]>100),'Eye pupil/sclera detail missing');}
 console.log(sex+': fixed rig, source-mapped skinning, covered-face removal, garment bounds and crack-free reference anatomy passed');
}
const topology=JSON.parse(fs.readFileSync('content/source-assets/characters/character-art-reference-topology.json'));
for(const r of topology){assert.equal(r.boundaryEdges,0);assert.equal(sha(fs.readFileSync('content/source-assets/characters/character-art-reference-'+r.sex+'.glb')),r.sha256);assert.equal(sha(fs.readFileSync('content/source-assets/characters/'+r.sex+'.glb')),r.sourceSha256);}
const lods=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/crowd/manifest.json'));
for(const r of lods.assets){assert.equal(sha(fs.readFileSync(r.file)),r.sha256);assert.equal(sha(fs.readFileSync('apps/web-tour/public/assets/authored/people/hero_'+r.sex+'.glb')),r.sourceSha256);}
console.log('Character-art revision integrity passed; LODs match current reference assets');
