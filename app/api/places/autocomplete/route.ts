import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Galerías emblemáticas de Gamarra como respaldo instantáneo
const GAMARRA_PRESETS = [
  {
    placeId: "preset-santa-rosa",
    mainText: "Galería Santa Rosa",
    secondaryText: "Jirón Gamarra 789, La Victoria, Lima",
    fullText: "Galería Santa Rosa, Jirón Gamarra 789, La Victoria, Lima",
    latitude: -12.0662726,
    longitude: -77.0131215,
  },
  {
    placeId: "preset-el-rey",
    mainText: "Galería El Rey de Gamarra",
    secondaryText: "Jirón Agustín Gamarra 1000, La Victoria, Lima",
    fullText: "Galería El Rey de Gamarra, Jirón Agustín Gamarra 1000, La Victoria, Lima",
    latitude: -12.06495,
    longitude: -77.01255,
  },
  {
    placeId: "preset-san-pedro",
    mainText: "Galería San Pedro",
    secondaryText: "Jirón General Gamarra 1160, La Victoria, Lima",
    fullText: "Galería San Pedro, Jirón General Gamarra 1160, La Victoria, Lima",
    latitude: -12.0638,
    longitude: -77.0122,
  },
  {
    placeId: "preset-guizado",
    mainText: "Galería Guizado",
    secondaryText: "Jirón Agustín Gamarra 640, La Victoria, Lima",
    fullText: "Galería Guizado, Jirón Agustín Gamarra 640, La Victoria, Lima",
    latitude: -12.0678,
    longitude: -77.0135,
  },
  {
    placeId: "preset-gama-moda",
    mainText: "Gama Moda Plaza",
    secondaryText: "Av. Aviación 1050, La Victoria, Lima",
    fullText: "Gama Moda Plaza, Av. Aviación 1050, La Victoria, Lima",
    latitude: -12.0642,
    longitude: -77.0108,
  },
  {
    placeId: "preset-canepa",
    mainText: "Parque Cánepa",
    secondaryText: "Jirón Agustín Gamarra 1100, La Victoria, Lima",
    fullText: "Parque Cánepa, Jirón Agustín Gamarra 1100, La Victoria, Lima",
    latitude: -12.0645,
    longitude: -77.0128,
  },
  {
    placeId: "preset-cristo-rey",
    mainText: "Galería Cristo Rey",
    secondaryText: "Jirón Gamarra 880, La Victoria, Lima",
    fullText: "Galería Cristo Rey, Jirón Gamarra 880, La Victoria, Lima",
    latitude: -12.0655,
    longitude: -77.0130,
  },
  {
    placeId: "preset-yuyi",
    mainText: "Galería Yuyi",
    secondaryText: "Jirón Sebastián Barranca 1600, La Victoria, Lima",
    fullText: "Galería Yuyi, Jirón Sebastián Barranca 1600, La Victoria, Lima",
    latitude: -12.0671,
    longitude: -77.0124,
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input")?.trim() || "";
  const sessionToken = searchParams.get("sessionToken") || "";

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const payload: any = {
        input,
        includedRegionCodes: ["pe"],
        locationBias: {
          circle: {
            center: {
              latitude: -12.066,
              longitude: -77.0135,
            },
            radius: 20000.0,
          },
        },
      };

      if (sessionToken) {
        payload.sessionToken = sessionToken;
      }

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const suggestions = data.suggestions || [];
        const predictions = suggestions.map((s: any) => {
          const p = s.placePrediction || {};
          return {
            placeId: p.placeId,
            mainText: p.structuredFormat?.mainText?.text || p.text?.text || "",
            secondaryText: p.structuredFormat?.secondaryText?.text || "",
            fullText: p.text?.text || "",
          };
        });

        if (predictions.length > 0) {
          return NextResponse.json({ predictions });
        }
      } else {
        const errText = await res.text();
        console.warn("Places API error, cayendo a presets:", res.status, errText);
      }
    } catch (err) {
      console.warn("Fallo de red en Places autocomplete:", err);
    }
  }

  // Fallback con galerías preconfiguradas de Gamarra
  const query = input.toLowerCase();
  const filteredPresets = GAMARRA_PRESETS.filter(
    (g) =>
      g.mainText.toLowerCase().includes(query) ||
      g.secondaryText.toLowerCase().includes(query)
  );

  return NextResponse.json({
    predictions: filteredPresets.map((p) => ({
      placeId: p.placeId,
      mainText: p.mainText,
      secondaryText: p.secondaryText,
      fullText: p.fullText,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
  });
}
