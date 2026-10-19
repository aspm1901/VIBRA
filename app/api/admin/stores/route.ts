import { NextRequest, NextResponse } from "next/server";
import { getAllStores, saveStore, deleteStore, resetStores } from "@/lib/stores-db";
import { generateImageEmbedding, detectGarmentStyles } from "@/lib/ai/gemini";
import { extractGarmentFamily } from "@/lib/ranking";
import { uploadImageToStorage } from "@/lib/supabase";
import { PriceLevel, PurchaseType, Store, StoreGarment } from "@/types";

export const maxDuration = 60;

function isGenericFilename(name?: string): boolean {
  if (!name || !name.trim()) return true;
  const clean = name.trim();
  return (
    /^(img|dsc|whatsapp|screenshot|captura|image|photo|foto|pxl|sam|dcim|frame|pic|untitled|sin\s*titulo|descarga|download|\d+)(\s|\d|_|-|$)/i.test(
      clean
    ) || /^[a-f0-9\s_-]{8,}$/i.test(clean)
  );
}

export async function GET() {
  const stores = await getAllStores();
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      gallery,
      galleryAddress,
      floor,
      stand,
      referenceLocation,
      whatsapp,
      priceLevel = "medio",
      styles = [],
      categories = [],
      sizes = ["S", "M", "L"],
      purchaseType = "cualquiera",
      standPhotoBase64,
      latitude,
      longitude,
      googleMapsUrl,
      instagram,
      tiktok,
      garmentsData = [], // Array de { name, category, styles, imageBase64 }
    } = body;

    if (!name || !gallery || !stand || garmentsData.length === 0) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombre, galería, stand o al menos 1 prenda)." },
        { status: 400 }
      );
    }

    const baseId = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingStores = await getAllStores();
    let storeId = baseId || `tienda-${Date.now()}`;
    if (existingStores.some((s) => s.id === storeId)) {
      const standSlug = String(stand)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
      storeId = `${storeId}-${standSlug || Date.now().toString().slice(-4)}`;
      if (existingStores.some((s) => s.id === storeId)) {
        storeId = `${storeId}-${Date.now().toString().slice(-4)}`;
      }
    }

    // 1. Guardar foto del stand si existe (en Supabase Storage)
    let standPhotoUrl = "/images/stands/stand_santa_rosa_214.svg";
    if (standPhotoBase64 && standPhotoBase64.startsWith("data:image")) {
      const standFilename = `stores/${storeId}/stand_${Date.now()}.jpg`;
      try {
        standPhotoUrl = await uploadImageToStorage(standPhotoBase64, standFilename);
      } catch (uploadErr) {
        console.warn("Fallo subida a Supabase storage para stand, usando default:", uploadErr);
      }
    }

    // 2. Procesar y vectorizar cada prenda con IA
    const processedGarments: StoreGarment[] = [];

    for (let i = 0; i < garmentsData.length; i++) {
      const g = garmentsData[i];
      let photoUrl = "/images/garments/vestido_burdeos.svg";

      if (g.imageBase64 && g.imageBase64.startsWith("data:image")) {
        const garmentFilename = `stores/${storeId}/garment_${Date.now()}_${i + 1}.jpg`;
        try {
          photoUrl = await uploadImageToStorage(g.imageBase64, garmentFilename);
        } catch (uploadErr) {
          console.warn("Fallo subida a Supabase storage para prenda, usando default:", uploadErr);
        }
      }

      // Vectorización con Gemini Embedding 2 y análisis visual con Gemini Vision
      const [embedding, visionAnalysis] = await Promise.all([
        generateImageEmbedding(g.imageBase64 || ""),
        g.imageBase64 ? detectGarmentStyles(g.imageBase64) : null,
      ]);

      if (!embedding || embedding.length === 0) {
        return NextResponse.json(
          { error: `No se pudo generar el vector de IA para la prenda "${g.name || i + 1}". Intenta nuevamente con otra imagen.` },
          { status: 503 }
        );
      }

      const manualStyles = g.styles && g.styles.length > 0 ? g.styles : styles;
      const aiStyles = visionAnalysis && !visionAnalysis.isFallback ? visionAnalysis.styles || [] : [];
      const combinedStyles = Array.from(new Set([...aiStyles, ...manualStyles]));

      const customName = !isGenericFilename(g.name) ? g.name.trim() : "";
      const aiTitle =
        visionAnalysis && !visionAnalysis.isFallback && visionAnalysis.garmentTitle
          ? visionAnalysis.garmentTitle
          : "";
      const finalCategory =
        (g.category && g.category.trim()) ||
        (visionAnalysis && !visionAnalysis.isFallback ? visionAnalysis.category : "") ||
        categories[0] ||
        "Prenda";
      const finalName = customName || aiTitle || `${finalCategory} #${i + 1}`;
      const finalFamily = extractGarmentFamily(
        finalName,
        finalCategory,
        visionAnalysis?.garmentFamily
      );

      processedGarments.push({
        id: `g-${storeId}-${i + 1}`,
        storeId,
        name: finalName,
        photoUrl,
        category: finalCategory,
        styles: combinedStyles.length > 0 ? combinedStyles : ["Casual"],
        embedding,
        garmentFamily: finalFamily !== "otro" ? finalFamily : visionAnalysis?.garmentFamily,
        primaryColor: visionAnalysis?.primaryColor,
        description: visionAnalysis?.description,
      });
    }

    const mergedCategories = Array.from(
      new Set([
        ...categories,
        ...processedGarments.map((pg) => pg.category).filter(Boolean),
      ])
    );
    const mergedStyles =
      styles.length > 0
        ? styles
        : Array.from(new Set(processedGarments.flatMap((pg) => pg.styles))).slice(0, 3);

    const newStore: Store = {
      id: storeId,
      name,
      gallery,
      galleryAddress: galleryAddress || "Gamarra, La Victoria",
      floor: floor ? String(floor).trim() : 1,
      stand,
      referenceLocation: referenceLocation || "Pasillo central",
      whatsapp: whatsapp || "51999999999",
      priceLevel: priceLevel as PriceLevel,
      styles: mergedStyles.length > 0 ? mergedStyles : ["Casual"],
      categories: mergedCategories,
      sizes,
      purchaseType: purchaseType as PurchaseType,
      standPhotoUrl,
      instagram: instagram ? String(instagram).trim() : undefined,
      tiktok: tiktok ? String(tiktok).trim() : undefined,
      updatedAt: "Recién agregada",
      garments: processedGarments,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      googleMapsUrl:
        googleMapsUrl ||
        (latitude && longitude
          ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gallery}, ${galleryAddress || "Gamarra, Lima"}`)}`),
    };

    await saveStore(newStore);

    return NextResponse.json({
      success: true,
      message: "Tienda guardada y prendas vectorizadas con éxito.",
      store: newStore,
    });
  } catch (error) {
    console.error("Error al registrar tienda en admin:", error);
    return NextResponse.json(
      { error: "Error al procesar y vectorizar la tienda." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id,
      name,
      gallery,
      galleryAddress,
      floor,
      stand,
      referenceLocation,
      whatsapp,
      priceLevel = "medio",
      styles = [],
      categories = [],
      sizes = ["S", "M", "L"],
      purchaseType = "cualquiera",
      standPhotoBase64,
      latitude,
      longitude,
      googleMapsUrl,
      instagram,
      tiktok,
      existingGarments = [],
      newGarmentsData = [],
    } = body;

    if (!id || !name || !gallery || !stand) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios para actualizar la tienda." },
        { status: 400 }
      );
    }

    const stores = await getAllStores();
    const existingStore = stores.find((s) => s.id === id);
    if (!existingStore) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    // 1. Guardar nueva foto de stand si se proporcionó
    let standPhotoUrl = existingStore.standPhotoUrl;
    if (standPhotoBase64 && standPhotoBase64.startsWith("data:image")) {
      const standFilename = `stores/${id}/stand_${Date.now()}.jpg`;
      try {
        standPhotoUrl = await uploadImageToStorage(standPhotoBase64, standFilename);
      } catch (uploadErr) {
        console.warn("Fallo subida a Supabase storage para stand PUT:", uploadErr);
      }
    }

    // 2. Procesar y vectorizar nuevas prendas
    const processedNewGarments: StoreGarment[] = [];
    for (let i = 0; i < newGarmentsData.length; i++) {
      const g = newGarmentsData[i];
      let photoUrl = "/images/garments/vestido_burdeos.jpg";

      if (g.imageBase64 && g.imageBase64.startsWith("data:image")) {
        const garmentFilename = `stores/${id}/garment_${Date.now()}_${i + 1}.jpg`;
        try {
          photoUrl = await uploadImageToStorage(g.imageBase64, garmentFilename);
        } catch (uploadErr) {
          console.warn("Fallo subida a Supabase storage para prenda PUT:", uploadErr);
        }
      }

      const [embedding, visionAnalysis] = await Promise.all([
        generateImageEmbedding(g.imageBase64 || ""),
        g.imageBase64 ? detectGarmentStyles(g.imageBase64) : null,
      ]);

      if (!embedding || embedding.length === 0) {
        return NextResponse.json(
          { error: `No se pudo generar el vector de IA para la nueva prenda "${g.name || i + 1}". Intenta nuevamente.` },
          { status: 503 }
        );
      }

      const manualStyles = g.styles && g.styles.length > 0 ? g.styles : styles;
      const aiStyles = visionAnalysis && !visionAnalysis.isFallback ? visionAnalysis.styles || [] : [];
      const combinedStyles = Array.from(new Set([...aiStyles, ...manualStyles]));

      const customName = !isGenericFilename(g.name) ? g.name.trim() : "";
      const aiTitle =
        visionAnalysis && !visionAnalysis.isFallback && visionAnalysis.garmentTitle
          ? visionAnalysis.garmentTitle
          : "";
      const finalCategory =
        (g.category && g.category.trim()) ||
        (visionAnalysis && !visionAnalysis.isFallback ? visionAnalysis.category : "") ||
        categories[0] ||
        "Prenda";
      const finalName =
        customName || aiTitle || `${finalCategory} #${existingGarments.length + i + 1}`;
      const finalFamily = extractGarmentFamily(
        finalName,
        finalCategory,
        visionAnalysis?.garmentFamily
      );

      processedNewGarments.push({
        id: `g-${id}-${Date.now()}-${i + 1}`,
        storeId: id,
        name: finalName,
        photoUrl,
        category: finalCategory,
        styles: combinedStyles.length > 0 ? combinedStyles : ["Casual"],
        embedding,
        garmentFamily: finalFamily !== "otro" ? finalFamily : visionAnalysis?.garmentFamily,
        primaryColor: visionAnalysis?.primaryColor,
        description: visionAnalysis?.description,
      });
    }

    // Recalcular garmentFamily si la usuaria renombró o recategorizó prendas existentes
    const normalizedExistingGarments: StoreGarment[] = (existingGarments as StoreGarment[]).map(
      (eg) => {
        const updatedFam = extractGarmentFamily(eg.name, eg.category, eg.garmentFamily);
        return {
          ...eg,
          garmentFamily: updatedFam !== "otro" ? updatedFam : eg.garmentFamily,
        };
      }
    );

    const finalGarments: StoreGarment[] = [...normalizedExistingGarments, ...processedNewGarments];

    if (finalGarments.length === 0) {
      return NextResponse.json(
        { error: "La tienda debe tener al menos una prenda en catálogo." },
        { status: 400 }
      );
    }

    const mergedCategories = Array.from(
      new Set([
        ...categories,
        ...finalGarments.map((fg) => fg.category).filter(Boolean),
      ])
    );

    const updatedStore: Store = {
      ...existingStore,
      name,
      gallery,
      galleryAddress: galleryAddress || existingStore.galleryAddress,
      floor: floor ? String(floor).trim() : existingStore.floor || 1,
      stand,
      referenceLocation: referenceLocation || existingStore.referenceLocation,
      whatsapp: whatsapp || existingStore.whatsapp,
      priceLevel: priceLevel as PriceLevel,
      styles,
      categories: mergedCategories,
      sizes,
      purchaseType: purchaseType as PurchaseType,
      standPhotoUrl,
      instagram:
        instagram !== undefined
          ? instagram
            ? String(instagram).trim()
            : undefined
          : existingStore.instagram,
      tiktok:
        tiktok !== undefined
          ? tiktok
            ? String(tiktok).trim()
            : undefined
          : existingStore.tiktok,
      updatedAt: "Actualizada recientemente",
      garments: finalGarments,
      latitude: latitude !== undefined ? (latitude ? Number(latitude) : undefined) : existingStore.latitude,
      longitude: longitude !== undefined ? (longitude ? Number(longitude) : undefined) : existingStore.longitude,
      googleMapsUrl:
        googleMapsUrl ||
        (latitude && longitude
          ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          : existingStore.googleMapsUrl ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gallery}, ${galleryAddress || existingStore.galleryAddress || "Gamarra, Lima"}`)}`),
    };

    await saveStore(updatedStore);

    return NextResponse.json({
      success: true,
      message: "Tienda actualizada con éxito.",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Error al actualizar tienda en admin:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar tienda." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (action === "reset") {
      resetStores();
      return NextResponse.json({ success: true, message: "Tiendas restablecidas a las 3 iniciales." });
    }

    if (!id) {
      return NextResponse.json({ error: "Falta id de la tienda a eliminar." }, { status: 400 });
    }

    const deleted = await deleteStore(id);
    if (!deleted) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Tienda eliminada con éxito." });
  } catch (error) {
    console.error("Error al eliminar tienda:", error);
    return NextResponse.json({ error: "Error interno al eliminar tienda." }, { status: 500 });
  }
}
