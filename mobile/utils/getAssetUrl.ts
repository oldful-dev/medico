// ─── CDN Asset URL Builder ────────────────────────────────────────────────────
//  All home screen assets are stored in GCS:
//    gs://oldful-assets/mobile/assets/images/<filename>
//  And served via Cloudflare CDN:
//    https://assets.oldful.com/mobile/assets/images/<filename>
//
//  NEVER use local require() assets for SDUI — always use this helper.
// ─────────────────────────────────────────────────────────────────────────────

const CDN_BASE = 'https://assets.oldful.com/mobile/assets/images';

/**
 * Build a Cloudflare CDN URL for a GCS-backed asset.
 *
 * @param fileName  e.g. "85703338762dce300aaacb9a05f302adc3d527f4.png"
 * @returns         Full CDN URL, or empty string if no fileName given
 */
export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';
    // Support filenames that already contain the full URL (fallback safety)
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        return fileName;
    }
    return `${CDN_BASE}/${fileName}`;
}
