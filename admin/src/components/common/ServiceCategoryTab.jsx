"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from "lucide-react";
import { serviceCategoryAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

/**
 * Generic Category CRUD tab backed by the shared ServiceCategory model —
 * reused as-is by Home Essentials, Diagnostic & Fitness, and Tours & Travel,
 * each passing their own `module` value so categories never cross over.
 */
export default function ServiceCategoryTab({ module }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", slug: "", imageUrl: "", sortOrder: 1, isEnabled: true });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceCategoryAPI.getAll(module);
            setCategories((res.data?.data || []).sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (e) {
            console.error(e);
            showToast("Failed to load categories", "error");
        } finally {
            setLoading(false);
        }
    }, [module]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: "", slug: "", imageUrl: "", sortOrder: categories.length + 1, isEnabled: true });
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditing(c);
        setForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl || "", sortOrder: c.sortOrder, isEnabled: c.isEnabled });
        setShowModal(true);
    };

    const handleToggle = async (c) => {
        try {
            await serviceCategoryAPI.toggle(c.id);
            load();
        } catch (e) {
            showToast("Failed to toggle category", "error");
        }
    };

    const handleReorder = async (cat, direction) => {
        const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = ordered.findIndex(c => c.id === cat.id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;
        [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
        try {
            await serviceCategoryAPI.reorder({ orderedIds: ordered.map(c => c.id) });
            load();
        } catch (e) {
            showToast("Failed to reorder categories", "error");
        }
    };

    const handleDelete = async (c) => {
        if (!confirm(`Delete category "${c.name}"?`)) return;
        try {
            await serviceCategoryAPI.delete(c.id);
            showToast("Category deleted", "success");
            load();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to delete category", "error");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, module, sortOrder: parseInt(form.sortOrder, 10) || 1 };
            if (editing) {
                await serviceCategoryAPI.update(editing.id, payload);
                showToast("Category updated", "success");
            } else {
                await serviceCategoryAPI.create(payload);
                showToast("Category created", "success");
            }
            setShowModal(false);
            load();
        } catch (e) {
            showToast(e.response?.data?.message || "Operation failed", "error");
        }
    };

    if (loading && categories.length === 0) {
        return <p className="text-muted" style={{ padding: 20 }}>Loading categories...</p>;
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={16} /> Add Category
                </button>
            </div>

            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {categories.length === 0 ? (
                    <p className="text-muted">No categories yet.</p>
                ) : categories.map(c => (
                    <div key={c.id} className="card" style={{ borderColor: c.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)" }}>
                        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {c.imageUrl ? (
                                    isEmoji(c.imageUrl) ? <span style={{ fontSize: 20 }}>{c.imageUrl}</span> : <img src={c.imageUrl} alt={c.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                                ) : null}
                                <div style={{ fontWeight: 700 }}>{c.name}</div>
                                <span className={`badge ${c.isEnabled ? 'badge-success' : 'badge-default'}`} style={{ marginLeft: "auto", fontSize: 10 }}>
                                    {c.isEnabled ? 'Live' : 'Disabled'}
                                </span>
                            </div>
                            <div className="text-sm text-muted">/{c.slug}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                <button className="btn btn-sm btn-secondary" style={{ padding: "6px 8px" }} onClick={() => handleReorder(c, "up")}><ArrowUp size={13} /></button>
                                <button className="btn btn-sm btn-secondary" style={{ padding: "6px 8px" }} onClick={() => handleReorder(c, "down")}><ArrowDown size={13} /></button>
                                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(c)}><Edit2 size={13} /> Edit</button>
                                <button className={`btn btn-sm ${c.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(c)}>
                                    {c.isEnabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                </button>
                                <button className="btn btn-sm btn-danger" style={{ padding: "6px 8px" }} onClick={() => handleDelete(c)}><Trash2 size={13} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay active" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? "Edit Category" : "Add Category"}</h3>
                            <button onClick={() => setShowModal(false)} className="close-x">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Slug *</label>
                                    <input className="form-input" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Icon (emoji or image URL)</label>
                                    <input className="form-input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="🏠 or https://..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sort Order</label>
                                    <input type="number" className="form-input" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input type="checkbox" id="catEnabled" checked={form.isEnabled} onChange={e => setForm({ ...form, isEnabled: e.target.checked })} />
                                    <label htmlFor="catEnabled" style={{ margin: 0 }}>Active</label>
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
