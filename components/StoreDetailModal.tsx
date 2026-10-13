"use client";
import React from "react";
import { SearchResultItem, StoreGarment } from "@/types";
import { X, MessageCircle, MapPin, Store as StoreIcon, ShieldCheck, Navigation, ExternalLink, Plus, Check } from "lucide-react";
import { useRoute } from "./RouteContext";

interface StoreDetailModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ item, onClose }) => {
  const { isInRoute, addToRoute, removeFromRoute } = useRoute();
  const inRoute = item ? isInRoute(item.store.id) : false;
  const [selectedGarment, setSelectedGarment] = React.useState<StoreGarment | null>(null);

  React.useEffect(() => {
    if (item) {
      setSelectedGarment(item.bestGarment);
    }
  }, [item]);

  React.useEffect(() => {
    if (!item) return;

    // Bloquear scroll de la página de fondo
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      // Restauración absoluta e inmediata del scroll
      document.body.style.overflow = originalBodyOverflow || "";
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const { store, bestGarment, matchingGarments, resonanceScore, photoSimilarity, matchingStylesCount, totalSearchedStyles } = item;

  const percentageScore = `${Math.round(resonanceScore * 100)}%`;
  const formattedPhotoSim = `${Math.round(photoSimilarity * 100)}%`;

  const garmentsMention =
    item.searchMode === "look" && matchingGarments && matchingGarments.length > 1
      ? matchingGarments.map((g) => g.name).join(" y ")
      : bestGarment.name;

  const whatsappMessage = `Hola ${store.name}, los encontré en Vibra (${percentageScore} de afinidad). ¿Tienen disponibilidad de ${garmentsMention}?`;
  const whatsappUrl = `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
  const googleMapsUrl =
    store.googleMapsUrl ||
    (store.latitude && store.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.gallery}, ${store.galleryAddress || "Gamarra, La Victoria, Lima"}`)}`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#1a1a1f] border border-[#2e2e38] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-gray-100 shadow-2xl my-auto max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2e38]">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {store.name}
            </h2>
            <p className="text-xs text-vibra-300 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-vibra-400" />
              Tienda verificada en {store.gallery}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#26262e] hover:bg-[#34343e] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prenda más parecida (Hero) o Prendas que arman el look */}
        {item.searchMode === "look" && matchingGarments && matchingGarments.length > 1 ? (
          <div className="mt-5">
            <span className="text-xs font-bold text-vibra-300 block mb-2 uppercase tracking-wider">
              Prendas para armar tu look en esta tienda ({matchingGarments.length}):
            </span>
            <div className="grid grid-cols-2 gap-3">
              {matchingGarments.map((g) => (
                <div
                  key={g.id}
                  className="bg-[#202028] rounded-2xl p-3 border border-[#30303e] flex flex-col items-center shadow-md"
                >
                  <div className="w-full h-44 bg-[#f1ece7] rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner border border-[#dcd6ce]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.photoUrl}
                      alt={g.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold text-white mt-2.5 text-center line-clamp-2">
                    {g.name}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">{g.category}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="w-full h-72 md:h-80 bg-[#f1ece7] rounded-2xl flex items-center justify-center p-4 overflow-hidden shadow-inner border border-[#dcd6ce]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedGarment?.photoUrl || bestGarment.photoUrl}
                alt={selectedGarment?.name || bestGarment.name}
                className="max-h-full max-w-full object-contain drop-shadow-md transition-all duration-200"
              />
            </div>
            <p className="text-center text-xs text-slate-300 mt-2 font-medium">
              {selectedGarment && selectedGarment.id !== bestGarment.id ? (
                <>Prenda del catálogo: <strong className="text-white">{selectedGarment.name}</strong></>
              ) : (
                <>Prenda coincidente: <strong className="text-white">{bestGarment.name}</strong></>
              )}
            </p>
          </div>
        )}

        {/* Catálogo de prendas de este stand (si tiene más de 1) */}
        {store.garments && store.garments.length > 1 && (
          <div className="mt-4 p-3.5 bg-[#1e1e28] rounded-2xl border border-[#2e2e40]">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                  Catálogo del stand
                </span>
                <span className="text-xs font-extrabold text-vibra-400 whitespace-nowrap">
                  ({store.garments.length} {store.garments.length === 1 ? "prenda" : "prendas"})
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-normal whitespace-nowrap shrink-0">
                Toca para ampliar
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {store.garments.map((g) => {
                const isSelected = (selectedGarment?.id || bestGarment.id) === g.id;
                const isBestMatch = g.id === bestGarment.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGarment(g)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                      isSelected
                        ? "bg-[#28283a] border-vibra-500 ring-2 ring-vibra-500/50 shadow-md scale-102"
                        : "bg-[#181820] border-[#2c2c3e] hover:border-slate-500 hover:bg-[#20202c]"
                    }`}
                  >
                    <div className="w-full h-14 bg-[#f1ece7] rounded-lg overflow-hidden flex items-center justify-center p-0.5 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.photoUrl}
                        alt={g.name}
                        className="max-h-full max-w-full object-contain"
                      />
                      {isBestMatch && (
                        <span className="absolute top-0.5 right-0.5 px-1 bg-vibra-500 text-white text-[8px] font-black rounded uppercase">
                          Match
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300 mt-1 line-clamp-1 w-full px-0.5">
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Badges de Ubicación */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 bg-[#20202a] p-3.5 rounded-2xl border border-[#2d2d3c]">
          <div className="text-left px-2">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Galería</span>
            <span className="text-sm sm:text-base font-bold text-white block mt-0.5 leading-snug">{store.gallery}</span>
          </div>
          <div className="text-left px-2 border-l border-[#353545]">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Piso</span>
            <span className="text-base font-bold text-white block mt-0.5">{store.floor}</span>
          </div>
          <div className="text-left px-2 border-l border-[#353545]">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Stand</span>
            <span className="text-base font-bold text-white block mt-0.5">{store.stand}</span>
          </div>
        </div>

        {/* Dirección física y botón Google Maps */}
        <div className="mt-4 p-3.5 bg-[#20202c] rounded-2xl border border-[#2e2e42] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-vibra-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {store.gallery} · {store.galleryAddress || "Gamarra, La Victoria"}
              </span>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                {store.referenceLocation || `Piso ${store.floor}, Stand ${store.stand}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (inRoute) {
                  removeFromRoute(store.id);
                } else {
                  addToRoute(store);
                }
              }}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 border ${
                inRoute
                  ? "bg-vibra-500/20 text-vibra-300 border-vibra-500/60 hover:bg-vibra-500/30"
                  : "bg-[#28283a] hover:bg-[#34344e] text-slate-200 hover:text-white border-vibra-500/40 hover:border-vibra-500/80 shadow-sm"
              }`}
            >
              {inRoute ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>En tu ruta</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-vibra-400" />
                  <span>Mi Ruta</span>
                </>
              )}
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#28283a] hover:bg-[#34344e] border border-[#3e3e56] text-xs font-bold text-vibra-300 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-vibra-400" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
            </a>
          </div>
        </div>

        {/* Explicación de Resonancia */}
        <div className="mt-4 p-4 bg-vibra-950/60 border border-vibra-800/80 rounded-2xl text-sm text-vibra-100 leading-relaxed shadow-sm">
          {item.searchMode === "estilo" ? (
            <>
              <strong>Afinidad por Estilo {percentageScore}:</strong> La tienda coincide en{" "}
              <strong className="text-white">{matchingStylesCount} de {totalSearchedStyles}</strong> estilos buscados, destacando su especialidad para esta estética en Gamarra.
            </>
          ) : item.searchMode === "look" ? (
            <>
              <strong>Afinidad para Look Completo {percentageScore}:</strong> Coincidencia estilística del outfit y prendas afines disponibles para armar este conjunto.
            </>
          ) : (
            <>
              <strong>Parecido {percentageScore} con tu prenda:</strong> Fidelidad de silueta y corte visual ({formattedPhotoSim}) con <strong className="text-white">{matchingStylesCount} de {totalSearchedStyles}</strong> estilos afines.
            </>
          )}
        </div>

        {/* Estilos que declara la tienda */}
        <div className="mt-5">
          <span className="text-sm font-bold text-slate-200 block mb-2.5">
            Estilos que declara la tienda:
          </span>
          <div className="flex flex-wrap gap-2">
            {store.styles.map((style, idx) => (
              <span
                key={style}
                className={`text-xs sm:text-sm px-4 py-2 rounded-full font-semibold ${
                  idx === 0
                    ? "bg-vibra-700 text-white border border-vibra-500 shadow-sm"
                    : "bg-[#252532] text-slate-200 border border-[#38384a]"
                }`}
              >
                {style} {idx === 0 && "· principal"}
              </span>
            ))}
          </div>
        </div>

        {/* Así se ve el stand */}
        <div className="mt-6">
          <span className="text-sm font-bold text-slate-200 block mb-2">
            Así se ve el stand físico:
          </span>
          <div className="w-full h-48 bg-[#e8e3dc] rounded-2xl flex items-center justify-center overflow-hidden border border-[#d6cfc4] shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.standPhotoUrl}
              alt={`Stand de ${store.name}`}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-normal leading-relaxed">
            Foto de ubicación: sirve para reconocer el stand físico al caminar por los pasillos de la galería.
          </p>
        </div>

        {/* Detalles de la tienda (Nivel de precio, Tallas, Compra) */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-6 pt-5 border-t border-[#2e2e38] text-sm">
          <div>
            <span className="text-slate-400 text-xs block mb-1">Nivel de precio</span>
            <span className="font-bold text-white text-base">
              {store.priceLevel === "economico" ? "S/ · Económico" : store.priceLevel === "medio" ? "S/ S/ · Medio" : "S/ S/ S/ · Alto"}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Referencial según su prenda más vendida.</span>
          </div>

          <div>
            <span className="text-slate-400 text-xs block mb-1">Modalidad de compra</span>
            <span className="font-bold text-white text-base">
              {store.purchaseType === "envio" ? "En tienda y con envío" : store.purchaseType === "presencial" ? "Solo presencial" : "Cualquiera"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-xs block mb-1">Tallas disponibles</span>
            <span className="font-bold text-white text-base">{store.sizes.join(", ")}</span>
          </div>

          <div>
            <span className="text-slate-400 text-xs block mb-1">Última actualización</span>
            <span className="font-bold text-white text-base">{store.updatedAt}</span>
          </div>

          <div>
            <span className="text-slate-400 text-xs block mb-1">Categorías</span>
            <span className="font-bold text-white text-base">{store.categories.join(", ")}</span>
          </div>

          {store.instagram && (
            <div className="min-w-0">
              <span className="text-slate-400 text-xs block mb-1">Instagram</span>
              <a
                href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-pink-400 hover:text-pink-300 text-sm sm:text-base inline-flex items-center gap-1.5 transition-colors max-w-full"
              >
                <span className="truncate max-w-[120px] sm:max-w-none">{store.instagram.startsWith("@") ? store.instagram : `@${store.instagram}`}</span>
                <ExternalLink className="w-3.5 h-3.5 text-pink-400/70 shrink-0" />
              </a>
            </div>
          )}

          {store.tiktok && (
            <div className="min-w-0">
              <span className="text-slate-400 text-xs block mb-1">TikTok</span>
              <a
                href={`https://tiktok.com/@${store.tiktok.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-cyan-400 hover:text-cyan-300 text-sm sm:text-base inline-flex items-center gap-1.5 transition-colors max-w-full"
              >
                <span className="truncate max-w-[120px] sm:max-w-none">{store.tiktok.startsWith("@") ? store.tiktok : `@${store.tiktok}`}</span>
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Cuadro de mensaje pre-armado de WhatsApp */}
        <div className="mt-6 p-4 bg-[#14141a] rounded-2xl border border-[#282836]">
          <span className="text-xs text-slate-400 block mb-1.5 font-medium">
            Mensaje que se enviará automáticamente a la vendedora:
          </span>
          <p className="text-xs sm:text-sm text-slate-200 italic font-mono bg-[#1c1c26] p-3 rounded-xl border border-[#2e2e3e] leading-relaxed">
            &ldquo;{whatsappMessage}&rdquo;
          </p>
        </div>

        {/* Botones de Acción Primaria: Mi Ruta y WhatsApp */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (inRoute) {
                removeFromRoute(store.id);
              } else {
                addToRoute(store);
              }
            }}
            className={`w-full sm:flex-1 py-3.5 px-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border text-sm active:scale-[0.99] ${
              inRoute
                ? "bg-vibra-500/20 text-vibra-300 border-vibra-500/60 hover:bg-vibra-500/30"
                : "bg-[#252535] hover:bg-[#2e2e42] text-slate-100 hover:text-white border-vibra-500/40 hover:border-vibra-500/80 shadow-md"
            }`}
          >
            {inRoute ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>En tu ruta (clic para quitar)</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-vibra-400" />
                <span>Guardar en Mi Ruta</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-slate-950 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl text-sm"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
