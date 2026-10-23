# 6. Lógica del ranking: puntaje de resonancia (Implementación Real)

> **Idea central:** No existe un estándar externo ni un ranking fijo de "las mejores tiendas de Gamarra". Cada tienda se compara y califica **únicamente contra lo que buscó la compradora en esa sesión**: su foto, su silueta, su paleta de color y sus estilos deseados. El resultado es un puntaje relativo por tienda (de 0 a 1, presentado como porcentaje de 0 % a 99 %) y las tiendas se ordenan de mayor a menor afinidad.

---

## 6.1 Los tres pasos del flujo de evaluación

El motor de búsqueda y ordenamiento de VIBRA ejecuta la evaluación en tres etapas consecutivas:

```
[Búsqueda de la Usuaria] 
        │
        ▼
┌────────────────────────────────────────────────────────┐
│  PASO 1: Filtrar (lo exacto)                           │
│  Descarta tiendas que no cumplen precio, talla o tipo  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│  PASO 2: Puntuar componentes (lo parecido)             │
│  • Similitud visual perceptual (Coseno + Familia)      │
│  • Afinidad cromática estricta (11 grupos de color)    │
│  • Coincidencia de estilos declarados                  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│  PASO 3: Combinar y ponderar según el modo             │
│  • Una prenda: Silueta física dominante + Estilo       │
│  • Look completo: 70 % Estilo + 30 % Armonía visual    │
│  • Por estilo: 100 % Coincidencia de estética          │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
            [Ranking ordenado por Bandas]
```

---

### Paso 1: Filtrar (lo exacto — Filtros duros)
Antes de calcular similitudes visuales o correr modelos de IA, se aplica un filtro binario (sí/no) sobre los metadatos declarados de cada tienda:

1. **Nivel de precio:** Si la usuaria selecciona *Económico (S/)*, *Medio (S/S/)* o *Alto (S/S/S/)*, solo pasan las tiendas que atienden ese segmento. Si no marca ninguno, pasan todos.
2. **Talla requerida:** Si la usuaria filtra por una talla (*XS, S, M, L, XL, Estándar*), solo pasan las tiendas que confeccionan o comercializan esa talla en su ficha técnica.
3. **Modalidad de compra:** Si la usuaria exige *Solo presencial*, *Con envío* o *Por mayor*, se respeta estrictamente.
4. **Filtro de galería activa:** Si la compradora selecciona una galería específica (ej. *Galería El Dorado 906*), solo se ordenan las tiendas ubicadas en ese inmueble físico.
5. **Aptitud de confección de la tienda:** La tienda debe tener en su catálogo al menos una prenda que pertenezca a la familia buscada o declarar en sus líneas que confecciona esa familia. Si una tienda es $100\%$ especializada en calzado o ropa interior y se busca un blazer, se descarta antes de puntuar.

> [!NOTE]
> Si tras aplicar los filtros exactos quedan menos de 3 tiendas disponibles en el catálogo, la interfaz emite una sugerencia visible recomendando a la compradora remover temporalmente la talla o el precio para ampliar su abanico de opciones en Gamarra.

---

### Paso 2: Puntuar (lo parecido — Evaluación multidimensional)

Cada tienda que superó el Paso 1 recibe una evaluación basada en tres componentes matemáticos reales:

#### A. Similitud visual vectorial (Gemini Embeddings 3072-d)
* Cada prenda del catálogo tiene un vector matemático de **3072 dimensiones** generado previamente por el modelo `gemini-embedding-2-preview`.
* Cuando la compradora sube su foto, se genera el vector de su imagen y se calcula la **similitud coseno** contra todas las prendas de la tienda:
  $$\text{Similitud Coseno} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
* **Normalización Perceptual:** Dado que en el espacio vectorial las fotos de ropa no relacionada tienen un coseno natural de $\sim 0,55$ y las fotos casi idénticas tienen $\sim 0,85$, el algoritmo aplica una curva de calibración que traslada ese rango a una escala intuitiva de $0,0$ a $1,0$.

#### B. Clasificación por familia de prenda (Filtro semántico anti-confusión)
El sistema clasifica la prenda en una de las **8 familias oficiales de confección**:
1. `vestido` (vestidos, enterizos, mamelucos, jumpsuits).
2. `falda_short` (faldas, minifaldas, shorts, bermudas, skorts).
3. `casaca` (casacas, blazers, chalecos, abrigos, chaquetas sastre).
4. `chompa` (chompas de punto, suéteres, cárdigans, poleras, hoodies).
5. `pantalon_jean` (jeans, palazzos, pantalones sastre, cargos, joggers).
6. `blusa` (blusas, camisas, blusones).
7. `polo_top` (tops, polos, bodies, corsets, bralettes, bustiers).
8. `conjunto` (sets coordinados de 2 o 3 piezas, dos piezas sastre, twin sets).

