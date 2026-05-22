"use client";
import { useState, useEffect } from "react";
import { 
    Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, Upload, X, 
    Search, Sparkles, Smartphone, ArrowRight, Link as LinkIcon, 
    AlertCircle, Image as ImageIcon, HelpCircle 
} from "lucide-react";
import { bannerAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

// Predefined premium healthcare template images
const IMAGE_TEMPLATES = [
    {
        name: "Doctor Consult",
        url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
    },
    {
        name: "Wellness & Yoga",
        url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
    },
    {
        name: "Home Nursing",
        url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
    },
    {
        name: "Lab Bloodwork",
        url: "https://images.unsplash.com/photo-1579165260447-244fd43aa9f6?auto=format&fit=crop&w=800&q=80",
    },
];

export default function BannersPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    const [form, setForm] = useState({
        imageUrl: "",
        heading: "",
        subheading: "",
        ctaText: "",
        ctaRoute: "",
        order: 0,
        isActive: true,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [filterActive, setFilterActive] = useState("ALL");

    useEffect(() => {
        loadBanners();
    }, []);

    async function loadBanners() {
        try {
            setLoading(true);
            const res = await bannerAPI.getAll();
            setBanners(res.data?.data || []);
        } catch (e) {
            console.error(e);
            showToast("Failed to load banners", "error");
        } finally {
            setLoading(false);
        }
    }

    function openAddModal() {
        setEditing(null);
        setForm({
            imageUrl: "",
            heading: "",
            subheading: "",
            ctaText: "",
            ctaRoute: "",
            order: banners.length,
            isActive: true,
        });
        setShowModal(true);
    }

    function openEditModal(banner) {
        setEditing(banner);
        setForm({
            imageUrl: banner.imageUrl,
            heading: banner.heading,
            subheading: banner.subheading,
            ctaText: banner.ctaText || "",
            ctaRoute: banner.ctaRoute || "",
            order: banner.order,
            isActive: banner.isActive,
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.imageUrl || !form.heading || !form.subheading) {
            showToast("Please fill in required fields", "error");
            return;
        }

        try {
            if (editing) {
                await bannerAPI.update(editing.id, form);
                showToast("Banner updated successfully");
            } else {
                await bannerAPI.create(form);
                showToast("Banner created successfully");
            }
            setShowModal(false);
            loadBanners();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to save banner", "error");
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await bannerAPI.delete(id);
            showToast("Banner deleted");
            loadBanners();
        } catch (e) {
            showToast("Failed to delete", "error");
        }
    }

    async function handleToggle(id, isActive) {
        try {
            await bannerAPI.toggle(id, { isActive: !isActive });
            showToast(`Banner ${!isActive ? "enabled" : "disabled"}`);
            loadBanners();
        } catch (e) {
            showToast("Failed to toggle", "error");
        }
    }

    function handleDragStart(id) {
        setDraggedId(id);
    }

    function handleDragOver(e, id) {
        e.preventDefault();
        setDragOverId(id);
    }

    function handleDragLeave() {
        setDragOverId(null);
    }

    async function handleDrop(targetId) {
        setDragOverId(null);
        if (!draggedId || draggedId === targetId) return;

        const draggedBanner = banners.find(b => b.id === draggedId);
        const targetBanner = banners.find(b => b.id === targetId);

        if (!draggedBanner || !targetBanner) return;

        const newBanners = [...banners];
        const draggedIdx = newBanners.findIndex(b => b.id === draggedId);
        const targetIdx = newBanners.findIndex(b => b.id === targetId);

        [newBanners[draggedIdx], newBanners[targetIdx]] = [newBanners[targetIdx], newBanners[draggedIdx]];

        const reorderData = newBanners.map((b, idx) => ({
            id: b.id,
            order: idx,
        }));

        try {
            await bannerAPI.reorder({ banners: reorderData });
            setBanners(newBanners);
            showToast("Banners reordered");
        } catch (e) {
            showToast("Failed to reorder", "error");
            loadBanners();
        } finally {
            setDraggedId(null);
        }
    }

    const filteredBanners = banners
        .filter(b => filterActive === "ALL" || (filterActive === "ACTIVE" ? b.isActive : !b.isActive))
        .filter(b => b.heading.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="page-enter">
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        padding: 10,
                        backgroundColor: "var(--bg-glass)",
                        color: "var(--accent-primary)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-sm)",
                    }}>
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                            Home Banner Carousel
                        </h2>
                        <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: 13.5 }}>
                            Manage promotions, CTA buttons, and display ordering on the mobile application home screen.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="filter-bar" style={{ 
                backgroundColor: "var(--bg-card)",
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
                display: "flex", 
                alignItems: "center", 
                gap: 16, 
                marginBottom: 24,
                flexWrap: "wrap"
            }}>
                {/* Search Input */}
                <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                    <Search size={18} style={{ 
                        position: "absolute", 
                        left: 14, 
                        top: "50%", 
                        transform: "translateY(-50%)", 
                        color: "var(--text-muted)" 
                    }} />
                    <input
                        type="text"
                        placeholder="Search banners by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: 40, width: "100%", height: 44 }}
                    />
                </div>

                {/* Filter Status */}
                <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="form-select"
                    style={{ minWidth: 160, height: 44 }}
                >
                    <option value="ALL">All Banners</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Inactive Only</option>
                </select>

                {/* Add Button */}
                <button 
                    className="btn btn-primary" 
                    onClick={openAddModal}
                    style={{ height: 44, padding: "0 20px" }}
                >
                    <Plus size={18} /> Add New Banner
                </button>
            </div>

            {/* Reorder Helper Tip */}
            {filteredBanners.length > 1 && (
                <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    fontSize: 12.5, 
                    color: "var(--text-muted)", 
                    marginBottom: 16,
                    paddingLeft: 4 
                }}>
                    <GripVertical size={14} style={{ color: "var(--accent-primary)" }} />
                    <span>Tip: Drag and drop cards to reorder how they appear in the mobile carousel.</span>
                </div>
            )}

            {/* Banners Content */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        border: "3px solid var(--border-color)",
                        borderTopColor: "var(--accent-primary)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading banners...</p>
                </div>
            ) : filteredBanners.length === 0 ? (
                <div className="empty-state card" style={{ 
                    padding: "64px 32px", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: "50%", 
                        backgroundColor: "var(--bg-tertiary)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        marginBottom: 20
                    }}>
                        <ImageIcon size={36} style={{ opacity: 0.6 }} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-secondary)" }}>
                        No Banners Found
                    </h4>
                    <p style={{ 
                        margin: "8px 0 0 0", 
                        color: "var(--text-muted)", 
                        fontSize: 14, 
                        maxWidth: 420, 
                        textAlign: "center",
                        lineHeight: 1.5 
                    }}>
                        {searchTerm 
                            ? "No banners match your search term. Try adjusting filters or searches." 
                            : "Create promotional slides to display at the top of the mobile application home screen."
                        }
                    </p>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 24 }}>
                        Create First Banner
                    </button>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 20 }}>
                    {filteredBanners.map((banner) => (
                        <div
                            key={banner.id}
                            draggable
                            onDragStart={() => handleDragStart(banner.id)}
                            onDragOver={(e) => handleDragOver(e, banner.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(banner.id)}
                            className="card"
                            style={{
                                opacity: draggedId === banner.id ? 0.3 : 1,
                                cursor: "grab",
                                transition: "all var(--transition-base)",
                                borderColor: dragOverId === banner.id ? "var(--accent-primary)" : "var(--border-color)",
                                borderWidth: dragOverId === banner.id ? 2 : 1,
                                borderStyle: dragOverId === banner.id ? "dashed" : "solid",
                                backgroundColor: dragOverId === banner.id ? "rgba(4, 131, 87, 0.02)" : "var(--bg-card)",
                                transform: dragOverId === banner.id ? "scale(0.995)" : "none",
                                boxShadow: dragOverId === banner.id ? "var(--shadow-lg)" : "var(--shadow-sm)",
                            }}
                        >
                            <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "auto 300px 1fr auto", 
                                gap: 24, 
                                padding: 20, 
                                alignItems: "center" 
                            }}>
                                {/* Drag Handle */}
                                <div style={{ display: "flex", alignItems: "center", paddingRight: 4 }}>
                                    <GripVertical size={20} className="drag-handle" style={{ color: "var(--text-muted)" }} />
                                </div>

                                {/* Mobile App Banner Mockup */}
                                <div style={{
                                    width: 300,
                                    height: 160,
                                    borderRadius: "var(--radius-lg)",
                                    overflow: "hidden",
                                    border: "1px solid var(--border-color)",
                                    position: "relative",
                                    backgroundColor: "var(--bg-tertiary)",
                                    boxShadow: "inset 0 0 40px rgba(0,0,0,0.1)",
                                }}>
                                    <img
                                        src={banner.imageUrl}
                                        alt={banner.heading}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='160'%3E%3Crect fill='%23e5e7eb' width='300' height='160'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='13' fill='%239ca3af'%3EImage Not Found%3C/text%3E%3C/svg%3E";
                                        }}
                                    />
                                    {/* Gradient Overlay */}
                                    <div style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)",
                                        zIndex: 1
                                    }} />

                                    {/* Mobile UI Overlay */}
                                    <div style={{
                                        position: "absolute",
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        padding: 16,
                                        zIndex: 2,
                                        color: "white"
                                    }}>
                                        <h4 style={{ 
                                            margin: 0, 
                                            color: "white", 
                                            fontSize: 14.5, 
                                            fontWeight: "700",
                                            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                                            lineHeight: 1.2
                                        }}>
                                            {banner.heading}
                                        </h4>
                                        <p style={{ 
                                            margin: "3px 0 0 0", 
                                            color: "rgba(255, 255, 255, 0.95)", 
                                            fontSize: 11, 
                                            fontWeight: "400",
                                            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                                            lineHeight: 1.3
                                        }}>
                                            {banner.subheading}
                                        </p>

                                        {banner.ctaText && (
                                            <div style={{
                                                marginTop: 8,
                                                backgroundColor: "var(--accent-primary)",
                                                color: "white",
                                                fontSize: 9.5,
                                                fontWeight: "600",
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4
                                            }}>
                                                <span>{banner.ctaText}</span>
                                                <ArrowRight size={10} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Banner Details */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                        <span className={`badge ${banner.isActive ? "badge-success" : "badge-danger"}`}>
                                            {banner.isActive ? "✓ Active on App" : "✗ Hidden / Inactive"}
                                        </span>
                                        <span className="badge badge-purple" style={{ fontWeight: 600 }}>
                                            Order Position: {banner.order}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
                                        {banner.heading}
                                    </h3>
                                    <p style={{ margin: "6px 0 12px 0", color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.4 }}>
                                        {banner.subheading}
                                    </p>

                                    {/* Action Links & Routes */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12.5, color: "var(--text-secondary)" }}>
                                        {banner.ctaRoute && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <LinkIcon size={14} style={{ color: "var(--accent-primary)" }} />
                                                <strong>Route:</strong> 
                                                <span style={{ 
                                                    fontFamily: "monospace", 
                                                    backgroundColor: "var(--bg-tertiary)", 
                                                    padding: "2px 6px", 
                                                    borderRadius: 4,
                                                    fontSize: 12 
                                                }}>{banner.ctaRoute}</span>
                                            </div>
                                        )}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.8 }}>
                                            <ImageIcon size={14} />
                                            <strong>Image:</strong> 
                                            <span style={{ fontSize: 12 }} title={banner.imageUrl}>
                                                {banner.imageUrl.substring(0, 45)}...
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Banner Status Toggle & Actions */}
                                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                                    {/* Status Toggle Switch */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                        <label className="toggle-switch" title={banner.isActive ? "Disable Banner" : "Enable Banner"}>
                                            <input
                                                type="checkbox"
                                                checked={banner.isActive}
                                                onChange={() => handleToggle(banner.id, banner.isActive)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                                            {banner.isActive ? "Active" : "Disabled"}
                                        </span>
                                    </div>

                                    {/* Buttons */}
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            onClick={() => openEditModal(banner)}
                                            title="Edit Banner Settings"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <button
                                            className="btn btn-danger btn-icon"
                                            onClick={() => handleDelete(banner.id)}
                                            title="Delete Banner"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Slide-Up Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 880, width: "95%" }}>
                        {/* Header */}
                        <div className="modal-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    padding: 8,
                                    backgroundColor: "var(--bg-glass)",
                                    color: "var(--accent-primary)",
                                    borderRadius: "var(--radius-md)",
                                }}>
                                    <Sparkles size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                    {editing ? "Edit Home Banner" : "Create New Home Banner"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "var(--bg-tertiary)",
                                    color: "var(--text-secondary)",
                                    cursor: "pointer",
                                    transition: "all var(--transition-fast)"
                                }}
                                className="btn-secondary"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Split Modal Body */}
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ padding: 28 }}>
                                <div style={{ display: "flex", flexDirection: "row", gap: 28, flexWrap: "wrap" }}>
                                    
                                    {/* Left Side: Form Controls */}
                                    <div style={{ flex: "1 1 450px" }}>
                                        {/* Image URL Input */}
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <ImageIcon size={14} style={{ color: "var(--accent-primary)" }} />
                                                    Banner Image URL <span style={{ color: "red" }}>*</span>
                                                </span>
                                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                    Recommended aspect ratio: 16:9
                                                </span>
                                            </label>
                                            <input
                                                type="url"
                                                value={form.imageUrl}
                                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                                placeholder="https://example.com/medical-banner.jpg"
                                                className="form-input"
                                                required
                                            />
                                            <small style={{ display: "block", color: "var(--text-muted)", marginTop: 6 }}>
                                                💡 Tip: Upload assets under the <a href="/media" target="_blank" style={{ color: "var(--accent-primary)", fontWeight: 600, textDecoration: "underline" }}>Media Library</a> and paste the link here.
                                            </small>

                                            {/* Predefined Templates */}
                                            <div style={{ marginTop: 12 }}>
                                                <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                                                    Or pick a quick template background:
                                                </span>
                                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                    {IMAGE_TEMPLATES.map((tmpl) => (
                                                        <button
                                                            key={tmpl.name}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, imageUrl: tmpl.url })}
                                                            style={{
                                                                fontSize: 11.5,
                                                                padding: "4px 10px",
                                                                borderRadius: 6,
                                                                border: "1px solid var(--border-color)",
                                                                backgroundColor: form.imageUrl === tmpl.url ? "rgba(4, 131, 87, 0.1)" : "var(--bg-card)",
                                                                borderColor: form.imageUrl === tmpl.url ? "var(--accent-primary)" : "var(--border-color)",
                                                                color: form.imageUrl === tmpl.url ? "var(--accent-primary)" : "var(--text-secondary)",
                                                                fontWeight: form.imageUrl === tmpl.url ? 600 : 500,
                                                                transition: "all var(--transition-fast)"
                                                            }}
                                                        >
                                                            {tmpl.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Heading Text */}
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Heading Text <span style={{ color: "red" }}>*</span></span>
                                                <span style={{ color: form.heading.length > 50 ? "var(--accent-danger)" : "var(--text-muted)" }}>
                                                    {form.heading.length}/60
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.heading}
                                                onChange={(e) => setForm({ ...form, heading: e.target.value })}
                                                placeholder="e.g., Book Top Physicians"
                                                maxLength={60}
                                                className="form-input"
                                                required
                                            />
                                        </div>

                                        {/* Subheading Text */}
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Subtitle / Description <span style={{ color: "red" }}>*</span></span>
                                                <span style={{ color: form.subheading.length > 70 ? "var(--accent-danger)" : "var(--text-muted)" }}>
                                                    {form.subheading.length}/80
                                                </span>
                                            </label>
                                            <textarea
                                                value={form.subheading}
                                                onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                                                placeholder="e.g., Get consults from general physicians in the comfort of your home."
                                                maxLength={80}
                                                rows={2}
                                                className="form-textarea"
                                                style={{ minHeight: 64 }}
                                                required
                                            />
                                        </div>

                                        {/* Row: Button text and route */}
                                        <div className="form-row" style={{ marginBottom: 20 }}>
                                            <div>
                                                <label className="form-label">Button Label (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={form.ctaText}
                                                    onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                                                    placeholder="e.g., Book Now"
                                                    maxLength={30}
                                                    className="form-input"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Redirect Route (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={form.ctaRoute}
                                                    onChange={(e) => setForm({ ...form, ctaRoute: e.target.value })}
                                                    placeholder="e.g., /doctor-visit"
                                                    className="form-input"
                                                />
                                            </div>
                                        </div>

                                        {/* Order & Active Status */}
                                        <div className="form-row" style={{ alignItems: "center" }}>
                                            <div>
                                                <label className="form-label">Display Priority Order</label>
                                                <input
                                                    type="number"
                                                    value={form.order}
                                                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                                                    min={0}
                                                    className="form-input"
                                                />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
                                                <span className="form-label" style={{ margin: 0 }}>Publish Status</span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.isActive}
                                                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                    <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                                                        {form.isActive ? "Active on App" : "Hidden"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Live Visual Preview */}
                                    <div style={{ 
                                        flex: "1 1 300px", 
                                        display: "flex", 
                                        flexDirection: "column", 
                                        borderLeft: "1px solid var(--border-color)", 
                                        paddingLeft: 28,
                                        alignItems: "center"
                                    }}>
                                        <div style={{ 
                                            width: "100%", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 8, 
                                            color: "var(--text-secondary)", 
                                            marginBottom: 12 
                                        }}>
                                            <Smartphone size={16} />
                                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Mobile App Preview</span>
                                        </div>
                                        <p style={{ margin: "0 0 20px 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                                            This mimics how the banner item displays in real-time inside the mobile application home screen carousel.
                                        </p>

                                        {/* Mock Mobile Screen Wrapper */}
                                        <div style={{
                                            width: "100%",
                                            maxWidth: 320,
                                            height: 170,
                                            borderRadius: "var(--radius-lg)",
                                            overflow: "hidden",
                                            border: "1px solid var(--border-color)",
                                            position: "relative",
                                            backgroundColor: "var(--bg-tertiary)",
                                            boxShadow: "var(--shadow-md)",
                                            transition: "all 0.3s ease"
                                        }}>
                                            {form.imageUrl ? (
                                                <img
                                                    src={form.imageUrl}
                                                    alt="Live Preview"
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "var(--text-muted)",
                                                    fontSize: 12.5,
                                                    padding: 20,
                                                    textAlign: "center",
                                                    gap: 10
                                                }}>
                                                    <Upload size={24} style={{ opacity: 0.5 }} />
                                                    <span>No image URL provided. Enter a link or select a template banner background.</span>
                                                </div>
                                            )}

                                            {/* Gradient Dark Overlay */}
                                            <div style={{
                                                position: "absolute",
                                                inset: 0,
                                                background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)",
                                                zIndex: 1
                                            }} />

                                            {/* Mock text items */}
                                            <div style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: 16,
                                                zIndex: 2,
                                                color: "white"
                                            }}>
                                                <h4 style={{ 
                                                    margin: 0, 
                                                    color: "white", 
                                                    fontSize: 14.5, 
                                                    fontWeight: "700",
                                                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                                                    lineHeight: 1.2
                                                }}>
                                                    {form.heading || "Template Heading Title"}
                                                </h4>
                                                <p style={{ 
                                                    margin: "3px 0 0 0", 
                                                    color: "rgba(255, 255, 255, 0.95)", 
                                                    fontSize: 10.5, 
                                                    fontWeight: "400",
                                                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                                                    lineHeight: 1.3
                                                }}>
                                                    {form.subheading || "Enter subtitle descriptions to see preview text rendering."}
                                                </p>

                                                {form.ctaText && (
                                                    <div style={{
                                                        marginTop: 8,
                                                        backgroundColor: "var(--accent-primary)",
                                                        color: "white",
                                                        fontSize: 9.5,
                                                        fontWeight: "600",
                                                        padding: "4.5px 11px",
                                                        borderRadius: 6,
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 4
                                                    }}>
                                                        <span>{form.ctaText}</span>
                                                        <ArrowRight size={10} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Warning about live update */}
                                        <div style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 8,
                                            marginTop: 20,
                                            backgroundColor: "rgba(4, 131, 87, 0.05)",
                                            padding: 12,
                                            borderRadius: 8,
                                            width: "100%",
                                            maxWidth: 320
                                        }}>
                                            <AlertCircle size={15} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 1 }} />
                                            <span style={{ fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                                                Saving this configuration will immediately reflect live updates on all active mobile clients.
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: "0 20px", height: 40 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ padding: "0 24px", height: 40 }}
                                >
                                    {editing ? "Save Updates" : "Create Banner"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Simple CSS animation injected for loading spinner */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

