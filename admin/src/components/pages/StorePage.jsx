"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Package, Tag, Layers, Eye } from "lucide-react";
import { productAPI, categoryAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

const EMPTY_FORM = { name: '', description: '', price: 0, mrp: 0, stock: 0, isEnabled: true, categoryId: '', imageUrl: '', sku: '', weight: 0.1, length: 10, width: 10, height: 10 };

export default function StorePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // edit/add modal
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // detail drawer
    const [detail, setDetail] = useState(null);

    // tab: products | categories
    const [tab, setTab] = useState('products');

    // category form
    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [catForm, setCatForm] = useState({ name: '', slug: '', imageUrl: '' });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [pRes, cRes] = await Promise.all([productAPI.getAll(), categoryAPI.getAll()]);
            setProducts(pRes.data?.data || []);
            setCategories(cRes.data?.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }

    // ── Products ──────────────────────────────────────────────
    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' });
        setShowModal(true);
    }
    function openEdit(p) {
        setEditing(p);
        setForm({
            name: p.name,
            description: p.description || '',
            price: p.price,
            mrp: p.mrp,
            stock: p.stock,
            isEnabled: p.isEnabled,
            categoryId: p.categoryId,
            imageUrl: p.imageUrl || '',
            sku: p.sku || '',
            weight: p.weight !== undefined && p.weight !== null ? p.weight : 0.1,
            length: p.length !== undefined && p.length !== null ? p.length : 10,
            width: p.width !== undefined && p.width !== null ? p.width : 10,
            height: p.height !== undefined && p.height !== null ? p.height : 10
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setSaving(true);
            if (editing) { await productAPI.update(editing.id, form); showToast('Product updated'); }
            else { await productAPI.create(form); showToast('Product created'); }
            setShowModal(false);
            loadData();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); } finally { setSaving(false); }
    }

    async function toggleProduct(p) {
        try { await productAPI.update(p.id, { isEnabled: !p.isEnabled }); loadData(); }
        catch { showToast('Failed', 'error'); }
    }
    async function deleteProduct(id) {
        if (!confirm('Delete this product?')) return;
        try { await productAPI.delete(id); showToast('Deleted'); loadData(); }
        catch { showToast('Failed', 'error'); }
    }

    // ── Categories ────────────────────────────────────────────
    function openAddCat() { setEditingCat(null); setCatForm({ name: '', slug: '', imageUrl: '' }); setShowCatModal(true); }
    function openEditCat(c) { setEditingCat(c); setCatForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl || '' }); setShowCatModal(true); }

    async function handleCatSubmit(e) {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...catForm, slug: catForm.slug || catForm.name.toLowerCase().replace(/\s+/g, '-') };
            if (editingCat) { await categoryAPI.update(editingCat.id, payload); showToast('Category updated'); }
            else { await categoryAPI.create(payload); showToast('Category created'); }
            setShowCatModal(false);
            loadData();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); } finally { setSaving(false); }
    }

    async function deleteCat(id) {
        if (!confirm('Delete this category? Products in it may be affected.')) return;
        try { await categoryAPI.delete(id); showToast('Deleted'); loadData(); }
        catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    const discount = (p) => p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

    return (
        <div>
            <div className="page-header">
                <h2>Wellness Store CMS</h2>
                <p>Manage products, categories, and inventory</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['products', 'categories'].map(t => (
                    <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                        {t === 'products' ? <><Package size={14} /> Products ({products.length})</> : <><Layers size={14} /> Categories ({categories.length})</>}
                    </button>
                ))}
            </div>

            {/* ── PRODUCTS TAB ── */}
            {tab === 'products' && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
                    </div>

                    <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Discount</th><th>Stock</th><th>Orders</th><th>Enabled</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading
                                    ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
                                    : products.length === 0
                                        ? <tr><td colSpan={9} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No products yet</td></tr>
                                        : products.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {p.imageUrl
                                                            ? <img src={p.imageUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} />
                                                            : <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#ccc" /></div>
                                                        }
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-sm">{p.category?.name || '—'}</td>
                                                <td style={{ fontWeight: 700 }}>{formatCurrency(p.price)}</td>
                                                <td className="text-sm" style={{ color: '#999', textDecoration: 'line-through' }}>{formatCurrency(p.mrp)}</td>
                                                <td>{discount(p) > 0 ? <span className="badge badge-success">{discount(p)}% off</span> : '—'}</td>
                                                <td><span className={`badge ${p.stock > 5 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span></td>
                                                <td className="text-sm">{p._count?.orders ?? 0}</td>
                                                <td><button className="btn btn-sm btn-secondary" onClick={() => toggleProduct(p)}>{p.isEnabled ? <ToggleRight size={18} color="#10b981" /> : <ToggleLeft size={18} />}</button></td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-sm btn-secondary" title="View Details" onClick={() => setDetail(p)}><Eye size={14} /></button>
                                                        <button className="btn btn-sm btn-secondary" title="Edit" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                                                        <button className="btn btn-sm btn-danger" title="Delete" onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div></div>
                </>
            )}

            {/* ── CATEGORIES TAB ── */}
            {tab === 'categories' && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary" onClick={openAddCat}><Plus size={16} /> Add Category</button>
                    </div>

                    <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading
                                    ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
                                    : categories.length === 0
                                        ? <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No categories yet</td></tr>
                                        : categories.map(c => (
                                            <tr key={c.id}>
                                                <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                <td className="text-sm" style={{ color: '#888', fontFamily: 'monospace' }}>{c.slug}</td>
                                                <td><span className="badge badge-success">{c._count?.products ?? 0} products</span></td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-sm btn-secondary" onClick={() => openEditCat(c)}><Edit2 size={14} /></button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => deleteCat(c.id)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div></div>
                </>
            )}

            {/* ── PRODUCT DETAIL DRAWER ── */}
            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="modal" style={{ maxWidth: 520, width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} /> Product Details</h3>
                            <button onClick={() => setDetail(null)} className="btn btn-sm btn-secondary"><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Image */}
                            <div style={{ width: '100%', aspectRatio: '16/9', background: '#f5f5f5', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {detail.imageUrl
                                    ? <img src={detail.imageUrl} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Package size={48} color="#ddd" />
                                }
                            </div>

                            {/* Category */}
                            {detail.category && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#10b981' }}>
                                    <Tag size={11} /> {detail.category.name}
                                </span>
                            )}

                            {/* Name */}
                            <h4 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>{detail.name}</h4>

                            {/* Pricing */}
                            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)' }}>{formatCurrency(detail.price)}</span>
                                    {detail.mrp > detail.price && (
                                        <>
                                            <span style={{ fontSize: 15, color: '#aaa', textDecoration: 'line-through' }}>{formatCurrency(detail.mrp)}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20 }}>{discount(detail)}% OFF</span>
                                        </>
                                    )}
                                </div>
                                {detail.mrp > detail.price && (
                                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                                        You save {formatCurrency(detail.mrp - detail.price)}
                                    </span>
                                )}
                            </div>

                            {/* Stats row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Stock', value: detail.stock > 0 ? `${detail.stock} units` : 'Out of stock', color: detail.stock > 5 ? '#10b981' : detail.stock > 0 ? '#f59e0b' : '#ef4444' },
                                    { label: 'Orders Placed', value: `${detail._count?.orders ?? 0} orders`, color: '#6366f1' },
                                    { label: 'Status', value: detail.isEnabled ? 'Enabled' : 'Disabled', color: detail.isEnabled ? '#10b981' : '#6b7280' },
                                    { label: 'Category', value: detail.category?.name || '—', color: '#f59e0b' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa' }}>{s.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Description */}
                            {detail.description && (
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', marginBottom: 6 }}>Description</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{detail.description}</p>
                                </div>
                            )}

                            {/* Logistics Details */}
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', marginBottom: 6 }}>Logistics (Shiprocket)</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        { label: 'SKU', value: detail.sku || 'Not set', color: 'var(--text-primary)' },
                                        { label: 'Weight', value: `${detail.weight ?? 0.1} kg`, color: 'var(--text-primary)' },
                                        { label: 'Dimensions (L x W x H)', value: `${detail.length ?? 10} x ${detail.width ?? 10} x ${detail.height ?? 10} cm`, color: 'var(--text-primary)' },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa' }}>{s.label}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Image URL */}
                            {detail.imageUrl && (
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', marginBottom: 4 }}>Image URL</p>
                                    <a href={detail.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#6366f1', wordBreak: 'break-all' }}>{detail.imageUrl}</a>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => { setDetail(null); openEdit(detail); }}>
                                <Edit2 size={14} /> Edit Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD/EDIT PRODUCT MODAL ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the product..." />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Selling Price (₹) *</label>
                                        <input className="form-input" type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">MRP (₹)</label>
                                        <input className="form-input" type="number" min={0} value={form.mrp} onChange={e => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                {form.mrp > form.price && form.price > 0 && (
                                    <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: -8, marginBottom: 8 }}>
                                        💚 {Math.round(((form.mrp - form.price) / form.mrp) * 100)}% discount · Saving ₹{(form.mrp - form.price).toLocaleString('en-IN')}
                                    </p>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Stock Quantity</label>
                                        <input className="form-input" type="number" min={0} value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category *</label>
                                        <select className="form-select" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                                            <option value="">Select category</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input className="form-input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                                    {form.imageUrl && (
                                        <div style={{ marginTop: 8, width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                                            <img src={form.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ borderTop: '1px solid #eee', margin: '16px 0', paddingTop: 16 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 12 }}>Shiprocket Logistics Parameters</p>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">SKU</label>
                                            <input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. WELL-KNEE-CAP" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Weight (kg) *</label>
                                            <input className="form-input" type="number" step="0.01" min={0} value={form.weight} onChange={e => setForm({ ...form, weight: parseFloat(e.target.value) || 0.1 })} />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                        <div className="form-group">
                                            <label className="form-label">Length (cm) *</label>
                                            <input className="form-input" type="number" min={0} value={form.length} onChange={e => setForm({ ...form, length: parseFloat(e.target.value) || 10 })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Width (cm) *</label>
                                            <input className="form-input" type="number" min={0} value={form.width} onChange={e => setForm({ ...form, width: parseFloat(e.target.value) || 10 })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Height (cm) *</label>
                                            <input className="form-input" type="number" min={0} value={form.height} onChange={e => setForm({ ...form, height: parseFloat(e.target.value) || 10 })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.isEnabled} onChange={e => setForm({ ...form, isEnabled: e.target.checked })} />
                                        Enabled (visible on website)
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Product' : 'Create Product')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ADD/EDIT CATEGORY MODAL ── */}
            {showCatModal && (
                <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingCat ? 'Edit Category' : 'Add Category'}</h3>
                            <button onClick={() => setShowCatModal(false)} className="btn btn-sm btn-secondary"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCatSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input className="form-input" required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Mobility Aids" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Slug (auto-generated if empty)</label>
                                    <input className="form-input" value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="e.g. mobility-aids" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input className="form-input" value={catForm.imageUrl} onChange={e => setCatForm({ ...catForm, imageUrl: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editingCat ? 'Update' : 'Create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
