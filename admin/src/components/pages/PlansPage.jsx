"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Pause, Play, XCircle, Save, X } from "lucide-react";
import { planAPI, subscriptionAPI } from "@/lib/api";
import { showToast, formatDate, formatCurrency } from "@/lib/hooks";

// ─── Fixed benefit codes — admin selects from this list only ──────────────────
const BENEFIT_CODES = [
    // Care
    { code: "BASE_PLAN",              label: "Base Plan (Ayuxa Lifeline)" },
    { code: "SOS",                    label: "24/7 SOS" },
    { code: "TELECONSULT",            label: "Tele Consultation" },
    { code: "COMPANIONSHIP_CALL",     label: "Companionship Call" },
    { code: "MEDICINE_DELIVERY",      label: "Medicine Delivery" },
    { code: "BLOOD_TEST",             label: "Blood Test Profile" },
    { code: "PHONE_SUPPORT",          label: "Phone Support" },
    { code: "FAMILY_PORTAL",          label: "Family Portal" },
    { code: "CARE_MANAGER",           label: "Dedicated Care Manager" },
    { code: "CAREGIVER_VISIT",        label: "Caregiver Visit" },
    { code: "NURSE_VISIT",            label: "Nurse Visit" },
    { code: "SPIRITUAL_ESCORT",       label: "Spiritual Escort" },
    { code: "LOCAL_MEETUP",           label: "Local Meetup" },
    { code: "HOSPITAL_ACCOMPANIMENT", label: "Hospital Accompaniment" },
    { code: "PICKUP_DROP",            label: "Pickup & Drop" },
    // Home
    { code: "HANDYMEN",               label: "Handymen" },
    { code: "ZERO_SERVICE_FEE",       label: "Zero Service Fee" },
    { code: "BILL_PAYMENT",           label: "Bill Payments" },
    { code: "TECH_SUPPORT",           label: "Tech Support" },
    { code: "GROCERY_ASSIST",         label: "Grocery Assistance" },
    { code: "PAPERWORK_ASSIST",       label: "Paperwork Assistance" },
    { code: "DEEP_CLEANING",          label: "Deep Cleaning Coordination" },
    { code: "SANITATION",             label: "Washroom Sanitation" },
    { code: "HOME_AUDIT",             label: "Home Safety Audit" },
    { code: "CUSTOM_REQUEST",         label: "Custom Request" },
];

const USAGE_PERIODS = [
    { value: "MONTH",   label: "/ month" },
    { value: "QUARTER", label: "/ quarter" },
    { value: "YEAR",    label: "/ year" },
];

const PLAN_TYPES = ["CARE", "HOMEMAKER"];

const subStatusColors = {
    ACTIVE: 'badge-success', EXPIRING: 'badge-warning',
    EXPIRED: 'badge-danger', PAUSED: 'badge-default', CANCELLED: 'badge-default',
};

// ─── Blank plan form ──────────────────────────────────────────────────────────
const blankPlan = () => ({
    name: '', description: '', planType: 'CARE',
    quarterlyPrice: 0, biannualPrice: 0, yearlyPrice: 0,
    isVisible: true, sortOrder: 0, maxConcurrent: 4,
});

// ─── Blank benefit form ───────────────────────────────────────────────────────
const blankBenefit = () => ({
    benefitCode: 'SOS', title: '24/7 SOS',
    description: '', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 0,
});

