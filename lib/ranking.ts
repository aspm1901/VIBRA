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
  const text = `${name} ${category} ${familyHint}`.toLowerCase();

  // 1. Casacas / Chaquetas / Blazers / Abrigos
  if (
    /\b(casaca|chaqueta|blazer|jacket|abrigo|bomber|sobrecamisa|biker|cazadora|trench|denim jacket|parka|cortaviento|chamarra)\b/.test(
      text
    ) ||
    text.includes("casaca") ||
    text.includes("chaqueta") ||
    text.includes("blazer")
  ) {
    return "casaca";
  }

  // 2. Chompas / Tejidos / Sweaters / Poleras / Hoodies
  if (
    /\b(chompa|sueter|suéter|sweater|cardigan|cárdigan|tejido|punto grueso|jersey|polera|hoodie|sudadera|buzo)\b/.test(
      text
    )
  ) {
    return "chompa";
  }

  // 3. Vestidos / Enterizos
  if (/\b(vestido|dress|enterizo|jumpsuit|gala|sirena|cocktail|cóctel|romper)\b/.test(text)) {
    return "vestido";
  }

  // 4. Jeans / Pantalones
  if (
    /\b(jean|jeans|pantalón|pantalon|palazzo|wide leg|cargo|jogger|flare|mom|skinny|baggy|culotte)\b/.test(text) &&
    !text.includes("blazer") &&
    !text.includes("casaca") &&
    !text.includes("chaqueta")
  ) {
    return "pantalon_jean";
  }

  // 5. Faldas / Shorts
  if (/\b(falda|minifalda|short|shorts|bermuda)\b/.test(text)) {
    return "falda_short";
  }

  // 6. Blusas / Camisas
  if (
    /\b(blusa|camisa|blusón|bluson|camisero)\b/.test(text) &&
    !text.includes("corset") &&
    !text.includes("top")
  ) {
    return "blusa";
  }

  // 7. Polos / Tops / Camisetas
  if (
    /\b(polo|top|camiseta|t-shirt|tshirt|crop top|bralette|corset|bustier|remera|musculosa|tank top)\b/.test(
      text
    )
  ) {
    return "polo_top";
  }

  // 8. Conjuntos
  if (/\b(conjunto|set|dos piezas|traje)\b/.test(text)) {
    return "conjunto";
  }

  return "otro";
}

/**
 * Calcula la similitud de coseno entre dos vectores numéricos
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
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
    resonance = Math.min(1.0, visualScore + styleBonus);
  }

  resonance = Number(resonance.toFixed(2));

  let band: ResonanceBand = "Baja";
  if (resonance >= 0.70) band = "Alta";
  else if (resonance >= 0.45) band = "Media";
  else if (resonance >= 0.25) band = "Exploratoria";

  return { resonance, visualScore, band };
}

export function determineBand(score: number): ResonanceBand {
  if (score >= 0.70) return "Alta";
  if (score >= 0.45) return "Media";
  if (score >= 0.25) return "Exploratoria";
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

  // 2. ¿Declara en sus categorías que confecciona/vende esta familia?
  const categoriesText = (store.categories || []).join(" ").toLowerCase();

  switch (family) {
    case "vestido":
      return /\b(vestido|vestidos|gala|enterizo|enterizos|jumpsuit|cocktail|coctel)\b/.test(categoriesText);
    case "casaca":
      return /\b(casaca|casacas|chaqueta|chaquetas|blazer|blazers|abrigo|abrigos|cazadora|bomber)\b/.test(categoriesText);
    case "pantalon_jean":
      return /\b(jean|jeans|pantalon|pantalones|palazzo|denim|cargos|joggers)\b/.test(categoriesText);
    case "chompa":
      return /\b(chompa|chompas|sueter|sweater|tejido|tejidos|cardigan)\b/.test(categoriesText);
    case "blusa":
      return /\b(blusa|blusas|camisa|camisas)\b/.test(categoriesText);
    case "polo_top":
      return /\b(polo|polos|top|tops|camiseta|camisetas|corset|bustier)\b/.test(categoriesText);
    case "falda_short":
      return /\b(falda|faldas|short|shorts|bermuda)\b/.test(categoriesText);
    case "conjunto":
      return /\b(conjunto|conjuntos|set|sets|traje)\b/.test(categoriesText);
    default:
      return true;
  }
}


