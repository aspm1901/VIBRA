const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.VIBRA_PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({ channel: process.env.VIBRA_BROWSER_CHANNEL || "msedge", headless: true });
  const outputDir = path.join(require("node:os").tmpdir(), "vibra-updated-at-evidence");
  fs.mkdirSync(outputDir, { recursive: true });
  try {
    // El dispositivo está en otra zona: la ficha debe seguir mostrando Lima.
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, timezoneId: "Asia/Tokyo" });
    let updatedAt = "2026-10-24T02:05:00.000Z";
    let createdAt = "2026-10-22T21:37:25.864552+00:00";
    const garment = { id: "g1", storeId: "test", name: "Blusa blanca", photoUrl: "/images/garments/blusa_beige.jpg", category: "Blusas", styles: ["Casual"] };
    await page.route("**/api/search", route => route.fulfill({ status: 200, json: {
      success: true, qualifiedResults: [{
        store: { id: "test", name: "Tienda de ejemplo", gallery: "Galería Santa Rosa", galleryAddress: "Gamarra", floor: 2, stand: "101", referenceLocation: "Pasillo central", whatsapp: "51999999999", priceLevel: "medio", styles: ["Casual"], categories: ["Blusas"], sizes: ["M"], purchaseType: "presencial", standPhotoUrl: "", updatedAt, createdAt, garments: [garment] },
        bestGarment: garment, resonanceScore: 0.8, photoSimilarity: 0.75, styleMatchScore: 1,
        matchingStylesCount: 1, totalSearchedStyles: 2, band: "Alta", searchMode: "estilo",
      }],
    } }));
    await page.goto(process.env.VIBRA_TEST_URL || "http://localhost:3011");
    await page.getByRole("button", { name: "Por estilo", exact: true }).click();
    await page.getByText("Tienda de ejemplo", { exact: true }).click();
    await page.getByText("Última actualización de la ficha", { exact: true }).waitFor();
    assert.equal(await page.locator("time").getAttribute("datetime"), updatedAt);
    assert.match(await page.locator("time").innerText(), /23 de octubre de 2026.*9:05/);
    await page.getByText("Hora de Lima", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(outputDir, "fecha-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.getByText("Última actualización de la ficha", { exact: true }).isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(outputDir, "fecha-mobile.png") });
    await page.getByRole("button", { name: "Cerrar ficha de tienda" }).click();
    updatedAt = "Actualizada recientemente";
    await page.getByRole("button", { name: "Actualizar ranking por estilo" }).click();
    await page.getByText("Tienda de ejemplo", { exact: true }).click();
    await page.getByText("Última actualización de la ficha", { exact: true }).waitFor();
    assert.equal(await page.locator("time").getAttribute("datetime"), "2026-10-22T21:37:25.864Z");
    assert.match(await page.locator("time").innerText(), /22 de octubre de 2026.*4:37/);
    await page.screenshot({ path: path.join(outputDir, "registro-mobile.png") });
    await page.getByRole("button", { name: "Cerrar ficha de tienda" }).click();
    createdAt = undefined;
    await page.getByRole("button", { name: "Actualizar ranking por estilo" }).click();
    await page.getByText("Tienda de ejemplo", { exact: true }).click();
    await page.getByText("Fecha exacta no registrada", { exact: true }).waitFor();
    assert.equal(await page.locator("time").count(), 0);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Cerrar ficha de tienda" }).count(), 0);
    console.log("PASÓ: etiqueta unificada, edición exacta tiene prioridad y registro inicial usa la fecha de Supabase en hora de Lima.");
    console.log(`Capturas: ${outputDir}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
