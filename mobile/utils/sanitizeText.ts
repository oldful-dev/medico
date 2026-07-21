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

    // ─── SDUI / WhatsApp Backend Template Parser ───
    const templateMatch = clean.match(/(?:Template:\s*|\[)([A-Z0-9_]+)(?:\]|\b)/i);
    if (templateMatch) {
        const templateKey = templateMatch[1].toUpperCase();
        const knownTemplates = [
            'OTP_USER', 'BOOKING_CONFIRMED', 'PAYMENT_RECEIVED', 'ORDER_CANCELLED', 
            'PRESCRIPTION_RECEIVED', 'LAB_REPORT_READY', 'PLAN_EXPIRY_REMINDER', 'SOS_ALERT_CLIENT',
            'FAMILY_OTP', 'SOS_ALERT_FAMILY', 'PLAN_EXPIRED_FAMILY', 'PLAN_EXPIRY_FAMILY', 
            'HEALTH_CHECK_FAMILY', 'PRESCRIPTION_UPLOADED_FAMILY', 'WELCOME_USER', 'WELLNESS_REMINDER', 
            'BIRTHDAY_WISHES', 'EMP_OTP', 'SHIFT_ASSIGNED', 'SOS_DISPATCH', 'SHIFT_CANCELLED', 'SOS_ALERT_OPS'
        ];
        if (knownTemplates.includes(templateKey)) {
            let params: string[] = [];
            const bracketMatches = clean.match(/\[(.*?)\]/g);
            if (bracketMatches) {
                for (const m of bracketMatches) {
                    const inner = m.slice(1, -1).trim();
                    if (inner === templateKey) continue;
                    const quotedMatches = inner.match(/(?:"([^"]*)"|'([^']*)')/g);
                    if (quotedMatches) {
                        params = quotedMatches.map(q => q.slice(1, -1));
                    } else if (inner.includes(',')) {
                        params = inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
                    } else if (inner.length > 0) {
                        params = [inner.replace(/^["']|["']$/g, '')];
                    }
                    break;
                }
            }

            if (params.length === 0) {
                const quoteMatches = clean.match(/"([^"]*)"|'([^']*)'/g);
                if (quoteMatches) {
                    params = quoteMatches.map(q => q.slice(1, -1)).filter(p => p !== templateKey);
                }
            }

            const getVar = (idx: number) => params[idx] || '';

            switch (templateKey) {
                case 'OTP_USER':
                case 'FAMILY_OTP':
                case 'EMP_OTP':
                    return `Your verification code is ${getVar(0)}.`;
                case 'BOOKING_CONFIRMED':
                    return `Hi ${getVar(0) || 'there'}, your booking ${getVar(1) ? '(' + getVar(1) + ') ' : ''}has been confirmed successfully.`;
                case 'PAYMENT_RECEIVED':
                    return `Hi ${getVar(0) || 'there'}, payment of ₹${getVar(1) || '0'} has been received successfully.`;
                case 'ORDER_CANCELLED':
                    return `Hi ${getVar(0) || 'there'}, your booking ${getVar(1) ? '(' + getVar(1) + ') ' : ''}has been cancelled successfully.`;
                case 'PRESCRIPTION_RECEIVED':
                    return `Hi ${getVar(0) || 'there'}, your prescription has been received and is being processed.`;
                case 'LAB_REPORT_READY':
                    return `Hi ${getVar(0) || 'there'}, your lab report is ready and available in the app.`;
                case 'PLAN_EXPIRY_REMINDER':
                case 'PLAN_EXPIRY_FAMILY':
                    return `Hi ${getVar(0) || 'there'}, your Ayuxa care plan is expiring soon. Please renew to continue uninterrupted services.`;
                case 'SOS_ALERT_CLIENT':
                case 'SOS_ALERT_FAMILY':
                case 'SOS_DISPATCH':
                    return `Emergency SOS Alert: Support is on the way.`;
                case 'WELCOME_USER':
                    return `Welcome to Ayuxa! We are glad to help you and your family.`;
                case 'WELLNESS_REMINDER':
                    return `Hi ${getVar(0) || 'there'}, this is your friendly wellness reminder. Hope you are having a healthy day!`;
                case 'BIRTHDAY_WISHES':
                    return `Happy Birthday from Ayuxa! Use coupon code ${getVar(0) || ''} for a special discount on your next service.`;
                case 'SHIFT_ASSIGNED':
                    return `Hi ${getVar(0) || 'there'}, shift assigned for client ${getVar(1)} on ${getVar(3)} at ${getVar(4)}.`;
                case 'SHIFT_CANCELLED':
                    return `Hi ${getVar(0) || 'there'}, shift for client ${getVar(1)} on ${getVar(3)} has been cancelled.`;
                case 'PLAN_EXPIRED_FAMILY':
                    return `Hi ${getVar(0) || 'there'}, care plan for ${getVar(1)} has expired.`;
                case 'HEALTH_CHECK_FAMILY':
                    return `Weekly health update for ${getVar(0) || 'your family member'} is ready.`;
                case 'PRESCRIPTION_UPLOADED_FAMILY':
                    return `Hi ${getVar(0) || 'there'}, a prescription has been uploaded for your family member.`;
                default:
                    break;
            }
        }
    }

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
