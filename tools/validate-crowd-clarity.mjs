import {zonesStepExpected} from "./lib/zones-steps-revision.mjs";
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {crowdRevision as r} from './lib/crowd-clarity-revision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(r);
for(const [f,v]of Object.entries(r.files)){assert.equal(hash(fs.readFileSync(f)),zonesStepExpected(f,v.afterRaw),f);assert.equal(hash(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,h]of Object.entries(r.additions))assert.equal(hash(fs.readFileSync(f)),zonesStepExpected(f,h),f);
console.log('Crowd and line-quality integrity passed; original snapshots retained');
