import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { LOOK_CLOTHING_FAMILIES, hasIncompleteLookPieces, sanitizeLookPieces, type LookPiece } from "@/lib/look-pieces";

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
  const mimeMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  const originalMime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const rawClean = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

  try {
    const buffer = Buffer.from(rawClean, "base64");

    // Si ya pesa menos de 35KB y es JPEG/PNG/WebP no hace falta re-comprimir
    if (
      buffer.length < 35 * 1024 &&
      ["image/jpeg", "image/png", "image/webp"].includes(originalMime)
    ) {
      return { cleanBase64: rawClean, mimeType: originalMime };
    }

    const resizedBuffer = await sharp(buffer)
      .resize(448, 448, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 76 })
      .toBuffer();

    return {
      cleanBase64: resizedBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch (err) {
    console.warn("No se pudo optimizar con sharp, usando imagen original:", err);
    return {
      cleanBase64: rawClean,
      mimeType: originalMime,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

/**
 * Genera el embedding multimodal de una imagen con reintento y timeout de 12 segundos.
 * Retorna null en caso de fallo estricto (no inventa vectores aleatorios).
 */
export async function generateImageEmbedding(
  base64Data: string,
  mimeType = "image/jpeg"
): Promise<number[] | null> {
  const client = getClient();
  if (!client || !base64Data) {
    return null;
  }

  const tryEmbed = async (): Promise<number[] | null> => {
    try {
      const { cleanBase64, mimeType: optMime } = await optimizeImageForAi(base64Data);

      const embedPromise = client.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: optMime,
            },
          },
        ],
      });

      const response = await withTimeout(embedPromise, 12000, null);
      if (!response) {
        return null;
      }

      const values =
        (response as any).embedding?.values ||
        (response as any).embeddings?.[0]?.values;

      if (values && Array.isArray(values) && values.length > 0) {
        return values;
      }
      return null;
    } catch (err) {
      console.warn("Intento de embedding falló:", err);
      return null;
    }
  };

  // Intento 1
  let result = await tryEmbed();
  if (result) return result;

  // Reintento único
  console.log("Reintentando embedding con Gemini...");
  result = await tryEmbed();
  return result;
}

export interface GarmentAnalysisResult {
  category: string;
  garmentFamily?: string;
  styles: string[];
  garmentTitle: string;
  primaryColor?: string;
  description?: string;
  isFallback?: boolean;
  pieces?: LookPiece[];
}

