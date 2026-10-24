# Última actualización de la ficha

Objetivo: mostrar fecha y hora reales de la última edición de tienda en el modal, sin inventar precisión para registros históricos.

- Guardar ISO UTC del servidor en updatedAt durante POST/PUT administrativo. La columna updated_at es texto y admite este formato sin migración.
- Formatear en es-PE, America/Lima; mostrar fecha larga y hora de 12 horas, con etiqueta explícita.
- Rechazar texto relativo y fechas sin hora/zona para presentación exacta. Fallback: Fecha exacta no registrada.
- Añadir una franja informativa con los tokens actuales antes de las fotos del modal.
- No modificar fechas remotas históricas, ni scoring, ni Gemini.

Verificación: pruebas de UTC cruzando medianoche de Lima, offset explícito, fechas históricas/ausentes/invalidas; edición vía PUT y persistencia aislada; modal en escritorio/móvil; regresiones, TypeScript y build.

Resultado: 25/25 pruebas de scoring/API/formato pasaron. PUT y persistencia de fecha del servidor se reprodujeron primero con el texto histórico incorrecto y luego pasaron en copia aislada. Regresiones matemáticas, filtros, evaluación remota de 277 prendas, TypeScript y build pasaron. UI probada en Edge sobre build de producción a 1366 y 390 px con dispositivo en Asia/Tokyo para verificar que la ficha mantiene America/Lima. Revisión independiente sin hallazgos accionables. No se modificaron registros históricos ni fechas remotas.
