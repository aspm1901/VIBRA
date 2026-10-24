import { ResonanceBand } from "@/types";

export type GarmentFamily =
  | "casaca" // casacas, chaquetas, blazers, abrigos, bombers, denim jackets
  | "polo_top" // polos, camisetas, t-shirts, crop tops, bralettes, corsets
  | "blusa" // blusas, camisas
  | "chompa" // chompas, sweaters, cardigans, tejidos de punto
  | "pantalon_jean" // jeans, pantalones, wide leg, palazzo, cargos, joggers
  | "vestido" // vestidos, enterizos, jumpsuits
  | "falda_short" // faldas, shorts, bermudas
  | "conjunto" // conjuntos, sets
  | "otro";

/**
 * Normaliza y extrae la familia real de una prenda analizando su nombre, categoría e indicio de IA
 */
export function extractGarmentFamily(
  name = "",
  category = "",
  familyHint = ""
): GarmentFamily {
  const validFamilies: GarmentFamily[] = [
    "casaca",
    "polo_top",
    "blusa",
    "chompa",
    "pantalon_jean",
    "vestido",
    "falda_short",
    "conjunto",
  ];
  const cleanHint = familyHint.toLowerCase().trim() as GarmentFamily;
  const text = `${name} ${category}`.toLowerCase();

  // 0. Si es explícitamente un Conjunto / Set de 2+ piezas
  if (
    /\b(conjuntos?|dos piezas|2 piezas|tres piezas|3 piezas|twin set|co-ord|set\s+(urbano|deportivo|de\s+dos)|traje\s+sastre|bikini\s+con\s+pareo)\b/.test(
      text
    ) &&
    !/\b(vestidos?|enterizos?|mamelucos?)\b/.test(text)
  ) {
    return "conjunto";
  }

  // 1. Vestidos / Enterizos / Mamelucos / Overoles (antes de tejido/punto para que "vestido tejido" sea vestido)
  if (
    /\b(vestidos?|dress|enterizos?|mamelucos?|jumpsuits?|gala|sirena|cocktail|cóctel|rompers?|overol(es)?|jardineras?|soleras?|maxivestidos?|minivestidos?)\b/.test(
      text
    )
  ) {
    return "vestido";
  }

  // 2. Faldas / Shorts / Skorts / Pareos (antes de pantalón y antes de tejido/punto para que "falda tejida" sea falda_short)
  if (
    /\b(faldas?|minifaldas?|shorts?|bermudas?|skorts?|pareos?)\b/.test(text) &&
    !text.includes("pantalón tipo falda")
  ) {
    return "falda_short";
  }

  // 3. Casacas / Chaquetas / Blazers / Abrigos / Chalecos / Boleros
  if (
    /\b(casacas?|chaquetas?|blazers?|jackets?|abrigos?|bombers?|sobrecamisas?|bikers?|cazadoras?|trench|denim jacket|parkas?|cortavientos?|chamarras?|chalecos?|boleros?|toreras?|sacos?|gabardinas?|kimonos?|puffers?)\b/.test(
      text
    ) &&
    !text.includes("top biker") &&
    !text.includes("short biker")
  ) {
    return "casaca";
  }

  // 4. Chompas / Sweaters / Cardigans / Poleras / Hoodies (sin robar tops/vestidos/faldas tejidos)
  if (
    /\b(chompas?|sueter(es)?|suéter(es)?|sweaters?|cardigans?|cárdigans?|jerseys?|poleras?|hoodies?|sudaderas?|buzos?|canguros?|pullovers?|sweatshirts?)\b/.test(
      text
    ) ||
    (/\b(tejidos?|punto)\b/.test(text) &&
      !/\b(tops?|bikinis?|blusas?|polos?|faldas?|vestidos?|shorts?|pantalon(es)?)\b/.test(text))
  ) {
    return "chompa";
  }

  // 5. Jeans / Pantalones / Leggings
  if (
    /\b(jeans?|pantalón|pantalon(es)?|palazzos?|wide leg|cargos?|joggers?|flare|mom|skinny|baggy|culottes?|leggings?|leggins|licras?|capris?|oxford|slouchy)\b/.test(
      text
    )
  ) {
    return "pantalon_jean";
  }

  // 6. Blusas / Camisas
  if (
    /\b(blusas?|camisas?|blusón|bluson(es)?|camiseros?|camiseras?)\b/.test(text) &&
    !text.includes("corset") &&
    !text.includes("top")
  ) {
    return "blusa";
  }

  // 7. Polos / Tops / Camisetas / Bividis / Bodys / Cafarenas / Bikinis
  if (
    /\b(polos?|tops?|camisetas?|t-shirts?|tshirts?|crops?|bralettes?|corsets?|bustiers?|remeras?|musculosas?|tanks?|bividis?|bvd|bodys?|bodysuits?|cafarenas?|strapless|halter|peplum|bikinis?)\b/.test(
      text
    )
  ) {
    return "polo_top";
  }

  // 8. Respetar la clasificación directa de la IA si ya nos dio una familia válida
  if (validFamilies.includes(cleanHint)) {
    return cleanHint;
  }

  return "otro";
}

