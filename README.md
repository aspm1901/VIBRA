# VIBRA · Buscador visual para Gamarra

Prototipo universitario que recomienda tiendas de moda por afinidad con una foto o una selección de estilos. El puntaje representa el perfil del comercio: no garantiza stock, precio ni disponibilidad de una prenda.

## Ejecutar

Node.js 20 o posterior y npm:

```bash
npm ci
npm run dev
```

Abre http://localhost:3000 y configura `.env.local` a partir de `.env.example`. Las fotos requieren Gemini; la exploración por estilo funciona sin IA. Sin Supabase se usa `data/stores.json`, cuyo catálogo puede ser distinto del remoto.

## Funciones y arquitectura

- **Una prenda:** subir, recortar y comparar una referencia. Familia y parecido visual dominan el ranking.
- **Look completo:** 30 % visual y 70 % estilo. La pareja destacada requiere superior e inferior compatibles.
- **Por estilo:** espera una elección explícita, sin estilos heredados de la foto ni búsqueda al abrir la pestaña. Hasta tres estilos; cobertura declarada más bonos de especialidad y catálogo. Las tarjetas muestran cuántos estilos coinciden.
- Filtros múltiples de precio y talla con OR. **Estándar es independiente de XS/S/M/L/XL.**
- Ficha, WhatsApp y recorrido por galería y piso; guardado local y sincronización de cuenta cuando está configurada.
- «Última actualización de la ficha» muestra fecha y hora de Lima: usa la edición exacta más reciente o, si no existe, el registro inicial conservado por Supabase. Los nuevos guardados registran el instante real.
- Panel `/admin` con edición y carga de prendas con vectorización.

Next.js 15, React 19, TypeScript y Tailwind. Gemini usa `gemini-embedding-2-preview` para embeddings y los modelos de visión configurados en `lib/ai/gemini.ts` para familia, título, estilos y color.

Supabase guarda tiendas y prendas en JSONB, incluidos los vectores; las imágenes están en Storage. El servidor Next.js calcula coseno y ranking. **La versión actual no utiliza FashionCLIP ni consultas pgvector.** No se comparan vectores de distinta dimensión.

`lib/ranking.ts` contiene calibración y bandas; `lib/search-scoring.ts`, los tres modos; `app/api/search/route.ts`, la orquestación. La respuesta elimina embeddings y distingue `analysisSource`: visión, respaldo por catálogo, estilos o ejemplo.

Bandas: Alta >= 70 %, Media 45–69 %, Exploratoria 25–44 %. Tope 99 %. Publicación: prenda >= 38 %, look >= 50 %, estilo >= 25 %. El rescate del mejor resultado desde 38 % no elude el mínimo visual y los estilos compartidos de look.

## Verificación

```bash
npx tsx --test scripts/test-search-regressions.ts scripts/test-search-api.ts
npx tsx --test scripts/test-store-updated-at.ts
npx tsx scripts/test-ejemplo-6-3.ts
npx tsx scripts/test-multi-select-filters.ts
npx tsx scripts/test-admin-sizes.ts
npx tsx scripts/eval-search.ts
npx tsc --noEmit
npm run build
```

`test-admin-sizes.ts` ejecuta la persistencia sobre una copia temporal local. `eval-search.ts` requiere Supabase y `.env.local`; mide recuperación interna con metadatos ya calculados, no reconocimiento de fotos nuevas.

Interfaz con Playwright y Edge: `node scripts/test-search-ui.cjs`, con la app en puerto 3010 o `VIBRA_TEST_URL`. Admite `VIBRA_PLAYWRIGHT_MODULE` para una instalación externa y `VIBRA_BROWSER_CHANNEL` para otro navegador. Las respuestas simuladas prueban errores, reintento, concurrencia, tres estilos y móvil; no miden IA.

Fotos externas:

```bash
npx tsx scripts/eval-external-search.ts manifest.json http://localhost:3010 resultado.json
```

Manifest: `[{ "id": "caso-1", "path": "foto.jpg", "expectedFamily": "blusa", "source": "origen" }]`. Envía fotos a la API real y registra detección, primeros resultados y fallos; no modifica tiendas.

## Para la sustentación

- [Ranking implementado](docs/logica-ranking-vibra-real.md).
- [Verificación y límites de la demostración](docs/validacion-demo.md).

Los Word originales conservan texto de etapas anteriores. Para explicar tecnología, fórmulas y resultados actuales utiliza estos documentos técnicos; evita mezclar FashionCLIP/pgvector históricos con Gemini.