// Modelo principal y respaldos para el análisis del catálogo.
const VISION_MODEL_CASCADE = [
  "gemini-3.5-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

export const VALID_STYLES = [
  "Casual",
  "Elegante",
  "Urbano",
  "Fiesta",
  "Oficina",
  "Minimalista",
  "Boho",
  "Romántico",
  "Y2K",
  "Vintage",
  "Playa",
  "Deportivo",
];

export const VALID_GARMENT_FAMILIES = [
  "casaca",
  "polo_top",
  "blusa",
  "chompa",
  "pantalon_jean",
  "vestido",
  "falda_short",
  "conjunto",
  "otro",
];

/**
 * Normaliza y valida que los estilos devueltos pertenezcan a los 12 oficiales
 */
export function sanitizeStyles(rawStyles: string[] = []): string[] {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const validMap = new Map(VALID_STYLES.map((v) => [norm(v), v]));

  const filtered = rawStyles
    .map((s) => validMap.get(norm(s)))
    .filter((s): s is string => Boolean(s));

  const unique = Array.from(new Set(filtered));
  return unique.length > 0 ? unique.slice(0, 3) : ["Casual"];
}

/**
 * Analiza la prenda y extrae categoría, título y estilos con cascada secuencial anti-saturación
 */
export async function detectGarmentStyles(
  base64Data: string,
  mimeType = "image/jpeg",
  searchMode: "prenda" | "look" = "prenda",
  fastSearch = false
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

  if (!client || !base64Data) {
    return { ...fallback, isFallback: true };
  }

  const { cleanBase64, mimeType: optMime } = await optimizeImageForAi(base64Data);

  const prompt =
    searchMode === "look"
      ? `
Eres un estilista y clasificador experto de moda para VIBRA (buscador de moda en Gamarra).
La imagen contiene un LOOK COMPLETO / OUTFIT (foto de cuerpo entero, modelo vestida o collage de prendas de Pinterest).
Tu tarea es identificar la ROPA del outfit y su estética general:
1. "category": "Look completo / Outfit"
2. "garmentFamily": La familia de la prenda protagonista o superior del look (una de: casaca, polo_top, blusa, chompa, pantalon_jean, vestido, falda_short, conjunto, otro)
3. "styles": Máximo 2 o 3 estilos que describan la estética general del outfit completo, seleccionados ÚNICAMENTE de: Casual, Elegante, Urbano, Fiesta, Oficina, Minimalista, Boho, Romántico, Y2K, Vintage, Playa, Deportivo
4. "garmentTitle": Título del outfit indicando sus prendas clave (ej. 'Look sastre: Blazer marfil con top y palazzo')
5. "primaryColor": Paleta predominante de colores del conjunto (ej. 'Marfil y tonos neutros')
6. "description": Breve descripción del estilo general y la vibra del look
7. "pieces": De 1 a 3 prendas principales de ROPA visibles, con nombre, familia, color y caja de ubicación.
El nombre de CADA pieza debe precisar los rasgos visibles que la distinguen: tipo de top (halter, corset, strapless, cuello alto), largo de falda (mini, midi, larga), corte y tejido si se aprecian. No inventes materiales ni detalles ocultos. Ejemplo: "Top halter marrón sin mangas" y "Falda larga satinada marfil", no solo "Top" y "Falda".
IGNORA zapatos, bolsos, carteras, joyas, uñas, cinturones, sombreros y cualquier accesorio; NO son prendas a buscar.
Separa las piezas: un top y una falda son dos prendas; un blazer, blusa y pantalón son tres. Un vestido es una sola.
No inventes prendas tapadas ni agrupes todo como "conjunto". Si no hay ropa identificable, devuelve pieces: [].
La caja "box" encierra solo la prenda correspondiente y usa [ymin, xmin, ymax, xmax] con coordenadas de 0 a 1000 respecto de TODA la imagen.
En collages, ubica cada foto de prenda por separado. No incluyas otros objetos en su caja si se pueden excluir.

Devuelve ESTRICTAMENTE un objeto JSON con este formato:
{
  "category": "Look completo / Outfit",
  "garmentFamily": "casaca",
  "styles": ["Elegante", "Oficina"],
  "garmentTitle": "Look sastre: Blazer marfil y pantalón palazzo",
  "primaryColor": "Marfil / Beige",
  "description": "Outfit completo sastre contemporáneo con prendas fluidas",
  "pieces": [
    {"name": "Blazer marfil", "garmentFamily": "casaca", "primaryColor": "Marfil", "box": [50, 50, 550, 450]},
    {"name": "Pantalón palazzo", "garmentFamily": "pantalon_jean", "primaryColor": "Negro", "box": [550, 50, 950, 450]}
  ]
}
`
      : `
Eres un estilista y clasificador experto de moda para VIBRA (buscador visual de ropa en Gamarra).
Analiza la prenda principal en la imagen.
En "category" y "garmentTitle" precisa siempre los rasgos visibles que distinguen el subtipo: tipo de manga o tirante en prendas superiores (sin mangas, de tirantes, strapless, halter, manga corta, manga larga), largo en faldas o vestidos (corto/mini, midi, largo) y detalles clave de corte o textura si se aprecian (acanalado, de punto, drapeado, peplum, botones laterales, sastre).
Devuelve ESTRICTAMENTE un objeto JSON válido con este formato:
{
  "category": "Tipo de prenda en lenguaje natural y preciso (ej. 'Top sin mangas de punto', 'Polo básico de manga corta', 'Blazer sastre', 'Vestido largo de noche', 'Jean wide leg', 'Chompa de punto')",
  "garmentFamily": "Una sola de: casaca, polo_top, blusa, chompa, pantalon_jean, vestido, falda_short, conjunto, otro",
  "styles": ["Máximo 2 o 3 estilos seleccionados ÚNICAMENTE de: Casual, Elegante, Urbano, Fiesta, Oficina, Minimalista, Boho, Romántico, Y2K, Vintage, Playa, Deportivo"],
  "garmentTitle": "Título descriptivo corto y preciso de la prenda (ej. 'Top sin mangas acanalado con botones laterales', 'Vestido largo burdeos de fiesta')",
  "primaryColor": "Color principal de la prenda (ej. 'Blanco', 'Azul denim', 'Burdeos', 'Negro', 'Beige')",
  "description": "Una frase corta sobre el corte, material y silueta"
}
`;

  // Esquema estricto para modelos Gemini
  const responseSchema: any = {
    type: "OBJECT",
    properties: {
      category: { type: "STRING" },
      garmentFamily: {
        type: "STRING",
        enum: VALID_GARMENT_FAMILIES,
      },
      styles: {
        type: "ARRAY",
        items: {
          type: "STRING",
          enum: VALID_STYLES,
        },
      },
      garmentTitle: { type: "STRING" },
      primaryColor: { type: "STRING" },
      description: { type: "STRING" },
    },
    required: ["category", "garmentFamily", "styles", "garmentTitle", "primaryColor"],
  };
  if (searchMode === "look") {
    responseSchema.properties.pieces = {
      type: "ARRAY", maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          garmentFamily: { type: "STRING", enum: [...LOOK_CLOTHING_FAMILIES] },
          primaryColor: { type: "STRING" },
          box: { type: "ARRAY", items: { type: "NUMBER" }, minItems: 4, maxItems: 4 },
        },
        required: ["name", "garmentFamily", "primaryColor", "box"],
      },
    };
    responseSchema.required.push("pieces");
  }

  const callModel = async (modelName: string): Promise<GarmentAnalysisResult> => {
    const isGemma = modelName.startsWith("gemma");
    const isFlashLite = modelName.includes("flash-lite");
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
      config: isGemma
        ? { temperature: 0.1, maxOutputTokens: 1024 }
        : {
            responseMimeType: "application/json",
            responseSchema: responseSchema as any,
            temperature: 0.1,
            maxOutputTokens: 1024,
            ...(isFlashLite ? { thinkingConfig: { thinkingLevel: "MINIMAL" as any } } : {}),
          },
    });

    // Registrar solo métricas: nunca la imagen ni la respuesta de la clienta.
    console.info("VIBRA vision usage", {
      model: modelName,
      searchMode,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
      thinkingTokens: response.usageMetadata?.thoughtsTokenCount,
      finishReason: response.candidates?.[0]?.finishReason,
    });
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      throw new Error(`Respuesta incompleta de ${modelName}: límite de tokens`);
    }

    let text = response.text?.trim() || "";
    if (!text) throw new Error(`Respuesta vacía de ${modelName}`);
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text);
    if (searchMode === "look" && hasIncompleteLookPieces(parsed.pieces)) {
      throw new Error("La detección del look contiene prendas sin una ubicación válida.");
    }

    const rawColor = String(parsed.primaryColor || "").trim();
    const cleanColor = rawColor.length > 40 ? rawColor.split(/[.,;]/)[0].slice(0, 40).trim() : rawColor;

    return {
      category: parsed.category || "Prenda",
      garmentFamily: (parsed.garmentFamily || "otro").toLowerCase().trim(),
      styles: sanitizeStyles(parsed.styles),
      garmentTitle: parsed.garmentTitle || "Prenda analizada",
      primaryColor: cleanColor,
      description: parsed.description || "",
      ...(searchMode === "look" ? { pieces: sanitizeLookPieces(parsed.pieces) } : {}),
    };
  };

  // En búsqueda en vivo usamos el modelo vigente, con respaldo por catálogo si falla.
  if (fastSearch) {
    try {
      const fastWinner = await withTimeout(
        callModel("gemini-3.5-flash-lite"),
        14500,
        null
      );
      if (fastWinner) {
        return fastWinner;
      }
    } catch {
      // Si falla la visión, se usa el respaldo por similitud del catálogo.
    }
    return { ...fallback, isFallback: true };
  }

  // En subida de catálogo (/admin), recorremos la cascada secuencialmente para cuidar el RPM
  for (const modelName of VISION_MODEL_CASCADE) {
    try {
      const timeoutMs = modelName.startsWith("gemma") ? 18000 : 6500;
      const result = await withTimeout(callModel(modelName), timeoutMs, null);
      if (result) {
        return result;
      }
      console.warn(`Timeout en ${modelName}, pasando al siguiente modelo de respaldo...`);
    } catch (err: any) {
      console.warn(`Modelo ${modelName} ocupado (${err?.status || err?.message}), probando siguiente...`);
    }
  }

  console.warn("Ningún modelo de visión respondió a tiempo. Usando respaldo básico.");
  return { ...fallback, isFallback: true };
}
