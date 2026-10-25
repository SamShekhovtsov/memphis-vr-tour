import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root='apps/web-tour/public/assets/authored/hero-street/',bin='content/generated/ktx-tools/unpacked/bin/';
const records={};
fs.mkdirSync('content/generated/ktx-trial-decoded',{recursive:true});
for(const channel of ['albedo','normal','orm']){
 const name='hero-plaster-'+channel,output=root+name+'.ktx2';
 const args=['--t2','--encode','uastc','--uastc_quality','4','--zcmp','18','--genmipmap','--assign_oetf',channel==='albedo'?'srgb':'linear',output,root+name+'.png'];
 execFileSync(bin+'toktx.exe',args,{stdio:'inherit'});
 execFileSync(bin+'ktx.exe',['validate',output],{stdio:'inherit'});
 execFileSync(bin+'ktx.exe',['extract','--transcode','rgba8',output,'content/generated/ktx-trial-decoded/'+name+'.png'],{stdio:'inherit'});
 records[channel]={source:name+'.png',sourceSha256:createHash('sha256').update(fs.readFileSync(root+name+'.png')).digest('hex'),file:name+'.ktx2',bytes:fs.statSync(output).size,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),command:args};
}
fs.writeFileSync(root+'compression-trial.json',JSON.stringify({encoder:'Khronos KTX-Software 4.4.2',encoderSource:'https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2',mode:'UASTC quality 4 + Zstd 18; full mip chain',adoption:'Opt-in textureTrial=1; WebP defaults retained',records},null,2)+'\n');