/**
 * Calcula la similitud de coseno entre dos vectores numéricos
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;

  const length = vecA.length;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    if (!Number.isFinite(vecA[i]) || !Number.isFinite(vecB[i])) return 0;
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

  return Math.max(0, Math.min(1, similarity));
}

/**
 * Escala Perceptual Calibrada 4.0:
 * Prioridad de Moda:
 * - Una CASACA es una CASACA (sea blanca, azul o negra).
 * - Cuando dos prendas son de la MISMA FAMILIA (ej. casaca blanca vs casaca azul denim),
 *   el tipo de prenda manda: reciben afinidad ALTA/MEDIA (0.72 a 0.85) por compartir corte, cuello y silueta.
 * - Si son de FAMILIAS DISTINTAS (ej. polo blanco vs casaca blanca), el color blanco NO puede
 *   hacer que el polo gane: se topa como máximo en Banda Exploratoria (0.25 a 0.38).
 * - Si la familia es NEUTRAL / DESCONOCIDA: escala según similitud visual sin sesgo restrictivo.
 */
export function scalePerceptualSimilarity(
  rawCosine: number,
  familyRelation: "same" | "different" | "neutral" = "same"
): number {
  const FLOOR = 0.58;

  let score = 0;

  if (familyRelation === "same") {
    // Mismo tipo de prenda (ej. Casaca con Casaca)
    if (rawCosine < FLOOR) {
      score = Math.max(0.20, (rawCosine / FLOOR) * 0.40);
    } else if (rawCosine < 0.65) {
      // Mismo tipo de prenda en colores contrastantes: 0.52 a 0.68
      score = 0.52 + ((rawCosine - FLOOR) / (0.65 - FLOOR)) * 0.16;
    } else if (rawCosine < 0.80) {
      // Misma silueta y estilo: 0.70 a 0.84
      score = 0.70 + ((rawCosine - 0.65) / (0.80 - 0.65)) * 0.14;
    } else if (rawCosine < 0.92) {
      // Alta fidelidad: 0.85 a 0.94
      score = 0.85 + ((rawCosine - 0.80) / (0.92 - 0.80)) * 0.09;
    } else {
      // Prenda casi idéntica: 0.95 a 0.98
      score = 0.95 + ((rawCosine - 0.92) / 0.08) * 0.03;
    }
  } else if (familyRelation === "different") {
    // Familias distintas (ej. Casaca vs Polo o Pantalón)
    // Aunque compartan color (ambos blancos), nunca deben superar 0.38
    if (rawCosine < FLOOR) {
      score = Math.max(0.05, (rawCosine / FLOOR) * 0.15);
    } else if (rawCosine < 0.75) {
      // Coincidencia solo de color o paleta: 0.18 a 0.33
      score = 0.18 + ((rawCosine - FLOOR) / (0.75 - FLOOR)) * 0.15;
    } else {
      // Ruido visual alto de fondo o conjunto mixto: máximo 0.40
      score = 0.33 + ((rawCosine - 0.75) / 0.25) * 0.07;
    }
  } else {
    // Familia neutral / no especificada: escala visual pura sin penalización artificial
    if (rawCosine < FLOOR) {
      score = Math.max(0.15, (rawCosine / FLOOR) * 0.40);
    } else if (rawCosine < 0.75) {
      score = 0.45 + ((rawCosine - FLOOR) / (0.75 - FLOOR)) * 0.25;
    } else {
      score = 0.70 + ((rawCosine - 0.75) / 0.25) * 0.28;
    }
  }

  return Number(Math.min(1.0, Math.max(0, score)).toFixed(2));
}

