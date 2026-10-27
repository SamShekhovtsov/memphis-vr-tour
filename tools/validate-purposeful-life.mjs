import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {lifeRevision as r} from './lib/purposeful-life-revision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const allowed=new Set(Object.keys(JSON.parse(fs.readFileSync('content/source-assets/purposeful-life-baseline/index.json'))));
assert.ok(r);for(const [f,v]of Object.entries(r.files)){assert.ok(allowed.has(f));assert.equal(hash(fs.readFileSync(f)),v.afterRaw,f);assert.equal(hash(fs.readFileSync(v.baseline)),v.beforeRaw,v.baseline);}
for(const [f,h]of Object.entries(r.additions))assert.equal(hash(fs.readFileSync(f)),h,f);
console.log('Purposeful life source integrity passed; previous immutable snapshots retained');
