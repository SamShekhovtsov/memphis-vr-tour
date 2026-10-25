import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline='content/generated/steps78-before/';const root='apps/web-tour/public/assets/authored/hero-street/';
const renderer=JSON.parse(fs.readFileSync('content/scene-data/hero-street.render-performance-revision.json'));
const names=['manifest.json',...['near','mid','far'].flatMap(p=>[p+'-irradiance.png',p+'-irradiance.webp',...['','.lod1','.lod2'].map(l=>`hero_street_corridor_${p}${l}.glb`)])];
const pairs=names.map(n=>[root+n,baseline+'hero-street/'+n]);
for(const n of ['RenderingTiers.ts','HeroStreetMaterials.ts'])pairs.push(['apps/web-tour/src/scene/'+n,baseline+n]);
const read=(f,normalized)=>normalized?fs.readFileSync(f,'utf8').replaceAll('\r\n','\n'):fs.readFileSync(f);
const previousRevision=fs.existsSync('content/scene-data/hero-street.steps78-revision.json')?JSON.parse(fs.readFileSync('content/scene-data/hero-street.steps78-revision.json')):null;
const files={};
for(const [file,source]of pairs){const previous=renderer.protectedFiles[file];assert.ok(previous);const before=fs.existsSync(source)?hash(read(source,previous.normalizedText)):previousRevision?.files[file]?.before;assert.equal(before,previous.sha256,'Baseline archive differs from protected source');files[file]={before,after:hash(read(file,previous.normalizedText)),beforeRaw:fs.existsSync(source)?hash(fs.readFileSync(source)):previousRevision?.files[file]?.beforeRaw,afterRaw:hash(fs.readFileSync(file)),normalizedText:previous.normalizedText};}
const additions=[...fs.readdirSync('content/source-assets/street-finish').filter(n=>!n.endsWith('.blend1')).map(n=>'content/source-assets/street-finish/'+n),...fs.readdirSync('content/source-assets/lighting/steps78-bake').map(n=>'content/source-assets/lighting/steps78-bake/'+n),...fs.readdirSync('content/source-assets/lighting/steps78-base').map(n=>'content/source-assets/lighting/steps78-base/'+n),'content/scene-data/hero-street.finish-lighting.json','apps/web-tour/src/scene/StreetTextureTrial.ts',...fs.readdirSync('apps/web-tour/public/assets/decoders/ktx2').map(n=>'apps/web-tour/public/assets/decoders/ktx2/'+n),...['albedo','normal','orm'].map(n=>root+'hero-plaster-'+n+'.ktx2'),root+'compression-trial.json'];
const out='content/scene-data/hero-street.steps78-revision.json';
if(fs.existsSync(out)){assert.ok(process.argv.includes('--refresh'));const old=JSON.parse(fs.readFileSync(out));for(const [file,r]of Object.entries(old.files))assert.equal(r.before,files[file].before);}
fs.writeFileSync(out,JSON.stringify({date:'2026-10-25',scope:'Authorized finished-street lighting rebake and existing-surface rollout. No roots, paths, camera, people, collision or source placement changes.',files,additions:Object.fromEntries(additions.map(f=>[f,hash(fs.readFileSync(f))]))},null,2)+'\n');console.log('Recorded bounded finish revision; previous protected hashes retained');
