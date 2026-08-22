"use client";
import { useState, useEffect } from "react";
import { FileText, Edit2, Eye, Upload, Plus, Trash2, Globe, Clock, ChevronLeft, AlertCircle, Check, ScrollText, ShieldCheck, Banknote, AlertTriangle, Landmark, Cookie, Archive } from "lucide-react";
import { legalAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

const DOC_TYPES = {
    TERMS_AND_CONDITIONS: 'Terms & Conditions',
    PRIVACY_POLICY: 'Privacy Policy',
    REFUND_POLICY: 'Refund Policy',
    DISCLAIMER: 'Disclaimer',
    STATUTORY_DISCLOSURES: 'Statutory Disclosures',
    COOKIE_POLICY: 'Cookie Policy',
};

const DOC_ICONS = {
    TERMS_AND_CONDITIONS: ScrollText,
    PRIVACY_POLICY: ShieldCheck,
    REFUND_POLICY: Banknote,
    DISCLAIMER: AlertTriangle,
    STATUTORY_DISCLOSURES: Landmark,
    COOKIE_POLICY: Cookie,
};

const STATUS_BADGE = {
    PUBLISHED: 'badge-success',
    DRAFT: 'badge-warning',
    ARCHIVED: 'badge-default',
};

export default function LegalPage() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'edit' | 'preview'
    const [editing, setEditing] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [form, setForm] = useState({ type: 'TERMS_AND_CONDITIONS', title: '', content: '' });
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [customTypeKey, setCustomTypeKey] = useState('');
    const [customTypeLabel, setCustomTypeLabel] = useState('');

    useEffect(() => { loadDocs(); }, []);

    async function loadDocs() {
        try {
            setLoading(true);
            const r = await legalAPI.getAll();
            setDocs(r.data?.data || []);
        } catch (e) {
            showToast('Failed to load documents', 'error');
        } finally {
            setLoading(false);
        }
    }

    function openEdit(doc = null, prefillType = null) {
        if (doc) {
            setEditing(doc);
            setForm({ type: doc.type, title: doc.title, content: doc.content || '' });
        } else {
            setEditing({});
            setForm({ type: prefillType || 'TERMS_AND_CONDITIONS', title: '', content: '' });
        }
        setView('edit');
    }

    function openPreview(doc) {
        setPreviewDoc(doc);
        setView('preview');
    }

    function prepareForm() {
        let submissionForm = { ...form };
        if (form.type === 'CUSTOM') {
            if (!customTypeLabel.trim()) {
                showToast('Custom Page Title is required', 'error');
                return null;
            }
            if (!customTypeKey.trim()) {
                showToast('Custom Page Key is required', 'error');
                return null;
            }
            const cleanKey = customTypeKey.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');
            if (!cleanKey) {
                showToast('Invalid Custom Page Key', 'error');
                return null;
            }
            submissionForm.type = cleanKey;
            submissionForm.title = customTypeLabel.trim();
        } else {
            if (!form.title.trim()) {
                showToast('Title is required', 'error');
                return null;
            }
            submissionForm.title = form.title.trim();
        }
        return submissionForm;
    }

    async function handleSave() {
        const submissionForm = prepareForm();
        if (!submissionForm) return;
        setSaving(true);
        try {
            let saved;
            if (editing?.id) {
                const r = await legalAPI.update(editing.id, submissionForm);
                saved = r.data?.data;
                showToast('Document saved');
            } else {
                const r = await legalAPI.create(submissionForm);
                saved = r.data?.data;
                showToast('Document created');
            }
            setView('list');
            loadDocs();
        } catch (e) {
            showToast(e.response?.data?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveAndPublish() {
        const submissionForm = prepareForm();
        if (!submissionForm) return;
        setSaving(true);
        try {
            let docId = editing?.id;
            if (docId) {
                await legalAPI.update(docId, submissionForm);
            } else {
                const r = await legalAPI.create(submissionForm);
                docId = r.data?.data?.id;
            }
            await legalAPI.publish(docId);
            showToast('Saved & published — live on website', 'success');
            setView('list');
            loadDocs();
        } catch (e) {
            showToast(e.response?.data?.message || 'Save & publish failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handlePublish(id) {
        setPublishing(id);
        try {
            await legalAPI.publish(id);
            showToast('Published — live on website now', 'success');
            if (view === 'edit') setView('list');
            loadDocs();
        } catch (e) {
            showToast(e.response?.data?.message || 'Publish failed', 'error');
        } finally {
            setPublishing(false);
        }
    }

    async function handleDelete(id, title) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await legalAPI.delete(id);
            showToast('Document deleted');
            loadDocs();
        } catch (e) {
            showToast(e.response?.data?.message || 'Delete failed', 'error');
        }
    }

    async function handleArchive(id, title) {
        if (!confirm(`Archive "${title}"? It will be pulled from the live website/app immediately.`)) return;
        try {
            await legalAPI.archive(id);
            showToast('Document archived', 'success');
            loadDocs();
        } catch (e) {
            showToast(e.response?.data?.message || 'Archive failed', 'error');
        }
    }

    const allDocTypes = { ...DOC_TYPES };
    docs.forEach(d => {
        if (!allDocTypes[d.type]) {
            allDocTypes[d.type] = d.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
    });

    // Group docs by type, latest version first
    const grouped = Object.keys(allDocTypes).reduce((acc, type) => {
        acc[type] = docs.filter(d => d.type === type).sort((a, b) => b.version - a.version);
        return acc;
    }, {});

    // ── PREVIEW ─────────────────────────────────────
    if (view === 'preview' && previewDoc) {
        return (
            <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>{previewDoc.title}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Preview — {allDocTypes[previewDoc.type] || previewDoc.type} · v{previewDoc.version}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => setView('list')}><ChevronLeft size={16} /> Back</button>
                        <button className="btn btn-primary" onClick={() => openEdit(previewDoc)}><Edit2 size={14} /> Edit</button>
                        {previewDoc.status === 'DRAFT' && (
                            <button className="btn btn-success" onClick={() => handlePublish(previewDoc.id)} disabled={!!publishing}>
                                <Globe size={14} /> Publish
                            </button>
                        )}
                        {previewDoc.status === 'PUBLISHED' && (
                            <button className="btn btn-warning" onClick={() => handleArchive(previewDoc.id, previewDoc.title)}>
                                <Archive size={14} /> Archive
                            </button>
                        )}
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div
                            style={{ lineHeight: 1.8, color: 'var(--text-primary)' }}
                            className="legal-preview"
                            dangerouslySetInnerHTML={{ __html: previewDoc.content || '<p style="color: var(--text-secondary)">No content yet.</p>' }}
                        />
                    </div>
                </div>
                <style>{`
                    .legal-preview h1,.legal-preview h2,.legal-preview h3 { font-weight:700; margin:1.5rem 0 0.75rem; }
                    .legal-preview h1 { font-size:1.8rem; }
                    .legal-preview h2 { font-size:1.4rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; }
                    .legal-preview h3 { font-size:1.1rem; }
                    .legal-preview p { margin-bottom:1rem; color:var(--text-secondary); }
                    .legal-preview ul,.legal-preview ol { padding-left:1.5rem; margin-bottom:1rem; }
                    .legal-preview ul { list-style:disc; }
                    .legal-preview ol { list-style:decimal; }
                    .legal-preview li { margin-bottom:0.4rem; color:var(--text-secondary); }
                    .legal-preview strong { color:var(--text-primary); }
                    .legal-preview a { color:var(--primary); }
                `}</style>
            </div>
        );
    }

    // ── EDITOR ──────────────────────────────────────
    if (view === 'edit') {
        const isNew = !editing?.id;
        const isPublished = editing?.status === 'PUBLISHED';
        return (
            <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>{isNew ? 'New Legal Document' : 'Edit Document'}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {isNew ? 'Create a draft — publish when ready to go live' : `v${editing?.version || 1} · ${allDocTypes[form.type] || form.type}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => setView('list')}><ChevronLeft size={16} /> Back</button>
                        {!isNew && (
                            <button className="btn btn-secondary" onClick={() => openPreview({ ...editing, ...form })}>
                                <Eye size={14} /> Preview
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Draft'}
                        </button>
                        <button className="btn btn-success" onClick={handleSaveAndPublish} disabled={saving}>
                            <Globe size={14} /> {saving ? 'Publishing…' : isPublished ? 'Save & Re-publish' : 'Save & Publish'}
                        </button>
                    </div>
                </div>

                {isPublished && (
                    <div className="card" style={{ marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                            <Globe size={16} style={{ color: '#22c55e' }} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                This document is <strong style={{ color: '#22c55e' }}>PUBLISHED</strong> and live on the website.
                                Use <strong>Save & Re-publish</strong> to push your edits live immediately.
                            </span>
                        </div>
                    </div>
                )}

                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-body">
                        <div className="form-row" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            {form.type !== 'CUSTOM' ? (
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Title *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Terms and Conditions"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div style={{ flex: 2, display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Custom Page Title *</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Cookie Policy"
                                            value={customTypeLabel}
                                            onChange={e => setCustomTypeLabel(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Custom Page Key *</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. COOKIE_POLICY"
                                            value={customTypeKey}
                                            onChange={e => setCustomTypeKey(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Document Type</label>
                                <select
                                    className="form-select"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    disabled={!isNew}
                                >
                                    {Object.entries(allDocTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    {isNew && <option value="CUSTOM">+ New Custom Document Page</option>}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Content</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>HTML supported — use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;</span>
                    </div>
                    <div className="card-body">
                        <textarea
                            className="form-input"
                            rows={30}
                            style={{ fontFamily: 'monospace', fontSize: 13, resize: 'vertical', lineHeight: 1.6 }}
                            placeholder={`<h2>Section Title</h2>\n<p>Your content here...</p>\n<ul>\n  <li>Point one</li>\n  <li>Point two</li>\n</ul>`}
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── LIST ─────────────────────────────────────────
    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Legal CMS</h2>
                    <p>Manage legal documents — publish to update the website instantly</p>
                </div>
                <button className="btn btn-primary" onClick={() => openEdit()}>
                    <Plus size={16} /> New Document
                </button>
            </div>

            <div className="card" style={{ marginBottom: 24, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px' }}>
                    <AlertCircle size={16} style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> Write or edit a document → <strong>Save & Publish</strong> to push live immediately, or Save as Draft first and publish later. Only the latest PUBLISHED version of each type is shown to users.
                    </p>
                </div>
            </div>

            {loading ? <p className="text-muted">Loading…</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {Object.entries(allDocTypes).map(([type, label]) => {
                        const versions = grouped[type] || [];
                        const published = versions.find(d => d.status === 'PUBLISHED');
                        const DocIcon = DOC_ICONS[type] || FileText;

                        return (
                            <div key={type} className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <DocIcon size={16} style={{ color: 'var(--primary)' }} />
                                        <h3 style={{ margin: 0, fontSize: 14 }}>{label}</h3>
                                    </div>
                                    {published
                                        ? <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} /> Live</span>
                                        : <span className="badge badge-default">Not published</span>
                                    }
                                </div>
                                <div className="card-body">
                                    {versions.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: 13 }}>No document yet</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {versions.slice(0, 3).map(doc => (
                                                <div key={doc.id} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '8px 12px', background: 'var(--bg-secondary)',
                                                    borderRadius: 8, gap: 8
                                                }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {doc.title}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                            <Clock size={10} /> v{doc.version} · {formatDateTime(doc.updatedAt)}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                        <span className={`badge ${STATUS_BADGE[doc.status] || 'badge-default'}`} style={{ fontSize: 10 }}>
                                                            {doc.status}
                                                        </span>
                                                        <button className="btn btn-sm btn-secondary" onClick={() => openPreview(doc)} title="Preview">
                                                            <Eye size={12} />
                                                        </button>
                                                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(doc)} title="Edit">
                                                            <Edit2 size={12} />
                                                        </button>
                                                        {doc.status === 'PUBLISHED' && (
                                                            <button className="btn btn-sm btn-warning" onClick={() => handleArchive(doc.id, doc.title)} title="Archive — pull from live site">
                                                                <Archive size={12} />
                                                            </button>
                                                        )}
                                                        {doc.status === 'DRAFT' && (
                                                            <button className="btn btn-sm btn-success" onClick={() => handlePublish(doc.id)} disabled={publishing === doc.id} title="Publish">
                                                                <Globe size={12} />
                                                            </button>
                                                        )}
                                                        {doc.status !== 'PUBLISHED' && (
                                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(doc.id, doc.title)} title="Delete">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {versions.length > 3 && (
                                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>+{versions.length - 3} older versions</p>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => openEdit(null, type)}
                                            style={{ width: '100%', justifyContent: 'center' }}
                                        >
                                            <Plus size={12} /> New Version
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
