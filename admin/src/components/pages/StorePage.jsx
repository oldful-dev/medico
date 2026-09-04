"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Package, Tag, Layers, Eye, ShoppingCart, RefreshCw, History, Loader2 } from "lucide-react";
import { productAPI, categoryAPI, statusHistoryAPI } from "@/lib/api";

// Single source of truth for ProductOrder statuses — must match
// PRODUCT_ORDER_STATUSES in backend/src/utils/statusTransitions.js.
const PRODUCT_ORDER_STATUSES = [
    'PENDING', 'CONFIRMED', 'PAID', 'ACCEPTED', 'DELIVERY_CREATED',
    'PICKUP_ASSIGNED', 'PICKED_UP', 'DISPATCHED', 'IN_TRANSIT',
    'DELIVERED', 'RETURNED', 'CANCELLED',
];
const PRODUCT_ORDER_TERMINAL = new Set(['DELIVERED', 'CANCELLED']);
import { showToast, formatCurrency } from "@/lib/hooks";
import { onSocketEvent, offSocketEvent } from "@/lib/socket";


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

    // Orders tab
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Order status history panel
    const [historyOrderId, setHistoryOrderId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [newOrderCount, setNewOrderCount] = useState(0);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [retryingOrderId, setRetryingOrderId] = useState(null);

    // Delivery fee config (prepaid vs COD threshold/fee)
    const [feeConfig, setFeeConfig] = useState(null);
    const [feeConfigLoading, setFeeConfigLoading] = useState(false);
    const [feeConfigSaving, setFeeConfigSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    // ── Real-time new_product_order socket listener ────────────────
    useEffect(() => {
        const handler = (data) => {
            setNewOrderCount(prev => prev + 1);
            // Auto-refresh orders if on orders tab
            setOrders(prev => {
                // Only prepend if we don't already have it
                if (prev.some(o => o.id === data.orderId)) return prev;
                return [{
                    id: data.orderId,
                    orderCode: data.orderCode,
                    amount: data.amount,
                    status: data.status || 'PAID',
                    createdAt: new Date().toISOString(),
                    user: { name: data.userName },
                    items: [],
                    _isLive: true,
                }, ...prev];
            });
        };

        onSocketEvent('new_product_order', handler);

        return () => {
            offSocketEvent('new_product_order', handler);
        };
    }, []);

    async function loadOrders() {
        try {
            setOrdersLoading(true);
            const res = await productAPI.getOrders({ limit: 100 });
            setOrders(res.data?.data || []);
        } catch (e) { console.error(e); } finally { setOrdersLoading(false); }
    }

    function handleTabChange(t) {
        setTab(t);
        if (t === 'orders') {
            setNewOrderCount(0);
            loadOrders();
            loadFeeConfig();
        }
    }

    async function loadFeeConfig() {
        try {
            setFeeConfigLoading(true);
            const res = await productAPI.getDeliveryFeeConfig();
            setFeeConfig(res.data?.data || null);
        } catch (e) {
            console.error(e);
            showToast('Failed to load delivery fee config', 'error');
        } finally { setFeeConfigLoading(false); }
    }

    async function saveFeeConfig() {
        try {
            setFeeConfigSaving(true);
            const res = await productAPI.updateDeliveryFeeConfig(feeConfig);
            setFeeConfig(res.data?.data || feeConfig);
            showToast('Delivery fee config updated');
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to update delivery fee config', 'error');
        } finally { setFeeConfigSaving(false); }
    }

    async function updateOrderStatus(orderId, status, forceStatus = false) {
        try {
            setUpdatingOrderId(orderId);
            await productAPI.updateOrderStatus(orderId, { status, ...(forceStatus && { forceStatus: true }) });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            showToast(`Order status updated to ${status}`);
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to update status';
            // Backend rejected an out-of-sequence transition (e.g. skipping
            // straight to DELIVERED) — offer the same override path admins
            // already have for bookings, instead of just failing silently.
            if (e.response?.status === 400 && /transition/i.test(msg) && confirm(`${msg}\n\nForce this status anyway?`)) {
                return updateOrderStatus(orderId, status, true);
            }
            showToast(msg, 'error');
        } finally { setUpdatingOrderId(null); }
    }

    async function retryFulfillment(orderId) {
        try {
            setRetryingOrderId(orderId);
            const res = await productAPI.retryFulfillment(orderId);
            showToast(`Shipment created${res.data?.data?.awbCode ? ` — AWB ${res.data.data.awbCode}` : ''}`, 'success');
            await loadOrders();
        } catch (e) {
            showToast(e.response?.data?.message || 'Retry failed — shipment still not created', 'error');
        } finally { setRetryingOrderId(null); }
    }

    async function openHistory(orderId) {
        setHistoryOrderId(orderId);
        setHistoryLoading(true);
        try {
            const res = await statusHistoryAPI.get('ProductOrder', orderId);
            setHistory(res.data?.data || []);
        } catch (e) {
            console.error(e);
            showToast('Failed to load status history', 'error');
        } finally { setHistoryLoading(false); }
    }



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
            height: p.height !== undefined && p.height !== null ? p.height : 10,
            changeReason: ''
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

    const [togglingAll, setTogglingAll] = useState(false);

    async function toggleProduct(p) {
        try { await productAPI.update(p.id, { isEnabled: !p.isEnabled }); loadData(); }
        catch { showToast('Failed', 'error'); }
    }
    async function handleBulkToggle(enable) {
        if (!confirm(`Are you sure you want to ${enable ? 'enable' : 'disable'} all products?`)) return;
        try {
            setTogglingAll(true);
            await productAPI.bulkToggle({ isEnabled: enable });
            showToast(`All products have been ${enable ? 'enabled' : 'disabled'} successfully ✓`);
            loadData();
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to bulk update products', 'error');
        } finally {
            setTogglingAll(false);
        }
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
                {[
                    { key: 'products', label: `Products (${products.length})`, icon: <Package size={14} /> },
                    { key: 'categories', label: `Categories (${categories.length})`, icon: <Layers size={14} /> },
                    { key: 'orders', label: 'Orders', icon: <ShoppingCart size={14} />, badge: newOrderCount },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleTabChange(t.key)}
                        style={{ textTransform: 'capitalize', position: 'relative' }}
                    >
                        {t.icon} {t.label}
                        {t.badge > 0 && (
                            <span style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#ef4444', color: '#fff', borderRadius: '50%',
                                fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 4px', lineHeight: 1,
                            }}>{t.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── PRODUCTS TAB ── */}
            {tab === 'products' && (
                <>
                    <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
                        {products.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {products.every(p => p.isEnabled) ? 'Store: Enabled' : 'Store: Disabled'}
                                </span>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }} 
                                    onClick={() => handleBulkToggle(!products.every(p => p.isEnabled))}
                                    disabled={togglingAll || loading}
                                >
                                    {products.every(p => p.isEnabled) ? (
                                        <ToggleRight size={24} color="#10b981" />
                                    ) : (
                                        <ToggleLeft size={24} color="#9ca3af" />
                                    )}
                                </button>
                            </div>
                        )}
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

            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
                <>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-body">
                            <h4 style={{ margin: '0 0 4px 0' }}>Delivery Fee</h4>
                            <p className="text-sm text-muted" style={{ marginTop: 0, marginBottom: 12 }}>
                                Flat delivery fee applied below each threshold; free delivery at or above it. Prepaid and COD are configured separately.
                            </p>
                            {feeConfigLoading || !feeConfig ? (
                                <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Loading...</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Prepaid threshold (₹)</label>
                                        <input className="form-input" type="number" min={0} value={feeConfig.prepaidThreshold}
                                            onChange={e => setFeeConfig({ ...feeConfig, prepaidThreshold: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Prepaid fee (₹)</label>
                                        <input className="form-input" type="number" min={0} value={feeConfig.prepaidFee}
                                            onChange={e => setFeeConfig({ ...feeConfig, prepaidFee: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">COD threshold (₹)</label>
                                        <input className="form-input" type="number" min={0} value={feeConfig.codThreshold}
                                            onChange={e => setFeeConfig({ ...feeConfig, codThreshold: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">COD fee (₹)</label>
                                        <input className="form-input" type="number" min={0} value={feeConfig.codFee}
                                            onChange={e => setFeeConfig({ ...feeConfig, codFee: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            )}
                            {feeConfig && (
                                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={saveFeeConfig} disabled={feeConfigSaving}>
                                    {feeConfigSaving ? 'Saving...' : 'Save Delivery Fee Settings'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {orders.length} order{orders.length !== 1 ? 's' : ''} found
                        </span>
                        <button className="btn btn-secondary" onClick={loadOrders} disabled={ordersLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <RefreshCw size={14} />
                            Refresh
                        </button>
                    </div>

                    <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Update Status</th>
                                <th></th>
                            </tr></thead>
                            <tbody>
                                {ordersLoading
                                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading orders...</td></tr>
                                    : orders.length === 0
                                        ? <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                                            No orders yet. Click Refresh to load.
                                          </td></tr>
                                        : orders.map(order => {
                                            const statusMeta = {
                                                PENDING:    { bg: '#FFF8E1', color: '#F59E0B', label: 'Placed' },
                                                PAID:       { bg: '#EFF6FF', color: '#3B82F6', label: 'Paid' },
                                                CONFIRMED:  { bg: '#F5F3FF', color: '#8B5CF6', label: 'Confirmed' },
                                                DISPATCHED: { bg: '#FFF7ED', color: '#F97316', label: 'Dispatched' },
                                                DELIVERED:  { bg: '#ECFDF5', color: '#10B981', label: 'Delivered' },
                                                CANCELLED:  { bg: '#FEF2F2', color: '#EF4444', label: 'Cancelled' },
                                            }[order.status] || { bg: '#f3f4f6', color: '#6b7280', label: order.status };

                                            const items = Array.isArray(order.items) ? order.items : [];
                                            const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
                                            const topItem = items[0]?.name || '—';

                                            return (
                                                <tr key={order.id} style={order._isLive ? { background: '#f0fdf4' } : {}}>
                                                    <td>
                                                        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{order.orderCode || order.id?.slice(-8)}</span>
                                                        {order._isLive && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '1px 5px', borderRadius: 8 }}>NEW</span>}
                                                    </td>
                                                    <td className="text-sm">{order.user?.name || '—'}</td>
                                                    <td className="text-sm">
                                                        <span title={items.map(i => `${i.name} x${i.quantity}`).join(', ')}>
                                                            {topItem}{itemCount > 1 ? ` +${itemCount - 1} more` : ''}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>{formatCurrency(order.amount)}</td>
                                                    <td>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            background: statusMeta.bg,
                                                            color: statusMeta.color,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            padding: '3px 10px',
                                                            borderRadius: 20,
                                                        }}>{statusMeta.label}</span>
                                                        {order.fulfillmentError && (
                                                            <div
                                                                title={order.fulfillmentError}
                                                                style={{
                                                                    display: 'inline-block',
                                                                    marginLeft: 6,
                                                                    background: '#FEF2F2',
                                                                    color: '#EF4444',
                                                                    fontWeight: 700,
                                                                    fontSize: 10,
                                                                    padding: '2px 8px',
                                                                    borderRadius: 20,
                                                                    cursor: 'help',
                                                                }}
                                                            >
                                                                ⚠ Shipment Failed
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-sm" style={{ color: '#888' }}>
                                                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td>
                                                        {!PRODUCT_ORDER_TERMINAL.has(order.status) && (
                                                            <select
                                                                className="form-select"
                                                                style={{ fontSize: 12, padding: '4px 8px', minWidth: 120 }}
                                                                value={order.status}
                                                                disabled={updatingOrderId === order.id}
                                                                onChange={e => updateOrderStatus(order.id, e.target.value)}
                                                            >
                                                                {PRODUCT_ORDER_STATUSES.map(s => (
                                                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {PRODUCT_ORDER_TERMINAL.has(order.status) && (
                                                            <span className="text-sm" style={{ color: '#aaa' }}>Final</span>
                                                        )}
                                                    </td>
                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                        {order.fulfillmentError && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                style={{ padding: '4px 8px', fontSize: 11 }}
                                                                disabled={retryingOrderId === order.id}
                                                                onClick={() => retryFulfillment(order.id)}
                                                            >
                                                                {retryingOrderId === order.id ? 'Retrying...' : 'Retry Shipment'}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            style={{ padding: '4px 8px' }}
                                                            title="Status history"
                                                            onClick={() => openHistory(order.id)}
                                                        >
                                                            <History size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </div></div>

                    {historyOrderId && (
                        <div
                            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                            onClick={() => setHistoryOrderId(null)}
                        >
                            <div
                                style={{ backgroundColor: "var(--card-bg)", borderRadius: 12, padding: 20, width: 480, maxHeight: "70vh", overflowY: "auto", border: "1px solid var(--border-color)" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <h3 style={{ margin: 0 }}>Status History</h3>
                                    <button style={{ background: "transparent", border: "none", cursor: "pointer" }} onClick={() => setHistoryOrderId(null)}>
                                        <X size={18} />
                                    </button>
                                </div>
                                {historyLoading ? (
                                    <div style={{ padding: 24, textAlign: "center" }}><Loader2 className="spin" size={20} /></div>
                                ) : history.length === 0 ? (
                                    <p style={{ color: "var(--text-secondary)" }}>No transitions recorded yet.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {history.map((h) => (
                                            <div key={h.id} style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {h.fromStatus ? `${h.fromStatus.replace(/_/g, ' ')} → ` : ''}{h.toStatus.replace(/_/g, ' ')}
                                                    {h.forced && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#EF4444', background: '#FEF2F2', padding: '1px 6px', borderRadius: 8 }}>FORCED</span>}
                                                </div>
                                                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                                    {new Date(h.createdAt).toLocaleString()} · {h.changedBy || 'system'}
                                                    {h.reason && ` · ${h.reason}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', marginBottom: 6 }}>Logistics (Delhivery)</p>
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
                                {editing && (
                                    <div className="form-group" style={{ marginBottom: 12 }}>
                                        <label className="form-label">Reason for change (optional)</label>
                                        <input className="form-input" type="text" placeholder="e.g. Seasonal discount, vendor rate change..."
                                            value={form.changeReason || ''} onChange={e => setForm({ ...form, changeReason: e.target.value })} />
                                    </div>
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
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 12 }}>Delhivery Logistics Parameters</p>
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
