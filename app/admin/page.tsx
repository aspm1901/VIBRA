"use client";

import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { Store, PriceLevel, PurchaseType, StoreGarment } from "@/types";
import {
  Plus,
  Trash2,
  Upload,
  Sparkles,
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Pencil,
  X,
  LogOut,
  Camera,
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  Loader2,
} from "lucide-react";

const STYLES_LIST = [
  "Casual",
  "Elegante",
  "Urbano",
  "Fiesta",
  "Oficina",
  "Minimalista",
  "Boho",
  "Romántico",
  "Y2K",
  "Vintage",
  "Playa",
  "Deportivo",
];

const CATEGORIES_LIST = [
  "Tops",
  "Blusas",
  "Casacas y abrigos",
  "Vestidos",
  "Jeans y pantalones",
  "Faldas",
  "Shorts",
  "Conjuntos",
  "Chompas",
];

const POPULAR_GAMARRA_GALLERIES = [
  { name: "Galería Santa Rosa", address: "Agustín Gamarra 789, La Victoria 15018", lat: -12.0662726, lng: -77.0131215 },
  { name: "Galería El Rey", address: "Jirón Agustín Gamarra 1000, La Victoria 15018", lat: -12.06495, lng: -77.01255 },
  { name: "Galería San Pedro", address: "Jirón General Gamarra 1160, La Victoria 15018", lat: -12.0638, lng: -77.0122 },
  { name: "Galería Guizado", address: "Jirón Agustín Gamarra 640, La Victoria 15018", lat: -12.0678, lng: -77.0135 },
  { name: "Gama Moda Plaza", address: "Av. Aviación 1050, La Victoria 15018", lat: -12.0642, lng: -77.0108 },
  { name: "Parque Cánepa", address: "Jirón Agustín Gamarra 1100, La Victoria 15018", lat: -12.0645, lng: -77.0128 },
];


interface GarmentDraft {
  name: string;
  category: string;
  styles: string[];
  imageBase64: string;
}

