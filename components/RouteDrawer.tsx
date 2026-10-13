"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRoute } from "./RouteContext";
import {
  X,
  MapPin,
  CheckCircle2,
  Circle,
  Trash2,
  Share2,
  Navigation,
  MessageCircle,
  ExternalLink,
  LogIn,
  LogOut,
  Building2,
  Sparkles,
  ShoppingBag,
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

  // Bloquear scroll de fondo de forma segura
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

  // Manejar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRouteDrawerOpen) {
        setIsRouteDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRouteDrawerOpen, setIsRouteDrawerOpen]);

  // Agrupar items por Galería
  const groupedByGallery = useMemo(() => {
    const groups: { [galleryName: string]: RouteItem[] } = {};
    for (const item of routeItems) {
      const gallery = item.store.gallery || "Otras Galerías";
      if (!groups[gallery]) {
        groups[gallery] = [];
      }
      groups[gallery].push(item);
    }
    return groups;
  }, [routeItems]);

  const totalCount = routeItems.length;
  const visitedCount = routeItems.filter((i) => i.visited).length;
  const progressPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  // Compartir ruta por WhatsApp
  const handleShareOnWhatsApp = () => {
    if (routeItems.length === 0) return;

    let text = `🛍️ *Mi Ruta de Compras en Gamarra (VIBRA)*\n\n`;
    text += `Total de paradas: ${totalCount} tiendas\n\n`;

    Object.entries(groupedByGallery).forEach(([gallery, items]) => {
      text += `🏢 *${gallery}*\n`;
      items.forEach((item) => {
        const check = item.visited ? "✅" : "▫️";
        text += `${check} Stand ${item.store.stand} (Piso ${item.store.floor}) - ${item.store.name}\n`;
      });
      text += `\n`;
    });

    text += `🗺️ Creado con *VIBRA* · El buscador visual de Gamarra\nhttps://vibra.pe`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (!isRouteDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mi Ruta de Compras"
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
    >
      {/* Backdrop con desenfoque */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsRouteDrawerOpen(false)}
      />

      {/* Panel lateral */}
      <div className="relative w-full max-w-lg bg-[#14141a] border-l border-[#262635] text-gray-100 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* Cabecera del Drawer */}
        <div className="p-5 border-b border-[#242432] bg-[#171720] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-vibra-600 to-vibra-400 flex items-center justify-center text-white shadow-lg shadow-vibra-600/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Mi Ruta de Compras
              </h2>
              <p className="text-xs text-slate-400">
                {totalCount === 0
                  ? "Sin tiendas guardadas todavía"
                  : `${totalCount} ${totalCount === 1 ? "parada" : "paradas"} organizadas por galería`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRouteDrawerOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#252533] transition-colors"
            aria-label="Cerrar ruta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso y acciones rápidas si hay items */}
        {totalCount > 0 && (
          <div className="px-5 py-3.5 bg-[#1a1a24] border-b border-[#262635] flex flex-col gap-3">
            {/* Progreso de visita */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Progreso: <strong className="text-white">{visitedCount} de {totalCount}</strong> visitadas
              </span>
              <span className="text-vibra-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#242433] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-vibra-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleShareOnWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir por WhatsApp</span>
              </button>

              {confirmClear ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      clearRoute();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-2 rounded-xl bg-[#252533] text-slate-300 text-xs font-medium hover:bg-[#323242]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-2 rounded-xl bg-[#222230] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-[#303042] hover:border-red-800/60 text-xs font-medium transition-colors"
                  title="Vaciar ruta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contenido principal scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {totalCount === 0 ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#20202c] border border-[#2e2e42] flex items-center justify-center text-vibra-400 shadow-inner">
                <MapPin className="w-8 h-8 opacity-70" />
              </div>
              <div className="max-w-xs space-y-1.5">
                <h3 className="text-base font-bold text-white">Tu ruta está vacía</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cuando busques prendas en el catálogo, pulsa en el botón{" "}
                  <span className="text-vibra-300 font-semibold">+ Mi Ruta</span> en cualquier tienda para armar tu recorrido optimizado en Gamarra.
                </p>
              </div>
            </div>
          ) : (
            Object.entries(groupedByGallery).map(([galleryName, items]) => (
              <div
                key={galleryName}
                className="bg-[#191922] rounded-2xl border border-[#29293a] overflow-hidden shadow-sm"
              >
                {/* Cabecera de la Galería */}
                <div className="px-4 py-3 bg-[#20202d] border-b border-[#2c2c3e] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-vibra-400 shrink-0" />
                    <span className="font-bold text-white text-sm truncate">
                      {galleryName}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 px-2.5 py-0.5 rounded-full bg-[#2a2a3c] border border-[#3c3c52]">
                    {items.length} {items.length === 1 ? "tienda" : "tiendas"}
                  </span>
                </div>

                {/* Lista de tiendas en esta galería */}
                <div className="divide-y divide-[#242434]">
                  {items.map((item) => {
                    const isVisited = !!item.visited;
                    const googleMapsUrl =
                      item.store.googleMapsUrl ||
                      (item.store.latitude && item.store.longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${item.store.latitude},${item.store.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${item.store.gallery}, ${item.store.galleryAddress || "Gamarra, La Victoria, Lima"}`
                          )}`);

                    return (
                      <div
                        key={item.storeId}
                        className={`p-3.5 transition-colors ${
                          isVisited ? "bg-[#15151c]/60 opacity-60" : "hover:bg-[#1f1f2c]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox Visitado */}
                          <button
                            type="button"
                            onClick={() => toggleVisited(item.storeId)}
                            className="mt-0.5 text-slate-400 hover:text-vibra-400 transition-colors shrink-0"
                            title={isVisited ? "Marcar como pendiente" : "Marcar como visitado"}
                          >
                            {isVisited ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 hover:text-white" />
                            )}
                          </button>

                          {/* Foto miniatura del stand o prenda */}
                          {item.store.standPhotoUrl && (
                            <div className="w-12 h-12 rounded-xl bg-[#252533] overflow-hidden shrink-0 border border-[#353545]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.store.standPhotoUrl}
                                alt={item.store.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Info de la tienda */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4
                                className={`text-sm font-bold text-white truncate ${
                                  isVisited ? "line-through text-slate-400" : ""
                                }`}
                              >
                                {item.store.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeFromRoute(item.storeId)}
                                className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                title="Quitar de mi ruta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Ubicación precisa en galería */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-300">
                              <span className="font-semibold text-vibra-300">
                                Piso {item.store.floor}
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="font-semibold text-white">
                                Stand {item.store.stand}
                              </span>
                              {item.store.referenceLocation && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-400 text-[11px] truncate max-w-[140px]">
                                    {item.store.referenceLocation}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Botones de acción rápida */}
                            <div className="flex items-center gap-2 mt-2.5">
                              {/* WhatsApp */}
                              <a
                                href={`https://wa.me/${item.store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `Hola ${item.store.name}, estoy en Galería ${item.store.gallery} siguiendo mi ruta de compras en VIBRA. ¿Están atendiendo en el Stand ${item.store.stand}?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>

                              {/* Google Maps */}
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#252533] hover:bg-[#323244] text-slate-300 hover:text-white border border-[#353545] text-xs font-semibold transition-all active:scale-95"
                              >
                                <Navigation className="w-3 h-3 text-vibra-400" />
                                <span>Maps</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Sincronización con cuenta de Google / Estado de Sesión */}
        <div className="p-4 border-t border-[#242432] bg-[#171720]">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email || "Usuario"}
                    className="w-8 h-8 rounded-full border border-vibra-500/60 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-vibra-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {(user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Sparkles className="w-2.5 h-2.5" />
                    Ruta sincronizada en la nube
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="p-2 rounded-xl bg-[#222230] hover:bg-[#2e2e40] text-slate-400 hover:text-white text-xs font-medium border border-[#323244] transition-colors flex items-center gap-1"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#1c1c26] rounded-2xl p-3 border border-[#2b2b3a] flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-white">
                    Guarda tu ruta entre dispositivos
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Inicia con Google para no perder tus paradas al cambiar de teléfono o PC.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continuar con Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
