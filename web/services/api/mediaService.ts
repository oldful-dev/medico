import { apiClient, ApiResponse } from './apiClient';

export interface MediaUploadResponse {
    url: string;
    publicId?: string;
    mimeType?: string;
}

export const mediaService = {
    /**
     * Upload a single file to the backend.
     * @param file The file to upload
     * @param folder Optional folder name for categorization
     */
    uploadMedia: async (file: File, folder?: string): Promise<ApiResponse<MediaUploadResponse>> => {
        const formData = new FormData();
        // Backend expects 'file' for single upload
        formData.append('file', file);
        if (folder) {
            formData.append('folder', folder);
        }
        // Using /upload for full pipeline (compression + R2/GCS + potential OCR)
        return apiClient.upload<MediaUploadResponse>('/upload', formData);
    },

    /**
     * Upload multiple files in a single request.
     * @param files Array of files to upload
     * @param folder Optional folder name
     */
    uploadMultipleMedia: async (files: File[], folder?: string): Promise<string[]> => {
        if (!files || files.length === 0) return [];

        const formData = new FormData();
        files.forEach(file => {
            // Backend expects 'files' (plural) for batch upload: router.post('/batch', ..., upload.array('files', 10), ...)
            formData.append('files', file);
        });
        
        if (folder) {
            formData.append('folder', folder);
        }

        console.log('API BATCH UPLOAD ATTEMPT:', { endpoint: '/upload/batch', fileCount: files.length, folder });
        const res = await apiClient.upload<any>('/upload/batch', formData).catch(err => {
            console.error('API BATCH UPLOAD FETCH ERROR:', err);
            throw err;
        });
        
        console.log('API BATCH UPLOAD RESPONSE:', res);
        
        // Backend returns: { success: true, data: { uploaded: [ { cdnUrl: '...', ... }, ... ], ... } }
        if (res.success && res.data?.uploaded && Array.isArray(res.data.uploaded)) {
            return res.data.uploaded.map((item: any) => {
                const url = item.cdnUrl || item.url || item.gcsUrl;
                if (!url) console.warn('Item in upload response missing URL:', item);
                return url;
            }).filter(Boolean);
        }
        
        throw new Error(res.message || 'Failed to upload multiple files - check console for details');
    }
};
