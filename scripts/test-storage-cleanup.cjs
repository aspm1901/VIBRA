const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Ejecutar la selección real de archivos activos sin acceder ni borrar nada en Storage.
const source = fs.readFileSync(path.join(__dirname, '../lib/stores-db.ts'), 'utf8');
const start = source.indexOf('const activeFiles = new Set<string>();');
const end = source.indexOf('const { data: files }', start);
assert.ok(start >= 0 && end > start, 'Se encontró el bloque de limpieza que usa producción');
const compiled = ts.transpileModule(
  `exports.activeFilesFor = function(store) { ${source.slice(start, end)} return activeFiles; };`,
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }
).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const activeFilesFor = context.exports.activeFilesFor;
const base = 'https://example.supabase.co/storage/v1/object/public/vibra-media/stores/vanana/';

test('una prenda con ?v=2 sigue activa y no se elimina al guardar la tienda', () => {
  const active = activeFilesFor({ garments: [{ photoUrl: base + 'conjunto.jpg?v=2' }] });
  assert.ok(active.has('conjunto.jpg'));
});

test('la foto del stand con parámetros y fragmento también se conserva', () => {
  const active = activeFilesFor({ standPhotoUrl: base + 'stand.jpg?v=3#foto', garments: [] });
  assert.ok(active.has('stand.jpg'));
});

test('se conservan fotos normales y se distingue la imagen retirada', () => {
  const active = activeFilesFor({
    standPhotoUrl: base + 'stand.jpg',
    garments: [{ photoUrl: base + 'actual.jpg' }, { photoUrl: base + 'otra.jpg#vista' }],
  });
  const inventory = ['stand.jpg', 'actual.jpg', 'otra.jpg', 'retirada.jpg'];
  assert.deepEqual(inventory.filter(name => !active.has(name)), ['retirada.jpg']);
});
