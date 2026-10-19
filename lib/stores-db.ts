import fs from "fs";
import path from "path";
import { Store, StoreGarment } from "@/types";
import { supabase, isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const STORES_FILE = path.join(DATA_DIR, "stores.json");

// Función auxiliar para generar un vector sintético representativo de 768 dimensiones
function createPresetVector(seed: number, dominantDims: number[] = []): number[] {
  const vector: number[] = [];
  let current = seed;
  let norm = 0;

  for (let i = 0; i < 768; i++) {
    current = (current * 1664525 + 1013904223) % 4294967296;
    let val = (current / 4294967296) * 2 - 1;

    // Acentuar dimensiones dominantes para que coincidan con su estilo
    if (dominantDims.includes(i % 50)) {
      val += 1.5;
    }

    vector.push(val);
    norm += val * val;
  }

  const sqrtNorm = Math.sqrt(norm) || 1;
  return vector.map((v) => Number((v / sqrtNorm).toFixed(6)));
}

// 3 Tiendas Iniciales del Piloto
export const DEFAULT_STORES: Store[] = [
  {
    id: "textiles-aurora",
    name: "Textiles Aurora",
    gallery: "Galería Santa Rosa",
    galleryAddress: "Jr. Gamarra, cuadra 7",
    floor: 3,
    stand: "214",
    referenceLocation: "Escalera norte, a 40 m del ingreso principal",
    whatsapp: "51987654321",
    priceLevel: "medio",
    styles: ["Elegante", "Fiesta", "Romántico"],
    categories: ["Vestidos", "Tops"],
    sizes: ["S", "M", "L"],
    purchaseType: "envio",
    standPhotoUrl: "/images/stands/stand_santa_rosa_214.svg",
    instagram: "@textiles.aurora",
    latitude: -12.0662726,
    longitude: -77.0131215,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-12.0662726,-77.0131215",
    updatedAt: "Hace 14 días",
    garments: [
      {
        id: "g-aurora-1",
        storeId: "textiles-aurora",
        name: "Vestido burdeos de fiesta y noche",
        photoUrl: "/images/garments/vestido_burdeos.svg",
        category: "Vestidos",
        styles: ["Elegante", "Fiesta"],
        embedding: createPresetVector(101, [5, 12, 28]), // Cluster Fiesta / Elegante Burdeos
      },
      {
        id: "g-aurora-2",
        storeId: "textiles-aurora",
        name: "Top satinado noche con escote corazón",
        photoUrl: "/images/garments/vestido_burdeos.svg",
        category: "Tops",
        styles: ["Fiesta", "Elegante"],
        embedding: createPresetVector(102, [5, 12, 33]),
      },
    ],
  },
  {
    id: "saten-and-co",
    name: "Satén & Co.",
    gallery: "Galería Santa Rosa",
    galleryAddress: "Jr. Gamarra, cuadra 7",
    floor: 4,
    stand: "410",
    referenceLocation: "Frente al ascensor central",
    whatsapp: "51912345678",
    priceLevel: "medio",
    styles: ["Minimalista", "Urbano", "Oficina"],
    categories: ["Blusas", "Tops", "Jeans y pantalones"],
    sizes: ["XS", "S", "M"],
    purchaseType: "cualquiera",
    standPhotoUrl: "/images/stands/stand_santa_rosa_410.svg",
    instagram: "@saten_co_lima",
    latitude: -12.0662726,
    longitude: -77.0131215,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-12.0662726,-77.0131215",
    updatedAt: "Hace 8 días",
    garments: [
      {
        id: "g-saten-1",
        storeId: "saten-and-co",
        name: "Blusa beige minimal caída satén",
        photoUrl: "/images/garments/blusa_beige.svg",
        category: "Blusas",
        styles: ["Minimalista", "Oficina"],
        embedding: createPresetVector(201, [8, 19, 42]), // Cluster Minimalista / Beige
      },
      {
        id: "g-saten-2",
        storeId: "saten-and-co",
        name: "Jean wide leg celeste urbano",
        photoUrl: "/images/garments/jean_celeste.svg",
        category: "Jeans y pantalones",
        styles: ["Urbano", "Casual"],
        embedding: createPresetVector(202, [3, 14, 39]), // Cluster Urbano / Denim
      },
    ],
  },
  {
    id: "noche-dorada",
    name: "Noche Dorada",
    gallery: "Galería El Rey",
    galleryAddress: "Av. Aviación, esquina con Jr. Huáscar",
    floor: 4,
    stand: "402",
    referenceLocation: "Pasillo B, cerca a patio de comidas",
    whatsapp: "51977788899",
    priceLevel: "alto",
    styles: ["Fiesta", "Elegante", "Casual"],
    categories: ["Vestidos", "Conjuntos"],
    sizes: ["S", "M", "L", "XL"],
    purchaseType: "presencial",
    standPhotoUrl: "/images/stands/stand_el_rey_402.svg",
    instagram: "@nochedorada.gamarra",
    latitude: -12.06495,
    longitude: -77.01255,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-12.06495,-77.01255",
    updatedAt: "Hace 3 días",
    garments: [
      {
        id: "g-noche-1",
        storeId: "noche-dorada",
        name: "Vestido dorado sirena noche",
        photoUrl: "/images/garments/vestido_dorado.svg",
        category: "Vestidos",
        styles: ["Fiesta", "Elegante"],
        embedding: createPresetVector(301, [5, 12, 45]),
      },
      {
        id: "g-noche-2",
        storeId: "noche-dorada",
        name: "Chompa mostaza tejida de punto grueso",
        photoUrl: "/images/garments/chompa_amarilla.svg",
        category: "Chompas",
        styles: ["Casual", "Minimalista"],
        embedding: createPresetVector(302, [11, 22, 35]), // Cluster Tejidos / Invierno
      },
    ],
  },
];

// Caché en memoria para máxima velocidad de búsqueda
let memoryCache: { stores: Store[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 segundos

function mapRowToStore(row: any): Store {
  const rawGarments = Array.isArray(row.garments) ? row.garments : [];
  const firstMeta = rawGarments[0]?._storeMeta || {};

  const lat = row.latitude ?? firstMeta.latitude ?? null;
  const lng = row.longitude ?? firstMeta.longitude ?? null;
  const tiktok = row.tiktok || firstMeta.tiktok || undefined;
  const gallery = row.gallery || "";
  const galleryAddress = row.gallery_address || row.galleryAddress || "";
  let mapsUrl = row.google_maps_url || row.googleMapsUrl || firstMeta.googleMapsUrl || "";
  if (!mapsUrl) {
    if (lat && lng) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (galleryAddress || gallery) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gallery}, ${galleryAddress}, Gamarra, Lima`)}`;
    }
  }

  const cleanGarments: StoreGarment[] = rawGarments.map((g: any) => {
    const { _storeMeta, ...rest } = g;
    return rest as StoreGarment;
  });

  return {
    id: row.id,
    name: row.name,
    gallery,
    galleryAddress,
    floor: firstMeta.floorText || row.floor || 1,
    stand: row.stand || "",
    referenceLocation: row.reference_location || row.referenceLocation || "",
    whatsapp: row.whatsapp || "",
    priceLevel: row.price_level || row.priceLevel || "medio",
    styles: Array.isArray(row.styles) ? row.styles : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    purchaseType: row.purchase_type || row.purchaseType || "cualquiera",
    standPhotoUrl: row.stand_photo_url || row.standPhotoUrl || "",
    instagram: row.instagram || undefined,
    tiktok,
    updatedAt: row.updated_at || row.updatedAt || "",
    garments: cleanGarments,
    latitude: lat !== null && lat !== undefined ? Number(lat) : undefined,
    longitude: lng !== null && lng !== undefined ? Number(lng) : undefined,
    googleMapsUrl: mapsUrl,
  };
}

function mapStoreToRow(store: Store): any {
  const storeMeta = {
    tiktok: store.tiktok,
    latitude: store.latitude,
    longitude: store.longitude,
    googleMapsUrl: store.googleMapsUrl,
    floorText: store.floor !== undefined ? String(store.floor) : undefined,
  };

  const garmentsWithMeta = (store.garments || []).map((g, idx) =>
    idx === 0 ? { ...g, _storeMeta: storeMeta } : g
  );

  // Solo enviamos las columnas exactas que existen en la tabla PostgreSQL `stores` de Supabase
  return {
    id: store.id,
    name: store.name,
    gallery: store.gallery,
    gallery_address: store.galleryAddress,
    floor: parseInt(String(store.floor), 10) || 1,
    stand: store.stand,
    reference_location: store.referenceLocation,
    whatsapp: store.whatsapp,
    price_level: store.priceLevel,
    styles: store.styles,
    categories: store.categories,
    sizes: store.sizes,
    purchase_type: store.purchaseType,
    stand_photo_url: store.standPhotoUrl,
    instagram: store.instagram || null,
    updated_at: store.updatedAt,
    garments: garmentsWithMeta,
  };
}

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORES_FILE)) {
      fs.writeFileSync(STORES_FILE, JSON.stringify(DEFAULT_STORES, null, 2), "utf8");
    }
  } catch (e) {
    // En entornos serverless de solo lectura (como Vercel) fs puede fallar
  }
}

