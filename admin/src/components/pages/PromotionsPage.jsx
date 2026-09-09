"use client";
import { useState, useEffect } from "react";
import { Sparkles, Plus, ToggleLeft, ToggleRight, Edit2, Trash2 } from "lucide-react";
import { couponAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";

const EMPTY = {
    code: "", description: "",
    discountType: "percentage", discountValue: "",
    maxDiscount: "", minOrderValue: "",
    usageLimit: "", perUserLimit: "",
    validFrom: "", validUntil: "",
    isActive: true,
};

// yyyy-MM-dd for <input type="date">
const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export default function PromotionsPage() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setLoading(true);
            const res = await couponAPI.getAll({ limit: 200 });
            setCoupons(res.data?.data || []);
        } catch (e) { console.error(e); showToast("Failed to load coupons", "error"); }
        finally { setLoading(false); }
    }

    function openAdd() {
        setEditing(null);
        setForm(EMPTY);
        setShowModal(true);
    }

    function openEdit(c) {
        setEditing(c);
        setForm({
            code: c.code,
            description: c.description || "",
            discountType: c.discountType,
            discountValue: c.discountValue ?? "",
            maxDiscount: c.maxDiscount ?? "",
            minOrderValue: c.minOrderValue ?? "",
            usageLimit: c.usageLimit ?? "",
            perUserLimit: c.perUserLimit ?? "",
            validFrom: toDateInput(c.validFrom),
            validUntil: toDateInput(c.validUntil),
            isActive: c.isActive,
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        // Send blanks as null so the backend clears optional fields.
        const payload = { ...form };
        for (const k of ["maxDiscount", "minOrderValue", "usageLimit", "perUserLimit", "validUntil"]) {
            if (payload[k] === "" || payload[k] === null) payload[k] = null;
        }
        if (payload.validFrom === "") delete payload.validFrom;
        try {
            if (editing) {
                await couponAPI.update(editing.id, payload);
                showToast("Coupon updated");
            } else {
                await couponAPI.create(payload);
                showToast("Coupon created");
            }
            setShowModal(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.message || "Operation failed", "error");
        } finally { setSaving(false); }
    }

    async function toggle(c) {
        try {
            await couponAPI.update(c.id, { isActive: !c.isActive });
            showToast(`${c.code} ${c.isActive ? "deactivated" : "activated"}`);
            load();
        } catch (e) { showToast("Toggle failed", "error"); }
    }

    async function remove(c) {
        if (!confirm(`Delete ${c.code}? (If it has redemptions it will be deactivated instead.)`)) return;
        try {
            const res = await couponAPI.delete(c.id);
            showToast(res.data?.message || "Coupon deleted");
            load();
        } catch (e) { showToast(e.response?.data?.message || "Delete failed", "error"); }
    }

    const fmtDiscount = (c) =>
        c.discountType === "percentage"
            ? `${c.discountValue}%${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}`
            : `₹${c.discountValue}`;

    const isExpired = (c) => c.validUntil && new Date(c.validUntil) < new Date();
    const isExhausted = (c) => c.usageLimit != null && c.usedCount >= c.usageLimit;

    if (loading) return <div className="page-header"><h2>Loading Promotions...</h2></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Promotions &amp; Coupons</h2>
                <p>Create and manage discount codes applied at checkout</p>
            </div>
            <div className="filter-bar">
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Coupon</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {coupons.map(c => {
                    const dead = !c.isActive || isExpired(c) || isExhausted(c);
                    return (
                        <div key={c.id} className="card" style={{ borderColor: dead ? "rgba(100,116,139,0.2)" : "rgba(16,185,129,0.3)" }}>
                            <div className="card-header">
                                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace" }}>
                                    <Sparkles size={16} /> {c.code}
                                </h3>
                                <span className={`badge ${c.isActive ? "badge-success" : "badge-default"}`}>
                                    {!c.isActive ? "Inactive" : isExpired(c) ? "Expired" : isExhausted(c) ? "Exhausted" : "Active"}
                                </span>
                            </div>
                            <div className="card-body">
                                {c.description && <p className="text-sm text-muted" style={{ marginTop: 0 }}>{c.description}</p>}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                    <div><div className="text-sm text-muted">Discount</div><div style={{ fontWeight: 600 }}>{fmtDiscount(c)}</div></div>
                                    <div><div className="text-sm text-muted">Min order</div><div style={{ fontWeight: 600 }}>{c.minOrderValue ? `₹${c.minOrderValue}` : "—"}</div></div>
                                    <div><div className="text-sm text-muted">Used</div><div style={{ fontWeight: 600 }}>{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}</div></div>
                                    <div><div className="text-sm text-muted">Per user</div><div style={{ fontWeight: 600 }}>{c.perUserLimit != null ? c.perUserLimit : "∞"}</div></div>
                                    <div><div className="text-sm text-muted">Valid from</div><div style={{ fontWeight: 600 }}>{formatDate(c.validFrom)}</div></div>
                                    <div><div className="text-sm text-muted">Valid until</div><div style={{ fontWeight: 600 }}>{c.validUntil ? formatDate(c.validUntil) : "No expiry"}</div></div>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}><Edit2 size={14} /> Edit</button>
                                    <button className={`btn btn-sm ${c.isActive ? "btn-warning" : "btn-success"}`} onClick={() => toggle(c)}>
                                        {c.isActive ? <><ToggleRight size={14} /> Deactivate</> : <><ToggleLeft size={14} /> Activate</>}
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => remove(c)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {coupons.length === 0 && (
                    <div className="text-muted" style={{ padding: 24 }}>No coupons yet. Click “Add Coupon” to create one.</div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? "Edit" : "Add"} Coupon</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Code *</label>
                                    <input className="form-input" required placeholder="WELCOME20"
                                        style={{ fontFamily: "monospace" }}
                                        value={form.code}
                                        onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input className="form-input" placeholder="Internal note — shown to the customer on apply"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Discount Type *</label>
                                        <select className="form-input" value={form.discountType}
                                            onChange={e => setForm({ ...form, discountType: e.target.value })}>
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="flat">Flat (₹)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Discount Value *</label>
                                        <input className="form-input" type="number" required min="0" step="0.01"
                                            max={form.discountType === "percentage" ? 100 : undefined}
                                            value={form.discountValue}
                                            onChange={e => setForm({ ...form, discountValue: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Max Discount (₹){form.discountType === "flat" ? " — n/a" : ""}</label>
                                        <input className="form-input" type="number" min="0" step="0.01"
                                            disabled={form.discountType === "flat"}
                                            placeholder="Cap on the % discount"
                                            value={form.discountType === "flat" ? "" : form.maxDiscount}
                                            onChange={e => setForm({ ...form, maxDiscount: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min Order Value (₹)</label>
                                        <input className="form-input" type="number" min="0" step="0.01"
                                            placeholder="No minimum"
                                            value={form.minOrderValue}
                                            onChange={e => setForm({ ...form, minOrderValue: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Total Usage Limit</label>
                                        <input className="form-input" type="number" min="1" step="1"
                                            placeholder="Unlimited"
                                            value={form.usageLimit}
                                            onChange={e => setForm({ ...form, usageLimit: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Per-User Limit</label>
                                        <input className="form-input" type="number" min="1" step="1"
                                            placeholder="Unlimited"
                                            value={form.perUserLimit}
                                            onChange={e => setForm({ ...form, perUserLimit: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Valid From</label>
                                        <input className="form-input" type="date"
                                            value={form.validFrom}
                                            onChange={e => setForm({ ...form, validFrom: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valid Until</label>
                                        <input className="form-input" type="date"
                                            value={form.validUntil}
                                            onChange={e => setForm({ ...form, validUntil: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group flex items-center gap-2">
                                    <input type="checkbox" checked={form.isActive}
                                        onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                    <label>Active</label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Saving..." : editing ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
