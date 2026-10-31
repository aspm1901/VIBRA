import type { SearchResultItem, Store, StoreGarment } from "@/types";
import {
  describeOfferedGarment,
  isCompatibleLookPiece,
  isCompositeLookPhoto,
  topSleeveKind,
} from "@/lib/look-compatibility";
import {
  cosineSimilarity,
  calculateStyleMatch,
  calculateGarmentStyleAffinity,
  calculateResonanceScore,
  determineBand,
  extractGarmentFamily,
  doesStoreSellFamily,
  roundScore,
  cleanStyleStr,
  MAX_RESONANCE,
  scalePerceptualSimilarity,
  type GarmentFamily,
} from "@/lib/ranking";

/**
 * Puntuación por tienda para los modos con foto ("prenda" y "look").
 * Se mantiene separada de la ruta API para poder medirla con el catálogo real
 * (ver scripts/eval-search.ts) usando exactamente el mismo código que producción.
 */

export const COLOR_GROUPS: string[][] = [
  ["negro", "black", "oscuro", "azabache", "carbon"],
  ["blanco", "white", "marfil", "hueso", "perla", "crema", "crudo"],
  ["beige", "arena", "camel", "caqui", "nude", "tierra", "champagne", "almendra"],
  ["marron", "marrón", "chocolate", "cafe", "café", "canela", "terracota", "cobre", "tabaco"],
  ["azul", "celeste", "denim", "marino", "indigo", "índigo", "turquesa", "cobalto", "petroleo"],
  ["rojo", "burdeos", "vino", "tinto", "guinda", "granate", "coral", "carmesi", "escarlata"],
  ["rosa", "rosado", "fucsia", "palo rosa", "magenta", "melon", "melón", "salmon"],
  ["morado", "lila", "violeta", "lavanda", "ciruela", "purpura", "púrpura"],
  ["verde", "oliva", "militar", "esmeralda", "menta", "sage", "pistacho", "botella"],
  ["amarillo", "mostaza", "ocre", "dorado", "oro", "ambar", "ámbar"],
  ["gris", "plomo", "plata", "plateado", "ceniza", "melange", "jaspeado"],
];

export function hasColorAffinity(queryColorRaw: string, garment: StoreGarment): boolean {
  const qGroup = colorGroupOf(queryColorRaw || "");
  if (qGroup < 0) return false;
  // Color principal de la prenda; si no lo reconoce, se intenta con el nombre (ej. "Vestido burdeos ...")
  let gGroup = colorGroupOf(garment.primaryColor || "");
  if (gGroup < 0) gGroup = colorGroupOf(garment.name || "");
  return gGroup === qGroup;
}

