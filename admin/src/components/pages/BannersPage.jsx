"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, Upload, X } from "lucide-react";
import { bannerAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function BannersPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [reordering, setReordering] = useState(false);
    const [draggedId, setDraggedId] = useState(null);

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

    function handleDragOver(e) {
        e.preventDefault();
    }

    async function handleDrop(targetId) {
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
            await bannerAPI.reorder(reorderData);
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
        <div>
            <div className="page-header">
                <h2>🎨 Banner Carousel</h2>
                <p>Manage home screen banner images, text, buttons, and display order</p>
            </div>

            <div className="filter-bar" style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <input
                    type="text"
                    placeholder="Search banners..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
                />
                <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", minWidth: 120 }}
                >
                    <option value="ALL">All Banners</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Inactive Only</option>
                </select>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={16} /> Add Banner
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: "center", color: "#999" }}>Loading banners...</p>
            ) : filteredBanners.length === 0 ? (
                <div style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#999",
                    backgroundColor: "#f5f5f5",
                    borderRadius: 8
                }}>
                    <p>No banners found</p>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 16 }}>
                        Create your first banner
                    </button>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 16 }}>
                    {filteredBanners.map((banner, idx) => (
                        <div
                            key={banner.id}
                            draggable
                            onDragStart={() => handleDragStart(banner.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(banner.id)}
                            style={{
                                opacity: draggedId === banner.id ? 0.5 : 1,
                                cursor: "grab",
                                transition: "all 0.2s",
                            }}
                            className="card"
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 16 }}>
                                {/* Image Preview */}
                                <div style={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    backgroundColor: "#f0f0f0",
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
                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23ddd' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E";
                                        }}
                                    />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                            <GripVertical size={16} style={{ color: "#999", cursor: "grab" }} />
                                            <h3 style={{ margin: 0, fontWeight: 600 }}>{banner.heading}</h3>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                fontSize: 12,
                                                fontWeight: 500,
                                                backgroundColor: banner.isActive ? "#d4edda" : "#f8d7da",
                                                color: banner.isActive ? "#155724" : "#721c24",
                                            }}>
                                                {banner.isActive ? "✓ Active" : "✗ Inactive"}
                                            </span>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                fontSize: 12,
                                                backgroundColor: "#e7f3ff",
                                                color: "#004085",
                                            }}>
                                                Order: {banner.order}
                                            </span>
                                        </div>
                                        <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>{banner.subheading}</p>
                                    </div>

                                    {banner.ctaText && (
                                        <div style={{ marginBottom: 8, fontSize: 13, color: "#666" }}>
                                            <strong>Button:</strong> "{banner.ctaText}" → {banner.ctaRoute}
                                        </div>
                                    )}

                                    <div style={{ fontSize: 12, color: "#999" }}>
                                        <strong>Image URL:</strong> {banner.imageUrl.substring(0, 60)}...
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => openEditModal(banner)}
                                        title="Edit"
                                        style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className={`btn btn-sm ${banner.isActive ? "btn-warning" : "btn-success"}`}
                                        onClick={() => handleToggle(banner.id, banner.isActive)}
                                        title={banner.isActive ? "Disable" : "Enable"}
                                        style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        {banner.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(banner.id)}
                                        title="Delete"
                                        style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: 8,
                        padding: 32,
                        maxWidth: 600,
                        width: "90%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h2 style={{ margin: 0 }}>{editing ? "Edit Banner" : "Create Banner"}</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#666",
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Image URL */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    🖼️ Banner Image URL <span style={{ color: "red" }}>*</span>
                                </label>
                                <input
                                    type="url"
                                    value={form.imageUrl}
                                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}
                                    required
                                />
                                {form.imageUrl && (
                                    <img
                                        src={form.imageUrl}
                                        alt="Preview"
                                        style={{
                                            marginTop: 12,
                                            maxWidth: "100%",
                                            maxHeight: 200,
                                            borderRadius: 6,
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                        }}
                                    />
                                )}
                            </div>

                            {/* Heading */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    📝 Heading Text <span style={{ color: "red" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.heading}
                                    onChange={(e) => setForm({ ...form, heading: e.target.value })}
                                    placeholder="e.g., Summer Sale 2026"
                                    maxLength={60}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}
                                    required
                                />
                                <small style={{ color: "#999" }}>{form.heading.length}/60 characters</small>
                            </div>

                            {/* Subheading */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    ✏️ Subtitle / Description <span style={{ color: "red" }}>*</span>
                                </label>
                                <textarea
                                    value={form.subheading}
                                    onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                                    placeholder="e.g., Get 40% off wellness packages"
                                    maxLength={80}
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                    }}
                                    required
                                />
                                <small style={{ color: "#999" }}>{form.subheading.length}/80 characters</small>
                            </div>

                            {/* CTA Button Text */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    💬 Button Text (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.ctaText}
                                    onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                                    placeholder="e.g., Grab Offer"
                                    maxLength={30}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}
                                />
                                <small style={{ color: "#999" }}>{form.ctaText.length}/30 characters</small>
                            </div>

                            {/* CTA Route */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    🔗 Button Redirect Route (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.ctaRoute}
                                    onChange={(e) => setForm({ ...form, ctaRoute: e.target.value })}
                                    placeholder="e.g., /wellness or /doctor-visit"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}
                                />
                                <small style={{ color: "#999" }}>Where should users go when they tap the button?</small>
                            </div>

                            {/* Order */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                                    ↕️ Display Order
                                </label>
                                <input
                                    type="number"
                                    value={form.order}
                                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}
                                />
                                <small style={{ color: "#999" }}>Lower numbers appear first (0 = first banner)</small>
                            </div>

                            {/* Active Toggle */}
                            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    style={{ cursor: "pointer", width: 18, height: 18 }}
                                />
                                <label htmlFor="isActive" style={{ cursor: "pointer", margin: 0, fontWeight: 500 }}>
                                    ✓ Show this banner on home screen
                                </label>
                            </div>

                            {/* Submit Buttons */}
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {editing ? "Update Banner" : "Create Banner"}
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setShowModal(false)}
                                    style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#333" }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
