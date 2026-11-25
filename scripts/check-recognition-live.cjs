// Comprobación acotada con servicios reales. Lee un manifest y guarda evidencia sin fotos ni vectores.
// node scripts/check-recognition-live.cjs manifest.json resultado.json
require('@next/env').loadEnvConfig(process.cwd());
require('./helpers/load-ts.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { POST } = require('../app/api/search/route.ts');
(async () => {
  const [manifest, output] = process.argv.slice(2);
  if (!manifest || !output) throw new Error('Indica manifest y archivo de evidencia');
  const cases = JSON.parse(fs.readFileSync(manifest,'utf8'));
  const results = [];
  for (const c of cases) {
    const start = Date.now();
    try {
      const payload = { filters:{searchMode:c.mode,...(c.mode==='estilo'?{styles:['Elegante']}:{} )} };
      if (c.path) payload.image = 'data:image/jpeg;base64,'+fs.readFileSync(path.resolve(path.dirname(manifest),c.path)).toString('base64');
      const response = await POST({json:async()=>payload});
      const body = await response.json();
      const detected = c.mode==='look' ? (body.detectedInfo?.pieces||[]).map(p=>p.garmentFamily).sort() : [body.detectedInfo?.garmentFamily];
      const correct = c.mode==='estilo' ? response.ok : JSON.stringify(detected)===JSON.stringify([...c.expectedFamilies].sort());
      results.push({id:c.id,mode:c.mode,status:response.status,seconds:(Date.now()-start)/1000,
        recognitionCorrect:correct,analysisSource:body.analysisSource,detected:body.detectedInfo,error:body.error,
        count:body.qualifiedResults?.length,top3:(body.qualifiedResults||[]).slice(0,3).map(r=>({
          store:r.store.name,score:r.resonanceScore,garments:(r.matchingGarments||[r.bestGarment]).map(g=>g.name),lookMatch:r.lookMatch,
        }))});
    } catch(error) {results.push({id:c.id,error:String(error),recognitionCorrect:false});}
    fs.writeFileSync(output,JSON.stringify({results},null,2));
    console.log(JSON.stringify(results.at(-1)));
  }
  const summary={cases:results.length,completed:results.filter(r=>r.status===200).length,expectedRecognition:results.filter(r=>r.recognitionCorrect).length};
  fs.writeFileSync(output,JSON.stringify({summary,results},null,2));
  console.log(JSON.stringify(summary));
  if(summary.expectedRecognition!==cases.length||summary.completed!==cases.length) process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
