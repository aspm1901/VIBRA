const assert = require('node:assert/strict');
const { chromium } = require(process.env.VIBRA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    const items = Array.from({ length: 10 }, (_, i) => ({
      storeId: `test-${i}`, addedAt: i,
      store: { id: `test-${i}`, name: `Tienda de prueba ${i + 1}`, gallery: `Galería de prueba ${i + 1}`, galleryAddress: 'Gamarra, Lima', floor: 1, stand: '101', whatsapp: '', garments: [], latitude: -12.07 - i * .001, longitude: -77.01 },
    }));
    await page.addInitScript(items => localStorage.setItem('vibra_my_route', JSON.stringify(items)), items);
    await page.goto(process.env.VIBRA_TEST_URL || 'http://localhost:3017');
    await page.getByRole('button', { name: 'Abrir mi ruta por galería' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tu ruta por galería' });
    await dialog.getByText('10 galerías en el orden de la lista.', { exact: false }).waitFor();
    let first = new URL(await dialog.getByRole('link', { name: 'Abrir tramo 1 de 2', exact: true }).getAttribute('href'));
    assert.equal(first.searchParams.get('waypoints').split('|').length, 7);
    assert.equal(first.searchParams.get('origin'), '-12.07,-77.01');
    let second = new URL(await dialog.getByRole('link', { name: 'Abrir tramo 2 de 2', exact: true }).getAttribute('href'));
    assert.equal(second.searchParams.get('origin'), first.searchParams.get('destination'));
    assert.equal(await dialog.getByRole('combobox').count(), 0);
    assert.equal(first.searchParams.get('travelmode'), 'walking');
    await dialog.getByTitle('Quitar parada').last().click();
    const full = dialog.getByRole('link', { name: 'Ver ruta completa', exact: true });
    await full.waitFor();
    assert.equal(new URL(await full.getAttribute('href')).searchParams.get('waypoints').split('|').length, 7);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await dialog.getByText('Tu recorrido en Google Maps').scrollIntoViewIfNeeded();
    await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'vibra-ruta-completa-local.png') });
    assert.deepEqual(runtimeErrors, []);
    console.log('PASÓ: ruta de 9 galerías, división 9+1, solicitud a pie, sin selector y vista móvil sin errores.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
