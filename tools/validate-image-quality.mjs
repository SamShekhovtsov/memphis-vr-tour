import {crowdExpected} from "./lib/crowd-clarity-revision.mjs";
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {qualityRevision as r} from './lib/image-quality-revision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(r,'Record the reviewed image-quality revision');
for(const [f,v]of Object.entries(r.files)){assert.equal(hash(fs.readFileSync(f)),crowdExpected(f,v.afterRaw),f);assert.equal(hash(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,sha]of Object.entries(r.additions))assert.equal(hash(fs.readFileSync(f)),crowdExpected(f,sha),f);
const m=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-street/manifest.json'));
assert.equal(m.imageQualityGeometry.removedDuplicateClothSkins,2);assert.equal(m.imageQualityGeometry.buildingsMoved,false);assert.equal(m.imageQualityGeometry.collisionChanged,false);
assert.deepEqual(Object.keys(m.imageQualityGeometry.parts),['mid']);assert.equal(m.imageQualityGeometry.parts.mid.removedTriangles,1760);assert.equal(m.imageQualityGeometry.parts.mid.retainedVerticesMoved,0);assert.equal(m.imageQualityGeometry.parts.mid.retainedUvsChanged,false);
assert.equal(hash(fs.readFileSync('node_modules/@babylonjs/core/Shaders/fxaa.fragment.js')),r.vendorFxaaSha,'Review the fused resolve after changing Babylon');
console.log('Image quality integrity passed: bounded rendering changes, exactly two retired cloth skins, original baselines and pinned FXAA preserved');
