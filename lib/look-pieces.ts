import type { GarmentFamily } from "@/lib/ranking";

export interface LookPiece {
  name: string;
  garmentFamily: GarmentFamily;
  primaryColor: string;
  /** [ymin, xmin, ymax, xmax], coordenadas normalizadas entre 0 y 1000. */
  box: [number, number, number, number];
}

export interface LookPieceQuery extends LookPiece {
  queryVector: number[];
}

export const LOOK_CLOTHING_FAMILIES = [
  "casaca", "polo_top", "blusa", "chompa", "pantalon_jean", "vestido", "falda_short",
] as const;

const accessoryName = /^(bols[oa]s?|carteras?|zapatos?|sandalias?|botas?|tacones?|joyas?|collares?|aretes?|pulseras?|reloj(?:es)?|cinturones?|sombreros?|gorras?|lentes|accesorios?|bags?|shoes?|jewel\w*)\b/i;

/** Una prenda detectada con caja inválida debe provocar reintento, no desaparecer del total. */
export function hasIncompleteLookPieces(value: unknown): boolean {
  if (!Array.isArray(value)) return true;
  return value.some(item => {
    if (item && typeof item.name === "string" && accessoryName.test(item.name.trim())) return false;
    return sanitizeLookPieces([item]).length === 0;
  });
}

export function sanitizeLookPieces(value: unknown): LookPiece[] {
  if (!Array.isArray(value)) return [];
  const pieces: LookPiece[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const family = item.garmentFamily;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 100) : "";
    if (!name || !LOOK_CLOTHING_FAMILIES.includes(family)) continue;
    if (accessoryName.test(name)) continue;
    if (!Array.isArray(item.box) || item.box.length !== 4 ||
      !item.box.every((n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1000)) continue;
    const box = item.box.map(Math.round) as LookPiece["box"];
    if (box[2] - box[0] < 20 || box[3] - box[1] < 20) continue;
    // Una caja repetida no debe contar como otra prenda del atuendo.
    const duplicate = pieces.some(p => {
      if (p.garmentFamily !== family) return false;
      const intersection = Math.max(0, Math.min(p.box[2], box[2]) - Math.max(p.box[0], box[0])) *
        Math.max(0, Math.min(p.box[3], box[3]) - Math.max(p.box[1], box[1]));
      const areaA = (p.box[2] - p.box[0]) * (p.box[3] - p.box[1]);
      const areaB = (box[2] - box[0]) * (box[3] - box[1]);
      return intersection / (areaA + areaB - intersection) >= 0.8;
    });
    if (duplicate) continue;
    pieces.push({ name, garmentFamily: family, primaryColor: typeof item.primaryColor === "string" ? item.primaryColor.slice(0, 60) : "", box });
    if (pieces.length === 3) break;
  }
  return pieces;
}
