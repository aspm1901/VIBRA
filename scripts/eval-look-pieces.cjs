// Prueba real acotada. No cambia el catálogo ni publica resultados.
require('@next/env').loadEnvConfig(process.cwd());
require('./helpers/load-ts.cjs');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const {prepareLookImage,embedLookPieces}=require('../lib/ai/look-pieces.ts');
const {detectGarmentStyles,generateImageEmbedding}=require('../lib/ai/gemini.ts');
const {getAllStores}=require('../lib/stores-db.ts');
const {scoreLookPiecesStore}=require('../lib/look-scoring.ts');
(async()=>{
 const image=process.argv[2];if(!image)throw new Error('Falta ruta de foto de prueba');
 const out=path.join(process.env.TEMP,'vibra-look-eval');fs.mkdirSync(out,{recursive:true});
 const start=Date.now();
 const prepared=await prepareLookImage('data:image/png;base64,'+fs.readFileSync(image).toString('base64'));
 const analysis=await detectGarmentStyles(prepared,'image/jpeg','look',true);
 console.log('Reconocimiento:',JSON.stringify(analysis));
 if(analysis.isFallback||!analysis.pieces?.length)throw new Error('No se identificaron las prendas');
 let count=0;
 const pieces=await embedLookPieces(prepared,analysis.pieces,async data=>{
  fs.writeFileSync(path.join(out,`recorte-${++count}.jpg`),Buffer.from(data.split(',')[1],'base64'));
  return generateImageEmbedding(data);
 });
 const stores=await getAllStores();
 const ranking=stores.map(s=>scoreLookPiecesStore(s,{pieces,activeStyles:analysis.styles})).filter(Boolean).sort((a,b)=>b.resonanceScore-a.resonanceScore||(b.lookMatch?.matchedPieces??0)-(a.lookMatch?.matchedPieces??0)||b.photoSimilarity-a.photoSimilarity);
 const results=ranking.map(r=>({store:r.store.name,score:r.resonanceScore,visual:r.photoSimilarity,matched:r.lookMatch,garments:r.matchingGarments.map(g=>({name:g.name,url:g.photoUrl}))}));
 const report={seconds:(Date.now()-start)/1000,analysis,results};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(out,'queries.json'),JSON.stringify(pieces));
 console.log(JSON.stringify({seconds:report.seconds,pieces:analysis.pieces,results:results.slice(0,8)},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
