/* Prueba de interfaz con Playwright. VIBRA_PLAYWRIGHT_MODULE permite usar una instalación externa. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.VIBRA_PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.VIBRA_TEST_URL || "http://localhost:3010";
const outputDir = process.env.VIBRA_TEST_OUTPUT || path.join(require("node:os").tmpdir(), "vibra-ui-evidence");

const result = (name) => {
  const g = { id: "g", storeId: "test", name: "Blusa blanca", photoUrl: "/images/garments/blusa_beige.jpg", category: "Blusas", styles: ["Casual"] };
  return { success: true, qualifiedResults: [{
    store: { id: "test", name, gallery: "Galería de prueba", galleryAddress: "Gamarra", floor: 1, stand: "101", referenceLocation: "", whatsapp: "51999999999", priceLevel: "medio", styles: ["Casual"], categories: ["Blusas"], sizes: ["M"], purchaseType: "presencial", standPhotoUrl: "", updatedAt: "Hoy", garments: [g] },
    bestGarment: g, resonanceScore: 0.8, photoSimilarity: 0.75, styleMatchScore: 1,
    matchingStylesCount: 1, totalSearchedStyles: 2, band: "Alta", searchMode: "estilo",
  }] };
};

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.VIBRA_BROWSER_CHANNEL || "msedge", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const alert = page.locator('[role="alert"]').filter({ has: page.getByRole("button", { name: "Reintentar búsqueda" }) });
    const runtimeErrors = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    let mode = "error";
    let slowRoute;
    const requests = [];
    await page.route("**/api/search", async route => {
      requests.push(route.request().postDataJSON());
      if (mode === "slow") { slowRoute = route; return; }
      if (mode === "error") return route.fulfill({ status: 503, json: { error: "No pudimos comparar tu foto. Reintenta la búsqueda." } });
      if (mode === "non-json") return route.fulfill({ status: 502, contentType: "text/html", body: "Bad gateway" });
      return route.fulfill({ status: 200, json: mode === "empty" ? { success: true, qualifiedResults: [] } : result("Resultado vigente") });
    });
    await page.goto(baseUrl);
    for (const icon of ["icon.svg", "icon.png", "favicon.ico", "apple-icon.png"]) {
      assert.equal((await page.request.get(`${baseUrl}/${icon}`)).status(), 200, `${icon} debe cargar sin conflicto de rutas`);
    }
    await page.getByRole("button", { name: "Por estilo", exact: true }).click();
    assert.equal(requests.length, 0, "Abrir Por estilo no debe consultar ni heredar estilos de foto");
    await page.getByText("Elige los estilos que buscas", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { pressed: true }).count(), 0);
    assert.ok(await page.getByRole("button", { name: "Selecciona al menos un estilo", exact: true }).isDisabled());
    await page.getByRole("button", { name: /Económico/ }).click();
    assert.equal(requests.length, 0, "Los filtros no deben iniciar una búsqueda sin estilos");
    await page.getByRole("button", { name: "Casual", exact: true }).click();
    await alert.waitFor();
    assert.match(await alert.innerText(), /Reintenta/);
    assert.equal(await page.getByText("No encontramos tiendas con esta combinación.", { exact: false }).count(), 0);
    await page.screenshot({ path: path.join(outputDir, "error-desktop.png"), fullPage: true });
    mode = "success";
    await page.getByRole("button", { name: "Reintentar búsqueda" }).click();
    await page.getByText("Resultado vigente", { exact: true }).waitFor();
    assert.equal(await alert.count(), 0);
    console.log("PASÓ: error HTTP visible y reintento recuperan resultados.");

    mode = "non-json";
    await page.getByRole("button", { name: "Actualizar ranking por estilo" }).click();
    await alert.waitFor();
    assert.match(await alert.innerText(), /No pudimos completar/);
    mode = "empty";
    await page.getByRole("button", { name: "Reintentar búsqueda" }).click();
    await page.getByText("No encontramos tiendas con esta combinación.", { exact: false }).waitFor();
    console.log("PASÓ: respuesta no JSON y estado vacío tienen mensajes diferentes.");

    mode = "slow";
    await page.getByRole("button", { name: "Actualizar ranking por estilo" }).click();
    await page.getByText("Comparando tus estilos con las tiendas", { exact: true }).waitFor();
    mode = "success";
    await page.getByRole("button", { name: "Elegante", exact: true }).click();
    await page.getByText("Resultado vigente", { exact: true }).waitFor();
    if (slowRoute) await slowRoute.fulfill({ status: 200, json: result("Resultado obsoleto") }).catch(() => {});
    assert.equal(await page.getByText("Resultado obsoleto", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Urbano", exact: true }).click();
    await page.getByText("Resultado vigente", { exact: true }).waitFor();
    assert.ok(await page.getByRole("button", { name: "Fiesta", exact: true }).isDisabled());
    assert.ok(await page.getByRole("button", { name: "Elegante", exact: true }).isEnabled());
    console.log("PASÓ: solicitudes anteriores no reemplazan resultados nuevos; máximo tres estilos.");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outputDir, "success-mobile.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    await page.getByRole("button", { name: "Una prenda", exact: true }).click();
    await page.getByText("Sube una foto para ver el ranking de tiendas", { exact: true }).waitFor();
    assert.equal(await alert.count(), 0);
    await page.getByRole("button", { name: "Elegir una foto", exact: true }).focus();
    assert.equal(await page.getByRole("button", { name: "Elegir una foto", exact: true }).evaluate(el => el === document.activeElement), true);
    mode = "error";
    await page.locator('input[type="file"]').setInputFiles(path.resolve("public/images/garments/blusa_beige.jpg"));
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: "Usar sin recortar" }).click();
    await alert.waitFor();
    const failedPhotoRequest = requests.at(-1);
    mode = "success";
    await page.getByRole("button", { name: "Reintentar búsqueda" }).click();
    await page.getByText("Resultado vigente", { exact: true }).waitFor();
    assert.deepEqual(requests.at(-1), failedPhotoRequest, "Reintentar debe repetir la foto y los filtros originales sin imponer estilos previos");
    console.log("PASÓ: reintentar una foto nueva conserva exactamente la búsqueda fallida.");
    mode = "slow";
    await page.getByRole("button", { name: "Actualizar ranking de tiendas" }).click();
    await page.getByText("Calculando afinidad visual con los catálogos de Gamarra", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Una prenda", exact: true }).click();
    assert.equal(await page.getByText("Calculando afinidad visual con los catálogos de Gamarra", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "Look completo", exact: true }).click();
    await page.getByText("Sube una foto para ver el ranking de tiendas", { exact: true }).waitFor();
    assert.equal(await page.getByText("Calculando afinidad visual con los catálogos de Gamarra", { exact: true }).count(), 0);
    console.log("PASÓ: pulsar la pestaña activa conserva la búsqueda; cambiar de modo la cancela.");
    const beforeStyleEntry = requests.length;
    await page.getByRole("button", { name: "Por estilo", exact: true }).click();
    await page.getByText("Elige los estilos que buscas", { exact: true }).waitFor();
    assert.equal(requests.length, beforeStyleEntry, "Volver desde look tampoco busca ni hereda estilos");
    await page.getByRole("button", { name: "Casual", exact: true }).click();
    assert.equal(requests.length, beforeStyleEntry + 1);
    await page.getByRole("button", { name: "Casual", exact: true }).click();
    await page.getByText("Elige los estilos que buscas", { exact: true }).waitFor();
    assert.equal(requests.length, beforeStyleEntry + 1, "Quitar el último estilo cancela, no busca estilos predeterminados");
    if (slowRoute) await slowRoute.fulfill({ status: 200, json: result("No debe aparecer") }).catch(() => {});
    assert.equal(await page.getByText("No debe aparecer", { exact: true }).count(), 0);
    mode = "success";
    await page.getByRole("button", { name: "Noche y fiesta", exact: false }).click();
    await page.getByText("Resultado vigente", { exact: true }).waitFor();
    assert.deepEqual(requests.at(-1).filters.styles, ["Fiesta", "Elegante"]);
    await page.getByRole("button", { name: "Una prenda", exact: true }).click();
    assert.equal(await page.getByAltText("Referencia de búsqueda").getAttribute("src"), failedPhotoRequest.image);
    console.log("PASÓ: entrada por estilo limpia, selección explícita y limpieza al quitar el último estilo.");
    assert.deepEqual(runtimeErrors, []);
    console.log("PASÓ: vista móvil sin desborde, cambio de pestaña y foco de teclado; sin errores React.");
    console.log(`Evidencia visual: ${outputDir}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
