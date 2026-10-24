# Fecha de registro como respaldo para fichas históricas

Mostrar la fecha real de created_at de Supabase cuando updated_at histórico no contiene una fecha exacta. Etiqueta «Registrada el»; si existe fecha precisa de edición, conservar «Última actualización de la ficha». Formatear ambas en America/Lima. Si ninguna fecha es precisa, conservar el aviso existente.

Mapear created_at al campo opcional createdAt de Store. No escribir ni reconstruir fechas históricas, no alterar el catálogo ni el ranking. La fecha de creación no representa una revisión posterior de la información.

Verificación: prioridad de edición sobre registro; texto histórico con created_at de microsegundos y offset de Supabase; ausencia de ambas; UI de escritorio/móvil con dispositivo en otra zona horaria; búsqueda real de solo lectura contra Supabase; regresiones y build; despliegue y comprobación del dominio público.

Resultado local: 28/28 pruebas de scoring/API/formato, persistencia administrativa en copia aislada, matemáticas y filtros pasaron. TypeScript y build de producción sin errores. Edge verificó las tres variantes de fecha y el buscador existente en escritorio/móvil; búsqueda real Casual devolvió 7 resultados y los 7 conservaron createdAt remoto. Revisión independiente sin hallazgos accionables. Sin cambios en registros remotos.
