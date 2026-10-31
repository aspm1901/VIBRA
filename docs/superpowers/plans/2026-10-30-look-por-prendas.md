# Look completo por prendas de ropa

**Objetivo:** comparar hasta tres prendas principales del atuendo por separado, ignorando zapatos, bolsos, joyas y accesorios. Aprobado en la conversación: separar la ropa y conservar el estilo general como complemento.

**Decisión:** detección automática de prendas y cajas normalizadas mediante la llamada de visión existente; recortes del lado del servidor y un embedding por recorte. No pedir recortes manuales como requisito ni limitarse a cambiar los pesos del vector global, porque eso no identifica las piezas buscadas.

**Arquitectura:** añadir un contrato validado de piezas y un módulo de recorte; conservar el reconocimiento y embeddings actuales para Una prenda. El nuevo ranking exige la familia de cada pieza, asigna prendas distintas y considera cobertura y parecido. Mostrar coincidencias parciales de forma explícita, sin porcentajes altos por etiquetas solamente. No inventar piezas ni volver al ranking global si falla su detección.

**Límites:** una llamada de visión y hasta tres embeddings por búsqueda de look; mismos modelos vigentes y límite de salida. No cambiar datos del catálogo ni revectorizarlo. No publicar en producción en esta tarea. Mantener la corrección local de limpieza de imágenes y los Word existentes sin incluirlos en esta función.

## Ejecución y verificación

- [x] Escribir pruebas que fallen para validación de cajas, exclusión de accesorios y extracción de recortes.
- [x] Implementar contratos y recortes con orientación consistente; comprobar contenido de cada recorte mediante imágenes de colores conocidos.
- [x] Escribir pruebas de ranking: top/falda supera blazer/pantalón; no reutilizar una foto para dos piezas; coincidencia parcial explícita; vector inválido; una sola prenda; tres piezas.
- [x] Implementar ranking por piezas y reconocimiento estructurado; integrar en la API sin afectar los otros modos. Error claro si no se pueden analizar las prendas.
- [x] Reutilizar tarjetas y modal existentes para informar cuántas prendas coinciden y mostrar todas las piezas recomendadas.
- [x] Probar la API con servicios simulados, regresiones de prenda/estilo y estados de error; ejecutar build.
- [x] Realizar una prueba real acotada con el collage de referencia y revisar recortes, resultados, tiempo y consumo. Revisar cambios completos antes de entregar.

## Atención en la revisión

Cajas inválidas, accesorios etiquetados como ropa, EXIF, prendas repetidas, conjuntos que mencionan varias piezas, recortes con menos información visual, detección fallida y embedding incompleto. Los resultados son opciones del catálogo y no garantizan stock.

Se trabaja en el checkout local existente para conservar el entorno de demostración y los cambios previos; no se crea otro worktree ni se modifican documentos o producción.

## Evidencia y decisiones

Prueba real acotada del collage aportado por la usuaria: detectó top marfil y falda marrón, sin accesorios. Dos recortes, dos embeddings; 7,4 s en esa ejecución. Primera recomendación: Isabella Merino con opciones de top y falda, 70 %. No equivale a validación general de exactitud. Los artefactos de evaluación permanecen en TEMP/vibra-look-eval, sin incorporar fotos personales al repositorio.

Revisión independiente: se corrigieron la sustitución minifalda/short y la pérdida silenciosa de una pieza por caja inválida. Esas regresiones tienen pruebas. La fórmula para fotografías reales pasa a 80 % visual de prendas, 15 % coincidencia de estilos y 5 % afinidad cromática, con penalización por cobertura y tope de 69 % si el look es parcial. Los ejemplos heredados sin fotografía conservan su lógica anterior. No se cambia el catálogo ni se promete existencia de las prendas.

Verificación final: 22 pruebas de piezas/API/limpieza de imágenes y 15 regresiones de búsqueda aprobadas; build de producción completado. La prueba de navegador sobre ese build comprobó tres prendas, detalle de coincidencia parcial, móvil de 390 px sin desbordamiento y ausencia de errores de React. Servidor de revisión local en http://localhost:3018. No publicado en Vercel.
