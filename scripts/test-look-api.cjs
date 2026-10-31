require('./helpers/load-ts.cjs');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const sharp=require('sharp');
const path=require('node:path');
let calls=[];let mode='ok';
const piece=(name,garmentFamily,box)=>({name,garmentFamily,primaryColor:'',box});
const g=(id,name,garmentFamily,embedding)=>({id,storeId:'right',name,category:name,garmentFamily,embedding,styles:['Elegante'],photoUrl:'/test.jpg'});
const stores=[{id:'right',name:'Top y falda',gallery:'Galería',styles:['Elegante'],priceLevel:'medio',sizes:['M'],purchaseType:'presencial',garments:[g('top','Top','polo_top',[1,0]),g('skirt','Falda','falda_short',[0,1])]},{id:'wrong',name:'Blazer y pantalón',gallery:'Galería',styles:['Elegante'],priceLevel:'medio',sizes:['M'],purchaseType:'presencial',garments:[g('blazer','Blazer','casaca',[1,0]),g('pants','Pantalón','pantalon_jean',[0,1])]}];
const mock=(file,exports)=>{const id=path.resolve(__dirname,'..',file);require.cache[id]={id,filename:id,loaded:true,exports};};
mock('lib/stores-db.ts',{getAllStores:async()=>stores});
mock('lib/ai/gemini.ts',{
 detectGarmentStyles:async(_image,_mime,searchMode)=>{
  calls.push('vision:'+searchMode);
  return {category:searchMode==='look'?'Look completo / Outfit':'Top',garmentFamily:'polo_top',styles:['Elegante'],garmentTitle:'Top y falda',isFallback:mode==='fallback',pieces:mode==='accessories'?[piece('Zapatos','calzado',[0,0,1000,1000])]:[piece('Top','polo_top',[0,0,500,1000]),piece('Falda','falda_short',mode==='invalid-box'?[800,0,200,1000]:[500,0,1000,1000])]};
 },
 generateImageEmbedding:async(image)=>{
  calls.push('embedding');
  if(mode==='embedding-failure')return null;
  const stats=await sharp(Buffer.from(image.split(',')[1],'base64')).stats();
  return stats.channels[0].mean>stats.channels[2].mean?[1,0]:[0,1];
 },
});
const {POST}=require('../app/api/search/route.ts');
async function request(searchMode='look'){
 calls=[];
 const bottom=await sharp({create:{width:100,height:100,channels:3,background:'blue'}}).png().toBuffer();
 const image=await sharp({create:{width:100,height:200,channels:3,background:'red'}}).composite([{input:bottom,left:0,top:100}]).png().toBuffer();
 const body={filters:{searchMode,styles:['Elegante']},...(searchMode==='estilo'?{}:{image:'data:image/png;base64,'+image.toString('base64')})};
 const response=await POST({json:async()=>body});
 return {status:response.status,data:await response.json()};
}
test('look usa visión una vez y un vector por prenda, sin vector de collage',async()=>{
 mode='ok';const {status,data}=await request();
 assert.equal(status,200);
 assert.equal(calls.filter(c=>c==='embedding').length,2);
 assert.deepEqual(calls.filter(c=>c.startsWith('vision:')),['vision:look']);
 assert.equal(data.qualifiedResults[0].store.id,'right');
 assert.equal(data.qualifiedResults.some(r=>r.store.id==='wrong'),false);
 assert.equal(data.qualifiedResults[0].lookMatch.totalPieces,2);
 assert.equal(data.detectedInfo.pieces.length,2);
});
test('fallo de detección no se disfraza de búsqueda global correcta',async()=>{
 mode='fallback';const {status}=await request();assert.equal(status,503);assert.equal(calls.includes('embedding'),false);
});
test('una imagen solo con accesorios no genera resultados de ropa',async()=>{
 mode='accessories';const {status}=await request();assert.equal(status,422);assert.equal(calls.includes('embedding'),false);
});
test('una caja inválida no devuelve un look supuestamente completo con una prenda menos',async()=>{
 mode='invalid-box';const {status}=await request();assert.equal(status,503);assert.equal(calls.includes('embedding'),false);
});
test('un embedding fallido no convierte una búsqueda de dos piezas en una de una',async()=>{
 mode='embedding-failure';const {status}=await request();assert.equal(status,503);
});
test('Una prenda mantiene una llamada de embedding y su reconocimiento habitual',async()=>{
 mode='ok';const {status}=await request('prenda');assert.equal(status,200);assert.equal(calls.filter(c=>c==='embedding').length,1);assert.ok(calls.includes('vision:prenda'));
});
test('Por estilo no llama a ninguno de los dos servicios de IA',async()=>{
 mode='ok';const {status}=await request('estilo');assert.equal(status,200);assert.deepEqual(calls,[]);
});
