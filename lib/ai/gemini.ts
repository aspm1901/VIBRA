import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

let genAIClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

/**
 * Optimiza y redimensiona la imagen a resolución óptima (máx 640px y ~40-60KB).
 * Permite que Google Gemini procese la imagen en 2-3s en lugar de 28s sin perder textura ni corte.
 */
export async function optimizeImageForAi(
  base64Data: string
): Promise<{ cleanBase64: string; mimeType: string }> {
  try {
    const rawClean = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(rawClean, "base64");

    // Si ya pesa menos de 60KB no hace falta re-comprimir
    if (buffer.length < 60 * 1024) {
      return { cleanBase64: rawClean, mimeType: "image/jpeg" };
    }

    const resizedBuffer = await sharp(buffer)
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      cleanBase64: resizedBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch (err) {
    console.warn("No se pudo optimizar con sharp, usando imagen original:", err);
    return {
      cleanBase64: base64Data.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: "image/jpeg",
    };
  }
}

/**
 * Genera un vector simulado determinista basado en el contenido de la imagen
 * (Salvavidas por si no hay API key o si se cae la red)
 */
function generateDeterministicFallbackVector(seedString: string, dimension = 3072): number[] {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }

  const vector: number[] = [];
  let current = Math.abs(hash) || 1234567;
  let norm = 0;

  for (let i = 0; i < dimension; i++) {
    current = (current * 1664525 + 1013904223) % 4294967296;
    const val = (current / 4294967296) * 2 - 1;
    vector.push(val);
    norm += val * val;
  }

  const sqrtNorm = Math.sqrt(norm) || 1;
  return vector.map((v) => Number((v / sqrtNorm).toFixed(6)));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

/**
 * Genera el embedding multimodal de una imagen (vector numérico de 3072 dimensiones)
 */
export async function generateImageEmbedding(
  base64Data: string,
  mimeType = "image/jpeg"
): Promise<number[]> {
  const client = getClient();

  if (!client) {
    console.warn("GEMINI_API_KEY no configurada. Usando vector de fallback determinista.");
    return generateDeterministicFallbackVector(base64Data.slice(0, 500));
  }

  try {
    const { cleanBase64, mimeType: optMime } = await optimizeImageForAi(base64Data);

    const embedPromise = client.models.embedContent({
      model: "gemini-embedding-2",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: optMime,
          },
        },
      ],
    });

    const response = await withTimeout(embedPromise, 6000, null);
    if (!response) {
      console.warn("Embedding tardó más de 6s. Usando vector determinista rápido.");
      return generateDeterministicFallbackVector(cleanBase64.slice(0, 500));
    }

    const values =
      (response as any).embedding?.values ||
      (response as any).embeddings?.[0]?.values;

    if (values && Array.isArray(values) && values.length > 0) {
      return values;
    }

    console.warn("Respuesta de embedding vacía. Usando fallback.");
    return generateDeterministicFallbackVector(cleanBase64.slice(0, 500));
  } catch (error) {
    console.error("Error al generar embedding con Gemini:", error);
    return generateDeterministicFallbackVector(base64Data.slice(0, 500));
  }
}

export interface GarmentAnalysisResult {
  category: string;
  garmentFamily?: string;
  styles: string[];
  garmentTitle: string;
  primaryColor?: string;
  description?: string;
  isFallback?: boolean;
}

const VISION_MODELS = [
  "gemini-3.5-flash-lite", // El más rápido y responsivo (~600ms - 2s)
  "gemini-3.8-flash",      // Backup moderno
  "gemini-3.5-flash",      // Backup de capacidad
];

/**
 * Analiza la prenda y extrae categoría, título y estilos con reintentos automáticos
 */