export function getLocalStores(): Store[] {
  ensureDataFile();
  try {
    if (fs.existsSync(STORES_FILE)) {
      const raw = fs.readFileSync(STORES_FILE, "utf8");
      return JSON.parse(raw) as Store[];
    }
    return DEFAULT_STORES;
  } catch (error) {
    console.error("Error al leer stores.json:", error);
    return DEFAULT_STORES;
  }
}

export async function getAllStores(): Promise<Store[]> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.stores;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapRowToStore);
        memoryCache = { stores: mapped, timestamp: now };
        return mapped;
      }
    } catch (err) {
      console.warn("Fallo temporal en Supabase, recurriendo a almacenamiento local:", err);
    }
  }

  const local = getLocalStores();
  memoryCache = { stores: local, timestamp: now };
  return local;
}

export async function getStoreById(id: string): Promise<Store | null> {
  const stores = await getAllStores();
  return stores.find((s) => s.id === id) || null;
}

export async function saveStore(store: Store): Promise<void> {
  memoryCache = null; // Invalidar caché

  let savedInSupabase = false;
  let supabaseErrorMsg = "";

  // 1. Guardar en Supabase si está disponible
  if (isSupabaseConfigured) {
    try {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const row = mapStoreToRow(store);
        const { error } = await adminClient.from("stores").upsert(row);
        if (error) {
          console.error("Error al guardar tienda en Supabase:", error);
          supabaseErrorMsg = error.message || JSON.stringify(error);
        } else {
          savedInSupabase = true;
        }
      }
    } catch (err: any) {
      console.error("Excepción al guardar en Supabase:", err);
      supabaseErrorMsg = err?.message || String(err);
    }
  }

  // 2. Guardar en archivo local (para desarrollo offline)
  let savedLocally = false;
  try {
    ensureDataFile();
    const stores = getLocalStores();
    const index = stores.findIndex((s) => s.id === store.id);

    if (index >= 0) {
      stores[index] = store;
    } else {
      stores.unshift(store);
    }

    fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2), "utf8");
    savedLocally = true;
  } catch (err) {
    // Si corre en Vercel (read-only), dependemos de Supabase
  }

  if (!savedInSupabase && !savedLocally) {
    throw new Error(`No se pudo guardar la tienda en la base de datos: ${supabaseErrorMsg}`);
  }
}

export async function deleteStore(id: string): Promise<boolean> {
  memoryCache = null;

  let deletedInSupabase = false;
  if (isSupabaseConfigured) {
    try {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const { error } = await adminClient.from("stores").delete().eq("id", id);
        if (!error) deletedInSupabase = true;
      }
    } catch (err) {
      console.error("Error al eliminar tienda en Supabase:", err);
    }
  }

  try {
    ensureDataFile();
    const stores = getLocalStores();
    const filtered = stores.filter((s) => s.id !== id);
    if (filtered.length !== stores.length) {
      fs.writeFileSync(STORES_FILE, JSON.stringify(filtered, null, 2), "utf8");
      return true;
    }
  } catch (err) {
    return deletedInSupabase;
  }

  return deletedInSupabase;
}

export function resetStores(): void {
  memoryCache = null;
  try {
    ensureDataFile();
    fs.writeFileSync(STORES_FILE, JSON.stringify(DEFAULT_STORES, null, 2), "utf8");
  } catch (err) {}
}
