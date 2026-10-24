/** Formatea únicamente fechas con hora y zona explícitas; no interpreta textos históricos relativos. */
export function formatStoreUpdatedAt(value?: string): { dateTime: string; label: string } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return {
    dateTime: date.toISOString(),
    label: new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima", dateStyle: "long", timeStyle: "short", hour12: true,
    }).format(date),
  };
}
