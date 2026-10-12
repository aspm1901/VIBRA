"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RadarArcIcon } from "@/components/RadarArcIcon";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { SearchResultItem, PriceLevel, PurchaseType } from "@/types";
import {
  Upload,
  Sparkles,
  Camera,
  ChevronDown,
  ChevronUp,
  Settings,
  Search,
  RotateCcw,
  Briefcase,
  Heart,
  Zap,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

const CATEGORIES = [
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
    title: "Noche & Fiesta",
    iconName: "Sparkles",
    styles: ["Fiesta", "Elegante"],
    desc: "Vestidos de fiesta, satén, brillo y eventos",
  },
  {
    id: "streetwear-urbano",
    title: "Streetwear Urbano",
    iconName: "Layers",
    styles: ["Urbano", "Casual"],
    desc: "Denim, casacas, wide leg y estilo relajado",
  },
  {
    id: "oficina-minimal",
    title: "Oficina Minimal",
    iconName: "Briefcase",
    styles: ["Oficina", "Minimalista", "Elegante"],
    desc: "Sastrería, blusas limpias, palazzos y blazers",
  },
  {
    id: "romantico-chic",
    title: "Romántico Chic",
    iconName: "Heart",
    styles: ["Romántico", "Casual"],
    desc: "Prendas fluidas, detalles delicados y tonos suaves",
  },
  {
    id: "y2k-atrevido",
    title: "Y2K & En Tendencia",
    iconName: "Zap",
    styles: ["Y2K", "Fiesta"],
    desc: "Corsets, tops entallados y cortes en tendencia",
  },
];

const EXAMPLES = [
  {
    id: "look_sastre",
    title: "Look sastre chic (Blazer + Palazzo)",
    category: "Look completo / Outfit",
    styles: ["Elegante", "Oficina", "Minimalista"],
    image: "/images/garments/look_sastre_chic.jpg",
    isLook: true,
  },
  {
    id: "casaca_denim",
    title: "Casaca denim clásica",
    category: "Casacas y abrigos",
    styles: ["Urbano", "Casual"],
    image: "/images/garments/casaca_denim_clasica.jpg",
    isLook: false,
  },
  {
    id: "vestido_burdeos",
    title: "Vestido burdeos de fiesta",
    category: "Vestidos",
    styles: ["Fiesta", "Elegante"],
    image: "/images/garments/vestido_burdeos.jpg",
    isLook: false,
  },
  {
    id: "jean_celeste",
    title: "Jean celeste urbano",
    category: "Jeans y pantalones",
    styles: ["Urbano", "Casual"],
    image: "/images/garments/jean_celeste.jpg",
    isLook: false,
  },
  {
    id: "chompa_amarilla",
    title: "Chompa mostaza tejida",
    category: "Chompas",
    styles: ["Casual", "Minimalista"],
    image: "/images/garments/chompa_amarilla.jpg",
    isLook: false,
  },
];

