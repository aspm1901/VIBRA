# Comprobación del reconocimiento antes de la presentación

Petición: comprobar errores de reconocimiento sobre la versión continuada con Gemini. Conservar su arquitectura, catálogo, documentos y reglas de producto; corregir solo problemas reproducibles. No publicar sin instrucción.

- [x] Reproducir inferencias falsas de mangas, uso deportivo y largo de falda.
- [x] Añadir regresiones y corregir interpretación conservadora de rasgos visibles y selección de candidatas.
- [x] Revisar orientación de imágenes y límites del flujo con revisión independiente.
- [x] Ejecutar pruebas, TypeScript y build; realizar pruebas reales acotadas y conservar evidencias sin fotos en el repositorio.

No se garantiza ausencia de errores para cualquier fotografía. Las pruebas deterministas comprueban reglas; las llamadas reales comprueban reconocimiento de ejemplos concretos y disponibilidad de servicios.

Evidencia: 61 pruebas de reglas/API/filtros/almacenamiento aprobadas y TypeScript sin errores. Build completado. Pruebas de navegador de Look (tres piezas/parcial/modal/móvil) y búsqueda (estilo, error, reintento, carreras, teclado) aprobadas. Revisión independiente reprodujo EXIF y familia opcional blusa/top; corregidos con regresión. Las fotos de conjuntos no pueden ocultar prendas sueltas al limitar candidatas.

Catálogo leído sin escritura: 23 tiendas, 276 prendas, todos los vectores de 3072 dimensiones finitos y no nulos. Compatibilidad consigo mismas, usando nombre y categoría completos, sin conflictos. Esto no mide exactitud visual.

Pruebas reales: top, blazer y vestido del catálogo reconocidos con su familia esperada y su tienda en primer lugar; collage y modelo aportados separaron top/falda, sin accesorios. La primera prueba de jean usó por error una foto de conjunto: en modo Una prenda eligió el polo, no el jean esperado. No se ocultó el resultado: evidencia original en TEMP/vibra-recognition-live-results.json (7 peticiones completadas, 6 con expectativa cumplida). Una segunda prueba con foto de jean individual, inspeccionada visualmente, reconoció pantalón/jean y mostró Speakers primero (TEMP/vibra-jean-live-results.json). Es una ambigüedad de objetivo al subir varias prendas a Una prenda, no se promete selección automática de la pieza que la persona tenía en mente.

Límite observado: en Look las alternativas siguen siendo aproximaciones, especialmente escote, estampado y paleta invertida (regla vigente conservada). No se ajustaron pesos sobre un solo ejemplo ni se declara precisión universal. Sin despliegue ni cambios de catálogo/documentos.
