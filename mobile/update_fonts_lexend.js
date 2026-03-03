/**
 * Bulk Font Replacement Script
 * 
 * Replaces Poppins Regular/Medium/Light → LexendDeca equivalents
 * Keeps Poppins Bold/SemiBold unchanged (headline fonts)
 */
const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components'];

// Mapping: old font name → new font name
const replacements = [
    // iOS-style font names
    ["'Poppins-Regular'", "'LexendDeca-Regular'"],
    ["'Poppins-Medium'", "'LexendDeca-Medium'"],
    ["'Poppins-Light'", "'LexendDeca-Light'"],
    // Android-style font names
    ["'Poppins_400Regular'", "'LexendDeca_400Regular'"],
    ["'Poppins_500Medium'", "'LexendDeca_500Medium'"],
    ["'Poppins_300Light'", "'LexendDeca_300Light'"],
];

let totalFilesUpdated = 0;
let totalReplacements = 0;

function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip node_modules and hidden dirs
            if (file === 'node_modules' || file.startsWith('.')) continue;
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    let fileReplacements = 0;

    for (const [oldFont, newFont] of replacements) {
        const count = content.split(oldFont).length - 1;
        if (count > 0) {
            content = content.split(oldFont).join(newFont);
            fileReplacements += count;
        }
    }

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Updated: ${path.relative(__dirname, filePath)} (${fileReplacements} replacements)`);
        totalFilesUpdated++;
        totalReplacements += fileReplacements;
    }
}

console.log('Starting font replacement: Poppins (Regular/Medium/Light) → LexendDeca...\n');

for (const dir of targetDirs) {
    const dirPath = path.join(__dirname, dir);
    console.log(`Scanning ${dir}/...`);
    processDirectory(dirPath);
}

console.log(`\nDone! Updated ${totalFilesUpdated} files with ${totalReplacements} total replacements.`);
console.log('Bold/SemiBold fonts remain as Poppins (headlines).');
