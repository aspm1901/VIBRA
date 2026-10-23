"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRoute } from "./RouteContext";
import {
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Share2,
  Navigation,
  MessageCircle,
  ExternalLink,
  LogOut,
  Compass,
} from "lucide-react";
import { RouteItem } from "@/types";

export const RouteDrawer: React.FC = () => {
  const {
    routeItems,
    removeFromRoute,
    toggleVisited,
    clearRoute,
    isRouteDrawerOpen,
    setIsRouteDrawerOpen,
    user,
    signInWithGoogle,
    signOut,
  } = useRoute();

  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isRouteDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.removeProperty("overflow");
    }
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isRouteDrawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRouteDrawerOpen) {
        setIsRouteDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRouteDrawerOpen, setIsRouteDrawerOpen]);

  // Agrupar items por Galería y ordenar por piso dentro de cada galería (Pág. 13: orden por proximidad física y piso)
  const groupedByGallery = useMemo(() => {
    const groups: { [galleryName: string]: RouteItem[] } = {};
    for (const item of routeItems) {
      const gallery = item.store.gallery || "Otras galerías";
      if (!groups[gallery]) {
        groups[gallery] = [];
      }
      groups[gallery].push(item);
    }
    for (const gal of Object.keys(groups)) {
      groups[gal].sort((a, b) =>
        String(a.store.floor).localeCompare(String(b.store.floor), "es", { numeric: true })
      );
    }
    return groups;
  }, [routeItems]);

  const totalCount = routeItems.length;
  const visitedCount = routeItems.filter((i) => i.visited).length;

  const handleShareOnWhatsApp = () => {
    if (routeItems.length === 0) return;

    let text = `*Tu ruta en Gamarra · vibra*\n`;
    text += `${totalCount} ${totalCount === 1 ? "parada" : "paradas"}\n\n`;

    let stopIdx = 1;
    Object.entries(groupedByGallery).forEach(([gallery, items]) => {
      text += `*${gallery}*\n`;
      items.forEach((item) => {
        const check = item.visited ? "✓" : `${stopIdx}.`;
        text += `${check} ${item.store.name} · Piso ${item.store.floor} · Stand ${item.store.stand}\n`;
        stopIdx++;
      });
      text += `\n`;
    });

    const encoded = encodeURIComponent(text.trim());
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (!isRouteDrawerOpen) return null;

  let globalStopNumber = 0;
  const galleryEntries = Object.entries(groupedByGallery);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tu ruta por galería"
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
    >
      {/* Fondo oscurecido en Basalto 90 */}
      <div
        className="fixed inset-0 bg-basalto-90/60 backdrop-blur-sm animate-vibra-fade"
        onClick={() => setIsRouteDrawerOpen(false)}
      />

      {/* Hoja de ruta sobre Caliza 05 con dominio semántico Neblina (Pág. 7 y 13) */}
      <div className="relative w-full max-w-md bg-white sm:bg-caliza-5 border-l border-caliza-20 text-basalto-90 h-full flex flex-col shadow-2xl z-10 overflow-hidden animate-vibra-drawer">
        {/* Cabecera */}
        <div className="p-5 border-b border-caliza-20 flex items-center justify-between">
          <div>
            <h2
              className="font-display font-semibold text-[24px] leading-[29px] text-basalto-90"
              style={{ letterSpacing: "-0.015em" }}
            >
              Tu ruta · <span className="tabular-nums">{totalCount}</span>{" "}
              {totalCount === 1 ? "parada" : "paradas"}
            </h2>
            <p className="text-[11px] leading-[17px] text-grafito-55 mt-0.5">
              Ordenada por galería y piso para optimizar tramos caminados
            </p>
          </div>

          <button
            onClick={() => setIsRouteDrawerOpen(false)}
            className="w-10 h-10 rounded-full neu-chip flex items-center justify-center text-grafito-55 hover:text-basalto-90 transition-colors"
            aria-label="Cerrar ruta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plano esquemático desaturado en Caliza 10/20 con trazo punteado Neblina 70 (Pág. 13) */}
        {totalCount > 0 && (
          <div className="px-5 pt-4 pb-3 border-b border-caliza-20 bg-caliza-10/60">
            <div className="w-full h-28 rounded-2xl bg-caliza-10 border border-caliza-20 relative overflow-hidden p-3 flex items-center justify-center">
              <svg
                viewBox="0 0 320 96"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Retícula arquitectónica desaturada en Caliza 20 */}
                <rect x="14" y="10" width="90" height="34" rx="4" fill="#CFD1C7" opacity="0.55" />
                <rect x="116" y="10" width="88" height="34" rx="4" fill="#CFD1C7" opacity="0.55" />
                <rect x="216" y="10" width="90" height="34" rx="4" fill="#CFD1C7" opacity="0.55" />
                <rect x="14" y="54" width="90" height="32" rx="4" fill="#CFD1C7" opacity="0.55" />
                <rect x="116" y="54" width="88" height="32" rx="4" fill="#CFD1C7" opacity="0.55" />
                <rect x="216" y="54" width="90" height="32" rx="4" fill="#CFD1C7" opacity="0.55" />

                {/* Trazo de ruta en Neblina 70 de 3px punteado */}
                <path
                  d="M 58 70 L 110 34 L 246 34"
                  stroke="#566E7B"
                  strokeWidth="3"
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                />

                {/* Paradas como discos Neblina 70 con numeral blanco */}
                <circle cx="58" cy="70" r="8" fill="#566E7B" />
                <text x="58" y="73.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="600">
                  1
                </text>
                {totalCount >= 2 && (
                  <>
                    <circle cx="110" cy="34" r="8" fill="#566E7B" />
                    <text x="110" y="37.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="600">
                      2
                    </text>
                  </>
                )}
                {totalCount >= 3 && (
                  <>
                    <circle cx="246" cy="34" r="8" fill="#566E7B" />
                    <text x="246" y="37.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="600">
                      3
                    </text>
                  </>
                )}
              </svg>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3">
              <span className="text-[12px] text-grafito-55 tabular-nums">
                {visitedCount} de {totalCount} visitadas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareOnWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neblina-70 text-white text-[12px] font-medium transition-all active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar ruta</span>
                </button>

                {confirmClear ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        clearRoute();
                        setConfirmClear(false);
                      }}
                      className="px-2.5 py-1.5 rounded-full bg-oxido-65 text-white text-[12px] font-medium"
                    >
                      Vaciar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-2.5 py-1.5 rounded-full bg-caliza-20 text-basalto-90 text-[12px]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="p-1.5 rounded-full text-grafito-55 hover:text-oxido-65 transition-colors"
                    title="Vaciar paradas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Listado de paradas con espina continua Neblina 30 por galería (Pág. 13) */}
        <div className="flex-1 overflow-y-auto p-5">
          {totalCount === 0 ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-neblina-30 flex items-center justify-center text-neblina-70 mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-display text-[19px] leading-[25px] font-medium text-basalto-90">
                Aún no agregaste paradas
              </h3>
              <p className="text-[13px] leading-[20px] text-grafito-55 mt-1.5 max-w-xs">
                Pulsa en <strong className="text-neblina-70 font-medium">Sumar a ruta</strong> en las tiendas del ranking para agrupar tu recorrido por galería y piso.
              </p>
            </div>
          ) : (
            <div>
              {galleryEntries.map(([galleryName, items], gIdx) => (
                <div key={galleryName}>
                  {/* Cambio de edificio: rompe la espina e inserta un espacio de 24px con el tramo a pie (Pág. 13) */}
                  {gIdx > 0 && (
                    <div className="my-6 pl-3 flex items-center gap-2 text-[12px] text-neblina-70 font-medium">
                      <span className="w-2 h-2 rounded-full bg-neblina-30" />
                      <span>Cambio de edificio · Caminar hacia {galleryName}</span>
                    </div>
                  )}

                  <div className="space-y-0">
                    {items.map((item, idxInGallery) => {
                      globalStopNumber++;
                      const currentOrdinal = globalStopNumber;
                      const isVisited = !!item.visited;
                      const isLastInGallery = idxInGallery === items.length - 1;
                      const googleMapsUrl =
                        item.store.googleMapsUrl ||
                        (item.store.latitude && item.store.longitude
                          ? `https://www.google.com/maps/search/?api=1&query=${item.store.latitude},${item.store.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${item.store.gallery}, ${item.store.galleryAddress || "Gamarra, La Victoria, Lima"}`
                            )}`);

                      return (
                        <div key={item.storeId} className="relative flex items-stretch gap-3.5">
                          {/* Columna izquierda: Disco Neblina 70 con numeral blanco + espina continua Neblina 30 */}
                          <div className="flex flex-col items-center shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleVisited(item.storeId)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold tabular-nums transition-colors ${
                                isVisited
                                  ? "bg-neblina-30 text-neblina-70"
                                  : "bg-neblina-70 text-white"
                              }`}
                              title={isVisited ? "Marcar como pendiente" : "Marcar como visitada"}
                            >
                              {isVisited ? "✓" : currentOrdinal}
                            </button>
                            {!isLastInGallery && (
                              <div className="w-[3px] flex-1 bg-neblina-30 my-1 rounded-full min-h-[28px]" />
                            )}
                          </div>

                          {/* Datos de la parada */}
                          <div className={`flex-1 pb-5 min-w-0 ${isVisited ? "opacity-60" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`font-display text-[17px] leading-[22px] font-medium text-basalto-90 truncate ${
                                  isVisited ? "line-through" : ""
                                }`}
                              >
                                {item.store.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeFromRoute(item.storeId)}
                                className="text-grafito-55 hover:text-oxido-65 p-1 transition-colors"
                                title="Quitar parada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[13px] leading-[19px] text-grafito-55 tabular-nums mt-0.5">
                              {galleryName.replace(/^Galería\s+/i, "")} · piso {item.store.floor} · stand {item.store.stand}
                            </p>

                            {item.store.referenceLocation && (
                              <p className="text-[12px] leading-[18px] text-neblina-70 mt-0.5">
                                {item.store.referenceLocation}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <a
                                href={`https://wa.me/${item.store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `Hola ${item.store.name}, estoy en ${item.store.gallery} siguiendo mi ruta en vibra. ¿Están atendiendo en el Stand ${item.store.stand}?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-higo-70 text-white text-[11px] font-medium"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>

                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neblina-30/60 text-neblina-70 text-[11px] font-medium"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Mapa</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>

                              <button
                                type="button"
                                onClick={() => toggleVisited(item.storeId)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-grafito-55 hover:text-basalto-90"
                              >
                                {isVisited ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-neblina-70" />
                                    <span>Visitada</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-3.5 h-3.5" />
                                    <span>Marcar visita</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie de sincronización en Caliza 10 */}
        <div className="p-4 border-t border-caliza-20 bg-caliza-10">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-basalto-90 truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-[11px] text-neblina-70">Ruta guardada en tu cuenta</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="px-3 py-1.5 rounded-xl bg-caliza-5 text-grafito-55 hover:text-basalto-90 text-[12px] border border-caliza-20 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-grafito-55 leading-snug">
                Conecta tu cuenta para abrir esta ruta en tu teléfono.
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="shrink-0 py-2 px-3.5 rounded-xl bg-caliza-5 hover:bg-white text-basalto-90 font-medium text-[12px] border border-caliza-20 shadow-xs"
              >
                Conectar Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
