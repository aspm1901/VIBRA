import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function main() {
  if (process.env.VIBRA_SIZES_TEST_WORKER !== "1") {
    const projectRoot = process.cwd();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vibra-sizes-test-"));
    fs.mkdirSync(path.join(directory, "data"));
    fs.copyFileSync(path.join(projectRoot, "data/stores.json"), path.join(directory, "data/stores.json"));
    const env = { ...process.env, VIBRA_SIZES_TEST_WORKER: "1", TSX_TSCONFIG_PATH: path.join(projectRoot, "tsconfig.json") };
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete (env as Record<string, string | undefined>)[key];
    }
    const result = spawnSync(process.execPath, [...process.execArgv, path.resolve(process.argv[1])], {
      cwd: directory, env, stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    // Solo se elimina el directorio temporal exacto creado por esta prueba.
    if (path.dirname(directory) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith("vibra-sizes-test-")) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
    return;
  }

  const { getAllStores, saveStore } = await import("../lib/stores-db");
  const stores = await getAllStores();
  assert.ok(stores.length > 0, "La copia local debe contener tiendas");
  const target = stores[0];
  const testSizes = ["XS", "S", "M", "L", "XL", "Estándar", "32"];
  try {
    await saveStore({ ...target, sizes: testSizes });
    const updated = (await getAllStores()).find(store => store.id === target.id);
    assert.deepEqual(updated?.sizes, testSizes);
    console.log("PASÓ: persistencia exacta de tallas múltiples, Estándar y talla numérica en copia aislada.");

    const { PUT } = await import("../app/api/admin/stores/route");
    const { NextRequest } = await import("next/server");
    const beforeSave = Date.now();
    const response = await PUT(new NextRequest("http://localhost/api/admin/stores", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, updatedAt: "2099-01-01T00:00:00Z", existingGarments: target.garments, newGarmentsData: [] }),
    }));
    assert.equal(response.status, 200);
    const saved = (await response.json()).store;
    assert.match(saved.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(Date.parse(saved.updatedAt) >= beforeSave && Date.parse(saved.updatedAt) <= Date.now());
    assert.equal((await getAllStores()).find(store => store.id === target.id)?.updatedAt, saved.updatedAt);
    console.log("PASÓ: editar la ficha registra y persiste fecha y hora del servidor, sin aceptar fechas del cliente.");
  } finally {
    await saveStore(target);
  }
  assert.deepEqual((await getAllStores()).find(store => store.id === target.id)?.sizes, target.sizes);
  console.log("PASÓ: restauración de la copia. Catálogo original y Supabase sin modificaciones.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
