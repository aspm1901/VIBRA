# VIBRA · validación para la demostración universitaria

Fecha: 23 de octubre de 2026. Cambios en la rama `codex/preparacion-demo`.

## Cambios conservadores

- Se conservaron la curva perceptual, los pesos y los bonos de Una prenda.
- Vectores de distinta dimensión, vacíos o no finitos no generan comparación visual. Las tiendas sin prendas comparables se descartan en búsquedas fotográficas.
- Look exige parecido perceptual neutral >=0,45 y estilos compartidos. La pareja requiere superior e inferior compatibles, ambas con afinidad estilística de prenda >=0,45; no se presentan dos superiores como un outfit.
- La API devuelve un error recuperable cuando no obtiene vector. La interfaz distingue error y ausencia de coincidencias, conserva la foto y permite reintentar la misma búsqueda.
- Las respuestas antiguas no reemplazan la consulta más reciente. Cambiar de pestaña cancela la petición; pulsar la pestaña ya activa no la interrumpe.
- Máximo tres estilos en interfaz y API.
- Se eliminaron copias idénticas de iconos en `public/` que colisionaban con las rutas de metadatos de `app/` y provocaban HTTP 500. Los iconos originales permanecen en `app/`; el generador ya no recrea el conflicto.
- La prueba de persistencia de tallas usa una copia temporal aislada y no modifica Supabase ni el catálogo original.

## Recuperación interna: 23 tiendas y 277 prendas

Evaluación posterior a los cambios con `scripts/eval-search.ts`, en modo lectura:

| Medida | Resultado |
|---|---:|
| Prenda: familia correcta en posiciones top 3 | 99,7 % |
| Prenda: color coincidente en top 1 cuando coincide familia | 67,8 % |
| Prenda: tienda de origen en top 3 | 69,3 % |
| Prenda: MRR de tienda de origen | 0,605 |
| Look: tienda de origen en top 3 | 71,1 % |
| Look: tienda de origen aparece | 97,8 % |
| Estilo: resultados sin estilos compartidos | 0 de 2795 |

Los valores principales se conservaron respecto a la evaluación previa. Se retira la referencia de su propia tienda para que no se encuentre a sí misma. **Esta evaluación usa embeddings y metadatos existentes; no mide el reconocimiento inicial de fotos nuevas.**

## Prueba externa de extremo a extremo

Se enviaron 16 imágenes ajenas al catálogo a `/api/search`, con los servicios reales de Gemini y Supabase. Fuente: [Fashion Product Images Small](https://huggingface.co/datasets/ashraq/fashion-product-images-small), con etiquetas de origen. Se conservaron los resultados de la primera pasada completa, sin seleccionar reintentos favorables.

| Medida | Resultado |
|---|---:|
| Consultas completadas | 16/16 |
| Coincidencia con la familia etiquetada de origen | 12/16 |
| Familia esperada en posiciones top 3 | 36/48 |
| Análisis por visión | 13 consultas |
| Respaldo mediante vecinos del catálogo | 3 consultas |

Evidencia por caso, fuente y familia: [2026-10-23-fotos-externas.json](evaluaciones/2026-10-23-fotos-externas.json).

**Límites:** las imágenes tienen solo 60×80 píxeles y cubren seis familias oficiales, sin chompa ni conjunto. Hay etiquetas ambiguas —falda con leggings, chaqueta superpuesta sobre blusa— y una muestra etiquetada como vestido cuya descripción menciona ropa infantil. Se observaron confusiones en un polo con cuello, prendas superpuestas y una referencia que recurrió al respaldo del catálogo. En una consulta adicional el mismo polo se reconoció correctamente: el análisis remoto puede variar.

El 12/16 describe la concordancia de esta muestra con sus etiquetas, **no una precisión general de VIBRA**. Tampoco valida cortes, materiales, satisfacción de compradoras, fondos difíciles ni stock. Para la exposición conviene usar referencias nítidas y demostrar el recorte de una sola prenda.

## Pruebas de software

- **21/21 pasaron:** scoring y endpoint con `npx tsx --test scripts/test-search-regressions.ts scripts/test-search-api.ts`.
- **Pasaron:** regresión matemática del capítulo 6, filtros múltiples y persistencia de tallas en copia aislada.
- **Pasó en versión de producción:** navegador Edge con Playwright; error HTTP, respuesta no JSON, resultados vacíos, reintento, igualdad de consulta fotográfica al reintentar, respuestas fuera de orden, tres estilos, pestaña activa y cambio de modo, foco y ancho móvil de 390 px. Las cuatro rutas de iconos respondieron HTTP 200.
- **Pasaron con salida 0:** TypeScript y compilación de producción de Next.js. Diff sin errores de whitespace.

El test histórico `test-ejemplo-6-3.ts` incluye ejemplos aritméticos calculados a mano. La prueba nueva `look aplica la fórmula real 30/70 con calibración neutral` llama a `scoreLookStore` y verifica 0,93 para coseno 0,82 y estilo 1. El ejemplo histórico de 0,96 usa otra relación perceptual; no debe presentarse como salida del scorer actual de look.

## Documentación y alcance

README y `docs/logica-ranking-vibra-real.md` describen Gemini, scoring en Next.js, umbrales y límites actuales. Los Word originales se conservan sin alteración; contienen secciones históricas de FashionCLIP/pgvector y deben contrastarse con la especificación técnica actual antes de citarlas.

Una auditoría estática general de UI detectó cuatro observaciones anteriores a estos cambios: select nativo administrativo sin propietario documentado, dos formularios administrativos sin declaración de validación y scrollbar con estilos solo WebKit. No afectan la prueba del buscador y se mantienen fuera del alcance solicitado; no se declara una auditoría global de UI aprobada.

## Cómo explicar el resultado

«VIBRA reconoce una referencia visual y compara su representación con fotos de tiendas para recomendar dónde buscar prendas afines. Prioriza la familia en el modo Una prenda y permite verificar visualmente la recomendación. Los resultados expresan afinidad de perfil, no inventario. La evaluación interna y una muestra externa controlada son comprobaciones distintas y tienen límites documentados.»
