"use client";
import React from "react";
import { SearchResultItem, StoreGarment } from "@/types";
import {
  X,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Navigation,
  ExternalLink,
  Plus,
  Check,
  Clock,
} from "lucide-react";
import { useRoute } from "./RouteContext";
import { RadarArcIcon } from "./RadarArcIcon";
import { getStoreActivityDate } from "@/lib/store-updated-at";

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
      document.body.style.overflow = originalBodyOverflow || "";
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const { store, bestGarment, matchingGarments, resonanceScore } = item;
  const formattedScore = `${Math.round(resonanceScore * 100)}%`;
  const activityDate = getStoreActivityDate(store);

  const garmentsMention =
    item.searchMode === "look" && matchingGarments && matchingGarments.length > 1
      ? matchingGarments.map((g) => g.name).join(" y ")
      : selectedGarment?.name || bestGarment.name;

  const whatsappMessage = `Hola ${store.name}, vi su tienda en vibra (${formattedScore} de afinidad). ¿Tienen disponibilidad de ${garmentsMention}?`;
  const whatsappUrl = `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
  const googleMapsUrl =
    store.googleMapsUrl ||
    (store.latitude && store.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${store.gallery}, ${store.galleryAddress || "Gamarra, La Victoria, Lima"}`
        )}`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-basalto-90/80 backdrop-blur-md overflow-hidden animate-vibra-fade"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white border border-caliza-20/80 rounded-t-[32px] sm:rounded-3xl text-basalto-90 shadow-[0_25px_70px_-15px_rgba(20,22,25,0.45)] ring-1 ring-black/5 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-vibra-sheet sm:animate-vibra-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle pill */}
        <div className="w-10 h-1 bg-caliza-20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header de la Ficha (Sticky superior para nunca perder el nombre ni el botón cerrar) */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm px-5 sm:px-7 pt-3.5 pb-4 border-b border-caliza-10 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2
              className="font-display font-semibold text-[24px] leading-[29px] sm:text-[30px] sm:leading-[35px] text-basalto-90"
              style={{ letterSpacing: "-0.02em" }}
            >
              {store.name}
            </h2>
            <p className="text-[12px] text-higo-70 font-medium flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-higo-70 shrink-0" />
              <span>Tienda verificada en {store.gallery}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <RadarArcIcon score={resonanceScore} band={item.band} />
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full neu-chip flex items-center justify-center text-grafito-55 hover:text-basalto-90 transition-colors"
              aria-label="Cerrar ficha de tienda"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido desplazable único (sin doble scrollbar) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-4">

        <div className="flex items-start gap-2.5 rounded-xl bg-caliza-5 px-3.5 py-3">
          <Clock className="w-4 h-4 text-grafito-55 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 text-[12px] leading-[18px]">
            <span className="block font-medium text-basalto-90">{activityDate?.title || "Última actualización de la ficha"}</span>
            {activityDate ? (
              <p className="text-grafito-55 mt-0.5">
                <time dateTime={activityDate.dateTime}>{activityDate.label}</time>
                <span className="block text-[11px]">Hora de Lima</span>
              </p>
            ) : (
              <p className="text-grafito-55 mt-0.5">Fecha exacta no registrada</p>
            )}
          </div>
        </div>

        {item.lookMatch && (
          <div className="mt-4 text-[12px] leading-[18px] text-grafito-55">
            <p className="font-medium text-higo-70">
              Opciones para {item.lookMatch.matchedPieces} de {item.lookMatch.totalPieces} prendas de ropa del look. El porcentaje resume la afinidad; no indica que sean idénticas.
            </p>
            {item.lookMatch.missingPieces.length > 0 && (
              <p>Sin coincidencia suficiente en esta tienda: {item.lookMatch.missingPieces.join(", ")}.</p>
            )}
          </div>
        )}

        {/* Rejilla fotográfica sobre el pliegue: Imagen principal 4:5 + mampostería de 3 columnas (Pág. 13) */}
        {item.searchMode === "look" && matchingGarments && matchingGarments.length > 1 ? (
          <div className="mt-5">
            <span className="text-[13px] font-medium text-basalto-90 block mb-2.5">
              Prendas para armar tu look en esta tienda ({matchingGarments.length})
            </span>
            <div className={`grid ${matchingGarments.length >= 3 ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
              {matchingGarments.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGarment(g)}
                  className="bg-caliza-10 rounded-2xl p-3 flex flex-col items-center cursor-pointer photo-frame"
                >
                  <div className="w-full h-44 bg-caliza-5 rounded-xl flex items-center justify-center p-2 overflow-hidden photo-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.photoUrl}
                      alt={g.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-[12px] font-medium text-basalto-90 mt-2 text-center line-clamp-2">
                    {g.name}
                  </span>
                  <span className="text-[11px] text-grafito-55 mt-0.5">{g.category}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="w-full h-72 sm:h-80 bg-white flex items-center justify-center p-4 overflow-hidden photo-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={selectedGarment?.id || bestGarment.id}
                src={selectedGarment?.photoUrl || bestGarment.photoUrl}
                alt={selectedGarment?.name || bestGarment.name}
                className="max-h-full max-w-full object-contain animate-vibra-fade"
              />
            </div>
            <p className="text-center text-[13px] text-grafito-55 mt-2">
              {selectedGarment && selectedGarment.id !== bestGarment.id ? (
                <>
                  Prenda del catálogo:{" "}
                  <strong className="text-basalto-90 font-semibold">{selectedGarment.name}</strong>
                </>
              ) : (
                <>
                  Mayor resonancia:{" "}
                  <strong className="text-basalto-90 font-semibold">{bestGarment.name}</strong>
                </>
              )}
            </p>
          </div>
        )}

        {/* Mampostería de 3 columnas con el resto de prendas publicadas (Radio 12px + filete interior 1px, pág. 13) */}
        {store.garments && store.garments.length > 1 && (
          <div className="mt-4 p-4 rounded-2xl neu-sunken">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[13px] font-medium text-basalto-90">
                Catálogo publicado ({store.garments.length} imágenes)
              </span>
              <span className="text-[11px] text-grafito-55">Toca una prenda para verla</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {store.garments.map((g) => {
                const isSelected = (selectedGarment?.id || bestGarment.id) === g.id;
                const isBestMatch = g.id === bestGarment.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGarment(g)}
                    className={`p-1.5 rounded-[12px] flex flex-col items-center text-center transition-all duration-180 ease-vibra active:scale-95 ${
                      isSelected
                        ? "bg-white ring-2 ring-higo-70 shadow-xs"
                        : "bg-white/85 hover:bg-white"
                    } photo-frame`}
                  >
                    <div className="w-full h-20 bg-white rounded-[10px] overflow-hidden flex items-center justify-center p-1 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.photoUrl}
                        alt={g.name}
                        className="max-h-full max-w-full object-contain"
                      />
                      {isBestMatch && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-higo-70 text-white text-[9px] font-medium rounded-full">
                          Mayor afinidad
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-normal text-basalto-90 mt-1 line-clamp-1 w-full px-0.5">
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tríada de ubicación bajo las imágenes con filetes verticales (Pág. 12 y 13) */}
        <div className="grid grid-cols-3 mt-5 py-3.5 px-4 rounded-2xl bg-caliza-10 border border-caliza-20">
          <div className="pr-3">
            <span className="text-[11px] leading-[15px] text-grafito-55 block">Galería</span>
            <span className="text-[15px] sm:text-[16px] leading-[22px] font-semibold text-basalto-90 block mt-0.5">
              {store.gallery}
            </span>
          </div>
          <div className="px-3 border-l border-caliza-20">
            <span className="text-[11px] leading-[15px] text-grafito-55 block">Piso</span>
            <span className="text-[15px] sm:text-[16px] leading-[22px] font-semibold text-basalto-90 tabular-nums block mt-0.5">
              {store.floor}
            </span>
          </div>
          <div className="pl-3 border-l border-caliza-20">
            <span className="text-[11px] leading-[15px] text-grafito-55 block">Stand</span>
            <span className="text-[15px] sm:text-[16px] leading-[22px] font-semibold text-basalto-90 tabular-nums block mt-0.5">
              {store.stand}
            </span>
          </div>
        </div>

        {/* Espacio físico en familia Neblina (Rutas, planos, orientación y enlaces, pág. 7 y 13) */}
        <div className="mt-3 p-3.5 rounded-2xl bg-neblina-30/45 border border-neblina-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-neblina-70 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-basalto-90 block truncate">
                {store.galleryAddress || "Gamarra, La Victoria"}
              </span>
              <span className="text-[12px] text-grafito-55 block mt-0.5">
                {store.referenceLocation || `Ingreso principal · Piso ${store.floor}, Stand ${store.stand}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (inRoute) {
                  removeFromRoute(store.id);
                } else {
                  addToRoute(store);
                }
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border ${
                inRoute
                  ? "bg-neblina-70 text-white border-neblina-70"
                  : "bg-caliza-5 text-neblina-70 border-neblina-70/40 hover:border-neblina-70"
              }`}
            >
              {inRoute ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>En tu ruta</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sumar a ruta</span>
                </>
              )}
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-caliza-5 border border-neblina-70/40 hover:border-neblina-70 text-[12px] font-medium text-neblina-70 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-neblina-70" />
              <span>Abrir mapa</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Resumen de resonancia (Pág. 13) */}
        <p className="mt-4 text-[13px] leading-[19px] font-medium text-basalto-90">
          Afinidad <span className="tabular-nums font-semibold text-higo-70">{formattedScore}</span> con tu búsqueda, calculada sobre{" "}
          <span className="tabular-nums font-semibold">{store.garments.length}</span> imágenes publicadas por la tienda.
        </p>

        {/* Foto del stand físico para reconocer la tienda en la galería */}
        {store.standPhotoUrl && (
          <div className="mt-5">
            <span className="text-[13px] font-medium text-basalto-90 block mb-2">
              Así se ve el stand físico
            </span>
            <div className="flex justify-center">
              <div className="inline-flex w-fit max-w-full bg-white rounded-2xl overflow-hidden p-1.5 photo-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.standPhotoUrl}
                  alt={`Stand de ${store.name}`}
                  className="max-h-72 sm:max-h-80 w-auto max-w-full h-auto object-contain rounded-xl block"
                />
              </div>
            </div>
            <p className="text-[11px] leading-[17px] text-grafito-55 mt-2 text-center">
              Referencia visual del puesto para ubicarlo al caminar por los pasillos de {store.gallery}.
            </p>
          </div>
        )}

        {/* Metadatos de tienda (Estilos, precio, tallas, redes) */}
        <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 mt-4 pt-4 border-t border-caliza-20 text-[13px]">
          <div>
            <span className="text-grafito-55 text-[11px] block">Estilos de la tienda</span>
            <span className="font-medium text-basalto-90">{store.styles.join(" · ")}</span>
          </div>

          <div>
            <span className="text-grafito-55 text-[11px] block">Nivel de precio</span>
            <span className="font-medium text-basalto-90 tabular-nums">
              {store.priceLevel === "economico"
                ? "S/ · Económico"
                : store.priceLevel === "medio"
                ? "S/S/ · Medio"
                : "S/S/S/ · Alto"}
            </span>
          </div>

          <div>
            <span className="text-grafito-55 text-[11px] block">Tallas que trabaja</span>
            <span className="font-medium text-basalto-90">{store.sizes.join(", ")}</span>
          </div>

          <div>
            <span className="text-grafito-55 text-[11px] block">Modalidad de compra</span>
            <span className="font-medium text-basalto-90">
              {store.purchaseType === "envio"
                ? "En tienda y con envío"
                : store.purchaseType === "presencial"
                ? "Solo en tienda"
                : "Venta por unidad y mayor"}
            </span>
          </div>

          {store.instagram && (
            <div className="min-w-0">
              <span className="text-grafito-55 text-[11px] block">Instagram</span>
              <a
                href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-higo-70 hover:underline inline-flex items-center gap-1 max-w-full"
              >
                <span className="truncate">
                  {store.instagram.startsWith("@") ? store.instagram : `@${store.instagram}`}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {store.tiktok && (
            <div className="min-w-0">
              <span className="text-grafito-55 text-[11px] block">TikTok</span>
              <a
                href={`https://tiktok.com/@${store.tiktok.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-higo-70 hover:underline inline-flex items-center gap-1 max-w-full"
              >
                <span className="truncate">
                  {store.tiktok.startsWith("@") ? store.tiktok : `@${store.tiktok}`}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Aviso Micro justo encima de la barra de contacto (Regla explícita pág. 13) */}
        <div className="mt-6 pt-3 border-t border-caliza-20">
          <p className="text-[11px] leading-[17px] text-grafito-55 mb-3">
            El ranking usa fotografía publicada por la tienda. No confirmamos existencias ni tallas disponibles.
          </p>

          {/* Barra de contacto por WhatsApp en Higo 70 con etiqueta blanca (Pág. 13) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 min-h-[56px] bg-higo-70 hover:bg-vibra-600 active:scale-[0.99] text-white font-medium rounded-full transition-all duration-180 ease-vibra flex items-center justify-center gap-2.5 shadow-sm text-[15px]"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>Escribir por WhatsApp</span>
          </a>
          <p className="text-[11px] leading-[17px] text-grafito-55 mt-2 text-center">
            Confirma precio, talla y disponibilidad con la tienda.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};
