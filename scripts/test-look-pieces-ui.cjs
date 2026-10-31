const assert=require('node:assert/strict');
const {chromium}=require(process.env.VIBRA_PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');
const base=process.env.VIBRA_TEST_URL||'http://localhost:3018';
const g=(id,name)=>({id,storeId:'full',name,category:name,styles:['Elegante'],photoUrl:'/images/garments/blusa_beige.jpg'});
const garments=[g('top','Top marfil'),g('falda','Falda marrón'),g('casaca','Casaca beige')];
const item=(partial)=>({store:{id:partial?'partial':'full',name:partial?'Tienda parcial':'Tienda tres prendas',gallery:'Galería de prueba',floor:1,stand:'101',whatsapp:'51999999999',styles:['Elegante'],priceLevel:'medio',sizes:['M'],purchaseType:'presencial',garments:partial?garments.slice(0,1):garments,updatedAt:'2026-10-30T17:00:00Z'},bestGarment:garments[0],matchingGarments:partial?garments.slice(0,1):garments,resonanceScore:partial?.6:.9,band:partial?'Media':'Alta',searchMode:'look',lookMatch:{matchedPieces:partial?1:3,totalPieces:3,matchedNames:partial?['Top marfil']:garments.map(g=>g.name),missingPieces:partial?['Falda marrón','Casaca beige']:[]}});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/search',r=>r.fulfill({json:{success:true,qualifiedResults:[item(false),item(true)],detectedInfo:{category:'Look completo / Ropa',styles:['Elegante'],garmentTitle:'Top + falda + casaca'}}}));
  await page.goto(base);
  await page.getByRole('button',{name:'Look completo',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles(path.resolve('public/images/garments/blusa_beige.jpg'));
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Usar sin recortar'}).click();
  await page.getByText('Opciones para 3 de 3 prendas de ropa',{exact:false}).waitFor();
  await page.getByText('Opciones para 1 de 3 prendas de ropa',{exact:false}).waitFor();
  await page.locator('article').first().click();
  await page.getByText('Prendas para armar tu look en esta tienda (3)',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Tienda tres prendas',level:2}).count(),1);
  await page.getByRole('button',{name:'Cerrar ficha de tienda'}).click();
  await page.screenshot({path:process.env.TEMP+'/vibra-look-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('article').nth(1).click();
  await page.getByText('Sin coincidencia suficiente en esta tienda: Falda marrón, Casaca beige.',{exact:true}).waitFor();
  await page.screenshot({path:process.env.TEMP+'/vibra-look-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASÓ: tres prendas, coincidencia parcial, detalle de prendas faltantes, móvil sin desbordamiento y sin errores de React.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
