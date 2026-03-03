"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Upload, Eye } from "lucide-react";
import { uiConfigAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

const typeColors = { HOME_BANNER: 'badge-info', SERVICE_CARD: 'badge-purple', PROMO_SECTION: 'badge-success', CATEGORY_STRIP: 'badge-warning', CUSTOM: 'badge-default' };

export default function ServerUIPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ type: 'HOME_BANNER', key: '', label: '', iconUrl: '', heroImageUrl: '', bannerColor: '', ctaText: '', ctaRoute: '', configJson: '', sortOrder: 0, isVisible: true });

    useEffect(() => { loadConfigs(); }, []);

    async function loadConfigs() { try { setLoading(true); const r = await uiConfigAPI.getAll(); setConfigs(r.data?.data || []); } catch (e) { } finally { setLoading(false); } }

    function openAdd() { setEditing(null); setForm({ type: 'HOME_BANNER', key: '', label: '', iconUrl: '', heroImageUrl: '', bannerColor: '', ctaText: '', ctaRoute: '', configJson: '', sortOrder: configs.length, isVisible: true }); setShowModal(true); }
    function openEdit(c) { setEditing(c); setForm({ type: c.type, key: c.key, label: c.label, iconUrl: c.iconUrl || '', heroImageUrl: c.heroImageUrl || '', bannerColor: c.bannerColor || '', ctaText: c.ctaText || '', ctaRoute: c.ctaRoute || '', configJson: c.configJson ? JSON.stringify(c.configJson, null, 2) : '', sortOrder: c.sortOrder, isVisible: c.isVisible }); setShowModal(true); }

    async function handleSubmit(e) {
        e.preventDefault();
        const data = { ...form };
        try { data.configJson = data.configJson ? JSON.parse(data.configJson) : null; } catch { showToast('Invalid JSON', 'error'); return; }
        try {
            if (editing) { await uiConfigAPI.update(editing.id, data); showToast('Config updated'); }
            else { await uiConfigAPI.create(data); showToast('Config created'); }
            setShowModal(false); loadConfigs();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function publishConfig(id) { try { await uiConfigAPI.publish(id); showToast('Published'); loadConfigs(); } catch (e) { showToast('Failed', 'error'); } }
    async function deleteConfig(id) { if (!confirm('Delete?')) return; try { await uiConfigAPI.delete(id); showToast('Deleted'); loadConfigs(); } catch (e) { showToast('Failed', 'error'); } }

    return (
        <div>
            <div className="page-header"><h2>Server-Driven UI Config</h2><p>Manage dynamic UI components for the mobile app</p></div>
            <div className="filter-bar"><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Config</button></div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead><tr><th>Order</th><th>Key</th><th>Label</th><th>Type</th><th>CTA</th><th>Visible</th><th>Version</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            configs.length === 0 ? <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No configs yet</td></tr> :
                                configs.map(c => (
                                    <tr key={c.id}>
                                        <td>{c.sortOrder}</td>
                                        <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{c.key}</code></td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.label}</td>
                                        <td><span className={`badge ${typeColors[c.type] || 'badge-default'}`}>{c.type?.replace(/_/g, ' ')}</span></td>
                                        <td className="text-sm">{c.ctaText || '—'}</td>
                                        <td><span className={`badge ${c.isVisible ? 'badge-success' : 'badge-default'}`}>{c.isVisible ? 'Yes' : 'No'}</span></td>
                                        <td className="text-sm">v{c.version}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                                                {!c.publishedAt && <button className="btn btn-sm btn-success" onClick={() => publishConfig(c.id)}><Upload size={12} /></button>}
                                                <button className="btn btn-sm btn-danger" onClick={() => deleteConfig(c.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
                    <div className="modal-header"><h3>{editing ? 'Edit' : 'Add'} UI Config</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                    <form onSubmit={handleSubmit}><div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <div className="form-row"><div className="form-group"><label className="form-label">Key *</label><input className="form-input" required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></div><div className="form-group"><label className="form-label">Label *</label><input className="form-input" required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.keys(typeColors).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div><div className="form-group"><label className="form-label">Sort Order</label><input className="form-input" type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} /></div></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">CTA Text</label><input className="form-input" value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} /></div><div className="form-group"><label className="form-label">CTA Route</label><input className="form-input" value={form.ctaRoute} onChange={e => setForm({ ...form, ctaRoute: e.target.value })} /></div></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">Hero Image URL</label><input className="form-input" value={form.heroImageUrl} onChange={e => setForm({ ...form, heroImageUrl: e.target.value })} /></div><div className="form-group"><label className="form-label">Banner Color</label><input className="form-input" value={form.bannerColor} onChange={e => setForm({ ...form, bannerColor: e.target.value })} placeholder="#6366f1" /></div></div>
                        <div className="form-group"><label className="form-label">Config JSON</label><textarea className="form-input" rows={5} style={{ fontFamily: 'monospace', fontSize: 12 }} value={form.configJson} onChange={e => setForm({ ...form, configJson: e.target.value })} placeholder='{"slides": [...]}' /></div>
                        <div className="form-group flex items-center gap-2"><input type="checkbox" checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} /><label>Visible</label></div>
                    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
                </div></div>
            )}
        </div>
    );
}