export default function HomePage() {
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
  const [groupedResults, setGroupedResults] = useState<
    Record<string, { galleryName: string; address: string; stores: SearchResultItem[] }>
  >({});
  const [stats, setStats] = useState({ totalStores: 3, passedFilters: 3, passedResonance: 3 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ejecutar búsqueda inicial al cargar la página
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

      // Si es una foto recién subida o ejemplo, no enviamos filtros viejos heredados
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
        // En búsqueda por estilo no se envía imagen ni ejemplo
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
        setGroupedResults(data.groupedByGallery || {});
        setStats(data.stats || { totalStores: 0, passedFilters: 0, passedResonance: 0 });

        if (data.detectedInfo) {
          setDetectedInfo(data.detectedInfo);

          if (data.detectedInfo.garmentTitle) {
            setGarmentTitle(data.detectedInfo.garmentTitle);
          }

          // Sincronizar automáticamente la UI con lo que la IA detectó en la imagen o ejemplo
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
    setGarmentTitle(ex.title);
    setSelectedCategory(ex.category);
    setSelectedStyles(ex.styles);
    const targetMode = ex.isLook ? "look" : "prenda";
    setSearchMode(targetMode);
    setDetectedInfo({
      category: ex.category,
      styles: ex.styles,
      garmentTitle: ex.title,
    });
    executeSearch({
      exampleId: ex.id,
      overrideCategory: ex.category,
      overrideStyles: ex.styles,
      overrideSearchMode: targetMode,
    });
  };

  // Helper en cliente para comprimir fotos pesadas de celulares en ~10ms antes de enviar
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
        // En Look Completo se analiza la persona/outfit entero sin forzar recorte
        setCurrentImageBase64(optimizedBase64);
        setCurrentImagePreview(optimizedBase64);
        setSelectedExampleId("");
        setGarmentTitle("Analizando look completo con IA...");
        executeSearch({
          image: optimizedBase64,
          overrideSearchMode: "look",
        });
      } else {
        // En Una Prenda se abre el encuadre para aislar la prenda
        setRawImageForCrop(optimizedBase64);
      }
    };
    reader.readAsDataURL(file);
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
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
        setGarmentTitle("Analizando look completo con IA...");
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
      searchMode === "look"
        ? "Analizando look completo con IA..."
        : "Analizando prenda con IA..."
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
    const iconClass = `w-3.5 h-3.5 ${
      isActive ? "text-vibra-300" : "text-gray-400 group-hover:text-gray-200"
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
    <div className="min-h-screen bg-[#121214] text-gray-100 flex flex-col">
      {/* Barra de navegación superior minimalista */}
      <header className="border-b border-[#24242c] bg-[#151518]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white lowercase select-none">
              vibra
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full bg-[#23232b] text-white text-xs font-semibold border border-[#353540]">
              Buscar
            </span>
            <Link
              href="/admin"
              className="px-4 py-1.5 rounded-full bg-[#1b1b22] hover:bg-[#282832] text-gray-300 hover:text-white text-xs font-semibold border border-transparent hover:border-[#353540] transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-vibra-400" />
              <span>Admin Tiendas</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenedor Principal (2 Columnas Desktop, 1 Columna Móvil) */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* ================= COLUMNA IZQUIERDA: BUSCADOR & FILTROS (5 de 12 cols) ================= */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Título Principal y Bajada */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
              Muéstralo. <br />
              Encuéntralo <br />
              <span className="text-vibra-300">cerca.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 mt-3 leading-relaxed max-w-md font-normal">
              Sube una foto de una prenda o de un look. Vibra la compara con las imágenes que
              publican las tiendas de Gamarra y ordena las que resuenan con más intensidad.
            </p>
          </div>

          {/* Toggle "Con foto" / "Por estilo" */}
          <div className="flex p-1.5 bg-[#181820] rounded-2xl border border-[#2b2b3a] w-fit shadow-md">
            <button
              onClick={() => {
                setInputType("foto");
                executeSearch({ overrideSearchMode: searchMode === "look" ? "look" : "prenda" });
              }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                inputType === "foto"
                  ? "bg-[#2c2c3a] text-white shadow-sm ring-1 ring-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Con foto
            </button>
            <button
              onClick={() => {
                setInputType("estilo");
                executeSearch({ overrideSearchMode: "estilo", overrideStyles: selectedStyles });
              }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                inputType === "estilo"
                  ? "bg-[#2c2c3a] text-white shadow-sm ring-1 ring-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Por estilo
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODO FOTO: UNA PRENDA O LOOK COMPLETO                    */}
          {/* ======================================================== */}
          {inputType === "foto" ? (
            <div className="space-y-5">
              {/* Toggle de Modo: "Una prenda" vs "Look completo" */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("prenda");
                    executeSearch({ overrideSearchMode: "prenda" });
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    searchMode === "prenda"
                      ? "bg-[#22222e] border-vibra-500/80 shadow-md ring-1 ring-vibra-500/40"
                      : "bg-[#181820] border-[#292938] hover:bg-[#1e1e28]"
                  }`}
                >
                  <span className="text-sm font-bold text-white block">Una prenda</span>
                  <span className="text-xs text-slate-300 block mt-1 leading-snug font-normal">
                    Recortas la prenda. Máxima fidelidad de corte y silueta.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("look");
                    executeSearch({ overrideSearchMode: "look" });
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    searchMode === "look"
                      ? "bg-[#22222e] border-vibra-500/80 shadow-md ring-1 ring-vibra-500/40"
                      : "bg-[#181820] border-[#292938] hover:bg-[#1e1e28]"
                  }`}
                >
                  <span className="text-sm font-bold text-white block">Look completo</span>
                  <span className="text-xs text-slate-300 block mt-1 leading-snug font-normal">
                    Outfit o Pinterest. Resultado por estilo y armonía visual.
                  </span>
                </button>
              </div>

              {/* Tarjeta de Foto Activa (Visor Ovalado / Carga) */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="bg-[#18181f] border border-[#2b2b36] rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl"
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-44 h-56 bg-[#f1ece7] rounded-[2.5rem] flex items-center justify-center p-3 cursor-pointer group hover:scale-[1.02] transition-transform overflow-hidden shadow-inner border border-[#ded8cf] relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImagePreview}
                    alt="Referencia de búsqueda"
                    className="max-h-full max-w-full object-contain drop-shadow"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-[2.5rem]">
                    <Camera className="w-6 h-6 mb-1 text-vibra-300" />
                    <span className="text-[11px] font-semibold">Cambiar foto</span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <h3 className="text-lg font-extrabold text-white mt-4 tracking-tight">{garmentTitle}</h3>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs sm:text-sm text-slate-300 hover:text-vibra-300 mt-1.5 flex items-center gap-1.5 transition-colors font-medium"
                >
                  <Upload className="w-4 h-4 text-vibra-300" />
                  <span>
                    {searchMode === "look"
                      ? "Sube una foto de outfit o collage de Pinterest"
                      : "Toca para subir tu propia foto"}
                  </span>
                </button>

                {/* Tags de estilos detectados */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Detectado por IA:
                  </span>
                  {detectedInfo.category && (
                    <span className="text-xs px-3 py-1 rounded-full bg-vibra-950 text-vibra-300 border border-vibra-800 font-bold shadow-sm">
                      {detectedInfo.category}
                    </span>
                  )}
                  {(detectedInfo.styles && detectedInfo.styles.length > 0
                    ? detectedInfo.styles
                    : selectedStyles
                  ).map((style) => (
                    <span
                      key={style}
                      className="text-xs px-3 py-1 rounded-full bg-[#242430] text-slate-200 border border-[#353545] font-semibold"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>

              {/* Referencias de ejemplo adaptadas al modo */}
              <div>
                <span className="text-sm font-bold text-slate-200 block mb-2.5">
                  {searchMode === "look"
                    ? "Prueba con looks y outfits de referencia:"
                    : "O prueba con una prenda de ejemplo:"}
                </span>
                <div className="grid grid-cols-4 gap-2.5">
                  {(searchMode === "look" ? EXAMPLES : EXAMPLES.filter((e) => !e.isLook))
                    .slice(0, 4)
                    .map((ex) => {
                      const isSelected = selectedExampleId === ex.id;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => handleSelectExample(ex)}
                          className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                            isSelected
                              ? "bg-[#252532] border-vibra-400 ring-2 ring-vibra-500/40 shadow-md"
                              : "bg-[#181820] border-[#292938] hover:bg-[#20202a]"
                          }`}
                        >
                          <div className="w-full h-16 bg-[#f5f1ec] rounded-xl flex items-center justify-center p-1.5 overflow-hidden mb-1.5 border border-[#dfd9d0]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ex.image}
                              alt={ex.title}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-200 truncate w-full block">
                            {ex.title}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Prenda / Look Identificado por IA */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#181820] border border-[#2c2c3a] shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-vibra-950 text-vibra-400 border border-vibra-900/60 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                      {searchMode === "look" ? "Outfit analizado" : "Prenda identificada"}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {detectedInfo.category || garmentTitle}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-bold px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
                  IA Activa
                </span>
              </div>

              {/* Estilos interactivos */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-slate-200">
                    Estilos{" "}
                    <span className="text-slate-400 text-xs font-normal">
                      (detectados por IA, puedes ajustar)
                    </span>
                  </span>
                  <span className="text-xs text-vibra-300 font-bold">
                    {selectedStyles.length} seleccionados
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st);
                    return (
                      <button
                        key={st}
                        onClick={() => toggleStyle(st)}
                        className={`text-xs sm:text-sm px-4 py-2 rounded-full transition-all font-semibold ${
                          isSelected
                            ? "bg-vibra-500 text-white font-bold shadow-md shadow-vibra-950/60 ring-1 ring-white/20"
                            : "bg-[#1d1d26] text-slate-200 hover:bg-[#282836] hover:text-white border border-[#2d2d3c]"
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
            /* MODO ESTILO: DESCUBRIMIENTO 100% POR VIBRA Y ESTÉTICA     */
            /* ======================================================== */
            <div className="space-y-5">
              {/* Banner de Bienvenida a Búsqueda por Estilo */}
              <div className="bg-[#181820] border border-[#2b2b38] rounded-3xl p-5 relative overflow-hidden shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-vibra-950 text-vibra-300 border border-vibra-800/80 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-vibra-300 uppercase font-bold tracking-wider block">
                      Búsqueda por Vibra & Estética
                    </span>
                    <h3 className="text-base font-bold text-white">Explora tiendas por su estilo</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Elige las estéticas que buscas. Vibra encontrará las tiendas y stands de Gamarra con mayor especialidad y prendas en ese estilo.
                </p>

                {/* Mood Presets rápidos */}
                <div className="mt-4 pt-4 border-t border-[#262632]">
                  <span className="text-[11px] font-semibold text-gray-300 block mb-2">
                    Inspiraciones y combinaciones populares:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          className={`p-3 rounded-2xl border text-left transition-all group ${
                            isActive
                              ? "bg-[#252532] border-vibra-400/80 shadow-md ring-1 ring-vibra-500/20"
                              : "bg-[#1f1f28] border-[#2d2d3c] hover:bg-[#252532] hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {renderPresetIcon(preset.iconName, isActive)}
                            <span className="text-xs font-bold text-white block">{preset.title}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 block leading-snug">
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selector de los 12 Estilos Interactivos */}
              <div className="bg-[#18181f] border border-[#2b2b36] rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Todos los estilos</span>
                    <span className="text-[10px] text-gray-400">
                      Toca para añadir o quitar estilos de tu búsqueda
                    </span>
                  </div>
                  <span className="text-[10px] text-vibra-400 font-semibold px-2 py-0.5 rounded-full bg-vibra-950 border border-vibra-900/60">
                    {selectedStyles.length} seleccionados
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st);
                    return (
                      <button
                        key={st}
                        onClick={() => toggleStyle(st)}
                        className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium ${
                          isSelected
                            ? "bg-vibra-500 text-white font-bold shadow-md shadow-vibra-950/40"
                            : "bg-[#21212c] text-gray-300 hover:bg-[#2c2c3a] border border-[#30303e]"
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
            {/* Nivel de Precio */}
            <div>
              <span className="text-xs font-semibold text-gray-400 block mb-2">Nivel de precio</span>
              <div className="flex gap-2">
                {[
                  { id: "economico", label: "S/ Económico" },
                  { id: "medio", label: "S/ S/ Medio" },
                  { id: "alto", label: "S/ S/ S/ Alto" },
                ].map((p) => {
                  const isSelected = selectedPrice === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const newPrice = isSelected ? undefined : (p.id as PriceLevel);
                        setSelectedPrice(newPrice);
                      }}
                      className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium ${
                        isSelected
                          ? "bg-white text-gray-950 font-bold shadow"
                          : "bg-[#1f1f26] text-gray-300 hover:bg-[#292934] border border-[#2b2b36]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Comparado con los rangos reales de confección en Gamarra.
              </p>
            </div>

            {/* Botón para desplegar Tallas y Tipo de compra */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <span>
                  {showMoreFilters
                    ? "Ocultar filtros avanzados"
                    : "Más filtros (Talla, modalidad de compra)"}
                </span>
                {showMoreFilters ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showMoreFilters && (
                <div className="space-y-3 mt-3 p-4 bg-[#18181f] rounded-2xl border border-[#2b2b36]">
                  {/* Tallas */}
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1.5">Talla</span>
                    <div className="flex gap-1.5">
                      {["XS", "S", "M", "L", "XL", "Estándar"].map((tz) => {
                        const isSelected = selectedSize === tz;
                        return (
                          <button
                            key={tz}
                            onClick={() => setSelectedSize(isSelected ? undefined : tz)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                              isSelected
                                ? "bg-white text-black font-bold"
                                : "bg-[#252530] text-gray-300 hover:bg-[#2f2f3d]"
                            }`}
                          >
                            {tz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tipo de compra */}
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1.5">
                      Tipo de compra
                    </span>
                    <div className="flex gap-1.5">
                      {[
                        { id: "cualquiera", label: "Cualquiera" },
                        { id: "envio", label: "Con envío por web" },
                        { id: "presencial", label: "Solo presencial" },
                      ].map((tc) => {
                        const isSelected = selectedPurchaseType === tc.id;
                        return (
                          <button
                            key={tc.id}
                            onClick={() => setSelectedPurchaseType(tc.id as PurchaseType)}
                            className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                              isSelected
                                ? "bg-white text-black font-bold"
                                : "bg-[#252530] text-gray-300 hover:bg-[#2f2f3d]"
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

            {/* Botón Principal de Búsqueda */}
            <button
              onClick={() => executeSearch({ isManualFilterRefinement: true })}
              disabled={isSearching}
              className="w-full py-4 px-6 rounded-2xl bg-vibra-500 hover:bg-vibra-600 active:scale-[0.99] text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-vibra-950/50 mt-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Calculando resonancia con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-vibra-200" />
                  <span>
                    {inputType === "estilo"
                      ? "Ver tiendas con este estilo"
                      : searchMode === "look"
                      ? "Ver tiendas para armar este look"
                      : "Ver tiendas que resuenan"}
                  </span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ================= COLUMNA DERECHA: RESULTADOS AGRUPADOS (7 de 12 cols) ================= */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Header de Resultados */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {inputType === "estilo"
                ? `${results.length} ${results.length === 1 ? "tienda resuena" : "tiendas resuenan"} con tu estilo`
                : searchMode === "look"
                ? `${results.length} ${results.length === 1 ? "tienda resuena" : "tiendas resuenan"} con tu look completo`
                : `${results.length} ${results.length === 1 ? "tienda resuena" : "tiendas resuenan"} con tu prenda`}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-400">
              <span>
                {inputType === "estilo"
                  ? `Especialistas en ${selectedStyles.join(", ")} en Gamarra`
                  : searchMode === "look"
                  ? "Ponderado 70% por estilo de outfit y 30% por armonía visual"
                  : "Ordenadas de mayor a menor afinidad con tu búsqueda"}
              </span>
              <span className="text-gray-600">•</span>
              <span className="bg-[#202028] text-gray-300 px-2.5 py-0.5 rounded-full border border-[#2f2f3d]">
                {displayedResults.length} tiendas encontradas
              </span>
            </div>
          </div>

          {/* Si está buscando */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center p-12 bg-[#18181f] rounded-3xl border border-[#282834] text-center">
              <div className="w-10 h-10 border-3 border-vibra-500/20 border-t-vibra-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold text-white">Extrayendo vectores y calculando afinidad...</p>
              <p className="text-xs text-gray-400 mt-1">Comparando foto contra catálogos de Gamarra</p>
            </div>
          )}

          {/* Si no hay resultados */}
          {!isSearching && displayedResults.length === 0 && (
            <div className="p-8 bg-[#18181f] rounded-3xl border border-[#282834] text-center">
              <p className="text-sm text-gray-300 font-semibold">
                No se encontraron tiendas que coincidan con los filtros seleccionados.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Prueba relajando los filtros de precio o seleccionando otra categoría.
              </p>
            </div>
          )}

          {/* Filtro rápido por Galería si hay más de 1 galería en los resultados */}
          {!isSearching && availableGalleries.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 -mt-1">
              <button
                type="button"
                onClick={() => setSelectedGalleryFilter("todas")}
                className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium ${
                  selectedGalleryFilter === "todas"
                    ? "bg-white text-gray-950 font-bold shadow-sm"
                    : "bg-[#1d1d24] text-gray-400 hover:text-gray-200 border border-[#2d2d3a]"
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
                    className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium ${
                      isSel
                        ? "bg-white text-gray-950 font-bold shadow-sm"
                        : "bg-[#1d1d24] text-gray-400 hover:text-gray-200 border border-[#2d2d3a]"
                    }`}
                  >
                    {gal.replace("Galería ", "")} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Listado Directo de Tiendas (Ordenado por Resonancia) */}
          {!isSearching && displayedResults.length > 0 && (
            <div className="space-y-3.5">
              {displayedResults.map((item, idx) => (
                <div
                  key={item.store.id}
                  onClick={() => setSelectedStoreItem(item)}
                  className="group bg-[#181820] hover:bg-[#20202a] border border-[#2a2a38] hover:border-[#444458] rounded-3xl p-5 md:p-6 transition-all cursor-pointer shadow-md hover:shadow-xl flex items-center justify-between gap-4"
                >
                  {/* Izquierda: Miniatura de la Prenda o Prendas */}
                  <div className="flex items-center gap-4.5 min-w-0">
                    {searchMode === "look" &&
                    item.matchingGarments &&
                    item.matchingGarments.length > 1 ? (
                      <div className="flex items-center -space-x-4 shrink-0">
                        {item.matchingGarments.slice(0, 2).map((mg, gIdx) => (
                          <div
                            key={mg.id}
                            className={`relative w-16 h-20 bg-[#f5f1ec] rounded-2xl flex items-center justify-center p-1.5 overflow-hidden shadow-md border border-[#dfd9d0] transition-transform group-hover:scale-105 ${
                              gIdx === 1 ? "z-10 ring-2 ring-[#181820]" : "z-0"
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
                      <div className="relative w-18 h-22 sm:w-20 sm:h-24 bg-[#f5f1ec] rounded-2xl flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner border border-[#dfd9d0]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.bestGarment.photoUrl}
                          alt={item.bestGarment.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    {/* Centro: Info de la tienda */}
                    <div className="min-w-0">
                      <h4 className="text-lg sm:text-xl font-bold text-white group-hover:text-vibra-300 transition-colors truncate">
                        {item.store.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-300 mt-1.5 font-medium">
                        <span className="font-bold text-white">
                          {item.store.gallery}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="bg-[#23232e] text-slate-200 px-2.5 py-0.5 rounded-lg border border-[#333342] text-xs font-semibold">
                          Piso {item.store.floor}
                        </span>
                        <span className="bg-[#23232e] text-slate-200 px-2.5 py-0.5 rounded-lg border border-[#333342] text-xs font-semibold">
                          Stand {item.store.stand}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 mt-2 font-normal leading-relaxed truncate">
                        {inputType === "estilo"
                          ? `Especialidad en el estilo · Prenda destacada: ${item.bestGarment.name}`
                          : searchMode === "look"
                          ? item.matchingGarments && item.matchingGarments.length > 1
                            ? `Prendas para armar este look: ${item.matchingGarments[0].name} + ${item.matchingGarments[1].name}`
                            : `Prenda clave para armar este look · ${item.bestGarment.name}`
                          : item.band === "Alta"
                          ? `Coincidencia alta · ${item.bestGarment.name}`
                          : item.band === "Media"
                          ? `Prenda similar en silueta · ${item.bestGarment.name}`
                          : `Mismo estilo afín · ${item.bestGarment.name}`}
                      </p>
                    </div>
                  </div>

                  {/* Derecha: Indicador de Resonancia con Arcos */}
                  <div className="shrink-0 pl-2">
                    <RadarArcIcon
                      score={item.resonanceScore}
                      band={item.band}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Informativo */}
          <div className="p-4 sm:p-5 bg-[#16161e] rounded-2xl border border-[#282836] text-xs sm:text-sm text-slate-300 leading-relaxed mt-4 shadow-sm">
            💡 <strong>Nota útil:</strong> La resonancia mide la afinidad visual y estética de cada tienda con tu referencia, no el stock ni colores en tiempo real. Te recomendamos confirmar disponibilidad por WhatsApp antes de ir físicamente.
          </div>
        </section>
      </main>

      {/* Modal de Detalle de Tienda */}
      <StoreDetailModal
        item={selectedStoreItem}
        onClose={() => setSelectedStoreItem(null)}
      />

      {/* Modal de Recorte Táctil */}
      {rawImageForCrop && (
        <ImageCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setRawImageForCrop(null)}
        />
      )}
    </div>
  );
}
