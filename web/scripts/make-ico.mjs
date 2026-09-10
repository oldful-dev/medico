// Minimal ICO writer: packs 16/32/48 PNGs as PNG-compressed icon entries.
// All current browsers read PNG-in-ICO. No 256px bloat.
import fs from 'fs';

const files = [
  ['public/favicon-16x16.png', 16],
  ['public/favicon-32x32.png', 32],
  ['public/favicon-48x48.png', 48],
];

const images = files.map(([f, size]) => ({ size, data: fs.readFileSync(f) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // type: icon
header.writeUInt16LE(images.length, 4);

const dir = Buffer.alloc(16 * images.length);
let offset = 6 + dir.length;
const bodies = [];

images.forEach((img, i) => {
  const o = i * 16;
  dir.writeUInt8(img.size >= 256 ? 0 : img.size, o + 0); // width
  dir.writeUInt8(img.size >= 256 ? 0 : img.size, o + 1); // height
  dir.writeUInt8(0, o + 2);   // palette
  dir.writeUInt8(0, o + 3);   // reserved
  dir.writeUInt16LE(1, o + 4);   // color planes
  dir.writeUInt16LE(32, o + 6);  // bpp
  dir.writeUInt32LE(img.data.length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += img.data.length;
  bodies.push(img.data);
});

fs.writeFileSync('public/favicon.ico', Buffer.concat([header, dir, ...bodies]));
console.log(`favicon.ico: ${images.map(i => i.size).join('/')} px, ${(Buffer.concat([header, dir, ...bodies]).length / 1024).toFixed(1)} KB`);
