"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, HeartPulse } from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import DynamicServiceFormModal from "@/components/common/DynamicServiceFormModal";
import ServiceCategoryTab from "@/components/common/ServiceCategoryTab";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

/**
 * Diagnostic & Fitness — additive-only new home for simple dynamic
 * diagnostic/fitness services (e.g. Health Checkups). Forked from the
 * Home Essentials page pattern: Service CRUD (via the shared Dynamic
 * Service Creator modal, category=DIAGNOSTICS_FITNESS) + a Category CRUD
 * tab (ServiceCategory, module=DIAGNOSTICS_FITNESS).
 *
 * Does NOT touch Blood Test / Insurance screens or their Service rows —
 * those keep their existing specialized flows untouched. Mobile needs no
 * new code: mobile/app/all-ayuxa-services/index.tsx already renders any
 * isDynamic + isEnabled + category === "DIAGNOSTICS_FITNESS" service via
 * the generic mobile/app/dynamic-service/[slug].tsx renderer.
 */
export default function DiagnosticFitnessPage() {
    const [activeTab, setActiveTab] = useState("services");
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceAPI.getAll();
            const all = res.data?.data || [];
            const filtered = all.filter(s => s.category === "DIAGNOSTICS_FITNESS");
            setServices(filtered.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (e) {
            console.error(e);
            showToast("Failed to load services", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadServices(); }, [loadServices]);

    const filteredServices = searchQuery.trim()
        ? services.filter(s =>
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.slug?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : services;

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

    const handleDelete = async (s, isForce = false) => {
        if (!isForce && !confirm(`Are you sure you want to delete "${s.name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            const res = await serviceAPI.delete(s.id, { force: isForce });
            if (res.data?.success === false) {
                if (confirm(`${res.data.message}`)) {
                    handleDelete(s, true);
                }
            } else {
                showToast("Service deleted successfully", "success");
            }
            loadServices();
        } catch (e) {
            console.error(e);
            const errMsg = e.response?.data?.message || "Failed to delete service. Active bookings might exist.";
            showToast(errMsg, "error");
            loadServices();
        }
    };

    const openAdd = () => {
        setEditingService(null);
        setShowModal(true);
    };

    const openEdit = (s) => {
        setEditingService(s);
        setShowModal(true);
    };

    if (loading && services.length === 0) {
        return <div className="page-header"><h2>Loading Diagnostic & Fitness services...</h2></div>;
    }

    return (
        <div>
            <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="header-icon-box" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HeartPulse size={24} className="text-success" />
                </div>
                <div>
                    <h2>Diagnostic & Fitness</h2>
                    <p>Manage new dynamic diagnostic and fitness services (e.g. Health Checkups). Blood Test and Insurance keep their own dedicated flows and are not managed here.</p>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, margin: "20px 0", borderBottom: "1px solid var(--border-color)" }}>
                <button className={`btn btn-sm ${activeTab === "services" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("services")}>Services</button>
                <button className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("categories")}>Categories</button>
            </div>

            {activeTab === "categories" ? (
                <ServiceCategoryTab module="DIAGNOSTICS_FITNESS" />
            ) : (
                <>
                    <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                        <div style={{ position: "relative", flex: 1, minWidth: 280, display: "flex", alignItems: "center" }}>
                            <Search size={18} className="text-muted" style={{ position: "absolute", left: 12 }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: 38, margin: 0, height: 40 }}
                                placeholder="Search by name or slug..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={openAdd}>
                            <Plus size={16} /> Add Service
                        </button>
                    </div>

                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {filteredServices.length === 0 ? (
                            <p className="text-muted">No Diagnostic & Fitness services yet.</p>
                        ) : filteredServices.map(s => (
                            <div key={s.id} className="card" style={{ borderColor: s.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
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
                                        <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(s)}>
                                            <Edit2 size={13} style={{ marginRight: 4 }} /> Edit
                                        </button>
                                        <button className={`btn btn-sm ${s.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(s)}>
                                            {s.isEnabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                        </button>
                                        <button className="btn btn-sm btn-danger" style={{ padding: "6px 8px" }} onClick={() => handleDelete(s)} title="Delete"><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DynamicServiceFormModal
                        open={showModal}
                        onClose={() => setShowModal(false)}
                        onSaved={loadServices}
                        editingService={editingService}
                        category="DIAGNOSTICS_FITNESS"
                        defaultSortOrder={services.length + 1}
                    />
                </>
            )}
        </div>
    );
}
