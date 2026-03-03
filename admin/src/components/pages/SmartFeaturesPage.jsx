"use client";
import { useState, useEffect } from "react";
import { Brain, Heart, RefreshCw, Pause, AlertTriangle, Search } from "lucide-react";
import { subscriptionAPI, bookingAPI, reportAPI } from "@/lib/api";
import { showToast, formatDate, formatCurrency } from "@/lib/hooks";

export default function SmartFeaturesPage() {
    const [activeTab, setActiveTab] = useState("compassionate");
    const [subs, setSubs] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [refundData, setRefundData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [activeTab]);

    async function loadData() {
        setLoading(true);
        try {
            if (activeTab === 'compassionate' || activeTab === 'pause') {
                const r = await subscriptionAPI.getAll();
                setSubs(r.data?.data || []);
            }
            if (activeTab === 'sla') {
                const r = await bookingAPI.getAll({ status: 'SLA_BREACH' });
                setBookings(r.data?.data?.bookings || r.data?.data || []);
            }
            if (activeTab === 'refunds') {
                const r = await reportAPI.refundAnalysis();
                setRefundData(r.data?.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function applyCompassionate(subId) {
        const days = prompt('Extension days:');
        if (!days) return;
        const reason = prompt('Reason:');
        if (reason === null) return;
        try { await subscriptionAPI.compassionate(subId, { days: parseInt(days), reason }); showToast('Compassionate extension applied'); loadData(); }
        catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function pauseSubscription(id) {
        try { await subscriptionAPI.pause(id); showToast('Subscription paused'); loadData(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    async function resumeSubscription(id) {
        try { await subscriptionAPI.resume(id); showToast('Subscription resumed'); loadData(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    const tabs = [
        { key: 'compassionate', label: 'Compassionate Clause', icon: Heart },
        { key: 'pause', label: 'Pause Credits', icon: Pause },
        { key: 'sla', label: 'SLA Breach Tracker', icon: AlertTriangle },
        { key: 'refunds', label: 'Refund Analysis', icon: RefreshCw },
    ];

    return (
        <div>
            <div className="page-header"><h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Brain size={28} /> Advanced Smart Features</h2><p>AI-powered tools and automation for healthcare operations</p></div>
            <div className="tabs mb-6">
                {tabs.map(t => <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}><t.icon size={14} /> {t.label}</button>)}
            </div>

            {loading && <p className="text-muted" style={{ padding: 24 }}>Loading...</p>}

            {!loading && activeTab === "compassionate" && (
                <div className="card"><div className="card-header"><h3>Compassionate Clause — Active Subscriptions</h3></div><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Expiry</th><th>Extension Days</th><th>Reason</th><th>Action</th></tr></thead>
                        <tbody>
                            {subs.filter(s => s.status === 'ACTIVE' || s.status === 'EXPIRING').map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.user?.name || '—'}</td>
                                    <td>{s.plan?.name || '—'}</td>
                                    <td><span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                                    <td className="text-sm">{formatDate(s.expiryDate)}</td>
                                    <td>{s.compassionateExtensionDays > 0 ? <span className="badge badge-info">{s.compassionateExtensionDays} days</span> : '—'}</td>
                                    <td className="text-sm">{s.compassionateReason || '—'}</td>
                                    <td><button className="btn btn-sm btn-primary" onClick={() => applyCompassionate(s.id)}><Heart size={12} /> Extend</button></td>
                                </tr>
                            ))}
                            {subs.filter(s => s.status === 'ACTIVE' || s.status === 'EXPIRING').length === 0 && <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No active subscriptions</td></tr>}
                        </tbody>
                    </table>
                </div></div>
            )}

            {!loading && activeTab === "pause" && (
                <div className="card"><div className="card-header"><h3>Subscription Pause / Resume</h3></div><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Start</th><th>Expiry</th><th>Paused At</th><th>Action</th></tr></thead>
                        <tbody>
                            {subs.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.user?.name || '—'}</td>
                                    <td>{s.plan?.name || '—'}</td>
                                    <td><span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : s.status === 'PAUSED' ? 'badge-warning' : 'badge-default'}`}>{s.status}</span></td>
                                    <td className="text-sm">{formatDate(s.startDate)}</td>
                                    <td className="text-sm">{formatDate(s.expiryDate)}</td>
                                    <td className="text-sm">{s.pausedAt ? formatDate(s.pausedAt) : '—'}</td>
                                    <td>
                                        {s.status === 'ACTIVE' && <button className="btn btn-sm btn-warning" onClick={() => pauseSubscription(s.id)}><Pause size={12} /> Pause</button>}
                                        {s.status === 'PAUSED' && <button className="btn btn-sm btn-success" onClick={() => resumeSubscription(s.id)}>▶ Resume</button>}
                                    </td>
                                </tr>
                            ))}
                            {subs.length === 0 && <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No subscriptions</td></tr>}
                        </tbody>
                    </table>
                </div></div>
            )}

            {!loading && activeTab === "sla" && (
                <div className="card"><div className="card-header"><h3>SLA Breached Bookings</h3></div><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Code</th><th>User</th><th>Service</th><th>City</th><th>Amount</th><th>Status</th><th>SLA Deadline</th></tr></thead>
                        <tbody>
                            {bookings.map(b => (
                                <tr key={b.id}>
                                    <td><code style={{ fontSize: 11, color: "var(--accent-danger)" }}>{b.bookingCode}</code></td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.user?.name || '—'}</td>
                                    <td className="text-sm">{b.service?.name || '—'}</td>
                                    <td className="text-sm">{b.city?.name || '—'}</td>
                                    <td>{formatCurrency(b.amount)}</td>
                                    <td><span className="badge badge-danger">SLA BREACH</span></td>
                                    <td className="text-sm">{b.slaDeadline ? formatDate(b.slaDeadline) : '—'}</td>
                                </tr>
                            ))}
                            {bookings.length === 0 && <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No SLA breaches 🎉</td></tr>}
                        </tbody>
                    </table>
                </div></div>
            )}

            {!loading && activeTab === "refunds" && (
                <div className="card"><div className="card-header"><h3>Refund Analysis</h3></div><div className="card-body">
                    {refundData ? (
                        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                            <div><div className="text-sm text-muted">Total Refunds</div><div style={{ fontSize: 24, fontWeight: 700 }}>{refundData.totalRefunds || 0}</div></div>
                            <div><div className="text-sm text-muted">Total Amount</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-danger)" }}>{formatCurrency(refundData.totalRefundAmount || 0)}</div></div>
                            {refundData.byType && Object.entries(refundData.byType).map(([type, data]) => (
                                <div key={type}><div className="text-sm text-muted">{type.replace(/_/g, ' ')}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{data.count || 0}<span className="text-sm text-muted" style={{ marginLeft: 8 }}>{formatCurrency(data.amount || 0)}</span></div></div>
                            ))}
                        </div>
                    ) : <p className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No refund data available</p>}
                </div></div>
            )}
        </div>
    );
}
