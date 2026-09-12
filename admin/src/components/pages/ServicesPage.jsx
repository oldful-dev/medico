"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    Edit2, Plus, Trash2, ToggleLeft, ToggleRight,
    Settings,
    ArrowUp, ArrowDown
} from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import DynamicServiceFormModal from "@/components/common/DynamicServiceFormModal";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

export default function ServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceAPI.getAll();
            const all = res.data?.data || [];
            // Home Essentials services are owned/managed exclusively by the
            // Home Essential page (Operations) to avoid duplicate CRUD surfaces.
            const withoutHomeEssentials = all.filter(s => s.category !== "HOME_ESSENTIALS");
            setServices(withoutHomeEssentials.sort((a, b) => a.sortOrder - b.sortOrder));
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

    // Swaps a service with its neighbor (by sortOrder among all real DB
    // services, not the filtered/search view) and persists the new order
    // via the existing PUT /services/reorder endpoint.
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



    const openAddDynamic = () => {
        setEditingService(null);
        setShowModal(true);
    };

    const openEditDynamic = (s) => {
        setEditingService(s);
        setShowModal(true);
    };

    const hardcodedServices = services.filter(s => !s.isDynamic);
    const dynamicServices = services.filter(s => s.isDynamic);

    const searchParams = useSearchParams();
    const initialCategoryFilter = searchParams.get("type") === "dynamic" ? "dynamic" : "all";
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [searchFilter, setSearchFilter] = useState("");

    const platformModules = [
        { id: "module_essentials", name: "Home Essentials Config", slug: "home-essentials", icon: "🏠", category: "PLATFORM_MODULE", isDynamic: false, route: "/home-essentials", description: "Manage essential items, pricing structures, and deliveries.", isEnabled: true },
        { id: "module_meetups", name: "Local Meetups Config", slug: "meetups", icon: "🎉", category: "PLATFORM_MODULE", isDynamic: false, route: "/meetups", description: "Configure local community events, ticketing, and checkouts.", isEnabled: true },
        { id: "module_banners", name: "Home Banners Config", slug: "banners", icon: "✨", category: "PLATFORM_MODULE", isDynamic: false, route: "/banners", description: "Update main dashboard banner slides, routes, and text.", isEnabled: true },
        { id: "module_store", name: "Wellness Store Config", slug: "store", icon: "🛍️", category: "PLATFORM_MODULE", isDynamic: false, route: "/store", description: "Configure wellness products, categories, inventory, and details.", isEnabled: true }
    ];

    if (loading && services.length === 0) return (
        <div className="loading-state">
            <div className="spinner" />
            <p>Loading services database...</p>
        </div>
    );

    // Merge actual database services (dynamic + core/hardcoded) and static config modules
    const allItems = [
        ...services.map(s => ({ ...s, isModule: false })),
        ...platformModules.map(m => ({ ...m, isModule: true }))
    ];

    // Filter list
    const filteredItems = allItems.filter(item => {
        // Search filter
        if (searchFilter) {
            const query = searchFilter.toLowerCase();
            const matchesSearch = item.name?.toLowerCase().includes(query) || item.slug?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Category filter
        if (categoryFilter === "all") return true;
        if (categoryFilter === "dynamic") return item.isDynamic && !item.isModule;
        if (categoryFilter === "core") return !item.isDynamic && !item.isModule;
        if (categoryFilter === "modules") return item.isModule;
        if (categoryFilter === "diagnostics") return item.category === "DIAGNOSTICS_FITNESS" && !item.isModule;
        if (categoryFilter === "essentials") return item.category === "HOME_ESSENTIALS" && !item.isModule;
        return true;
    });

    return (
        <div className="services-simpl-container">
            {/* Page Header */}
            <div className="page-header header-minimal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="header-icon-box">
                        <Settings size={24} className="text-success" />
                    </div>
                    <div>
                        <h2>Service Management Control</h2>
                        <p>Configure dynamic checkout fields, core medical packages, and system platform configurations in a single screen.</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openAddDynamic}>
                    <Plus size={16} /> Add Dynamic Service
                </button>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, gap: 4 }}>
                    <button className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategoryFilter('all')}>All</button>
                    <button className={`btn btn-sm ${categoryFilter === 'dynamic' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategoryFilter('dynamic')}>Dynamic ({services.filter(s => s.isDynamic).length})</button>
                    <button className={`btn btn-sm ${categoryFilter === 'core' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategoryFilter('core')}>Core ({services.filter(s => !s.isDynamic).length})</button>
                    <button className={`btn btn-sm ${categoryFilter === 'modules' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategoryFilter('modules')}>Platform Modules ({platformModules.length})</button>
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
                    <input 
                        className="form-input" 
                        placeholder="Search service/module..." 
                        value={searchFilter} 
                        onChange={e => setSearchFilter(e.target.value)} 
                    />
                </div>
            </div>

            {/* Grid Layout (identical to City Management layout) */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        className="card" 
                        style={{ 
                            borderColor: item.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)",
                            background: item.isModule ? 'rgba(37,99,235,0.03)' : 'var(--bg-secondary)',
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between',
                            height: '100%'
                        }}
                    >
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                <span style={{ fontSize: 20 }}>
                                    {item.icon ? (
                                        isEmoji(item.icon) ? item.icon : <img src={item.icon} alt={item.name} style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", display: 'inline-block', verticalAlign: 'middle' }} />
                                    ) : "🩺"}
                                </span> 
                                {item.name}
                            </h3>
                            <span className={`badge ${item.isEnabled ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 10 }}>
                                {item.isModule ? 'Platform Module' : item.isEnabled ? 'Live' : 'Disabled'}
                            </span>
                        </div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                            {item.isModule ? (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                                    {item.description}
                                </p>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 12 }}>
                                    <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Slug</div><div style={{ fontWeight: 600 }}>/{item.slug}</div></div>
                                    <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Category</div><div style={{ fontWeight: 600, fontSize: 11 }}>{item.category?.replace(/_/g, ' ') || 'DIAGNOSTICS'}</div></div>
                                    <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Base Price</div><div style={{ fontWeight: 700, color: 'var(--accent-primary-light)' }}>₹{item.basePrice}</div></div>
                                    <div><div className="text-sm text-muted" style={{ fontSize: 10 }}>Type</div><div style={{ fontWeight: 600 }}>{item.isDynamic ? 'Dynamic' : 'Core'}</div></div>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 8, marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                {item.isModule ? (
                                    <a href={item.route} className="btn btn-sm btn-primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                        Configure Module
                                    </a>
                                ) : (
                                    <>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            style={{ padding: "6px 8px" }}
                                            title="Move up"
                                            disabled={categoryFilter !== "all" || !!searchFilter}
                                            onClick={() => handleReorder(item, "up")}
                                        >
                                            <ArrowUp size={13} />
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            style={{ padding: "6px 8px" }}
                                            title="Move down"
                                            disabled={categoryFilter !== "all" || !!searchFilter}
                                            onClick={() => handleReorder(item, "down")}
                                        >
                                            <ArrowDown size={13} />
                                        </button>
                                        <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openEditDynamic(item)}>
                                            <Edit2 size={13} style={{ marginRight: 4 }} /> Edit
                                        </button>
                                        <button className={`btn btn-sm ${item.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(item)}>
                                            {item.isEnabled ? <><ToggleRight size={13} /> Disable</> : <><ToggleLeft size={13} /> Enable</>}
                                        </button>
                                        {item.isDynamic && (
                                            <button className="btn btn-sm btn-danger" style={{ padding: '6px 8px' }} onClick={() => handleDelete(item)} title="Delete"><Trash2 size={13} /></button>
                                        )}
                                    </>
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
                category="DIAGNOSTICS_FITNESS"
                categoryOptions={[{ value: "CARE", label: "Care Services (Doctor, Nurse, Physio, Hospital)" }, { value: "DIAGNOSTICS_FITNESS", label: "Care & Diagnostics" }]}
                defaultSortOrder={services.filter(s => s.isDynamic).length + 50}
            />

            <style jsx>{`
                .services-simpl-container {
                    max-width: 900px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .header-minimal { display: flex; align-items: center; gap: 20px; border-bottom: none; }
                .header-icon-box { 
                    width: 56px; height: 56px; border-radius: 16px; background: rgba(16, 185, 129, 0.1); 
                    display: flex; align-items: center; justify-content: center;
                }

                .tabs-navigation {
                    display: flex;
                    gap: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    padding-bottom: 8px;
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    padding: 8px 16px;
                    font-weight: 600;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }

                .tab-btn:hover {
                    color: var(--text-primary);
                }

                .tab-btn.active {
                    color: var(--accent-primary-light);
                    border-bottom-color: var(--accent-primary-light);
                }

                .pricing-card { border-radius: 24px; border: 1px solid var(--border-color); overflow: hidden; }
                
                .minimal-table { width: 100%; border-collapse: collapse; }
                .minimal-table th { 
                    background: var(--bg-secondary); padding: 16px 24px; text-align: left; 
                    font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);
                }
                .minimal-table td { padding: 18px 24px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
                .minimal-table tr:last-child td { border-bottom: none; }

                .price-tag { 
                    background: var(--bg-glass); color: var(--accent-primary-light); 
                    padding: 4px 12px; border-radius: 8px; font-weight: 700; font-size: 13px;
                    border: 1px solid rgba(16, 185, 129, 0.15);
                }

                .btn-ghost { 
                    color: var(--text-primary); background: transparent; transition: all 0.2s;
                    border: 1px solid transparent; gap: 8px;
                }
                .btn-ghost:hover { background: rgba(255,255,255,0.05); }

                .pricing-modal { max-width: 400px; border-radius: 28px; }
                .input-with-icon { position: relative; }
                .input-with-icon svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); }
                .input-with-icon input { padding-left: 44px; height: 52px; border-radius: 14px; }
                
                .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; }
                .footer-minimal { border-top: none; padding-top: 0; }

                .loading-state { text-align: center; padding: 100px 0; color: var(--text-muted); }
                .spinner { 
                    width: 32px; height: 32px; border: 3px solid var(--border-color); 
                    border-top-color: var(--accent-primary); border-radius: 50%; margin: 0 auto 16px;
                    animation: spin 1s linear infinite; 
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .text-xs { font-size: 11px; }
                .text-muted { color: var(--text-muted); }
                .font-bold { font-weight: 700; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 8px; }

                .form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .form-grid-3 {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                }
            `}</style>
        </div>
    );
}
