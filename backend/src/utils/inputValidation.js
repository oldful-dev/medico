'use strict';

/**
 * Shared server-side input validators. The mobile app validates the same
 * rules client-side; these make sure other clients (or a modified app) cannot
 * store junk such as "66#" as a name or "1" as an emergency number.
 */

/** Returns the 10-digit Indian mobile number, or null when it is not valid. */
const normalizeIndianMobile = (value) => {
    let digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

/** Person name: letters (any script), spaces, . ' - ; 3 to 60 characters. */
const isValidPersonName = (value) => {
    const n = String(value ?? '').trim();
    return n.length >= 3 && n.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(n);
};

/** Free-text medical field: optional, but never numeric-only. */
const isValidMedicalText = (value) => {
    const t = String(value ?? '').trim();
    return t.length === 0 || (/\p{L}/u.test(t) && !/^[\d\s,.\-]+$/.test(t));
};

module.exports = { normalizeIndianMobile, isValidPersonName, isValidMedicalText };
