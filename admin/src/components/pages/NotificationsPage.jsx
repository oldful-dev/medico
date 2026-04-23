"use client";
import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { notificationAPI, cityAPI } from "@/lib/api";
import { showToast, formatDateTime } from "@/lib/hooks";

export default function NotificationsPage() {
    const [logs, setLogs] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState({ channel: 'PUSH', subject: '', body: '', cityId: '' });
    const [showCampaign, setShowCampaign] = useState(false);

    useEffect(() => { loadLogs(); cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { }); }, []);

    async function loadLogs() { try { setLoading(true); const r = await notificationAPI.getLogs({ limit: 50 }); setLogs(r.data?.data || []); } catch (e) { } finally { setLoading(false); } }

    async function sendCampaign(e) {
        e.preventDefault();
        try { await notificationAPI.sendCampaign(campaign); showToast('Campaign sent!'); setShowCampaign(false); }
        catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    const channelColors = { EMAIL: 'badge-info', WHATSAPP: 'badge-success', PUSH: 'badge-purple' };

    return (
        <div>
            <div className="page-header"><h2>Notification & Automation Center</h2><p>Send campaigns and view notification logs</p></div>

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
                        <div className="form-row"><div className="form-group"><label className="form-label">Channel</label><select className="form-select" value={campaign.channel} onChange={e => setCampaign({ ...campaign, channel: e.target.value })}>{['PUSH', 'EMAIL', 'WHATSAPP'].map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="form-group"><label className="form-label">Target City</label><select className="form-select" value={campaign.cityId} onChange={e => setCampaign({ ...campaign, cityId: e.target.value })}><option value="">All Cities</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={campaign.subject} onChange={e => setCampaign({ ...campaign, subject: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" rows={4} required value={campaign.body} onChange={e => setCampaign({ ...campaign, body: e.target.value })} /></div>
                    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCampaign(false)}>Cancel</button><button type="submit" className="btn btn-success"><Send size={14} /> Send</button></div></form>
                </div></div>
            )}
        </div>
    );
}
