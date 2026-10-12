import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de Supabase en el entorno.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const storesPath = path.join(process.cwd(), "data", "stores.json");
  if (!fs.existsSync(storesPath)) {
    console.error("No se encontró data/stores.json");
    return;
  }

  const raw = fs.readFileSync(storesPath, "utf8");
  const stores = JSON.parse(raw);

  console.log(`Subiendo ${stores.length} tiendas a Supabase...`);

  for (const store of stores) {
    const payload = {
      id: store.id,
      name: store.name,
      gallery: store.gallery,
      gallery_address: store.galleryAddress,
      floor: store.floor,
      stand: store.stand,
      reference_location: store.referenceLocation,
      whatsapp: store.whatsapp,
      price_level: store.priceLevel,
      styles: store.styles,
      categories: store.categories,
      sizes: store.sizes,
      purchase_type: store.purchaseType,
      stand_photo_url: store.standPhotoUrl,
      instagram: store.instagram,
      updated_at: store.updatedAt,
      garments: store.garments,
    };

    const { error } = await supabase.from("stores").upsert(payload);
    if (error) {
      console.error(`Error con tienda ${store.name}:`, error.message);
    } else {
      console.log(`✅ Tienda migrada: ${store.name}`);
    }
  }

  console.log("¡Migración a Supabase completada!");
}

seed();
