"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Store, RouteItem } from "@/types";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface RouteContextType {
  routeItems: RouteItem[];
  addToRoute: (store: Store) => void;
  removeFromRoute: (storeId: string) => void;
  toggleVisited: (storeId: string) => void;
  clearRoute: () => void;
  isInRoute: (storeId: string) => boolean;
  isRouteDrawerOpen: boolean;
  setIsRouteDrawerOpen: (open: boolean) => void;
  user: User | null;
  isLoadingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "vibra_my_route";

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  // 1. Cargar ruta desde localStorage al inicializar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRouteItems(parsed);
        }
      }
    } catch (err) {
      console.warn("No se pudo leer la ruta de localStorage:", err);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  // 2. Guardar en localStorage cada vez que cambien los items (una vez hidratado)
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(routeItems));
    } catch (err) {
      console.warn("No se pudo persistir la ruta en localStorage:", err);
    }
  }, [routeItems, hasHydrated]);

  // Sincronizar hacia Supabase si el usuario está autenticado
  const syncWithSupabase = useCallback(async (userId: string, items: RouteItem[]) => {
    if (!supabase) return;
    const client = supabase;
    try {
      await client.from("user_routes").upsert(
        {
          user_id: userId,
          route_items: items,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.warn("Error al sincronizar ruta con Supabase:", err);
    }
  }, []);

  // 3. Manejo de autenticación con Supabase (Google OAuth)
  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return;
    }
    const client = supabase;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsLoadingAuth(false);

        if (currentUser) {
          try {
            const { data, error } = await client
              .from("user_routes")
              .select("route_items")
              .eq("user_id", currentUser.id)
              .maybeSingle();

            if (!error && data?.route_items && Array.isArray(data.route_items)) {
              const cloudItems: RouteItem[] = data.route_items;
              setRouteItems((localItems) => {
                const map = new Map<string, RouteItem>();
                cloudItems.forEach((item) => map.set(item.storeId, item));
                localItems.forEach((item) => map.set(item.storeId, item));
                const merged = Array.from(map.values());
                syncWithSupabase(currentUser.id, merged);
                return merged;
              });
            }
          } catch (fetchErr) {
            console.warn("Error cargando ruta remota:", fetchErr);
          }
        }
      } catch (authErr) {
        console.warn("Error obteniendo sesión de Supabase:", authErr);
        setIsLoadingAuth(false);
      }
    }

    initAuth();

    // Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoadingAuth(false);

      if (currentUser) {
        syncWithSupabase(currentUser.id, routeItems);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncWithSupabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Operaciones de ruta
  const addToRoute = useCallback(
    (store: Store) => {
      setRouteItems((prev) => {
        if (prev.some((item) => item.storeId === store.id)) {
          return prev;
        }
        const updated: RouteItem[] = [
          ...prev,
          {
            storeId: store.id,
            store,
            addedAt: Date.now(),
            visited: false,
          },
        ];
        if (user) {
          syncWithSupabase(user.id, updated);
        }
        return updated;
      });
    },
    [user, syncWithSupabase]
  );

  const removeFromRoute = useCallback(
    (storeId: string) => {
      setRouteItems((prev) => {
        const updated = prev.filter((item) => item.storeId !== storeId);
        if (user) {
          syncWithSupabase(user.id, updated);
        }
        return updated;
      });
    },
    [user, syncWithSupabase]
  );

  const toggleVisited = useCallback(
    (storeId: string) => {
      setRouteItems((prev) => {
        const updated = prev.map((item) =>
          item.storeId === storeId ? { ...item, visited: !item.visited } : item
        );
        if (user) {
          syncWithSupabase(user.id, updated);
        }
        return updated;
      });
    },
    [user, syncWithSupabase]
  );

  const clearRoute = useCallback(() => {
    setRouteItems([]);
    if (user) {
      syncWithSupabase(user.id, []);
    }
  }, [user, syncWithSupabase]);

  const isInRoute = useCallback(
    (storeId: string) => {
      return routeItems.some((item) => item.storeId === storeId);
    },
    [routeItems]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      alert("Supabase no está configurado en las variables de entorno.");
      return;
    }
    const client = supabase;
    try {
      const redirectOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectOrigin,
        },
      });
      if (error) {
        console.error("Error iniciando sesión con Google:", error);
        alert(`No se pudo iniciar sesión con Google: ${error.message}`);
      }
    } catch (err) {
      console.error("Excepción en signInWithGoogle:", err);
      alert("Ocurrió un error inesperado al conectar con Google.");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const client = supabase;
    try {
      await client.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  }, []);

  return (
    <RouteContext.Provider
      value={{
        routeItems,
        addToRoute,
        removeFromRoute,
        toggleVisited,
        clearRoute,
        isInRoute,
        isRouteDrawerOpen,
        setIsRouteDrawerOpen,
        user,
        isLoadingAuth,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute debe usarse dentro de un RouteProvider");
  }
  return context;
}
