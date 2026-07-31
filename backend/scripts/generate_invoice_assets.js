const fs = require('fs');
const path = require('path');

const invDir = path.resolve(__dirname, '../public/invoice');
if (!fs.existsSync(invDir)) fs.mkdirSync(invDir, { recursive: true });

// Minimal 1x1 / vector-based PNG helpers or SVG data generation
// 1. Check icon (Red check mark SVG converted to base64 or clean PNG)
const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="2" y="18" fill="#A52227" font-size="18" font-weight="bold">✔</text></svg>`;
// 2. Phone icon
const phoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#A52227"/><text x="16" y="21" fill="#FFFFFF" font-size="16" text-anchor="middle">☎</text></svg>`;
// 3. Email icon
const emailSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#A52227"/><text x="16" y="20" fill="#FFFFFF" font-size="14" text-anchor="middle">✉</text></svg>`;
// 4. Globe icon
const globeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#A52227"/><text x="16" y="21" fill="#FFFFFF" font-size="14" text-anchor="middle">🌐</text></svg>`;
// 5. Logo icon
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="70" viewBox="0 0 300 70">
  <path d="M 35 30 C 15 10, 5 45, 35 52 C 55 45, 48 10, 27 30 Z" fill="none" stroke="#1D5E35" stroke-width="7" stroke-linecap="round"/>
  <path d="M 27 30 C 48 52, 55 17, 35 10 C 15 17, 22 52, 42 30 Z" fill="none" stroke="#1D5E35" stroke-width="7" stroke-linecap="round"/>
  <text x="75" y="40" fill="#1D5E35" font-family="sans-serif" font-size="32" font-weight="bold">AYUXA</text>
  <text x="77" y="56" fill="#666666" font-family="sans-serif" font-size="11" font-weight="600">Your Health, Synchronized</text>
</svg>`;
// 6. Signature icon
const signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
  <path d="M 15 35 Q 30 10 50 45 T 90 20 T 130 25" fill="none" stroke="#1E2A38" stroke-width="2.5" stroke-linecap="round"/>
  <text x="140" y="25" fill="#3b5998" font-family="sans-serif" font-size="9" font-weight="bold">AYUXA HEALTH</text>
  <text x="140" y="38" fill="#3b5998" font-family="sans-serif" font-size="9" font-weight="bold">BLR-001</text>
</svg>`;

fs.writeFileSync(path.join(invDir, 'logo.png'), Buffer.from(logoSvg));
fs.writeFileSync(path.join(invDir, 'signature.png'), Buffer.from(signatureSvg));
fs.writeFileSync(path.join(invDir, 'phone.png'), Buffer.from(phoneSvg));
fs.writeFileSync(path.join(invDir, 'email.png'), Buffer.from(emailSvg));
fs.writeFileSync(path.join(invDir, 'globe.png'), Buffer.from(globeSvg));
fs.writeFileSync(path.join(invDir, 'check.png'), Buffer.from(checkSvg));

console.log('Invoice asset images created in public/invoice!');
