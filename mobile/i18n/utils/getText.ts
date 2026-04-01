import i18n from '../i18n';

/**
 * Reads a multilingual value from a Firebase Remote Config field.
 *
 * RC fields that support multiple languages store their value as a JSON object:
 *   { "en": "Book Now", "hi": "अभी बुक करें", "kn": "ಈಗ ಬುಕ್ ಮಾಡಿ" }
 *
 * If the field is a plain string (not a JSON object), it is returned as-is.
 * Falls back to English if the current language has no translation.
 * Falls back to the raw value string if neither language key exists.
 */
export function getText(rcValue: string | undefined | null): string {
  if (!rcValue) return '';

  // Try to parse as multilingual JSON object
  try {
    const parsed = JSON.parse(rcValue);
    if (parsed && typeof parsed === 'object') {
      const lang = i18n.language || 'en';
      // Try exact language match, then base language (e.g. 'en' from 'en-US'), then English
      return parsed[lang] ?? parsed[lang.split('-')[0]] ?? parsed['en'] ?? rcValue;
    }
  } catch {
    // Not JSON — plain string, return as-is
  }

  return rcValue;
}
