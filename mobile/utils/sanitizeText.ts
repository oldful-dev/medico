/**
 * Decodes standard HTML entities and decimal entities.
 */
function decodeHtmlEntities(text: string): string {
    return text.replace(/&(#?[\w\d]+);/g, (match, entity) => {
        if (entity.startsWith('#')) {
            const code = parseInt(entity.substring(1), 10);
            return isNaN(code) ? match : String.fromCharCode(code);
        }
        switch (entity.toLowerCase()) {
            case 'amp': return '&';
            case 'lt': return '<';
            case 'gt': return '>';
            case 'quot': return '"';
            case 'apos': return "'";
            case 'nbsp': return ' ';
            default: return match;
        }
    });
}

/**
 * Sanitizes notification texts by completely removing:
 * - JSON structures (if it contains JSON, it parses it first)
 * - HTML tags & HTML entities
 * - Template variables / placeholders: {{var}}, {var}, ${var}, %VAR%, __VAR__
 * - Code snippets (JS/TS code, variables, functions, import/export, SQL queries)
 * - Backend data references & traces (stack traces, Prisma errors, [object Object] etc.)
 * 
 * Also cleans up punctuation spacing issues that arise after placeholders are removed.
 */
export function cleanNotificationText(text: string | null | undefined): string {
    if (!text) return '';
    let clean = text.trim();

    // 1. Check if it is a JSON string and try to extract the main message
    if (clean.startsWith('{') || clean.startsWith('[')) {
        try {
            const parsed = JSON.parse(clean);
            if (typeof parsed === 'object' && parsed !== null) {
                const possibleMsg =
                    parsed.message ||
                    parsed.body ||
                    parsed.text ||
                    parsed.desc ||
                    parsed.description ||
                    parsed.notification ||
                    parsed.msg;
                if (possibleMsg) {
                    clean = String(possibleMsg);
                } else {
                    clean = '';
                }
            }
        } catch (e) {
            // ignore JSON parsing errors, treat as raw text
        }
    }

    // 2. Remove markdown code blocks and inline code
    clean = clean.replace(/```[\s\S]*?```/g, '');
    clean = clean.replace(/`[^`]*`/g, '');

    // 3. Decode HTML Entities
    clean = decodeHtmlEntities(clean);

    // 4. Remove HTML tags
    clean = clean.replace(/<\/?[^>]+(>|$)/g, '');

    // 5. Remove template variables and placeholders
    clean = clean.replace(/\{\{[^}]*\}\}/g, '');
    clean = clean.replace(/\$\{[^}]*\}/g, '');
    clean = clean.replace(/\{[^}]*\}/g, '');
    clean = clean.replace(/%[a-zA-Z0-9_.-]+%/g, '');
    clean = clean.replace(/__[a-zA-Z0-9_.-]+__/g, '');

    // 6. Remove inline object string representations (like [object Object])
    clean = clean.replace(/\[object\s+[a-zA-Z0-9_]+\]/g, '');

    // 7. Split into lines and filter out lines containing code or backend system outputs
    const lines = clean.split('\n');
    const filteredLines = lines.filter((line) => {
        const l = line.trim();
        if (!l) return false;

        // Skip JavaScript/TypeScript code keywords and patterns
        if (
            l.includes('const ') ||
            l.includes('let ') ||
            l.includes('var ') ||
            l.includes('import ') ||
            l.includes('export ') ||
            l.includes('function(') ||
            l.includes('function ') ||
            l.includes('=>') ||
            l.includes('class ') ||
            l.endsWith(';') ||
            l.includes('console.log') ||
            l.includes('console.error') ||
            l.includes('return ') ||
            l.includes('require(') ||
            l.includes('module.exports')
        ) {
            return false;
        }

        // Skip SQL database patterns
        const upperL = l.toUpperCase();
        if (
            upperL.includes('SELECT ') ||
            upperL.includes('INSERT INTO') ||
            upperL.includes('UPDATE ') ||
            upperL.includes('DELETE FROM') ||
            upperL.includes('CREATE TABLE') ||
            (upperL.includes('FROM ') && upperL.includes('WHERE '))
        ) {
            return false;
        }

        // Skip stack trace lines, exceptions and technical errors
        if (
            l.startsWith('at ') ||
            l.includes('stack trace') ||
            l.includes('Error:') ||
            l.includes('Exception:') ||
            l.includes('node_modules') ||
            l.includes('.js:') ||
            l.includes('.ts:') ||
            l.includes('RowDataPacket')
        ) {
            return false;
        }

        // Skip raw objects/arrays references
        if (
            l.includes('[object Object]') ||
            l.includes('[object Array]') ||
            l.includes('[object ') ||
            l.includes('{"') ||
            l.includes('":') ||
            l.includes('__typename') ||
            l.includes('__v')
        ) {
            return false;
        }

        return true;
    });

    clean = filteredLines.join('\n').trim();

    // 7. Clean up spacing and punctuation artifacts from template variables removal
    // Clean up multiple punctuation, double spaces, and spaces around punctuation
    clean = clean.replace(/\s+/g, ' ');
    clean = clean.replace(/\s+([.,!?;:])\s*/g, '$1 ');
    clean = clean.replace(/([.,!?;:])\1+/g, '$1');
    
    // Clean up orphaned commas, colons, or periods at the beginning of the string
    clean = clean.replace(/^[,.\s!?;:]+/, '');
    
    // Clean up orphaned colons/commas at the end of the string
    clean = clean.replace(/[,:\s!?;]+$/, '');

    return clean.trim();
}
