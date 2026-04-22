"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CreditCard, Pause, Play, XCircle } from "lucide-react";
import { planAPI, subscriptionAPI } from "@/lib/api";
import { showToast, formatDate, formatCurrency } from "@/lib/hooks";

const subStatusColors = { ACTIVE: 'badge-success', EXPIRING: 'badge-warning', EXPIRED: 'badge-danger', PAUSED: 'badge-default', CANCELLED: 'badge-default' };

export default function PlansPage() {
    const [activeTab, setActiveTab] = useState("plans");
    const [plans, setPlans] = useState([]);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', benefits: '', quarterlyPrice: 0, biannualPrice: 0, yearlyPrice: 0, isVisible: true, sortOrder: 0 });
    const [subFilter, setSubFilter] = useState('ALL');

    useEffect(() => { loadPlans(); }, []);
    useEffect(() => { if (activeTab === 'subscriptions') loadSubs(); }, [activeTab]);

    async function loadPlans() {
        try { setLoading(true); const r = await planAPI.getAll(); setPlans(r.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    async function loadSubs() {
        try { const r = await subscriptionAPI.getAll(); setSubs(r.data?.data || []); }
        catch (e) { console.error(e); }
    }

    const filteredSubs = subFilter === 'ALL' ? subs : subs.filter(s => s.status === subFilter);

    function openAdd() { setEditing(null); setForm({ name: '', description: '', benefits: '', quarterlyPrice: 0, biannualPrice: 0, yearlyPrice: 0, isVisible: true, sortOrder: plans.length }); setShowModal(true); }
    function openEdit(p) { setEditing(p); setForm({ name: p.name, description: p.description || '', benefits: p.benefits || '', quarterlyPrice: p.quarterlyPrice, biannualPrice: p.biannualPrice, yearlyPrice: p.yearlyPrice, isVisible: p.isVisible, sortOrder: p.sortOrder }); setShowModal(true); }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await planAPI.update(editing.id, form); showToast('Plan updated'); }
            else { await planAPI.create(form); showToast('Plan created'); }
            setShowModal(false); loadPlans();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function deletePlan(id) {
        if (!confirm('Delete this plan?')) return;
        try { await planAPI.delete(id); showToast('Deleted'); loadPlans(); }
        catch (e) { showToast('Delete failed', 'error'); }
    }

    async function pauseSub(id) { try { await subscriptionAPI.pause(id); showToast('Subscription paused'); loadSubs(); } catch (e) { showToast('Failed', 'error'); } }
    async function resumeSub(id) { try { await subscriptionAPI.resume(id); showToast('Subscription resumed'); loadSubs(); } catch (e) { showToast('Failed', 'error'); } }
    async function cancelSub(id) { if (!confirm('Cancel?')) return; try { await subscriptionAPI.cancel(id); showToast('Cancelled'); loadSubs(); } catch (e) { showToast('Failed', 'error'); } }
    async function toggleAutoRenew(id) { try { await subscriptionAPI.toggleAutoRenew(id); showToast('Auto-renew toggled'); loadSubs(); } catch (e) { showToast('Failed', 'error'); } }

    return (
        <div>
            <div className="page-header"><h2>Plans & Subscriptions</h2><p>Manage pricing plans and user subscriptions</p></div>
            <div className="tabs mb-6">
                {["plans", "subscriptions"].map(t => <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>{t === 'plans' ? 'Plans' : 'Subscriptions'}</button>)}
            </div>

            {activeTab === "plans" && (
                <>
                    <div className="filter-bar"><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Plan</button></div>
                    {loading ? <p className="text-muted">Loading...</p> : (
                        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                            {plans.map(p => (
                                <div key={p.id} className="card">
                                    <div className="card-header"><h3>{p.name}</h3><span className={`badge ${p.isVisible ? 'badge-success' : 'badge-default'}`}>{p.isVisible ? 'Visible' : 'Hidden'}</span></div>
                                    <div className="card-body">
                                        <p className="text-sm text-muted mb-4">{p.description || 'No description'}</p>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                                            <div><div className="text-sm text-muted">Quarterly</div><div style={{ fontWeight: 700, color: "var(--accent-primary-light)" }}>{formatCurrency(p.quarterlyPrice)}</div></div>
                                            <div><div className="text-sm text-muted">Biannual</div><div style={{ fontWeight: 700, color: "var(--accent-primary-light)" }}>{formatCurrency(p.biannualPrice)}</div></div>
                                            <div><div className="text-sm text-muted">Yearly</div><div style={{ fontWeight: 700, color: "var(--accent-primary-light)" }}>{formatCurrency(p.yearlyPrice)}</div></div>
                                        </div>
                                        <div className="flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => openEdit(p)}><Edit2 size={14} /> Edit</button><button className="btn btn-sm btn-danger" onClick={() => deletePlan(p.id)}><Trash2 size={14} /></button></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === "subscriptions" && (
                <div className="card">
                    <div className="card-header"><h3>All Subscriptions</h3></div>
                    <div className="filter-bar" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['ALL', 'ACTIVE', 'PAUSED', 'EXPIRING', 'EXPIRED', 'CANCELLED'].map(status => (
                            <button key={status} onClick={() => setSubFilter(status)} className={`btn btn-sm ${subFilter === status ? 'btn-primary' : 'btn-secondary'}`}>{status}</button>
                        ))}
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>User</th><th>Plan</th><th>Cycle</th><th>Start</th><th>Expiry</th><th>Amount</th><th>Status</th><th>Auto-Renew</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredSubs.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.user?.name || '—'}</td>
                                        <td className="text-sm">{s.plan?.name || '—'}</td>
                                        <td className="text-sm">{s.billingCycle}</td>
                                        <td className="text-sm">{formatDate(s.startDate)}</td>
                                        <td className="text-sm">{formatDate(s.expiryDate)}</td>
                                        <td>{formatCurrency(s.amount)}</td>
                                        <td><span className={`badge ${subStatusColors[s.status] || 'badge-default'}`}>{s.status}</span></td>
                                        <td><button className="btn btn-sm btn-secondary" onClick={() => toggleAutoRenew(s.id)}>{s.autoRenew ? '✅' : '—'}</button></td>
                                        <td>
                                            <div className="flex gap-1">
                                                {s.status === 'ACTIVE' && <button className="btn btn-sm btn-warning" onClick={() => pauseSub(s.id)}><Pause size={12} /></button>}
                                                {s.status === 'PAUSED' && <button className="btn btn-sm btn-success" onClick={() => resumeSub(s.id)}><Play size={12} /></button>}
                                                {!['CANCELLED', 'EXPIRED'].includes(s.status) && <button className="btn btn-sm btn-danger" onClick={() => cancelSub(s.id)}><XCircle size={12} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSubs.length === 0 && <tr><td colSpan={9} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No subscriptions found{subFilter !== 'ALL' && ` with status ${subFilter}`}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editing ? 'Edit' : 'Add'} Plan</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Plan Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Benefits</label><textarea className="form-input" rows={2} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Quarterly (₹)</label><input className="form-input" type="number" value={form.quarterlyPrice} onChange={e => setForm({ ...form, quarterlyPrice: parseFloat(e.target.value) || 0 })} /></div>
                                    <div className="form-group"><label className="form-label">Biannual (₹)</label><input className="form-input" type="number" value={form.biannualPrice} onChange={e => setForm({ ...form, biannualPrice: parseFloat(e.target.value) || 0 })} /></div>
                                    <div className="form-group"><label className="form-label">Yearly (₹)</label><input className="form-input" type="number" value={form.yearlyPrice} onChange={e => setForm({ ...form, yearlyPrice: parseFloat(e.target.value) || 0 })} /></div>
                                </div>
                                <div className="form-group flex items-center gap-2"><input type="checkbox" checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} /><label>Visible to users</label></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
