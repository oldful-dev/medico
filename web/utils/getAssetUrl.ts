const CDN_BASE = 'https://assets.ayuxacare.com/';
const GCS_BASE_URL = 'https://storage.googleapis.com/ayuxa-assets';
const ASSETS_PATH = 'mobile/assets/images';

export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';

    // If it's already a full URL
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        // Transform direct GCS links to CDN links for consistency/performance
        if (fileName.startsWith(GCS_BASE_URL)) {
            return fileName.replace(GCS_BASE_URL, CDN_BASE);
        }
        return fileName;
    }
    
    // Clean potential leading slash
    const cleanPath = fileName.startsWith('/') ? fileName.substring(1) : fileName;
    
    // If the fileName already contains a path (a slash), assume it's a full path relative to bucket root
    // Otherwise, assume it's one of the legacy mobile images
    if (cleanPath.includes('/')) {
        return `${CDN_BASE}/${cleanPath}`;
    }
    
    return `${CDN_BASE}/${ASSETS_PATH}/${cleanPath}`;
}
