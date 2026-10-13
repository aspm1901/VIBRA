const sharp = require('sharp');
const fs = require('fs');

async function generateFavicons() {
  const size = 512;
  const padding = Math.round(size * 0.16); // padding for V logo
  const vSize = size - padding * 2;

  // Resize white logo to vSize x vSize
  const vResized = await sharp('public/logo_vibra_white.png')
    .resize(vSize, vSize, { fit: 'contain' })
    .toBuffer();

  // Create an SVG rounded rectangle background (aesthetic dark squircle badge)
  const bgSvg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1e2c" />
          <stop offset="50%" stop-color="#14141d" />
          <stop offset="100%" stop-color="#0b0b10" />
        </linearGradient>
        <radialGradient id="vibraGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(244, 63, 94, 0.15)" />
          <stop offset="100%" stop-color="rgba(244, 63, 94, 0)" />
        </radialGradient>
      </defs>
      <!-- Base squircle -->
      <rect x="0" y="0" width="${size}" height="${size}" rx="116" fill="url(#bgGrad)" />
      <!-- Subtle glow inside -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.45}" fill="url(#vibraGlow)" />
      <!-- Border -->
      <rect x="3" y="3" width="${size - 6}" height="${size - 6}" rx="113" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="6" />
    </svg>
  `);

  // Composite background with the white V centered
  const iconBuffer = await sharp(bgSvg)
    .composite([
      {
        input: vResized,
        top: padding,
        left: padding,
      }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('public/icon.png', iconBuffer);
  fs.writeFileSync('public/logo_vibra_badge.png', iconBuffer);
  fs.writeFileSync('app/icon.png', iconBuffer);

  // Apple touch icon (180x180)
  const appleIcon = await sharp(iconBuffer)
    .resize(180, 180)
    .png()
    .toBuffer();
  fs.writeFileSync('app/apple-icon.png', appleIcon);
  fs.writeFileSync('public/apple-icon.png', appleIcon);

  // Favicon sizes: 32x32, 48x48
  const fav32 = await sharp(iconBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync('public/favicon-32x32.png', fav32);

  const fav48 = await sharp(iconBuffer).resize(48, 48).png().toBuffer();
  fs.writeFileSync('public/favicon-48x48.png', fav48);

  // Create favicon.ico from 32x32 (or copy png as favicon.ico which modern browsers support, or basic ICO header)
  // Next.js App Router and modern browsers handle PNG favicon.ico or icon.png directly.
  fs.writeFileSync('public/favicon.ico', fav32);
  fs.writeFileSync('app/favicon.ico', fav32);

  console.log('Successfully generated all icon assets!');
}

generateFavicons().catch(console.error);
