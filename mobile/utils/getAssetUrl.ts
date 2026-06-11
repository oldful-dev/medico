// ─── CDN Asset URL Builder ────────────────────────────────────────────────────
//  All assets are stored in GCS bucket: gs://ayuxa-assets/
//  And served via Cloudflare CDN: https://assets.ayuxacare.com/
//
//  This matches the website pattern (web/utils/getAssetUrl.ts).
//  Cloudflare Worker routes requests through CDN with 1-year caching.
//
//  NEVER use local require() assets for SDUI — always use this helper.
// ─────────────────────────────────────────────────────────────────────────────

const CDN_BASE = 'https://assets.ayuxacare.com/';
const GCS_BASE_URL = 'https://storage.googleapis.com/ayuxa-assets/';

/**
 * Build a Cloudflare CDN URL for any asset.
 * Transforms GCS URLs to CDN for faster delivery and caching.
 *
 * @param fileName - File hash, path, or full GCS/CDN URL
 * @returns Full CDN URL, or empty string if no fileName given
 *
 * @example
 * getAssetUrl('85703338762dce300aaacb9a05f302adc3d527f4.png')
 * // → 'https://assets.ayuxacare.com/85703338762dce300aaacb9a05f302adc3d527f4.png'
 *
 * getAssetUrl('mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png')
 * // → 'https://assets.ayuxacare.com/mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png'
 *
 * getAssetUrl('https://storage.googleapis.com/ayuxa-assets/folder/file.png')
 * // → 'https://assets.ayuxacare.com/folder/file.png'
 */
export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';

    const prefix = 'mobile/assets/images/';

    // If it's already a full URL
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        // Transform direct GCS links to CDN links for consistency and performance
        if (fileName.startsWith(GCS_BASE_URL)) {
            let path = fileName.substring(GCS_BASE_URL.length);
            if (path.startsWith(prefix)) {
                path = path.substring(prefix.length);
            }
            return `${CDN_BASE}${path}`;
        }
        
        // Handle CDN URLs that were saved with the prefix (double-prefix safety)
        const doublePrefixCdn = `${CDN_BASE}${prefix}`;
        if (fileName.startsWith(doublePrefixCdn)) {
            return `${CDN_BASE}${fileName.substring(doublePrefixCdn.length)}`;
        }
        
        return fileName;
    }

    // Clean potential leading slash
    let cleanPath = fileName.startsWith('/') ? fileName.substring(1) : fileName;

    // Direct file hash or path — use CDN
    if (cleanPath.startsWith(prefix)) {
        cleanPath = cleanPath.substring(prefix.length);
    }
    return `${CDN_BASE}${cleanPath}`;
}
