import assert from "node:assert/strict";
import { test } from "node:test";
import { cosineSimilarity } from "../lib/ranking";
import { scoreEstiloStore, scoreLookStore, scorePrendaStore } from "../lib/search-scoring";
import type { Store, StoreGarment } from "../types";

const vector = (cosine: number) => [cosine, Math.sqrt(1 - cosine * cosine)];
const garment = (id: string, name: string, cosine = 0.8, styles = ["Oficina"]): StoreGarment => ({
  id, storeId: "test", name, category: name, photoUrl: "/test.jpg", styles, primaryColor: "Blanco",
  embedding: vector(cosine),
});
const store = (garments: StoreGarment[], styles = ["Oficina"]): Store => ({
  id: "test", name: "Tienda de prueba", gallery: "Galería", galleryAddress: "Gamarra",
  floor: 1, stand: "1", referenceLocation: "", whatsapp: "51999999999", priceLevel: "medio",
  styles, categories: ["Blusas"], sizes: ["Estándar"], purchaseType: "presencial",
  standPhotoUrl: "", updatedAt: "", garments,
});
const query = { queryVector: [1, 0], activeStyles: ["Oficina"] };

test("el coseno conserva la comparación de vectores compatibles", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});
test("no se truncan vectores de distinta dimensión", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0, 1]), 0);
});
test("un vector no finito no produce NaN en el ranking", () => {
  assert.equal(cosineSimilarity([1, 0], [NaN, 1]), 0);
  assert.equal(cosineSimilarity([Infinity, 0], [1, 0]), 0);
});
test("una tienda sin vector comparable no se recomienda por prenda", () => {
  const g = garment("blusa", "Blusa blanca");
  g.embedding = [1, 0, 1];
  assert.equal(scorePrendaStore(store([g]), {
    ...query, queryFamily: "blusa", primaryColor: "Blanco",
  }), null);
});
test("una búsqueda sin vector no inventa afinidad visual", () => {
  assert.equal(scorePrendaStore(store([garment("blusa", "Blusa blanca")]), {
    ...query, queryVector: null, queryFamily: "blusa", primaryColor: "Blanco",
  }), null);
});
test("el mismo tipo y color conservan su prioridad en modo prenda", () => {
  const result = scorePrendaStore(store([
    garment("polo", "Polo blanco", 0.9), garment("blusa", "Blusa blanca", 0.82),
  ]), { ...query, queryFamily: "blusa", primaryColor: "Blanco" });
  assert.equal(result?.bestGarment.id, "blusa");
  assert.equal(result?.resonanceScore, 0.97);
});
test("look rechaza coincidencia de estilos sin parecido visual mínimo", () => {
  assert.equal(scoreLookStore(store([garment("blusa", "Blusa blanca", 0.2)]), query), null);
});
test("look aplica la fórmula real 30/70 con calibración neutral", () => {
  const result = scoreLookStore(store([garment("blusa", "Blusa blanca", 0.82)]), query);
  assert.equal(result?.photoSimilarity, 0.78);
  assert.equal(result?.styleMatchScore, 1);
  assert.equal(result?.resonanceScore, 0.93);
});
test("look no recomienda una tienda sin estilos compartidos", () => {
  assert.equal(scoreLookStore(store([garment("polo", "Polo deportivo", 0.9, ["Deportivo"])], ["Deportivo"]), query), null);
});
test("look no recomienda tiendas sin prendas", () => {
  assert.equal(scoreLookStore(store([]), query), null);
});
test("dos superiores no se presentan como pareja de look", () => {
  const result = scoreLookStore(store([
    garment("blusa", "Blusa blanca"), garment("blazer", "Blazer beige"),
  ]), query);
  assert.ok(result);
  assert.equal(result.matchingGarments?.length, 1);
});
test("una falda y una blusa compatibles sí forman la pareja", () => {
  const result = scoreLookStore(store([
    garment("falda", "Falda midi"), garment("blusa", "Blusa blanca"),
  ]), query);
  assert.deepEqual(new Set(result?.matchingGarments?.map(g => g.id)), new Set(["falda", "blusa"]));
});
test("shorts son prenda inferior y una pieza visualmente débil no completa el look", () => {
  const result = scoreLookStore(store([
    garment("blusa", "Blusa blanca"), garment("short", "Short sastre", 0.8),
  ]), query);
  assert.equal(result?.matchingGarments?.length, 2);
  const weak = scoreLookStore(store([
    garment("blusa", "Blusa blanca"), garment("short", "Short sastre", 0.2),
  ]), query);
  assert.equal(weak?.matchingGarments?.length, 1);
});
test("una prenda con estilo fuerte pero visual débil no desplaza una compatible en look", () => {
  const result = scoreLookStore(store([
    garment("debil", "Blusa sastre oficina formal", 0.1),
    garment("compatible", "Camisa", 0.8, ["Casual"]),
  ]), query);
  assert.equal(result?.bestGarment.id, "compatible");
});
test("por estilo no devuelve una tarjeta sin prenda para mostrar", () => {
  assert.equal(scoreEstiloStore(store([]), ["Oficina"]), null);
});
