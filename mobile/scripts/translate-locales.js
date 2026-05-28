const fs = require('fs');
const path = require('path');
const https = require('https');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const targetLanguages = ['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'bn'];

// Read base English locales
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Helper to flatten object into paths
function flattenObject(obj, currentPath = '', result = {}) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const nextPath = currentPath ? `${currentPath}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], nextPath, result);
            } else if (typeof obj[key] === 'string') {
                result[nextPath] = obj[key];
            }
        }
    }
    return result;
}

// Helper to set nested value by path
function setNestedValue(obj, pathStr, value) {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

// Helper to call Google Translate API
function translateText(text, targetLang) {
    if (!text || text.trim() === '') return Promise.resolve(text);
    
    // Check if the text contains no letters (e.g. "₹", "←", numbers)
    if (!/[a-zA-Z]/.test(text)) {
        return Promise.resolve(text);
    }

    return new Promise((resolve) => {
        // Protect translation variables like {{seconds}} or {{phone}}
        const variables = [];
        const placeholderText = text.replace(/\{\{([^}]+)\}\}/g, (match) => {
            const index = variables.length;
            variables.push(match);
            return `__VAR_${index}__`;
        });

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(placeholderText)}`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                // Return original on API error
                resolve(text);
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let translated = parsed[0].map(x => x[0]).join('');

                    // Restore protected variables
                    variables.forEach((origVar, index) => {
                        const regex = new RegExp(`__\\s*VAR_\\s*${index}\\s*__`, 'gi');
                        translated = translated.replace(regex, origVar);
                    });

                    resolve(translated);
                } catch (e) {
                    resolve(text);
                }
            });
        }).on('error', () => {
            resolve(text);
        });
    });
}

// Sleep utility to throttle requests
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log('--- Start Local Translations Pipeline ---');
    console.log(`Locales directory: ${localesDir}`);
    const flatEn = flattenObject(enData);
    const keysToTranslate = Object.keys(flatEn);
    console.log(`Found ${keysToTranslate.length} strings in en.json to translate.`);

    for (const lang of targetLanguages) {
        console.log(`\nTranslating to: ${lang}...`);
        const targetPath = path.join(localesDir, `${lang}.json`);
        let currentTranslations = {};
        
        // If file exists, read it to preserve existing structure and skip already translated items
        // (but since they are currently copies of en.json, we will translate all of them)
        const translatedObj = {};

        let translatedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < keysToTranslate.length; i++) {
            const keyPath = keysToTranslate[i];
            const originalText = flatEn[keyPath];
            
            try {
                const translatedText = await translateText(originalText, lang);
                setNestedValue(translatedObj, keyPath, translatedText);
                translatedCount++;
            } catch (err) {
                console.error(`Failed to translate key: ${keyPath}`, err);
                setNestedValue(translatedObj, keyPath, originalText);
                errorCount++;
            }

            // Print progress
            if ((i + 1) % 100 === 0 || i === keysToTranslate.length - 1) {
                console.log(`Progress: ${i + 1}/${keysToTranslate.length} strings processed...`);
            }

            // Throttle requests slightly (40ms) to respect free Google Translate API limits
            await sleep(40);
        }

        // Write the reconstructed JSON back
        fs.writeFileSync(targetPath, JSON.stringify(translatedObj, null, 2), 'utf8');
        console.log(`Saved ${lang}.json. Translated: ${translatedCount}, Errors/Skipped: ${errorCount}`);
    }

    console.log('\n--- Translations Pipeline Completed Successfully ---');
}

main().catch(err => {
    console.error('Fatal error in translation pipeline:', err);
});
