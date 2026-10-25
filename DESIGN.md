---
name: VIBRA
description: Buscador visual universitario de moda femenina para Gamarra, Lima.
colors:
  primary: "#71545B"
  background: "#EDEEE8"
  foreground: "#26282A"
  secondary: "#676B63"
  border: "#CFD1C7"
  danger: "#8F5346"
typography:
  sans:
    fontFamily: "Poppins, system-ui, sans-serif"
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
rounded:
  DEFAULT: "1rem"
  card: "1.5rem"
spacing:
  page-max: "1200px"
components:
  radar: {}
  card: {}
  button: {}
---

# Identidad existente

Aplicación en español para compradoras de Gamarra, orientada a uso móvil. Mantener el neumorfismo suave, superficies Caliza, texto Basalto y acento Higo. El radar de tres arcos es la firma de marca. No rediseñar la identidad al corregir comportamientos.

## Fuentes de tokens

Los valores ejecutables están en `tailwind.config.js` y `app/globals.css`; este documento refleja esos valores y no genera CSS. Las fuentes se configuran en `app/layout.tsx`. El indicador compartido es `components/RadarArcIcon.tsx`.

## Estados de búsqueda

`app/page.tsx` es el propietario del flujo de consulta. Conserva la foto y los filtros cuando falla una petición, muestra un aviso persistente con `role="alert"` y permite reintentar con un botón nativo. Una búsqueda vacía se distingue de una falla del servicio. La solicitud más reciente es la única que puede publicar resultados; cambiar de pestaña cancela la anterior.

Los estados conservan las superficies y la tipografía existentes. Los errores usan texto explícito y una acción además del color. Los estilos son botones con estado `aria-pressed`; hasta tres seleccionados, con posibilidad de quitar cualquiera para elegir otro. La pestaña fotográfica conserva su propia referencia y resultados.

Al entrar a «Por estilo» se limpia la selección y no se consulta hasta elegir una combinación o al menos un estilo. Los filtros de precio/talla/modalidad no inician búsqueda si todavía no se eligió estilo. Quitar el último estilo cancela la consulta y devuelve la instrucción inicial. Las tarjetas informan cuántos estilos elegidos comparte la tienda; el porcentaje no cambia de fórmula. Cada pestaña fotográfica conserva sus estilos en su propia memoria.

## Límites

La ficha muestra «Última actualización de la ficha» al inicio del contenido, antes de las fotos, con una superficie Caliza y texto secundario Grafito. Usa la edición exacta más reciente o, si no existe, la fecha de creación de Supabase: el registro inicial es la primera actualización. Las fechas usan hora de Lima y un elemento `time`; solo si tampoco existe registro exacto se informa «Fecha exacta no registrada». El guardado administrativo genera el instante del servidor, no el navegador de la clienta.

Proyecto universitario: esta intervención mejora el buscador y su demostración. No supone una auditoría completa de accesibilidad ni una migración de todos los flujos administrativos.
