"use client";
import { useState, useEffect } from "react";
import { FileText, Edit2, Eye, Upload } from "lucide-react";
import { legalAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

export default function LegalPage() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ type: 'TERMS_AND_CONDITIONS', title: '', content: '', status: 'DRAFT' });

    useEffect(() => { loadDocs(); }, []);

    async function loadDocs() { try { setLoading(true); const r = await legalAPI.getAll(); setDocs(r.data?.data || []); } catch (e) { } finally { setLoading(false); } }

    function openDoc(doc) { setEditing(doc); setForm({ type: doc.type, title: doc.title, content: doc.content, status: doc.status }); }
    function openNew() { setEditing({}); setForm({ type: 'TERMS_AND_CONDITIONS', title: '', content: '', status: 'DRAFT' }); }

    async function handleSave() {
        try {
            if (editing.id) { await legalAPI.update(editing.id, form); showToast('Document updated'); }
            else { await legalAPI.create(form); showToast('Document created'); }
            setEditing(null); loadDocs();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function publishDoc(id) {
        try { await legalAPI.publish(id); showToast('Published'); loadDocs(); }
        catch (e) { showToast('Publish failed', 'error'); }
    }

    const typeLabels = { TERMS_AND_CONDITIONS: 'Terms & Conditions', PRIVACY_POLICY: 'Privacy Policy', REFUND_POLICY: 'Refund Policy', DISCLAIMER: 'Disclaimer' };

    if (editing) {
        return (
            <div>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><h2>{editing.id ? 'Edit' : 'New'} Legal Document</h2><p>{typeLabels[form.type] || form.type}</p></div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => setEditing(null)}>← Back</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Draft</button>
                        {editing.id && form.status !== 'PUBLISHED' && <button className="btn btn-success" onClick={() => publishDoc(editing.id)}><Upload size={14} /> Publish</button>}
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                        </div>
                        <div className="form-group"><label className="form-label">Content (HTML/Markdown)</label><textarea className="form-input" rows={20} style={{ fontFamily: "monospace", fontSize: 13 }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header"><h2>Legal CMS</h2><p>Manage terms, privacy policy, refund policy, and disclaimers</p></div>
            <div className="filter-bar"><button className="btn btn-primary" onClick={openNew}><FileText size={16} /> New Document</button></div>
            {loading ? <p className="text-muted">Loading...</p> : (
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {docs.map(doc => (
                        <div key={doc.id} className="card">
                            <div className="card-header"><h3 style={{ fontSize: 14 }}>{doc.title}</h3><span className={`badge ${doc.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>{doc.status}</span></div>
                            <div className="card-body">
                                <div className="text-sm text-muted mb-2">{typeLabels[doc.type] || doc.type}</div>
                                <div className="text-sm text-muted mb-4">Version {doc.version} • Updated {formatDateTime(doc.updatedAt)}</div>
                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-primary" onClick={() => openDoc(doc)}><Edit2 size={14} /> Edit</button>
                                    {doc.status !== 'PUBLISHED' && <button className="btn btn-sm btn-success" onClick={() => publishDoc(doc.id)}>Publish</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {docs.length === 0 && <p className="text-muted">No legal documents yet</p>}
                </div>
            )}
        </div>
    );
}
