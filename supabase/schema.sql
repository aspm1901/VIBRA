-- =========================================================
-- ESQUEMA DE BASE DE DATOS Y STORAGE PARA VIBRA (SUPABASE)
-- =========================================================

-- 1. Crear tabla principal de tiendas
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gallery TEXT NOT NULL,
  gallery_address TEXT,
  floor INTEGER,
  stand TEXT,
  reference_location TEXT,
  whatsapp TEXT,
  price_level TEXT DEFAULT 'medio',
  styles JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  purchase_type TEXT DEFAULT 'cualquiera',
  stand_photo_url TEXT,
  instagram TEXT,
  updated_at TEXT,
  garments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS) con acceso de lectura para todos
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública: cualquier comprador puede consultar las tiendas
DROP POLICY IF EXISTS "Permitir lectura publica de tiendas" ON public.stores;
CREATE POLICY "Permitir lectura publica de tiendas"
  ON public.stores FOR SELECT
  USING (true);

-- Política de escritura: permite crear y editar tiendas desde el panel de admin
DROP POLICY IF EXISTS "Permitir gestion de tiendas" ON public.stores;
CREATE POLICY "Permitir gestion de tiendas"
  ON public.stores FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Crear y configurar el bucket de Storage para las fotos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vibra-media', 'vibra-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para lectura pública de fotos
DROP POLICY IF EXISTS "Lectura publica de fotos de prendas" ON storage.objects;
CREATE POLICY "Lectura publica de fotos de prendas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vibra-media' OR bucket_id = 'VIBRA-Media');

DROP POLICY IF EXISTS "Subida de fotos de prendas y stands" ON storage.objects;
CREATE POLICY "Subida de fotos de prendas y stands"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vibra-media' OR bucket_id = 'VIBRA-Media');

-- 4. Tabla para rutas de compra guardadas ("Mi Ruta")
CREATE TABLE IF NOT EXISTS public.user_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_items JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_route UNIQUE (user_id)
);

ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir a usuarios gestionar su propia ruta" ON public.user_routes;
CREATE POLICY "Permitir a usuarios gestionar su propia ruta"
  ON public.user_routes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

