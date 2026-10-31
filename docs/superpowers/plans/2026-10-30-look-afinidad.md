# Afinar Look completo tras la prueba de la usuaria

Objetivo aprobado: mejorar el parecido real de las opciones sin cambiar Una prenda ni Por estilo. Mantener los modelos y el máximo de tres embeddings. Trabajo local, sin desplegar ni alterar catálogo o Word.

Causas verificadas: las familias agrupan top/corset/bikini y falda mini/larga; las fotos compuestas pueden ganar por su vector global; la cobertura penaliza demasiado una opción parcial buena. Los textos actuales confunden cobertura con exactitud.

Decisión: descartar subtipos explícitamente incompatibles, favorecer fotos individuales de calidad cercana, y suavizar la penalización por cobertura conservando el tope para parciales. La calidad del conjunto considerará también la pieza menos parecida. Los nombres detectados describirán cortes y largos visibles, sin inferir lo que no se ve. No añadir comparación generativa por candidata: aumentaría consumo y latencia.

- [x] Pruebas que reproduzcan largo/mini, top/corset/baño, conjuntos frente a individuales y parcial buena frente a completa débil.
- [x] Implementar compatibilidad local y selección por calidad; mantener el contrato de piezas y fallos.
- [x] Cambiar el texto de tarjetas/ficha a opciones para prendas, sin prometer coincidencia exacta.
- [x] Ejecutar regresiones, build, navegador móvil/escritorio y evaluación acotada con fotos reales y catálogo actual.
- [x] Revisión independiente de los cambios y entrega local con límites de calidad explícitos.
