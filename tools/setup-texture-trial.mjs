import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root='apps/web-tour/public/assets/decoders/ktx2/';const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
for(const [name,r]of Object.entries(manifest.files)){
 const file=root+name;if(fs.existsSync(file)&&hash(fs.readFileSync(file))===r.sha256)continue;
 const response=await fetch(r.source);if(!response.ok)throw Error(r.source+': '+response.status);const bytes=Buffer.from(await response.arrayBuffer());
 if(hash(bytes)!==r.sha256)throw Error('Decoder content changed upstream: '+name);fs.writeFileSync(file,bytes);
}
if(process.argv.includes('--encoder')){
 const tools='content/generated/ktx-tools';fs.mkdirSync(tools,{recursive:true});const pin=JSON.parse(fs.readFileSync('content/source-assets/street-finish/encoder.json'));
 const file=tools+'/ktx-installer.exe';
 if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==pin.sha256){const r=await fetch(pin.url);if(!r.ok)throw Error(r.status);const bytes=Buffer.from(await r.arrayBuffer());if(hash(bytes)!==pin.sha256)throw Error('Encoder content changed upstream');fs.writeFileSync(file,bytes);}
 if(!fs.existsSync(tools+'/unpacked/bin/toktx.exe'))execFileSync(process.env.SEVENZIP_BIN??'C:/Program Files/7-Zip/7z.exe',['x',file,'-o'+tools+'/unpacked','-y'],{stdio:'inherit'});
}
console.log('Pinned local decoder dependencies verified; encoder available when requested.');
