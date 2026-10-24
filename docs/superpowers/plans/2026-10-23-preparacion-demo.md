# Preparación de la demostración VIBRA

Objetivo: hacer confiable la demostración universitaria del reconocimiento y la comparación, conservando la calibración del modo Una prenda.

Alcance autorizado: ajustes pequeños en el proyecto actual, pruebas de regresión, documentación técnica y evaluación externa. Se trabaja en la rama codex/preparacion-demo. No se cambian credenciales, políticas remotas, catálogo, pesos del modo prenda ni archivos Word originales.

## Decisiones

- Los embeddings comparados deben tener la misma dimensión y valores finitos; una tienda sin referencia visual comparable no recibe una resonancia inventada.
- Look requiere parecido visual perceptual >= 0,45 y estilos compartidos. Dos prendas solo forman la pareja destacada si son superior e inferior, ambas compatibles visualmente. Se conservan pesos 30/70 y umbrales 0,38/0,50/0,25.
- Una falla de IA es un error recuperable, no un resultado vacío. Solo la última solicitud puede actualizar la interfaz.
- La validación externa se documenta por separado de la recuperación interna del catálogo; no se presenta como validación de usuarias ni del stock.

## Ejecución

- [x] Escribir y ejecutar pruebas que reproduzcan dimensiones incompatibles, ausencia de embeddings y selección incorrecta de look.
- [x] Corregir ranking y scoring con el mínimo cambio; ejecutar pruebas y comparar evaluación del catálogo.
- [x] Corregir respuestas de error de API e interfaz; probar errores, reintento y solicitudes fuera de orden.
- [x] Ejecutar consultas reales con imágenes externas si los servicios responden y guardar evidencia reproducible.
- [x] Actualizar README y especificación técnica; documentar resultados y límites para la exposición.
- [x] Ejecutar regresiones, TypeScript, build y revisar el diff.

## Revisión

Casos: vectores vacíos/distinta dimensión/NaN; tienda sin prendas; look con dos prendas superiores; look sin similitud aunque coincidan estilos; IA no disponible; cambio de filtros o pestaña durante una búsqueda; error HTTP o respuesta no JSON.

## Registro de verificación

- Nuevas pruebas de scoring/API: fallos reproducidos antes del arreglo; versión final 21/21.
- Revisión independiente: dos hallazgos de reintento y pestaña activa. Ambos corregidos y verificados en navegador; el reintento se reprodujo como igualdad de payload fallida antes de corregirlo.
- Regresiones existentes: capítulo 6 y filtros múltiples pasaron; persistencia de tallas pasó en copia temporal, con restauración verificada.
- Evaluación remota: 277 consultas, métricas de prenda conservadas; 45 looks y 298 combinaciones de estilos completadas.
- Fotos externas: 16/16 consultas reales completadas; 12 coincidencias de etiqueta y 36/48 posiciones top 3 de familia esperada. Evidencia y límites en docs/evaluaciones y docs/validacion-demo.md.
- Navegador: Edge, versión de producción, escritorio y móvil 390 px; errores, vacío, éxito, reintento, concurrencia, pestañas, tres estilos, teclado y cuatro rutas de iconos pasaron.
- npx tsc --noEmit y npm run build: código de salida 0. git diff --check sin errores de whitespace.
- Decisión de alcance: no cambiar modelos, pesos o prompts para mejorar artificialmente una muestra pequeña y ambigua. No se alteraron credenciales, políticas remotas, datos originales ni Word.
- Ajuste adicional justificado: cuatro iconos de public/ eran copias idénticas de app/ y causaban HTTP 500; se conservaron los originales de app/ y se corrigió el generador.
- Auditoría general de UI: cuatro observaciones preexistentes de administración y scrollbar, documentadas fuera del alcance. No se declara cumplimiento global de esa auditoría.