**Regla de puntuación de familia:**
* Si la prenda de la tienda es de la **misma familia** que la buscada: su puntaje visual recibe un multiplicador de prioridad de **$\times 1,35$**.
* Si es de una **familia diferente** (ej. busca falda y la tienda ofrece pantalón): su puntaje visual se atenúa a **$\times 0,65$**. Esto garantiza matemáticamente que **un pantalón jamás le gane a un vestido**, aunque ambos compartan el mismo color.
* Si es un **conjunto de dos piezas**: el algoritmo inspecciona las subpiezas del conjunto. Si el conjunto contiene la pieza buscada (ej. un conjunto de *top + falda* para una búsqueda de falda), se considera de la misma familia.

#### C. Afinidad cromática estricta (11 grupos cromáticos)
El color se detecta mediante análisis semántico con límites de palabra (`\bpalabra\b`), evitando falsos positivos (por ejemplo, que "plateado" no coincida por error con "plato"):
* **11 familias cromáticas:** Negro/Oscuro, Blanco/Marfil, Beige/Camel, Marrón/Chocolate, Azul/Denim, Rojo/Vino/Guinda, Rosa/Palo Rosa, Morado/Lila, Verde/Oliva, Amarillo/Mostaza, Gris/Plomo.
* Si la prenda coincide en familia y además coincide en el grupo de color exacto, recibe un **impulso de selección de $\times 1,08$** y un **bono directo de $+0,05$** al puntaje de resonancia.

#### D. Coincidencia de estilo declarado
De los estilos que busca la compradora (máximo 3), se calcula cuántos fueron declarados formalmente por la tienda en su ficha de Gamarra:
$$\text{Coincidencia de estilo} = \frac{\text{Estilos de la tienda que coinciden}}{\text{Total de estilos buscados por la compradora}}$$

---

### Paso 3: Combinar y ordenar según el modo de búsqueda

La combinación final de los componentes depende del objetivo de compra que seleccionó la usuaria:

| Modo de búsqueda | Peso foto / silueta | Peso de estilo | Lógica y justificación de negocio |
| :--- | :---: | :---: | :--- |
| **Una prenda** | **Dominante**<br>(Silueta + Color) | **Modulador**<br>(Bono hasta $+6\%$) | La compradora busca una pieza específica (ej. un corset blanco). Si el estilo pesara 50 %, una tienda de polos básicos que declaró "Fiesta" le ganaría a una tienda de corsets. La silueta y el color mandan; el estilo actúa como factor de desempate. |
| **Look completo** | **30 %**<br>(Armonía visual) | **70 %**<br>(Estilo del outfit) | La compradora sube un outfit entero (Pinterest / modelo). Interesa la estética integral y la vibra del conjunto. Además, el algoritmo identifica piezas superiores e inferiores para armar el look. |
| **Por estilo** | **—** | **100 %** | La compradora explora sin fotografía. Se ordenan directamente las tiendas cuya especialidad declarada tiene mayor intersección con los estilos elegidos. |

#### Fórmulas matemáticas exactas implementadas en producción

#### 1. Modo «Una prenda»:
$$\text{Resonancia} = \text{Puntaje Visual Perceptual} + (\text{Coincidencia Estilo} \times 0,06) + \text{Bono Color} + \text{Bono Variedad}$$
* **Bono Color:** $+0,05$ si la prenda ganadora es del mismo color exacto.
* **Bono Variedad:** $+0,02$ por cada prenda adicional en el catálogo de esa tienda que tenga alta afinidad ($\ge 0,65$), con un tope máximo de $+0,06$. Esto premia a las tiendas donde la clienta tendrá más opciones de compra al llegar físicamente al puesto.
* Tope máximo: $0,99$ ($99\%$).

#### 2. Modo «Look completo»:
$$\text{Resonancia} = (0,30 \times \text{Puntaje Visual}) + (0,70 \times \text{Coincidencia Estilo}) + \text{Bono Look}$$
* Si la tienda cuenta con prendas para armar el conjunto completo (prenda superior + prenda inferior compatibles), recibe un impulso adicional y ambas prendas se exhiben destacadas en la tarjeta de resultados.
* **Protección a especialistas:** Si la compradora solicita 2 estilos y una tienda es $100\%$ especializada en uno de ellos, su afinidad no se castiga ciegamente con un $50\%$.

#### 3. Modo «Por estilo»:
$$\text{Resonancia} = \text{Coincidencia Estilo} \times 1,00$$

---

## 6.2 Cómo se presenta el resultado (Bandas de resonancia)

El puntaje numérico final se traduce a una de las **tres bandas oficiales de resonancia** establecidas en el Manual de Marca v2.0 de VIBRA:

```
Puntaje Final:
  1,00 ──┐
         ├─► BANDA ALTA (≥ 0,70 / 70 %) ────────► 3 arcos activos (Higo 70 #71545B)
  0,70 ──┘
         ┌─► BANDA MEDIA (0,45 a 0,69 / 45-69 %) ─► 2 arcos activos (Grafito 55 #676B63)
  0,45 ──┘
         ┌─► BANDA EXPLORATORIA (0,25 a 0,44) ───► 1 arco activo (Grafito 55 #676B63)
  0,25 ──┘
         └──► NO SE MUESTRA (< 0,25) ─────────────► Descartada del ranking
```

