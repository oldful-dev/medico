"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    DollarSign, Edit2, Plus, Trash2, ToggleLeft, ToggleRight,
    Sliders, Settings, HelpCircle, PlusCircle, Trash, Layers,
    ArrowUp, ArrowDown, Upload
} from "lucide-react";
import { serviceAPI, mediaAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import RouteSelector from "@/components/common/RouteSelector";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

export default function ServicesPage() {
    const [activeTab, setActiveTab] = useState("dynamic");
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [iconType, setIconType] = useState("emoji");
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast("Only image files are allowed", "error");
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'mobile/assets/images');
        try {
            setUploadingImage(true);
            const res = await mediaAPI.upload(formData);
            if (res.data?.success && res.data?.data?.fileUrl) {
                const uploadedUrl = res.data.data.fileUrl;
                setForm(prev => ({ ...prev, icon: uploadedUrl }));
                showToast("Icon image uploaded successfully", "success");
            } else {
                throw new Error("Invalid response structure");
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || "Upload failed", "error");
        } finally {
            setUploadingImage(false);
        }
    };

    // Form builder states
    const [form, setForm] = useState({
        name: "",
        slug: "",
        icon: "🩺",
        route: "",
        headline: "",
        subhead: "",
        checkoutGroup: "D",
        basePrice: 0,
        pricingText: "Submit Request",
        sortOrder: 1,
        isEnabled: true,
        category: "DIAGNOSTICS_FITNESS",
        isDynamic: true,
        serviceType: "OTHER",
        paymentMode: "INQUIRY"
    });
    const [formFields, setFormFields] = useState([]);

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
        setIconType("emoji");
        setForm({
            name: "",
            slug: "",
            icon: "🩺",
            route: "",
            headline: "",
            subhead: "",
            checkoutGroup: "D",
            basePrice: 0,
            pricingText: "Submit Request",
            sortOrder: services.filter(s => s.isDynamic).length + 50,
            isEnabled: true,
            category: "DIAGNOSTICS_FITNESS",
            isDynamic: true,
            serviceType: "OTHER",
            paymentMode: "INQUIRY"
        });
        setFormFields([
            {
                id: "benefits",
                type: "benefits",
                label: "Service Benefits List",
                placeholder: "",
                required: false,
                optionsString: "Covered under your Ayuxa health plan benefits, Certified and safe professionals, 24/7 dedicated support tracking"
            },
            {
                id: "address_picker",
                type: "address_picker",
                label: "Confirm Address",
                placeholder: "",
                required: true,
                optionsString: ""
            },
            {
                id: "datetime",
                type: "datetime",
                label: "Schedule Appointment",
                placeholder: "Select Date & Time",
                required: true,
                optionsString: ""
            },
            {
                id: "comments",
                type: "comments",
                label: "Comments / Requirements",
                placeholder: "Describe your requirements or any instructions here...",
                required: true,
                optionsString: ""
            }
        ]);
        setShowModal(true);
    };

    const openEditDynamic = (s) => {
        setEditingService(s);
        setIconType(isEmoji(s.icon) ? "emoji" : "image");
        setForm({
            name: s.name || "",
            slug: s.slug || "",
            icon: s.icon || "🩺",
            route: s.route || "",
            headline: s.headline || "",
            subhead: s.subhead || "",
            checkoutGroup: s.checkoutGroup || "D",
            basePrice: s.basePrice !== null && s.basePrice !== undefined ? s.basePrice : 0,
            pricingText: s.pricingText || "",
            sortOrder: s.sortOrder || 1,
            isEnabled: s.isEnabled ?? true,
            category: s.category || "CARE",
            isDynamic: s.isDynamic !== undefined ? !!s.isDynamic : false,
            serviceType: s.serviceType || "OTHER",
            paymentMode: s.paymentMode || "INQUIRY"
        });

        // Deserialize fields
        const fields = [];
        if (s.formFieldsJson && s.formFieldsJson.sections && s.formFieldsJson.sections[0] && s.formFieldsJson.sections[0].fields && s.formFieldsJson.sections[0].fields.length > 0) {
            s.formFieldsJson.sections[0].fields.forEach((f) => {
                fields.push({
                    id: f.id,
                    type: f.type,
                    label: f.label || "",
                    placeholder: f.placeholder || "",
                    required: !!f.required,
                    optionsString: f.options ? f.options.map(o => o.price !== undefined ? `${o.label}: ${o.price}` : o.label).join(", ") : ""
                });
            });
        } else {
            // Fallback default fields for legacy dynamic services
            fields.push(
                {
                    id: "benefits",
                    type: "benefits",
                    label: "Service Benefits List",
                    placeholder: "",
                    required: false,
                    optionsString: "Covered under your Ayuxa health plan benefits, Certified and safe professionals, 24/7 dedicated support tracking"
                },
                {
                    id: "address_picker",
                    type: "address_picker",
                    label: "Confirm Address",
                    placeholder: "",
                    required: true,
                    optionsString: ""
                },
                {
                    id: "datetime",
                    type: "datetime",
                    label: "Schedule Appointment",
                    placeholder: "Select Date & Time",
                    required: true,
                    optionsString: ""
                },
                {
                    id: "comments",
                    type: "comments",
                    label: "Comments / Requirements",
                    placeholder: "Describe your requirements or any instructions here...",
                    required: true,
                    optionsString: ""
                }
            );
        }
        setFormFields(fields);
        setShowModal(true);
    };

    const addFormField = () => {
        const nextId = `field_${Date.now()}`;
        setFormFields([...formFields, {
            id: nextId,
            type: "text_input",
            label: "",
            placeholder: "",
            required: false,
            optionsString: ""
        }]);
    };

    const updateFormField = (index, key, value) => {
        const updated = [...formFields];
        updated[index] = { ...updated[index], [key]: value };
        setFormFields(updated);
    };

    const removeFormField = (index) => {
        setFormFields(formFields.filter((_, i) => i !== index));
    };

    const moveFieldUp = (index) => {
        if (index === 0) return;
        const updated = [...formFields];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setFormFields(updated);
    };

    const moveFieldDown = (index) => {
        if (index === formFields.length - 1) return;
        const updated = [...formFields];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setFormFields(updated);
    };



    const handleSaveDynamic = async (e) => {
        e.preventDefault();

        // PAID mode must have a real charge amount — Razorpay can't process a
        // ₹0 order, so this combination would silently break checkout.
        // (INQUIRY mode with a non-zero base price is intentional and fine —
        // it's shown as a reference price while the actual charge/quota is
        // decided server-side.)
        if (form.paymentMode === "PAID" && (!form.basePrice || parseFloat(form.basePrice) <= 0)) {
            showToast("PAID services need a Base Price greater than ₹0 — Razorpay can't charge ₹0. Switch to INQUIRY mode or set a real price.", "error");
            return;
        }

        try {
            // Build dynamic route automatically
            const routeVal = form.route || `/dynamic-service/${form.slug}`;
            
            // Serialize visual form builder fields into formFieldsJson
            const serializedFields = formFields.map((f, index) => ({
                id: f.id || `field_${index}`,
                type: f.type,
                label: f.label,
                placeholder: f.placeholder,
                required: f.required,
                options: ["radio", "dropdown", "checkbox", "benefits"].includes(f.type) && f.optionsString
                    ? f.optionsString.split(",").map((opt, optIdx) => {
                        const parts = opt.split(":");
                        const labelStr = parts[0].trim();
                        const priceVal = parts[1] ? parseFloat(parts[1].trim()) : undefined;
                        return {
                            id: labelStr.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                            label: labelStr,
                            ...(priceVal !== undefined && !isNaN(priceVal) && { price: priceVal }),
                            sort_order: optIdx + 1
                        };
                    })
                    : undefined
            }));

            const formFieldsJsonObj = {
                version: 1,
                layout: {
                    header_style: "cream_flat",
                    description: form.subhead || form.headline || "",
                    cta_text: form.pricingText || "Submit Request"
                },
                sections: [{
                    id: "dynamic_section",
                    title: form.headline || "Service Details",
                    sort_order: 1,
                    card_style: "default",
                    fields: serializedFields
                }]
            };

            const payload = {
                ...form,
                route: routeVal,
                basePrice: parseFloat(form.basePrice) || 0,
                sortOrder: parseInt(form.sortOrder, 10) || 1,
                formFieldsJson: formFieldsJsonObj
            };

            if (editingService) {
                await serviceAPI.update(editingService.id, payload);
                showToast("Dynamic service updated successfully", "success");
            } else {
                await serviceAPI.create(payload);
                showToast("Dynamic service created successfully", "success");
            }

            setShowModal(false);
            loadServices();
        } catch (e) {
            showToast(e.response?.data?.message || "Operation failed", "error");
        }
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

            {/* MODAL 2: DYNAMIC SERVICE CREATOR & FORM BUILDER */}
            {showModal && (
                <div className="modal-overlay active" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 750, width: "95%" }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{editingService ? "Edit Dynamic Service" : "Add Dynamic Service"}</h3>
                                <p className="text-xs text-muted">Create custom inputs and forms rendered instantly on user devices</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="close-x">✕</button>
                        </div>
                        <form onSubmit={handleSaveDynamic}>
                            <div className="modal-body" style={{ maxHeight: "calc(80vh - 140px)", overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
                                
                                {/* Section 1: Basic Service Identity */}
                                <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                                    <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>1. Service Identity</h5>
                                    
                                    <div className="form-grid-2" style={{ marginBottom: "16px" }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Service Name *</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                required 
                                                placeholder="e.g. Home ECG"
                                                value={form.name} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm({ 
                                                        ...form, 
                                                        name: val,
                                                        slug: editingService ? form.slug : val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                                                    });
                                                }}
                                            />
                                        </div>
                                    <div className="form-grid-2" style={{ marginBottom: "16px", alignItems: "end" }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Category *</label>
                                            <select 
                                                className="form-input" 
                                                style={{ cursor: "pointer" }}
                                                value={form.category} 
                                                onChange={e => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="CARE">Care Services (Doctor, Nurse, Physio, Hospital)</option>
                                                <option value="DIAGNOSTICS_FITNESS">Diagnostics & Fitness</option>
                                            </select>
                                            <p className="text-muted text-xs" style={{ marginTop: 4 }}>
                                                Home Essentials services are managed under Operations → Home Essential, not here.
                                            </p>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ marginBottom: 8 }}>Service Icon Type</label>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button 
                                                    type="button" 
                                                    className={`btn btn-sm ${iconType === 'emoji' ? 'btn-primary' : 'btn-secondary'}`}
                                                    style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                                                    onClick={() => { setIconType('emoji'); setForm(prev => ({ ...prev, icon: "🩺" })); }}
                                                >
                                                    Emoji Icon
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className={`btn btn-sm ${iconType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                                                    style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                                                    onClick={() => { setIconType('image'); setForm(prev => ({ ...prev, icon: "" })); }}
                                                >
                                                    GCS Image
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "16px" }}>
                                        {iconType === 'emoji' ? (
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Emoji *</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    required 
                                                    placeholder="🩺"
                                                    maxLength={50}
                                                    value={form.icon} 
                                                    onChange={e => setForm({ ...form, icon: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Service Icon Image (GCS) *</label>
                                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                                    {form.icon && !isEmoji(form.icon) ? (
                                                        <div style={{ position: "relative", width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                                                            <img src={form.icon} alt="Service Icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: "50px", height: "50px", borderRadius: "8px", border: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.15)" }}>
                                                            <Upload size={16} className="text-muted" />
                                                        </div>
                                                    )}
                                                    <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", margin: 0 }}>
                                                        {uploadingImage ? "Uploading..." : "Choose Image"}
                                                        <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                                    </label>
                                                    {form.icon && !isEmoji(form.icon) && (
                                                        <span className="text-xs text-muted" style={{ wordBreak: "break-all" }}>
                                                            Uploaded: {form.icon.split('/').pop()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    </div>

                                    <div className="form-grid-2">
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Service Slug *</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                required 
                                                placeholder="e.g. home-ecg"
                                                value={form.slug} 
                                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Service Architecture Type *</label>
                                            <select 
                                                className="form-input" 
                                                style={{ cursor: "pointer" }}
                                                value={form.isDynamic ? "dynamic" : "core"} 
                                                onChange={e => setForm({ ...form, isDynamic: e.target.value === "dynamic" })}
                                            >
                                                <option value="core">Core Built-in Page (Native Code / Direct Route)</option>
                                                <option value="dynamic">Dynamic SDUI Page (Form Builder / SDUI)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginTop: "16px", marginBottom: 0 }}>
                                        <label className="form-label">Service Route Path (Optional)</label>
                                        <RouteSelector 
                                            value={form.route}
                                            onChange={val => setForm({ ...form, route: val })}
                                            placeholder="Auto: /dynamic-service/[slug]"
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Mobile App Presentation */}
                                <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                                    <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>2. App Presentation Details</h5>
                                    
                                    <div className="form-group" style={{ marginBottom: "16px" }}>
                                        <label className="form-label">App Headline *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            required 
                                            placeholder="One headline displayed on the card (e.g. Home ECG Service)"
                                            value={form.headline} 
                                            onChange={e => setForm({ ...form, headline: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">App Subhead *</label>
                                        <textarea 
                                            className="form-textarea" 
                                            required 
                                            rows={2}
                                            style={{ minHeight: "80px" }}
                                            placeholder="One descriptive line below the headline"
                                            value={form.subhead} 
                                            onChange={e => setForm({ ...form, subhead: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Section 3: Pricing & Checkout Configuration */}
                                <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                                    <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>3. Pricing & Checkout Config</h5>
                                    
                                    {form.category === "HOME_ESSENTIALS" ? (
                                        <div className="form-grid-3" style={{ marginBottom: "16px" }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Checkout Group *</label>
                                                <select 
                                                    className="form-input" 
                                                    style={{ cursor: "pointer" }}
                                                    value={form.checkoutGroup} 
                                                    onChange={e => setForm({ ...form, checkoutGroup: e.target.value })}
                                                >
                                                    <option value="A">Group A: ₹299 + Date + Photo</option>
                                                    <option value="B">Group B: ₹299 + Photo only</option>
                                                    <option value="C">Group C: Tech Support split pricing</option>
                                                    <option value="D">Group D: Zero Payment Request</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Base Price (₹) *</label>
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    required 
                                                    min={0}
                                                    value={form.basePrice} 
                                                    onChange={e => setForm({ ...form, basePrice: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Pricing Subtext *</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    required 
                                                    placeholder="e.g. ₹299 Fee + actuals"
                                                    value={form.pricingText} 
                                                    onChange={e => setForm({ ...form, pricingText: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="form-grid-3" style={{ marginBottom: "16px" }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Payment Mode *</label>
                                                <select 
                                                    className="form-input" 
                                                    style={{ cursor: "pointer" }}
                                                    value={form.paymentMode || "INQUIRY"} 
                                                    onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                                                >
                                                    <option value="INQUIRY">INQUIRY (No Payment)</option>
                                                    <option value="PAID">PAID (Razorpay Checkout)</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Base Price (₹) *</label>
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    required 
                                                    min={0}
                                                    value={form.basePrice} 
                                                    onChange={e => setForm({ ...form, basePrice: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Pricing Subtext *</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    required 
                                                    placeholder="e.g. Pay ₹0 / Submit Request"
                                                    value={form.pricingText} 
                                                    onChange={e => setForm({ ...form, pricingText: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {form.paymentMode === "PAID" && (!form.basePrice || parseFloat(form.basePrice) <= 0) && (
                                        <div style={{
                                            marginBottom: "16px", fontSize: 13, padding: "10px 14px", borderRadius: 8,
                                            background: "rgba(255, 193, 7, 0.12)", color: "#B8860B",
                                        }}>
                                            ⚠️ PAID mode requires a Base Price above ₹0 — Razorpay cannot charge ₹0. This service can&apos;t be saved until you set a real price or switch to INQUIRY mode.
                                        </div>
                                    )}

                                    <div className="form-grid-2" style={{ alignItems: "center" }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Sort Order (Sort position)</label>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                value={form.sortOrder} 
                                                onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 1 })}
                                            />
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingSelf: "center", height: "100%", paddingTop: "24px" }}>
                                            <input 
                                                type="checkbox" 
                                                id="isEnabled"
                                                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent-primary)" }}
                                                checked={form.isEnabled} 
                                                onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                                            />
                                            <label htmlFor="isEnabled" className="font-bold cursor-pointer" style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>Publish Service (Make Live)</label>
                                        </div>
                                    </div>
                                </div>
                                 {/* VISUAL FORM BUILDER */}
                                 <div className="form-builder-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 24, marginTop: 24, marginBottom: 16 }}>
                                     <div>
                                         <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "var(--accent-primary)" }}>Form Fields Builder</h4>
                                         <p className="text-xs text-muted" style={{ margin: 0 }}>Configure form inputs required from the user during booking</p>
                                     </div>
                                     <button type="button" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px", borderRadius: "var(--radius-md)" }} onClick={addFormField}>
                                         <PlusCircle size={14} /> Add Input Field
                                     </button>
                                 </div>

                                 <div className="form-builder-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                     {formFields.length === 0 ? (
                                         <div className="text-center text-muted text-sm" style={{ border: "2px dashed var(--border-color)", padding: 32, borderRadius: "var(--radius-lg)", background: "var(--bg-glass)" }}>
                                             No custom fields defined. Click &quot;Add Input Field&quot; above to start building your form.
                                         </div>
                                     ) : (
                                         formFields.map((field, idx) => (
                                             <div key={field.id || idx} style={{ position: "relative", background: "var(--bg-glass)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", transition: "all 0.2s" }}>
                                                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: 8 }}>
                                                     <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-primary)", background: "rgba(4, 131, 87, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                                                         Field #{idx + 1}
                                                     </span>
                                                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                         <button
                                                             type="button"
                                                             disabled={idx === 0}
                                                             style={{ border: "none", background: "none", color: idx === 0 ? "var(--text-muted)" : "var(--accent-primary)", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                                                             onClick={() => moveFieldUp(idx)}
                                                         >
                                                             <ArrowUp size={16} />
                                                         </button>
                                                         <button
                                                             type="button"
                                                             disabled={idx === formFields.length - 1}
                                                             style={{ border: "none", background: "none", color: idx === formFields.length - 1 ? "var(--text-muted)" : "var(--accent-primary)", cursor: idx === formFields.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                                                             onClick={() => moveFieldDown(idx)}
                                                         >
                                                             <ArrowDown size={16} />
                                                         </button>
                                                         <button 
                                                             type="button" 
                                                             style={{ border: "none", background: "none", color: "var(--accent-danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "background 0.2s" }}
                                                             onClick={() => removeFormField(idx)}
                                                             className="btn-delete-field"
                                                         >
                                                             <Trash size={16} />
                                                         </button>
                                                     </div>
                                                 </div>

                                                 <div className="form-grid-3">
                                                     <div className="form-group" style={{ marginBottom: 12 }}>
                                                         <label className="form-label text-xs">Field Label *</label>
                                                         <input 
                                                             type="text" 
                                                             className="form-input" 
                                                             required
                                                             placeholder="e.g. Describe Symptoms"
                                                             value={field.label} 
                                                             onChange={e => updateFormField(idx, "label", e.target.value)}
                                                         />
                                                     </div>
                                                     <div className="form-group" style={{ marginBottom: 12 }}>
                                                         <label className="form-label text-xs">Input Type *</label>
                                                         <select 
                                                             className="form-input" 
                                                             value={field.type} 
                                                             style={{ cursor: "pointer" }}
                                                             onChange={e => updateFormField(idx, "type", e.target.value)}
                                                         >
                                                             <option value="text_input">Text Input (Single Line)</option>
                                                             <option value="textarea">Text Area (Multi Line)</option>
                                                             <option value="dropdown">Dropdown Select</option>
                                                             <option value="radio">Radio Options</option>
                                                             <option value="checkbox">Checkboxes (Multi-select)</option>
                                                             <option value="datetime">Date & Time Picker</option>
                                                             <option value="image_upload">Photo Upload Box</option>
                                                             <option value="toggle">Toggle / Switch</option>
                                                             <option value="info_banner">Header / Info Banner</option>
                                                             <option value="benefits">Service Benefits List</option>
                                                             <option value="address_picker">Address Picker Box</option>
                                                             <option value="comments">Comments / Requirements Input</option>
                                                         </select>
                                                     </div>
                                                     <div className="form-group" style={{ marginBottom: 12 }}>
                                                         <label className="form-label text-xs">Placeholder / Subtitle</label>
                                                         <input 
                                                             type="text" 
                                                             className="form-input" 
                                                             placeholder="e.g. Enter details..."
                                                             value={field.placeholder} 
                                                             onChange={e => updateFormField(idx, "placeholder", e.target.value)}
                                                         />
                                                     </div>
                                                 </div>

                                                 {["dropdown", "radio", "checkbox", "benefits"].includes(field.type) && (
                                                     <div className="form-group" style={{ marginTop: 4, marginBottom: 12 }}>
                                                         <label className="form-label text-xs">Options List (Comma separated — format as &quot;Option: Price&quot; to set custom prices e.g. &quot;Short Visit (2 Hours): 499, Full Shift (8 Hours): 1299&quot;) *</label>
                                                         <input 
                                                             type="text" 
                                                             className="form-input" 
                                                             required
                                                             placeholder='e.g. Short Visit (2 Hours): 499, Full Shift (8 Hours): 1299'
                                                             value={field.optionsString} 
                                                             onChange={e => updateFormField(idx, "optionsString", e.target.value)}
                                                         />
                                                     </div>
                                                 )}

                                                 <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 4 }}>
                                                     <input 
                                                         type="checkbox" 
                                                         id={`req_${field.id || idx}`}
                                                         checked={field.required} 
                                                         style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent-primary)" }}
                                                         onChange={e => updateFormField(idx, "required", e.target.checked)}
                                                     />
                                                     <label htmlFor={`req_${field.id || idx}`} className="text-xs cursor-pointer" style={{ margin: 0, fontWeight: "500", color: "var(--text-secondary)" }}>Required Field</label>
                                                 </div>
                                             </div>
                                         ))
                                     )}
                                 </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editingService ? "Save Service" : "Publish Service"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
