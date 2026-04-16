"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, Copy, Image, FileText, Film, Info } from "lucide-react";
import { mediaAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

export default function MediaPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => { loadAssets(); }, [filter]);

    async function loadAssets() {
        try { setLoading(true); const params = filter ? { folder: filter } : {}; const r = await mediaAPI.getAll(params); setAssets(r.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', filter || 'general');
        try { setUploading(true); await mediaAPI.upload(formData); showToast('File uploaded'); loadAssets(); }
        catch (er) { showToast(er.response?.data?.message || 'Upload failed', 'error'); }
        finally { setUploading(false); e.target.value = ''; }
    }

    async function deleteAsset(id) {
        if (!confirm('Delete this file?')) return;
        try { await mediaAPI.delete(id); showToast('Deleted'); loadAssets(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    function copyUrl(url) { navigator.clipboard.writeText(url); showToast('URL copied'); }
    function formatSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; }

    const typeIcon = (type) => { if (type?.includes('image')) return <Image size={16} />; if (type?.includes('video')) return <Film size={16} />; return <FileText size={16} />; };

    return (
        <div>
            <div className="page-header"><h2>Content & Media Library</h2><p>Upload and manage media assets</p></div>
            <div className="filter-bar">
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" hidden onChange={handleUpload} disabled={uploading} />
                </label>
                <select className="form-select" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="">All Folders</option>
                    <option value="general">General</option><option value="services">Services</option><option value="banners">Banners</option><option value="products">Products</option>
                </select>
            </div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead><tr><th>Type</th><th>File Name</th><th>Folder</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            assets.length === 0 ? <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No media files</td></tr> :
                                assets.map(a => (
                                    <tr key={a.id}>
                                        <td>{typeIcon(a.fileType)}</td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{a.fileName}</td>
                                        <td className="text-sm"><span className="badge badge-default">{a.folder}</span></td>
                                        <td className="text-sm">{formatSize(a.fileSize)}</td>
                                        <td className="text-sm">{formatDateTime(a.createdAt)}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                {a.fileType?.includes('image') && (
                                                    <button className="btn btn-sm btn-info" onClick={() => setPreviewImage(a.fileUrl)} title="Preview"><Info size={14} /></button>
                                                )}
                                                <button className="btn btn-sm btn-secondary" onClick={() => copyUrl(a.fileUrl)} title="Copy URL"><Copy size={14} /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => deleteAsset(a.id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {previewImage && (
                <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: 'auto', padding: 12 }}>
                        <div className="modal-header" style={{ marginBottom: 12 }}>
                            <h3>Image Preview</h3>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPreviewImage(null)}>✕</button>
                        </div>
                        <div style={{ maxHeight: '75vh', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
                        </div>
                        <div className="modal-footer" style={{ marginTop: 12 }}>
                            <button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(previewImage); showToast('URL copied'); }}>Copy URL</button>
                            <button className="btn btn-primary" onClick={() => setPreviewImage(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
