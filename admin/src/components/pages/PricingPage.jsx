"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Settings, AlertTriangle } from "lucide-react";
import { serviceAPI, serviceChargeAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

// Real service categories only (matches live Service.category values) —
// the old dropdown mixed these with every service slug and 15 hardcoded
// guesses, which is how 51 charge rows piled up for 21 real services.
const CATEGORIES = [
    { value: "HOME_ESSENTIALS", label: "🏠 Home Essentials" },
    { value: "DIAGNOSTICS_FITNESS", label: "📊 Diagnostics & Fitness" },
    { value: "TOURS_TRAVEL", label: "✈️ Tours & Travel" },
    { value: "CARE", label: "🏥 Care" },
];

// Categories that get their own highlighted, explained pricing block instead
// of a plain grouped card — per client spec items 5.2/5.3 asking for a
// "dedicated" pricing section with specific fee terminology, not just a
// category filter on the same generic table.
const DEDICATED_SECTIONS = {
    DIAGNOSTICS_FITNESS: {
        badge: "Diagnostic Pricing",
        description: (
            <>
                Dedicated pricing rules for diagnostic &amp; fitness services. <strong>Service Provider Fee</strong> is what
                the provider/lab charges (fixed, or fetched live from Redcliffe for lab tests); <strong>Ayuxa Booking Fee</strong> and
                {' '}<strong>Platform Fee</strong> are Ayuxa&apos;s own charges; <strong>Total Customer Payable</strong> is what the
                customer actually pays after tax.
            </>
        ),
    },
    HOME_ESSENTIALS: {
        badge: "Home Essentials Pricing",
        description: (
            <>
                Dedicated pricing rules for Home Essentials services. Supports fixed prices, <strong>variable prices</strong> (per-option
                pricing configured on the service&apos;s form — edit the service and add a priced Radio/Dropdown field), and{' '}
                <strong>request-based</strong> services (Checkout Group D, no fixed price). <strong>Service Provider Fee</strong> is the
                vendor&apos;s charge, <strong>Ayuxa Booking/Platform Fee</strong> are Ayuxa&apos;s own charges, and{' '}
                <strong>Total Customer Payable</strong> is the final amount after tax.
            </>
        ),
    },
    TOURS_TRAVEL: {
        badge: "Tours & Travel Pricing",
        description: (
            <>
                Dedicated pricing rules for Tours & Travel services and packages — covers both existing services and any
                newly created ones. Supports fixed prices, <strong>variable prices</strong> (per-option pricing on the service&apos;s
                form), and <strong>request-based</strong> services (Payment Mode: INQUIRY, no fixed price — e.g. Trip &amp; Travels
                today). <strong>Service Provider Fee</strong> is the vendor/partner&apos;s charge, <strong>Ayuxa Booking/Platform Fee</strong> are
                Ayuxa&apos;s own charges, and <strong>Total Customer Payable</strong> is the final amount after tax.
            </>
        ),
    },
};

// Any category that shows up live but isn't one of the ones above (e.g. a
// future "FITNESS" or "TECH_HELP" category created from the admin's Add
// Service flow) still gets the same dedicated treatment automatically —
// per spec 5.5's "must accommodate future categories without redesigning
// the entire Pricing Engine," this is a lookup fallback, not a rewrite.
function getDedicatedSection(catKey) {
    if (DEDICATED_SECTIONS[catKey]) return DEDICATED_SECTIONS[catKey];
    const knownLabel = CATEGORIES.find(c => c.value === catKey)?.label;
    if (knownLabel) return null; // one of the 4 original categories with no custom copy — plain card is fine
    const niceName = catKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return {
        badge: `${niceName} Pricing`,
        description: (
            <>
                Dedicated pricing rules for {niceName} services — supports fixed prices, <strong>variable prices</strong> (per-option
                pricing on the service&apos;s form), <strong>request-based</strong> services (Payment Mode: INQUIRY), and separate{' '}
                <strong>Online</strong> / <strong>Offline Service Fees</strong> where applicable. <strong>Service Provider Fee</strong> is
                the vendor&apos;s charge, <strong>Ayuxa Booking/Platform Fee</strong> are Ayuxa&apos;s own charges, and{' '}
                <strong>Total Customer Payable</strong> is the final amount after tax.
            </>
        ),
    };
}

export default function PricingPage() {
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
        isActive: true,
        isRequestBased: false,
        hasOnlineOffline: false,
        onlineServiceFee: "",
        offlineServiceFee: "",
        changeReason: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [sRes, cRes] = await Promise.all([
                serviceAPI.getAll(),
                serviceChargeAPI.getAll()
            ]);
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
            isActive: true,
            isRequestBased: false,
            hasOnlineOffline: false,
            onlineServiceFee: "",
            offlineServiceFee: ""
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
            isActive: charge.isActive,
            isRequestBased: !!charge.isRequestBased,
            hasOnlineOffline: charge.onlineServiceFee != null || charge.offlineServiceFee != null,
            onlineServiceFee: charge.onlineServiceFee ?? "",
            offlineServiceFee: charge.offlineServiceFee ?? "",
            changeReason: ""
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                onlineServiceFee: form.hasOnlineOffline && form.onlineServiceFee !== "" ? form.onlineServiceFee : null,
                offlineServiceFee: form.hasOnlineOffline && form.offlineServiceFee !== "" ? form.offlineServiceFee : null,
            };
            if (editingCharge) {
                await serviceChargeAPI.update(editingCharge.id, payload);
                showToast("Service charge configuration updated successfully");
            } else {
                await serviceChargeAPI.create(payload);
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

    // Dropdown only ever offers the real categories plus one option per real,
    // enabled service (keyed by slug) — no more guessed/free-typed category
    // strings, which is how the old table piled up duplicates like AC_REPAIR
    // vs AC_REPAIR_ or five different tours/travel spellings.
    function getDropdownCategories() {
        const list = [...CATEGORIES];
        services.filter(s => s.isEnabled).forEach(s => {
            if (!s.slug) return;
            const key = s.slug.toUpperCase().replace(/-/g, '_');
            if (list.some(item => item.value === key)) return;
            const iconVal = (s.icon && s.icon.trim().length <= 4) ? s.icon : '🔹';
            list.push({ value: key, label: `${iconVal} ${s.name}` });
        });
        return list;
    }

    function getCategoryLabel(val) {
        const cat = CATEGORIES.find(c => c.value === val);
        if (cat) return cat.label;
        const dynamicCat = getDropdownCategories().find(c => c.value === val);
        return dynamicCat ? dynamicCat.label : val;
    }

    // Group charge rows for display: a CATEGORY-scope row groups under its own
    // category value directly; a SERVICE/SERVICE_TYPE row groups under its
    // matched/covered service's real category, falling back to "Other" only
    // when no live service maps to it at all (e.g. a stale row).
    function resolveGroupCategory(charge) {
        if (charge.scope === 'CATEGORY' && CATEGORIES.some(c => c.value === charge.serviceCategory)) {
            return charge.serviceCategory;
        }
        const svc = charge.matchedService || charge.coveredServices?.[0];
        if (svc?.category) return svc.category;
        const fullSvc = services.find(s => s.slug?.toUpperCase().replace(/-/g, '_') === charge.serviceCategory);
        return fullSvc?.category || 'OTHER';
    }
    function groupedCharges() {
        const groups = {};
        serviceCharges.forEach(c => {
            const cat = resolveGroupCategory(c);
            groups[cat] = groups[cat] || [];
            groups[cat].push(c);
        });
        return groups;
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

    // Diagnostic categories: the Service Fee (test price) is fetched live from the
    // Redcliffe Labs API per package, NOT from this table. Only the Ayuxa Booking
    // Fee / Platform Fee / Tax below are editable here.
    const DIAGNOSTIC_CATEGORIES = ['BLOOD_TEST', 'SCAN_ECG', 'DIAGNOSTICS_FITNESS'];
    const isDiagnostic = (cat) => DIAGNOSTIC_CATEGORIES.includes((cat || '').toUpperCase());
    const hasDiagnosticRow = serviceCharges.some(c => isDiagnostic(c.serviceCategory));

    // Mirrors buildFeeBreakdown's math (backend/src/utils/feeBreakdown.js) so
    // the admin preview matches what checkout actually charges the customer.
    // Diagnostics use the live Base Price (Redcliffe/matched service) as the
    // service fee when this row's own Service Provider Fee doesn't apply.
    function computeTotalPayable(charge) {
        const serviceFee = isDiagnostic(charge.serviceCategory)
            ? (charge.matchedService?.basePrice || 0)
            : (charge.serviceFee || 0);
        const extras = (charge.bookingFee || 0) + (charge.platformFee || 0) + (charge.convenienceFee || 0) +
            (charge.emergencyFee || 0) + (charge.visitFee || 0) + (charge.nightCharge || 0) + (charge.surgeCharge || 0);
        const taxable = serviceFee + extras;
        const tax = Math.round(taxable * ((charge.taxPercentage || 0) / 100) * 100) / 100;
        return serviceFee + extras + tax;
    }

    if (loading) return <div className="page-header"><h2>Loading Pricing Engine...</h2></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Pricing Engine</h2>
                <p>AYUXA fee rules, organized by service category. Subscription plans live under Plans &amp; Subscriptions.</p>
            </div>

            <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ color: "var(--text-secondary)" }}>
                    <Settings size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Configure Dynamic Service Charge Rules
                </h4>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={16} /> Set Service Charge
                </button>
            </div>

            {conflictCount > 0 && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius-md)" }}>
                    <AlertTriangle size={18} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        <strong>{conflictCount} row{conflictCount === 1 ? '' : 's'}</strong> have a Service Provider Fee that disagrees with this service&apos;s live Base Price (shown in the Base Price column below, flagged with ⚠). These are read-only for now — no number has been changed automatically. Resolving them is a future step.
                    </div>
                </div>
            )}

            {hasDiagnosticRow && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "var(--radius-md)" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>🩸</span>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        <strong>Blood Test / Diagnostics — Service Fee is partner-controlled.</strong> The
                        test price (Service Fee) is fetched live from the <strong>Redcliffe Labs API</strong> per
                        package at checkout — it is <strong>not</strong> read from this table and any value entered
                        in the Service Provider Fee field is ignored for these categories. You can still edit the
                        <strong> Ayuxa Booking Fee</strong>, <strong>Ayuxa Platform Fee</strong> and <strong>Tax</strong>,
                        which apply on top of the Redcliffe price.
                    </div>
                </div>
            )}

            {serviceCharges.length === 0 ? (
                <div className="card"><div className="card-body" style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                    No service charges configured yet. Click &quot;Set Service Charge&quot; to create one.
                </div></div>
            ) : (
                Object.entries(groupedCharges())
                    .sort(([a], [b]) => (getDedicatedSection(a) ? -1 : getDedicatedSection(b) ? 1 : 0))
                    .map(([catKey, charges]) => {
                    const dedicated = getDedicatedSection(catKey);
                    return (
                    <div key={catKey} className="card" style={{ marginBottom: 20, border: dedicated ? "1px solid rgba(59,130,246,0.35)" : undefined }}>
                        <div className="card-header">
                            <h3>
                                {CATEGORIES.find(c => c.value === catKey)?.label || `📁 ${catKey.replace(/_/g, ' ')}`}
                                {dedicated && <span className="badge badge-info" style={{ marginLeft: 10, fontWeight: 600 }}>{dedicated.badge}</span>}
                            </h3>
                            <span className="text-sm text-muted">{charges.length} rule{charges.length === 1 ? '' : 's'}</span>
                        </div>
                        {dedicated && (
                            <div style={{ padding: "10px 20px", fontSize: 12.5, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                                {dedicated.description}
                            </div>
                        )}
                        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Service</th>
                                        <th>Scope</th>
                                        <th>Service Provider Fee</th>
                                        <th>Base Price <span className="text-sm text-muted">(read-only)</span></th>
                                        <th>Ayuxa Booking Fee</th>
                                        <th>Ayuxa Platform Fee</th>
                                        <th>Tax (GST)</th>
                                        {dedicated && <th>Total Customer Payable</th>}
                                        <th>Subscription waiver</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {charges.map(charge => (
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
                                            <td>
                                                {isDiagnostic(charge.serviceCategory) ? (
                                                    <span
                                                        className="badge badge-info"
                                                        title="Fetched live from the Redcliffe Labs API per test package — this field is ignored for diagnostics"
                                                    >
                                                        Redcliffe API
                                                    </span>
                                                ) : charge.isRequestBased ? (
                                                    <span className="badge badge-warning" title="No fixed price — vendor quotes on inquiry">Request-based</span>
                                                ) : formatCurrency(charge.serviceFee || 0)}
                                                {(charge.onlineServiceFee != null || charge.offlineServiceFee != null) && (
                                                    <div className="text-sm text-muted" style={{ fontWeight: 400, marginTop: 2 }}>
                                                        {charge.onlineServiceFee != null && <>Online: {formatCurrency(charge.onlineServiceFee)}</>}
                                                        {charge.onlineServiceFee != null && charge.offlineServiceFee != null && ' · '}
                                                        {charge.offlineServiceFee != null && <>Offline: {formatCurrency(charge.offlineServiceFee)}</>}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {isDiagnostic(charge.serviceCategory)
                                                    ? <span className="text-muted" title="Not applicable — price comes from Redcliffe">—</span>
                                                    : <>
                                                        {charge.hasConflict && <span title="Disagrees with Service Provider Fee — see banner above">⚠️ </span>}
                                                        {charge.matchedService?.basePrice != null
                                                            ? formatCurrency(charge.matchedService.basePrice)
                                                            : <span className="text-muted">—</span>}
                                                    </>}
                                            </td>
                                            <td>{formatCurrency(charge.bookingFee)}</td>
                                            <td>{formatCurrency(charge.platformFee)}</td>
                                            <td><span className="badge badge-default">{charge.taxPercentage}%</span></td>
                                            {dedicated && (
                                                <td style={{ fontWeight: 700, color: "var(--accent-primary-light)" }}>
                                                    {charge.isRequestBased
                                                        ? <span className="text-muted" style={{ fontWeight: 400 }} title="Quoted after provider responds to the request">On request</span>
                                                        : formatCurrency(computeTotalPayable(charge))}
                                                    {charge.matchedService?.formFieldsJson?.sections?.[0]?.fields?.some(f => (f.options || []).some(o => typeof o.price === 'number')) && (
                                                        <div className="text-sm text-muted" style={{ fontWeight: 400 }} title="This service has per-option pricing configured in its form builder">
                                                            Variable — see options
                                                        </div>
                                                    )}
                                                </td>
                                            )}
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    );
                })
            )}

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

                                {!isDiagnostic(form.serviceCategory) && (
                                    <div className="form-group flex items-center gap-2" style={{ marginBottom: 12 }}>
                                        <input
                                            type="checkbox"
                                            id="isRequestBasedCheckbox"
                                            checked={form.isRequestBased}
                                            onChange={e => setForm({ ...form, isRequestBased: e.target.checked })}
                                        />
                                        <label htmlFor="isRequestBasedCheckbox" style={{ cursor: "pointer" }}>
                                            Request-based (no fixed price — vendor quotes on inquiry)
                                        </label>
                                    </div>
                                )}

                                {!isDiagnostic(form.serviceCategory) && !form.isRequestBased && (
                                    <div className="form-group flex items-center gap-2" style={{ marginBottom: 12 }}>
                                        <input
                                            type="checkbox"
                                            id="hasOnlineOfflineCheckbox"
                                            checked={form.hasOnlineOffline}
                                            onChange={e => setForm({ ...form, hasOnlineOffline: e.target.checked })}
                                        />
                                        <label htmlFor="hasOnlineOfflineCheckbox" style={{ cursor: "pointer" }}>
                                            This service has separate Online / Offline fees
                                        </label>
                                    </div>
                                )}

                                {form.hasOnlineOffline && !isDiagnostic(form.serviceCategory) && !form.isRequestBased && (
                                    <div className="form-row" style={{ marginBottom: 4 }}>
                                        <div className="form-group">
                                            <label className="form-label">Online Service Fee (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                step="0.01"
                                                placeholder="e.g. remote/video session rate"
                                                value={form.onlineServiceFee}
                                                onChange={e => setForm({ ...form, onlineServiceFee: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Offline Service Fee (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                step="0.01"
                                                placeholder="e.g. in-person visit rate"
                                                value={form.offlineServiceFee}
                                                onChange={e => setForm({ ...form, offlineServiceFee: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Service Provider Fee / Base Price (₹) {!isDiagnostic(form.serviceCategory) && !form.isRequestBased ? '*' : ''}</label>
                                        {isDiagnostic(form.serviceCategory) ? (
                                            <p className="text-sm" style={{ marginTop: -2, marginBottom: 4, color: "#3B82F6" }}>
                                                🩸 Ignored for diagnostics — the test price is fetched live from the Redcliffe Labs API per package.
                                            </p>
                                        ) : form.isRequestBased ? (
                                            <p className="text-sm" style={{ marginTop: -2, marginBottom: 4, color: "#F59E0B" }}>
                                                No fixed price — shown as &quot;Request-based&quot; instead of a fee.
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted" style={{ marginTop: -2, marginBottom: 4 }}>Set by the vendor/provider — never waived by a subscription plan.</p>
                                        )}
                                        <input
                                            type="number"
                                            className="form-input"
                                            required={!isDiagnostic(form.serviceCategory) && !form.isRequestBased}
                                            disabled={isDiagnostic(form.serviceCategory) || form.isRequestBased}
                                            min="0"
                                            step="0.01"
                                            value={isDiagnostic(form.serviceCategory) || form.isRequestBased ? '' : form.serviceFee}
                                            placeholder={isDiagnostic(form.serviceCategory) ? 'From Redcliffe API' : form.isRequestBased ? 'Request-based' : undefined}
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

                                {editingCharge && (
                                    <div className="form-group" style={{ marginTop: 12 }}>
                                        <label className="form-label">Reason for change (optional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Seasonal discount, vendor rate change..."
                                            value={form.changeReason}
                                            onChange={e => setForm({ ...form, changeReason: e.target.value })}
                                        />
                                    </div>
                                )}
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
