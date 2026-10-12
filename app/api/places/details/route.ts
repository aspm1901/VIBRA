import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const GAMARRA_PRESETS_MAP: Record<string, any> = {
  "preset-santa-rosa": {
    name: "Galería Santa Rosa",
    formattedAddress: "Agustín Gamarra 789, La Victoria 15018, Lima",
    latitude: -12.0662726,
    longitude: -77.0131215,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0662726,-77.0131215",
  },
  "preset-el-rey": {
    name: "Galería El Rey de Gamarra",
    formattedAddress: "Jirón Agustín Gamarra 1000, La Victoria 15018, Lima",
    latitude: -12.06495,
    longitude: -77.01255,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.06495,-77.01255",
  },
  "preset-san-pedro": {
    name: "Galería San Pedro",
    formattedAddress: "Jirón General Gamarra 1160, La Victoria 15018, Lima",
    latitude: -12.0638,
    longitude: -77.0122,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0638,-77.0122",
  },
  "preset-guizado": {
    name: "Galería Guizado",
    formattedAddress: "Jirón Agustín Gamarra 640, La Victoria 15018, Lima",
    latitude: -12.0678,
    longitude: -77.0135,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0678,-77.0135",
  },
  "preset-gama-moda": {
    name: "Gama Moda Plaza",
    formattedAddress: "Av. Aviación 1050, La Victoria 15018, Lima",
    latitude: -12.0642,
    longitude: -77.0108,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0642,-77.0108",
  },
  "preset-canepa": {
    name: "Parque Cánepa",
    formattedAddress: "Jirón Agustín Gamarra 1100, La Victoria 15018, Lima",
    latitude: -12.0645,
    longitude: -77.0128,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0645,-77.0128",
  },
  "preset-cristo-rey": {
    name: "Galería Cristo Rey",
    formattedAddress: "Jirón Gamarra 880, La Victoria 15018, Lima",
    latitude: -12.0655,
    longitude: -77.0130,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0655,-77.0130",
  },
  "preset-yuyi": {
    name: "Galería Yuyi",
    formattedAddress: "Jirón Sebastián Barranca 1600, La Victoria 15018, Lima",
    latitude: -12.0671,
    longitude: -77.0124,
    googleMapsUri: "https://www.google.com/maps/search/?api=1&query=-12.0671,-77.0124",
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim() || "";
  const sessionToken = searchParams.get("sessionToken") || "";

  if (!placeId) {
    return NextResponse.json({ error: "placeId es requerido" }, { status: 400 });
  }

  // Si es un preset interno
  if (GAMARRA_PRESETS_MAP[placeId]) {
    return NextResponse.json(GAMARRA_PRESETS_MAP[placeId]);
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      let url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
      if (sessionToken) {
        url += `?sessionToken=${encodeURIComponent(sessionToken)}`;
      }

      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "formattedAddress,location,displayName,googleMapsUri",
          "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const lat = data.location?.latitude;
        const lng = data.location?.longitude;
        const mapsUri =
          data.googleMapsUri ||
          (lat && lng
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.formattedAddress || "")}`);

        return NextResponse.json({
          name: data.displayName?.text || "",
          formattedAddress: data.formattedAddress || "",
          latitude: lat,
          longitude: lng,
          googleMapsUri: mapsUri,
        });
      }
    } catch (err) {
      console.warn("Fallo al consultar Place Details de Google:", err);
    }
  }

  return NextResponse.json(
    { error: "No se pudieron obtener detalles del lugar." },
    { status: 502 }
  );
}