/**
 * Calcula la coincidencia de estilos (0 a 1)
 */
/**
 * Normaliza una cadena de estilo eliminando tildes y mayúsculas
 */
export function cleanStyleStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Calcula la coincidencia de estilos (0 a 1)
 */
export function calculateStyleMatch(
  searchStyles: string[] = [],
  storeStyles: string[] = []
): { score: number; matchingCount: number; totalSearched: number } {
  if (!searchStyles || searchStyles.length === 0) {
    return { score: 1, matchingCount: 0, totalSearched: 0 };
  }

  const normalizedStoreStyles = storeStyles.map(cleanStyleStr);
  let matchingCount = 0;

  for (const style of searchStyles) {
    if (normalizedStoreStyles.includes(cleanStyleStr(style))) {
      matchingCount++;
    }
  }

  const score = searchStyles.length > 0 ? matchingCount / searchStyles.length : 1;
  return { score, matchingCount, totalSearched: searchStyles.length };
}

/**
 * Arquetipos de moda para desempate semántico de prendas por estilo.
 * Asocia palabras clave y siluetas con las estéticas reales de confección en Gamarra.
 */
const STYLE_ARCHETYPES: Record<
  string,
  {
    primaryKeywords: string[];
    secondaryKeywords: string[];
    negativeKeywords: string[];
  }
> = {
  minimalista: {
    primaryKeywords: ["básico", "basico", "blanco", "minimal", "liso", "clean", "monocromático", "pima"],
    secondaryKeywords: ["beige", "negro", "recto", "algodón", "algodon", "seda"],
    negativeKeywords: ["rayas", "estampado", "brillo", "lentejuelas", "varillas", "flecos", "volantes"],
  },
  casual: {
    primaryKeywords: ["polo", "básico", "basico", "casual", "algodón", "algodon", "pima", "denim"],
    secondaryKeywords: ["jean", "chompa", "tejido", "relaxed", "regular fit"],
    negativeKeywords: ["gala", "sirena", "cóctel", "cocktail", "varillas", "lentejuelas"],
  },
  urbano: {
    primaryKeywords: ["wide leg", "jean", "denim", "casaca", "street", "oversize", "cargo", "biker"],
    secondaryKeywords: ["lavado", "polo", "casual", "celeste", "bomber"],
    negativeKeywords: ["gala", "sirena", "satén champán", "fiesta formal"],
  },
  elegante: {
    primaryKeywords: ["blazer", "sastre", "satén", "saten", "palazzo", "cóctel", "cocktail", "vestido midi"],
    secondaryKeywords: ["botones dorados", "marfil", "seda", "champán", "champan", "formal"],
    negativeKeywords: ["oversize", "rayas marinero", "deportivo", "playa"],
  },
  fiesta: {
    primaryKeywords: ["vestido", "fiesta", "noche", "gala", "sirena", "corset", "bustier", "lentejuelas"],
    secondaryKeywords: ["satén", "saten", "escote", "dorado", "rojo escarlata", "burdeos"],
    negativeKeywords: ["polo básico", "jean urbano", "chompa", "deportivo"],
  },
  oficina: {
    primaryKeywords: ["blazer", "blusa", "camisa", "sastre", "formal", "palazzo", "pantalón", "pantalon"],
    secondaryKeywords: ["botones", "manga larga", "cuello", "marfil", "beige"],
    negativeKeywords: ["tirantes", "mini", "corset", "playa", "crop top"],
  },
  romantico: {
    primaryKeywords: ["corset", "bustier", "encaje", "volantes", "caída", "flores", "rosa", "seda"],
    secondaryKeywords: ["satén", "escote corazón", "suave", "delicado"],
    negativeKeywords: ["oversize", "cargo", "deportivo", "heavy"],
  },
  y2k: {
    primaryKeywords: ["corset", "bustier", "crop top", "tiro bajo", "tirantes", "varillas", "denim fit"],
    secondaryKeywords: ["rojo", "metálico", "ajustado", "mini"],
    negativeKeywords: ["sastre formal", "oficina", "chompa abuela"],
  },
  vintage: {
    primaryKeywords: ["vintage", "retro", "denim", "cuadros", "pana", "lavado", "clásico", "clasico", "rayas marinero"],
    secondaryKeywords: ["cuero", "biker", "marrón", "mostaza", "oversize"],
    negativeKeywords: ["futurista", "neón", "dry fit", "minimal clean"],
  },
  playa: {
    primaryKeywords: ["playa", "lino", "verano", "crop top", "falda", "short", "tirantes", "floral", "fluido"],
    secondaryKeywords: ["blanco", "beige", "algodón", "algodon"],
    negativeKeywords: ["abrigado", "chompa gruesa", "cuello alto", "blazer formal", "sastre"],
  },
  deportivo: {
    primaryKeywords: ["biker", "legging", "top deportivo", "jogger", "buzo", "lycra", "dry fit"],
    secondaryKeywords: ["polo", "casual", "algodón"],
    negativeKeywords: ["satén", "vestido", "blazer", "sastre"],
  },
  boho: {
    primaryKeywords: ["tejido", "chompa", "punto grueso", "flecos", "crochet", "estampado", "fluido"],
    secondaryKeywords: ["mostaza", "tierra", "ocre", "lana"],
    negativeKeywords: ["sastre rígido", "blazer formal"],
  },
};