export default function AdminPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
    } catch {
      router.replace("/");
    }
  };

  // Edit Mode State
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [existingGarments, setExistingGarments] = useState<StoreGarment[]>([]);
  const [currentStandPhotoUrl, setCurrentStandPhotoUrl] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [gallery, setGallery] = useState("Galería Santa Rosa");
  const [galleryAddress, setGalleryAddress] = useState("Jr. Gamarra, cuadra 7");
  const [floor, setFloor] = useState<number | string>(2);
  const [stand, setStand] = useState("");
  const [referenceLocation, setReferenceLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("519");
  const [priceLevel, setPriceLevel] = useState<PriceLevel>("medio");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["Urbano"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Tops"]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["S", "M", "L"]);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("cualquiera");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [standPhotoBase64, setStandPhotoBase64] = useState<string | null>(null);
  const [isReadingGarments, setIsReadingGarments] = useState(false);
  const [isReadingStand, setIsReadingStand] = useState(false);

  // Google Maps / Ubicación Autocomplete State
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");
  const [placeSearchInput, setPlaceSearchInput] = useState<string>("");
  const [placePredictions, setPlacePredictions] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState<boolean>(false);
  const [mapsKeyMissing, setMapsKeyMissing] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string>(() => Math.random().toString(36).substring(2, 15));

  // Prendas a subir para la tienda (nuevas)
  const [garmentsDraft, setGarmentsDraft] = useState<GarmentDraft[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  // Autocomplete debounce para Google Maps Places API
  useEffect(() => {
    if (!placeSearchInput || placeSearchInput.trim().length < 2) {
      setPlacePredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(placeSearchInput)}&sessionToken=${sessionToken}`
        );
        if (res.ok) {
          const data = await res.json();
          setPlacePredictions(data.predictions || []);
          if (data.apiKeyMissing) {
            setMapsKeyMissing(true);
          } else {
            setMapsKeyMissing(false);
          }
          setShowPlaceDropdown(true);
        }
      } catch (err) {
        console.error("Error al buscar lugares:", err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [placeSearchInput, sessionToken]);

  const handleSelectPrediction = async (prediction: any) => {
    setShowPlaceDropdown(false);
    setPlaceSearchInput("");

    if (prediction.latitude && prediction.longitude) {
      setGallery(prediction.mainText);
      setGalleryAddress(prediction.secondaryText || prediction.fullText);
      setLatitude(prediction.latitude);
      setLongitude(prediction.longitude);
      setGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${prediction.latitude},${prediction.longitude}`);
      setSessionToken(Math.random().toString(36).substring(2, 15));
      return;
    }

    try {
      setIsSearchingPlaces(true);
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${sessionToken}`
      );
      if (res.ok) {
        const data = await res.json();
        setGallery(data.name || prediction.mainText);
        setGalleryAddress(data.formattedAddress || prediction.secondaryText);
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setGoogleMapsUrl(
          data.googleMapsUri ||
            (data.latitude && data.longitude
              ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.formattedAddress || prediction.mainText)}`)
        );
      } else {
        setGallery(prediction.mainText);
        setGalleryAddress(prediction.secondaryText || prediction.fullText);
      }
    } catch {
      setGallery(prediction.mainText);
      setGalleryAddress(prediction.secondaryText || prediction.fullText);
    } finally {
      setIsSearchingPlaces(false);
      setSessionToken(Math.random().toString(36).substring(2, 15));
    }
  };

  const handleSelectQuickGallery = (gal: (typeof POPULAR_GAMARRA_GALLERIES)[0]) => {
    setGallery(gal.name);
    setGalleryAddress(gal.address);
    setLatitude(gal.lat);
    setLongitude(gal.lng);
    setGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${gal.lat},${gal.lng}`);
    setShowPlaceDropdown(false);
  };

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e) {
      console.error("Error al cargar tiendas:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (store: Store) => {
    setEditingStoreId(store.id);
    setName(store.name);
    setGallery(store.gallery);
    setGalleryAddress(store.galleryAddress || "Jr. Gamarra, cuadra 7");
    setFloor(store.floor);
    setStand(store.stand);
    setReferenceLocation(store.referenceLocation || "");
    setWhatsapp(store.whatsapp || "519");
    setPriceLevel(store.priceLevel);
    setSelectedStyles(store.styles || []);
    setSelectedCategories(store.categories || []);
    setSelectedSizes(store.sizes || ["S", "M", "L"]);
    setPurchaseType(store.purchaseType || "cualquiera");
    setStandPhotoBase64(null);
    setCurrentStandPhotoUrl(store.standPhotoUrl || null);
    setLatitude(store.latitude);
    setLongitude(store.longitude);
    setGoogleMapsUrl(store.googleMapsUrl || "");
    setInstagram(store.instagram || "");
    setTiktok(store.tiktok || "");
    setExistingGarments(store.garments || []);
    setGarmentsDraft([]);
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingStoreId(null);
    setName("");
    setGallery("Galería Santa Rosa");
    setGalleryAddress("Jr. Gamarra, cuadra 7");
    setFloor(2);
    setStand("");
    setReferenceLocation("");
    setWhatsapp("519");
    setPriceLevel("medio");
    setSelectedStyles(["Urbano"]);
    setSelectedCategories(["Tops"]);
    setSelectedSizes(["S", "M", "L"]);
    setPurchaseType("cualquiera");
    setInstagram("");
    setTiktok("");
    setStandPhotoBase64(null);
    setCurrentStandPhotoUrl(null);
    setLatitude(undefined);
    setLongitude(undefined);
    setGoogleMapsUrl("");
    setPlaceSearchInput("");
    setShowPlaceDropdown(false);
    setExistingGarments([]);
    setGarmentsDraft([]);
    setStatusMessage(null);
  };

  const handleRemoveExistingGarment = (garmentId: string) => {
    setExistingGarments((prev) => prev.filter((g) => g.id !== garmentId));
  };

  const handleUpdateExistingGarmentName = (garmentId: string, val: string) => {
    setExistingGarments((prev) =>
      prev.map((g) => (g.id === garmentId ? { ...g, name: val } : g))
    );
  };

  const handleUpdateExistingGarmentCategory = (garmentId: string, val: string) => {
    setExistingGarments((prev) =>
      prev.map((g) => (g.id === garmentId ? { ...g, category: val } : g))
    );
  };

  // Helper en cliente para comprimir fotos pesadas de celulares en ~15ms antes de enviar
  const compressImageClient = (base64: string, maxDim = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          resolve(base64);
          return;
        }
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleGarmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingGarments(true);
    const filesArray = Array.from(files);
    let loadedCount = 0;

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawBase64 = reader.result as string;
        const compressedBase64 = await compressImageClient(rawBase64, 1200);
        setGarmentsDraft((prev) => [
          ...prev,
          {
            name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            category: selectedCategories[0] || "Tops",
            styles: selectedStyles,
            imageBase64: compressedBase64,
          },
        ]);
        loadedCount++;
        if (loadedCount === filesArray.length) {
          setIsReadingGarments(false);
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === filesArray.length) {
          setIsReadingGarments(false);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleStandFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingStand(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const compressedBase64 = await compressImageClient(rawBase64, 1200);
      setStandPhotoBase64(compressedBase64);
      setIsReadingStand(false);
    };
    reader.onerror = () => {
      setIsReadingStand(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeGarmentDraft = (index: number) => {
    setGarmentsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gallery || !stand) {
      setStatusMessage({ type: "error", text: "Por favor completa el nombre, galería y stand." });
      return;
    }

    const isEditing = Boolean(editingStoreId);

    if (!isEditing && garmentsDraft.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Debes subir al menos 1 foto de prenda para que la IA la pueda vectorizar.",
      });
      return;
    }

    if (isEditing && existingGarments.length === 0 && garmentsDraft.length === 0) {
      setStatusMessage({
        type: "error",
        text: "La tienda debe mantener al menos 1 prenda en su catálogo o subir una nueva.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage(null);

      if (isEditing) {
        const payload = {
          id: editingStoreId,
          name,
          gallery,
          galleryAddress,
          floor,
          stand,
          referenceLocation: referenceLocation || "Pasillo central",
          whatsapp,
          priceLevel,
          styles: selectedStyles,
          categories: selectedCategories,
          sizes: selectedSizes,
          purchaseType,
          standPhotoBase64,
          latitude,
          longitude,
          googleMapsUrl,
          instagram: instagram.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          existingGarments,
          newGarmentsData: garmentsDraft,
        };

        const res = await fetch("/api/admin/stores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setStatusMessage({
            type: "success",
            text: `¡Tienda "${name}" actualizada con éxito!` +
              (garmentsDraft.length > 0 ? ` (${garmentsDraft.length} prendas nuevas vectorizadas)` : ""),
          });
          handleCancelEdit();
          fetchStores();
        } else {
          setStatusMessage({ type: "error", text: data.error || "Error al actualizar tienda." });
        }
      } else {
        const payload = {
          name,
          gallery,
          galleryAddress,
          floor,
          stand,
          referenceLocation: referenceLocation || "Pasillo central",
          whatsapp,
          priceLevel,
          styles: selectedStyles,
          categories: selectedCategories,
          sizes: selectedSizes,
          purchaseType,
          standPhotoBase64,
          latitude,
          longitude,
          googleMapsUrl,
          instagram: instagram.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          garmentsData: garmentsDraft,
        };

        const res = await fetch("/api/admin/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setStatusMessage({
            type: "success",
            text: `¡Tienda "${name}" registrada y ${garmentsDraft.length} prendas vectorizadas exitosamente!`,
          });

          // Limpiar formulario
          handleCancelEdit();
          fetchStores();
        } else {
          setStatusMessage({ type: "error", text: data.error || "Error al registrar tienda." });
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Error de red al procesar la tienda con IA." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta tienda del catálogo?")) return;
    try {
      const res = await fetch(`/api/admin/stores?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchStores();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="min-h-screen bg-[#121214] text-gray-100 pb-16">
      {/* Header */}
      <header className="border-b border-[#24242c] bg-[#151518]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#242434] via-[#1a1a24] to-[#0f0f15] p-1.5 border border-[#343448] flex items-center justify-center shadow-md shadow-black/40 shrink-0">
                <NextImage
                  src="/logo_vibra_white.png"
                  alt="Vibra Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>VIBRA</span>
                  <span className="text-xs bg-vibra-950 text-vibra-400 font-semibold px-2 py-0.5 rounded-full border border-vibra-900/60">
                    Panel Admin
                  </span>
                </h1>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  Gestión y registro de tiendas y prendas para el catálogo
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              title="Cerrar sesión de administrador"
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================= FORMULARIO DE CARGA / EDICIÓN (7 cols) ================= */}
        <section className="lg:col-span-7 bg-[#17171e] border border-[#282834] rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#292936] mb-6">
            <div className="flex items-center gap-2.5">
              {editingStoreId ? (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Pencil className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-vibra-500/20 border border-vibra-500/30 flex items-center justify-center text-vibra-400">
                  <Plus className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {editingStoreId ? "Editar Tienda" : "Registrar Tienda"}
                  </h2>
                  {editingStoreId && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                      Modo Edición
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {editingStoreId
                    ? `Modificando los datos y prendas de "${name}"`
                    : "Ingresa los datos para registrar un stand en el catálogo"}
                </p>
              </div>
            </div>

            {editingStoreId ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202028] border border-[#2e2e3e] hover:bg-[#2c2c38] transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Cancelar edición</span>
              </button>
            ) : (
              <span className="text-xs text-vibra-300 font-medium">Vectorización automática</span>
            )}
          </div>

          {statusMessage && (
            <div
              className={`p-4 rounded-2xl mb-6 flex items-start gap-3 text-xs leading-relaxed ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                  : "bg-rose-950/40 text-rose-300 border border-rose-800/60"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre de la Tienda */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Nombre de la Tienda *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Denim Studio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
              />
            </div>

            {/* SECCIÓN DETECTOR DE UBICACIÓN GOOGLE MAPS */}
            <div className="p-4 bg-[#1b1b24] border border-[#2e2e3e] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-vibra-400" />
                  <span>Buscador de Ubicación en Google Maps *</span>
                </label>
                <span className="text-[10px] text-vibra-300 font-medium">Detector en tiempo real</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Escribe aquí cualquier calle, cuadra o galería de Lima para detectar las coordenadas exactas de Google Maps:
              </p>

              {/* Buscador de lugares con Autocomplete de Google Places */}
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-vibra-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={placeSearchInput}
                    onChange={(e) => {
                      setPlaceSearchInput(e.target.value);
                      setShowPlaceDropdown(true);
                    }}
                    onFocus={() => {
                      if (placePredictions.length > 0) setShowPlaceDropdown(true);
                    }}
                    placeholder="Escribe aquí (ej. Madre de Dios 371, Jr. Gamarra 1000, Galería Santa Rosa...)"
                    className="w-full bg-[#15151c] border border-vibra-500/50 focus:border-vibra-400 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors shadow-inner"
                  />
                  {isSearchingPlaces && (
                    <Loader2 className="w-4 h-4 text-vibra-400 animate-spin absolute right-3 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown flotante con las sugerencias reales */}
                {showPlaceDropdown && placeSearchInput.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#171722] border border-[#3c3c52] rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {isSearchingPlaces && placePredictions.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-vibra-400" />
                        <span>Consultando Google Maps en tiempo real...</span>
                      </div>
                    ) : placePredictions.length > 0 ? (
                      placePredictions.map((pred, pIdx) => (
                        <button
                          key={pred.placeId || pIdx}
                          type="button"
                          onClick={() => handleSelectPrediction(pred)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-[#252536] border-b border-[#242434] last:border-0 flex items-start gap-2.5 transition-colors group"
                        >
                          <MapPin className="w-3.5 h-3.5 text-vibra-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate group-hover:text-vibra-300 transition-colors">
                              {pred.mainText}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {pred.secondaryText || pred.fullText}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-[11px] text-gray-400">
                        No se encontraron sugerencias en Google Maps. Puedes completar los campos de Galería y Dirección abajo manualmente.
                      </div>
                    )}
                  </div>
                )}

                {/* Aviso informativo si falta la API Key en el servidor de Vercel */}
                {mapsKeyMissing && (
                  <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-200 leading-snug">
                    ⚠️ <strong>Aviso:</strong> Falta agregar la variable <code>GOOGLE_MAPS_API_KEY</code> en tu panel de Vercel (Environment Variables). Por ahora solo reconoce las 8 galerías emblemáticas de Gamarra. Puedes escribir cualquier dirección manualmente en los campos de abajo.
                  </div>
                )}
              </div>

              {/* Atajos de Galerías de Gamarra */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mr-1">
                  Galerías Gamarra:
                </span>
                {POPULAR_GAMARRA_GALLERIES.map((gal) => (
                  <button
                    key={gal.name}
                    type="button"
                    onClick={() => handleSelectQuickGallery(gal)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                      gallery === gal.name
                        ? "bg-vibra-500/20 text-vibra-300 border-vibra-500 font-bold shadow-sm"
                        : "bg-[#16161e] text-gray-300 border-[#2b2b3a] hover:bg-[#22222e] hover:border-[#38384a]"
                    }`}
                  >
                    {gal.name}
                  </button>
                ))}
              </div>

              {/* Campos confirmados de Galería y Dirección */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#292938]">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Galería *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Galería Guizado"
                    value={gallery}
                    onChange={(e) => setGallery(e.target.value)}
                    className="w-full bg-[#15151c] border border-[#2e2e3d] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Dirección exacta (Calle / Cuadra) *
                    </label>
                    {galleryAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlaceSearchInput(galleryAddress);
                          setShowPlaceDropdown(true);
                        }}
                        className="text-[10px] text-vibra-400 hover:text-vibra-300 hover:underline flex items-center gap-1 transition-colors"
                        title="Buscar esta dirección en Google Maps"
                      >
                        <Search className="w-2.5 h-2.5" />
                        <span>Detectar en mapa</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Jr. Gamarra 789, La Victoria"
                    value={galleryAddress}
                    onChange={(e) => setGalleryAddress(e.target.value)}
                    className="w-full bg-[#15151c] border border-[#2e2e3d] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
                  />
                </div>
              </div>

              {/* Indicador de Ubicación Verificada en Google Maps */}
              {(latitude || googleMapsUrl) && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-emerald-300 font-medium">
                      Punto verificado en Google Maps {latitude && longitude ? `(${latitude.toFixed(4)}, ${longitude.toFixed(4)})` : ""}
                    </span>
                  </div>
                  <a
                    href={
                      googleMapsUrl ||
                      (latitude && longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gallery}, ${galleryAddress}`)}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-vibra-300 hover:text-white px-2 py-1 rounded-lg bg-[#252535] hover:bg-[#2d2d40] transition-colors"
                  >
                    <span>Probar mapa</span>
                    <ExternalLink className="w-3 h-3 text-vibra-400" />
                  </a>
                </div>
              )}
            </div>

            {/* Piso, Stand y WhatsApp */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Piso</label>
                <input
                  type="text"
                  placeholder="Ej. 2"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vibra-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Stand *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 208"
                  value={stand}
                  onChange={(e) => setStand(e.target.value)}
                  className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vibra-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">WhatsApp</label>
                <input
                  type="text"
                  placeholder="51987654321"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vibra-500"
                />
              </div>
            </div>

            {/* Referencia física */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Referencia de ubicación física
              </label>
              <input
                type="text"
                placeholder="Ej. Escalera norte, frente a patio de comidas"
                value={referenceLocation}
                onChange={(e) => setReferenceLocation(e.target.value)}
                className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
              />
            </div>

            {/* Redes Sociales: Instagram y TikTok (Opcionales) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Instagram <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold select-none">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="tienda.gamarra"
                    value={instagram.replace(/^@/, "")}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^@/, "");
                      setInstagram(val ? `@${val}` : "");
                    }}
                    className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  TikTok <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold select-none">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="tienda_tiktok"
                    value={tiktok.replace(/^@/, "")}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^@/, "");
                      setTiktok(val ? `@${val}` : "");
                    }}
                    className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-vibra-500"
                  />
                </div>
              </div>
            </div>

            {/* Nivel de Precio y Modalidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Nivel de Precio
                </label>
                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value as PriceLevel)}
                  className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vibra-500 cursor-pointer"
                >
                  <option value="economico">S/ · Económico</option>
                  <option value="medio">S/ S/ · Medio</option>
                  <option value="alto">S/ S/ S/ · Alto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Modalidad de Compra
                </label>
                <select
                  value={purchaseType}
                  onChange={(e) => setPurchaseType(e.target.value as PurchaseType)}
                  className="w-full bg-[#1e1e27] border border-[#30303e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vibra-500 cursor-pointer"
                >
                  <option value="cualquiera">Cualquiera (Tienda y envío)</option>
                  <option value="envio">Solo con envío</option>
                  <option value="presencial">Solo presencial</option>
                </select>
              </div>
            </div>

            {/* Estilos que declara la tienda */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">
                Estilos de la tienda (marcar de 1 a 3)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES_LIST.map((style) => {
                  const isSelected = selectedStyles.includes(style);
                  return (
                    <button
                      type="button"
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                        isSelected
                          ? "bg-vibra-500 text-white font-bold"
                          : "bg-[#20202a] text-gray-300 border border-[#2d2d3c] hover:bg-[#292936]"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorías que vende */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">
                Categorías de ropa que vende
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES_LIST.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                        isSelected
                          ? "bg-white text-gray-950 font-bold"
                          : "bg-[#20202a] text-gray-300 border border-[#2d2d3c] hover:bg-[#292936]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN DE PRENDAS ACTUALES (EN MODO EDICIÓN) */}
            {editingStoreId && (
              <div className="pt-4 border-t border-[#292936]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white block">
                    Prendas actuales en catálogo ({existingGarments.length})
                  </label>
                  <span className="text-[11px] text-amber-400 font-medium">
                    Puedes renombrar, cambiar categoría o eliminar
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-3">
                  Estas prendas ya están vectorizadas en la tienda. Puedes modificar su nombre o categoría, o eliminarlas con el botón rojo.
                </p>

                {existingGarments.length === 0 ? (
                  <div className="p-3 bg-[#1f1a1a] border border-rose-900/40 rounded-xl text-xs text-rose-300">
                    Has removido todas las prendas existentes. Debes subir al menos 1 prenda nueva abajo antes de guardar.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {existingGarments.map((g) => (
                      <div
                        key={g.id}
                        className="bg-[#20202a] p-2.5 rounded-2xl border border-[#2e2e3e] flex flex-col relative group"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingGarment(g.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-950/80 text-rose-300 flex items-center justify-center hover:bg-rose-900 transition-colors z-10"
                          title="Eliminar prenda del catálogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-full h-24 bg-[#f1ece7] rounded-xl flex items-center justify-center p-1 overflow-hidden mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.photoUrl}
                            alt={g.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <input
                          type="text"
                          value={g.name}
                          onChange={(e) => handleUpdateExistingGarmentName(g.id, e.target.value)}
                          placeholder="Nombre prenda"
                          className="w-full bg-[#181820] border border-[#2f2f3d] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-vibra-500 mb-1"
                        />

                        <select
                          value={g.category}
                          onChange={(e) => handleUpdateExistingGarmentCategory(g.id, e.target.value)}
                          className="w-full bg-[#181820] border border-[#2f2f3d] rounded-lg px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none cursor-pointer"
                        >
                          {CATEGORIES_LIST.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN DE AGREGAR PRENDAS PARA VECTORIZAR */}
            <div className="pt-4 border-t border-[#292936]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white block">
                  {editingStoreId
                    ? "Agregar Nuevas Prendas al Catálogo"
                    : "Fotos de Prendas para el Catálogo *"}
                </label>
                <span className="text-[11px] text-vibra-300 font-semibold">
                  {garmentsDraft.length} prendas por subir
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                {editingStoreId
                  ? "Sube fotos adicionales. La IA de Gemini generará sus vectores matemáticos y las agregará al catálogo."
                  : "Sube fotos de ropa desde tu computadora o internet. La IA generará su vector matemático para que las clientas las puedan encontrar."}
              </p>

              {/* Botón de carga múltiple */}
              <label className="w-full h-24 border-2 border-dashed border-[#343444] hover:border-vibra-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#1a1a23] hover:bg-[#21212d]">
                {isReadingGarments ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                    <Loader2 className="w-6 h-6 text-vibra-400 animate-spin" />
                    <span className="text-xs font-bold text-white">Cargando fotos seleccionadas...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-vibra-400 mb-1" />
                    <span className="text-xs font-bold text-gray-200">
                      {editingStoreId
                        ? "Subir nuevas fotos de prendas para sumar a la tienda"
                        : "Subir fotos de prendas (puedes seleccionar varias)"}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">JPG, PNG o WebP</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGarmentFileChange}
                  className="hidden"
                />
              </label>

              {/* Lista de prendas preparadas para subir */}
              {garmentsDraft.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {garmentsDraft.map((g, idx) => (
                    <div
                      key={idx}
                      className="bg-[#20202a] p-2.5 rounded-2xl border border-[#2e2e3e] flex flex-col relative group"
                    >
                      <button
                        type="button"
                        onClick={() => removeGarmentDraft(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-950/80 text-rose-300 flex items-center justify-center hover:bg-rose-900 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-full h-24 bg-[#f1ece7] rounded-xl flex items-center justify-center p-1 overflow-hidden mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.imageBase64}
                          alt={g.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <input
                        type="text"
                        value={g.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGarmentsDraft((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                        placeholder="Nombre prenda"
                        className="w-full bg-[#181820] border border-[#2f2f3d] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-vibra-500 mb-1"
                      />

                      <select
                        value={g.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGarmentsDraft((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, category: val } : item))
                          );
                        }}
                        className="w-full bg-[#181820] border border-[#2f2f3d] rounded-lg px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none cursor-pointer"
                      >
                        {CATEGORIES_LIST.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Foto del Stand (Opcional) */}
            <div className="pt-4 border-t border-[#292936]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <StoreIcon className="w-4 h-4 text-vibra-400" />
                  Foto del Frontis del Stand (Opcional)
                </label>
                <span className="text-[10px] text-gray-500 font-medium">Recomendado</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Sube una foto del letrero o fachada de tu stand en la galería. Ayuda a que las clientas reconozcan el puesto físicamente en los pasillos de Gamarra.
              </p>

              {standPhotoBase64 || currentStandPhotoUrl ? (
                <div className="p-3 bg-[#1a1a23] border border-[#2e2e3d] rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-44 h-28 bg-[#121216] rounded-xl overflow-hidden border border-[#38384a] flex-shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={standPhotoBase64 || currentStandPhotoUrl || ""}
                      alt="Frontis del stand"
                      className="w-full h-full object-cover"
                    />
                    {standPhotoBase64 && (
                      <span className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow">
                        NUEVA
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      {standPhotoBase64 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-300">
                            Nueva foto seleccionada
                          </span>
                        </>
                      ) : (
                        <>
                          <StoreIcon className="w-4 h-4 text-vibra-400" />
                          <span className="text-xs font-semibold text-gray-200">
                            Foto actual del stand
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      {standPhotoBase64
                        ? "Esta imagen se subirá a Supabase Storage y se asignará al stand al guardar la tienda."
                        : "Esta foto ya está guardada y se muestra a las clientas en la ficha y mapa del stand."}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#252535] hover:bg-[#2e2e42] border border-[#3d3d52] rounded-xl text-xs font-semibold text-vibra-300 hover:text-white transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{standPhotoBase64 ? "Elegir otra foto" : "Cambiar foto del stand"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStandFileChange}
                          className="hidden"
                        />
                      </label>
                      {standPhotoBase64 && (
                        <button
                          type="button"
                          onClick={() => setStandPhotoBase64(null)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#25191f] hover:bg-[#321c25] border border-rose-900/50 rounded-xl text-xs font-medium text-rose-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Descartar cambio</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <label className="w-full h-28 border-2 border-dashed border-[#343444] hover:border-vibra-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#1a1a23] hover:bg-[#21212d] group">
                  {isReadingStand ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                      <Loader2 className="w-6 h-6 text-vibra-400 animate-spin" />
                      <span className="text-xs font-bold text-white">Cargando foto del stand...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-[#262633] group-hover:bg-vibra-500/20 text-vibra-400 flex items-center justify-center mb-1.5 transition-colors">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-200">
                        Subir foto del frontis del stand
                      </span>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        JPG, PNG o WebP · Foto del letrero, pasillo o fachada del puesto
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStandFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Botón Guardar / Actualizar */}
            <div className="flex items-center gap-3">
              {editingStoreId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-6 py-4 bg-[#23232e] hover:bg-[#2c2c3a] text-gray-300 font-semibold rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 py-4 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  editingStoreId
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-950/40 text-white"
                    : "bg-vibra-500 hover:bg-vibra-600 shadow-vibra-950/40 text-white"
                } active:scale-[0.99]`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {garmentsDraft.length > 0
                        ? "Vectorizando nuevas prendas con Gemini..."
                        : "Guardando cambios en la tienda..."}
                    </span>
                  </>
                ) : editingStoreId ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {garmentsDraft.length > 0
                        ? `Actualizar Tienda y Vectorizar ${garmentsDraft.length} Nuevas Prendas`
                        : "Actualizar Información de la Tienda"}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Guardar Tienda y Vectorizar Prendas</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ================= LISTADO DE TIENDAS EXISTENTES (5 cols) ================= */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#17171e] border border-[#282834] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292936] mb-4">
              <div className="flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-vibra-400" />
                <h3 className="text-base font-bold text-white">Catálogo ({stores.length})</h3>
              </div>
              <span className="text-[11px] text-gray-500">Tiendas activas</span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Cargando tiendas...</div>
            ) : stores.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                No hay tiendas registradas aún.
              </div>
            ) : (
              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                {stores.map((s) => (
                  <div
                    key={s.id}
                    className={`p-4 bg-[#1e1e27] border rounded-2xl flex flex-col gap-2 relative group transition-colors ${
                      editingStoreId === s.id
                        ? "border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30"
                        : "border-[#2c2c3b] hover:border-[#3e3e50]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{s.name}</h4>
                          {editingStoreId === s.id && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                              Editando
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {s.gallery} · Piso {s.floor} · Stand {s.stand}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                            editingStoreId === s.id
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "text-gray-400 hover:text-white hover:bg-[#282836]"
                          }`}
                          title="Editar información y prendas de la tienda"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStore(s.id)}
                          className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#282836] transition-colors"
                          title="Eliminar tienda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Miniaturas de prendas guardadas */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {s.garments.map((g) => (
                        <div
                          key={g.id}
                          className="w-10 h-12 bg-[#f1ece7] rounded-lg shrink-0 flex items-center justify-center p-0.5 border border-[#3b3b4a]"
                          title={`${g.name} (${g.category})`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.photoUrl}
                            alt={g.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ))}
                      <span className="text-[10px] text-vibra-300 font-semibold pl-1">
                        {s.garments.length} prendas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.styles.map((st) => (
                        <span
                          key={st}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-[#282836] text-gray-300"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
