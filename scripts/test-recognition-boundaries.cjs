require('./helpers/load-ts.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { topSleeveKind, isCompatibleLookPiece } = require('../lib/look-compatibility.ts');
const { scoreLookPiecesStore } = require('../lib/look-scoring.ts');
const { optimizeImageForAi } = require('../lib/ai/gemini.ts');
const sharp = require('sharp');
const piece = (name, garmentFamily) => ({ name, garmentFamily, primaryColor:'Blanco', box:[0,0,1000,1000], queryVector:[1,0] });
const garment = (id,name,family,embedding=[1,0]) => ({id,name,category:name,garmentFamily:family,embedding,styles:['Elegante'],photoUrl:'/test.jpg'});

test('el largo explícito de la manga prevalece sobre polo/camisa', () => {
  assert.equal(topSleeveKind('Camisa de manga corta'),'short');
  assert.equal(topSleeveKind('Polo sin mangas'),'sleeveless');
  assert.equal(topSleeveKind('Blusa de manga larga con pedrería'),'long');
});

test('adornos y forma de manga no inventan un largo desconocido', () => {
  for (const name of ['Top con pedrería','Top con cadenas','Blusa de mangas acampanadas','Blusa de mangas abullonadas','Polo a rayas','Camisa estampada']) {
    assert.equal(topSleeveKind(name),undefined,name);
  }
});

test('la lycra puede ser ropa elegante y no prueba uso deportivo', () => {
  assert.equal(isCompatibleLookPiece(piece('Top elegante de lycra sin mangas','polo_top'),garment('a','Top elegante sin mangas','polo_top')),true);
  assert.equal(isCompatibleLookPiece(piece('Top elegante sin mangas','polo_top'),garment('b','Top de lycra sin mangas','polo_top')),true);
  assert.equal(isCompatibleLookPiece(piece('Top deportivo sin mangas','polo_top'),garment('a','Top elegante sin mangas','polo_top')),false);
});

test('capas y flecos no convierten una falda larga en minifalda', () => {
  for (const name of ['Falda larga con flecos','Falda maxi con capas','Falda midi asimétrica de encaje']) {
    assert.equal(isCompatibleLookPiece(piece('Falda larga','falda_short'),garment('a',name,'falda_short')),true,name);
  }
  assert.equal(isCompatibleLookPiece(piece('Falda larga','falda_short'),garment('a','Falda mini con capas','falda_short')),false);
});

test('fotos compuestas no ocultan una combinación válida al recortar candidatas', () => {
  const garments = Array.from({length:4},(_,i)=>garment('set'+i,'Conjunto top blanco y falda marrón','conjunto'));
  garments.push(garment('top','Top blanco','polo_top',[.78,Math.sqrt(1-.78*.78)]));
  garments.push(garment('skirt','Falda marrón','falda_short',[0,1]));
  const result = scoreLookPiecesStore({id:'s',name:'Tienda',styles:['Elegante'],garments},{
    pieces:[piece('Top blanco','polo_top'),{...piece('Falda marrón','falda_short'),queryVector:[0,1]}],activeStyles:['Elegante'],
  });
  assert.equal(result.lookMatch.matchedPieces,2);
  assert.deepEqual(result.matchingGarments.map(g=>g.id),['top','skirt']);
});

test('blusa y top compatibles no requieren el campo opcional de familia en catálogo', () => {
  const g = garment('blusa','Blusa sin mangas blanca','blusa');
  delete g.garmentFamily;
  const result = scoreLookPiecesStore({id:'s',styles:['Elegante'],garments:[g]}, {
    pieces:[piece('Top sin mangas blanco','polo_top')],activeStyles:['Elegante'],
  });
  assert.equal(result?.bestGarment.id,'blusa');
});

test('la optimización para IA conserva la orientación de fotos de celular al recomprimir', async () => {
  // Ruido determinista: supera los 35 KB y fuerza la ruta de recompresión real.
  const raw = Buffer.alloc(800*400*3);
  let seed = 42;
  for (let i=0;i<raw.length;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; raw[i]=seed>>>24; }
  const input = await sharp(raw,{raw:{width:800,height:400,channels:3}}).jpeg().withMetadata({orientation:6}).toBuffer();
  assert.ok(input.length>35*1024);
  const optimized = await optimizeImageForAi('data:image/jpeg;base64,'+input.toString('base64'));
  const meta = await sharp(Buffer.from(optimized.cleanBase64,'base64')).metadata();
  assert.ok(meta.height>meta.width,`la foto vertical no debe convertirse en ${meta.width}×${meta.height}`);
  assert.equal(meta.orientation,undefined);
});