function stripAccents(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Devuelve el índice del grupo cromático del PRIMER color mencionado en el texto
 * (palabra completa, sin tildes), o -1 si no reconoce ninguno.
 * Ej.: "Negro con brillo plateado" -> grupo negro (no plateado); "Dorado" -> amarillo.
 */
export function colorGroupOf(text: string): number {
  const t = stripAccents(text || "");
  let bestPos = Infinity;
  let bestGroup = -1;
  COLOR_GROUPS.forEach((group, gi) => {
    for (const term of group) {
      const re = new RegExp(`\\b${stripAccents(term)}\\b`);
      const m = re.exec(t);
      if (m && m.index < bestPos) {
        bestPos = m.index;
        bestGroup = gi;
      }
    }
  });
  return bestGroup;
}

type FamilyRelation = "same" | "different" | "neutral";

/**
 * Puntaje mínimo para que una tienda se publique en resultados, por modo.
 * (Se comparte con scripts/eval-search.ts para medir exactamente lo mismo que producción.)
 * - Prenda: 0.38 (evita ruido visual de prendas no relacionadas)
 * - Look: 0.50 (requiere armonía y coherencia de outfit)
 * - Estilo: 0.25 (coincide con el inicio exacto de la Banda Exploratoria: 1 de 3 estilos)
 */
export const PUBLISH_THRESHOLD = { prenda: 0.38, look: 0.5, estilo: 0.25 } as const;

// Peso del color (calibrado con scripts/eval-search.ts sobre las 277 prendas reales)
const COLOR_SELECTION_BOOST = 1.08;
const COLOR_RESONANCE_BONUS = 0.05;

/**
 * Comprueba si una prenda compuesta (como un conjunto de 2 piezas)
 * contiene piezas de la familia buscada.
 */
export function garmentContainsFamily(garment: StoreGarment, family: GarmentFamily): boolean {
  if (family === "otro") return true;
  const text = stripAccents(`${garment.name} ${garment.category || ""}`);
  switch (family) {
    case "vestido":
      return /\b(vestidos?|enterizos?|mamelucos?|jumpsuits?)\b/.test(text);
    case "falda_short":
      return /\b(faldas?|minifaldas?|shorts?|bermudas?|skorts?|pareos?)\b/.test(text);
    case "casaca":
      return /\b(casacas?|chaquetas?|blazers?|abrigos?|bombers?|chalecos?|sacos?)\b/.test(text);
    case "chompa":
      return /\b(chompas?|sueter(es)?|sweaters?|cardigans?|poleras?|hoodies?)\b/.test(text);
    case "pantalon_jean":
      return /\b(jeans?|pantalon(es)?|palazzos?|cargos?|joggers?|leggings?)\b/.test(text);
    case "blusa":
      return /\b(blusas?|camisas?|blusones?)\b/.test(text);
    case "polo_top":
      return /\b(polos?|tops?|camisetas?|crops?|bralettes?|corsets?|bustiers?|bodys?|bikinis?)\b/.test(text);
    default:
      return false;
  }
}

export function getFamilyRelation(
  queryFamily: GarmentFamily,
  garment: StoreGarment
): FamilyRelation {
  const garmentFamily = extractGarmentFamily(garment.name, garment.category, garment.garmentFamily);
  if (queryFamily === "otro" || garmentFamily === "otro") return "neutral";
  if (queryFamily === garmentFamily) return "same";

  // Si la prenda del catálogo es un conjunto (ej. "Conjunto de top y falda")
  if (garmentFamily === "conjunto") {
    if (garmentContainsFamily(garment, queryFamily)) return "same";
    // Si busca blusa y el conjunto tiene top (o viceversa), relación neutral
    if (
      (queryFamily === "blusa" && garmentContainsFamily(garment, "polo_top")) ||
      (queryFamily === "polo_top" && garmentContainsFamily(garment, "blusa"))
    ) {
      return "neutral";
    }
    // ¿El conjunto especifica qué piezas tiene? Si sí especifica sus piezas y ninguna coincide con lo buscado, es "different"
    const allPieceFamilies: GarmentFamily[] = [
      "vestido",
      "falda_short",
      "casaca",
      "chompa",
      "pantalon_jean",
      "blusa",
      "polo_top",
    ];
    const hasExplicitPieces = allPieceFamilies.some((f) => garmentContainsFamily(garment, f));
    if (hasExplicitPieces) return "different";
    // Si es un conjunto genérico (ej. "Conjunto deportivo de dos piezas") y busca top o pantalón/falda, puede contenerlo
    if (["polo_top", "pantalon_jean", "falda_short"].includes(queryFamily)) return "neutral";
    return "different";
  }

  // Si la usuaria subió un conjunto en modo "Una prenda", las piezas que lo componen suman como neutral/same
  if (queryFamily === "conjunto") {
    if (["polo_top", "blusa", "pantalon_jean", "falda_short", "casaca"].includes(garmentFamily)) {
      return "neutral";
    }
    return "different";
  }

  if (
    (queryFamily === "blusa" && garmentFamily === "polo_top") ||
    (queryFamily === "polo_top" && garmentFamily === "blusa")
  ) {
    return "neutral";
  }
  return "different";
}

export interface PrendaQuery {
  queryVector: number[] | null;
  queryFamily: GarmentFamily;
  primaryColor: string;
  activeStyles: string[];
  queryTitle?: string;
}

const STRAPLESS_RE = /\b(strapless|bandeau|palabra\s+de\s+honor)\b/;
const SHOULDER_TOP_RE =
  /\b(sin\s+mangas|mangas?\s+cortas?|mangas?\s+largas?|cuello\s+(?:alto|redondo|v|cerrado|cuadrado|barco|halter)|halter|un\s+solo\s+hombro|asimetric[oa]s?|botones|acanalad[oa]s?|polos?|camisetas?|t-shirts?|musculosas?)\b/;
const HALTER_RE = /\b(halter)\b/;
const NON_HALTER_NECK_RE =
  /\b(cuello\s+(?:redondo|v|cerrado|cuadrado|barco|alto)|escote\s+(?:redondo|v|cuadrado|corazon)|botones\s+laterales)\b/;
const GRAPHIC_PRINT_RE =
  /\b(estampad[oa]s?|grafic[oa]s?|graphic|frases?|letras|calaveras?|dragon|corazones|parches|texto)\b/;
const PARTY_SPARKLE_RE =
  /\b(lentejuelas|pedreria|cristales|brillantes|brillos|cadenas|holografic[oa]s?)\b/;
const PLAIN_TOP_RE =
  /\b(punto|acanalad[oa]s?|drapead[oa]s?|basic[oa]s?|sastre|botones|estructurad[oa]s?|liso|lisa)\b/;

const STRUCTURAL_DETAIL_PATTERNS: RegExp[] = [
  /\bsin\s+mangas\b/,
  /\b(?:tirantes|tiras)\b/,
  /\bbotones\s+laterales\b/,
  /\bpeplum\b/,
  /\bacanalad[oa]s?\b/,
  /\b(?:tejid[oa]s?|de\s+punto)\b/,
  /\bdrapead[oa]s?\b/,
  /\b(?:escote|cuello)\s+cuadrado\b/,
  /\bcuello\s+alto\b/,
  /\b(?:un\s+(?:solo\s+)?hombro|asimetric[oa]s?)\b/,
  /\b(?:encaje|crochet|broderie|bordad[oa]s?)\b/,
  /\b(?:volantes|volados)\b/,
];

function countSharedStructuralDetails(queryTitle: string, garment: StoreGarment): number {
  const title = stripAccents((queryTitle || "").trim());
  if (!title) return 0;
  const offered = describeOfferedGarment(garment);
  let count = 0;
  for (const re of STRUCTURAL_DETAIL_PATTERNS) {
    if (re.test(title) && re.test(offered)) {
      count++;
    }
  }
  return count;
}

export function hasPrendaSubtypeConflict(
  queryTitle: string,
  queryFamily: GarmentFamily,
  primaryColor: string,
  garment: StoreGarment
): boolean {
  const title = stripAccents((queryTitle || "").trim());
  if (!title) return false;
  if (queryFamily !== "conjunto" && isCompositeLookPhoto(garment)) {
    return true;
  }
  if (
    !isCompatibleLookPiece(
      { name: queryTitle, garmentFamily: queryFamily, primaryColor, box: [0, 0, 1000, 1000] },
      garment
    )
  ) {
    return true;
  }
  if (queryFamily === "polo_top" || queryFamily === "blusa") {
    const offered = describeOfferedGarment(garment);
    if (STRAPLESS_RE.test(offered) && !STRAPLESS_RE.test(title) && SHOULDER_TOP_RE.test(title)) {
      return true;
    }
    if (STRAPLESS_RE.test(title) && !STRAPLESS_RE.test(offered) && SHOULDER_TOP_RE.test(offered)) {
      return true;
    }
    if (HALTER_RE.test(offered) && !HALTER_RE.test(title) && NON_HALTER_NECK_RE.test(title)) {
      return true;
    }
    if (HALTER_RE.test(title) && !HALTER_RE.test(offered) && NON_HALTER_NECK_RE.test(offered)) {
      return true;
    }
    if (GRAPHIC_PRINT_RE.test(offered) && !GRAPHIC_PRINT_RE.test(title) && PLAIN_TOP_RE.test(title)) {
      return true;
    }
    if (PARTY_SPARKLE_RE.test(offered) && !PARTY_SPARKLE_RE.test(title) && PLAIN_TOP_RE.test(title)) {
      return true;
    }
  }
  return false;
}

export function scorePrendaStore(store: Store, q: PrendaQuery): SearchResultItem | null {
  if (!q.queryVector?.length) return null;
  if (q.queryFamily !== "otro" && !doesStoreSellFamily(store, q.queryFamily)) {
    // La tienda no confecciona ni vende esta familia de prendas
    return null;
  }

  let bestGarment = store.garments[0];
  let maxPhotoSim = 0;
  let bestFamilyRelation: FamilyRelation = "neutral";
  let bestSubtypeConflict = false;
  let additionalMatchesCount = 0;
  let maxComparisonScore = -1;
  const wantedSleeve = q.queryTitle ? topSleeveKind(q.queryTitle) : undefined;

  for (const garment of store.garments) {
    if (!garment.embedding || garment.embedding.length !== q.queryVector.length) continue;
    const sim =
      q.queryVector && q.queryVector.length > 0 ? cosineSimilarity(q.queryVector, garment.embedding) : 0;
    if (sim <= 0) continue;
    let familyRelation = getFamilyRelation(q.queryFamily, garment);
    const subtypeConflict = hasPrendaSubtypeConflict(
      q.queryTitle || "",
      q.queryFamily,
      q.primaryColor,
      garment
    );

    if (
      familyRelation === "neutral" &&
      !subtypeConflict &&
      (q.queryFamily === "polo_top" || q.queryFamily === "blusa") &&
      wantedSleeve &&
      topSleeveKind(describeOfferedGarment(garment)) === wantedSleeve
    ) {
      familyRelation = "same";
    }

    // Conteo de prendas del mismo tipo y subtipo compatible con similitud aceptable (para bono de variedad)
    if (familyRelation === "same" && !subtypeConflict && sim >= 0.65) {
      additionalMatchesCount++;
    }

    // Prioridad semántica + afinidad de color + coherencia de subtipo en la selección de la prenda ganadora
    let comparisonScore = sim;
    if (familyRelation === "same") {
      comparisonScore = sim * 1.35;
      if (!subtypeConflict && hasColorAffinity(q.primaryColor, garment)) {
        comparisonScore *= COLOR_SELECTION_BOOST;
      }
      if (!subtypeConflict && q.queryTitle) {
        const sharedDetails = Math.min(2, countSharedStructuralDetails(q.queryTitle, garment));
        if (sharedDetails > 0) {
          comparisonScore *= 1 + sharedDetails * 0.03;
        }
      }
      if (subtypeConflict) {
        comparisonScore *= 0.80;
      }
    } else if (familyRelation === "different") {
      comparisonScore = sim * 0.65;
    }

    if (comparisonScore > maxComparisonScore) {
      maxComparisonScore = comparisonScore;
      maxPhotoSim = sim;
      bestGarment = garment;
      bestFamilyRelation = familyRelation;
      bestSubtypeConflict = subtypeConflict;
    }
  }

  if (!bestGarment || maxComparisonScore < 0) return null;

  // Estilos de la tienda + estilos específicos de la prenda ganadora
  const combinedStoreAndGarmentStyles = Array.from(
    new Set([...(store.styles || []), ...(bestGarment.styles || [])])
  );
  const { score: styleMatchScore, matchingCount } = calculateStyleMatch(
    q.activeStyles,
    combinedStoreAndGarmentStyles
  );

  let { resonance, visualScore, band } = calculateResonanceScore(
    maxPhotoSim,
    styleMatchScore,
    bestFamilyRelation,
    "prenda"
  );

  // Bono de color si coinciden tonos en prendas del mismo tipo y subtipo compatible
  if (bestFamilyRelation === "same" && !bestSubtypeConflict && hasColorAffinity(q.primaryColor, bestGarment)) {
    resonance += q.queryTitle ? 0.06 : COLOR_RESONANCE_BONUS;
  }

  // Bono de precisión si la prenda ganadora comparte rasgos estructurales explícitos (ej. sin mangas, botones laterales)
  if (bestFamilyRelation === "same" && !bestSubtypeConflict && q.queryTitle) {
    const sharedDetails = countSharedStructuralDetails(q.queryTitle, bestGarment);
    if (sharedDetails >= 2) {
      resonance += 0.02;
    } else if (sharedDetails === 1) {
      resonance += 0.01;
    }
  }

  // Bono de alternativas: +0.02 por cada prenda adicional del mismo tipo con coseno >= 0.65 (máx +0.06)
  if (additionalMatchesCount > 1) {
    resonance += Math.min(0.06, (additionalMatchesCount - 1) * 0.02);
  }

  // Penalización si la mejor prenda de la tienda difiere en subtipo explícito (ej. manga corta, strapless o deportivo frente a top sin mangas)
  if (bestSubtypeConflict) {
    resonance -= 0.09;
  }

  resonance = roundScore(Math.min(MAX_RESONANCE, resonance));
  band = determineBand(resonance);

  return {
    store,
    bestGarment,
    resonanceScore: resonance,
    photoSimilarity: visualScore,
    styleMatchScore: Number(styleMatchScore.toFixed(2)),
    matchingStylesCount: matchingCount,
    totalSearchedStyles: q.activeStyles.length,
    band,
    searchMode: "prenda",
  };
}

/**
 * Modo "Por estilo" (sin foto).
 *
 *   Coincidencia = estilos de la tienda que coinciden / estilos elegidos por la compradora (1 a 3)
 *   Resonancia   = 0,75 × Coincidencia + Bono insignia (+0,06) + Bono de catálogo (hasta +0,07)
 *
 * - Sin ningún estilo en común la tienda NO se muestra (antes recibía un piso de 0,55).
 * - Con 3 estilos elegidos: 1/3 -> 0,25 (Exploratoria), 2/3 -> 0,50 (Media), 3/3 -> 0,75 (Alta).
 *   Los bonos suman como máximo 0,13, así que no hacen saltar de banda en ese caso.
 * - Bono insignia: el PRIMER estilo que declaró la tienda (su estilo principal) está entre los buscados.
 * - Bono de catálogo: afinidad promedio (0 a 1) de las prendas de la tienda con los estilos buscados.
 *   Es un valor continuo, así que también sirve para desempatar.
 */
export const ESTILO_COINCIDENCIA_PESO = 0.75;
export const ESTILO_BONO_INSIGNIA = 0.06;
export const ESTILO_BONO_CATALOGO_MAX = 0.07;

export function scoreEstiloStore(store: Store, activeStyles: string[]): SearchResultItem | null {
  if (store.garments.length === 0) return null;
  const { score: storeStyleScore, matchingCount } = calculateStyleMatch(activeStyles, store.styles);
  if (activeStyles.length > 0 && matchingCount === 0) return null;

  let bestGarment = store.garments[0];
  let maxAffinity = -1;
  let affinitySum = 0;

  for (const garment of store.garments) {
    const affinity = calculateGarmentStyleAffinity(garment, activeStyles);
    affinitySum += Math.min(1, Math.max(0, affinity));
    if (affinity > maxAffinity) {
      maxAffinity = affinity;
      bestGarment = garment;
    }
  }

  const catalogAffinity = store.garments.length > 0 ? affinitySum / store.garments.length : 0;
  const insignia =
    !!store.styles[0] &&
    activeStyles.some((s) => cleanStyleStr(s) === cleanStyleStr(store.styles[0]));

  const resonance = roundScore(
    Math.min(
      MAX_RESONANCE,
      ESTILO_COINCIDENCIA_PESO * storeStyleScore +
        (insignia ? ESTILO_BONO_INSIGNIA : 0) +
        ESTILO_BONO_CATALOGO_MAX * catalogAffinity
    )
  );

  return {
    store,
    bestGarment,
    resonanceScore: resonance,
    photoSimilarity: 0,
    styleMatchScore: Number(storeStyleScore.toFixed(2)),
    matchingStylesCount: matchingCount,
    totalSearchedStyles: activeStyles.length,
    band: determineBand(resonance),
    searchMode: "estilo",
  };
}

export interface LookQuery {
  queryVector: number[] | null;
  activeStyles: string[];
}

function isBottomGarment(g: StoreGarment): boolean {
  const family = extractGarmentFamily(g.name, g.category, g.garmentFamily);
  return family === "pantalon_jean" || family === "falda_short";
}

function isTopGarment(g: StoreGarment): boolean {
  const family = extractGarmentFamily(g.name, g.category, g.garmentFamily);
  return ["polo_top", "blusa", "chompa", "casaca"].includes(family);
}

export function scoreLookStore(store: Store, q: LookQuery): SearchResultItem | null {
  if (!q.queryVector?.length || q.activeStyles.length === 0) return null;
  let bestGarment = store.garments[0];
  let maxPhotoSim = 0;

  const scoredGarments = store.garments
    .filter((garment) => garment.embedding?.length === q.queryVector!.length)
    .map((garment) => {
      const sim =
        garment.embedding && garment.embedding.length > 0 && q.queryVector && q.queryVector.length > 0
          ? cosineSimilarity(q.queryVector, garment.embedding)
          : 0;
      const garmentAffinity = calculateGarmentStyleAffinity(garment, q.activeStyles);
      // Ponderación de look: afinidad estilística 65% + compatibilidad visual 35%
      const lookScore = 0.65 * garmentAffinity + 0.35 * sim;
      return { garment, sim, garmentAffinity, lookScore };
    })
    // El estilo no puede compensar una prenda sin parecido visual suficiente.
    .filter((sg) => sg.sim > 0 && scalePerceptualSimilarity(sg.sim, "neutral") >= 0.45)
    .sort((a, b) => b.lookScore - a.lookScore);

  if (scoredGarments.length === 0) return null;

  const matchingGarments: StoreGarment[] = [];

  if (scoredGarments.length > 0) {
    bestGarment = scoredGarments[0].garment;
    maxPhotoSim = scoredGarments[0].sim;

    // La pareja destacada requiere una superior y una inferior, ambas ya filtradas por parecido.
    const top = scoredGarments.find((sg) => isTopGarment(sg.garment) && sg.garmentAffinity >= 0.45);
    const bottom = scoredGarments.find((sg) => isBottomGarment(sg.garment) && sg.garmentAffinity >= 0.45);
    if (top && bottom) {
      matchingGarments.push(top.garment, bottom.garment);
    }
  }

  const { matchingCount } = calculateStyleMatch(q.activeStyles, store.styles);

  // Estilo del look vs. tienda, equilibrando dos preguntas:
  //  - Cobertura: ¿cuántos estilos del look encuentra la usuaria en la tienda (tienda + prendas que arman el look)?
  //  - Especialidad: ¿qué parte de la tienda se dedica a esos estilos?
  // Así una tienda de un solo estilo (ej. "Boho") que coincide no queda castigada
  // frente a tiendas con 4 estilos genéricos.
  const lookGarments = scoredGarments.slice(0, 3).map((sg) => sg.garment);
  const stylePool = Array.from(
    new Set([...(store.styles || []), ...lookGarments.flatMap((g) => g.styles || [])])
  );
  const { score: coverage, matchingCount: poolMatches } = calculateStyleMatch(q.activeStyles, stylePool);
  const specialty =
    store.styles && store.styles.length > 0 && q.activeStyles.length > 0
      ? calculateStyleMatch(store.styles, q.activeStyles).score
      : 0;
  const lookStyleScore = q.activeStyles.length > 0 ? 0.5 * coverage + 0.5 * specialty : 1;

  // Si ni la tienda ni sus prendas comparten algún estilo con el look, no se recomienda
  if (q.activeStyles.length > 0 && poolMatches === 0) {
    return null;
  }

  // Resonancia Look Completo: 70% estilo del outfit + 30% armonía visual.
  // Se compara un outfit entero contra prendas sueltas, por eso la escala visual es "neutral".
  const { resonance, visualScore, band } = calculateResonanceScore(
    maxPhotoSim,
    lookStyleScore,
    "neutral",
    "look"
  );

  return {
    store,
    bestGarment,
    matchingGarments: matchingGarments.length > 0 ? matchingGarments : [bestGarment],
    resonanceScore: resonance,
    photoSimilarity: visualScore,
    styleMatchScore: Number(lookStyleScore.toFixed(2)),
    matchingStylesCount: Math.max(matchingCount, poolMatches),
    totalSearchedStyles: q.activeStyles.length,
    band,
    searchMode: "look",
  };
}
