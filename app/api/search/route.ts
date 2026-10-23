import { NextRequest, NextResponse } from "next/server";
import { getAllStores } from "@/lib/stores-db";
import { cosineSimilarity, extractGarmentFamily } from "@/lib/ranking";
import {
  PUBLISH_THRESHOLD,
  scoreEstiloStore,
  scoreLookStore,
  scorePrendaStore,
} from "@/lib/search-scoring";
import { generateImageEmbedding, detectGarmentStyles } from "@/lib/ai/gemini";
import { SearchFilters, SearchResultItem } from "@/types";

export const maxDuration = 60; // 60s timeout for AI calls

function normalizeSize(s: string): string {
  const clean = s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean === "standard" || clean === "estandar") return "estandar";
  return clean;
}

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
          searchMode === "look" ? "look" : "prenda",
          true
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

          const familyLabels: Record<string, string> = {
            vestido: "Vestido",
            casaca: "Casaca / Blazer",
            pantalon_jean: "Pantalón / Jean",
            blusa: "Blusa / Camisa",
            polo_top: "Top / Polo",
            chompa: "Chompa / Tejido",
            falda_short: "Falda / Short",
            conjunto: "Conjunto de dos piezas",
          };

          if (searchMode !== "look") {
            analysis.garmentFamily = inferredFamily;
            analysis.category = familyLabels[inferredFamily] || nearest.category || analysis.category;
            analysis.garmentTitle = familyLabels[inferredFamily]
              ? `${familyLabels[inferredFamily]} en búsqueda`
              : "Prenda en búsqueda";
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

    // Normalizar filtros para soportar selección múltiple (o individual como fallback)
    const rawPrices = filters.priceLevels ?? filters.priceLevel;
    const allowedPrices: string[] = Array.isArray(rawPrices)
      ? rawPrices.map((p: string) => String(p).toLowerCase())
      : rawPrices
      ? [String(rawPrices).toLowerCase()]
      : [];

    const rawPurchaseTypes = filters.purchaseTypes ?? filters.purchaseType;
    const allowedPurchaseTypes: string[] = Array.isArray(rawPurchaseTypes)
      ? rawPurchaseTypes.map((pt: string) => String(pt).toLowerCase()).filter((pt: string) => pt !== "cualquiera")
      : rawPurchaseTypes && rawPurchaseTypes !== "cualquiera"
      ? [String(rawPurchaseTypes).toLowerCase()]
      : [];

    const rawSizes = filters.sizes ?? filters.size;
    const allowedSizes: string[] = Array.isArray(rawSizes)
      ? rawSizes.map((s: string) => normalizeSize(String(s)))
      : rawSizes
      ? [normalizeSize(String(rawSizes))]
      : [];

    for (const store of allStores) {
      // 1. Filtro estricto de Precio (soporta individual o múltiple)
      if (
        allowedPrices.length > 0 &&
        !allowedPrices.includes(store.priceLevel.toLowerCase())
      ) {
        continue;
      }

      // 2. Filtro estricto de Modalidad de Compra
      if (
        allowedPurchaseTypes.length > 0 &&
        store.purchaseType !== "cualquiera" &&
        !allowedPurchaseTypes.includes(store.purchaseType.toLowerCase())
      ) {
        continue;
      }

      // 3. Filtro estricto de Tallas (lógica OR: pasa si la tienda tiene al menos una de las tallas buscadas)
      // La talla "Estándar" es una talla independiente y no equivale a XS, S, M, L o XL
      if (allowedSizes.length > 0) {
        const storeSizesNormalized = (store.sizes || []).map((s) => normalizeSize(s));
        const hasMatchingSize = allowedSizes.some((s) => storeSizesNormalized.includes(s));
        if (!hasMatchingSize) {
          continue;
        }
      }

      passedFiltersCount++;

      // ==========================================
      // CASO A: MODO POR ESTILO (100% sin foto)
      // ==========================================
      if (searchMode === "estilo") {
        const item = scoreEstiloStore(store, activeStyles);
        if (item) rankedItems.push(item);
        continue;
      }

      // ==========================================
      // CASO B: MODO LOOK COMPLETO (outfit entero)
      // ==========================================
      if (searchMode === "look") {
        const item = scoreLookStore(store, { queryVector, activeStyles });
        if (item) rankedItems.push(item);
        continue;
      }

      // ==========================================
      // CASO C: MODO PRENDA INDIVIDUAL (máxima fidelidad de silueta)
      // ==========================================
      const item = scorePrendaStore(store, {
        queryVector,
        queryFamily,
        primaryColor: detectedInfo.primaryColor,
        activeStyles,
      });
      if (item) rankedItems.push(item);
    }

    // 3. Ordenar de mayor a menor resonancia y quitar vectores pesados (3072 floats) antes de enviar al cliente
    rankedItems.sort((a, b) => b.resonanceScore - a.resonanceScore);
    const stripGarment = (g: any) => {
      if (!g) return g;
      const { embedding, ...rest } = g;
      return rest;
    };
    const lightRankedItems: SearchResultItem[] = rankedItems.map((item) => ({
      ...item,
      bestGarment: stripGarment(item.bestGarment),
      matchingGarments: item.matchingGarments ? item.matchingGarments.map(stripGarment) : undefined,
      store: {
        ...item.store,
        garments: (item.store.garments || []).map(stripGarment),
      },
    }));

    // Filtrar las tiendas que superan el piso de publicación de cada modo
    const minThreshold = PUBLISH_THRESHOLD[searchMode];
    let passedResonance = lightRankedItems.filter((item) => item.resonanceScore >= minThreshold);
    if (passedResonance.length === 0 && lightRankedItems.length > 0) {
      if (lightRankedItems[0].resonanceScore >= 0.38) {
        passedResonance = [lightRankedItems[0]];
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
      results: lightRankedItems,
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
