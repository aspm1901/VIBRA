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
  } finally {
    await saveStore(target);
  }
  assert.deepEqual((await getAllStores()).find(store => store.id === target.id)?.sizes, target.sizes);
  console.log("PASÓ: restauración de la copia. Catálogo original y Supabase sin modificaciones.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
