import type { StoreGarment } from "@/types";
import type { LookPiece } from "@/lib/look-pieces";
import { extractGarmentFamily } from "@/lib/ranking";
import { garmentContainsFamily } from "@/lib/search-scoring";

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const skirt = /\b(minifaldas?|faldas?|skirts?)\b/;
const shorts = /\b(shorts?|bermudas?|skorts?)\b/;
const skort = /\b(pantalon\s+tipo\s+falda|falda[\s-]+pantalon|skorts?)\b/;
const corset = /\b(corsets?|corse|bustiers?)\b/;
const nonCorsetTop = /\b(polos?|camisetas?|t-shirts?|cuello\s+alto|halter|un\s+solo\s+hombro|asimetric[oa]s?|mangas?\s+largas?|mangas?\s+cortas?|mangas?\s+acampanadas?|off[\s-]+(?:the[\s-]+)?shoulder|hombros?\s+descubiertos?|suelt[oa]s?|holgad[oa]s?|oversize|musculosas?|bividis?|camisas?|camiser[oa]s?)\b/;
const basicNonCorsetOffered = /\b(polos?|camisetas?|t-shirts?|cuello\s+alto|mangas?\s+largas?|mangas?\s+cortas?|musculosas?|bividis?|camisas?|camiser[oa]s?|basico|basica)\b/;
const swim = /\b(bikinis?|trikinis?|banadores?|ropa de bano|trajes? de bano)\b/;
const jumpsuit = /\b(enterizos?|mamelucos?|jumpsuits?|monos?)\b/;
const sport = /\b(deportiv[oa]s?|gym|fitness|running|entrenamiento|dry\s*fit|lycra)\b/;
const vest = /\b(chalecos?)\b/;
const bolero = /\b(boleros?|toreras?)\b/;
const sleevedOuterwear = /\b(blazers?|casacas?|chaquetas?|abrigos?|bombers?|gabardinas?|parkas?|sacos?|cardigans?)\b/;
const longSleeveShirt = /\b(camisas?|camiser[oa]s?|mangas?\s+largas?)\b/;
const shortSleeveTop = /\b(mangas?\s+cortas?|mangas?\s+abullonadas?|mangas?\s+acampanadas?|con\s+mangas|raglan|polos?|camisetas?|t-shirts?)\b/;
const sleevelessTop = /\b(strapless|tirantes|tiras|sin\s+mangas|halter|un\s+solo\s+hombro|un\s+hombro|bandeau|musculosas?|tank|bividis?|cadenas|pedreria|panuelo)\b/;

/**
 * Rasgos visuales de mangas verificados en las 28 prendas superiores del catálogo
 * cuyo nombre/categoría original no especificaba el tipo de manga.
 */
export const CATALOG_SUBTYPE_HINTS: Record<string, string> = {
  "g-pixie-1792689171365-1": "manga corta",
  "g-pixie-1792689345258-1": "manga corta polo",
  "g-pixie-1792689398869-1": "manga corta polo",
  "g-pixie-1792689436929-1": "manga corta polo",
  "g-pixie-1792689468312-1": "manga corta polo",
  "g-milano-14-1792604934491-1": "manga corta",
  "g-vanana-1792451744266-1": "manga corta",
  "g-vanana-1792451768225-1": "manga corta",
  "g-milano-14-1792604986092-1": "manga larga",
  "g-zahid-zaroa-1792600878239-1": "manga larga camisa",
  "g-zahid-zaroa-1792600888878-1": "manga larga camisa",
  "g-zahid-zaroa-1792600896119-1": "manga larga camisa",
  "g-abril-87-1792600325773-1": "manga larga",
  "g-banaty-1792452301251-1": "manga larga camisera",
  "g-banaty-1792452307297-1": "manga larga camisera",
  "g-joly-1792449304594-1": "manga larga",
  "g-hibabe-1": "manga larga camisera",
  "g-pepuno-408-9942-1792445959315-1": "manga larga camisa",
  "g-i-am-poser-1792687961254-1": "sin mangas",
  "g-abril-87-1": "sin mangas",
  "g-abril-87-1792600437150-1": "sin mangas",
  "g-bruzh-fit-1": "tirantes sin mangas",
  "g-bruzh-fit-1792600080391-1": "sin mangas",
  "g-mirana-fit-1792599812873-1": "tirantes sin mangas",
  "g-ms-ashira-1792476600503-1": "tirantes sin mangas",
  "g-allisson-sofia-1792450113502-1": "tirantes sin mangas",
  "g-allisson-sofia-1792450149890-1": "halter sin mangas",
  "g-joly-1792449238202-1": "tirantes sin mangas",
};

