"use client";
import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { profilesAPI } from '@/lib/api';
import { showToast } from '@/lib/hooks';

export default function GCSUpload({ 
    folder = 'profiles', 
    onUploadSuccess, 
    onUploadError,
    existingUrl = null,
    label = "Profile Photo"
}) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState(existingUrl);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        // Validation: Must be an image
        if (!file.type.startsWith('image/')) {
            showToast("Only image files are allowed", "error");
            return false;
        }
        // Validation: Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            showToast("File size must be less than 5MB", "error");
            return false;
        }
        return true;
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!validateFile(file)) return;

        setUploading(true);
        setProgress(10); // Initial progress

        try {
            // Step 1: Get Signed URL from backend
            const res = await profilesAPI.getUploadUrl({
                fileName: file.name,
                contentType: file.type,
                folder
            });

            if (!res.data.success) throw new Error("Failed to get upload URL");
            const { signedUrl, fileUrl, storagePath, gcsUri } = res.data.data;

            setProgress(30);

            // Step 2: Upload directly to GCS
            // We use standard 'fetch' for the direct GCS PUT to avoid any global axios 
            // interceptors/headers that might break the Signed URL signature.
            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`GCS Upload Failed: ${uploadRes.status} ${errorText}`);
            }

            setProgress(90);

            // Step 3: Confirm upload with backend (registers in media library + makes public)
            // Note: We use the existing media API for confirmation to ensure consistency
            const confirmRes = await axios.post('/api/media/confirm', {
                storagePath,
                fileUrl,
                gcsUri,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                folder
            });

            if (confirmRes.data.success) {
                const finalUrl = confirmRes.data.data.fileUrl;
                setPreview(finalUrl);
                onUploadSuccess(finalUrl);
                showToast("Image uploaded successfully", "success");
            }

        } catch (error) {
            console.error("Upload error:", error);
            showToast("Upload failed. Please try again.", "error");
            onUploadError?.(error);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="gcs-upload-container">
            <label className="upload-label">{label}</label>
            <div className="upload-box" onClick={() => !uploading && fileInputRef.current.click()}>
                {preview ? (
                    <div className="preview-container">
                        <img src={preview} alt="Preview" className="img-preview" />
                        {!uploading && <div className="change-overlay">Change Photo</div>}
                    </div>
                ) : (
                    <div className="placeholder">
                        <Upload size={24} className="icon" />
                        <span>Click to upload photo</span>
                    </div>
                )}

                {uploading && (
                    <div className="uploading-overlay">
                        <Loader2 className="animate-spin" size={24} />
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*"
                style={{ display: 'none' }}
            />

            <style jsx>{`
                .gcs-upload-container { width: 100%; margin-bottom: 20px; }
                .upload-label { display: block; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px; }
                .upload-box { 
                    width: 120px; 
                    height: 120px; 
                    background: #0F172A; 
                    border: 2px dashed #334155; 
                    border-radius: 16px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    cursor: pointer; 
                    position: relative; 
                    overflow: hidden;
                    transition: 0.3s;
                }
                .upload-box:hover { border-color: #10B981; background: #1e293b; }
                
                .preview-container { width: 100%; height: 100%; position: relative; }
                .img-preview { width: 100%; height: 100%; object-fit: cover; }
                .change-overlay { 
                    position: absolute; inset: 0; background: rgba(0,0,0,0.5); 
                    display: flex; align-items: center; justify-content: center; 
                    font-size: 10px; font-weight: 800; color: white; opacity: 0; transition: 0.2s;
                }
                .preview-container:hover .change-overlay { opacity: 1; }

                .placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748B; text-align: center; padding: 10px; }
                .placeholder span { font-size: 10px; font-weight: 700; }
                
                .uploading-overlay { 
                    position: absolute; inset: 0; background: rgba(15, 23, 42, 0.9); 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; 
                }
                .progress-bar { width: 80%; height: 4px; background: #334155; border-radius: 2px; overflow: hidden; }
                .progress-fill { height: 100%; background: #10B981; transition: 0.3s; }
            `}</style>
        </div>
    );
}
