"use client";
import { ExternalLink } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/hooks";

// ─── Shared payments + invoice display ─────────────────────────────────────
// Used anywhere a booking/lab order/product order's raw payment records need
// to be shown to an admin: BookingsPage's detail modal and UsersPage's
// record viewer both render the exact same list, so the two views can never
// drift out of sync on what "all payment info" means.
//
// Deliberately shows every payment row, not just the latest — a duplicate
// SUCCESS payment on the same record is a real anomaly worth surfacing, not
// something to collapse away.

function InvoiceLink({ invoice, paymentAmount }) {
    if (!invoice) {
        const reason = Number(paymentAmount) === 0
            ? 'No invoice generated (zero-amount payment)'
            : 'No invoice generated';
        return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>{reason}</span>;
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{invoice.invoiceNumber}</span>
                <span className="text-sm text-muted">₹{invoice.totalAmount} • {formatDate(invoice.invoiceDate)}</span>
            </div>
            {invoice.pdfUrl ? (
                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                    View / Download Invoice PDF <ExternalLink size={12} />
                </a>
            ) : (
                <span className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Invoice record exists but no PDF was generated</span>
            )}
        </div>
    );
}

const PAYMENT_STATUS_TONE = {
    SUCCESS: 'badge-success',
    FAILED: 'badge-danger',
    INITIATED: 'badge-warning',
    REFUNDED: 'badge-default',
};

export function PaymentRecordCard({ payment }) {
    return (
        <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>₹{payment.amount} • {payment.paymentMethod || '—'}</span>
                <span className={`badge ${PAYMENT_STATUS_TONE[payment.status] || 'badge-default'}`} style={{ fontSize: 10 }}>{payment.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: 'var(--text-muted)', marginBottom: 8 }}>
                <div>Created: {formatDateTime(payment.createdAt)}</div>
                {payment.discountAmount > 0 && <div>Discount: ₹{payment.discountAmount} {payment.couponCode ? `(${payment.couponCode})` : ''}</div>}
                {payment.razorpayPaymentId && <div style={{ gridColumn: '1 / -1' }}>Razorpay Payment: {payment.razorpayPaymentId}</div>}
                {payment.razorpayOrderId && <div style={{ gridColumn: '1 / -1' }}>Razorpay Order: {payment.razorpayOrderId}</div>}
                {payment.refundId && (
                    <div style={{ gridColumn: '1 / -1', color: 'var(--accent-danger, #ef4444)' }}>
                        Refunded: ₹{payment.refundAmount} ({payment.refundType || 'refund'}) — {payment.refundReason || 'no reason logged'} on {payment.refundedAt ? formatDateTime(payment.refundedAt) : '—'}
                    </div>
                )}
            </div>
            <InvoiceLink invoice={payment.invoice} paymentAmount={payment.amount} />
        </div>
    );
}

export function PaymentsSummaryWarning({ payments }) {
    if (!Array.isArray(payments) || payments.length <= 1) return null;
    const successPayments = payments.filter(p => p.status === 'SUCCESS');
    if (successPayments.length <= 1) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent-danger, #ef4444)', marginBottom: 10 }}>
            ⚠️ {successPayments.length} successful payments linked to this record — verify this isn&apos;t a duplicate charge
        </div>
    );
}

export default function PaymentsPanel({ payments }) {
    if (!Array.isArray(payments) || payments.length === 0) {
        return <div className="text-sm text-muted">No payment records found</div>;
    }
    return (
        <div>
            <PaymentsSummaryWarning payments={payments} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payments.map((p, i) => <PaymentRecordCard key={p.id || i} payment={p} />)}
            </div>
        </div>
    );
}