export function describeOfferedGarment(garment: StoreGarment): string {
  const hint = CATALOG_SUBTYPE_HINTS[garment.id] || "";
  return normalize(`${garment.name}; ${garment.category || ""}; ${hint}`);
}

export function topSleeveKind(text: string): "sleeveless" | "short" | "long" | undefined {
  const norm = normalize(text);
  const isSleeveless = sleevelessTop.test(norm);
  const isShort = shortSleeveTop.test(norm);
  const isLong = longSleeveShirt.test(norm);
  if (isSleeveless && !isShort && !isLong) return "sleeveless";
  if (isLong && !isSleeveless) return "long";
  if (isShort && !isSleeveless && !isLong) return "short";
  return undefined;
}

export function isCompositeLookPhoto(garment: StoreGarment): boolean {
  return extractGarmentFamily(garment.name, garment.category, garment.garmentFamily) === "conjunto";
}

function skirtLength(text: string): "short" | "long" | undefined {
  // Leer el largo en todas las menciones de la falda (nombre y categoría), sin confundirse con mangas o top.
  const fragment = text.match(/\b(?:minifaldas?|faldas?|skirts?)\b[^+;,]{0,65}/g)?.join(" ") || "";
  if (/\b(minifaldas?|mini|cortas?|short|pareos?|con\s+capas|con\s+flecos|asimetric[oa]s?\s+de\s+encaje)\b/.test(fragment)) return "short";
  if (/\b(midi|maxi|largas?|long)\b/.test(fragment)) return "long";
}

/** Restricciones por subtipos incompatibles explícitos sin depender de nombres idénticos. */
export function isCompatibleLookPiece(
  piece: LookPiece,
  garment: StoreGarment,
  allPieces?: LookPiece[]
): boolean {
  const wanted = normalize(piece.name);
  const offered = describeOfferedGarment(garment);
  if (sport.test(wanted) !== sport.test(offered)) return false;
  if (piece.garmentFamily === "falda_short") {
    if (skirt.test(wanted) && shorts.test(offered) && !skirt.test(offered)) return false;
    if (shorts.test(wanted) && skirt.test(offered) && !shorts.test(offered)) return false;
    const wantedLength = skirtLength(wanted);
    const offeredLength = skirtLength(offered);
    if (wantedLength && offeredLength && wantedLength !== offeredLength) return false;
  }
  if (piece.garmentFamily === "pantalon_jean") {
    if (!skort.test(wanted) && skort.test(offered)) return false;
  }
  if (piece.garmentFamily === "casaca") {
    if (sleevedOuterwear.test(wanted) && (vest.test(offered) || bolero.test(offered)) && !sleevedOuterwear.test(offered)) return false;
    if (vest.test(wanted) && (sleevedOuterwear.test(offered) || bolero.test(offered)) && !vest.test(offered)) return false;
    if (bolero.test(wanted) !== bolero.test(offered)) return false;
  }
  if (piece.garmentFamily === "polo_top" || piece.garmentFamily === "blusa") {
    if (swim.test(wanted) !== swim.test(offered)) return false;
    if (corset.test(offered) && !corset.test(wanted) && nonCorsetTop.test(wanted)) return false;
    if (corset.test(wanted) && !corset.test(offered) && basicNonCorsetOffered.test(offered)) return false;
    const wantedSleeve = topSleeveKind(wanted);
    const offeredSleeve = topSleeveKind(offered);
    if (wantedSleeve && offeredSleeve && wantedSleeve !== offeredSleeve) return false;
  }
  if (piece.garmentFamily === "vestido" && jumpsuit.test(wanted) !== jumpsuit.test(offered)) return false;

  // Si es un conjunto compuesto en un look de varias piezas, no debe incluir una prenda inferior ajena al look.
  if (allPieces && allPieces.length > 1 && isCompositeLookPhoto(garment)) {
    const wantedFamilies = new Set(allPieces.map((p) => p.garmentFamily));
    if (!wantedFamilies.has("pantalon_jean") && garmentContainsFamily(garment, "pantalon_jean")) return false;
    if (!wantedFamilies.has("falda_short") && garmentContainsFamily(garment, "falda_short")) return false;
  }
  return true;
}
