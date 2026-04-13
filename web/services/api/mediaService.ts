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
        formData.append('file', file);
        if (folder) {
            formData.append('folder', folder);
        }
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
            formData.append('files', file);
        });
        
        if (folder) {
            formData.append('folder', folder);
        }

        const res = await apiClient.upload<MediaUploadResponse[]>('/upload/batch', formData);
        
        if (res.success && Array.isArray(res.data)) {
            return res.data.map(item => item.url);
        }
        
        throw new Error(res.message || 'Failed to upload multiple files');
    }
};