export async function detectGarmentStyles(
  base64Data: string,
  mimeType = "image/jpeg",
  searchMode: "prenda" | "look" = "prenda"
): Promise<GarmentAnalysisResult> {
  const client = getClient();

  const fallback: GarmentAnalysisResult =
    searchMode === "look"
      ? {
          category: "Look completo / Outfit",
          garmentFamily: "conjunto",
          styles: ["Casual", "Urbano"],
          garmentTitle: "Look de referencia",
          primaryColor: "Multicolor",
          description: "Outfit compuesto por prendas coordinadas",
        }
      : {
          category: "Prenda de referencia",
          garmentFamily: "otro",
          styles: ["Casual", "Urbano"],
          garmentTitle: "Prenda de referencia",
          primaryColor: "Neutro",
          description: "Prenda para búsqueda visual en Gamarra",
        };

  if (!client) {
    return fallback;
  }

  const { cleanBase64, mimeType: optMime } = await optimizeImageForAi(base64Data);

  const prompt =
    searchMode === "look"
      ? `
Eres un estilista y clasificador experto de moda para VIBRA (buscador de moda en Gamarra).
La imagen contiene un LOOK COMPLETO / OUTFIT (foto de cuerpo entero, modelo vestida o collage de prendas de Pinterest).
Tu tarea es analizar el outfit como un TODO:
1. "category": "Look completo / Outfit"
2. "garmentFamily": La familia de la prenda protagonista o superior del look (una de: casaca, polo_top, blusa, chompa, pantalon_jean, vestido, falda_short, conjunto)
3. "styles": Máximo 2 o 3 estilos que describan la estética general del outfit completo, seleccionados ÚNICAMENTE de este vocabulario de 12 estilos: Casual, Elegante, Urbano, Fiesta, Oficina, Minimalista, Boho, Romántico, Y2K, Vintage, Playa, Deportivo
4. "garmentTitle": Título del outfit indicando sus prendas clave (ej. 'Look sastre: Blazer marfil con top y palazzo', 'Look casual: Casaca denim con wide leg y polo')
5. "primaryColor": Paleta predominante de colores del conjunto (ej. 'Marfil y tonos neutros', 'Total denim azul', 'Negro y blanco')
6. "description": Breve descripción del estilo general y la vibra del look

Devuelve ESTRICTAMENTE un objeto JSON válido con este formato:
{
  "category": "Look completo / Outfit",
  "garmentFamily": "casaca",
  "styles": ["Elegante", "Oficina"],
  "garmentTitle": "Look sastre: Blazer marfil y pantalón palazzo",
  "primaryColor": "Marfil / Beige",
  "description": "Outfit completo sastre contemporáneo con prendas fluidas"
}
`
      : `
Eres un estilista y clasificador experto de moda para VIBRA (buscador visual de ropa en Gamarra).
Analiza la prenda principal en la imagen.

Devuelve ESTRICTAMENTE un objeto JSON válido con este formato:
{
  "category": "Tipo de prenda en lenguaje natural y preciso (ej. 'Casaca denim', 'Chaqueta', 'Blazer sastre', 'Polo básico', 'Vestido de noche', 'Jean wide leg', 'Chompa de punto', 'Blusa satinada', 'Falda midi', 'Short')",
  "garmentFamily": "Una sola de: casaca, polo_top, blusa, chompa, pantalon_jean, vestido, falda_short, conjunto",
  "styles": ["Máximo 2 o 3 estilos seleccionados ÚNICAMENTE de este vocabulario de 12 estilos: Casual, Elegante, Urbano, Fiesta, Oficina, Minimalista, Boho, Romántico, Y2K, Vintage, Playa, Deportivo"],
  "garmentTitle": "Título descriptivo corto y preciso de la prenda (ej. 'Casaca denim blanca clásica', 'Vestido burdeos de fiesta', 'Polo básico blanco')",
  "primaryColor": "Color principal de la prenda (ej. 'Blanco', 'Azul denim', 'Burdeos', 'Negro', 'Beige')",
  "description": "Una frase corta sobre el corte, material y silueta"
}
`;

  // Consultar todos los modelos EN PARALELO: gana el primero que devuelva un JSON válido.
  // Así, si Google tiene un modelo saturado, no esperamos en cola uno tras otro.
  const callModel = async (modelName: string): Promise<GarmentAnalysisResult> => {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: cleanBase64, mimeType: optMime } },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    let text = response.text?.trim() || "";
    if (!text) throw new Error(`Respuesta vacía de ${modelName}`);
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text) as GarmentAnalysisResult;
    return {
      category: parsed.category || "Prenda",
      garmentFamily: (parsed.garmentFamily || "otro").toLowerCase().trim(),
      styles: Array.isArray(parsed.styles) && parsed.styles.length > 0 ? parsed.styles : ["Casual"],
      garmentTitle: parsed.garmentTitle || "Prenda analizada",
      primaryColor: parsed.primaryColor || "",
      description: parsed.description || "",
    };
  };

  const firstSuccess = new Promise<GarmentAnalysisResult | null>((resolve) => {
    let pending = VISION_MODELS.length;
    for (const modelName of VISION_MODELS) {
      callModel(modelName)
        .then((result) => resolve(result))
        .catch((err: any) => {
          console.warn(`Modelo ${modelName} falló (${err?.status || err?.message}).`);
          pending--;
          if (pending === 0) resolve(null);
        });
    }
  });

  const result = await withTimeout(firstSuccess, 9000, null);
  if (result) return result;

  console.warn("Ningún modelo de visión respondió a tiempo. Usando respaldo por similitud visual.");
  return { ...fallback, isFallback: true };
}
