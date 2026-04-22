"use client";
import { useState, useEffect, useCallback } from "react";
import { DollarSign, RefreshCw, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import { paymentAPI } from "@/lib/api";
import { formatCurrency, formatDateTime, showToast } from "@/lib/hooks";

const statusColors = { INITIATED: 'badge-default', SUCCESS: 'badge-success', FAILED: 'badge-danger', REFUND_INITIATED: 'badge-warning', REFUNDED: 'badge-info' };

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [refundModal, setRefundModal] = useState(null);
    const [refundData, setRefundData] = useState({ refundType: 'CANCELLATION', refundReason: '', refundAmount: 0 });
    const [statusModal, setStatusModal] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const limit = 20;

    const loadPayments = useCallback(async () => {
        try { setLoading(true); const r = await paymentAPI.getAll({ page, limit }); setPayments(r.data?.data?.payments || r.data?.data || []); setTotal(r.data?.data?.total || 0); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }, [page, limit]);

    useEffect(() => { loadPayments(); }, [loadPayments]);

    async function handleRefund() {
        try {
            await paymentAPI.initiateRefund({ paymentId: refundModal.id, ...refundData });
            showToast('Refund initiated'); setRefundModal(null); loadPayments();
        } catch (e) { showToast(e.response?.data?.message || 'Refund failed', 'error'); }
    }

    async function handleStatusUpdate() {
        try {
            await paymentAPI.updateStatus(statusModal.id, { status: newStatus });
            showToast('Payment status updated'); setStatusModal(null); loadPayments();
        } catch (e) { showToast(e.response?.data?.message || 'Status update failed', 'error'); }
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
                                            <td className="text-sm">{p.paymentMethod || '—'}</td>
                                            <td><span className={`badge ${statusColors[p.status] || 'badge-default'}`}>{p.status}</span></td>
                                            <td className="text-sm"><code>{p.booking?.bookingCode || p.subscription?.plan?.name || '—'}</code></td>
                                            <td className="text-sm">{p.couponCode || '—'}</td>
                                            <td>
                                                <div className="flex gap-1">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => { setStatusModal(p); setNewStatus(p.status); }}><Edit2 size={14} /></button>
                                                    {p.status === 'SUCCESS' && !p.refundId && (
                                                        <button className="btn btn-sm btn-warning" onClick={() => { setRefundModal(p); setRefundData({ refundType: 'CANCELLATION', refundReason: '', refundAmount: p.amount }); }}><RefreshCw size={14} /></button>
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
                <div className="modal-overlay" onClick={() => setStatusModal(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                    <div className="modal-header"><h3>Update Payment Status</h3><button onClick={() => setStatusModal(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body">
                        <p className="text-sm mb-4">Payment: {formatCurrency(statusModal.amount)} — {statusModal.user?.name}</p>
                        <p className="text-xs text-muted mb-3">Current Status: <span className={`badge ${statusColors[statusModal.status] || 'badge-default'}`}>{statusModal.status}</span></p>
                        <div className="form-group"><label className="form-label">New Status</label><select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}><option value="">Select status...</option>{['INITIATED', 'SUCCESS', 'FAILED', 'REFUND_INITIATED', 'REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleStatusUpdate} disabled={!newStatus || newStatus === statusModal.status}>Update Status</button></div>
                </div></div>
            )}
        </div>
    );
}
