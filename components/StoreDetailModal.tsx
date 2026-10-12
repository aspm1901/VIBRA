"use client";

import React from "react";
import { SearchResultItem } from "@/types";
import { X, MessageCircle, MapPin, Store as StoreIcon, ShieldCheck, Navigation, ExternalLink } from "lucide-react";

interface StoreDetailModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ item, onClose }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-[#1a1a1f] border border-[#2e2e38] rounded-3xl p-6 md:p-8 text-gray-100 shadow-2xl my-8 max-h-[90vh] overflow-y-auto scrollbar-thin"
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
                src={bestGarment.photoUrl}
                alt={bestGarment.name}
                className="max-h-full max-w-full object-contain drop-shadow-md"
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-2 font-medium">
              Prenda coincidente: <span className="text-gray-200">{bestGarment.name}</span>
            </p>
          </div>
        )}

        {/* Badges de Ubicación */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 bg-[#20202a] p-3.5 rounded-2xl border border-[#2d2d3c]">
          <div className="text-left px-2">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Galería</span>
            <span className="text-base font-bold text-white truncate block mt-0.5">{store.gallery}</span>
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

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#28283a] hover:bg-[#34344e] border border-[#3e3e56] text-xs font-bold text-vibra-300 hover:text-white transition-all shadow-sm shrink-0 active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5 text-vibra-400" />
            <span>Cómo llegar (Google Maps)</span>
            <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
          </a>
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
            <div>
              <span className="text-slate-400 text-xs block mb-1">Instagram</span>
              <span className="font-bold text-vibra-300 text-base">{store.instagram}</span>
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

        {/* Botón de Contacto por WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-slate-950 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xl text-base"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span>Escribir por WhatsApp a la tienda</span>
        </a>
      </div>
    </div>
  );
};
