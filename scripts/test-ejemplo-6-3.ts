/**
 * Pruebas unitarias que blindan el Ejemplo 6.3 y las fórmulas del Capítulo 6.
 * Garantiza que cualquier cambio futuro en el código mantenga la coherencia matemática 1:1.
 *
 * Ejecutar con: npx.cmd tsx scripts/test-ejemplo-6-3.ts
 */
import { determineBand, roundScore, scalePerceptualSimilarity } from "../lib/ranking";
import { scoreLookPiecesStore } from "../lib/look-scoring";
import type { Store, StoreGarment } from "../types";
import type { LookPieceQuery } from "../lib/look-pieces";
import {
  ESTILO_COINCIDENCIA_PESO,
  ESTILO_BONO_INSIGNIA,
  ESTILO_BONO_CATALOGO_MAX,
  PUBLISH_THRESHOLD,
} from "../lib/search-scoring";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FALLÓ: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASÓ: ${msg}`);
}

console.log("=== 1. Verificación de calibración perceptual (Embeddings) ===");
const visA = scalePerceptualSimilarity(0.82, "same");
assert(visA === 0.86, `0.82 crudo misma familia (chaleco) mapea a 0.86 calibrado (obtenido: ${visA})`);

const visB = scalePerceptualSimilarity(0.60, "different");
assert(visB === 0.20, `0.60 crudo familia distinta (short vs chaleco) mapea a 0.20 calibrado (obtenido: ${visB})`);

console.log("\n=== 2. Ejemplo 6.3 actual: dos prendas comparadas por separado ===");
const pieces: LookPieceQuery[] = [
  { name: "Chaleco marfil", garmentFamily: "casaca", primaryColor: "Marfil", box: [0,0,500,1000], queryVector: [1,0] },
  { name: "Short marfil", garmentFamily: "falda_short", primaryColor: "Marfil", box: [500,0,1000,1000], queryVector: [0,1] },
];
const styles = ["Elegante", "Oficina"];
const garments: StoreGarment[] = [
  { id: "chaleco", storeId: "ejemplo", name: "Chaleco marfil", category: "Chaleco", garmentFamily: "casaca", primaryColor: "Marfil", styles, photoUrl: "/ejemplo.jpg", embedding: [.84, Math.sqrt(1-.84*.84)] },
  { id: "short", storeId: "ejemplo", name: "Short marfil", category: "Short", garmentFamily: "falda_short", primaryColor: "Marfil", styles, photoUrl: "/ejemplo-short.jpg", embedding: [Math.sqrt(1-.795*.795), .795] },
];
const baseStore: Store = { id: "ejemplo", name: "Tienda A", gallery: "Ejemplo", galleryAddress: "", floor: "1", stand: "1", referenceLocation: "", whatsapp: "", priceLevel: "medio", styles, categories: ["Chaleco", "Short"], sizes: ["M"], purchaseType: "presencial", standPhotoUrl: "", updatedAt: "", garments };
assert(scalePerceptualSimilarity(.84, "neutral") === .80, "El chaleco aporta 0,80 de parecido visual");
assert(scalePerceptualSimilarity(.795, "neutral") === .75, "El short aporta 0,75 de parecido visual");
const a = scoreLookPiecesStore(baseStore, { pieces, activeStyles: styles });
assert(a?.resonanceScore === .85 && a.band === "Alta", "Tienda A obtiene 85 % usando la función real de Look completo");
assert(a?.lookMatch?.matchedPieces === 2, "A ofrece opciones para las dos piezas");
const b = scoreLookPiecesStore({ ...baseStore, name: "Tienda B", garments: garments.slice(0,1) }, { pieces, activeStyles: styles });
assert(b?.resonanceScore === .69 && b.band === "Media", "Tienda B queda en 69 % por el tope de look parcial");
assert(b?.lookMatch?.missingPieces[0] === "Short marfil", "Se informa que falta el short");
const noStyle = scoreLookPiecesStore({ ...baseStore, styles: ["Urbano"], garments: garments.map(g => ({ ...g, styles: ["Urbano"] })) }, { pieces, activeStyles: styles });
assert(noStyle === null, "Una tienda sin estilos compartidos se descarta en Look completo");

console.log("\n=== 4. Progresión limpia de bandas en modo «Por estilo» ===");
// 0 estilos
assert(PUBLISH_THRESHOLD.estilo === 0.25, `El umbral de publicación coincide con el piso de Exploratoria (0.25)`);

// 1 de 3 estilos
const score1_3 = roundScore(ESTILO_COINCIDENCIA_PESO * (1 / 3));
assert(score1_3 === 0.25, `1 de 3 estilos da exactamente 0.25 (obtenido: ${score1_3})`);
assert(determineBand(score1_3) === "Exploratoria", `1 de 3 estilos entra a Banda Exploratoria`);

// 2 de 3 estilos genérico (sin bonos)
const score2_3_generico = roundScore(ESTILO_COINCIDENCIA_PESO * (2 / 3));
assert(score2_3_generico === 0.50, `2 de 3 estilos genérico da exactamente 0.50 (obtenido: ${score2_3_generico})`);
assert(determineBand(score2_3_generico) === "Media", `2 de 3 estilos genérico está en Banda Media`);

// 2 de 3 estilos especialista con insignia y catálogo máximo
const score2_3_especialista = roundScore(
  ESTILO_COINCIDENCIA_PESO * (2 / 3) + ESTILO_BONO_INSIGNIA + ESTILO_BONO_CATALOGO_MAX
);
assert(score2_3_especialista === 0.63, `2 de 3 estilos especialista da exactamente 0.63 (obtenido: ${score2_3_especialista})`);
assert(determineBand(score2_3_especialista) === "Media", `2 de 3 estilos especialista permanece en Banda Media alta (< 0.70)`);
assert(roundScore(0.70 - score2_3_especialista) === 0.07, `Queda exactamente a 0.07 del umbral de Banda Alta`);

// 3 de 3 estilos
const score3_3 = roundScore(ESTILO_COINCIDENCIA_PESO * (3 / 3));
assert(score3_3 === 0.75, `3 de 3 estilos arranca exactamente en 0.75 (obtenido: ${score3_3})`);
assert(determineBand(score3_3) === "Alta", `3 de 3 estilos ingresa a Banda Alta`);

// 2 estilos buscados: 1/2 coincidencia
const score1_2_base = roundScore(ESTILO_COINCIDENCIA_PESO * (1 / 2));
const score1_2_max = roundScore(
  ESTILO_COINCIDENCIA_PESO * (1 / 2) + ESTILO_BONO_INSIGNIA + ESTILO_BONO_CATALOGO_MAX
);
assert(score1_2_base === 0.38, `1 de 2 estilos base da 0.38 (Exploratoria)`);
assert(score1_2_max === 0.51, `1 de 2 estilos con bonos máximos sube a 0.51 (Banda Media)`);

console.log("\n✨ TODAS LAS VERIFICACIONES MATEMÁTICAS DEL CAPÍTULO 6 PASARON AL 100% ✨\n");
