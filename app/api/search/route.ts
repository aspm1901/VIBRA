import { NextRequest, NextResponse } from "next/server";
import { getAllStores } from "@/lib/stores-db";
import {
  cosineSimilarity,
  calculateStyleMatch,
  calculateGarmentStyleAffinity,
  calculateResonanceScore,
  determineBand,
  extractGarmentFamily,
  doesStoreSellFamily,
} from "@/lib/ranking";
import { generateImageEmbedding, detectGarmentStyles } from "@/lib/ai/gemini";
import { SearchFilters, SearchResultItem, StoreGarment } from "@/types";

export const maxDuration = 60; // 60s timeout for AI calls

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, exampleId, filters = {} } = body as {
      image?: string;
      exampleId?: string;
      filters?: SearchFilters;
    };

    let queryVector: number[] | null = null;
    let detectedInfo: {
      category: string;
      garmentFamily?: string;
      styles: string[];
      garmentTitle: string;
      primaryColor: string;
      description: string;
    } = {
      category: filters.category || "Prenda de referencia",
      garmentFamily: "otro",
      styles: filters.styles || ["Casual", "Urbano"],
      garmentTitle: "Prenda de referencia",
      primaryColor: "",
      description: "",
    };

    const isManualFilterRefinement = body.isManualFilterRefinement === true;
    const searchMode: "prenda" | "look" | "estilo" =
      filters.searchMode || (image || exampleId ? "prenda" : "estilo");

    // 1. Obtener vector y análisis de estilos
    const stores = await getAllStores();
    const allGarments = stores.flatMap((s) => s.garments);

    if (searchMode === "estilo") {
      // Búsqueda 100% por estilo (sin requerir imagen)
      const requestedStyles =
        filters.styles && filters.styles.length > 0
          ? filters.styles
          : ["Casual", "Urbano"];

      detectedInfo = {
        category: "Búsqueda por estilo",
        styles: requestedStyles,
        garmentTitle: `Estilo: ${requestedStyles.join(", ")}`,
        primaryColor: "",
        description: "Filtrado directo por estética y especialidad de tiendas en Gamarra",
      };
    } else if (image) {
      // Subida de imagen real por la usuaria (Prenda individual o Look completo)
      const [embedding, analysis] = await Promise.all([
        generateImageEmbedding(image),
        detectGarmentStyles(
          image,
          "image/jpeg",
          searchMode === "look" ? "look" : "prenda"
        ),
      ]);

      queryVector = embedding;

      // Si la IA de visión no respondió, inferimos tipo de prenda y estilos
      // a partir de las fotos del catálogo más parecidas (el embedding sí funcionó).
      if (analysis.isFallback && queryVector && queryVector.length > 0) {
        const neighbors = allGarments
          .filter((g) => g.embedding && g.embedding.length === queryVector!.length)
          .map((g) => ({ g, sim: cosineSimilarity(queryVector!, g.embedding!) }))
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 3);

        if (neighbors.length > 0) {
          const votes: Record<string, number> = {};
          for (const n of neighbors) {
            const fam = extractGarmentFamily(n.g.name, n.g.category, n.g.garmentFamily);
            votes[fam] = (votes[fam] || 0) + n.sim;
          }
          const inferredFamily = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
          const nearest = neighbors[0].g;
          const inferredStyles = Array.from(
            new Set(neighbors.flatMap((n) => n.g.styles || []))
          ).slice(0, 3);

          if (searchMode !== "look") {
            analysis.garmentFamily = inferredFamily;
            analysis.category = nearest.category || analysis.category;
            analysis.garmentTitle = nearest.name || nearest.category || "Prenda identificada";
          }
          if (inferredStyles.length > 0) analysis.styles = inferredStyles;
        }
      }

      detectedInfo = {
        category:
          isManualFilterRefinement && filters.category
            ? filters.category
            : analysis.category,
        garmentFamily: analysis.garmentFamily || "otro",
        styles:
          isManualFilterRefinement && filters.styles && filters.styles.length > 0
            ? filters.styles
            : analysis.styles,
        garmentTitle: analysis.garmentTitle,
        primaryColor: analysis.primaryColor || "",
        description: analysis.description || "",
      };
    } else if (exampleId) {
      // Caso de ejemplo rápido predeterminado
      let targetGarment = null;

      if (exampleId === "look_sastre") {
        detectedInfo = {
          category: "Look completo / Outfit",
          styles: ["Elegante", "Oficina", "Minimalista"],
          garmentTitle: "Look sastre chic: Blazer marfil y palazzo",
          primaryColor: "Marfil / Beige",
          description: "Outfit contemporáneo con blazer fluido, top de seda y pantalón sastre",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-noche-3") ||
          allGarments.find((g) => g.name.toLowerCase().includes("blazer"));
      } else if (exampleId === "casaca_denim" || exampleId === "casaca_jean") {
        detectedInfo = {
          category: "Casacas y abrigos",
          styles: ["Urbano", "Casual"],
          garmentTitle: "Casaca de jean azul clásica",
          primaryColor: "Azul denim",
          description: "Casaca denim regular fit corte clásico",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-saten-5") ||
          allGarments.find((g) => g.name.toLowerCase().includes("casaca"));
      } else if (exampleId === "vestido_burdeos") {
        detectedInfo = {
          category: "Vestidos",
          styles: ["Fiesta", "Elegante"],
          garmentTitle: "Vestido burdeos de fiesta",
          primaryColor: "Burdeos / Tinto",
          description: "Vestido de tirantes entallado con caída elegante",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-aurora-1") ||
          allGarments.find((g) => g.name.toLowerCase().includes("burdeos"));
      } else if (exampleId === "jean_celeste") {
        detectedInfo = {
          category: "Jeans y pantalones",
          styles: ["Urbano", "Casual"],
          garmentTitle: "Jean celeste urbano",
          primaryColor: "Celeste claro",
          description: "Jean wide leg tiro medio con acabado lavado",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-saten-2") ||
          allGarments.find((g) => g.name.toLowerCase().includes("jean"));
      } else if (exampleId === "blusa_beige") {
        detectedInfo = {
          category: "Blusas",
          styles: ["Minimalista", "Oficina"],
          garmentTitle: "Blusa beige minimal",
          primaryColor: "Beige arena",
          description: "Blusa satinada de corte limpio y botones frontales",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-saten-1") ||
          allGarments.find((g) => g.name.toLowerCase().includes("blusa"));
      } else if (exampleId === "chompa_amarilla") {
        detectedInfo = {
          category: "Chompas",
          styles: ["Casual", "Minimalista"],
          garmentTitle: "Chompa mostaza tejida",
          primaryColor: "Mostaza / Ocre",
          description: "Chompa de cuello alto con punto grueso acanalado",
        };
        targetGarment =
          allGarments.find((g) => g.id === "g-noche-2") ||
          allGarments.find((g) => g.name.toLowerCase().includes("chompa"));
      }

      if (targetGarment && targetGarment.embedding) {
        queryVector = targetGarment.embedding;
      }
    }

    let isApproximateSearch = false;
    if (searchMode !== "estilo" && (!queryVector || queryVector.length === 0)) {
      if (detectedInfo.category && detectedInfo.category !== "Prenda de referencia") {
        isApproximateSearch = true;
      } else {
        return NextResponse.json(
          { error: "No se proporcionó imagen ni ejemplo válido." },
          { status: 400 }
        );
      }
    }

    // 2. Filtrar y puntuar tiendas (reusando stores ya obtenido arriba)
    const allStores = stores;
    const rankedItems: SearchResultItem[] = [];
    let passedFiltersCount = 0;

    const activeStyles =
      filters.styles && filters.styles.length > 0
        ? filters.styles
        : detectedInfo.styles && detectedInfo.styles.length > 0
        ? detectedInfo.styles
        : ["Casual"];

    // Familia semántica de la prenda de búsqueda (ej. casaca, polo, vestido, etc.)
    const queryFamily = extractGarmentFamily(
      detectedInfo.garmentTitle,
      detectedInfo.category,
      (detectedInfo as any).garmentFamily || ""
    );

    for (const store of allStores) {
      // Filtros de inclusión estricta (si el usuario los activó)
      if (
        filters.priceLevel &&
        store.priceLevel.toLowerCase() !== filters.priceLevel.toLowerCase()
      ) {
        continue;
      }

      if (
        filters.purchaseType &&
        filters.purchaseType !== "cualquiera" &&
        store.purchaseType !== "cualquiera" &&
        store.purchaseType !== filters.purchaseType
      ) {
        continue;
      }

      if (
        filters.size &&
        !store.sizes.map((s) => s.toLowerCase()).includes(filters.size.toLowerCase())
      ) {
        continue;
      }

      passedFiltersCount++;

      // ==========================================
      // CASO A: MODO POR ESTILO (100% sin foto)
      // ==========================================
      if (searchMode === "estilo") {
        let bestGarment = store.garments[0];
        let maxAffinity = -1;
        let matchingGarmentsCount = 0;

        for (const garment of store.garments) {
          const affinity = calculateGarmentStyleAffinity(garment, activeStyles);
          const { matchingCount: gMatchCount } = calculateStyleMatch(
            activeStyles,
            garment.styles
          );
          if (gMatchCount > 0) matchingGarmentsCount++;

          if (affinity > maxAffinity) {
            maxAffinity = affinity;
            bestGarment = garment;
          }
        }

        const { score: storeStyleScore, matchingCount } = calculateStyleMatch(
          activeStyles,
          store.styles
        );

        // Calibración T6: Base según estilo de tienda (0.55 a 0.85)
        let resonance = 0.55 + 0.30 * storeStyleScore;
        // Bonificación de especialidad si coincide el estilo insignia (#1) (+0.06)
        if (
          store.styles[0] &&
          activeStyles.some(
            (s) => s.toLowerCase().trim() === store.styles[0].toLowerCase().trim()
          )
        ) {
          resonance += 0.06;
        }
        // Bonificación por variedad en catálogo (hasta +0.07)
        if (store.garments.length > 0 && matchingGarmentsCount > 0) {
          resonance += (matchingGarmentsCount / store.garments.length) * 0.07;
        }
        // Tope de seguridad
        resonance = Math.min(0.98, resonance);

        resonance = Number(resonance.toFixed(2));
        const band = determineBand(resonance);

        rankedItems.push({
          store,
          bestGarment,
          resonanceScore: resonance,
          photoSimilarity: 0,
          styleMatchScore: Number(storeStyleScore.toFixed(2)),
          matchingStylesCount: matchingCount,
          totalSearchedStyles: activeStyles.length,
          band,
          searchMode: "estilo",
        });
        continue;
      }

      // ==========================================
      // CASO B: MODO LOOK COMPLETO (outfit entero)
      // ==========================================
      if (searchMode === "look") {
        let bestGarment = store.garments[0];
        let maxLookScore = -1;
        let maxPhotoSim = 0;

        // Evaluar todas las prendas de la tienda contra el look
        const scoredGarments = store.garments
          .map((garment) => {
            const sim =
              garment.embedding && garment.embedding.length > 0 && queryVector && queryVector.length > 0
                ? cosineSimilarity(queryVector, garment.embedding)
                : 0;
            const garmentAffinity = calculateGarmentStyleAffinity(garment, activeStyles);
            // Ponderación de look: afinidad estilística pura 65% + compatibilidad visual 35%
            const lookScore = 0.65 * garmentAffinity + 0.35 * sim;
            return { garment, sim, garmentAffinity, lookScore };
          })
          .sort((a, b) => b.lookScore - a.lookScore);

        const matchingGarments: StoreGarment[] = [];

        if (scoredGarments.length > 0) {
          bestGarment = scoredGarments[0].garment;
          maxLookScore = scoredGarments[0].lookScore;
          maxPhotoSim = scoredGarments[0].sim;

          // Recoger prendas relevantes que arman el look (ej: prenda superior + prenda inferior)
          const seenTypes = new Set<string>();
          for (const sg of scoredGarments) {
            if (matchingGarments.length >= 2) break;
            if (sg.lookScore >= 0.45) {
              const cat = (sg.garment.category || "").toLowerCase();
              const name = sg.garment.name.toLowerCase();
              const isBottom =
                cat.includes("jean") ||
                cat.includes("pantalon") ||
                cat.includes("falda") ||
                name.includes("jean") ||
                name.includes("pantalon") ||
                name.includes("palazzo");
              const isTop =
                cat.includes("polo") ||
                cat.includes("top") ||
                cat.includes("blusa") ||
                cat.includes("chompa") ||
                cat.includes("casaca") ||
                name.includes("blazer") ||
                name.includes("polo") ||
                name.includes("top") ||
                name.includes("blusa") ||
                name.includes("casaca");
              const typeKey = isBottom ? "bottom" : isTop ? "top" : cat;

              if (!seenTypes.has(typeKey)) {
                seenTypes.add(typeKey);
                matchingGarments.push(sg.garment);
              }
            }
          }
        }

        const { score: storeStyleScore, matchingCount } = calculateStyleMatch(
          activeStyles,
          store.styles
        );

        // Si la tienda no comparte ningún estilo con la estética del look, no la incluimos como recomendación
        if (storeStyleScore === 0 && matchingCount === 0) {
          continue;
        }

        // Algoritmo de resonancia Look Completo: 70% estilo del outfit + 30% armonía visual
        const { resonance, visualScore, band } = calculateResonanceScore(
          maxPhotoSim,
          storeStyleScore,
          true,
          "look"
        );

        rankedItems.push({
          store,
          bestGarment,
          matchingGarments: matchingGarments.length > 0 ? matchingGarments : [bestGarment],
          resonanceScore: resonance,
          photoSimilarity: visualScore,
          styleMatchScore: Number(storeStyleScore.toFixed(2)),
          matchingStylesCount: matchingCount,
          totalSearchedStyles: activeStyles.length,
          band,
          searchMode: "look",
        });
        continue;
      }

      // ==========================================
      // CASO C: MODO PRENDA INDIVIDUAL (máxima fidelidad de silueta)
      // ==========================================
      if (queryFamily !== "otro") {
        const sellsFamily = doesStoreSellFamily(store, queryFamily);
        if (!sellsFamily) {
          // La tienda no confecciona ni vende esta familia de prendas (ej. Denim Lab cuando la usuaria busca un vestido)
          continue;
        }
      }

      const COLOR_GROUPS: string[][] = [
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

      const hasColorAffinity = (queryColorRaw: string, garment: StoreGarment): boolean => {
        if (!queryColorRaw) return false;
        const qColor = queryColorRaw.toLowerCase();
        const gColorText = `${garment.primaryColor || ""} ${garment.name || ""} ${garment.description || ""}`.toLowerCase();
        return COLOR_GROUPS.some(
          (group) =>
            group.some((term) => qColor.includes(term)) &&
            group.some((term) => gColorText.includes(term))
        );
      };

      let bestGarment = store.garments[0];
      let maxPhotoSim = 0;
      let bestFamilyRelation: "same" | "different" | "neutral" = "neutral";
      let additionalMatchesCount = 0;
      let maxComparisonScore = -1;

      for (const garment of store.garments) {
        if (!garment.embedding || garment.embedding.length === 0) continue;
        const sim = queryVector && queryVector.length > 0 ? cosineSimilarity(queryVector, garment.embedding) : 0;

        const garmentFamily = extractGarmentFamily(
          garment.name,
          garment.category,
          garment.garmentFamily
        );

        let familyRelation: "same" | "different" | "neutral" = "neutral";
        if (queryFamily !== "otro" && garmentFamily !== "otro") {
          familyRelation = queryFamily === garmentFamily ? "same" : "different";
        }

        // Conteo de prendas de catálogo adicionales del mismo tipo con similitud aceptable (para bono de variedad)
        if (familyRelation === "same" && sim >= 0.65) {
          additionalMatchesCount++;
        }

        // PRIORIDAD SEMÁNTICA + AFINIDAD DE COLOR EN SELECCIÓN DE PRENDA:
        let comparisonScore = sim;
        if (familyRelation === "same") {
          comparisonScore = sim * 1.35;
          if (hasColorAffinity(detectedInfo.primaryColor, garment)) {
            comparisonScore *= 1.06;
          }
        } else if (familyRelation === "different") {
          comparisonScore = sim * 0.65;
        }

        if (comparisonScore > maxComparisonScore) {
          maxComparisonScore = comparisonScore;
          maxPhotoSim = sim;
          bestGarment = garment;
          bestFamilyRelation = familyRelation;
        }
      }

      if (!bestGarment) continue;

      // Coincidencia de estilos: evaluamos tanto los estilos de la tienda como los estilos específicos de la prenda ganadora
      const combinedStoreAndGarmentStyles = Array.from(
        new Set([...(store.styles || []), ...(bestGarment.styles || [])])
      );
      const { score: styleMatchScore, matchingCount } = calculateStyleMatch(
        activeStyles,
        combinedStoreAndGarmentStyles
      );

      // Resonancia final inteligente calibrada 4.0
      let { resonance, visualScore, band } = calculateResonanceScore(
        maxPhotoSim,
        styleMatchScore,
        bestFamilyRelation,
        "prenda"
      );

      // Bono de color (+0.04) si coinciden tonos cromáticos en prendas del mismo tipo
      if (bestFamilyRelation === "same" && hasColorAffinity(detectedInfo.primaryColor, bestGarment)) {
        resonance += 0.04;
      }

      // Bono de variedad (+0.02 por prenda adicional con sim >= 0.65, máx +0.06)
      if (additionalMatchesCount > 1) {
        const varietyBonus = Math.min(0.06, (additionalMatchesCount - 1) * 0.02);
        resonance += varietyBonus;
      }

      // Resonancia máxima tope 0.99
      resonance = Number(Math.min(0.99, resonance).toFixed(2));
      band = determineBand(resonance);

      rankedItems.push({
        store,
        bestGarment,
        resonanceScore: resonance,
        photoSimilarity: visualScore,
        styleMatchScore: Number(styleMatchScore.toFixed(2)),
        matchingStylesCount: matchingCount,
        totalSearchedStyles: activeStyles.length,
        band,
        searchMode: "prenda",
      });
    }

    // 3. Ordenar de mayor a menor resonancia
    rankedItems.sort((a, b) => b.resonanceScore - a.resonanceScore);

    // Filtrar aquellas con resonancia aceptable (en look completo mínimo 0.50 según especificación)
    const minThreshold = searchMode === "prenda" ? 0.38 : searchMode === "look" ? 0.50 : 0.35;
    let passedResonance = rankedItems.filter((item) => item.resonanceScore >= minThreshold);
    if (passedResonance.length === 0 && rankedItems.length > 0) {
      if (rankedItems[0].resonanceScore >= 0.38) {
        passedResonance = [rankedItems[0]];
      }
    }

    // 4. Agrupar por galería como se ve en el mockup
    const groupedByGallery: Record<
      string,
      { galleryName: string; address: string; stores: SearchResultItem[] }
    > = {};

    for (const item of passedResonance) {
      const gName = item.store.gallery;
      if (!groupedByGallery[gName]) {
        groupedByGallery[gName] = {
          galleryName: gName,
          address: item.store.galleryAddress,
          stores: [],
        };
      }
      groupedByGallery[gName].stores.push(item);
    }

    return NextResponse.json({
      success: true,
      results: rankedItems,
      qualifiedResults: passedResonance,
      groupedByGallery,
      detectedInfo,
      stats: {
        totalStores: allStores.length,
        passedFilters: passedFiltersCount,
        passedResonance: passedResonance.length,
      },
    });
  } catch (error) {
    console.error("Error en API de búsqueda:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la búsqueda visual." },
      { status: 500 }
    );
  }
}
