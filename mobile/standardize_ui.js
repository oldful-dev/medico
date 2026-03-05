/**
 * Standardize UI tokens across all mobile app screen files.
 * Replaces:
 *   - Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }) → Fonts.bold
 *   - Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }) → Fonts.semiBold
 *   - Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }) → Fonts.medium
 *   - Platform.select({ ios: 'Poppins-Regular', android: 'Poppins_400Regular', default: 'System' }) → Fonts.regular
 *   - Platform.select({ ios: 'Poppins-Light', android: 'Poppins_300Light', default: 'System' }) → Fonts.light
 *   - Platform.select({ ios: 'LexendDeca-...' }) → Fonts equivalents (LexendDeca is being replaced by Poppins)
 *   - Hardcoded color values → Colors.xxx
 *   - Hardcoded fontSize values → FontSize.xxx (for common patterns)
 *   - Ensures import of theme tokens and removes unused Platform import if possible
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process - all .tsx files under app/
const baseDir = path.join(__dirname, 'app');

function findTsxFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findTsxFiles(fullPath));
        } else if (entry.name.endsWith('.tsx') && !entry.name.startsWith('_layout')) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = findTsxFiles(baseDir);

// Skip index.tsx since we already updated it
const alreadyDone = [
    path.join(baseDir, '(tabs)', 'index.tsx'),
];

let totalChanges = 0;

for (const filePath of files) {
    if (alreadyDone.some(d => path.resolve(d) === path.resolve(filePath))) {
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // ─── 1. Replace Platform.select font patterns ───
    // Poppins Bold
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'Poppins-Bold',\s*android:\s*'Poppins_700Bold',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.bold'
    );
    // Poppins SemiBold
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'Poppins-SemiBold',\s*android:\s*'Poppins_600SemiBold',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.semiBold'
    );
    // Poppins Medium
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'Poppins-Medium',\s*android:\s*'Poppins_500Medium',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.medium'
    );
    // Poppins Regular
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'Poppins-Regular',\s*android:\s*'Poppins_400Regular',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.regular'
    );
    // Poppins Light
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'Poppins-Light',\s*android:\s*'Poppins_300Light',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.light'
    );

    // LexendDeca → Poppins equivalents
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'LexendDeca-Bold',\s*android:\s*'LexendDeca_700Bold',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.bold'
    );
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'LexendDeca-SemiBold',\s*android:\s*'LexendDeca_600SemiBold',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.semiBold'
    );
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'LexendDeca-Medium',\s*android:\s*'LexendDeca_500Medium',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.medium'
    );
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'LexendDeca-Regular',\s*android:\s*'LexendDeca_400Regular',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.regular'
    );
    content = content.replace(
        /Platform\.select\(\{\s*ios:\s*'LexendDeca-Light',\s*android:\s*'LexendDeca_300Light',\s*default:\s*'System'\s*\}\)/g,
        'Fonts.light'
    );

    // ─── 2. Replace hardcoded colors ───
    // Background colors
    content = content.replace(/backgroundColor:\s*'#FFFFE3'/g, "backgroundColor: Colors.bgScreen");
    content = content.replace(/backgroundColor:\s*'#FDFDE8'/g, "backgroundColor: Colors.bgScreen");
    content = content.replace(/backgroundColor:\s*'#FFFFEE'/g, "backgroundColor: Colors.bgScreen");
    content = content.replace(/backgroundColor:\s*'#FFFFF8'/g, "backgroundColor: Colors.bgHeader");
    content = content.replace(/backgroundColor:\s*'#FFFFFD'/g, "backgroundColor: Colors.bgCard");

    // Primary greens (careful not to replace borderColor which stays the same)
    content = content.replace(/color:\s*'#034C2A'/g, "color: Colors.primaryDeep");
    content = content.replace(/color:\s*'#085B34'/g, "color: Colors.primaryText");
    content = content.replace(/color:\s*'#048357'/g, "color: Colors.primary");
    content = content.replace(/color:\s*'#02743F'/g, "color: Colors.primaryDark");

    // Text colors
    content = content.replace(/color:\s*'#1E1E1E'/g, "color: Colors.textDark");
    content = content.replace(/color:\s*'#2F2F2F'/g, "color: Colors.textBody");
    content = content.replace(/color:\s*'#848484'/g, "color: Colors.textMuted");
    content = content.replace(/color:\s*'#AAAEAC'/g, "color: Colors.textLight");
    content = content.replace(/color:\s*'#FFFFFF'/g, "color: Colors.textWhite");

    // Border colors  
    content = content.replace(/borderColor:\s*'#02743F'/g, "borderColor: Colors.primaryDark");
    content = content.replace(/borderColor:\s*'#048357'/g, "borderColor: Colors.primary");
    content = content.replace(/borderColor:\s*'#34C759'/g, "borderColor: Colors.accent");

    // SOS red
    content = content.replace(/backgroundColor:\s*'#FF3B30'/g, "backgroundColor: Colors.sosRed");
    content = content.replace(/backgroundColor:\s*'#FF0000'/g, "backgroundColor: Colors.sosRed");

    // ─── 3. Replace fontSize values that correspond to our scale ───
    // Page titles: 20 → heading1 (22) — but leaving as-is if it's a deliberate size
    // Section titles: 18 → heading2
    // We standardize the most common patterns:

    // fontSize: 8, → FontSize.caption (10) — bump up tiny text
    content = content.replace(/fontSize:\s*8,/g, "fontSize: FontSize.caption,");
    // fontSize: 9, → FontSize.caption
    content = content.replace(/fontSize:\s*9,/g, "fontSize: FontSize.caption,");
    // fontSize: 10, → FontSize.caption
    content = content.replace(/fontSize:\s*10,/g, "fontSize: FontSize.caption,");
    // fontSize: 11, → FontSize.bodySmall (12)
    content = content.replace(/fontSize:\s*11,/g, "fontSize: FontSize.bodySmall,");
    // fontSize: 12, → FontSize.bodySmall
    content = content.replace(/fontSize:\s*12,/g, "fontSize: FontSize.bodySmall,");
    // fontSize: 13, → FontSize.body (14) — slight bump for readability
    content = content.replace(/fontSize:\s*13,/g, "fontSize: FontSize.body,");
    // fontSize: 14, → FontSize.body
    content = content.replace(/fontSize:\s*14,/g, "fontSize: FontSize.body,");
    // fontSize: 15, → FontSize.body (14)
    content = content.replace(/fontSize:\s*15,/g, "fontSize: FontSize.body,");
    // fontSize: 16, → FontSize.heading3
    content = content.replace(/fontSize:\s*16,/g, "fontSize: FontSize.heading3,");
    // fontSize: 18, → FontSize.heading2
    content = content.replace(/fontSize:\s*18,/g, "fontSize: FontSize.heading2,");
    // fontSize: 20, → FontSize.heading1 (22)
    content = content.replace(/fontSize:\s*20,/g, "fontSize: FontSize.heading1,");
    // fontSize: 22, → FontSize.heading1
    content = content.replace(/fontSize:\s*22,/g, "fontSize: FontSize.heading1,");
    // fontSize: 24, → FontSize.display
    content = content.replace(/fontSize:\s*24,/g, "fontSize: FontSize.display,");

    // ─── 4. Replace shadow patterns ───
    content = content.replace(
        /shadowColor:\s*'#000000',\s*\n\s*shadowOffset:\s*\{\s*width:\s*0,\s*height:\s*4\s*\},\s*\n\s*shadowOpacity:\s*0\.(?:1|15|25),\s*\n\s*shadowRadius:\s*(?:10|15|20),\s*\n\s*elevation:\s*(?:4|6|8),/g,
        '...Shadow.card,'
    );

    // ─── 5. Replace borderRadius with Radius tokens ───
    content = content.replace(/borderRadius:\s*6,/g, "borderRadius: Radius.sm,");
    content = content.replace(/borderRadius:\s*8,/g, "borderRadius: Radius.sm,");
    content = content.replace(/borderRadius:\s*10,/g, "borderRadius: Radius.md,");
    content = content.replace(/borderRadius:\s*12,/g, "borderRadius: Radius.md,");
    content = content.replace(/borderRadius:\s*15,/g, "borderRadius: Radius.lg,");
    content = content.replace(/borderRadius:\s*16,/g, "borderRadius: Radius.lg,");
    content = content.replace(/borderRadius:\s*18,/g, "borderRadius: Radius.xl,");
    content = content.replace(/borderRadius:\s*20,/g, "borderRadius: Radius.xl,");
    content = content.replace(/borderRadius:\s*27,/g, "borderRadius: Radius.xl,");
    content = content.replace(/borderRadius:\s*27\.5,/g, "borderRadius: Radius.xl,");
    content = content.replace(/borderRadius:\s*999,/g, "borderRadius: Radius.full,");
    content = content.replace(/borderRadius:\s*9999,/g, "borderRadius: Radius.full,");

    // ─── 6. Replace spacing values ───
    content = content.replace(/paddingHorizontal:\s*15,/g, "paddingHorizontal: Spacing.lg,");
    content = content.replace(/paddingHorizontal:\s*16,/g, "paddingHorizontal: Spacing.lg,");
    content = content.replace(/paddingHorizontal:\s*17,/g, "paddingHorizontal: Spacing.lg,");
    content = content.replace(/marginHorizontal:\s*15,/g, "marginHorizontal: Spacing.cardMargin,");
    content = content.replace(/marginHorizontal:\s*16,/g, "marginHorizontal: Spacing.cardMargin,");

    // ─── 7. Add theme import if changes were made ───
    if (content !== original) {
        // Check if theme import already exists
        if (!content.includes("from '@/constants/theme'")) {
            // Add import after the last react-native import
            const importLine = "import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';";

            // Find the last import line
            const lines = content.split('\n');
            let lastImportIdx = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('import ') || lines[i].includes("} from '")) {
                    lastImportIdx = i;
                }
                if (lines[i].trim() === '' && lastImportIdx > 0 && !lines[i + 1]?.includes('import')) {
                    break;
                }
            }
            lines.splice(lastImportIdx + 1, 0, importLine);
            content = lines.join('\n');
        }

        // Remove Platform from import if no longer used
        if (!content.includes('Platform.') && !content.includes('Platform,')) {
            // It might be in destructured import
            content = content.replace(/,\s*\n\s*Platform,/g, ',');
            content = content.replace(/Platform,\s*\n/g, '');
            content = content.replace(/\s*Platform,/g, '');
        }

        fs.writeFileSync(filePath, content, 'utf8');
        const changeCount = (content.match(/Colors\.|Fonts\.|FontSize\.|Spacing\.|Radius\.|Shadow\./g) || []).length;
        console.log(`✅ ${path.relative(__dirname, filePath)} — ${changeCount} tokens applied`);
        totalChanges++;
    } else {
        console.log(`⏭️  ${path.relative(__dirname, filePath)} — no changes needed`);
    }
}

console.log(`\n🏁 Done! Updated ${totalChanges} files.`);
