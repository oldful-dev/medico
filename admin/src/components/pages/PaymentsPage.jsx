"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Edit2, CreditCard, Smartphone, Banknote, Building2, FileDown, Eye } from "lucide-react";
import { paymentAPI, bookingAPI } from "@/lib/api";
import { formatCurrency, formatDateTime, showToast } from "@/lib/hooks";

const statusColors = { INITIATED: 'badge-default', SUCCESS: 'badge-success', FAILED: 'badge-danger', REFUND_INITIATED: 'badge-warning', REFUNDED: 'badge-info' };

const METHOD_LABELS = {
    CARD: { label: 'Card', icon: CreditCard, color: '#6366f1' },
    UPI: { label: 'UPI', icon: Smartphone, color: '#10b981' },
    NETBANKING: { label: 'Net Banking', icon: Building2, color: '#3b82f6' },
    WALLET: { label: 'Wallet', icon: Smartphone, color: '#f59e0b' },
    CASH: { label: 'COD / Cash', icon: Banknote, color: '#64748b' },
};

function PaymentMethodBadge({ method }) {
    if (!method) return <span className="text-muted text-sm">—</span>;
    const m = METHOD_LABELS[method.toUpperCase()] || { label: method, icon: CreditCard, color: '#64748b' };
    const Icon = m.icon;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: m.color }}>
            <Icon size={13} /> {m.label}
        </span>
    );
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [refundModal, setRefundModal] = useState(null);
    const [refundData, setRefundData] = useState({ refundType: 'CANCELLATION', refundReason: '', refundAmount: 0 });
    const [statusModal, setStatusModal] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [viewerModal, setViewerModal] = useState(null);
    const limit = 20;

    const loadPayments = useCallback(async () => {
        try {
            setLoading(true);
            const r = await paymentAPI.getAll({ page, limit });
            const data = r.data?.data;
            setPayments(data?.payments || (Array.isArray(data) ? data : []));
            setTotal(data?.total || 0);
        } catch (e) {
            console.error('Load payments error:', e);
            showToast('Failed to load payments', 'error');
        } finally { setLoading(false); }
    }, [page, limit]);

    useEffect(() => { loadPayments(); }, [loadPayments]);

    async function handleRefund() {
        try {
            await paymentAPI.initiateRefund({ paymentId: refundModal.id, ...refundData });
            showToast('Refund initiated'); setRefundModal(null); loadPayments();
        } catch (e) { showToast(e.response?.data?.message || 'Refund failed', 'error'); }
    }

    async function handleStatusUpdate() {
        if (!newStatus || newStatus === statusModal.status) return;
        setUpdatingStatus(true);
        try {
            await paymentAPI.updateStatus(statusModal.id, { status: newStatus });
            showToast('Payment status updated');
            setStatusModal(null);
            loadPayments();
        } catch (e) {
            console.error('Status update error:', e.response?.data || e.message);
            showToast(e.response?.data?.message || 'Status update failed', 'error');
        } finally { setUpdatingStatus(false); }
    }

    return (
        <div>
            <div className="page-header"><h2>Payments & Invoices</h2><p>Track transactions, process refunds</p></div>
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Booking</th><th>Coupon</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                                payments.length === 0 ? <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No payments found</td></tr> :
                                    payments.map(p => (
                                        <tr key={p.id}>
                                            <td className="text-sm">{formatDateTime(p.createdAt)}</td>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{p.user?.name || '—'}</td>
                                            <td>{formatCurrency(p.amount)}</td>
                                            <td><PaymentMethodBadge method={p.paymentMethod} /></td>
                                            <td><span className={`badge ${statusColors[p.status] || 'badge-default'}`}>{p.status}</span></td>
                                            <td className="text-sm"><code>{p.booking?.bookingCode || p.subscription?.plan?.name || '—'}</code></td>
                                            <td className="text-sm">{p.couponCode || '—'}</td>
                                            <td>
                                                <div className="flex gap-1">
                                                    <button className="btn btn-sm btn-secondary" title="Update status" onClick={() => { setStatusModal(p); setNewStatus(p.status); }}><Edit2 size={14} /></button>
                                                    {p.status === 'SUCCESS' && p.paymentMethod !== 'CASH' && !p.refundId && (
                                                        <button className="btn btn-sm btn-warning" title="Refund" onClick={() => { setRefundModal(p); setRefundData({ refundType: 'CANCELLATION', refundReason: '', refundAmount: p.amount }); }}><RefreshCw size={14} /></button>
                                                    )}
                                                    {p.bookingId && p.status === 'SUCCESS' && (
                                                        <>
                                                            <button className="btn btn-sm btn-secondary" title="View Invoice Inline" onClick={() => setViewerModal(bookingAPI.getInvoiceDownloadUrl(p.bookingId))}><Eye size={14} /></button>
                                                            <a href={bookingAPI.getInvoiceDownloadUrl(p.bookingId)} download className="btn btn-sm btn-secondary" title="Download Invoice PDF" target="_blank" rel="noreferrer"><FileDown size={14} /></a>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {total > limit && <div className="flex justify-between items-center mt-4"><span className="text-sm text-muted">Page {page}</span><div className="flex gap-2"><button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button><button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button></div></div>}

            {refundModal && (
                <div className="modal-overlay" onClick={() => setRefundModal(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                    <div className="modal-header"><h3>Process Refund</h3><button onClick={() => setRefundModal(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body">
                        <p className="text-sm mb-4">Payment: {formatCurrency(refundModal.amount)} — {refundModal.user?.name}</p>
                        <div className="form-group"><label className="form-label">Refund Type</label><select className="form-select" value={refundData.refundType} onChange={e => setRefundData({ ...refundData, refundType: e.target.value })}>{['SLA_BREACH', 'COMPASSIONATE', 'CANCELLATION', 'OTHER'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Refund Amount</label><input className="form-input" type="number" value={refundData.refundAmount} onChange={e => setRefundData({ ...refundData, refundAmount: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="form-group"><label className="form-label">Reason</label><textarea className="form-input" rows={2} value={refundData.refundReason} onChange={e => setRefundData({ ...refundData, refundReason: e.target.value })} /></div>
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setRefundModal(null)}>Cancel</button><button className="btn btn-warning" onClick={handleRefund}>Process Refund</button></div>
                </div></div>
            )}

            {statusModal && (
                <div className="modal-overlay" onClick={() => setStatusModal(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                    <div className="modal-header"><h3>Update Payment Status</h3><button onClick={() => setStatusModal(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body">
                        <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: 'var(--bg-secondary)' }}>
                            <div>
                                <p className="text-sm font-medium">{statusModal.user?.name}</p>
                                <p className="text-xs text-muted">{formatCurrency(statusModal.amount)} · <PaymentMethodBadge method={statusModal.paymentMethod} /></p>
                            </div>
                        </div>
                        <p className="text-xs text-muted mb-3">Current: <span className={`badge ${statusColors[statusModal.status] || 'badge-default'}`}>{statusModal.status}</span></p>
                        <div className="form-group">
                            <label className="form-label">New Status</label>
                            <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                <option value="">Select status...</option>
                                {statusModal.paymentMethod === 'CASH'
                                    ? ['INITIATED', 'SUCCESS', 'FAILED'].map(s => <option key={s} value={s}>{s === 'SUCCESS' ? 'COLLECTED (Success)' : s}</option>)
                                    : ['INITIATED', 'SUCCESS', 'FAILED', 'REFUND_INITIATED', 'REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)
                                }
                            </select>
                        </div>
                        {statusModal.paymentMethod === 'CASH' && (
                            <p className="text-xs text-muted mt-2" style={{ background: '#fff7ed', padding: '8px 12px', borderRadius: 8, border: '1px solid #fed7aa' }}>
                                💵 COD payment — select <strong>COLLECTED (Success)</strong> once cash is received from customer.
                            </p>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={!newStatus || newStatus === statusModal.status || updatingStatus}>
                            {updatingStatus ? 'Updating...' : 'Update Status'}
                        </button>
                    </div>
                </div></div>
            )}

            {viewerModal && (
                <div className="modal-overlay" onClick={() => setViewerModal(null)} style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 20 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewerModal(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 28, width: 40, height: 40, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✕</button>
                        <div style={{ width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Preview</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                                <iframe 
                                    src={viewerModal} 
                                    style={{ width: '100%', height: '100%', border: 'none' }} 
                                    title="Invoice PDF" 
                                />
                            </div>
                            <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setViewerModal(null)} style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