* **Banda Alta ($\ge 70\%$ en calibración real / $\ge 0,70$):**  
  Presentación: **Tres arcos completos de resonancia en color Higo 70** (`#71545B`) con etiqueta *"Alta"*. Indica que la tienda tiene una coincidencia sobresaliente en prenda, color y estilo.
* **Banda Media ($45\% \text{ a } 69\%$):**  
  Presentación: **Dos arcos activos** en tono Grafito. Indica que la tienda tiene prendas parecidas o del mismo estilo, aunque con alguna variación en corte o textura.
* **Banda Exploratoria ($25\% \text{ a } 44\%$):**  
  Presentación: **Un arco activo**. Tiendas que trabajan la categoría o el estilo pero con siluetas alternativas para la compradora que desea explorar.
* **No se muestra:**  
  Cualquier tienda por debajo de la afinidad mínima o que no confeccione la familia de prendas se omite para no generar ruido visual. Si ninguna tienda califica, la app muestra el estado vacío:  
  *«Ninguna tienda superó el umbral de afinidad con esta foto. Prueba con un encuadre más cerrado de la prenda o quita los filtros de precio y talla.»*

---

## 6.3 Ejemplo práctico paso a paso (Caso real)

**Escenario de búsqueda:**  
Una compradora sube la foto de un **Chaleco sastre marfil con short a juego** (conjunto sastre) en modo **Look completo**.  
* Filtro de precio seleccionado: *Medio (S/S/)*.  
* Estilos detectados / elegidos: *Elegante* y *Oficina*.

| Tienda evaluada | Paso 1: Filtro exacto | Paso 2: Análisis técnico | Paso 3: Ponderación Look (30 % Foto + 70 % Estilo) | Resultado y Banda |
| :--- | :---: | :--- | :--- | :--- |
| **Tienda A (Beige Studio)**<br>Declara: *Elegante, Oficina*.<br>Precio: Medio.<br>Catálogo: Tiene chalecos sastre y palazzos marfil. | **Pasa**<br>(Cumple precio medio) | • Parecido visual: $0,82$<br>• Color marfil: Coincide ($+0,05$)<br>• Estilo: Coincide $2/2 = 1,00$ | $$(0,30 \times 0,87) + (0,70 \times 1,00) = \mathbf{0,96}$$ | **96 % · Banda Alta**<br>(3 arcos Higo)<br>*Puesto #1 del ranking* |
| **Tienda B (Urbana Chic)**<br>Declara: *Casual, Urbano*.<br>Precio: Medio.<br>Catálogo: Tiene shorts de lino pero no sastre. | **Pasa**<br>(Cumple precio medio) | • Parecido visual: $0,60$<br>• Color: Neutro ($+0,00$)<br>• Estilo: Coincide $0/2 = 0,00$ | $$(0,30 \times 0,60) + (0,70 \times 0,00) = \mathbf{0,18}$$ | **Descartada**<br>(Menor al umbral mínimo, no aparece) |
| **Tienda C (Alta Costura Gamarra)**<br>Declara: *Elegante, Oficina*.<br>Precio: **Alto (S/S/S/)**.<br>Catálogo: Tiene conjuntos sastre idénticos. | **No pasa**<br>(Precio alto $\ne$ medio) | — | — | **No aparece**<br>(Filtrada en Paso 1) |

---

## 6.4 Comparativa: Documento Teórico vs Implementación Calibrada

Esta tabla sintetiza las diferencias entre el planteamiento conceptual de gabinete y la versión calibrada tras las pruebas con las 23 tiendas reales y 277 prendas de Gamarra:

| Aspecto | Propuesta Teórica Inicial | Implementación Calibrada en Producción | Motivo del ajuste (Hallazgo empírico) |
| :--- | :--- | :--- | :--- |
| **Modo Una prenda** | 50 % Foto + 50 % Estilo | **Silueta dominante + Estilo desempate (+6 %)** | Si el estilo pesaba 50 %, tiendas de polos con etiqueta "Fiesta" superaban a tiendas de vestidos de fiesta. La prenda física debe mandar siempre. |
| **Modo Look completo** | 30 % Foto + 70 % Estilo | **30 % Foto + 70 % Estilo + Protección a Especialistas** | Se mantuvo el peso 30/70, pero se evitó castigar a tiendas de Gamarra que son $100\%$ especialistas en un solo estilo de los dos buscados. |
| **Manejo de Color** | Solo similitud visual general de la foto | **Reconocimiento cromático por 11 familias con límites léxicos** | La similitud coseno sola a veces confundía texturas similares de distinto color. El filtro de color explícito garantiza que el tono coincida. |
| **Conjuntos de 2 piezas** | Tratados como prendas individuales | **Detección desglosada de subpiezas (`garmentContainsFamily`)** | En Gamarra abundan los sets de 2 piezas (top + falda, chaleco + short). El algoritmo ahora reconoce si un conjunto contiene la prenda buscada. |
| **Bono de Variedad** | No contemplado | **$+0,02$ a $+0,06$ por alternativas adicionales en tienda** | En la experiencia de compra física en Gamarra, encontrar un stand con 3 o 4 opciones similares eleva drásticamente la probabilidad de compra del usuario. |
