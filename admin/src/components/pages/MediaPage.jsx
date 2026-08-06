"use client";
import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, Copy, Image, FileText, Film, Info, X, Users, Settings, Search, ExternalLink } from "lucide-react";
import { mediaAPI, userAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function MediaPage() {
    const [activeTab, setActiveTab] = useState("system"); // system | client
    const [assets, setAssets] = useState([]);
    const [clientReports, setClientReports] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters for System Assets
    const [folderFilter, setFolderFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [searchFilter, setSearchFilter] = useState('');

    // Filters for Client Data
    const [clientSearch, setClientSearch] = useState('');
    const [clientCategory, setClientCategory] = useState('');

    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const loadSystemAssets = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (folderFilter) params.folder = folderFilter;
            if (typeFilter) params.fileType = typeFilter;
            if (searchFilter) params.search = searchFilter;
            const r = await mediaAPI.getAll(params);
            setAssets(r.data?.data || r.data?.pagination?.data || []);
        } catch (e) {
            console.error('Failed to load media:', e);
            showToast('Failed to load media assets', 'error');
        } finally {
            setLoading(false);
        }
    }, [folderFilter, typeFilter, searchFilter]);

    const loadClientReports = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (clientSearch) params.search = clientSearch;
            if (clientCategory) params.category = clientCategory;
            const r = await userAPI.getAllHealthReports(params);
            setClientReports(r.data?.data || []);
        } catch (e) {
            console.error('Failed to load client reports:', e);
            showToast('Failed to load client documents', 'error');
        } finally {
            setLoading(false);
        }
    }, [clientSearch, clientCategory]);

    useEffect(() => {
        if (activeTab === "system") {
            loadSystemAssets();
        } else {
            loadClientReports();
        }
    }, [activeTab, loadSystemAssets, loadClientReports]);

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folderFilter || 'general');
        try {
            setUploading(true);
            await mediaAPI.upload(formData);
            showToast('File uploaded successfully');
            loadSystemAssets();
        } catch (er) {
            showToast(er.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }

    async function deleteAsset(id) {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try { 
            await mediaAPI.delete(id); 
            showToast('Asset deleted successfully'); 
            loadSystemAssets(); 
        } catch (e) { 
            showToast('Failed to delete asset', 'error'); 
        }
    }

    async function deleteClientReport(id) {
        if (!confirm('Are you sure you want to permanently delete this client medical report?')) return;
        try { 
            await userAPI.deleteHealthReport(id); 
            showToast('Client report deleted successfully'); 
            loadClientReports(); 
        } catch (e) { 
            showToast('Failed to delete client report', 'error'); 
        }
    }

    function copyUrl(url) { 
        navigator.clipboard.writeText(url); 
        showToast('URL copied to clipboard'); 
    }

    const getFileIcon = (type) => { 
        if (type?.includes('image')) return <Image size={24} className="text-indigo-400" />; 
        if (type?.includes('video')) return <Film size={24} className="text-emerald-400" />; 
        return <FileText size={24} className="text-amber-400" />; 
    };

    return (
        <div>
            <div className="page-header">
                <h2>Content & Media Library</h2>
                <p>Manage system marketing assets and view client medical uploads securely hosted on Google Cloud Storage</p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <button
                    className={`btn ${activeTab === "system" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveTab("system")}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <Settings size={16} /> System Assets
                </button>
                <button
                    className={`btn ${activeTab === "client" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveTab("client")}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <Users size={16} /> Client Medical Data
                </button>
            </div>

            {activeTab === "system" ? (
                /* ─── SYSTEM ASSETS VIEW ─── */
                <>
                    <div className="filter-bar" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                            <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Asset'}
                            <input type="file" hidden onChange={handleUpload} disabled={uploading} />
                        </label>
                        <select className="form-select" style={{ minWidth: 160 }} value={folderFilter} onChange={e => setFolderFilter(e.target.value)}>
                            <option value="">All Folders</option>
                            <option value="general">General</option>
                            <option value="services">Services</option>
                            <option value="banners">Banners</option>
                            <option value="products">Products</option>
                        </select>
                        <select className="form-select" style={{ minWidth: 140 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="">All Types</option>
                            <option value="image">Images</option>
                            <option value="video">Videos</option>
                            <option value="application">Documents</option>
                        </select>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: 32 }}
                                placeholder="Search file name..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                            />
                        </div>
                        {(folderFilter || typeFilter || searchFilter) && (
                            <button className="btn btn-sm btn-secondary" onClick={() => { setFolderFilter(''); setTypeFilter(''); setSearchFilter(''); }}>
                                <X size={14} /> Clear
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: 48, background: "var(--bg-secondary)", borderRadius: 12, color: "var(--text-muted)" }}>Loading system assets...</div>
                    ) : assets.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 48, background: "var(--bg-secondary)", borderRadius: 12, color: "var(--text-muted)" }}>No assets found in GCS</div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                            {assets.map(a => (
                                <div key={a.id} className="card" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ height: 140, background: "rgba(0,0,0,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                                        {a.fileType?.includes('image') ? (
                                            <img src={a.fileUrl} alt={a.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            getFileIcon(a.fileType)
                                        )}
                                        <span className="badge badge-default" style={{ position: "absolute", top: 8, right: 8, fontSize: 10 }}>{a.folder}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.fileName}>
                                            {a.fileName}
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                                            <span>{formatSize(a.fileSize)}</span>
                                            <span>{formatDateTime(a.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                                        {a.fileType?.includes('image') && (
                                            <button className="btn btn-sm btn-secondary" style={{ padding: 6 }} onClick={() => setPreviewImage(a.fileUrl)} title="Preview"><Info size={14} /></button>
                                        )}
                                        <button className="btn btn-sm btn-secondary" style={{ padding: 6, flex: 1 }} onClick={() => copyUrl(a.fileUrl)}>Copy URL</button>
                                        <button className="btn btn-sm btn-danger" style={{ padding: 6 }} onClick={() => deleteAsset(a.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* ─── CLIENT MEDICAL DATA VIEW ─── */
                <>
                    <div className="filter-bar" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: 32 }}
                                placeholder="Search client name, ID, phone..."
                                value={clientSearch}
                                onChange={e => { setClientSearch(e.target.value); }}
                            />
                        </div>
                        <select className="form-select" style={{ minWidth: 160 }} value={clientCategory} onChange={e => setClientCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            <option value="Prescription">Prescription</option>
                            <option value="Lab Report">Lab Report</option>
                            <option value="Vaccination">Vaccination</option>
                            <option value="Other">Other</option>
                        </select>
                        {(clientSearch || clientCategory) && (
                            <button className="btn btn-sm btn-secondary" onClick={() => { setClientSearch(''); setClientCategory(''); }}>
                                <X size={14} /> Clear
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: 48, background: "var(--bg-secondary)", borderRadius: 12, color: "var(--text-muted)" }}>Loading client documents...</div>
                    ) : clientReports.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 48, background: "var(--bg-secondary)", borderRadius: 12, color: "var(--text-muted)" }}>No client reports found in GCS</div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                            {clientReports.map(report => (
                                <div key={report.id} className="card" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateTime(report.createdAt)}</div>
                                            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={report.title}>
                                                {report.title}
                                            </div>
                                        </div>
                                        <span className="badge badge-info" style={{ fontSize: 10 }}>{report.category || 'Other'}</span>
                                    </div>

                                    {/* Client details card block */}
                                    <div style={{ background: "rgba(0,0,0,0.12)", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{report.user?.name || "Deleted User"}</div>
                                        <div style={{ color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
                                            <span>Ref ID: <code style={{ color: "var(--accent-primary-light)" }}>{report.user?.uniqueUserId || "—"}</code></span>
                                            <span>{report.user?.phone || "—"}</span>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span className="text-muted">Uploaded By:</span>
                                            <span style={{ fontWeight: 500 }}>{report.uploadedBy === report.userId ? 'Client' : 'Staff / Admin'}</span>
                                        </div>
                                        {report.ocrStatus && (
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span className="text-muted">OCR Status:</span>
                                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                    <span className={`badge ${report.ocrStatus === 'completed' ? 'badge-success' : report.ocrStatus === 'processing' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                                                        {report.ocrStatus}
                                                    </span>
                                                    {report.flagSeverity && (
                                                        <span className="badge badge-danger" style={{ fontSize: 9 }}>{report.flagSeverity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", gap: 6, marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                                        <a href={report.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ flex: 1, padding: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                            <ExternalLink size={12} /> View File
                                        </a>
                                        <button className="btn btn-sm btn-secondary" style={{ padding: 6 }} onClick={() => copyUrl(report.fileUrl)}>Copy</button>
                                        <button className="btn btn-sm btn-danger" style={{ padding: 6 }} onClick={() => deleteClientReport(report.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

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
                            <button className="btn className=btn-primary" onClick={() => setPreviewImage(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
