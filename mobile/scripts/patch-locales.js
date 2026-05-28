/**
 * patch-sos-keys.js
 * Translates the new `my_sos_alerts` section (and any other keys missing from
 * existing locale files) into all 7 non-English locale files and merges them in.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const targetLanguages = ['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'bn'];

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// ─── Helpers ────────────────────────────────────────────────────────────────

function flattenObject(obj, currentPath = '', result = {}) {
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flattenObject(obj[key], nextPath, result);
        } else if (typeof obj[key] === 'string') {
            result[nextPath] = obj[key];
        }
    }
    return result;
}

function getNestedValue(obj, pathStr) {
    return pathStr.split('.').reduce((cur, part) => cur?.[part], obj);
}

function setNestedValue(obj, pathStr, value) {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function translateText(text, targetLang) {
    if (!text || text.trim() === '') return Promise.resolve(text);
    if (!/[a-zA-Z]/.test(text)) return Promise.resolve(text);

    return new Promise((resolve) => {
        const variables = [];
        const placeholderText = text.replace(/\{\{([^}]+)\}\}/g, (match) => {
            variables.push(match);
            return `__VAR_${variables.length - 1}__`;
        });

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(placeholderText)}`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) { resolve(text); return; }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let translated = parsed[0].map(x => x[0]).join('');
                    variables.forEach((origVar, index) => {
                        translated = translated.replace(new RegExp(`__\\s*VAR_\\s*${index}\\s*__`, 'gi'), origVar);
                    });
                    resolve(translated);
                } catch { resolve(text); }
            });
        }).on('error', () => resolve(text));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('--- SOS Keys Patch Script ---');
    const flatEn = flattenObject(enData);

    for (const lang of targetLanguages) {
        const targetPath = path.join(localesDir, `${lang}.json`);
        let existing = {};
        if (fs.existsSync(targetPath)) {
            try { existing = JSON.parse(fs.readFileSync(targetPath, 'utf8')); } catch {}
        }

        // Find keys that exist in en.json but are MISSING in this locale file
        const flatExisting = flattenObject(existing);
        const missingKeys = Object.keys(flatEn).filter(k => !flatExisting[k]);

        if (missingKeys.length === 0) {
            console.log(`${lang}: already up to date, skipping.`);
            continue;
        }

        console.log(`\n${lang}: translating ${missingKeys.length} missing keys...`);
        let done = 0;

        for (const keyPath of missingKeys) {
            const originalText = flatEn[keyPath];
            try {
                const translated = await translateText(originalText, lang);
                setNestedValue(existing, keyPath, translated);
            } catch {
                setNestedValue(existing, keyPath, originalText);
            }
            done++;
            if (done % 10 === 0 || done === missingKeys.length) {
                process.stdout.write(`\r  Progress: ${done}/${missingKeys.length}`);
            }
            await sleep(40);
        }

        fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2), 'utf8');
        console.log(`\nSaved ${lang}.json (patched ${missingKeys.length} keys)`);
    }

    console.log('\n--- Patch complete ---');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
