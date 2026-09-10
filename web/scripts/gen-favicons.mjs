// One-off: regenerate favicons from the transparent Ayuxa mark (onlylogo.png).
// Produces transparent PNGs (browser tab / Android) + an opaque cream apple-touch-icon.
import sharp from 'sharp';
import fs from 'fs';

const SRC = 'public/onlylogo.png';
const CREAM = { r: 255, g: 255, b: 227, alpha: 1 }; // --color-bg-screen #FFFFE3

const trimmed = await sharp(SRC).trim().toBuffer();
const tm = await sharp(trimmed).metadata();
console.log(`trimmed logo: ${tm.width}x${tm.height}`);

async function make(size, out, { opaque = false, pad = 0.14 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const bg = opaque ? CREAM : { r: 0, g: 0, b: 0, alpha: 0 };
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(out, png);
  console.log(`wrote ${out}  ${size}x${size}  ${opaque ? '(opaque cream)' : '(transparent)'}`);
}

await make(16, 'public/favicon-16x16.png');
await make(32, 'public/favicon-32x32.png');
await make(48, 'public/favicon-48x48.png');
await make(180, 'public/apple-touch-icon.png', { opaque: true, pad: 0.10 });
await make(192, 'public/android-chrome-192x192.png');
await make(512, 'public/android-chrome-512x512.png');

console.log('\nPNG favicons done. Build favicon.ico separately (needs ico encoder).');
