import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const source='docs/design/screenshots/',out='docs/design/performance/purposeful-residents/';fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),index={};
for(const name of fs.readdirSync(source).filter(f=>f.includes('purposeful')&&f.endsWith('.json'))){
 const raw=fs.readFileSync(source+name),compressed=gzipSync(raw,{level:9});assert.deepEqual(gunzipSync(compressed),raw);
 fs.writeFileSync(out+name+'.gz',compressed);index[name]={archive:name+'.gz',sha256:sha(raw),bytes:raw.length,compressedBytes:compressed.length};
}
fs.writeFileSync(out+'index.json',JSON.stringify({format:'gzip; exact original UTF-8 JSON bytes',files:index},null,2)+'\n');
console.log('Losslessly archived and verified '+Object.keys(index).length+' original reports');
