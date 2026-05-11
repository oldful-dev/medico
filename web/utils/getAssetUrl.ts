const CDN_BASE = 'https://assets.ayuxacare.com/';
const GCS_BASE_URL = 'https://storage.googleapis.com/ayuxa-assets/';

export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';

    // If it's already a full URL
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        // Transform direct GCS links to CDN links for consistency/performance
        if (fileName.startsWith(GCS_BASE_URL)) {
            const path = fileName.substring(GCS_BASE_URL.length);
            return `${CDN_BASE}${path}`;
        }
        return fileName;
    }

    // Clean potential leading slash
    const cleanPath = fileName.startsWith('/') ? fileName.substring(1) : fileName;

    // Direct file hash (no slashes) — use as is on CDN
    return `${CDN_BASE}${cleanPath}`;
}
