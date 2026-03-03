"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Phone, MapPin, Clock, UserPlus, CheckCircle } from "lucide-react";
import { sosAPI, caregiverAPI } from "@/lib/api";
import { timeAgo, showToast } from "@/lib/hooks";

const statusColors = { ACTIVE: 'badge-danger', RESPONDING: 'badge-warning', RESOLVED: 'badge-success' };

export default function SOSPage() {
    const [alerts, setAlerts] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedCg, setSelectedCg] = useState('');

    useEffect(() => { loadData(); const interval = setInterval(loadData, 15000); return () => clearInterval(interval); }, []);

    async function loadData() {
        try {
            const [aRes, cRes] = await Promise.all([sosAPI.getAll(), caregiverAPI.getAll()]);
            setAlerts(aRes.data?.data || []);
            setCaregivers(cRes.data?.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function handleAssign() {
        if (!selectedCg) return;
        try { await sosAPI.assignResponder(assignModal.id, { responderId: selectedCg }); showToast('Responder assigned'); setAssignModal(null); loadData(); }
        catch (e) { showToast('Assign failed', 'error'); }
    }

    async function resolveAlert(id) {
        const notes = prompt('Resolution notes:');
        if (notes === null) return;
        try { await sosAPI.resolve(id, { resolvedNotes: notes }); showToast('Alert resolved'); loadData(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    const active = alerts.filter(a => a.status === 'ACTIVE');
    const responding = alerts.filter(a => a.status === 'RESPONDING');
    const resolved = alerts.filter(a => a.status === 'RESOLVED');

    return (
        <div>
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="status-dot live" /> SOS Emergency Control Panel</h2><p>Real-time monitoring of emergency alerts</p></div>
                {active.length > 0 && <span className="badge badge-danger" style={{ fontSize: 14, padding: "8px 16px", animation: "pulse 2s infinite" }}>{active.length} ACTIVE ALERT{active.length > 1 ? 'S' : ''}</span>}
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card" style={{ borderColor: "rgba(239,68,68,0.4)" }}><div className="stat-card-value" style={{ color: "var(--accent-danger)" }}>{active.length}</div><div className="stat-card-label">Active Alerts</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{responding.length}</div><div className="stat-card-label">Responding</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-success)" }}>{resolved.length}</div><div className="stat-card-label">Resolved Today</div></div>
                <div className="stat-card"><div className="stat-card-value">{alerts.length}</div><div className="stat-card-label">Total Alerts</div></div>
            </div>

            <div className="card">
                <div className="card-header"><h3>SOS Alert Feed</h3><span className="badge badge-danger">Live</span></div>
                <div className="card-body">
                    {loading ? <p className="text-muted">Loading...</p> :
                        alerts.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No SOS alerts</p> :
                            <div className="live-feed">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="live-feed-item" style={{ borderLeft: `3px solid ${alert.status === 'ACTIVE' ? 'var(--accent-danger)' : alert.status === 'RESPONDING' ? 'var(--accent-warning)' : 'var(--accent-success)'}` }}>
                                        <div className="live-feed-content" style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <h5>{alert.user?.name || 'Unknown'}</h5>
                                                <span className={`badge ${statusColors[alert.status]}`}>{alert.status}</span>
                                            </div>
                                            <div className="text-sm text-muted" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                                <span><Phone size={12} /> {alert.user?.phone || '—'}</span>
                                                <span><MapPin size={12} /> {alert.addressSnapshot || `${alert.latitude || '—'}, ${alert.longitude || '—'}`}</span>
                                                <span><Clock size={12} /> {timeAgo(alert.createdAt)}</span>
                                            </div>
                                            {alert.responder && <div className="text-sm mt-1" style={{ color: "var(--accent-primary-light)" }}>👤 Responder: {alert.responder.name}</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            {alert.status === 'ACTIVE' && <button className="btn btn-sm btn-primary" onClick={() => { setAssignModal(alert); setSelectedCg(''); }}><UserPlus size={14} /> Assign</button>}
                                            {alert.status !== 'RESOLVED' && <button className="btn btn-sm btn-success" onClick={() => resolveAlert(alert.id)}><CheckCircle size={14} /> Resolve</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>}
                </div>
            </div>

            {assignModal && (
                <div className="modal-overlay" onClick={() => setAssignModal(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                    <div className="modal-header"><h3>Assign Responder</h3><button onClick={() => setAssignModal(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body">
                        <p className="text-sm mb-4">Alert for: <strong>{assignModal.user?.name}</strong></p>
                        <div className="form-group"><label className="form-label">Select Responder</label>
                            <select className="form-select" value={selectedCg} onChange={e => setSelectedCg(e.target.value)}>
                                <option value="">— Choose —</option>
                                {caregivers.filter(c => c.isAvailable).map(c => <option key={c.id} value={c.id}>{c.name} — {c.specialization || 'General'}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAssign}>Assign</button></div>
                </div></div>
            )}
        </div>
    );
}
