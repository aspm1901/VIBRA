# VIBRA — Buscador Visual de Ropa para Gamarra (MVP)

Plataforma web de recomendación de tiendas por afinidad de estilo visual y semántica mediante Inteligencia Artificial multimodal.

---

## 🚀 Inicio Rápido

### 1. Requisitos
* Node.js v18+ (o superior)
* npm o pnpm

### 2. Configurar la clave de IA (Gratis)
Obtén tu clave de API gratuita en [Google AI Studio](https://aistudio.google.com) y colócala en `.env.local`:

```bash
GEMINI_API_KEY=tu_clave_aqui
```

> **Nota:** La aplicación cuenta con un sistema de respaldo (*fallback*) integrado, por lo que funcionará y mostrará resultados inmediatamente incluso si no colocas una clave API en la primera prueba.

### 3. Ejecutar en modo desarrollo

```bash
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 📱 Pantallas Principales

1. **Buscador Principal (`/`)**:
   - Subida de foto con cámara o archivo.
   - Recorte táctil con encuadre de prenda (`react-easy-crop`).
   - Detección automática de estilos con Gemini Flash.
   - Filtros por categoría, estilo, nivel de precio, talla y compra.
   - Resultados agrupados por galería ordenados de mayor a menor resonancia.
   - Indicador visual de resonancia de 3 arcos (Alta $\ge 0.85$, Media $\ge 0.70$, Exploratoria $\ge 0.55$).
   - Modal detallado de tienda con foto comparativa más cercana y botón directo a WhatsApp.

2. **Panel de Administración (`/admin`)**:
   - Registro de nuevas tiendas de prueba.
   - Carga masiva de fotos de prendas para el catálogo.
   - **Vectorización automática con IA**: Al guardar la tienda, el sistema genera los embeddings de cada prenda en segundo plano usando `gemini-embedding-2`.
   - Gestión y eliminación de tiendas del catálogo.

---

## 🛠️ Arquitectura Técnica

* **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons.
* **Recorte de Imágenes:** `react-easy-crop`.
* **IA Multimodal:** Google GenAI SDK (`@google/genai`):
  * `gemini-embedding-2`: Generación de huellas vectoriales de 768 dimensiones.
  * `gemini-2.5-flash`: Extracción de categorías y estilos de moda en JSON estructurado.
* **Persistencia Local:** `data/stores.json` con 3 tiendas semilla precargadas y carpeta `public/uploads/stores` para imágenes de prueba.
