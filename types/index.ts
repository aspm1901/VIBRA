export type PriceLevel = "economico" | "medio" | "alto";
export type PurchaseType = "cualquiera" | "envio" | "presencial";
export type ResonanceBand = "Alta" | "Media" | "Exploratoria" | "Baja";

export interface StoreGarment {
  id: string;
  storeId: string;
  name: string;
  photoUrl: string;
  category: string;
  styles: string[];
  embedding?: number[]; // 768 o 3072-dim vector from gemini-embedding-2
  garmentFamily?: string;
  primaryColor?: string;
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  gallery: string;
  galleryAddress: string;
  floor: string | number;
  stand: string;
  referenceLocation: string;
  whatsapp: string;
  priceLevel: PriceLevel;
  styles: string[];
  categories: string[];
  sizes: string[];
  purchaseType: PurchaseType;
  standPhotoUrl: string;
  instagram?: string;
  tiktok?: string;
  updatedAt: string;
  garments: StoreGarment[];
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

export interface SearchResultItem {
  store: Store;
  bestGarment: StoreGarment;
  matchingGarments?: StoreGarment[];
  resonanceScore: number;
  photoSimilarity: number;
  styleMatchScore: number;
  matchingStylesCount: number;
  totalSearchedStyles: number;
  band: ResonanceBand;
  searchMode?: "prenda" | "look" | "estilo";
}

export interface SearchFilters {
  category?: string;
  styles?: string[];
  priceLevel?: PriceLevel;
  size?: string;
  sizes?: string[];
  priceLevels?: PriceLevel[];
  purchaseTypes?: PurchaseType[];
  purchaseType?: PurchaseType;
  searchMode?: "prenda" | "look" | "estilo";
}

export interface RouteItem {
  storeId: string;
  store: Store;
  addedAt: number;
  visited?: boolean;
}

