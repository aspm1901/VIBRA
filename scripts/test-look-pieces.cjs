require('./helpers/load-ts.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const sharp = require('sharp');
const { sanitizeLookPieces, hasIncompleteLookPieces } = require('../lib/look-pieces.ts');
const { prepareLookImage, embedLookPieces } = require('../lib/ai/look-pieces.ts');
const { scoreLookPiecesStore } = require('../lib/look-scoring.ts');

const part = (name, family, box = [0, 0, 500, 500]) => ({ name, garmentFamily: family, primaryColor: 'Blanco', box });
const vector = (cosine) => [cosine, Math.sqrt(1 - cosine * cosine)];
const garment = (id, name, family, embedding, color = 'Blanco') => ({
  id, storeId: 'test', name, category: name, photoUrl: '/test.jpg', styles: ['Elegante'],
  garmentFamily: family, primaryColor: color, embedding,
});
const store = (garments) => ({ id: 'test', name: 'Prueba', styles: ['Elegante'], garments });
const queries = () => [
  { ...part('Top blanco', 'polo_top'), queryVector: [1, 0] },
  { ...part('Falda marrón', 'falda_short', [500, 0, 1000, 500]), primaryColor: 'Marrón', queryVector: [0, 1] },
];

test('una falda larga no se completa con una minifalda aunque el vector sea idéntico', () => {
  for (const [wanted, offered] of [['Falda midi satinada','Falda corta de lentejuelas'],['Minifalda','Falda larga'],['Falda maxi','Falda mini']]) {
    assert.equal(scoreLookPiecesStore(store([garment('g',offered,'falda_short',[1,0])]),{
      pieces:[{...part(wanted,'falda_short'),queryVector:[1,0]}],activeStyles:['Elegante'],
    }),null);
  }
  const jolyCase = { ...garment('g','Falda de encaje con volantes','falda_short',[1,0]), category: 'Falda corta con volantes y encaje' };
  assert.equal(scoreLookPiecesStore(store([jolyCase]),{
    pieces:[{...part('Falda larga satinada','falda_short'),queryVector:[1,0]}],activeStyles:['Elegante'],
  }),null);
});

test('un top sencillo no se sustituye por corset o bikini y el vestido no por enterizo', () => {
  for (const [wanted,offered,family] of [['Top halter marrón','Corset burdeos','polo_top'],['Top blanco','Top de bikini','polo_top'],['Corset blanco','Top básico blanco','polo_top'],['Vestido largo','Enterizo largo','vestido']]) {
    assert.equal(scoreLookPiecesStore(store([garment('g',offered,family,[1,0])]),{
      pieces:[{...part(wanted,family),queryVector:[1,0]}],activeStyles:['Elegante'],
    }),null);
  }
});

test('una foto individual de parecido cercano representa la pieza mejor que una foto de conjunto', () => {
  const result=scoreLookPiecesStore(store([
    garment('look','Conjunto top blanco y falda marrón','conjunto',vector(.80)),
    garment('top','Top blanco','polo_top',vector(.78)),
  ]),{pieces:[queries()[0]],activeStyles:['Elegante']});
  assert.equal(result.bestGarment.id,'top');
});

test('una foto individual irrelevante no desplaza a un conjunto claramente más parecido', () => {
  const result=scoreLookPiecesStore(store([
    garment('look','Conjunto top blanco y falda marrón','conjunto',vector(.95)),
    garment('top','Top blanco','polo_top',vector(.65)),
  ]),{pieces:[queries()[0]],activeStyles:['Elegante']});
  assert.equal(result.bestGarment.id,'look');
});

test('una buena opción parcial supera dos opciones débiles de la misma familia', () => {
  const partial=scoreLookPiecesStore(store([garment('top','Top blanco','polo_top',vector(.78))]),{pieces:queries(),activeStyles:['Elegante']});
  const weak=scoreLookPiecesStore(store([garment('top','Top blanco','polo_top',vector(.66)),garment('skirt','Falda marrón','falda_short',[Math.sqrt(1-.66*.66),.66],'Marrón')]),{pieces:queries(),activeStyles:['Elegante']});
  assert.ok(partial.resonanceScore>weak.resonanceScore,`${partial.resonanceScore} debe superar ${weak.resonanceScore}`);
  assert.equal(partial.lookMatch.matchedPieces,1);
});

test('solo se admiten prendas con una caja válida y hasta tres piezas', () => {
  const parsed = sanitizeLookPieces([
    part('Top', 'polo_top'), part('Falda', 'falda_short', [500,0,1000,500]),
    part('Bolso', 'polo_top'), part('Zapatos', 'calzado'),
    part('Blazer', 'casaca', [0,500,500,1000]), part('Pantalón', 'pantalon_jean'),
  ]);
  assert.deepEqual(parsed.map(p => p.garmentFamily), ['polo_top','falda_short','casaca']);
  assert.deepEqual(sanitizeLookPieces([part('Top','polo_top',[800,0,100,500]),part('Falda','falda_short',[0,0,Infinity,500])]), []);
});

test('cajas duplicadas de la misma prenda no crean piezas adicionales', () => {
  assert.equal(sanitizeLookPieces([part('Top','polo_top'),part('Top repetido','polo_top')]).length,1);
});

test('una caja inválida de ropa no reduce silenciosamente el total del look', () => {
  assert.equal(hasIncompleteLookPieces([part('Top','polo_top'),part('Falda','falda_short',[800,0,200,500])]),true);
  assert.equal(hasIncompleteLookPieces([part('Top','polo_top'),part('Bolso','polo_top')]),false);
  assert.equal(hasIncompleteLookPieces([part('Top','polo_top'),part('Top repetido','polo_top')]),false);
});

test('minifalda, falda y bermuda conservan su subtipo al completar el look', () => {
  for (const [wanted, offered] of [['Minifalda marrón','Short marrón'],['Short marrón','Minifalda marrón'],['Falda marrón','Bermuda marrón']]) {
    const result=scoreLookPiecesStore(store([garment('g',offered,'falda_short',[1,0])]),{pieces:[{...part(wanted,'falda_short'),queryVector:[1,0]}],activeStyles:['Elegante']});
    assert.equal(result,null,`${wanted} no equivale a ${offered}`);
  }
});

test('la orientación EXIF se aplica antes de detectar y recortar las prendas',async()=>{
  const raw=await sharp({create:{width:100,height:200,channels:3,background:'white'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const image=await prepareLookImage('data:image/jpeg;base64,'+raw.toString('base64'));
  const meta=await sharp(Buffer.from(image.split(',')[1],'base64')).metadata();
  assert.equal(meta.width,200);assert.equal(meta.height,100);assert.equal(meta.orientation,undefined);
});

test('los recortes contienen los píxeles de cada prenda, no el collage completo', async () => {
  const image = await sharp({create:{width:100,height:200,channels:3,background:'#ff0000'}})
    .composite([{input:await sharp({create:{width:100,height:100,channels:3,background:'#0000ff'}}).png().toBuffer(),top:100,left:0}]).png().toBuffer();
  const prepared = await prepareLookImage('data:image/png;base64,'+image.toString('base64'));
  const colors=[];
  const pieces=[part('Top','polo_top',[0,0,500,1000]),part('Falda','falda_short',[500,0,1000,1000])];
  const result=await embedLookPieces(prepared,pieces,async data=>{
    const stats=await sharp(Buffer.from(data.split(',')[1],'base64')).stats();
    colors.push(stats.channels.map(c=>c.mean)); return [1,0];
  });
  assert.equal(result.length,2);
  assert.ok(colors.some(c=>c[0]>240 && c[2]<15));
  assert.ok(colors.some(c=>c[2]>240 && c[0]<15));
});

test('si falla el vector de una pieza no se declara un look completo', async () => {
  const prepared=await prepareLookImage('data:image/png;base64,'+(await sharp({create:{width:100,height:100,channels:3,background:'white'}}).png().toBuffer()).toString('base64'));
  await assert.rejects(embedLookPieces(prepared,[part('Top','polo_top')],async()=>null), /comparar/);
});

test('top y falda no se sustituyen por blazer y pantalón aunque coincida el estilo', () => {
  const wrong=scoreLookPiecesStore(store([
    garment('blazer','Blazer','casaca',[1,0]),garment('pants','Pantalón','pantalon_jean',[0,1]),
  ]),{pieces:queries(),activeStyles:['Elegante']});
  assert.equal(wrong,null);
  const right=scoreLookPiecesStore(store([
    garment('top','Top blanco','polo_top',[1,0]),garment('skirt','Falda marrón','falda_short',[0,1],'Marrón'),
  ]),{pieces:queries(),activeStyles:['Elegante']});
  assert.equal(right.lookMatch.matchedPieces,2);
  assert.deepEqual(right.matchingGarments.map(g=>g.id),['top','skirt']);
  assert.ok(right.resonanceScore>=.85);
});

test('una coincidencia parcial se identifica y no obtiene banda Alta por estilos', () => {
  const item=scoreLookPiecesStore(store([garment('top','Top','polo_top',[1,0])]),{pieces:queries(),activeStyles:['Elegante']});
  assert.equal(item.lookMatch.matchedPieces,1);
  assert.equal(item.lookMatch.totalPieces,2);
  assert.deepEqual(item.lookMatch.missingPieces,['Falda marrón']);
  assert.ok(item.resonanceScore<.7);
});

test('la misma foto no se reutiliza para cubrir dos piezas', () => {
  const pieces=[{...part('Polo','polo_top'),queryVector:[1,0]},{...part('Otro polo','polo_top',[500,0,1000,500]),queryVector:[1,0]}];
  const item=scoreLookPiecesStore(store([garment('top','Polo','polo_top',[1,0])]),{pieces,activeStyles:['Elegante']});
  assert.equal(item.lookMatch.matchedPieces,1);
});

test('se rechazan vectores incompatibles o no finitos', () => {
  for(const embedding of [[1,0,0],[NaN,1],[0,0]]) {
    assert.equal(scoreLookPiecesStore(store([garment('top','Top','polo_top',embedding)]),{pieces:[queries()[0]],activeStyles:['Elegante']}),null);
  }
});

test('un vestido y un look de tres piezas se evalúan sin exigir una pareja artificial', () => {
  const dress=scoreLookPiecesStore(store([garment('dress','Vestido','vestido',[1,0])]),{pieces:[{...part('Vestido','vestido'),queryVector:[1,0]}],activeStyles:['Elegante']});
  assert.equal(dress.lookMatch.matchedPieces,1);
  assert.equal(dress.lookMatch.totalPieces,1);
  const pieces=[...queries(),{...part('Blazer','casaca',[0,500,1000,1000]),queryVector:[1,0]}];
  const three=scoreLookPiecesStore(store([garment('top','Top','polo_top',[1,0]),garment('skirt','Falda','falda_short',[0,1]),garment('blazer','Blazer','casaca',[1,0])]),{pieces,activeStyles:['Elegante']});
  assert.equal(three.matchingGarments.length,3);
});

test('no se mezcla una foto de conjunto con otra prenda suelta ni se aceptan conjuntos con pantalón en look de falda', () => {
  const mixed=scoreLookPiecesStore(store([
    garment('top','Top blanco','polo_top',vector(.78)),
    garment('set','Look 1: Conjunto de top y falda','conjunto',[Math.sqrt(1-.78*.78),.78],'Marrón'),
  ]),{pieces:queries(),activeStyles:['Elegante']});
  assert.equal(mixed.lookMatch.matchedPieces,1);
  assert.equal(mixed.bestGarment.id,'top');
  const pantSet=scoreLookPiecesStore(store([
    garment('set','Conjunto elegante de top y pantalón','conjunto',[1,0]),
  ]),{pieces:queries(),activeStyles:['Elegante']});
  assert.equal(pantSet,null);
});

test('no se recomienda una tienda que no comparte ningún estilo con el look ni ropa deportiva para un look no deportivo', () => {
  const noStyle=scoreLookPiecesStore({ id:'u', name:'Urbana', styles:['Urbano'], garments:[
    { ...garment('top','Top marrón','polo_top',[1,0],'Marrón'), styles:['Urbano','Y2K'] },
  ]},{pieces:queries(),activeStyles:['Elegante','Fiesta']});
  assert.equal(noStyle,null);
  const sportItem=scoreLookPiecesStore(store([
    garment('sport','Polo crop deportivo blanco','polo_top',[1,0]),
  ]),{pieces:[queries()[0]],activeStyles:['Elegante']});
  assert.equal(sportItem,null);
});

test('blazer no se sustituye por chaleco ni bolero, pantalón no por falda-pantalón, y blusa sin mangas sí es compatible con top', () => {
  for (const offered of ['Chaleco peplum sastre con botones', 'Bolero corto de gasa negro']) {
    assert.equal(scoreLookPiecesStore(store([garment('g', offered, 'casaca', [1, 0])]), {
      pieces: [{ ...part('Blazer azul marino', 'casaca'), queryVector: [1, 0] }],
      activeStyles: ['Elegante'],
    }), null);
  }
  const skortItem = { ...garment('sk', 'Pantalón tipo falda cruzado en color crema', 'pantalon_jean', [1, 0]), category: 'Pantalón tipo falda-pantalón cruzado' };
  assert.equal(scoreLookPiecesStore(store([skortItem]), {
    pieces: [{ ...part('Pantalón palazzo azul marino', 'pantalon_jean'), queryVector: [1, 0] }],
    activeStyles: ['Elegante'],
  }), null);
  const blusaMatch = scoreLookPiecesStore(store([
    garment('bl', 'Blusa satinada de un solo hombro', 'blusa', [1, 0]),
  ]), {
    pieces: [{ ...part('Top asimétrico de un solo hombro', 'polo_top'), queryVector: [1, 0] }],
    activeStyles: ['Elegante'],
  });
  assert.equal(blusaMatch.bestGarment.id, 'bl');
});

test('en modo Una prenda, un top sin mangas con hombros supera a un polo de manga corta, strapless, deportivo o conjunto', () => {
  const { scorePrendaStore } = require('../lib/search-scoring.ts');
  const query = {
    queryVector: [1, 0],
    queryFamily: 'polo_top',
    primaryColor: 'Negro',
    activeStyles: ['Casual', 'Minimalista', 'Oficina'],
    queryTitle: 'Top de punto sin mangas con botones laterales Top sin mangas de punto',
  };
  const shoulder = scorePrendaStore(store([garment('sh', 'Top negro drapeado sin mangas', 'polo_top', vector(0.80), 'Negro')]), query);
  const shortSleevePixie = scorePrendaStore(store([garment('g-pixie-1792689345258-1', 'Top negro acanalado escote cuadrado', 'polo_top', vector(0.80), 'Negro')]), query);
  const strapless = scorePrendaStore(store([garment('st', 'Top strapless básico negro', 'polo_top', vector(0.80), 'Negro')]), query);
  const sporty = scorePrendaStore(store([garment('sp', 'Top deportivo negro sin mangas', 'polo_top', vector(0.80), 'Negro')]), query);
  const conjunto = scorePrendaStore(store([garment('cj', 'Look 1: Conjunto de top y falda', 'conjunto', vector(0.80), 'Negro')]), query);
  assert.ok(shoulder.resonanceScore > shortSleevePixie.resonanceScore);
  assert.ok(shoulder.resonanceScore > strapless.resonanceScore);
  assert.ok(shoulder.resonanceScore > sporty.resonanceScore);
  assert.ok(shoulder.resonanceScore > conjunto.resonanceScore);
});
