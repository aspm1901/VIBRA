"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  RadarArcIcon,
  VibraBrandLogo,
  ResonanceSweepLoader,
  ResonanceEmptyNode,
} from "@/components/RadarArcIcon";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { SearchResultItem, PriceLevel, PurchaseType } from "@/types";
import {
  Sparkles,
  Camera,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Heart,
  Zap,
  Layers,
  SlidersHorizontal,
  MessageCircle,
  Shirt,
  ExternalLink,
  ChevronRight,
  Navigation,
  Compass,
  Plus,
  Check,
} from "lucide-react";
import { RouteProvider, useRoute } from "@/components/RouteContext";
import { RouteDrawer } from "@/components/RouteDrawer";

const STYLES = [
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

const STYLE_PRESETS = [
  {
    id: "noche-fiesta",
    title: "Noche y fiesta",
    iconName: "Sparkles",
    styles: ["Fiesta", "Elegante"],
    desc: "Vestidos de fiesta, satén, brillo y eventos",
  },
  {
    id: "streetwear-urbano",
    title: "Streetwear urbano",
    iconName: "Layers",
    styles: ["Urbano", "Casual"],
    desc: "Denim, casacas, wide leg y estilo relajado",
  },
  {
    id: "oficina-minimal",
    title: "Oficina minimal",
    iconName: "Briefcase",
    styles: ["Oficina", "Minimalista", "Elegante"],
    desc: "Sastrería, blusas limpias, palazzos y blazers",
  },
  {
    id: "romantico-chic",
    title: "Romántico chic",
    iconName: "Heart",
    styles: ["Romántico", "Casual"],
    desc: "Prendas fluidas, detalles delicados y tonos suaves",
  },
  {
    id: "y2k-atrevido",
    title: "Y2K y en tendencia",
    iconName: "Zap",
    styles: ["Y2K", "Fiesta"],
    desc: "Corsets, tops entallados y cortes en tendencia",
  },
];

const EXAMPLES = [
  {
    id: "look_sastre",
    title: "Look sastre",
    fullTitle: "Look sastre chic (Blazer + Palazzo)",
    category: "Look completo / Outfit",
    styles: ["Elegante", "Oficina", "Minimalista"],
    image: "/images/garments/look_sastre_chic.jpg",
    isLook: true,
  },
  {
    id: "casaca_denim",
    title: "Casaca denim",
    fullTitle: "Casaca denim clásica",
    category: "Casacas y abrigos",
    styles: ["Urbano", "Casual"],
    image: "/images/garments/casaca_denim_clasica.jpg",
    isLook: false,
  },
  {
    id: "vestido_burdeos",
    title: "Vestido fiesta",
    fullTitle: "Vestido burdeos de fiesta",
    category: "Vestidos",
    styles: ["Fiesta", "Elegante"],
    image: "/images/garments/vestido_burdeos.jpg",
    isLook: false,
  },
  {
    id: "jean_celeste",
    title: "Jean celeste",
    fullTitle: "Jean celeste urbano",
    category: "Jeans y pantalones",
    styles: ["Urbano", "Casual"],
    image: "/images/garments/jean_celeste.jpg",
    isLook: false,
  },
  {
    id: "chompa_amarilla",
    title: "Chompa tejida",
    fullTitle: "Chompa mostaza tejida",
    category: "Chompas",
    styles: ["Casual", "Minimalista"],
    image: "/images/garments/chompa_amarilla.jpg",
    isLook: false,
  },
];

function VibraApp() {
  const {
    routeItems,
    addToRoute,
    removeFromRoute,
    isInRoute,
    setIsRouteDrawerOpen,
    user,
    signInWithGoogle,
  } = useRoute();

  // Estado de modo
  const [searchMode, setSearchMode] = useState<"prenda" | "look" | "estilo">("prenda");
  const [inputType, setInputType] = useState<"foto" | "estilo">("foto");

  // Estado de la imagen
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [currentImageBase64, setCurrentImageBase64] = useState<string | null>(null);
  const [selectedExampleId, setSelectedExampleId] = useState<string>("vestido_burdeos");
  const [currentImagePreview, setCurrentImagePreview] = useState<string>(
    "/images/garments/vestido_burdeos.jpg"
  );
  const [garmentTitle, setGarmentTitle] = useState<string>("Vestido burdeos de fiesta");

  // Filtros activos
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>("Vestidos");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["Fiesta", "Elegante"]);
  const [selectedPrice, setSelectedPrice] = useState<PriceLevel | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<PurchaseType>("cualquiera");

  // Detección pura de la IA
  const [detectedInfo, setDetectedInfo] = useState<{
    category?: string;
    styles?: string[];
    garmentTitle?: string;
  }>({
    category: "Vestidos",
    styles: ["Fiesta", "Elegante"],
    garmentTitle: "Vestido burdeos de fiesta",
  });

  // UI States
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStoreItem, setSelectedStoreItem] = useState<SearchResultItem | null>(null);

  // Resultados
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedGalleryFilter, setSelectedGalleryFilter] = useState<string>("todas");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    executeSearch({ exampleId: "vestido_burdeos" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeSearch = async (overrideParams?: {
    image?: string;
    exampleId?: string;
    overrideCategory?: string;
    overrideStyles?: string[];
    overrideSearchMode?: "prenda" | "look" | "estilo";
    isManualFilterRefinement?: boolean;
  }) => {
    try {
      setIsSearching(true);

      const activeSearchMode =
        overrideParams?.overrideSearchMode !== undefined
          ? overrideParams.overrideSearchMode
          : inputType === "estilo"
          ? "estilo"
          : searchMode;

      const isNewUpload = !!overrideParams?.image;

      const categoryToSend = isNewUpload
        ? undefined
        : overrideParams?.overrideCategory !== undefined
        ? overrideParams.overrideCategory
        : selectedCategory;

      const stylesToSend = isNewUpload
        ? undefined
        : overrideParams?.overrideStyles !== undefined
        ? overrideParams.overrideStyles
        : selectedStyles;

      const payload: any = {
        isManualFilterRefinement: overrideParams?.isManualFilterRefinement ?? false,
        filters: {
          category: categoryToSend,
          styles: stylesToSend,
          priceLevel: selectedPrice,
          size: selectedSize,
          purchaseType: selectedPurchaseType,
          searchMode: activeSearchMode,
        },
      };

      if (activeSearchMode === "estilo") {
        // Búsqueda por estilo
      } else if (overrideParams?.image) {
        payload.image = overrideParams.image;
      } else if (currentImageBase64) {
        payload.image = currentImageBase64;
      } else {
        payload.exampleId = overrideParams?.exampleId || selectedExampleId;
      }

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.qualifiedResults || []);

        if (data.detectedInfo) {
          setDetectedInfo(data.detectedInfo);

          if (data.detectedInfo.garmentTitle) {
            setGarmentTitle(data.detectedInfo.garmentTitle);
          }

          if (!overrideParams?.isManualFilterRefinement && activeSearchMode !== "estilo") {
            if (data.detectedInfo.category) {
              setSelectedCategory(data.detectedInfo.category);
            }
            if (data.detectedInfo.styles && data.detectedInfo.styles.length > 0) {
              setSelectedStyles(data.detectedInfo.styles);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error al buscar tiendas:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExample = (ex: (typeof EXAMPLES)[0]) => {
    setSelectedExampleId(ex.id);
    setCurrentImageBase64(null);
    setCurrentImagePreview(ex.image);
    setGarmentTitle(ex.fullTitle);
    setSelectedCategory(ex.category);
    setSelectedStyles(ex.styles);
    const targetMode = ex.isLook ? "look" : "prenda";
    setSearchMode(targetMode);
    setDetectedInfo({
      category: ex.category,
      styles: ex.styles,
      garmentTitle: ex.fullTitle,
    });
    executeSearch({
      exampleId: ex.id,
      overrideCategory: ex.category,
      overrideStyles: ex.styles,
      overrideSearchMode: targetMode,
    });
  };

  const compressImageClient = (base64: string, maxDim = 640): Promise<string> => {
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const optimizedBase64 = await compressImageClient(rawBase64);

      if (searchMode === "look") {
        setCurrentImageBase64(optimizedBase64);
        setCurrentImagePreview(optimizedBase64);
        setSelectedExampleId("");
        setGarmentTitle("Analizando look completo...");
        executeSearch({
          image: optimizedBase64,
          overrideSearchMode: "look",
        });
      } else {
        setRawImageForCrop(optimizedBase64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const optimizedBase64 = await compressImageClient(rawBase64);

      if (searchMode === "look") {
        setCurrentImageBase64(optimizedBase64);
        setCurrentImagePreview(optimizedBase64);
        setSelectedExampleId("");
        setGarmentTitle("Analizando look completo...");
        executeSearch({
          image: optimizedBase64,
          overrideSearchMode: "look",
        });
      } else {
        setRawImageForCrop(optimizedBase64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBase64: string) => {
    setRawImageForCrop(null);
    setCurrentImageBase64(croppedBase64);
    setCurrentImagePreview(croppedBase64);
    setSelectedExampleId("");
    setGarmentTitle(
      searchMode === "look" ? "Analizando look completo..." : "Analizando prenda..."
    );
    executeSearch({
      image: croppedBase64,
      overrideSearchMode: searchMode,
    });
  };

  const toggleStyle = (style: string) => {
    const updated = selectedStyles.includes(style)
      ? selectedStyles.filter((s) => s !== style)
      : [...selectedStyles, style];
    setSelectedStyles(updated);
    if (inputType === "estilo") {
      executeSearch({
        overrideStyles: updated,
        overrideSearchMode: "estilo",
        isManualFilterRefinement: true,
      });
    }
  };

  const renderPresetIcon = (iconName: string, isActive: boolean) => {
    const iconClass = `w-4 h-4 ${
      isActive ? "text-higo-70" : "text-grafito-55"
    } transition-colors`;
    switch (iconName) {
      case "Sparkles":
        return <Sparkles className={iconClass} />;
      case "Layers":
        return <Layers className={iconClass} />;
      case "Briefcase":
        return <Briefcase className={iconClass} />;
      case "Heart":
        return <Heart className={iconClass} />;
      case "Zap":
        return <Zap className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const availableGalleries = Array.from(new Set(results.map((r) => r.store.gallery)));
  const displayedResults =
    selectedGalleryFilter === "todas"
      ? results
      : results.filter((r) => r.store.gallery === selectedGalleryFilter);

  return (
    <div className="min-h-screen bg-caliza-5 text-basalto-90 flex flex-col">
      {/* Barra de navegación superior sobre espina Caliza */}
      <header className="border-b border-caliza-20 bg-caliza-5/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="focus:outline-none py-1">
            <VibraBrandLogo showIsotipo={true} />
          </Link>

          <div className="flex items-center gap-3">
            {/* Botón 'Tu ruta' en familia espacial Neblina */}
            <button
              type="button"
              onClick={() => setIsRouteDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full neu-chip text-neblina-70 text-xs sm:text-[13px] font-medium hover:border-neblina-70 transition-all duration-180 ease-vibra active:scale-95"
              aria-label="Abrir mi ruta por galería"
            >
              <Compass className="w-4 h-4 text-neblina-70" />
              <span>Tu ruta</span>
              {routeItems.length > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-neblina-70 text-white text-[11px] font-semibold tabular-nums flex items-center justify-center">
                  {routeItems.length}
                </span>
              )}
            </button>

            {/* Perfil o Acceso con Google */}
            {user ? (
              <button
                type="button"
                onClick={() => setIsRouteDrawerOpen(true)}
                className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full neu-chip text-xs transition-all"
                title={user.email || "Tu cuenta"}
              >
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email || "Usuario"}
                    className="w-6 h-6 rounded-full object-cover border border-higo-30"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-higo-70 text-white font-semibold flex items-center justify-center text-[11px]">
                    {(user.email?.[0] || "u").toLowerCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-basalto-90 max-w-[90px] truncate">
                  {user.user_metadata?.full_name?.split(" ")[0] || "Perfil"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full neu-chip text-grafito-55 hover:text-basalto-90 text-xs font-medium transition-all active:scale-95"
                title="Iniciar sesión con Google para sincronizar tu ruta"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Guardar ruta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor Principal (Retícula 12 columnas max 1200px, pág. 11) */}
      <main className="max-w-[1200px] mx-auto px-5 md:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* ================= COLUMNA IZQUIERDA: CAPTURA Y FILTROS (5 de 12 cols) ================= */}
        <section className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24 self-start">
          {/* Display y Cuerpo (Escala modular pág. 10) */}
          <div>
            <h1
              className="font-display font-bold text-[38px] leading-[40px] sm:text-[46px] sm:leading-[48px] text-basalto-90"
              style={{ letterSpacing: "-0.035em" }}
            >
              Muéstralo. <br />
              Encuéntralo cerca.
            </h1>
            <p className="text-[15px] leading-[24px] text-grafito-55 mt-3 max-w-md font-normal">
              Sube una foto de una prenda o de un look completo. Vibra la compara con las
              imágenes que publican los comerciantes y ordena las tiendas que resuenan con
              más intensidad.
            </p>
          </div>

          {/* Selector de modo: Pozo hundido en Caliza 10 con pestaña activa elevada */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl neu-sunken">
            <button
              type="button"
              onClick={() => {
                setInputType("foto");
                setSearchMode("prenda");
                executeSearch({ overrideSearchMode: "prenda" });
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition-all duration-180 ease-vibra flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                inputType === "foto" && searchMode === "prenda"
                  ? "bg-[#F6F7F3] text-basalto-90 border border-higo-70/50 shadow-xs font-semibold"
                  : "text-grafito-55 hover:text-basalto-90 border border-transparent"
              }`}
            >
              <Shirt
                className={`w-4 h-4 ${
                  inputType === "foto" && searchMode === "prenda"
                    ? "text-higo-70"
                    : "text-grafito-55"
                }`}
              />
              <span className="text-xs sm:text-[13px] block">Una prenda</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInputType("foto");
                setSearchMode("look");
                executeSearch({ overrideSearchMode: "look" });
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition-all duration-180 ease-vibra flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                inputType === "foto" && searchMode === "look"
                  ? "bg-[#F6F7F3] text-basalto-90 border border-higo-70/50 shadow-xs font-semibold"
                  : "text-grafito-55 hover:text-basalto-90 border border-transparent"
              }`}
            >
              <Layers
                className={`w-4 h-4 ${
                  inputType === "foto" && searchMode === "look"
                    ? "text-higo-70"
                    : "text-grafito-55"
                }`}
              />
              <span className="text-xs sm:text-[13px] block">Look completo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInputType("estilo");
                executeSearch({ overrideSearchMode: "estilo", overrideStyles: selectedStyles });
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition-all duration-180 ease-vibra flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                inputType === "estilo"
                  ? "bg-[#F6F7F3] text-basalto-90 border border-higo-70/50 shadow-xs font-semibold"
                  : "text-grafito-55 hover:text-basalto-90 border border-transparent"
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${
                  inputType === "estilo" ? "text-higo-70" : "text-grafito-55"
                }`}
              />
              <span className="text-xs sm:text-[13px] block">Por estilo</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODO FOTO: POZO DE CAPTURA (PÁG. 11 y 12 DEL MANUAL)     */}
          {/* ======================================================== */}
          {inputType === "foto" ? (
            <div className="space-y-5">
              {/* Pozo de captura hundido (Caliza 10) con máscara orgánica superelipse uniforme */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="neu-sunken rounded-3xl p-6 flex flex-col items-center justify-center text-center relative"
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-44 h-52 flex items-center justify-center p-4 cursor-pointer group transition-transform overflow-hidden relative organic-mask ${
                    isSearching ? "organic-mask-active" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImagePreview}
                    alt="Referencia de búsqueda"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-basalto-90/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="w-6 h-6 mb-1 text-caliza-5" />
                    <span className="text-xs font-medium">Cambiar foto</span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <h3
                  className="font-display font-medium text-[19px] leading-[25px] text-basalto-90 mt-4"
                  style={{ letterSpacing: "-0.008em" }}
                >
                  {garmentTitle || "Suelta una foto del look"}
                </h3>
                <p className="text-[13px] leading-[19px] text-grafito-55 mt-1 max-w-xs">
                  Una prenda, un conjunto o una captura de pantalla. Un fondo limpio ayuda.
                </p>

                {/* Botón principal en Higo 70 con texto blanco */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-6 py-2.5 min-h-[44px] rounded-full bg-higo-70 hover:bg-vibra-600 text-white text-[13px] sm:text-[14px] font-medium flex items-center gap-2 transition-all duration-180 ease-vibra active:scale-95 shadow-xs"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>
                    {searchMode === "look" ? "Elegir foto de look" : "Elegir una foto"}
                  </span>
                </button>

                {/* Chips detectados por IA */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-5 pt-4 border-t border-caliza-20 w-full">
                  <span className="text-[12px] font-medium text-grafito-55">
                    Lectura visual:
                  </span>
                  {detectedInfo.category && (
                    <span className="text-[12px] px-3 py-1 rounded-full bg-higo-30 text-basalto-90 font-medium">
                      {detectedInfo.category}
                    </span>
                  )}
                  {(detectedInfo.styles && detectedInfo.styles.length > 0
                    ? detectedInfo.styles
                    : selectedStyles
                  ).map((style) => (
                    <span
                      key={style}
                      className="text-[12px] px-3 py-1 rounded-full bg-[#F6F7F3] text-basalto-90 border border-caliza-20 font-normal"
                    >
                      {style}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] leading-[17px] text-grafito-55 mt-3">
                  Comparamos tu foto con las imágenes publicadas por cada tienda. No consultamos su inventario.
                </p>
              </div>

              {/* Referencias de ejemplo sobre Caliza */}
              <div>
                <span className="text-[13px] font-medium text-basalto-90 block mb-2.5">
                  {searchMode === "look"
                    ? "Probar con un look de referencia"
                    : "Probar con una prenda de ejemplo"}
                </span>
                <div className="grid grid-cols-4 gap-2.5">
                  {(searchMode === "look" ? EXAMPLES : EXAMPLES.filter((e) => !e.isLook))
                    .slice(0, 4)
                    .map((ex) => {
                      const isSelected = selectedExampleId === ex.id;
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => handleSelectExample(ex)}
                          className={`p-2 rounded-2xl flex flex-col items-center text-center transition-all duration-180 ease-vibra ${
                            isSelected ? "neu-chip-active" : "neu-chip hover:border-basalto-90/30"
                          }`}
                        >
                          <div className="w-full h-16 rounded-xl flex items-center justify-center p-1.5 overflow-hidden mb-1.5 photo-frame">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ex.image}
                              alt={ex.fullTitle}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <span className="text-[11px] font-medium text-basalto-90 truncate w-full block">
                            {ex.title}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Estilos interactivos */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[13px] font-medium text-basalto-90">
                    Afinar estilos{" "}
                    <span className="text-grafito-55 text-[12px] font-normal">
                      (detectados en la imagen)
                    </span>
                  </span>
                  <span className="text-[12px] text-higo-70 font-medium tabular-nums">
                    {selectedStyles.length} activos
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStyle(st)}
                        className={`text-[13px] px-3.5 py-1.5 min-h-[36px] rounded-full transition-all duration-180 ease-vibra ${
                          isSelected
                            ? "neu-chip-active font-semibold"
                            : "neu-chip text-basalto-90 font-normal hover:border-basalto-90/30"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* MODO ESTILO: EXPLORACIÓN SIN FOTO                        */
            /* ======================================================== */
            <div className="space-y-5">
              <div className="neu-sunken rounded-3xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-higo-30 text-higo-70 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[12px] text-grafito-55 font-medium block">
                      Exploración por estética
                    </span>
                    <h3 className="font-display text-[19px] leading-[25px] font-medium text-basalto-90">
                      Elige el estilo que buscas
                    </h3>
                  </div>
                </div>
                <p className="text-[13px] leading-[19px] text-grafito-55">
                  Selecciona una combinación rápida o marca los estilos debajo para ordenar las tiendas de Gamarra que trabajan esa línea.
                </p>

                <div className="mt-4 pt-4 border-t border-caliza-20">
                  <span className="text-[12px] font-medium text-basalto-90 block mb-2.5">
                    Combinaciones frecuentes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {STYLE_PRESETS.map((preset) => {
                      const isActive = preset.styles.every((s) => selectedStyles.includes(s));
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyles(preset.styles);
                            executeSearch({
                              overrideStyles: preset.styles,
                              overrideSearchMode: "estilo",
                              isManualFilterRefinement: true,
                            });
                          }}
                          className={`p-3 rounded-2xl text-left transition-all duration-180 ease-vibra ${
                            isActive
                              ? "neu-chip-active"
                              : "neu-chip hover:border-basalto-90/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {renderPresetIcon(preset.iconName, isActive)}
                            <span className="text-[13px] font-semibold text-basalto-90 block">
                              {preset.title}
                            </span>
                          </div>
                          <span className="text-[11px] leading-[16px] text-grafito-55 block">
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="neu-elevated rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[13px] font-medium text-basalto-90 block">
                      Todos los estilos
                    </span>
                    <span className="text-[11px] text-grafito-55">
                      Toca para activar o quitar estilos
                    </span>
                  </div>
                  <span className="text-[12px] text-higo-70 font-medium px-2.5 py-0.5 rounded-full bg-higo-30 tabular-nums">
                    {selectedStyles.length} activos
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStyle(st)}
                        className={`text-[13px] px-3.5 py-1.5 rounded-full transition-all duration-180 ease-vibra ${
                          isSelected
                            ? "neu-chip-active font-semibold"
                            : "neu-chip text-basalto-90 font-normal"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bloque Común de Filtros: Precio, Tallas y Tipo de Compra */}
          <div className="space-y-4 pt-1">
            <div>
              <span className="text-[13px] font-medium text-basalto-90 block mb-2">
                Nivel de precio
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "economico", name: "Económico", symbol: "S/" },
                  { id: "medio", name: "Medio", symbol: "S/S/" },
                  { id: "alto", name: "Alto", symbol: "S/S/S/" },
                ].map((p) => {
                  const isSelected = selectedPrice === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const newPrice = isSelected ? undefined : (p.id as PriceLevel);
                        setSelectedPrice(newPrice);
                      }}
                      className={`text-[13px] px-4 py-1.5 min-h-[36px] rounded-full transition-all duration-180 ease-vibra inline-flex items-center gap-1.5 ${
                        isSelected
                          ? "neu-chip-active font-semibold"
                          : "neu-chip text-basalto-90 font-normal"
                      }`}
                    >
                      <span className="text-[12px] text-grafito-55 tabular-nums">{p.symbol}</span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desplegable de Tallas y Modalidad */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="text-[13px] text-grafito-55 hover:text-basalto-90 flex items-center gap-1 font-medium transition-colors"
              >
                <span>
                  {showMoreFilters
                    ? "Ocultar filtros de talla y modalidad"
                    : "Filtrar por talla o modalidad de compra"}
                </span>
                {showMoreFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showMoreFilters && (
                <div className="space-y-3 mt-3 p-4 neu-sunken rounded-2xl">
                  <div>
                    <span className="text-[12px] font-medium text-grafito-55 block mb-1.5">
                      Talla
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["XS", "S", "M", "L", "XL", "Estándar"].map((tz) => {
                        const isSelected = selectedSize === tz;
                        return (
                          <button
                            key={tz}
                            type="button"
                            onClick={() => setSelectedSize(isSelected ? undefined : tz)}
                            className={`text-[12px] px-3 py-1.5 rounded-lg transition-all ${
                              isSelected
                                ? "bg-higo-70 text-white font-semibold"
                                : "bg-[#F6F7F3] text-basalto-90 border border-caliza-20 hover:border-caliza-30"
                            }`}
                          >
                            {tz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[12px] font-medium text-grafito-55 block mb-1.5">
                      Modalidad de compra
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "cualquiera", label: "Cualquiera" },
                        { id: "envio", label: "Con envío" },
                        { id: "presencial", label: "Solo en tienda" },
                      ].map((tc) => {
                        const isSelected = selectedPurchaseType === tc.id;
                        return (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => setSelectedPurchaseType(tc.id as PurchaseType)}
                            className={`text-[12px] px-3 py-1.5 rounded-lg transition-all ${
                              isSelected
                                ? "bg-higo-70 text-white font-semibold"
                                : "bg-[#F6F7F3] text-basalto-90 border border-caliza-20 hover:border-caliza-30"
                            }`}
                          >
                            {tc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Principal de Acción en Higo 70 con texto blanco */}
            <button
              type="button"
              onClick={() => executeSearch({ isManualFilterRefinement: true })}
              disabled={isSearching}
              className="w-full py-3.5 px-6 min-h-[48px] rounded-2xl bg-higo-70 hover:bg-vibra-600 active:scale-[0.99] text-white font-medium text-[14px] transition-all duration-180 ease-vibra flex items-center justify-center gap-2 shadow-xs mt-2"
            >
              {isSearching ? (
                <span>Calculando resonancia con los catálogos...</span>
              ) : (
                <span>
                  {inputType === "estilo"
                    ? "Actualizar ranking por estilo"
                    : searchMode === "look"
                    ? "Actualizar tiendas para este look"
                    : "Actualizar ranking de tiendas"}
                </span>
              )}
            </button>
          </div>
        </section>

        {/* ================= COLUMNA DERECHA: RANKING DE AFINIDAD (7 de 12 cols) ================= */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* H2 Sección (Escala modular pág. 10 y 12) */}
          <div>
            <h2
              className="font-display font-semibold text-[28px] leading-[32px] sm:text-[36px] sm:leading-[40px] text-basalto-90"
              style={{ letterSpacing: "-0.025em" }}
            >
              {inputType === "estilo"
                ? `${displayedResults.length} ${
                    displayedResults.length === 1 ? "tienda resuena" : "tiendas resuenan"
                  } con tu estilo`
                : `${displayedResults.length} ${
                    displayedResults.length === 1 ? "tienda resuena" : "tiendas resuenan"
                  } con tu foto`}
            </h2>
            <p className="text-[13px] leading-[19px] font-medium text-grafito-55 mt-1">
              Agrupadas por galería, de mayor a menor resonancia
            </p>
          </div>

          {/* Chips de filtro de Galería */}
          {!isSearching && availableGalleries.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedGalleryFilter("todas")}
                className={`text-[13px] px-4 py-1.5 min-h-[38px] rounded-full transition-all duration-180 ease-vibra ${
                  selectedGalleryFilter === "todas"
                    ? "neu-chip-active font-semibold"
                    : "neu-chip text-grafito-55 hover:text-basalto-90 font-medium"
                }`}
              >
                Todas las galerías ({results.length})
              </button>
              {availableGalleries.map((gal) => {
                const count = results.filter((r) => r.store.gallery === gal).length;
                const isSel = selectedGalleryFilter === gal;
                return (
                  <button
                    key={gal}
                    type="button"
                    onClick={() => setSelectedGalleryFilter(isSel ? "todas" : gal)}
                    className={`text-[13px] px-4 py-1.5 min-h-[38px] rounded-full transition-all duration-180 ease-vibra ${
                      isSel
                        ? "neu-chip-active font-semibold"
                        : "neu-chip text-grafito-55 hover:text-basalto-90 font-medium"
                    }`}
                  >
                    {gal} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* 3 · Estado de Carga: Esqueletos en Caliza 10 + 3 arcos barriendo en ciclo de 1.4 s */}
          {isSearching && (
            <div className="space-y-3">
              <div className="p-8 rounded-3xl neu-sunken flex flex-col items-center justify-center text-center">
                <ResonanceSweepLoader size={52} />
                <p className="text-[15px] leading-[22px] font-medium text-basalto-90 mt-3">
                  Calculando resonancia visual con los catálogos de Gamarra
                </p>
                <p className="text-[13px] leading-[19px] text-grafito-55 mt-1">
                  Ordenando tiendas según color, silueta y textura de la prenda
                </p>
              </div>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-3xl bg-caliza-10 border border-caliza-20 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* 4 · Estado vacío: Núcleo sin propagación + instrucción directa */}
          {!isSearching && displayedResults.length === 0 && (
            <div className="p-10 rounded-3xl neu-sunken flex flex-col items-center justify-center text-center">
              <ResonanceEmptyNode size={48} />
              <p className="text-[15px] leading-[24px] text-basalto-90 font-medium mt-3 max-w-md">
                Ninguna tienda superó 0,55 con esta foto. Prueba con un encuadre más cerrado de la prenda o quita los filtros de precio y talla.
              </p>
            </div>
          )}

          {/* Listado de Tarjetas de Ranking (Anatomía fija de 3 zonas, pág. 12) */}
          {!isSearching && displayedResults.length > 0 && (
            <div className="space-y-3.5">
              {displayedResults.map((item, idx) => {
                const isRank1 = idx === 0;
                const inRoute = isInRoute(item.store.id);
                const formattedScore = item.resonanceScore.toFixed(2).replace(".", ",");

                return (
                  <article
                    key={item.store.id}
                    onClick={() => setSelectedStoreItem(item)}
                    className={`rounded-3xl p-4 sm:p-5 transition-all duration-240 ease-vibra cursor-pointer flex items-center justify-between gap-4 ${
                      isRank1 ? "neu-rank1" : "neu-elevated"
                    }`}
                  >
                    {/* ZONA 1 + 2: Compuesto fotográfico con índice de rango + Identidad y Tríada */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Zona 1: Compuesto fotográfico con fondo blanco uniforme y filete 1px */}
                      <div className="relative shrink-0">
                        {searchMode === "look" &&
                        item.matchingGarments &&
                        item.matchingGarments.length > 1 ? (
                          <div className="flex items-center -space-x-4">
                            {item.matchingGarments.slice(0, 2).map((mg, gIdx) => (
                              <div
                                key={mg.id}
                                className={`relative w-[68px] h-[86px] sm:w-[76px] sm:h-[96px] flex items-center justify-center p-1.5 overflow-hidden photo-frame ${
                                  gIdx === 1 ? "z-10 ring-2 ring-[#F4F5F0]" : "z-0"
                                }`}
                                title={mg.name}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={mg.photoUrl}
                                  alt={mg.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="relative w-[78px] h-[98px] sm:w-[86px] sm:h-[108px] flex items-center justify-center p-1.5 shrink-0 overflow-hidden photo-frame">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.bestGarment.photoUrl}
                              alt={item.bestGarment.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        )}

                        {/* Índice de rango */}
                        <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-basalto-90 text-caliza-5 text-[12px] font-semibold tabular-nums flex items-center justify-center shadow-xs z-20">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Zona 2: H4 Título de tarjeta + Tríada Galería | Piso | Stand con filetes verticales */}
                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-display font-medium text-[18px] leading-[23px] sm:text-[20px] sm:leading-[25px] text-basalto-90 truncate"
                          style={{ letterSpacing: "-0.008em" }}
                        >
                          {item.store.name}
                        </h4>

                        {/* Tríada operativa en 3 celdas separadas por filete vertical (Pág. 12) */}
                        <div className="inline-grid grid-cols-[minmax(95px,auto)_auto_auto] gap-x-3 sm:gap-x-4 mt-1.5 py-1.5 border-y border-caliza-20">
                          <div className="min-w-0">
                            <span className="text-[11px] leading-[14px] text-grafito-55 block">
                              Galería
                            </span>
                            <span className="text-[14px] sm:text-[15px] leading-[20px] font-semibold text-basalto-90 truncate block">
                              {item.store.gallery.replace(/^Galería\s+/i, "")}
                            </span>
                          </div>
                          <div className="pl-3 sm:pl-4 border-l border-caliza-20 min-w-0">
                            <span className="text-[11px] leading-[14px] text-grafito-55 block">
                              Piso
                            </span>
                            <span className="text-[14px] sm:text-[15px] leading-[20px] font-semibold text-basalto-90 tabular-nums whitespace-nowrap block">
                              {item.store.floor}
                            </span>
                          </div>
                          <div className="pl-3 sm:pl-4 border-l border-caliza-20 min-w-0">
                            <span className="text-[11px] leading-[14px] text-grafito-55 block">
                              Stand
                            </span>
                            <span className="text-[14px] sm:text-[15px] leading-[20px] font-semibold text-basalto-90 tabular-nums whitespace-nowrap block">
                              {item.store.stand}
                            </span>
                          </div>
                        </div>

                        {/* Prenda que resuena */}
                        <p className="text-[12px] sm:text-[13px] leading-[18px] text-grafito-55 mt-1.5 line-clamp-1">
                          {searchMode === "look" &&
                          item.matchingGarments &&
                          item.matchingGarments.length > 1
                            ? `${item.matchingGarments[0].name} + ${item.matchingGarments[1].name}`
                            : item.bestGarment.name}
                        </p>

                        {/* Controles operativos en una sola fila compacta */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (inRoute) {
                                removeFromRoute(item.store.id);
                              } else {
                                addToRoute(item.store);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all duration-180 ease-vibra border ${
                              inRoute
                                ? "bg-neblina-30 text-basalto-90 border-neblina-70"
                                : "bg-white/80 text-neblina-70 border-neblina-30 hover:border-neblina-70"
                            }`}
                          >
                            {inRoute ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-neblina-70" />
                                <span>En tu ruta</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 text-neblina-70" />
                                <span>Ruta</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`https://wa.me/${item.store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hola ${item.store.name}, vi su tienda en vibra (resonancia ${formattedScore}). ¿Tienen disponible: ${item.bestGarment.name}?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-higo-70 hover:bg-vibra-600 text-white text-[12px] font-medium transition-all duration-180 ease-vibra"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={
                              item.store.googleMapsUrl ||
                              (item.store.latitude && item.store.longitude
                                ? `https://www.google.com/maps/search/?api=1&query=${item.store.latitude},${item.store.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    `${item.store.gallery}, ${item.store.galleryAddress || "Gamarra, La Victoria, Lima"}`
                                  )}`)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 text-neblina-70 hover:bg-neblina-30/40 text-[12px] font-medium border border-caliza-20 transition-all"
                            title="Abrir ubicación en Google Maps"
                          >
                            <Navigation className="w-3 h-3 text-neblina-70" />
                            <span>Mapa</span>
                            <ExternalLink className="w-2.5 h-2.5 text-grafito-55" />
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStoreItem(item);
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-basalto-90 hover:text-higo-70 text-[12px] font-medium transition-colors"
                          >
                            <span>Ver ficha</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ZONA 3: Columna rígida derecha a 64px con el medidor de afinidad (Pág. 12) */}
                    <div className="shrink-0 pl-2 sm:pl-4 border-l border-caliza-20 flex flex-col items-center justify-center">
                      <RadarArcIcon
                        score={item.resonanceScore}
                        band={item.band}
                        isStyleMode={inputType === "estilo"}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Nota Micro de honestidad probabilística (Escala Micro 11/17 Grafito 55, pág. 10) */}
          <p className="text-[11px] leading-[17px] text-grafito-55 pt-2" style={{ letterSpacing: "0.01em" }}>
            El ranking se genera a partir de la fotografía publicada por el comerciante y no confirma existencias ni tallas disponibles en tienda.
          </p>
        </section>
      </main>

      {/* Modal de Ficha de Tienda (Pantalla 3 del Manual) */}
      {selectedStoreItem && (
        <StoreDetailModal
          item={selectedStoreItem}
          onClose={() => setSelectedStoreItem(null)}
        />
      )}

      {/* Modal de Recorte Táctil */}
      {rawImageForCrop && (
        <ImageCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setRawImageForCrop(null)}
        />
      )}

      {/* Drawer de Ruta por Galería (Pantalla 4 del Manual) */}
      <RouteDrawer />
    </div>
  );
}

export default function HomePage() {
  return (
    <RouteProvider>
      <VibraApp />
    </RouteProvider>
  );
}