// ─── Inline benefit table per plan ───────────────────────────────────────────
function BenefitsPanel({ plan }) {
    const [benefits, setBenefits]   = useState(plan.planBenefits || []);
    const [adding, setAdding]       = useState(false);
    const [newRow, setNewRow]       = useState(blankBenefit());
    const [editingId, setEditingId] = useState(null);
    const [editRow, setEditRow]     = useState(null);
    const [saving, setSaving]       = useState(false);

    // Auto-fill title when code changes
    const autoTitle = (code) => BENEFIT_CODES.find(b => b.code === code)?.label || code;

    async function handleAdd() {
        if (!newRow.benefitCode) return;
        setSaving(true);
        try {
            const r = await planAPI.addBenefit(plan.id, {
                ...newRow,
                title: newRow.title || autoTitle(newRow.benefitCode),
            });
            setBenefits(prev => [...prev, r.data.data].sort((a, b) => a.displayOrder - b.displayOrder));
            setNewRow(blankBenefit());
            setAdding(false);
            showToast('Benefit added');
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed', 'error');
        } finally { setSaving(false); }
    }

    async function handleUpdate(benefitId) {
        setSaving(true);
        try {
            const r = await planAPI.updateBenefit(plan.id, benefitId, editRow);
            setBenefits(prev => prev.map(b => b.id === benefitId ? r.data.data : b).sort((a, b) => a.displayOrder - b.displayOrder));
            setEditingId(null); setEditRow(null);
            showToast('Benefit updated');
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed', 'error');
        } finally { setSaving(false); }
    }

    async function handleDelete(benefitId) {
        if (!confirm('Delete this benefit?')) return;
        try {
            await planAPI.deleteBenefit(plan.id, benefitId);
            setBenefits(prev => prev.filter(b => b.id !== benefitId));
            showToast('Benefit deleted');
        } catch (e) {
            showToast('Delete failed', 'error');
        }
    }

    function startEdit(b) {
        setEditingId(b.id);
        setEditRow({ benefitCode: b.benefitCode, title: b.title, description: b.description || '', usageLimit: b.usageLimit, usagePeriod: b.usagePeriod, displayOrder: b.displayOrder });
    }

    const usageBadge = (limit, period) => {
        if (!limit) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unlimited</span>;
        const per = USAGE_PERIODS.find(p => p.value === period)?.label || `/ ${period}`;
        return <span className="badge badge-default" style={{ fontSize: 11 }}>{limit}× {per}</span>;
    };

    return (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Benefits ({benefits.length})
                </span>
                {!adding && (
                    <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>
                        <Plus size={13} /> Add Benefit
                    </button>
                )}
            </div>

            {/* Benefits table */}
            {benefits.length > 0 && (
                <table className="data-table" style={{ fontSize: 12, marginBottom: 10 }}>
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th>Code</th>
                            <th>Title</th>
                            <th>Usage</th>
                            <th style={{ width: 90 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {benefits.map(b => (
                            <tr key={b.id}>
                                {editingId === b.id ? (
                                    <>
                                        <td>
                                            <input
                                                type="number" style={{ width: 50 }} className="form-input"
                                                value={editRow.displayOrder}
                                                onChange={e => setEditRow({ ...editRow, displayOrder: +e.target.value })}
                                            />
                                        </td>
                                        <td>
                                            <select className="form-input" style={{ fontSize: 12 }}
                                                value={editRow.benefitCode}
                                                onChange={e => setEditRow({ ...editRow, benefitCode: e.target.value, title: autoTitle(e.target.value) })}
                                            >
                                                {BENEFIT_CODES.map(bc => <option key={bc.code} value={bc.code}>{bc.code}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input className="form-input" style={{ fontSize: 12 }}
                                                value={editRow.title}
                                                onChange={e => setEditRow({ ...editRow, title: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <input type="number" min={0} style={{ width: 55 }} className="form-input"
                                                value={editRow.usageLimit}
                                                onChange={e => setEditRow({ ...editRow, usageLimit: +e.target.value })}
                                            />
                                            <select className="form-input" style={{ fontSize: 12 }}
                                                value={editRow.usagePeriod}
                                                onChange={e => setEditRow({ ...editRow, usagePeriod: e.target.value })}
                                            >
                                                {USAGE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => handleUpdate(b.id)}><Save size={12} /></button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditingId(null); setEditRow(null); }}><X size={12} /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ color: 'var(--text-muted)' }}>{b.displayOrder}</td>
                                        <td><code style={{ fontSize: 11, background: 'var(--bg-secondary)', padding: '2px 5px', borderRadius: 4 }}>{b.benefitCode}</code></td>
                                        <td>{b.title}</td>
                                        <td>{usageBadge(b.usageLimit, b.usagePeriod)}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-sm btn-secondary" onClick={() => startEdit(b)}><Edit2 size={12} /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}><Trash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {benefits.length === 0 && !adding && (
                <p className="text-sm text-muted" style={{ marginBottom: 8 }}>No benefits configured yet.</p>
            )}

            {/* Add new row */}
            {adding && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>New Benefit</p>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Benefit Code *</label>
                            <select className="form-input" value={newRow.benefitCode}
                                onChange={e => setNewRow({ ...newRow, benefitCode: e.target.value, title: autoTitle(e.target.value) })}
                            >
                                {BENEFIT_CODES.map(bc => <option key={bc.code} value={bc.code}>{bc.code} — {bc.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Display Title *</label>
                            <input className="form-input" value={newRow.title}
                                onChange={e => setNewRow({ ...newRow, title: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Usage Limit (0 = unlimited)</label>
                            <input type="number" min={0} className="form-input" value={newRow.usageLimit}
                                onChange={e => setNewRow({ ...newRow, usageLimit: +e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Usage Period</label>
                            <select className="form-input" value={newRow.usagePeriod}
                                onChange={e => setNewRow({ ...newRow, usagePeriod: e.target.value })}
                            >
                                {USAGE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Display Order</label>
                            <input type="number" className="form-input" value={newRow.displayOrder}
                                onChange={e => setNewRow({ ...newRow, displayOrder: +e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: 11 }}>Description (optional subtitle)</label>
                        <input className="form-input" value={newRow.description}
                            onChange={e => setNewRow({ ...newRow, description: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-primary" disabled={saving} onClick={handleAdd}>
                            {saving ? 'Saving…' : 'Add Benefit'}
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setAdding(false); setNewRow(blankBenefit()); }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete, onToggleVisibility }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>{plan.name}</h3>
                        <span className={`badge ${plan.planType === 'HOMEMAKER' ? 'badge-default' : 'badge-success'}`} style={{ fontSize: 11 }}>
                            {plan.planType}
                        </span>
                        <span className={`badge ${plan.isVisible ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                            {plan.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                        <span className="badge badge-default" style={{ fontSize: 11 }}>Order: {plan.sortOrder}</span>
                    </div>
                    {plan.description && <p className="text-sm text-muted" style={{ marginTop: 4, marginBottom: 0 }}>{plan.description}</p>}
                </div>

                {/* Price summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center', minWidth: 220 }}>
                    {[['Quarterly', plan.quarterlyPrice], ['Biannual', plan.biannualPrice], ['Yearly', plan.yearlyPrice]].map(([label, price]) => (
                        <div key={label}>
                            <div className="text-sm text-muted" style={{ fontSize: 11 }}>{label}</div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-primary-light)', fontSize: 15 }}>{formatCurrency(price)}</div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => onToggleVisibility(plan)}>
                        {plan.isVisible ? 'Hide' : 'Show'}
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => onEdit(plan)}><Edit2 size={13} /> Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(plan.id)}><Trash2 size={13} /></button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setExpanded(e => !e)}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Hide' : 'Benefits'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="card-body" style={{ paddingTop: 0 }}>
                    <BenefitsPanel plan={plan} />
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlansPage() {
    const [activeTab, setActiveTab]   = useState("plans");
    const [plans, setPlans]           = useState([]);
    const [subs, setSubs]             = useState([]);
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [editing, setEditing]       = useState(null);
    const [form, setForm]             = useState(blankPlan());
    const [subFilter, setSubFilter]   = useState('ALL');

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

    function openAdd() {
        setEditing(null);
        setForm({ ...blankPlan(), sortOrder: plans.length });
        setShowModal(true);
    }

    function openEdit(p) {
        setEditing(p);
        setForm({
            name: p.name, description: p.description || '', planType: p.planType || 'CARE',
            quarterlyPrice: p.quarterlyPrice, biannualPrice: p.biannualPrice, yearlyPrice: p.yearlyPrice,
            isVisible: p.isVisible, sortOrder: p.sortOrder, maxConcurrent: p.maxConcurrent ?? 4,
        });
        setShowModal(true);
    }

    async function handleToggleVisibility(plan) {
        try {
            await planAPI.update(plan.id, { isVisible: !plan.isVisible });
            showToast(plan.isVisible ? 'Plan hidden' : 'Plan visible');
            loadPlans();
        } catch { showToast('Failed', 'error'); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await planAPI.update(editing.id, form); showToast('Plan updated'); }
            else { await planAPI.create(form); showToast('Plan created'); }
            setShowModal(false); loadPlans();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function deletePlan(id) {
        if (!confirm('Delete this plan? This cannot be undone.')) return;
        try { await planAPI.delete(id); showToast('Deleted'); loadPlans(); }
        catch (e) { showToast('Delete failed', 'error'); }
    }

    async function pauseSub(id)  { try { await subscriptionAPI.pause(id);  showToast('Paused');   loadSubs(); } catch { showToast('Failed', 'error'); } }
    async function resumeSub(id) { try { await subscriptionAPI.resume(id); showToast('Resumed');  loadSubs(); } catch { showToast('Failed', 'error'); } }
    async function cancelSub(id) { if (!confirm('Cancel?')) return; try { await subscriptionAPI.cancel(id); showToast('Cancelled'); loadSubs(); } catch { showToast('Failed', 'error'); } }
    async function toggleAutoRenew(id) { try { await subscriptionAPI.toggleAutoRenew(id); showToast('Auto-renew toggled'); loadSubs(); } catch { showToast('Failed', 'error'); } }

    // Group plans by type for display
    const careP = plans.filter(p => p.planType === 'CARE').sort((a, b) => a.sortOrder - b.sortOrder);
    const homeP = plans.filter(p => p.planType === 'HOMEMAKER').sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <div>
            <div className="page-header">
                <h2>Plans & Subscriptions</h2>
                <p>Manage pricing plans, benefits, and user subscriptions</p>
            </div>

            <div className="tabs mb-6">
                {["plans", "subscriptions"].map(t => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t === 'plans' ? 'Plans & Benefits' : 'Subscribed Members'}
                    </button>
                ))}
            </div>

            {/* ─── Plans Tab ─── */}
            {activeTab === "plans" && (
                <>
                    <div className="filter-bar" style={{ marginBottom: 24 }}>
                        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Plan</button>
                        <p className="text-sm text-muted" style={{ margin: 0 }}>
                            Tip: Use &quot;Benefits&quot; panel per plan to add/edit/delete service entitlements. Benefit codes and billing cycles are fixed.
                        </p>
                    </div>

                    {loading ? <p className="text-muted">Loading plans…</p> : (
                        <>
                            {/* CARE Section */}
                            {careP.length > 0 && (
                                <div style={{ marginBottom: 32 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 14 }}>
                                        🩺 Care Plans
                                    </h3>
                                    {careP.map(p => (
                                        <PlanCard key={p.id} plan={p}
                                            onEdit={openEdit}
                                            onDelete={deletePlan}
                                            onToggleVisibility={handleToggleVisibility}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* HOMEMAKER Section */}
                            {homeP.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 14 }}>
                                        🏠 Home Essential Plans
                                    </h3>
                                    {homeP.map(p => (
                                        <PlanCard key={p.id} plan={p}
                                            onEdit={openEdit}
                                            onDelete={deletePlan}
                                            onToggleVisibility={handleToggleVisibility}
                                        />
                                    ))}
                                </div>
                            )}

                            {plans.length === 0 && <p className="text-muted">No plans yet. Click &quot;Add Plan&quot; to create one.</p>}
                        </>
                    )}
                </>
            )}

            {/* ─── Subscriptions Tab ─── */}
            {activeTab === "subscriptions" && (
                <div className="card">
                    <div className="card-header"><h3>All Subscriptions</h3></div>
                    <div className="filter-bar" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['ALL', 'ACTIVE', 'PAUSED', 'EXPIRING', 'EXPIRED', 'CANCELLED'].map(status => (
                            <button key={status} onClick={() => setSubFilter(status)}
                                className={`btn btn-sm ${subFilter === status ? 'btn-primary' : 'btn-secondary'}`}>{status}</button>
                        ))}
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>User</th><th>Plan</th><th>Cycle</th><th>Start</th><th>Expiry</th><th>Amount</th><th>Status</th><th>Auto-Renew</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredSubs.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.user?.name || '—'}</td>
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
                                {filteredSubs.length === 0 && (
                                    <tr><td colSpan={9} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                                        No subscriptions{subFilter !== 'ALL' ? ` with status ${subFilter}` : ''}.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── Plan Edit/Add Modal ─── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>{editing ? 'Edit Plan' : 'Add Plan'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Plan Name *</label>
                                    <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ayuxa Lifeline" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description shown to users" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plan Type *</label>
                                        <select className="form-input" value={form.planType}
                                            onChange={e => setForm({ ...form, planType: e.target.value, maxConcurrent: e.target.value === 'CARE' ? 4 : 2 })}
                                        >
                                            <option value="CARE">CARE — Health &amp; Medical</option>
                                            <option value="HOMEMAKER">HOMEMAKER — Home Essential</option>
                                        </select>
                                        <p className="text-sm text-muted" style={{ marginTop: 3 }}>Plan types are fixed and cannot be added.</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Max Concurrent Slots</label>
                                        <input className="form-input" type="number" min={1} max={10} value={form.maxConcurrent} onChange={e => setForm({ ...form, maxConcurrent: parseInt(e.target.value) || 1 })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Display Order</label>
                                        <input className="form-input" type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>

                                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: 8, marginBottom: 10 }}>
                                    Pricing — fetched dynamically by mobile app
                                </p>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Quarterly (₹) *</label>
                                        <input className="form-input" type="number" min={0} value={form.quarterlyPrice} onChange={e => setForm({ ...form, quarterlyPrice: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Biannual (₹) *</label>
                                        <input className="form-input" type="number" min={0} value={form.biannualPrice} onChange={e => setForm({ ...form, biannualPrice: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yearly (₹) *</label>
                                        <input className="form-input" type="number" min={0} value={form.yearlyPrice} onChange={e => setForm({ ...form, yearlyPrice: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div className="form-group flex items-center gap-2">
                                    <input type="checkbox" id="isVisible" checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                                    <label htmlFor="isVisible">Visible to users in mobile app</label>
                                </div>
                                {editing && (
                                    <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                                        💡 Benefits are managed separately — expand &quot;Benefits&quot; on the plan card after saving.
                                    </p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update Plan' : 'Create Plan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
