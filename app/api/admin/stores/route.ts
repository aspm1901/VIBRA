import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAllStores, saveStore, deleteStore, resetStores } from "@/lib/stores-db";
import { generateImageEmbedding, detectGarmentStyles } from "@/lib/ai/gemini";
import { PriceLevel, PurchaseType, Store, StoreGarment } from "@/types";

export const maxDuration = 60;

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "stores");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function GET() {
  const stores = getAllStores();
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  try {
    ensureUploadsDir();
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
      garmentsData = [], // Array de { name, category, styles, imageBase64 }
    } = body;

    if (!name || !gallery || !stand || garmentsData.length === 0) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombre, galería, stand o al menos 1 prenda)." },
        { status: 400 }
      );
    }

    const storeId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // 1. Guardar foto del stand si existe
    let standPhotoUrl = "/images/stands/stand_santa_rosa_214.svg";
    if (standPhotoBase64) {
      const standFilename = `${storeId}_stand_${Date.now()}.jpg`;
      const standFilePath = path.join(UPLOADS_DIR, standFilename);
      const cleanStandBase64 = standPhotoBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(standFilePath, Buffer.from(cleanStandBase64, "base64"));
      standPhotoUrl = `/uploads/stores/${standFilename}`;
    }

    // 2. Procesar y vectorizar cada prenda con IA
    const processedGarments: StoreGarment[] = [];

    for (let i = 0; i < garmentsData.length; i++) {
      const g = garmentsData[i];
      let photoUrl = "/images/garments/vestido_burdeos.svg";

      if (g.imageBase64) {
        const garmentFilename = `${storeId}_garment_${i + 1}_${Date.now()}.jpg`;
        const garmentFilePath = path.join(UPLOADS_DIR, garmentFilename);
        const cleanBase64 = g.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(garmentFilePath, Buffer.from(cleanBase64, "base64"));
        photoUrl = `/uploads/stores/${garmentFilename}`;
      }

      // Vectorización con Gemini Embedding 2 y análisis visual con Gemini Vision
      const [embedding, visionAnalysis] = await Promise.all([
        generateImageEmbedding(g.imageBase64 || ""),
        g.imageBase64 ? detectGarmentStyles(g.imageBase64) : null,
      ]);

      const manualStyles = g.styles && g.styles.length > 0 ? g.styles : styles;
      const aiStyles = visionAnalysis?.styles || [];
      const combinedStyles = Array.from(new Set([...manualStyles, ...aiStyles]));

      processedGarments.push({
        id: `g-${storeId}-${i + 1}`,
        storeId,
        name: g.name || visionAnalysis?.garmentTitle || `Prenda ${i + 1}`,
        photoUrl,
        category: g.category || visionAnalysis?.category || categories[0] || "Prenda",
        styles: combinedStyles.length > 0 ? combinedStyles : ["Casual"],
        embedding,
      });
    }

    const newStore: Store = {
      id: storeId,
      name,
      gallery,
      galleryAddress: galleryAddress || "Gamarra, La Victoria",
      floor: floor || 1,
      stand,
      referenceLocation: referenceLocation || "Pasillo central",
      whatsapp: whatsapp || "51999999999",
      priceLevel: priceLevel as PriceLevel,
      styles,
      categories,
      sizes,
      purchaseType: purchaseType as PurchaseType,
      standPhotoUrl,
      updatedAt: "Recién agregada",
      garments: processedGarments,
    };

    saveStore(newStore);

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
    ensureUploadsDir();
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
      existingGarments = [],
      newGarmentsData = [],
    } = body;

    if (!id || !name || !gallery || !stand) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios para actualizar la tienda." },
        { status: 400 }
      );
    }

    const stores = getAllStores();
    const existingStore = stores.find((s) => s.id === id);
    if (!existingStore) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    // 1. Guardar nueva foto de stand si se proporcionó
    let standPhotoUrl = existingStore.standPhotoUrl;
    if (standPhotoBase64 && standPhotoBase64.startsWith("data:image")) {
      const standFilename = `${id}_stand_${Date.now()}.jpg`;
      const standFilePath = path.join(UPLOADS_DIR, standFilename);
      const cleanStandBase64 = standPhotoBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(standFilePath, Buffer.from(cleanStandBase64, "base64"));
      standPhotoUrl = `/uploads/stores/${standFilename}`;
    }

    // 2. Procesar y vectorizar nuevas prendas
    const processedNewGarments: StoreGarment[] = [];
    for (let i = 0; i < newGarmentsData.length; i++) {
      const g = newGarmentsData[i];
      let photoUrl = "/images/garments/vestido_burdeos.jpg";

      if (g.imageBase64) {
        const garmentFilename = `${id}_garment_${Date.now()}_${i + 1}.jpg`;
        const garmentFilePath = path.join(UPLOADS_DIR, garmentFilename);
        const cleanBase64 = g.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(garmentFilePath, Buffer.from(cleanBase64, "base64"));
        photoUrl = `/uploads/stores/${garmentFilename}`;
      }

      const [embedding, visionAnalysis] = await Promise.all([
        generateImageEmbedding(g.imageBase64 || ""),
        g.imageBase64 ? detectGarmentStyles(g.imageBase64) : null,
      ]);

      const manualStyles = g.styles && g.styles.length > 0 ? g.styles : styles;
      const aiStyles = visionAnalysis?.styles || [];
      const combinedStyles = Array.from(new Set([...manualStyles, ...aiStyles]));

      processedNewGarments.push({
        id: `g-${id}-${Date.now()}-${i + 1}`,
        storeId: id,
        name: g.name || visionAnalysis?.garmentTitle || `Prenda ${existingGarments.length + i + 1}`,
        photoUrl,
        category: g.category || visionAnalysis?.category || categories[0] || "Tops",
        styles: combinedStyles.length > 0 ? combinedStyles : ["Casual"],
        embedding,
      });
    }

    const finalGarments: StoreGarment[] = [...existingGarments, ...processedNewGarments];

    if (finalGarments.length === 0) {
      return NextResponse.json(
        { error: "La tienda debe tener al menos una prenda en catálogo." },
        { status: 400 }
      );
    }

    const updatedStore: Store = {
      ...existingStore,
      name,
      gallery,
      galleryAddress: galleryAddress || existingStore.galleryAddress,
      floor: floor || existingStore.floor,
      stand,
      referenceLocation: referenceLocation || existingStore.referenceLocation,
      whatsapp: whatsapp || existingStore.whatsapp,
      priceLevel: priceLevel as PriceLevel,
      styles,
      categories,
      sizes,
      purchaseType: purchaseType as PurchaseType,
      standPhotoUrl,
      updatedAt: "Actualizada recientemente",
      garments: finalGarments,
    };

    saveStore(updatedStore);

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

    const deleted = deleteStore(id);
    if (!deleted) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Tienda eliminada con éxito." });
  } catch (error) {
    console.error("Error al eliminar tienda:", error);
    return NextResponse.json({ error: "Error interno al eliminar tienda." }, { status: 500 });
  }
}
