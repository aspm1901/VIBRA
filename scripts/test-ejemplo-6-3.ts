/**
 * Pruebas unitarias que blindan el Ejemplo 6.3 y las fórmulas del Capítulo 6.
 * Garantiza que cualquier cambio futuro en el código mantenga la coherencia matemática 1:1.
 *
 * Ejecutar con: npx.cmd tsx scripts/test-ejemplo-6-3.ts
 */
import { determineBand, roundScore, scalePerceptualSimilarity } from "../lib/ranking";
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

console.log("\n=== 2. Ejemplo 6.3: Tienda A (Beige Studio - Look Completo) ===");
const pesoFoto = 0.30;
const pesoEstilo = 0.70;
const coberturaA = 1.0;
const especialidadA = 1.0;
const estiloScoreA = 0.50 * coberturaA + 0.50 * especialidadA;
const resonanciaA = roundScore(pesoFoto * visA + pesoEstilo * estiloScoreA);
assert(resonanciaA === 0.96, `Tienda A obtiene exactamente 0.96 (96 %) (obtenido: ${resonanciaA})`);
assert(determineBand(resonanciaA) === "Alta", `Tienda A pertenece a Banda Alta`);

console.log("\n=== 3. Ejemplo 6.3: Tienda B (Urbana Chic - Descartada) ===");
const estiloScoreB = 0.00;
const resonanciaB = roundScore(pesoFoto * visB + pesoEstilo * estiloScoreB);
assert(resonanciaB === 0.06, `Tienda B obtiene exactamente 0.06 (6 %) (obtenido: ${resonanciaB})`);
assert(resonanciaB < PUBLISH_THRESHOLD.look, `Tienda B (0.06) no supera el umbral de publicación de Look (${PUBLISH_THRESHOLD.look})`);
assert(visB < 0.45, `Tienda B (0.20) no supera el Candado de Afinidad Mínima (0.45)`);

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
