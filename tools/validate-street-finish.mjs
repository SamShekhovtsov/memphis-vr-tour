import {interactionExpected} from './lib/district-interaction-revision.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {finishRevision} from './lib/street-finish-revision.mjs';
assert.ok(finishRevision,'Record the reviewed finish revision first');
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [f,r]of Object.entries(finishRevision.files)){const bytes=r.normalizedText?fs.readFileSync(f,'utf8').replaceAll('\r\n','\n'):fs.readFileSync(f);assert.equal(hash(bytes),interactionExpected(f,r.after,r.normalizedText),f);}
for(const [f,sha]of Object.entries(finishRevision.additions))assert.equal(hash(fs.readFileSync(f)),sha,f);
const root='apps/web-tour/public/assets/authored/hero-street/';const m=JSON.parse(fs.readFileSync(root+'manifest.json'));
assert.ok(m.finishedStreet.existingUvChartsPreserved);assert.equal(m.finishedStreet.newObjects,false);assert.equal(m.finishedStreet.movingPeopleBaked,false);
assert.equal(m.finalLighting.directSunBaked,false);assert.equal(m.finalLighting.albedoBaked,false);assert.equal(m.finalLighting.movingActorsBaked,false);
assert.equal(m.finalLighting.resolution,2048);assert.equal(m.finalLighting.samples,48);assert.ok(m.finalLighting.irradianceRange>=1);
for(const v of Object.values(m.finalLighting.audit))assert.equal(v.newClippedChannels,0);
for(const a of m.assets){const triangles=a.lods.map(l=>l.triangles);assert.ok(a.triangles>triangles[0]&&triangles[0]>triangles[1]);}
const decoderRoot='apps/web-tour/public/assets/decoders/ktx2/';const d=JSON.parse(fs.readFileSync(decoderRoot+'manifest.json'));
for(const [f,r]of Object.entries(d.files))assert.equal(hash(fs.readFileSync(decoderRoot+f)),r.sha256);
const trial=JSON.parse(fs.readFileSync(root+'compression-trial.json'));
for(const r of Object.values(trial.records)){const b=fs.readFileSync(root+r.file);assert.equal(hash(b),r.sha256);assert.equal(hash(fs.readFileSync(root+r.source)),r.sourceSha256);assert.equal(b.readUInt32LE(20),1024);assert.equal(b.readUInt32LE(24),1024);assert.equal(b.readUInt32LE(40),11,'Full mip chain required');}
console.log('Finish validation passed: bounded source changes, HDR-preserving lighting, existing UVs/LODs, pinned sources and self-hosted compression trial');
