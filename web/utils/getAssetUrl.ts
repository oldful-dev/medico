const GCS_BASE = 'https://storage.googleapis.com/oldful-assets/mobile/assets/images';

export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        return fileName;
    }
    // Clean potential leading slash
    const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
    return `${GCS_BASE}/${cleanFileName}`;
}
