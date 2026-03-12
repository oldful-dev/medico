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

export const mediaService = {
    /**
     * POST /api/media/upload
     * Uploads a single file to the media library.
     */
    uploadMedia: async (uri: string, folder: string = 'general'): Promise<ApiResponse<MediaAsset>> => {
        const formData = new FormData();
        
        // Extract filename from URI
        const fileName = uri.split('/').pop() || 'upload.jpg';
        
        // Infer type from extension
        const extension = fileName.split('.').pop()?.toLowerCase();
        let type = 'image/jpeg';
        if (extension === 'png') type = 'image/png';
        if (extension === 'pdf') type = 'application/pdf';
        if (extension === 'webp') type = 'image/webp';

        // @ts-ignore - FormData expects physical file, but React Native fetch handles URI objects
        formData.append('file', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: fileName,
            type: type,
        });

        formData.append('folder', folder);

        return apiClient.upload<MediaAsset>('/media/upload', formData);
    },

    /**
     * Uploads multiple files sequentially.
     */
    uploadMultipleMedia: async (uris: string[], folder: string = 'general'): Promise<string[]> => {
        const urls: string[] = [];
        for (const uri of uris) {
            try {
                const res = await mediaService.uploadMedia(uri, folder);
                if (res.success && res.data) {
                    urls.push(res.data.fileUrl);
                }
            } catch (err) {
                console.error('Failed to upload image:', uri, err);
            }
        }
        return urls;
    }
};
