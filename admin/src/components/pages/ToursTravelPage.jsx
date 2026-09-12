"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, PartyPopper, Plane, ArrowRight } from "lucide-react";
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
 * Tours & Travel — a HUB page, per the decision that Meetup and Service
 * stay separate schemas. It links out to the existing (unchanged) /meetups
 * admin page, and separately manages Trips & Travels + any new
 * travel-package dynamic services (category=TOURS_TRAVEL) via the shared
 * Dynamic Service Creator modal, plus a Category CRUD tab.
 *
 * mobile/app/trip-travels/index.tsx (the bespoke hand-built screen) is left
 * completely as-is — it only needs to stay reachable, which it already is
 * via Plans and its own registered stack route.
 */
export default function ToursTravelPage() {
    const [activeTab, setActiveTab] = useState("services");
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceAPI.getAll();
            const all = res.data?.data || [];
            const filtered = all.filter(s => s.category === "TOURS_TRAVEL");
            setServices(filtered.sort((a, b) => a.sortOrder - b.sortOrder));
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
        // The bespoke trip-travels screen isn't form-builder driven, so
        // editing it here still only changes pricing/visibility metadata
        // on its Service row (name/headline/basePrice/etc), not its actual
        // native screen — same as any other Service row.
        setEditingService(s);
        setShowModal(true);
    };

    if (loading && services.length === 0) {
        return <div className="page-header"><h2>Loading Tours & Travel...</h2></div>;
    }

    return (
        <div>
            <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="header-icon-box" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plane size={24} className="text-success" />
                </div>
                <div>
                    <h2>Tours & Travel</h2>
                    <p>Hub for Local Meetups, Trip &amp; Travels, and any new travel-package services.</p>
                </div>
            </div>

            {/* Hub link to the existing, unchanged Local Meetups admin page */}
            <a href="/meetups" className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, marginTop: 20, marginBottom: 24, textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PartyPopper size={22} color="#2563EB" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>Local Meetups</div>
                    <div className="text-sm text-muted">Manage community events, ticketing, and registrations — separate system, unchanged.</div>
                </div>
                <ArrowRight size={18} className="text-muted" />
            </a>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
                <button className={`btn btn-sm ${activeTab === "services" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("services")}>Trip Services</button>
                <button className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("categories")}>Categories</button>
            </div>

            {activeTab === "categories" ? (
                <ServiceCategoryTab module="TOURS_TRAVEL" />
            ) : (
                <>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                        <button className="btn btn-primary" onClick={openAdd}>
                            <Plus size={16} /> Add Travel Service
                        </button>
                    </div>

                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {services.length === 0 ? (
                            <p className="text-muted">No Tours & Travel services yet.</p>
                        ) : services.map(s => (
                            <div key={s.id} className="card" style={{ borderColor: s.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 12 }}>
                                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
                                        <span style={{ fontSize: 20 }}>
                                            {s.icon ? (isEmoji(s.icon) ? s.icon : <img src={s.icon} alt={s.name} style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover" }} />) : "✈️"}
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
                                        <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Type</div><div style={{ fontWeight: 600 }}>{s.isDynamic ? 'Dynamic' : 'Bespoke Screen'}</div></div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                                        <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(s)}>
                                            <Edit2 size={13} style={{ marginRight: 4 }} /> Edit
                                        </button>
                                        <button className={`btn btn-sm ${s.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(s)}>
                                            {s.isEnabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                        </button>
                                        {s.isDynamic && (
                                            <button className="btn btn-sm btn-danger" style={{ padding: "6px 8px" }} onClick={() => handleDelete(s)} title="Delete"><Trash2 size={13} /></button>
                                        )}
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
                        category="TOURS_TRAVEL"
                        defaultSortOrder={services.length + 1}
                    />
                </>
            )}
        </div>
    );
}
