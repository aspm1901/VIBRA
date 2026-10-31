import type { SearchResultItem, Store, StoreGarment } from "@/types";
import type { LookPieceQuery } from "@/lib/look-pieces";
import { calculateStyleMatch, cosineSimilarity, determineBand, roundScore, scalePerceptualSimilarity } from "@/lib/ranking";
import { getFamilyRelation, hasColorAffinity } from "@/lib/search-scoring";
import { isCompatibleLookPiece, isCompositeLookPhoto } from "@/lib/look-compatibility";

interface Match { garment: StoreGarment; visual: number; color: number; selection: number; composite: boolean }

export function scoreLookPiecesStore(
  store: Store,
  query: { pieces: LookPieceQuery[]; activeStyles: string[] }
): SearchResultItem | null {
  const { pieces, activeStyles } = query;
  if (!pieces.length || pieces.length > 3 || !pieces.every(p => p.queryVector?.length && p.queryVector.every(Number.isFinite) && p.queryVector.some(n => n !== 0))) return null;
  const candidates = pieces.map(piece => store.garments.flatMap(garment => {
    if (garment.embedding?.length !== piece.queryVector.length) return [];
    const relation = getFamilyRelation(piece.garmentFamily, garment);
    const isTopBlusaCross =
      relation === "neutral" &&
      ((piece.garmentFamily === "polo_top" && garment.garmentFamily === "blusa") ||
        (piece.garmentFamily === "blusa" && garment.garmentFamily === "polo_top"));
    if (relation !== "same" && !isTopBlusaCross) return [];
    if (!isCompatibleLookPiece(piece, garment, pieces)) return [];
    const cosine = cosineSimilarity(piece.queryVector, garment.embedding!);
    if (cosine <= 0) return [];
    const visual = scalePerceptualSimilarity(cosine, "neutral");
    const composite = isCompositeLookPhoto(garment);
    // Una foto de conjunto debe superar el umbral mínimo incluso después de descontar el ruido de otras piezas.
    const effectiveVisual = roundScore(visual - (composite ? 0.06 : 0) - (isTopBlusaCross ? 0.02 : 0));
    if (effectiveVisual < 0.5) return [];
    const color = hasColorAffinity(piece.primaryColor, garment) ? 1 : 0;
    return [{ garment, visual, color, selection: effectiveVisual + color * 0.03, composite }];
  }).sort((a, b) => b.selection - a.selection).slice(0, 4));

  // Hasta 5³ combinaciones. Una misma foto no completa dos piezas diferentes,
  // ni se mezcla una foto de conjunto con otra prenda suelta para evitar duplicar piezas en la tarjeta.
  let best: (Match | null)[] = [];
  let bestUtility = -1;
  const visit = (index: number, selected: (Match | null)[], used: Set<string>) => {
    if (index === pieces.length) {
      const present = selected.filter((m): m is Match => !!m);
      if (present.length > 1 && present.some(m => m.composite)) return;
      const utility = 2 * present.length + present.reduce((sum, m) => sum + m.selection, 0) / Math.max(1, present.length);
      if (utility > bestUtility) { bestUtility = utility; best = [...selected]; }
      return;
    }
    for (const candidate of candidates[index]) {
      if (used.has(candidate.garment.id)) continue;
      used.add(candidate.garment.id);
      visit(index + 1, [...selected, candidate], used);
      used.delete(candidate.garment.id);
    }
    visit(index + 1, [...selected, null], used);
  };
  visit(0, [], new Set());
  const matches = best.filter((m): m is Match => !!m);
  if (!matches.length) return null;
  const pool = Array.from(new Set([...(store.styles || []), ...matches.flatMap(m => m.garment.styles || [])]));
  const styles = calculateStyleMatch(activeStyles, pool);
  if (activeStyles.length > 0 && styles.matchingCount === 0) return null;

  const coverage = matches.length / pieces.length;
  const meanVisual = matches.reduce((sum, m) => sum + m.visual, 0) / matches.length;
  const minVisual = Math.min(...matches.map(m => m.visual));
  // Una pieza muy parecida no debe ocultar otra débil dentro de un look completo.
  const visual = 0.75 * meanVisual + 0.25 * minVisual;
  // Si la combinación completa mantiene la paleta de colores del look (incluso invertida entre piezas), suma afinidad parcial.
  const color = matches.reduce((sum, m) => {
    if (m.color > 0) return sum + m.color;
    if (matches.length > 1 && pieces.some(p => hasColorAffinity(p.primaryColor, m.garment))) return sum + 0.6;
    return sum;
  }, 0) / matches.length;
  // Bono de sinergia cuando la tienda completa todas las piezas con buen parecido promedio.
  const completeBonus = coverage === 1 && pieces.length > 1 && meanVisual >= 0.59 ? 0.03 : 0;
  const rawScore = (0.8 * visual + 0.15 * styles.score + 0.05 * color) * (0.76 + 0.24 * coverage) + completeBonus;
  const resonanceScore = roundScore(Math.min(coverage < 1 ? 0.69 : 0.99, rawScore));
  return {
    store, bestGarment: matches[0].garment, matchingGarments: matches.map(m => m.garment),
    resonanceScore, photoSimilarity: roundScore(visual), styleMatchScore: roundScore(styles.score),
    matchingStylesCount: styles.matchingCount, totalSearchedStyles: activeStyles.length,
    band: determineBand(resonanceScore), searchMode: "look",
    lookMatch: {
      matchedPieces: matches.length, totalPieces: pieces.length,
      matchedNames: pieces.filter((_, i) => !!best[i]).map(p => p.name),
      missingPieces: pieces.filter((_, i) => !best[i]).map(p => p.name),
    },
  };
}
