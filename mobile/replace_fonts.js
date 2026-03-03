const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components'];

function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern for Platform.select(...)
    const platformPattern = /fontFamily:\s*Platform\.select\(\{\s*ios:\s*['"]([^'"]+)['"],\s*android:\s*['"]([^'"]+)['"],\s*default:\s*['"]([^'"]+)['"]\s*\}\)/g;

    content = content.replace(platformPattern, (match, iosFont, androidFont, defaultFont) => {
        let weightStr = 'Regular';
        let weightNum = '400';

        if (/Bold/.test(iosFont) || /Bold/.test(androidFont)) {
            weightStr = 'Bold';
            weightNum = '700';
            if (/SemiBold/.test(iosFont) || /SemiBold/.test(androidFont)) {
                weightStr = 'SemiBold';
                weightNum = '600';
            }
        } else if (/Medium/.test(iosFont) || /Medium/.test(androidFont)) {
            weightStr = 'Medium';
            weightNum = '500';
        } else if (/Light/.test(iosFont) || /Light/.test(androidFont)) {
            weightStr = 'Light';
            weightNum = '300';
        }

        return `fontFamily: Platform.select({ ios: 'Poppins-${weightStr}', android: 'Poppins_${weightNum}${weightStr}', default: 'System' })`;
    });

    // Pattern for direct string assignment: fontFamily: 'LexendDeca-Bold'
    const directPattern = /fontFamily:\s*['"]([^'"]+)['"]/g;
    content = content.replace(directPattern, (match, fontName) => {
        if (fontName.includes('Poppins')) return match; // Already Poppins
        if (fontName === 'System') return match; // Keep generic system (though we might want to change it. Let's change generic 'System' to Poppins-Regular only if it's explicitly assigned as a string, but usually it's default)

        let weightStr = 'Regular';
        if (fontName.includes('Bold')) {
            weightStr = 'Bold';
            if (fontName.includes('Semi')) weightStr = 'SemiBold';
        } else if (fontName.includes('Medium')) {
            weightStr = 'Medium';
        } else if (fontName.includes('Light')) {
            weightStr = 'Light';
        }

        return `fontFamily: 'Poppins-${weightStr}'`;
    });

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated fonts in: ${filePath}`);
    }
}

for (const dir of targetDirs) {
    processDirectory(path.join(__dirname, dir));
}
console.log('Font replacement complete.');
