"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Edit2, ToggleLeft, ToggleRight, Settings, ArrowUp, ArrowDown
} from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

/**
 * Core Services — toggle/reorder/reprice for the hardcoded, non-dynamic
 * Service rows that back native mobile screens (doctor-visit, blood-test,
 * physio-fitness, hospital-trip, insurance, etc). Extracted out of the old
 * "Service Management" page (ServicesPage.jsx) so this control surface
 * survives that page's removal — these Service rows remain shared
 * infrastructure the mobile app depends on directly.
 *
 * This intentionally does NOT include the Dynamic Service Creator (that's
 * per-module now: Home Essentials / Diagnostic & Fitness / Tours & Travel)
 * — core services have no formFieldsJson to edit, only pricing/visibility.
 */
export default function CoreServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [form, setForm] = useState({ basePrice: 0, pricingText: "", isEnabled: true, changeReason: "" });

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceAPI.getAll();
            const all = res.data?.data || [];
            const core = all.filter(s => !s.isDynamic);
            setServices(core.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (e) {
            console.error(e);
            showToast("Failed to load services", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadServices(); }, [loadServices]);

    const handleToggle = async (s) => {
        try {
            await serviceAPI.update(s.id, { isEnabled: !s.isEnabled });
            showToast(`Service ${s.isEnabled ? "disabled" : "enabled"} successfully`, "success");
            loadServices();
        } catch (e) {
            console.error(e);
            showToast("Failed to toggle service status", "error");
        }
    };

    const handleReorder = async (service, direction) => {
        const ordered = [...services].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = ordered.findIndex(s => s.id === service.id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;

        [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];

        try {
            await serviceAPI.reorder({ orderedIds: ordered.map(s => s.id) });
            loadServices();
        } catch (e) {
            console.error(e);
            showToast("Failed to reorder services", "error");
        }
    };

    const openEdit = (s) => {
        setEditingService(s);
        setForm({
            basePrice: s.basePrice !== null && s.basePrice !== undefined ? s.basePrice : 0,
            pricingText: s.pricingText || "",
            isEnabled: s.isEnabled ?? true,
            changeReason: ""
        });
        setShowModal(true);
    };

    const isBloodTestService = editingService?.slug === "blood-test" || editingService?.route === "/blood-test";

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await serviceAPI.update(editingService.id, {
                basePrice: isBloodTestService ? undefined : (parseFloat(form.basePrice) || 0),
                pricingText: form.pricingText,
                isEnabled: form.isEnabled,
                changeReason: form.changeReason,
            });
            showToast("Service updated successfully", "success");
            setShowModal(false);
            loadServices();
        } catch (err) {
            showToast(err.response?.data?.message || "Operation failed", "error");
        }
    };

    if (loading && services.length === 0) return (
        <div className="loading-state" style={{ textAlign: "center", padding: "100px 0", color: "var(--text-muted)" }}>
            <p>Loading core services...</p>
        </div>
    );

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="header-icon-box" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Settings size={24} className="text-success" />
                </div>
                <div>
                    <h2>Core Services</h2>
                    <p>Toggle visibility, reorder, and reprice the built-in native mobile screens (doctor visit, blood test, physio, hospital trip, insurance, etc). These are not form-builder driven — see Home Essentials, Diagnostic &amp; Fitness, or Tours &amp; Travel to create new dynamic services.</p>
                </div>
            </div>

            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {services.map(s => (
                    <div key={s.id} className="card" style={{
                        borderColor: s.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)",
                        display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%"
                    }}>
                        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
                                <span style={{ fontSize: 20 }}>
                                    {s.icon ? (isEmoji(s.icon) ? s.icon : <img src={s.icon} alt={s.name} style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover" }} />) : "🩺"}
                                </span>
                                {s.name}
                            </h3>
                            <span className={`badge ${s.isEnabled ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 10 }}>
                                {s.isEnabled ? 'Live' : 'Disabled'}
                            </span>
                        </div>
                        <div className="card-body" style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 12 }}>
                                <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Slug</div><div style={{ fontWeight: 600 }}>/{s.slug}</div></div>
                                <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Base Price</div><div style={{ fontWeight: 700, color: "var(--accent-primary-light)" }}>₹{s.basePrice}</div></div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                                <button className="btn btn-sm btn-secondary" style={{ padding: "6px 8px" }} title="Move up" onClick={() => handleReorder(s, "up")}><ArrowUp size={13} /></button>
                                <button className="btn btn-sm btn-secondary" style={{ padding: "6px 8px" }} title="Move down" onClick={() => handleReorder(s, "down")}><ArrowDown size={13} /></button>
                                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(s)}><Edit2 size={13} style={{ marginRight: 4 }} /> Edit</button>
                                <button className={`btn btn-sm ${s.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(s)}>
                                    {s.isEnabled ? <><ToggleRight size={13} /> Disable</> : <><ToggleLeft size={13} /> Enable</>}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay active" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit {editingService?.name}</h3>
                            <button onClick={() => setShowModal(false)} className="close-x">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                {isBloodTestService && (
                                    <div style={{ marginBottom: 16, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#2563EB" }}>
                                        🩸 Blood Test Service Fee is set live by the Redcliffe Labs API per package and cannot be edited here.
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">{isBloodTestService ? "Service Fee — set by Redcliffe API" : "Base Price (₹)"}</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min={0}
                                        disabled={isBloodTestService}
                                        value={isBloodTestService ? "" : form.basePrice}
                                        onChange={e => setForm({ ...form, basePrice: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pricing Subtext</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.pricingText}
                                        onChange={e => setForm({ ...form, pricingText: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reason for change (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Seasonal discount, vendor rate change..."
                                        value={form.changeReason}
                                        onChange={e => setForm({ ...form, changeReason: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                                    <input
                                        type="checkbox"
                                        id="coreIsEnabled"
                                        checked={form.isEnabled}
                                        onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                                    />
                                    <label htmlFor="coreIsEnabled" style={{ margin: 0 }}>Publish Service (Make Live)</label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
