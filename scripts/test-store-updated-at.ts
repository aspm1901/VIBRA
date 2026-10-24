import assert from "node:assert/strict";
import { test } from "node:test";
import { formatStoreUpdatedAt } from "../lib/store-updated-at";

test("la fecha exacta se presenta siempre en hora de Lima", () => {
  const result = formatStoreUpdatedAt("2026-10-24T02:05:00.000Z");
  assert.equal(result?.dateTime, "2026-10-24T02:05:00.000Z");
  assert.match(result?.label || "", /23 de octubre de 2026/);
  assert.match(result?.label || "", /9:05/);
  assert.match(result?.label || "", /p\.?\s*m\.?/i);
});

test("se respeta el desplazamiento de una fecha con zona horaria", () => {
  const result = formatStoreUpdatedAt("2026-10-23T17:30:00-05:00");
  assert.equal(result?.dateTime, "2026-10-23T22:30:00.000Z");
  assert.match(result?.label || "", /5:30/);
});

test("las fichas históricas y fechas sin hora no reciben una hora inventada", () => {
  for (const value of [undefined, "", "Hace 14 días", "Actualizada recientemente", "Recién agregada", "2026-10-23", "2026-10-23T17:30:00", "fecha inválida"]) {
    assert.equal(formatStoreUpdatedAt(value), null, String(value));
  }
});

test("una fecha imposible se trata como información no disponible", () => {
  assert.equal(formatStoreUpdatedAt("2026-99-99T25:99:00Z"), null);
});