/**
 * Calcula la afinidad semántica y pureza estilística de una prenda específica respecto a estilos buscados.
 * Permite desempatar inteligentemente entre varias prendas que tengan la misma etiqueta de estilo.
 */
export function calculateGarmentStyleAffinity(
  garment: { name: string; category?: string; styles?: string[] },
  searchStyles: string[]
): number {
  if (!searchStyles || searchStyles.length === 0) return 1.0;

  const garmentStyles = (garment.styles || []).map(cleanStyleStr);
  const garmentText = `${garment.name} ${garment.category || ""}`.toLowerCase();

  let tagMatches = 0;
  let primaryStyleBonus = 0;
  let archetypeBonus = 0;

  for (const style of searchStyles) {
    const normStyle = cleanStyleStr(style);

    // 1. Coincidencia de etiqueta
    const styleIdx = garmentStyles.indexOf(normStyle);
    if (styleIdx !== -1) {
      tagMatches++;
      // Bonificación si este estilo es el principal (#1) de la prenda
      if (styleIdx === 0) {
        primaryStyleBonus += 0.20;
      } else {
        primaryStyleBonus += 0.08;
      }
    }

    // 2. Semántica de Arquetipo de Moda
    const archetype = STYLE_ARCHETYPES[normStyle];
    if (archetype) {
      let primaryMatches = 0;
      for (const kw of archetype.primaryKeywords) {
        if (garmentText.includes(kw)) {
          primaryMatches++;
          archetypeBonus += 0.12;
          if (primaryMatches >= 3) break;
        }
      }
      for (const kw of archetype.secondaryKeywords) {
        if (garmentText.includes(kw)) {
          archetypeBonus += 0.05;
          break;
        }
      }
      for (const kw of archetype.negativeKeywords) {
        if (garmentText.includes(kw)) {
          archetypeBonus -= 0.20;
          break;
        }
      }
    }
  }

  const baseScore = tagMatches / searchStyles.length;
  // Si no tiene ninguna etiqueta y no hay coincidencia semántica, puntuación baja
  if (tagMatches === 0 && archetypeBonus <= 0) return 0.05;

  const totalAffinity = Math.max(0, baseScore + primaryStyleBonus + archetypeBonus);
  return Number(totalAffinity.toFixed(3));
}

/**
 * Tope de resonancia en todos los modos: la afinidad es una recomendación, nunca un 100 %.
 */
export const MAX_RESONANCE = 0.99;

/**
 * Redondeo a 2 decimales "mitad hacia arriba" que no sufre errores de coma flotante
 * (ej. 0.695 -> 0.70, mientras que (0.695).toFixed(2) da "0.69").
 * Las bandas se asignan SIEMPRE sobre el valor ya redondeado.
 */
export function roundScore(x: number): number {
  return Math.round(x * 100 + 1e-6) / 100;
}

