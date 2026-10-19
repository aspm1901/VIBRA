import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { Store } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey)
);

// Cliente público para el frontend o lecturas anónimas
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey)
  : null;

// Cliente con permisos de administración (para insertar tiendas y subir imágenes sin restricciones RLS)
export function getSupabaseAdmin() {
  if (!isSupabaseConfigured) return null;
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

export const STORAGE_BUCKET_NAME = "vibra-media";

/**
 * Sube una imagen base64 a Supabase Storage (comprimiendo en servidor si supera 120KB) y retorna su URL pública
 */
export async function uploadImageToStorage(
  base64Data: string,
  storagePath: string
): Promise<string> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error("Supabase no está configurado para almacenamiento.");
  }

  // Detectar MIME type automáticamente (image/jpeg, image/png, image/webp, image/heif)
  const mimeMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  let contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  let buffer: Buffer = Buffer.from(cleanBase64, "base64");

  // Si pesa más de 120KB o no es JPEG estándar, intentamos comprimir y estandarizar a JPEG con sharp
  if (buffer.length > 120 * 1024 || contentType !== "image/jpeg") {
    try {
      buffer = await sharp(buffer)
        .rotate()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      contentType = "image/jpeg";
    } catch (sharpErr) {
      console.warn("No se pudo convertir imagen con sharp en storage, subiendo original:", sharpErr);
    }
  }

  const { error } = await adminClient.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("Error al subir imagen a Supabase Storage:", error);
    throw error;
  }

  const { data } = adminClient.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
