"use client";
import { useState, useEffect } from "react";
import { Send, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Gift, Users } from "lucide-react";
import { notificationAPI, cityAPI, appMessageAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";
import FileUploadField from "@/components/common/FileUploadField";

// BIRTHDAY_WISHES is listed per spec 6.5 but is not creatable here — it's a
// separate automated system (backend/src/cron/index.js sends the email on
// the customer's real birthday; the popup is handled client-side in
// mobile/app/_layout.tsx). Selecting it in the form is blocked server-side
// too (appMessage.controller.js), this list entry exists only so admins can
// see it's accounted for and understand where it actually lives.
const MESSAGE_TYPES = [
    { value: "EMERGENCY", label: "🚨 Emergency Announcement" },
    { value: "ANNOUNCEMENT", label: "Important Announcement" },
    { value: "SERVICE_UPDATE", label: "Service Update" },
    { value: "PROMOTIONAL", label: "Promotional Message" },
    { value: "POLICY_UPDATE", label: "Policy Update / T&C" },
    { value: "OTHER", label: "Other Information" },
];
const BIRTHDAY_TYPE = { value: "BIRTHDAY_WISHES", label: "🎂 Birthday Wishes (automatic — not created here)" };

function blankMessage() {
    return {
        title: "", body: "", type: "ANNOUNCEMENT", imageUrl: "", targetCityId: "",
        startsAt: "", endsAt: "", isActive: false, requiresAgreement: false, version: "1",
    };
}

const ENGAGEMENT_LABELS = {
    VIEWED: { label: "Viewed", cls: "badge-info" },
    DISMISSED_ONCE: { label: "Dismissed (will re-show once)", cls: "badge-warning" },
    DISMISSED_FINAL: { label: "Dismissed (final)", cls: "badge-default" },
    ACKNOWLEDGED: { label: "Completed (OK / Agreed)", cls: "badge-success" },
};

// Spec 6.2 "Wish & Information > Information, Promotional & Important
// Messages" — admin-authored popup shown once per customer on app open.
// Only one message can be active at a time; activating a new one retires
// whatever was active before (enforced server-side in appMessage.controller).
// Spec 6.3/6.4: requiresAgreement switches the popup to Agree/Dismiss
// (instead of OK/Dismiss) and ties acceptance to `version` — bumping the
// version after editing T&C text makes every customer re-agree.
function WishAndInformationTab({ cities }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(blankMessage());
    const [engagementFor, setEngagementFor] = useState(null);
    const [engagementRows, setEngagementRows] = useState([]);
    const [engagementLoading, setEngagementLoading] = useState(false);

    useEffect(() => { loadMessages(); }, []);

    async function loadMessages() {
        try { setLoading(true); const r = await appMessageAPI.getAll(); setMessages(r.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    function openAdd() { setEditing(null); setForm(blankMessage()); setShowModal(true); }
    function openEdit(m) {
        setEditing(m);
        setForm({
            title: m.title, body: m.body, type: m.type,
            imageUrl: m.imageUrl || "", targetCityId: m.targetCityId || "",
            startsAt: m.startsAt ? m.startsAt.slice(0, 10) : "", endsAt: m.endsAt ? m.endsAt.slice(0, 10) : "",
            isActive: m.isActive, requiresAgreement: !!m.requiresAgreement, version: m.version || "1",
        });
        setShowModal(true);
    }

    async function openEngagement(m) {
        setEngagementFor(m);
        setEngagementLoading(true);
        try {
            const r = await appMessageAPI.getEngagement(m.id);
            setEngagementRows(r.data?.data || []);
        } catch { showToast("Failed to load engagement", "error"); }
        finally { setEngagementLoading(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await appMessageAPI.update(editing.id, form); showToast("Message updated"); }
            else { await appMessageAPI.create(form); showToast("Message created"); }
            setShowModal(false);
            loadMessages();
        } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    }

    async function toggleActive(m) {
        try {
            await appMessageAPI.update(m.id, { isActive: !m.isActive });
            showToast(m.isActive ? "Message deactivated" : "Message activated — now shown to customers on app open");
            loadMessages();
        } catch { showToast("Failed to toggle", "error"); }
    }

    async function deleteMessage(id) {
        if (!confirm("Delete this message? This cannot be undone.")) return;
        try { await appMessageAPI.delete(id); showToast("Message deleted"); loadMessages(); }
        catch { showToast("Delete failed", "error"); }
    }

    const typeLabel = (v) => MESSAGE_TYPES.find(t => t.value === v)?.label || v;

    return (
        <div>
            <div className="filter-bar mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p className="text-sm text-muted" style={{ margin: 0, maxWidth: 640 }}>
                    Only one message can be active at a time. General messages show OK/Dismiss — Dismiss re-shows the popup after 24 hours, then never again; OK stops it immediately. Messages requiring acceptance show Agree/Dismiss instead, tracked per version.
                </p>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Message</button>
            </div>

            {loading ? <p className="text-muted">Loading…</p> : (
                <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Title</th><th>Type</th><th>Version</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
                        <tbody>
                            {messages.map(m => (
                                <tr key={m.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        {m.title}
                                        {m.requiresAgreement && <div className="text-sm text-muted" style={{ fontWeight: 400 }}>Requires Agree (not OK)</div>}
                                        {m.targetCityId && <div className="text-sm text-muted" style={{ fontWeight: 400 }}>Target: {(cities || []).find(c => c.id === m.targetCityId)?.name || "1 city"}</div>}
                                        {(m.startsAt || m.endsAt) && (
                                            <div className="text-sm text-muted" style={{ fontWeight: 400 }}>
                                                Valid: {m.startsAt ? new Date(m.startsAt).toLocaleDateString() : "now"} – {m.endsAt ? new Date(m.endsAt).toLocaleDateString() : "no end date"}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-sm">{typeLabel(m.type)}</td>
                                    <td className="text-sm">{m.version}</td>
                                    <td>
                                        <button onClick={() => toggleActive(m)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                                            <span className={`badge ${m.isActive ? "badge-success" : "badge-default"}`}>
                                                {m.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="text-sm">{formatDateTime(m.updatedAt)}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button className="btn btn-sm btn-secondary" onClick={() => openEngagement(m)} title="View per-customer engagement"><Users size={12} /></button>
                                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}><Edit2 size={12} /></button>
                                            <button className={`btn btn-sm ${m.isActive ? "btn-warning" : "btn-success"}`} onClick={() => toggleActive(m)}>
                                                {m.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => deleteMessage(m.id)}><Trash2 size={12} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {messages.length === 0 && <tr><td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: 24 }}>No messages yet. Click &quot;New Message&quot; to create one.</td></tr>}
                        </tbody>
                    </table>
                </div></div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header"><h3>{editing ? "Edit" : "New"} Message</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {MESSAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    <option value={BIRTHDAY_TYPE.value} disabled>{BIRTHDAY_TYPE.label}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required maxLength={80} placeholder="e.g. New Feature: Family Members" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message *</label>
                                <textarea className="form-input" rows={4} required placeholder="The full popup message shown to the customer" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Image (optional)</label>
                                <FileUploadField
                                    value={form.imageUrl}
                                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                                    folder="app-messages"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Audience</label>
                                <select className="form-select" value={form.targetCityId} onChange={e => setForm({ ...form, targetCityId: e.target.value })}>
                                    <option value="">All Cities</option>
                                    {(cities || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Show From (optional)</label>
                                    <input type="date" className="form-input" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Show Until (optional)</label>
                                    <input type="date" className="form-input" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group flex items-center gap-2">
                                <input type="checkbox" id="msgRequiresAgreement" checked={form.requiresAgreement} onChange={e => setForm({ ...form, requiresAgreement: e.target.checked })} />
                                <label htmlFor="msgRequiresAgreement" style={{ cursor: "pointer" }}>
                                    Requires acceptance (e.g. new Terms &amp; Conditions) — shows Agree/Dismiss instead of OK/Dismiss
                                </label>
                            </div>
                            {form.requiresAgreement && (
                                <div className="form-group">
                                    <label className="form-label">Version *</label>
                                    <p className="text-sm text-muted" style={{ marginTop: -2, marginBottom: 4 }}>
                                        Bump this (e.g. &quot;1&quot; → &quot;2&quot;) whenever the terms change — customers who already
                                        agreed to the old version will be prompted to agree again.
                                    </p>
                                    <input className="form-input" required placeholder="e.g. 1" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
                                </div>
                            )}
                            <div className="form-group flex items-center gap-2">
                                <input type="checkbox" id="msgActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                <label htmlFor="msgActive" style={{ cursor: "pointer" }}>
                                    Active (shown to customers now — deactivates any other active message)
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editing ? "Save Changes" : "Create Message"}</button>
                        </div>
                    </form>
                </div></div>
            )}

            {engagementFor && (
                <div className="modal-overlay" onClick={() => setEngagementFor(null)}><div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Engagement — {engagementFor.title}</h3>
                        <button onClick={() => setEngagementFor(null)} className="btn btn-sm btn-secondary">✕</button>
                    </div>
                    <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                        {engagementLoading ? <p className="text-muted">Loading…</p> : engagementRows.length === 0 ? (
                            <p className="text-muted" style={{ textAlign: "center", padding: 24 }}>No customer has seen this message yet.</p>
                        ) : (
                            <table className="data-table">
                                <thead><tr><th>Customer</th><th>Version</th><th>Status</th><th>Last Updated</th></tr></thead>
                                <tbody>
                                    {engagementRows.map(r => (
                                        <tr key={r.id}>
                                            <td className="text-sm">{r.user?.name || r.userId} <span className="text-muted">({r.user?.uniqueUserId})</span></td>
                                            <td className="text-sm">{r.messageVersion}</td>
                                            <td><span className={`badge ${ENGAGEMENT_LABELS[r.status]?.cls || "badge-default"}`}>{ENGAGEMENT_LABELS[r.status]?.label || r.status}</span></td>
                                            <td className="text-sm">{formatDateTime(r.updatedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEngagementFor(null)}>Close</button></div>
                </div></div>
            )}
        </div>
    );
}

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState("campaigns");
    const [logs, setLogs] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState({ channel: 'PUSH', subject: '', body: '', cityId: '', templateId: '', mediaUrl: '' });
    const [showCampaign, setShowCampaign] = useState(false);
    const [campaignTemplates, setCampaignTemplates] = useState({ whatsapp: [], email: [] });

    useEffect(() => {
        loadLogs();
        cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { });
        // Live from the real WHATSAPP_TEMPLATES/EMAIL campaign-eligible lists
        // (backend/src/controllers/notification.controller.js getCampaignTemplates)
        // — not a hardcoded array that can drift out of sync with what actually sends.
        notificationAPI.getCampaignTemplates().then(r => setCampaignTemplates(r.data?.data || { whatsapp: [], email: [] })).catch(() => { });
    }, []);

    async function loadLogs() { try { setLoading(true); const r = await notificationAPI.getLogs({ limit: 50 }); setLogs(r.data?.data || []); } catch (e) { } finally { setLoading(false); } }

    async function sendCampaign(e) {
        e.preventDefault();
        try {
            const r = await notificationAPI.sendCampaign(campaign);
            const { sentCount, failedCount, errors } = r.data?.data || {};
            if (failedCount > 0) {
                // Real per-recipient error text (e.g. Fast2SMS's own "Template
                // ID is invalid or not approved") — not just a bare fail count.
                showToast(`${sentCount} sent, ${failedCount} failed: ${(errors || []).join('; ') || 'see Campaigns & Logs for details'}`, 'error');
            } else {
                showToast(r.data?.message || 'Campaign sent!');
            }
            setShowCampaign(false);
            loadLogs();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    const channelColors = { EMAIL: 'badge-info', WHATSAPP: 'badge-success', PUSH: 'badge-purple', SMS: 'badge-warning' };
    const selectedWhatsappTemplate = campaignTemplates.whatsapp.find(t => t.value === campaign.templateId);

    return (
        <div>
            <div className="page-header"><h2>Notification & Automation Center</h2><p>Send campaigns, manage automated wishes, and view notification logs</p></div>

            <div className="tabs mb-6">
                <button className={`tab ${activeTab === "campaigns" ? "active" : ""}`} onClick={() => setActiveTab("campaigns")}>Campaigns & Logs</button>
                <button className={`tab ${activeTab === "wish" ? "active" : ""}`} onClick={() => setActiveTab("wish")}>
                    <Gift size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Wish & Information
                </button>
            </div>

            {activeTab === "wish" ? <WishAndInformationTab cities={cities} /> : (
                <>
                    <div className="filter-bar mb-6">
                        <button className="btn btn-success" onClick={() => setShowCampaign(true)}><Send size={16} /> Send Campaign</button>
                    </div>

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

                    {showCampaign && (
                        <div className="modal-overlay" onClick={() => setShowCampaign(false)}><div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Send Campaign</h3><button onClick={() => setShowCampaign(false)} className="btn btn-sm btn-secondary">✕</button></div>
                            <form onSubmit={sendCampaign}><div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Channel</label>
                                        <select className="form-select" value={campaign.channel} onChange={e => setCampaign({ ...campaign, channel: e.target.value, templateId: '' })}>
                                            {['PUSH', 'EMAIL', 'WHATSAPP'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <small className="text-muted">SMS campaigns aren&apos;t listed — no DLT-approved broadcast template registered yet.</small>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Target City</label>
                                        <select className="form-select" value={campaign.cityId} onChange={e => setCampaign({ ...campaign, cityId: e.target.value })}>
                                            <option value="">All Cities</option>
                                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {campaign.channel === 'WHATSAPP' && (
                                    <div className="form-group">
                                        <label className="form-label">WhatsApp Template *</label>
                                        <select className="form-select" required value={campaign.templateId} onChange={e => setCampaign({ ...campaign, templateId: e.target.value, mediaUrl: '' })}>
                                            <option value="">Select a template</option>
                                            {campaignTemplates.whatsapp.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                        <small className="text-muted">Only approved marketing templates can be used for campaigns.</small>
                                    </div>
                                )}
                                {campaign.channel === 'WHATSAPP' && selectedWhatsappTemplate?.mediaRequired && (
                                    <div className="form-group">
                                        <label className="form-label">Template Image *</label>
                                        <FileUploadField
                                            value={campaign.mediaUrl}
                                            onChange={(url) => setCampaign({ ...campaign, mediaUrl: url })}
                                            folder="notification-campaigns"
                                        />
                                        <small className="text-muted">This template requires an image — the campaign can&apos;t send without one.</small>
                                    </div>
                                )}
                                {campaign.channel === 'EMAIL' && (
                                    <div className="form-group">
                                        <label className="form-label">Template (optional)</label>
                                        <select className="form-select" value={campaign.templateId} onChange={e => setCampaign({ ...campaign, templateId: e.target.value })}>
                                            <option value="">Custom (use Subject/Message below)</option>
                                            {campaignTemplates.email.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                        <small className="text-muted">Pick a structured marketing template, or leave blank to send free-form Subject/Message.</small>
                                    </div>
                                )}
                                {campaign.channel !== 'WHATSAPP' && !(campaign.channel === 'EMAIL' && campaign.templateId) && (
                                    <div className="form-group"><label className="form-label">Subject {campaign.channel === 'PUSH' && '(Notification title)'}</label><input className="form-input" value={campaign.subject} onChange={e => setCampaign({ ...campaign, subject: e.target.value })} /></div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">
                                        {campaign.channel === 'WHATSAPP' && selectedWhatsappTemplate?.variables >= 2 ? 'Message — 2nd variable (e.g. discount/link) *'
                                            : campaign.channel === 'WHATSAPP' ? 'Message (Preview — actual content from template)'
                                            : campaign.channel === 'EMAIL' && campaign.templateId === 'PROMO_OFFER' ? 'Discount value (e.g. "20%") *'
                                            : campaign.channel === 'EMAIL' && campaign.templateId === 'ANNOUNCEMENT_UPDATE' ? 'Message (this template uses fixed copy — leave blank)'
                                            : 'Message *'}
                                    </label>
                                    <textarea
                                        className="form-input" rows={4}
                                        required={(campaign.channel === 'WHATSAPP' && selectedWhatsappTemplate?.variables >= 2) || (campaign.channel !== 'WHATSAPP' && !(campaign.channel === 'EMAIL' && campaign.templateId === 'ANNOUNCEMENT_UPDATE'))}
                                        disabled={campaign.channel === 'EMAIL' && campaign.templateId === 'ANNOUNCEMENT_UPDATE'}
                                        value={campaign.body}
                                        onChange={e => setCampaign({ ...campaign, body: e.target.value })}
                                    />
                                    {campaign.channel === 'WHATSAPP' && campaign.templateId && selectedWhatsappTemplate?.variables < 2 && (
                                        <small className="text-muted">This template has no second variable — leave blank.</small>
                                    )}
                                </div>
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCampaign(false)}>Cancel</button><button type="submit" className="btn btn-success"><Send size={14} /> Send</button></div></form>
                        </div></div>
                    )}
                </>
            )}
        </div>
    );
}
