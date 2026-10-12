"use client";

import React from "react";
import { SearchResultItem } from "@/types";
import { X, MessageCircle, MapPin, Store as StoreIcon, ShieldCheck } from "lucide-react";

interface StoreDetailModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const { store, bestGarment, matchingGarments, resonanceScore, photoSimilarity, matchingStylesCount, totalSearchedStyles } = item;

  const formattedScore = resonanceScore.toFixed(2).replace(".", ",");
  const formattedPhotoSim = photoSimilarity.toFixed(2).replace(".", ",");

  const garmentsMention =
    item.searchMode === "look" && matchingGarments && matchingGarments.length > 1
      ? matchingGarments.map((g) => g.name).join(" y ")
      : bestGarment.name;

  const whatsappMessage = `Hola ${store.name}, los encontré en Vibra (resonancia ${formattedScore}). ¿Tienen disponibilidad de ${garmentsMention}? Estoy en la ${store.gallery}, stand ${store.stand}.`;
  const whatsappUrl = `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

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
        <div className="grid grid-cols-3 gap-2 mt-5 bg-[#23232b] p-3 rounded-2xl border border-[#2e2e38]">
          <div className="text-left px-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Galería</span>
            <span className="text-sm font-semibold text-white truncate block">{store.gallery}</span>
          </div>
          <div className="text-left px-2 border-l border-[#353540]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Piso</span>
            <span className="text-sm font-semibold text-white block">{store.floor}</span>
          </div>
          <div className="text-left px-2 border-l border-[#353540]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Stand</span>
            <span className="text-sm font-semibold text-white block">{store.stand}</span>
          </div>
        </div>

        {/* Referencia física de llegada */}
        <p className="text-xs text-gray-400 mt-2.5 flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-vibra-400 shrink-0 mt-0.5" />
          <span>{store.referenceLocation} ({store.galleryAddress})</span>
        </p>

        {/* Explicación de Resonancia */}
        <div className="mt-4 p-3 bg-vibra-950/40 border border-vibra-900/60 rounded-xl text-xs text-vibra-200 leading-relaxed">
          {item.searchMode === "estilo" ? (
            <>
              <strong>Resonancia por Estilo {formattedScore}:</strong> La tienda coincide en{" "}
              <strong>{matchingStylesCount} de {totalSearchedStyles}</strong> estilos buscados, destacando su especialidad y variedad para esta estética en Gamarra.
            </>
          ) : item.searchMode === "look" ? (
            <>
              <strong>Resonancia para Look Completo {formattedScore}:</strong> Evaluado con un{" "}
              <strong>70% en afinidad estética del outfit</strong> ({matchingStylesCount}/{totalSearchedStyles} estilos) y{" "}
              <strong>30% en armonía visual ({formattedPhotoSim})</strong> para ayudarte a armar este look.
            </>
          ) : (
            <>
              <strong>Resonancia {formattedScore} con tu prenda:</strong> Fidelidad de silueta y corte visual de{" "}
              <strong>{formattedPhotoSim}</strong> con <strong>{matchingStylesCount} de {totalSearchedStyles}</strong> estilos afines.
            </>
          )}
        </div>

        {/* Estilos que declara la tienda */}
        <div className="mt-5">
          <span className="text-xs font-semibold text-gray-300 block mb-2">
            Estilos que declara la tienda:
          </span>
          <div className="flex flex-wrap gap-2">
            {store.styles.map((style, idx) => (
              <span
                key={style}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                  idx === 0
                    ? "bg-vibra-700/80 text-white border border-vibra-500/50"
                    : "bg-[#25252e] text-gray-300 border border-[#353542]"
                }`}
              >
                {style} {idx === 0 && "· principal"}
              </span>
            ))}
          </div>
        </div>

        {/* Así se ve el stand */}
        <div className="mt-6">
          <span className="text-xs font-semibold text-gray-300 block mb-2">
            Así se ve el stand:
          </span>
          <div className="w-full h-44 bg-[#e4dfd7] rounded-2xl flex items-center justify-center overflow-hidden border border-[#d6cfc4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.standPhotoUrl}
              alt={`Stand de ${store.name}`}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Foto de ubicación: sirve para reconocer el stand físico al caminar por la galería.
          </p>
        </div>

        {/* Detalles de la tienda (Nivel de precio, Tallas, Compra) */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-6 pt-5 border-t border-[#2e2e38] text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Nivel de precio</span>
            <span className="font-bold text-white text-sm">
              {store.priceLevel === "economico" ? "S/ · Económico" : store.priceLevel === "medio" ? "S/ S/ · Medio" : "S/ S/ S/ · Alto"}
            </span>
            <span className="text-[10px] text-gray-500 block">Referencial según su prenda más vendida.</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Modalidad de compra</span>
            <span className="font-bold text-white text-sm">
              {store.purchaseType === "envio" ? "En tienda y con envío" : store.purchaseType === "presencial" ? "Solo presencial" : "Cualquiera"}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Tallas disponibles</span>
            <span className="font-bold text-white text-sm">{store.sizes.join(", ")}</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Última actualización de catálogo</span>
            <span className="font-bold text-white text-sm">{store.updatedAt}</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Categorías</span>
            <span className="font-bold text-white text-sm">{store.categories.join(", ")}</span>
          </div>

          {store.instagram && (
            <div>
              <span className="text-gray-400 block mb-0.5">Instagram</span>
              <span className="font-bold text-vibra-300 text-sm">{store.instagram}</span>
            </div>
          )}
        </div>

        {/* Cuadro de mensaje pre-armado de WhatsApp */}
        <div className="mt-6 p-3.5 bg-[#141418] rounded-2xl border border-[#2a2a34]">
          <span className="text-[11px] text-gray-400 block mb-1 font-medium">
            Mensaje que se enviará a la vendedora:
          </span>
          <p className="text-xs text-gray-200 italic font-mono bg-[#1c1c24] p-2.5 rounded-xl border border-[#2c2c38]">
            &ldquo;{whatsappMessage}&rdquo;
          </p>
        </div>

        {/* Botón de Contacto por WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-4 bg-vibra-500 hover:bg-vibra-600 active:scale-[0.99] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-vibra-950/40 text-sm"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span>Escribir por WhatsApp</span>
        </a>
      </div>
    </div>
  );
};