/**
 * Algoritmo de Resonancia Inteligente 4.0:
 * - Modo "prenda": La silueta del tipo de prenda manda (visualScore) + bonus de estilo (+0.06 max).
 * - Modo "look": La coherencia estética del outfit completo manda (70% estilo) + 30% armonía visual (paleta, corte).
 * - Modo "estilo": 100% afinidad de estilo de la tienda contra los estilos solicitados.
 */
export function calculateResonanceScore(
  rawCosine: number,
  styleScore: number,
  familyRelation: "same" | "different" | "neutral" | boolean = "same",
  mode: "prenda" | "look" | "estilo" = "prenda"
): { resonance: number; visualScore: number; band: ResonanceBand } {
  const normRelation: "same" | "different" | "neutral" =
    typeof familyRelation === "boolean"
      ? familyRelation
        ? "same"
        : "different"
      : familyRelation;

  const visualScore =
    mode === "estilo" ? 0 : scalePerceptualSimilarity(rawCosine, normRelation);

  let resonance = visualScore;

  if (mode === "estilo") {
    resonance = styleScore;
  } else if (mode === "look") {
    // Para outfit completo: 70% estilo del outfit + 30% armonía visual
    resonance = 0.70 * styleScore + 0.30 * visualScore;
  } else {
    // Modo prenda: visualScore manda + bonus de estilo (+0.06 max)
    const styleBonus = styleScore * 0.06;
    resonance = visualScore + styleBonus;
  }

  resonance = roundScore(Math.min(MAX_RESONANCE, resonance));
  const band = determineBand(resonance);

  return { resonance, visualScore, band };
}

export function determineBand(score: number): ResonanceBand {
  const s = roundScore(score);
  if (s >= 0.70) return "Alta";
  if (s >= 0.45) return "Media";
  if (s >= 0.25) return "Exploratoria";
  return "Baja";
}

/**
 * Verifica si una tienda ofrece una familia de prendas determinada.
 * Comprueba tanto las fotos del catálogo como las categorías declaradas por la tienda.
 */
export function doesStoreSellFamily(
  store: { categories?: string[]; garments?: { name: string; category?: string }[] },
  family: GarmentFamily
): boolean {
  if (family === "otro") return true;

  // 1. ¿Tiene alguna prenda en catálogo que pertenezca a esta familia?
  const hasGarment = (store.garments || []).some((g: any) => {
    const fam = g.garmentFamily || extractGarmentFamily(g.name, g.category);
    return fam === family;
  });
  if (hasGarment) return true;

  // 2. ¿Declara en sus categorías o en las piezas de sus conjuntos que confecciona/vende esta familia?
  const garmentsText = (store.garments || [])
    .map((g) => `${g.name || ""} ${g.category || ""}`)
    .join(" ")
    .toLowerCase();
  const categoriesText = `${(store.categories || []).join(" ").toLowerCase()} ${garmentsText}`;

  switch (family) {
    case "vestido":
      return /\b(vestidos?|gala|enterizos?|mamelucos?|jumpsuits?|cocktail|coctel|cóctel)\b/.test(categoriesText);
    case "casaca":
      return /\b(casacas?|chaquetas?|blazers?|abrigos?|cazadoras?|bombers?|chalecos?|sacos?)\b/.test(categoriesText);
    case "pantalon_jean":
      return /\b(jeans?|pantalón|pantalon(es)?|palazzos?|denim|cargos?|joggers?|leggings?|leggins)\b/.test(categoriesText);
    case "chompa":
      return /\b(chompas?|sueter(es)?|suéter(es)?|sweaters?|cardigans?|cárdigans?|poleras?|hoodies?)\b/.test(categoriesText);
    case "blusa":
      return /\b(blusas?|camisas?|blusones?)\b/.test(categoriesText);
    case "polo_top":
      return /\b(polos?|tops?|camisetas?|corsets?|bustiers?|bodys?|bikinis?)\b/.test(categoriesText);
    case "falda_short":
      return /\b(faldas?|minifaldas?|shorts?|bermudas?|pareos?|skorts?)\b/.test(categoriesText);
    case "conjunto":
      return /\b(conjuntos?|sets?|trajes?)\b/.test(categoriesText);
    default:
      return true;
  }
}


