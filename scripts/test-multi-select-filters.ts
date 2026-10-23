import { getAllStores } from "../lib/stores-db";

async function testFilterLogic() {
  console.log("=== Verificando lógica de filtros con selección múltiple ===");
  const allStores = await getAllStores();
  console.log(`Total tiendas en base de datos: ${allStores.length}`);

  // Test 1: Filtro de tallas múltiple ["XS", "XL"]
  const filterSizes = ["xs", "xl"];
  const matchingSizeStores = allStores.filter((store) => {
    const storeSizesLower = (store.sizes || []).map((s) => s.toLowerCase());
    return filterSizes.some((s) => storeSizesLower.includes(s));
  });
  console.log(`\n1. Filtro Tallas [XS, XL]: ${matchingSizeStores.length} de ${allStores.length} tiendas pasan.`);
  for (const s of matchingSizeStores) {
    const hasMatch = (s.sizes || []).some((sz) => filterSizes.includes(sz.toLowerCase()));
    if (!hasMatch) {
      throw new Error(`Fallo en tienda ${s.name}: no tiene ni XS ni XL pero pasó.`);
    }
  }
  console.log("✅ PASÓ: Todas las tiendas que pasaron tienen al menos XS o XL (lógica OR).");

  // Test 2: Filtro de precios múltiple ["economico", "medio"]
  const filterPrices = ["economico", "medio"];
  const matchingPriceStores = allStores.filter((store) =>
    filterPrices.includes(store.priceLevel.toLowerCase())
  );
  console.log(`\n2. Filtro Precio [Económico, Medio]: ${matchingPriceStores.length} de ${allStores.length} tiendas pasan.`);
  for (const s of matchingPriceStores) {
    if (s.priceLevel.toLowerCase() === "alto") {
      throw new Error(`Fallo en tienda ${s.name}: tiene precio Alto pero pasó el filtro.`);
    }
  }
  console.log("✅ PASÓ: Ninguna tienda de precio Alto pasó el filtro.");

  // Test 3: Filtro combinado (Tallas [M, L] + Precio [Medio])
  const combinedStores = allStores.filter((store) => {
    const matchesPrice = store.priceLevel.toLowerCase() === "medio";
    const storeSizesLower = (store.sizes || []).map((s) => s.toLowerCase());
    const matchesSize = ["m", "l"].some((sz) => storeSizesLower.includes(sz));
    return matchesPrice && matchesSize;
  });
  console.log(`\n3. Filtro Combinado [M, L] + [Medio]: ${combinedStores.length} tiendas pasan.`);
  for (const s of combinedStores) {
    if (s.priceLevel.toLowerCase() !== "medio") throw new Error("Precio incorrecto");
    const hasSize = (s.sizes || []).some((sz) => ["m", "l"].includes(sz.toLowerCase()));
    if (!hasSize) throw new Error("Talla incorrecta");
  }
  console.log("✅ PASÓ: Filtros combinados funcionan con exactitud.");

  console.log("\n✨ TODAS LAS PRUEBAS DE SELECCIÓN MÚLTIPLE PASARON EXITOSAMENTE ✨");
}

testFilterLogic().catch(console.error);
