const fs = require('fs');
const path = require('path');

const dir = path.join('d:', 'codes', 'MERN', 'medico', 'mobile', 'assets', 'images');

const failedFiles = [
    'd8ad60edd50d15bfa3472e8a2d9ca46b49e1d6b3.png',
    '8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png',
    '79c15725f6f1a73658b615886f1289634cef9408.png',
    '86bc70fa8f71d21216a24037fe0a8390c6f29516.png',
    '54f5c849cf75e776592dec8236f221da3694ca53.png',
    '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png'
];

const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
const results = { png: [], webp: [], failed: [], other: [] };

for (const file of files) {
    const filePath = path.join(dir, file);
    const buf = fs.readFileSync(filePath);
    const header = buf.slice(0, 12);

    let type = 'unknown';
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        type = 'png';
        results.png.push(file);
    } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
        type = 'webp';
        results.webp.push(file);
    } else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        type = 'jpeg';
        results.other.push({ file, type });
    } else if (buf.toString('utf8', 0, 100).includes('<svg') || buf.toString('utf8', 0, 100).includes('<?xml')) {
        type = 'svg';
        results.other.push({ file, type });
    } else {
        const hexHeader = Array.from(header.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        results.other.push({ file, type: 'unknown(' + hexHeader + ')' });
    }

    if (failedFiles.includes(file)) {
        results.failed.push({ file, detectedType: type, size: buf.length });
    }
}

console.log('Total .png files:', files.length);
console.log('Actual PNG:', results.png.length);
console.log('Actually WebP:', results.webp.length);
console.log('Other:', results.other.length);
console.log('');
console.log('Failed files:');
results.failed.forEach(f => console.log(' ', f.file, '->', f.detectedType, '(' + f.size + ' bytes)'));
if (results.webp.length > 0) {
    console.log('');
    console.log('WebP masquerading as PNG:');
    results.webp.forEach(f => console.log(' ', f));
}
if (results.other.length > 0) {
    console.log('');
    console.log('Non-PNG files:');
    results.other.forEach(f => console.log(' ', f.file, '->', f.type));
}
