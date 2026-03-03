"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { productAPI, categoryAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

export default function StorePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', price: 0, mrp: 0, stock: 0, isEnabled: true, categoryId: '', imageUrl: '' });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try { setLoading(true); const [pRes, cRes] = await Promise.all([productAPI.getAll(), categoryAPI.getAll()]); setProducts(pRes.data?.data || []); setCategories(cRes.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    function openAdd() { setEditing(null); setForm({ name: '', description: '', price: 0, mrp: 0, stock: 0, isEnabled: true, categoryId: categories[0]?.id || '', imageUrl: '' }); setShowModal(true); }
    function openEdit(p) { setEditing(p); setForm({ name: p.name, description: p.description || '', price: p.price, mrp: p.mrp, stock: p.stock, isEnabled: p.isEnabled, categoryId: p.categoryId, imageUrl: p.imageUrl || '' }); setShowModal(true); }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await productAPI.update(editing.id, form); showToast('Product updated'); }
            else { await productAPI.create(form); showToast('Product created'); }
            setShowModal(false); loadData();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function toggleProduct(p) { try { await productAPI.update(p.id, { isEnabled: !p.isEnabled }); showToast('Toggled'); loadData(); } catch (e) { showToast('Failed', 'error'); } }
    async function deleteProduct(id) { if (!confirm('Delete?')) return; try { await productAPI.delete(id); showToast('Deleted'); loadData(); } catch (e) { showToast('Failed', 'error'); } }

    return (
        <div>
            <div className="page-header"><h2>Wellness Store CMS</h2><p>Manage products, categories, and inventory</p></div>
            <div className="filter-bar"><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button></div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Stock</th><th>Enabled</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            products.length === 0 ? <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No products yet</td></tr> :
                                products.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</td>
                                        <td className="text-sm">{p.category?.name || '—'}</td>
                                        <td>{formatCurrency(p.price)}</td>
                                        <td className="text-sm">{formatCurrency(p.mrp)}</td>
                                        <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-danger'}`}>{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span></td>
                                        <td><button className="btn btn-sm btn-secondary" onClick={() => toggleProduct(p)}>{p.isEnabled ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}</button></td>
                                        <td><div className="flex gap-2"><button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}><Edit2 size={14} /></button><button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button></div></td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header"><h3>{editing ? 'Edit' : 'Add'} Product</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                    <form onSubmit={handleSubmit}><div className="modal-body">
                        <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div><div className="form-group"><label className="form-label">MRP</label><input className="form-input" type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })} /></div></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} /></div><div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                        <div className="form-group"><label className="form-label">Image URL</label><input className="form-input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></div>
                    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div></form>
                </div></div>
            )}
        </div>
    );
}
