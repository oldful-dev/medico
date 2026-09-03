"use client";
import { useState, useEffect } from "react";
import { DollarSign, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Settings, Sparkles, AlertTriangle } from "lucide-react";
import { planAPI, serviceAPI, serviceChargeAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

const CATEGORIES = [
    { value: "DOCTOR_HOME_VISIT", label: "🩺 Doctor Home Visit" },
    { value: "BLOOD_TEST", label: "🩸 Blood Test (Diagnostics)" },
    { value: "HOME_NURSE", label: "👩‍⚕️ Home Nurse Care" },
    { value: "PLUMBING_ELECTRICAL", label: "🚰 Plumbing & Electrical" },
    { value: "HOSPITAL_TRIP", label: "🏥 Hospital Trip" },
    { value: "INSURANCE", label: "🛡️ Insurance" },
    { value: "MEDICINES", label: "💊 Medicines Delivery" },
    { value: "PHYSIO_FITNESS", label: "🏋️ Physio & Fitness" },
    { value: "EQUIPMENT_RENTAL", label: "🦽 Medical Equipment Rental" },
    { value: "TIFFIN", label: "🍱 Meal / Tiffin Service" },
    { value: "TECH_HELPER", label: "💻 Tech Helper" },
    { value: "HOME_ESSENTIALS", label: "🏠 Home Essentials" },
    { value: "CLUB_EVENTS", label: "🎭 Club & Events" },
    { value: "DIAGNOSTICS_FITNESS", label: "📊 Care & Diagnostics" },
    { value: "OTHER", label: "❓ Other Services" }
];

export default function PricingPage() {
    const [activeTab, setActiveTab] = useState("plans");
    const [plans, setPlans] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceCharges, setServiceCharges] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCharge, setEditingCharge] = useState(null);
    const [form, setForm] = useState({
        serviceCategory: "DOCTOR_HOME_VISIT",
        serviceFee: 0,
        bookingFee: 0,
        platformFee: 0,
        convenienceFee: 0,
        emergencyFee: 0,
        visitFee: 0,
        nightCharge: 0,
        surgeCharge: 0,
        taxPercentage: 0,
        isSubscriptionEligible: true,
        isActive: true
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [pRes, sRes, cRes] = await Promise.all([
                planAPI.getAll(),
                serviceAPI.getAll(),
                serviceChargeAPI.getAll()
            ]);
            setPlans(pRes.data?.data || []);
            setServices(sRes.data?.data || []);
            setServiceCharges(cRes.data?.data || []);
        } catch (e) {
            console.error("Pricing data load failed:", e);
        } finally {
            setLoading(false);
        }
    }

    async function reloadServiceCharges() {
        try {
            const res = await serviceChargeAPI.getAll();
            setServiceCharges(res.data?.data || []);
        } catch (e) {
            console.error(e);
        }
    }

    function openAdd() {
        setEditingCharge(null);
        setForm({
            serviceCategory: "DOCTOR_HOME_VISIT",
            serviceFee: 0,
            bookingFee: 0,
            platformFee: 0,
            convenienceFee: 0,
            emergencyFee: 0,
            visitFee: 0,
            nightCharge: 0,
            surgeCharge: 0,
            taxPercentage: 0,
            isSubscriptionEligible: true,
            isActive: true
        });
        setShowModal(true);
    }

    function openEdit(charge) {
        setEditingCharge(charge);
        setForm({
            serviceCategory: charge.serviceCategory,
            serviceFee: charge.serviceFee || 0,
            bookingFee: charge.bookingFee,
            platformFee: charge.platformFee,
            convenienceFee: charge.convenienceFee,
            emergencyFee: charge.emergencyFee,
            visitFee: charge.visitFee,
            nightCharge: charge.nightCharge,
            surgeCharge: charge.surgeCharge,
            taxPercentage: charge.taxPercentage,
            isSubscriptionEligible: charge.isSubscriptionEligible,
            isActive: charge.isActive
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingCharge) {
                await serviceChargeAPI.update(editingCharge.id, form);
                showToast("Service charge configuration updated successfully");
            } else {
                await serviceChargeAPI.create(form);
                showToast("Service charge configuration created successfully");
            }
            setShowModal(false);
            reloadServiceCharges();
        } catch (err) {
            showToast(err.response?.data?.message || "Operation failed", "error");
        }
    }

    async function toggleActive(charge) {
        try {
            await serviceChargeAPI.update(charge.id, { isActive: !charge.isActive });
            showToast(`Configuration for ${charge.serviceCategory} ${charge.isActive ? 'deactivated' : 'activated'}`);
            reloadServiceCharges();
        } catch (err) {
            showToast("Toggle active status failed", "error");
        }
    }

    async function toggleSubscription(charge) {
        try {
            await serviceChargeAPI.update(charge.id, { isSubscriptionEligible: !charge.isSubscriptionEligible });
            showToast(`Subscription eligibility for ${charge.serviceCategory} updated`);
            reloadServiceCharges();
        } catch (err) {
            showToast("Toggle subscription status failed", "error");
        }
    }

    async function handleDelete(charge) {
        if (!confirm(`Are you sure you want to delete the configuration for ${charge.serviceCategory}?`)) return;
        try {
            await serviceChargeAPI.delete(charge.id);
            showToast("Service charge configuration deleted");
            reloadServiceCharges();
        } catch (err) {
            showToast(err.response?.data?.message || "Delete failed", "error");
        }
    }

    function getDropdownCategories() {
        const list = [...CATEGORIES];
        services.forEach(s => {
            if (s.category && !list.some(item => item.value === s.category)) {
                list.push({
                    value: s.category,
                    label: `📂 Category: ${s.category.replace(/_/g, ' ')}`
                });
            }
            if (s.slug && !list.some(item => item.value === s.slug.toUpperCase().replace(/-/g, '_'))) {
                const iconVal = (s.icon && s.icon.trim().length <= 4) ? s.icon : '🩺';
                list.push({
                    value: s.slug.toUpperCase().replace(/-/g, '_'),
                    label: `${iconVal} Service: ${s.name}`
                });
            }
        });
        return list;
    }

    function getCategoryLabel(val) {
        const cat = CATEGORIES.find(c => c.value === val);
        if (cat) return cat.label;
        const dynamicCat = getDropdownCategories().find(c => c.value === val);
        return dynamicCat ? dynamicCat.label : val;
    }

    // ── Unified Pricing Console helpers (Slice 1 — read-only) ──
    function scopeLabel(scope) {
        if (scope === 'CATEGORY') return 'Category default';
        if (scope === 'SERVICE_TYPE') return 'Type default';
        return 'Service override';
    }
    function scopeBadgeClass(scope) {
        if (scope === 'CATEGORY') return 'badge-info';
        if (scope === 'SERVICE_TYPE') return 'badge-default';
        return 'badge-success';
    }
    function scopeTitle(scope) {
        if (scope === 'CATEGORY') return 'Shared default applied to every service in this category — editing it affects all of them.';
        if (scope === 'SERVICE_TYPE') return 'Shared default applied to every service of this type — editing it affects all of them.';
        return 'Applies to exactly one service.';
    }

    // Mirrors calculateCheckout's real 3-tier fallback cascade (checkout.controller.js
    // ~70-86): exact serviceCategory key → service.category → service.serviceType.
    // A ServiceCharge row's `scope` is only backfill metadata about how it was
    // classified — it does NOT limit which services checkout actually resolves it
    // for. A row scoped SERVICE (matched to one slug) can still be the row checkout
    // falls back to for a different service sharing the same category/serviceType
    // string (e.g. BLOOD_TEST covers both "blood-test" and "scan-ecg"). Using
    // scope to decide coverage — instead of the raw serviceCategory string — is
    // what caused scan-ecg to wrongly show as "no charge rule" earlier.
    const chargedServiceIds = new Set(serviceCharges.filter(c => c.serviceId).map(c => c.serviceId));
    const chargedCategoriesAndTypes = new Set(serviceCharges.map(c => c.serviceCategory));
    const unconfiguredServices = services.filter(s =>
        !chargedServiceIds.has(s.id) &&
        !chargedCategoriesAndTypes.has(s.category) &&
        !chargedCategoriesAndTypes.has(s.serviceType)
    );
    const conflictCount = serviceCharges.filter(c => c.hasConflict).length;

    if (loading) return <div className="page-header"><h2>Loading Pricing Engine...</h2></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Pricing Engine</h2>
                <p>Manage subscription plans, dynamic AYUXA fees, and reference pricing rules</p>
            </div>

            {/* Premium Tabs navigation */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <button
                    className={`btn ${activeTab === "plans" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveTab("plans")}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <DollarSign size={16} /> Homemaker Plans
                </button>
                <button
                    className={`btn ${activeTab === "charges" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveTab("charges")}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <Settings size={16} /> AYUXA Service Charges
                </button>
            </div>

            {/* TAB 1: PLANS AND SUBSCRIPTIONS */}
            {activeTab === "plans" && (
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {plans.map(p => (
                        <div key={p.id} className="card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))" }}>
                            <div className="card-header">
                                <h3>{p.name}</h3>
                                <span className={`badge ${p.isVisible ? 'badge-success' : 'badge-default'}`}>{p.isVisible ? 'Active' : 'Hidden'}</span>
                            </div>
                            <div className="card-body">
                                <p className="text-sm text-muted mb-4">{p.description || 'No description'}</p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, textAlign: "center" }}>
                                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                        <div className="text-sm text-muted">Quarterly</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-primary-light)" }}>{formatCurrency(p.quarterlyPrice)}</div>
                                        <div className="text-sm text-muted">/3 months</div>
                                    </div>
                                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                        <div className="text-sm text-muted">Biannual</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-success)" }}>{formatCurrency(p.biannualPrice)}</div>
                                        <div className="text-sm text-muted">/6 months</div>
                                    </div>
                                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                        <div className="text-sm text-muted">Yearly</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-warning)" }}>{formatCurrency(p.yearlyPrice)}</div>
                                        <div className="text-sm text-muted">/year</div>
                                    </div>
                                </div>
                                {p.benefits && <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.benefits}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 2: AYUXA DYNAMIC SERVICE CHARGES — merged with the former Service Price Reference tab */}
            {activeTab === "charges" && (
                <div>
                    <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ color: "var(--text-secondary)" }}>Configure Dynamic Service Charge Rules</h4>
                        <button className="btn btn-primary" onClick={openAdd}>
                            <Plus size={16} /> Set Service Charge
                        </button>
                    </div>

                    {conflictCount > 0 && (
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius-md)" }}>
                            <AlertTriangle size={18} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                <strong>{conflictCount} row{conflictCount === 1 ? '' : 's'}</strong> have a Vendor Service Fee that disagrees with this service&apos;s live Base Price (shown in the Base Price column below, flagged with ⚠). These are read-only for now — no number has been changed automatically. Resolving them is a future step.
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Service Category</th>
                                        <th>Scope</th>
                                        <th>Vendor Service Fee</th>
                                        <th>Base Price <span className="text-sm text-muted">(read-only)</span></th>
                                        <th>Ayuxa Booking Fee</th>
                                        <th>Ayuxa Platform Fee</th>
                                        <th>Tax (GST)</th>
                                        <th>Subscription waiver</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviceCharges.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                                                No service charges configured yet. Click &quot;Set Service Charge&quot; to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        serviceCharges.map(charge => (
                                            <tr key={charge.id} style={charge.hasConflict ? { background: "rgba(245,158,11,0.05)" } : undefined}>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                                    {getCategoryLabel(charge.serviceCategory)}
                                                    {charge.matchedService && (
                                                        <div className="text-sm text-muted" style={{ fontWeight: 400 }}>{charge.matchedService.name}</div>
                                                    )}
                                                    {charge.coveredServices?.length > 0 && (
                                                        <div className="text-sm text-muted" style={{ fontWeight: 400 }} title={charge.coveredServices.map(s => s.name).join(', ')}>
                                                            Covers {charge.coveredServices.length} service{charge.coveredServices.length === 1 ? '' : 's'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${scopeBadgeClass(charge.scope)}`} title={scopeTitle(charge.scope)}>
                                                        {scopeLabel(charge.scope)}
                                                    </span>
                                                </td>
                                                <td>{formatCurrency(charge.serviceFee || 0)}</td>
                                                <td>
                                                    {charge.hasConflict && <span title="Disagrees with Vendor Service Fee — see banner above">⚠️ </span>}
                                                    {charge.matchedService?.basePrice != null
                                                        ? formatCurrency(charge.matchedService.basePrice)
                                                        : <span className="text-muted">—</span>}
                                                </td>
                                                <td>{formatCurrency(charge.bookingFee)}</td>
                                                <td>{formatCurrency(charge.platformFee)}</td>
                                                <td><span className="badge badge-default">{charge.taxPercentage}%</span></td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleSubscription(charge)}
                                                        style={{ border: "none", background: "none", cursor: "pointer" }}
                                                        title="Click to toggle subscription benefit eligibility"
                                                    >
                                                        <span className={`badge ${charge.isSubscriptionEligible ? 'badge-success' : 'badge-warning'}`}>
                                                            {charge.isSubscriptionEligible ? 'Eligible (Waived)' : 'Non-Waivable'}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className={`badge ${charge.isActive ? 'badge-success' : 'badge-default'}`}>
                                                        {charge.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(charge)}>
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${charge.isActive ? 'btn-warning' : 'btn-success'}`}
                                                            onClick={() => toggleActive(charge)}
                                                        >
                                                            {charge.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(charge)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Services with no ServiceCharge row at all — still relying on hardcoded checkout fallbacks (₹299/₹50/18%) */}
                    {unconfiguredServices.length > 0 && (
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card-header"><h3>Services With No Charge Rule <span className="text-sm text-muted">(using hardcoded fallback fees)</span></h3></div>
                            <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Service</th>
                                            <th>Type</th>
                                            <th>Base Price</th>
                                            <th>Pricing Text</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unconfiguredServices.map(s => (
                                            <tr key={s.id}>
                                                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.icon} {s.name}</td>
                                                <td className="text-sm">{s.serviceType?.replace(/_/g, ' ')}</td>
                                                <td>{s.basePrice != null ? formatCurrency(s.basePrice) : <span className="text-muted">—</span>}</td>
                                                <td><span className="badge badge-success">{s.pricingText || '—'}</span></td>
                                                <td><span className={`badge ${s.isEnabled ? 'badge-success' : 'badge-default'}`}>{s.isEnabled ? 'Active' : 'Disabled'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL FOR CREATE/EDIT AYUXA SERVICE CHARGE */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingCharge ? 'Edit' : 'Set'} AYUXA Service Charge</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Service Category *</label>
                                    <select
                                        className="form-input"
                                        disabled={!!editingCharge}
                                        value={form.serviceCategory}
                                        onChange={e => setForm({ ...form, serviceCategory: e.target.value })}
                                        style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    >
                                        {getDropdownCategories().map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Vendor Service Fee / Base Price (₹) *</label>
                                        <p className="text-sm text-muted" style={{ marginTop: -2, marginBottom: 4 }}>Set by the vendor/provider — never waived by a subscription plan.</p>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={form.serviceFee}
                                            onChange={e => setForm({ ...form, serviceFee: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ayuxa Booking Fee (₹) *</label>
                                        <p className="text-sm text-muted" style={{ marginTop: -2, marginBottom: 4 }}>Ayuxa&apos;s own charge — can drop to ₹0 via a plan&apos;s fee waiver.</p>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={form.bookingFee}
                                            onChange={e => setForm({ ...form, bookingFee: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ayuxa Platform Fee (₹) *</label>
                                        <p className="text-sm text-muted" style={{ marginTop: -2, marginBottom: 4 }}>Ayuxa&apos;s own charge — can drop to ₹0 via a plan&apos;s fee waiver.</p>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={form.platformFee}
                                            onChange={e => setForm({ ...form, platformFee: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tax (GST) Percentage (%) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={form.taxPercentage}
                                            onChange={e => setForm({ ...form, taxPercentage: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Convenience Fee (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={form.convenienceFee}
                                            onChange={e => setForm({ ...form, convenienceFee: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Emergency Premium Fee (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={form.emergencyFee}
                                            onChange={e => setForm({ ...form, emergencyFee: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Visit Charge (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={form.visitFee}
                                            onChange={e => setForm({ ...form, visitFee: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Night Premium Charge (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={form.nightCharge}
                                            onChange={e => setForm({ ...form, nightCharge: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Surge Charge (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={form.surgeCharge}
                                            onChange={e => setForm({ ...form, surgeCharge: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group"></div>
                                </div>

                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <div className="form-group flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.isSubscriptionEligible}
                                            onChange={e => setForm({ ...form, isSubscriptionEligible: e.target.checked })}
                                        />
                                        <label>Subscription Waiver Eligible</label>
                                    </div>
                                    <div className="form-group flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                        />
                                        <label>Active</label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingCharge ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
