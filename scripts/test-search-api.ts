import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/search/route";

const request = (body: unknown) => new NextRequest("http://localhost/api/search", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("la API rechaza un modo desconocido", async () => {
  assert.equal((await POST(request({ filters: { searchMode: "desconocido" } }))).status, 400);
});
test("por estilo exige una elección explícita y no sustituye una selección vacía", async () => {
  assert.equal((await POST(request({ filters: { searchMode: "estilo", styles: [] } }))).status, 400);
  assert.equal((await POST(request({ filters: { searchMode: "estilo" } }))).status, 400);
});
test("la API rechaza filtros con tipos incorrectos", async () => {
  assert.equal((await POST(request({ filters: { styles: "Oficina" } }))).status, 400);
  assert.equal((await POST(request({ filters: { sizes: [null] } }))).status, 400);
  assert.equal((await POST(request(null))).status, 400);
  assert.equal((await POST(request({ filters: { category: 42 } }))).status, 400);
  assert.equal((await POST(request({ filters: { priceLevel: { invalido: true } } }))).status, 400);
});
test("la API rechaza más de tres estilos", async () => {
  assert.equal((await POST(request({ filters: { styles: ["Casual", "Urbano", "Fiesta", "Oficina"] } }))).status, 400);
});
test("la API rechaza una imagen que no es data URL", async () => {
  assert.equal((await POST(request({ image: "esto no es una foto" }))).status, 400);
});
test("sin vector de imagen la API explica la falla de IA y permite reintentar", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const response = await POST(request({
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
      filters: { searchMode: "look" },
    }));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.match(body.error, /reintenta|intenta|estilo/i);
    assert.equal(body.success, undefined);
  } finally {
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
  }
});
test("la búsqueda por estilo funciona sin Gemini y no incluye embeddings", async () => {
  const response = await POST(request({ filters: { searchMode: "estilo", styles: ["Casual"] } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.qualifiedResults));
  assert.ok(body.stats.totalStores > 0);
  assert.ok(body.qualifiedResults.length > 0);
  for (const item of body.qualifiedResults) {
    assert.equal(item.searchMode, "estilo");
    assert.equal(item.bestGarment.embedding, undefined);
    assert.ok(item.store.garments.every((g: { embedding?: number[] }) => !g.embedding));
  }
});
