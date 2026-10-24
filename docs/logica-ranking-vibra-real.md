# Ranking VIBRA · implementación verificada

Actualizado el 23 de octubre de 2026 para el prototipo universitario. Fuentes: `lib/ranking.ts`, `lib/search-scoring.ts` y `app/api/search/route.ts`.

La resonancia compara cada tienda con la búsqueda de la sesión. Es afinidad relativa, no probabilidad de stock ni calidad absoluta.

## Flujo real

1. Cargar catálogo remoto o respaldo local.
2. Con foto, generar embedding y analizar familia, estilos y color en paralelo. Si visión falla pero hay vector, inferir familia y estilos mediante tres vecinos de igual dimensión. Sin vector válido se devuelve error recuperable. Por estilo no se llama a IA.
3. Aplicar precio, talla y modalidad antes del scoring. Actualmente ocurre después de analizar la referencia; no evita las llamadas iniciales a IA.
4. Puntuar según modo. En prenda, comprobar aptitud de la tienda para la familia buscada.
5. Redondear, ordenar, aplicar publicación y agrupar por galería. La interfaz filtra galerías sobre los resultados publicados. La respuesta pública excluye vectores.

## Filtros

Precios y tallas múltiples usan OR dentro del filtro; filtros diferentes se combinan con AND. **Estándar es independiente**; se normalizan tildes y standard/estandar sin convertirla en S/M/L. Modalidad de tienda `cualquiera` admite envío o presencial. No existe filtro de compra por mayor en el modelo actual.

## Familias y vectores

Ocho familias: vestido, falda_short, casaca, chompa, pantalon_jean, blusa, polo_top y conjunto; otro expresa desconocimiento. Se combinan nombre, categoría e indicio de IA; los conjuntos pueden contener subpiezas reconocidas por `garmentContainsFamily`.

Coseno exige igual dimensión. Vectores vacíos, de distinta longitud, no finitos o de norma cero no aportan parecido. Sin prendas comparables no se recomienda una tienda en búsquedas fotográficas. El catálogo evaluado usa 3072 dimensiones; las semillas históricas de 768 no son intercambiables.

La calibración perceptual depende de la relación de familia: misma, distinta o neutral. Look usa neutral al comparar un outfit con prendas. Es una calibración del prototipo, no una probabilidad aprendida.

## Una prenda

**Fase A: representante del stand.**

`comparación = coseno × multiplicador de familia × multiplicador de color`

Misma familia ×1,35; distinta ×0,65; neutral ×1. Si coincide familia y grupo cromático se agrega ×1,08. Gana el mayor valor interno; no es el puntaje publicado.

**Fase B: resonancia.**

`resonancia = visual perceptual + 0,06 × cobertura + bono color + bono alternativas`

El visual parte del coseno original de la ganadora, no del valor multiplicado. Cobertura compara los estilos buscados con la unión de estilos de tienda y ganadora.

Color: +0,05 al coincidir familia y grupo cromático. Once grupos, con límites de palabra y normalización de tildes; primero primaryColor y luego nombre. Sin color reconocido no se da bono.

Alternativas: +0,02 por prenda adicional de la misma familia con coseno >=0,65, hasta +0,06. Tope final 0,99.

## Look completo

Solo participan prendas con **parecido perceptual neutral >=0,45**. Entre ellas se elige la representante con `0,65 × afinidad estilística de prenda + 0,35 × coseno`.

Cobertura: proporción de estilos buscados presentes en tienda y tres candidatas principales. Especialidad: proporción de estilos declarados por la tienda presentes en la búsqueda.

`estilo look = 0,50 × cobertura + 0,50 × especialidad`

Sin estilos compartidos se descarta.

`resonancia = 0,30 × visual perceptual + 0,70 × estilo look`

La pareja destacada exige una superior (polo_top, blusa, chompa, casaca) y una inferior (pantalon_jean, falda_short), ambas con mínimo visual y afinidad estilística de prenda >=0,45. Dos superiores o una pieza visualmente débil no completan la pareja. Vestidos y conjuntos pueden representar individualmente una tienda. **No hay bono numérico adicional por pareja.** Tope 0,99.

Ejemplo de la fórmula final: coseno 0,82 neutral se calibra a 0,78. Con cobertura y especialidad iguales a 1, la resonancia es round(0,30 ×0,78 +0,70 ×1) = **0,93**. El bono de color de prenda no se aplica en look.

## Por estilo

`resonancia = 0,75 × cobertura declarada + bono insignia + bono catálogo`

Sin coincidencias se descarta. Insignia: +0,06 si el primer estilo declarado está entre los buscados. Catálogo: hasta +0,07 según afinidad promedio de prendas, limitada a [0,1] antes del promedio. Tope 0,99.

Con tres estilos: 1/3 inicia en 0,25; 2/3 en 0,50; 3/3 en 0,75. Bonos hasta +0,13. API e interfaz permiten hasta tres estilos.

## Bandas y publicación

Bandas sobre el valor redondeado a dos decimales:

| Banda | Puntaje | Indicador |
|---|---|---|
| Alta | >=0,70 | Tres arcos Higo 70, #71545B |
| Media | 0,45–0,69 | Dos arcos Grafito 55, #676B63 |
| Exploratoria | 0,25–0,44 | Un arco Grafito 55 |
| Baja | <0,25 | No se publica |

Publicación adicional: prenda >=0,38; look >=0,50; estilo >=0,25. Si ninguno supera su umbral y el mejor alcanza 0,38, la API puede rescatar solo ese resultado. El rescate no elude descartes de scoring, mínimos visuales, estilos compartidos ni filtros.

## Alcance de las pruebas

`eval-search.ts` retira la prenda de referencia de su tienda y mide recuperación con vectores y metadatos existentes; no vuelve a reconocer imágenes. Coincidencia de familia no equivale a coincidencia de corte, textura o material.

`eval-external-search.ts` envía fotos externas al endpoint real. Se deben informar fuente, tipo de imagen, casos, fallos y análisis por visión o por respaldo de catálogo. Una muestra pequeña controlada no valida fotos difíciles, satisfacción de usuarias ni precisión general.
