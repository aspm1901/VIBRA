import type { Store } from "@/types";

export interface MapStop {
  name: string;
  destination: string;
}

export function getMapStop(store: Store): MapStop {
  const { latitude, longitude } = store;
  const hasCoordinates = typeof latitude === "number" && typeof longitude === "number" &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  return {
    name: store.gallery || store.name,
    destination: hasCoordinates
      ? `${latitude},${longitude}`
      : `${store.gallery || store.name}, ${store.galleryAddress || "Gamarra, La Victoria, Lima"}`,
  };
}

function directionsUrl(stops: MapStop[], origin?: MapStop): string {
  const start = origin || stops[0];
  const remaining = origin ? stops : stops.slice(1);
  const params = new URLSearchParams({ api: "1", origin: start.destination, destination: (remaining[remaining.length - 1] || start).destination, travelmode: "walking" });
  if (remaining.length > 1) params.set("waypoints", remaining.slice(0, -1).map(stop => stop.destination).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

// El recorrido empieza en la primera galería, nunca en la ubicación del dispositivo.
export function buildMapRouteSegments(stops: MapStop[], maxDestinations: 4 | 9 = 9) {
  const segments: { url: string; stops: MapStop[]; origin?: MapStop }[] = [];
  let index = 0;
  let origin: MapStop | undefined;
  while (index < stops.length) {
    let count = Math.min(maxDestinations, stops.length - index);
    let chunk = stops.slice(index, index + count);
    while (directionsUrl(chunk, origin).length > 2048 && count > 1) {
      count--;
      chunk = stops.slice(index, index + count);
    }
    const url = directionsUrl(chunk, origin);
    if (url.length > 2048) throw new Error("La dirección de una galería es demasiado larga para Google Maps.");
    segments.push({ url, stops: chunk, origin });
    origin = chunk[chunk.length - 1];
    index += count;
  }
  return segments;
}
