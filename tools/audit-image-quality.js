(()=>{
 const {scene,camera}=window.memphisDistrictQA,checks=[];
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 const post=camera._postProcesses.filter(Boolean),fxaa=post.find(p=>p.name==='fxaa');
 check('Exactly one AA resolve and no extra sharpen pass',post.filter(p=>p.name==='fxaa').length===1&&!post.some(p=>p.name==='sharpen'),post.map(p=>p.name));
 check('Live fused shader compiled',fxaa?.getEffect()?.fragmentSourceCode.includes('memphisClampedDetail')===true);
 check('Route overlay is opt-in',scene.getMeshByName('guidedRouteLine')?.visibility===0);
 check('All nine characters loaded',scene.metadata.heroPeople.length===9);
 check('Near/far depth range',camera.minZ===.1&&camera.maxZ===512,[camera.minZ,camera.maxZ]);
 const maps=scene.textures.filter(t=>!t.isRenderTarget&&!t.isCube&&/\/assets\/authored\//.test(t.url??t.name));
 const normal=maps.filter(t=>/normal/.test(t.url??t.name)),color=maps.filter(t=>/albedo/.test(t.url??t.name)),atlas=maps.filter(t=>t.coordinatesIndex===1),mask=maps.filter(t=>/(?:^|[-_/])(orm|mrao)(?:[.-]|$)/.test(t.url??t.name));
 const levels=items=>[...new Set(items.map(t=>t.anisotropicFilteringLevel))];
 check('Color maps use 4x filtering',color.length>0&&color.every(t=>t.anisotropicFilteringLevel===4),levels(color));
 check('Normal maps retain stable 2x filtering',normal.length>0&&normal.every(t=>t.anisotropicFilteringLevel===2),levels(normal));
 check('Lightmap gutters retain 2x filtering',atlas.length>0&&atlas.every(t=>t.anisotropicFilteringLevel===2),levels(atlas));
 check('Physical masks retain 2x filtering',mask.length>0&&mask.every(t=>t.anisotropicFilteringLevel===2),levels(mask));
 check('Authored maps retain mipmaps',maps.length>0&&maps.every(t=>t.getInternalTexture()?.generateMipMaps===true),maps.length);
 check('Authored maps use trilinear mip filtering',maps.every(t=>t.getInternalTexture()?.samplingMode===3));
 return {passed:checks.every(c=>c.passed),checks,rendering:scene.metadata.rendering.imageQuality};
})()
