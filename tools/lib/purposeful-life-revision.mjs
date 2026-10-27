import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const file='content/scene-data/purposeful-life.revision.json';
export const lifeRevision=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
export function lifeExpected(f,previous,normalized=false){const r=lifeRevision?.files[f];if(!r)return previous;if(!normalized&&previous===r.beforeRaw)return r.afterRaw;assert.equal(previous,r.before,'Purposeful life baseline mismatch: '+f);return r.after;}
export function priorLifeSource(f){const r=lifeRevision?.files[f];if(!r)return fs.readFileSync(f,'utf8');assert.equal(hash(fs.readFileSync(f)),r.afterRaw,'Unrecorded resident source: '+f);const b=fs.readFileSync(r.baseline);assert.equal(hash(b),r.beforeRaw,'Resident baseline changed: '+f);return b.toString('utf8');}
