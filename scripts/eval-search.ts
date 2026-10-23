/**
 * Medición del buscador con el catálogo real (Supabase).
 *
 * Cada prenda del catálogo se usa como si fuera la foto que sube la usuaria
 * (se retira de su tienda para no encontrarse a sí misma) y se mide:
 *  - Tipo correcto: % del top 3 cuya prenda mostrada es del mismo tipo.
 *  - Misma tienda: en qué puesto aparece la tienda de origen (proxy de "estética parecida").
 *  - Color: % de top 1 del mismo tipo cuyo color principal coincide.
 *  - Distribución de similitud visual (coseno) para calibrar la escala.
 *
 * Uso:  npx.cmd tsx scripts/eval-search.ts
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Store, StoreGarment } from "@/types";
import { cosineSimilarity, extractGarmentFamily } from "@/lib/ranking";
import { scoreLookStore, scorePrendaStore, colorGroupOf, garmentContainsFamily } from "@/lib/search-scoring";

fs.readFileSync(".env.local", "utf8")
  .split("\n")
  .forEach((l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  });

const PRENDA_MIN = 0.38;
const LOOK_MIN = 0.5;

function pct(n: number, d: number) {
  return d === 0 ? "-" : `${((100 * n) / d).toFixed(1)}%`;
}
function quantiles(arr: number[], qs: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  return qs.map((q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]?.toFixed(3));
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await sb.from("stores").select("*");
  if (error || !data) throw error;

  const stores: Store[] = data.map((r: any) => ({
    id: r.id,
    name: r.name,
    gallery: r.gallery,
    galleryAddress: r.gallery_address || "",
    floor: r.floor,
    stand: r.stand,
    referenceLocation: "",
    whatsapp: r.whatsapp,
    priceLevel: r.price_level,
    styles: r.styles || [],
    categories: r.categories || [],
    sizes: r.sizes || [],
    purchaseType: r.purchase_type,
    standPhotoUrl: r.stand_photo_url,
    updatedAt: "",
    garments: (r.garments || []).map(({ _storeMeta, ...g }: any) => g as StoreGarment),
  }));

  const fam = (g: StoreGarment) => extractGarmentFamily(g.name, g.category, g.garmentFamily);

  // ---------- 1. Distribución de similitud visual ----------
  const all = stores.flatMap((s) => s.garments.map((g) => ({ s, g })));
  const sameFam: number[] = [];
  const diffFam: number[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (!a.g.embedding?.length || !b.g.embedding?.length) continue;
      const c = cosineSimilarity(a.g.embedding, b.g.embedding);
      const fa = fam(a.g), fb = fam(b.g);
      if (fa === "conjunto" || fb === "conjunto") continue;
      (fa === fb ? sameFam : diffFam).push(c);
    }
  }
  console.log("=== Similitud visual (coseno) entre prendas del catálogo ===");
  console.log("percentiles            p10    p50    p90    p99");
  console.log(`mismo tipo          ${quantiles(sameFam, [0.1, 0.5, 0.9, 0.99]).join("  ")}`);
  console.log(`distinto tipo       ${quantiles(diffFam, [0.1, 0.5, 0.9, 0.99]).join("  ")}`);

  // ---------- 2. Modo "Una prenda" ----------
  let queries = 0, famQueries = 0, famHits = 0, famSlots = 0;
  let ownFound = 0, ownTop1 = 0, ownTop3 = 0, mrr = 0, resultsTotal = 0;
  let colorQueries = 0, colorHits = 0;
  const scoreSame: number[] = [];
  const scoreTop1: number[] = [];

  for (const { s: origin, g: query } of all) {
    if (!query.embedding?.length) continue;
    queries++;
    const qFam = fam(query);
    const catalog = stores.map((s) =>
      s.id === origin.id ? { ...s, garments: s.garments.filter((x) => x.id !== query.id) } : s
    );
    const results = catalog
      .map((s) =>
        scorePrendaStore(s, {
          queryVector: query.embedding!,
          queryFamily: qFam,
          primaryColor: query.primaryColor || "",
          activeStyles: (query.styles || []).slice(0, 3),
        })
      )
      .filter((r): r is NonNullable<typeof r> => !!r && r.resonanceScore >= PRENDA_MIN)
      .sort((a, b) => b.resonanceScore - a.resonanceScore);

    resultsTotal += results.length;
    if (results[0]) scoreTop1.push(results[0].resonanceScore);

    if (qFam !== "otro" && qFam !== "conjunto") {
      famQueries++;
      for (const r of results.slice(0, 3)) {
        famSlots++;
        const bgFam = fam(r.bestGarment);
        const isMatch = bgFam === qFam || (bgFam === "conjunto" && garmentContainsFamily(r.bestGarment, qFam));
        if (isMatch) {
          famHits++;
          scoreSame.push(r.resonanceScore);
        }
      }
      const top = results[0];
      const qColor = colorGroupOf(query.primaryColor || "");
      if (top && fam(top.bestGarment) === qFam && qColor >= 0) {
        colorQueries++;
        if (colorGroupOf(top.bestGarment.primaryColor || "") === qColor) colorHits++;
      }
    }

    const rank = results.findIndex((r) => r.store.id === origin.id);
    if (rank >= 0) {
      ownFound++;
      if (rank === 0) ownTop1++;
      if (rank < 3) ownTop3++;
      mrr += 1 / (rank + 1);
    }
  }

  console.log(`\n=== Modo "Una prenda" (${queries} búsquedas) ===`);
  console.log(`Tiendas mostradas por búsqueda (promedio): ${(resultsTotal / queries).toFixed(1)} de ${stores.length}`);
  console.log(`Top 3 con el mismo tipo de prenda:        ${pct(famHits, famSlots)}  (${famQueries} búsquedas con tipo definido)`);
  console.log(`Top 1 del mismo color (si es mismo tipo):  ${pct(colorHits, colorQueries)}  (${colorQueries} casos)`);
  console.log(`Tienda de origen en el puesto 1:          ${pct(ownTop1, queries)}`);
  console.log(`Tienda de origen en el top 3:             ${pct(ownTop3, queries)}`);
  console.log(`MRR tienda de origen:                     ${(mrr / queries).toFixed(3)}`);
  console.log(`Porcentaje del puesto 1 (p10/p50/p90):    ${quantiles(scoreTop1, [0.1, 0.5, 0.9]).join(" / ")}`);

  // ---------- 3. Modo "Look completo" ----------
  const lookQueries = all.filter(({ g }) => g.embedding?.length && fam(g) === "conjunto");
  let lQ = 0, lFound = 0, lTop3 = 0, lResults = 0;
  const singleStyleStores = stores.filter((s) => s.styles.length === 1);
  let singleEligible = 0, singleShown = 0;

  for (const { s: origin, g: query } of lookQueries) {
    lQ++;
    const activeStyles = (query.styles || []).slice(0, 3);
    const catalog = stores.map((s) =>
      s.id === origin.id ? { ...s, garments: s.garments.filter((x) => x.id !== query.id) } : s
    );
    const results = catalog
      .map((s) => scoreLookStore(s, { queryVector: query.embedding!, activeStyles }))
      .filter((r): r is NonNullable<typeof r> => !!r && r.resonanceScore >= LOOK_MIN)
      .sort((a, b) => b.resonanceScore - a.resonanceScore);
    lResults += results.length;
    const rank = results.findIndex((r) => r.store.id === origin.id);
    if (rank >= 0) lFound++;
    if (rank >= 0 && rank < 3) lTop3++;

    // Tiendas de un solo estilo cuyo estilo coincide con el look: ¿aparecen?
    for (const s of singleStyleStores) {
      const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (activeStyles.some((a) => norm(a) === norm(s.styles[0]))) {
        singleEligible++;
        if (results.some((r) => r.store.id === s.id)) singleShown++;
      }
    }
  }

  console.log(`\n=== Modo "Look completo" (${lQ} looks del catálogo) ===`);
  console.log(`Tiendas mostradas por búsqueda (promedio): ${(lResults / Math.max(1, lQ)).toFixed(1)}`);
  console.log(`Tienda de origen aparece:                 ${pct(lFound, lQ)}`);
  console.log(`Tienda de origen en el top 3:             ${pct(lTop3, lQ)}`);
  console.log(`Tiendas de 1 solo estilo que coinciden y SÍ aparecen: ${pct(singleShown, singleEligible)} (${singleEligible} casos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
