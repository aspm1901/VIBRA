import fs from "fs";
import path from "path";
import { Store, StoreGarment } from "@/types";

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

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORES_FILE)) {
    fs.writeFileSync(STORES_FILE, JSON.stringify(DEFAULT_STORES, null, 2), "utf8");
  }
}

export function getAllStores(): Store[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(STORES_FILE, "utf8");
    return JSON.parse(raw) as Store[];
  } catch (error) {
    console.error("Error al leer stores.json:", error);
    return DEFAULT_STORES;
  }
}

export function getStoreById(id: string): Store | null {
  const stores = getAllStores();
  return stores.find((s) => s.id === id) || null;
}

export function saveStore(store: Store): void {
  ensureDataFile();
  const stores = getAllStores();
  const index = stores.findIndex((s) => s.id === store.id);

  if (index >= 0) {
    stores[index] = store;
  } else {
    stores.unshift(store); // Insertar al inicio para que aparezca primero en admin
  }

  fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2), "utf8");
}

export function deleteStore(id: string): boolean {
  ensureDataFile();
  const stores = getAllStores();
  const filtered = stores.filter((s) => s.id !== id);
  if (filtered.length === stores.length) return false;

  fs.writeFileSync(STORES_FILE, JSON.stringify(filtered, null, 2), "utf8");
  return true;
}

export function resetStores(): void {
  ensureDataFile();
  fs.writeFileSync(STORES_FILE, JSON.stringify(DEFAULT_STORES, null, 2), "utf8");
}
