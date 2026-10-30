import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMapRouteSegments, getMapStop } from "../lib/maps-route";
import type { Store } from "../types";

const stops = Array.from({ length: 21 }, (_, i) => ({ name: `Galería ${i + 1}`, destination: `-12.0${i},-77.0` }));
test("Maps conserva orden y empieza en la primera galería", () => {
  const segments = buildMapRouteSegments(stops);
  assert.deepEqual(segments.map(s => s.stops.length), [9, 9, 3]);
  assert.deepEqual(segments.flatMap(s => s.stops), stops);
  const first = new URL(segments[0].url);
  assert.equal(first.searchParams.get("origin"), stops[0].destination);
  assert.equal(first.searchParams.get("destination"), stops[8].destination);
  assert.equal(first.searchParams.get("waypoints"), stops.slice(1, 8).map(s => s.destination).join("|"));
  assert.equal(new URL(segments[1].url).searchParams.get("origin"), stops[8].destination);
  assert.equal(first.searchParams.get("travelmode"), "walking");
});
test("modo navegador móvil limita a tres puntos intermedios más destino", () => {
  assert.deepEqual(buildMapRouteSegments(stops.slice(0, 9), 4).map(s => s.stops.length), [4, 4, 1]);
});
test("ruta vacía y destino único no inventan paradas", () => {
  assert.deepEqual(buildMapRouteSegments([]), []);
  assert.equal(new URL(buildMapRouteSegments(stops.slice(0, 1))[0].url).searchParams.get("waypoints"), null);
});
test("direcciones extensas dividen tramos sin perder galerías", () => {
  const longStops = stops.slice(0, 4).map(s => ({ ...s, destination: "Dirección ".repeat(50) }));
  const segments = buildMapRouteSegments(longStops);
  assert.deepEqual(segments.flatMap(s => s.stops), longStops);
  assert.ok(segments.every(s => s.url.length <= 2048));
});
test("destinos usan coordenadas válidas o dirección sin incluir piso ni stand", () => {
  const store = { gallery: "Galería A", galleryAddress: "Jr. Gamarra 100, Lima", latitude: -12.07, longitude: -77.01 } as Store;
  assert.equal(getMapStop(store).destination, "-12.07,-77.01");
  assert.equal(getMapStop({ ...store, latitude: NaN }).destination, "Galería A, Jr. Gamarra 100, Lima");
});
