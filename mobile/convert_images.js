// Script to find all WebP files disguised as .png and convert them to actual PNG
// Uses sharp library for the conversion
const fs = require('fs');
const path = require('path');

async function main() {
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.error('sharp not found. Installing...');
        const { execSync } = require('child_process');
        execSync('npm install sharp', { stdio: 'inherit' });
        sharp = require('sharp');
    }

    const dir = path.join('d:', 'codes', 'MERN', 'medico', 'mobile', 'assets', 'images');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

    let converted = 0;
    let errors = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const buf = fs.readFileSync(filePath);

        // Check if it's actually a PNG (magic bytes: 89 50 4E 47)
        const isPNG = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;

        if (!isPNG) {
            // Check what it actually is
            const isWebP = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
            const isJPEG = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;

            const type = isWebP ? 'WebP' : isJPEG ? 'JPEG' : 'Unknown';
            console.log(`Converting ${file} (actual: ${type}) -> PNG`);

            try {
                const pngBuffer = await sharp(filePath).png().toBuffer();
                fs.writeFileSync(filePath, pngBuffer);
                converted++;
                console.log(`  ✓ Converted successfully (${buf.length} -> ${pngBuffer.length} bytes)`);
            } catch (err) {
                errors++;
                console.error(`  ✗ Failed: ${err.message}`);
            }
        }
    }

    console.log(`\nDone! Converted: ${converted}, Errors: ${errors}, Already PNG: ${files.length - converted - errors}`);
}

main().catch(console.error);
