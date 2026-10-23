import { getAllStores, saveStore } from "../lib/stores-db";

async function main() {
  console.log("=== Verificando persistencia de tallas al editar tiendas ===");
  const stores = await getAllStores();
  if (stores.length === 0) {
    console.log("No hay tiendas cargadas.");
    return;
  }

  const target = stores[0];
  console.log(`Tienda seleccionada: ${target.name} (${target.id})`);
  console.log("Tallas iniciales:", target.sizes);

  const originalSizes = [...target.sizes];
  const testSizes = ["XS", "S", "M", "L", "XL", "Estándar", "32"];

  console.log("\nSimulando actualización desde Panel Admin (PUT) con nuevas tallas...");
  await saveStore({ ...target, sizes: testSizes });

  const storesAfter = await getAllStores();
  const updatedTarget = storesAfter.find((s) => s.id === target.id);
  console.log("Tallas leídas luego de guardar:", updatedTarget?.sizes);

  const isExactMatch =
    JSON.stringify(updatedTarget?.sizes) === JSON.stringify(testSizes);

  if (isExactMatch) {
    console.log("✅ ÉXITO: Las tallas se guardan y persisten al 100%.");
  } else {
    console.error("❌ ERROR: Las tallas no coinciden.");
  }

  // Restaurar tallas originales para no alterar datos existentes
  await saveStore({ ...target, sizes: originalSizes });
  const storesRestored = await getAllStores();
  const restoredTarget = storesRestored.find((s) => s.id === target.id);
  console.log("Tallas restauradas a su valor original:", restoredTarget?.sizes);
  console.log("✅ Restauración completada.");
}

main().catch(console.error);
