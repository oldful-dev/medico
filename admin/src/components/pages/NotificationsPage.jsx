"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Send, MessageSquare } from "lucide-react";
import { notificationAPI, cityAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState("templates");
    const [templates, setTemplates] = useState([]);
    const [logs, setLogs] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', channel: 'PUSH', subject: '', bodyTemplate: '', isActive: true });
    const [campaign, setCampaign] = useState({ channel: 'PUSH', subject: '', body: '', cityId: '' });
    const [showCampaign, setShowCampaign] = useState(false);

    useEffect(() => { loadTemplates(); cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { }); }, []);
    useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab]);

    async function loadTemplates() { try { setLoading(true); const r = await notificationAPI.getTemplates(); setTemplates(r.data?.data || []); } catch (e) { } finally { setLoading(false); } }
    async function loadLogs() { try { const r = await notificationAPI.getLogs({ limit: 50 }); setLogs(r.data?.data || []); } catch (e) { } }

    function openAdd() { setEditing(null); setForm({ name: '', channel: 'PUSH', subject: '', bodyTemplate: '', isActive: true }); setShowModal(true); }
    function openEdit(t) { setEditing(t); setForm({ name: t.name, channel: t.channel, subject: t.subject || '', bodyTemplate: t.bodyTemplate, isActive: t.isActive }); setShowModal(true); }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await notificationAPI.updateTemplate(editing.id, form); showToast('Template updated'); }
            else { await notificationAPI.createTemplate(form); showToast('Template created'); }
            setShowModal(false); loadTemplates();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function deleteTemplate(id) { if (!confirm('Delete?')) return; try { await notificationAPI.deleteTemplate(id); showToast('Deleted'); loadTemplates(); } catch (e) { showToast('Failed', 'error'); } }

    async function sendCampaign(e) {
        e.preventDefault();
        try { await notificationAPI.sendCampaign(campaign); showToast('Campaign sent!'); setShowCampaign(false); }
        catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    const channelColors = { EMAIL: 'badge-info', WHATSAPP: 'badge-success', PUSH: 'badge-purple', SMS: 'badge-warning' };

    return (
        <div>
            <div className="page-header"><h2>Notification & Automation Center</h2><p>Manage templates and send campaigns</p></div>
            <div className="tabs mb-6">
                {["templates", "logs"].map(t => <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>{t === 'templates' ? 'Templates' : 'Send Logs'}</button>)}
            </div>

            {activeTab === "templates" && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Template</button>
                        <button className="btn btn-success" onClick={() => setShowCampaign(true)}><Send size={16} /> Send Campaign</button>
                    </div>
                    <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Channel</th><th>Subject</th><th>Active</th><th>Actions</th></tr></thead>
                            <tbody>
                                {templates.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.name}</td>
                                        <td><span className={`badge ${channelColors[t.channel] || 'badge-default'}`}>{t.channel}</span></td>
                                        <td className="text-sm">{t.subject || '—'}</td>
                                        <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-default'}`}>{t.isActive ? 'Yes' : 'No'}</span></td>
                                        <td><div className="flex gap-2"><button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}><Edit2 size={14} /></button><button className="btn btn-sm btn-danger" onClick={() => deleteTemplate(t.id)}><Trash2 size={14} /></button></div></td>
                                    </tr>
                                ))}
                                {templates.length === 0 && <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No templates</td></tr>}
                            </tbody>
                        </table>
                    </div></div>
                </>
            )}

            {activeTab === "logs" && (
                <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Date</th><th>Channel</th><th>Subject</th><th>Recipient</th><th>Sent</th><th>Error</th></tr></thead>
                        <tbody>
                            {logs.map(l => (
                                <tr key={l.id}>
                                    <td className="text-sm">{formatDateTime(l.createdAt)}</td>
                                    <td><span className={`badge ${channelColors[l.channel] || 'badge-default'}`}>{l.channel}</span></td>
                                    <td className="text-sm">{l.subject || l.body?.substring(0, 50) || '—'}</td>
                                    <td className="text-sm">{l.recipientId || '—'}</td>
                                    <td><span className={`badge ${l.isSent ? 'badge-success' : 'badge-danger'}`}>{l.isSent ? 'Yes' : 'No'}</span></td>
                                    <td className="text-sm">{l.errorMessage || '—'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No logs</td></tr>}
                        </tbody>
                    </table>
                </div></div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header"><h3>{editing ? 'Edit' : 'Add'} Template</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                    <form onSubmit={handleSubmit}><div className="modal-body">
                        <div className="form-row"><div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="form-group"><label className="form-label">Channel</label><select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>{['EMAIL', 'WHATSAPP', 'PUSH', 'SMS'].map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
                        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Body Template *</label><textarea className="form-input" rows={4} required value={form.bodyTemplate} onChange={e => setForm({ ...form, bodyTemplate: e.target.value })} placeholder="Hello {{name}}, your booking {{bookingCode}} is confirmed." /></div>
                        <div className="form-group flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /><label>Active</label></div>
                    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
                </div></div>
            )}

            {showCampaign && (
                <div className="modal-overlay" onClick={() => setShowCampaign(false)}><div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header"><h3>Send Campaign</h3><button onClick={() => setShowCampaign(false)} className="btn btn-sm btn-secondary">✕</button></div>
                    <form onSubmit={sendCampaign}><div className="modal-body">
                        <div className="form-row"><div className="form-group"><label className="form-label">Channel</label><select className="form-select" value={campaign.channel} onChange={e => setCampaign({ ...campaign, channel: e.target.value })}>{['PUSH', 'EMAIL', 'WHATSAPP', 'SMS'].map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="form-group"><label className="form-label">Target City</label><select className="form-select" value={campaign.cityId} onChange={e => setCampaign({ ...campaign, cityId: e.target.value })}><option value="">All Cities</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={campaign.subject} onChange={e => setCampaign({ ...campaign, subject: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" rows={4} required value={campaign.body} onChange={e => setCampaign({ ...campaign, body: e.target.value })} /></div>
                    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCampaign(false)}>Cancel</button><button type="submit" className="btn btn-success"><Send size={14} /> Send</button></div></form>
                </div></div>
            )}
        </div>
    );
}
