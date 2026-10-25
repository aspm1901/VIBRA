# Por estilo: elección explícita

Al abrir la pestaña, sin opciones marcadas ni consulta automática. Cancelar consulta anterior, conservar memoria propia de cada pestaña de foto y mostrar instrucción inicial. Consultar al elegir combinación o estilo; hasta tres. Filtros sin estilos no consultan. Quitar el último estilo cancela y limpia resultados. API rechaza estilo vacío en vez de elegir Casual/Urbano.

Mantener fórmula: 0,75 × estilos coincidentes/elegidos + insignia hasta 0,06 + catálogo hasta 0,07. Explicar al cliente con cantidad de coincidencias en tarjeta. Confirmación real: Fiesta/Elegante presenta 1 de 2 coincidencias en los primeros puestos (0,43–0,51); Oficina/Minimalista/Elegante presenta 3 de 3 (0,82). No subir porcentajes artificialmente ni cambiar etiquetas de las tiendas.

Pruebas: entrada desde prenda/look, filtros sin selección, selección explícita, última selección retirada con consulta pendiente, respuesta antigua ignorada, tres estilos, reintento, modal y fotos sin regresión. Verificar regresiones de ranking, API, TypeScript, producción, UI y despliegue público.

Verificado: fallo reproducido en sitio anterior (abrir pestaña generaba una consulta) y API anterior devolvía 200 para selección vacía. Tras corregir, 29/29 pruebas y regresiones existentes pasaron; build y TypeScript aprobaron. Edge sobre build de producción comprobó entrada limpia, precio sin estilos, elección, cancelación al retirar último estilo y reintento/races; modal de fechas intacto. Evaluación remota de catálogo conserva métricas. Revisión independiente sin hallazgos accionables.
