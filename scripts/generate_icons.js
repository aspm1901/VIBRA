const sharp = require('sharp');
const fs = require('fs');

async function generateAllVibraIcons() {
  const size = 512;
  const scale = 4.3;
  // Center: symbol width from x=16 to x=69.5 (cx=42.75). Height from y=2.5 to y=93.5 (cy=48).
  const tx = Math.round(size / 2 - 42.75 * scale);
  const ty = Math.round(size / 2 - 48 * scale);

  const svgBadge = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo Squircle Blanco Puro con borde sutil Caliza 10 (Apto para modo oscuro y claro) -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="116" fill="#FFFFFF" />
  <rect x="4" y="4" width="${size - 8}" height="${size - 8}" rx="112" fill="none" stroke="#E2E3DB" stroke-width="8" />
  <!-- Isotipo Oficial Vibra (Manual de Marca v2.0) -->
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <circle cx="24" cy="48" r="8" fill="#26282A" />
    <path d="M 30.84 29.21 A 20 20 0 0 1 30.84 66.79" fill="none" stroke="#26282A" stroke-width="7" stroke-linecap="round" />
    <path d="M 34.94 17.93 A 32 32 0 0 1 34.94 78.07" fill="none" stroke="#71545B" stroke-width="5.5" stroke-linecap="round" />
    <path d="M 39.05 6.65 A 44 44 0 0 1 39.05 89.35" fill="none" stroke="#676B63" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>
`.trim();

  const svgBuffer = Buffer.from(svgBadge);

  // 1. 512x512 Master PWA / Web icon
  const icon512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync('public/icon.png', icon512);
  fs.writeFileSync('app/icon.png', icon512);
  fs.writeFileSync('public/logo_vibra_badge.png', icon512);

  // 2. 180x180 Apple Touch Icon (iOS home screen & Safari bookmarks)
  const apple180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync('app/apple-icon.png', apple180);
  fs.writeFileSync('public/apple-icon.png', apple180);

  // 3. 48x48 Favicon
  const fav48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  fs.writeFileSync('public/favicon-48x48.png', fav48);

  // 4. 32x32 Favicon
  const fav32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync('public/favicon-32x32.png', fav32);

  // 5. favicon.ico (Standard browser tab icon)
  fs.writeFileSync('public/favicon.ico', fav32);
  fs.writeFileSync('app/favicon.ico', fav32);

  // 6. SVG vector icon for ultra-sharp retina displays
  fs.writeFileSync('public/icon.svg', svgBadge);
  fs.writeFileSync('app/icon.svg', svgBadge);

  console.log('✅ Todos los favicons e iconos oficiales de Vibra fueron generados con éxito!');
}

generateAllVibraIcons().catch(console.error);
