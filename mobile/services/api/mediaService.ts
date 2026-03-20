// ──────────────────────────────────────────────
//  Media Service
//  Preferred flow: Signed URL (file bytes go direct to GCS, not through Node.js)
//  Fallback flow:  Proxy upload via /api/media/upload
// ──────────────────────────────────────────────

import { Platform } from 'react-native';
import { apiClient, ApiResponse } from './apiClient';

export interface MediaAsset {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    folder: string;
    uploadedBy?: string;
}

interface SignedUrlResponse {
    signedUrl: string;
    storagePath: string;
    fileUrl: string;
    gcsUri: string;
    expiresIn: number;
}

// ─── MIME type detection ─────────────────────────────────
const MIME_MAP: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
};

const getMimeType = (uri: string): string => {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    return MIME_MAP[ext] ?? 'image/jpeg';
};

const getFileName = (uri: string): string => uri.split('/').pop() ?? 'upload.jpg';

// ─── PUT file to GCS via XMLHttpRequest ─────────────────
// React Native's fetch() has issues with blob uploads to GCS signed URLs.
// XMLHttpRequest with a FormData-style URI object is the reliable RN approach.
const putFileToGCS = (
    signedUrl: string,
    fileUri: string,
    contentType: string,
    timeoutMs: number = 60000,
): Promise<{ ok: boolean; status: number }> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.timeout = timeoutMs;

        xhr.onload = () => {
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
        };
        xhr.onerror = () => reject(new Error('Network error during GCS upload'));
        xhr.ontimeout = () => reject(new Error('GCS upload timed out'));

        // On React Native, we can read a local file URI into a blob
        // and send it. The fetch→blob approach works here because
        // we're converting to blob first, then sending via XHR.
        fetch(fileUri)
            .then((res) => res.blob())
            .then((blob) => {
                xhr.send(blob);
            })
            .catch((err) => {
                // Blob approach failed — try sending URI string directly
                // (some RN versions support this)
                console.warn('Blob read failed, trying direct send:', err.message);
                try {
                    // @ts-ignore — RN XHR can sometimes handle URI strings
                    xhr.send({ uri: fileUri, type: contentType, name: 'upload' });
                } catch {
                    reject(err);
                }
            });
    });
};

// ─── Signed URL Upload ───────────────────────────────────
const uploadViaSignedUrl = async (
    uri: string,
    folder: string = 'general',
): Promise<ApiResponse<MediaAsset>> => {
    const fileName = getFileName(uri);
    const contentType = getMimeType(uri);

    // Step 1: Get signed URL from backend
    const signedResponse = await apiClient.post<SignedUrlResponse>('/media/signed-url', {
        folder,
        fileName,
        contentType,
    });

    if (!signedResponse.success || !signedResponse.data) {
        return { success: false, message: signedResponse.message || 'Failed to get signed URL' };
    }

    const { signedUrl, storagePath, fileUrl, gcsUri } = signedResponse.data;

    // Step 2: PUT file bytes directly to GCS
    const fileUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

    const putResult = await putFileToGCS(signedUrl, fileUri, contentType);

    if (!putResult.ok) {
        return { success: false, message: `GCS upload failed: ${putResult.status}` };
    }

    // Step 3: Confirm in backend DB
    const confirmResponse = await apiClient.post<MediaAsset>('/media/confirm', {
        storagePath,
        fileUrl,
        gcsUri,
        fileName,
        fileType: contentType,
        folder,
    });

    return confirmResponse;
};

// ─── Proxy Upload (fallback) ─────────────────────────────
const uploadViaProxy = async (
    uri: string,
    folder: string = 'general',
): Promise<ApiResponse<MediaAsset>> => {
    const fileName = getFileName(uri);
    const contentType = getMimeType(uri);

    const formData = new FormData();
    // @ts-ignore — React Native FormData handles URI objects
    formData.append('file', { uri, name: fileName, type: contentType });
    formData.append('folder', folder);

    return apiClient.upload<MediaAsset>('/media/upload', formData);
};

// ─── Public Service ──────────────────────────────────────
export const mediaService = {
    /**
     * Upload a single file.
     * Tries signed URL first (bypasses Node.js), falls back to proxy.
     */
    uploadMedia: async (uri: string, folder: string = 'general'): Promise<ApiResponse<MediaAsset>> => {
        try {
            const result = await uploadViaSignedUrl(uri, folder);
            // If signed URL got a 400/403, fall through to proxy
            if (!result.success && result.message?.includes('GCS upload failed')) {
                console.warn('Signed URL PUT failed, trying proxy:', result.message);
                return uploadViaProxy(uri, folder);
            }
            return result;
        } catch (err: any) {
            console.warn('Signed URL flow error, falling back to proxy:', err.message);
            return uploadViaProxy(uri, folder);
        }
    },

    /**
     * Upload multiple files in parallel.
     * Returns array of successfully uploaded URLs.
     */
    uploadMultipleMedia: async (uris: string[], folder: string = 'general'): Promise<string[]> => {
        const results = await Promise.allSettled(
            uris.map((uri) => mediaService.uploadMedia(uri, folder))
        );

        const urls: string[] = [];
        results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value.success && result.value.data) {
                urls.push(result.value.data.fileUrl);
            } else {
                console.warn(`Upload failed for URI index ${i}:`,
                    result.status === 'rejected' ? result.reason : result.value.message
                );
            }
        });

        return urls;
    },

    /**
     * Health report upload — always goes to 'health-reports' folder.
     */
    uploadHealthReport: async (uri: string): Promise<ApiResponse<MediaAsset>> => {
        return mediaService.uploadMedia(uri, 'health-reports');
    },
};
