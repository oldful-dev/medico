const CDN_BASE = 'https://assets.oldful.com/mobile/assets/images';

export function getAssetUrl(fileName: string): string {
    if (!fileName) return '';
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        return fileName;
    }
    return `${CDN_BASE}/${fileName}`;
}
