"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Truck, FileText, MoreVertical,
    Download, CalendarClock, X, User
} from 'lucide-react';
import { labAPI, activityAPI } from '@/lib/api';
import { showToast } from '@/lib/hooks';
import { debounce } from 'lodash';

const statusBadge = {
    PENDING: 'badge-default',
    HOLD_CREATED: 'badge-default',
    PAYMENT_PENDING: 'badge-warning',
    CONFIRMED: 'badge-success',
    RESCHEDULED: 'badge-info',
    SAMPLE_COLLECTED: 'badge-info',
    PROCESSING: 'badge-info',
    REPORT_GENERATED: 'badge-purple',
    FAILED: 'badge-danger',
    MANUAL_RECOVERY_NEEDED: 'badge-warning',
};

// Phlebotomist assignment is done entirely by Redcliffe's own dispatch — Ayuxa
// has no roster to assign from. This modal is read-only: it shows whatever
// assignment data Redcliffe's webhook has actually given us (if any), instead
// of letting an admin type in a name/phone that has no relation to who
// Redcliffe really sends. Never write staff data from this UI.
function AssignmentInfoModal({ order, onClose }) {
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        activityAPI.getOrderUpdates(order.id)
            .then(res => setUpdates(res.data?.data || []))
            .catch(() => setUpdates([]))
            .finally(() => setLoading(false));
    }, [order.id]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0 }}>Phlebotomist Assignment</h3>
                        <p className="text-muted text-xs" style={{ marginTop: 2 }}>{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-secondary">✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p className="text-muted text-xs" style={{ lineHeight: 1.5 }}>
                        Assignment is handled entirely by Redcliffe Labs. This view only reflects data Redcliffe has sent us — it cannot be edited here.
                    </p>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading...</div>
                    ) : updates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            <User size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                            <p className="text-muted" style={{ fontWeight: 600 }}>No assignment data received yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {updates.map(u => (
                                <div key={u.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 10 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.staffName || 'Unnamed'}</div>
                                    <div className="text-muted text-xs">{u.staffPhone}</div>
                                    {u.statusDetail && <div className="text-muted text-xs" style={{ marginTop: 4 }}>{u.statusDetail}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {order.trackingLink && (
                        <a
                            href={order.trackingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Truck size={16} /> Open Redcliffe Tracking Link
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function RescheduleModal({ order, onClose, onSaved }) {
    const [form, setForm] = useState({ date: '', time: '', reason: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!form.date || !form.time) {
            setError('Date and time are required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await labAPI.reschedule(order.id, form);
            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to reschedule. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0 }}>Reschedule Booking</h3>
                        <p className="text-muted text-xs" style={{ marginTop: 2 }}>{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-secondary">✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-grid-2">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">New Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={form.date}
                                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">New Time *</label>
                            <input
                                type="time"
                                className="form-input"
                                value={form.time}
                                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Reason (optional)</label>
                        <input
                            className="form-input"
                            value={form.reason}
                            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                            placeholder="e.g. Partner availability issue"
                        />
                    </div>

                    {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 600 }}>{error}</p>}

                    <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
                        {saving ? 'Rescheduling...' : 'Reschedule & Notify Customer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CancelBookingModal({ order, onClose, onSaved }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setSaving(true);
        setError('');
        try {
            await labAPI.adminCancel(order.id, { reason });
            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to cancel. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0 }}>Cancel Booking</h3>
                        <p className="text-muted text-xs" style={{ marginTop: 2 }}>{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-secondary">✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p className="text-muted text-xs" style={{ lineHeight: 1.5 }}>
                        This cancels the booking with Redcliffe (if already confirmed there) and notifies the customer. This cannot be undone.
                    </p>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Reason (optional)</label>
                        <input
                            className="form-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Duplicate booking"
                        />
                    </div>

                    {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 600 }}>{error}</p>}

                    <button onClick={handleSubmit} disabled={saving} className="btn btn-danger">
                        {saving ? 'Cancelling...' : 'Cancel Booking & Notify Customer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function LabOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [openMenuId, setOpenMenuId] = useState(null);
    const [assignmentInfoOrder, setAssignmentInfoOrder] = useState(null);
    const [rescheduleModalOrder, setRescheduleModalOrder] = useState(null);
    const [cancelModalOrder, setCancelModalOrder] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchOrders = async (currentSearch, currentStatus, currentPage) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit,
                search: currentSearch || undefined,
                status: currentStatus || undefined
            };
            const res = await labAPI.getOrders(params);
            if (res.data.success) {
                setOrders(res.data.data);
                setPagination(prev => ({ ...prev, total: res.data.total }));
            }
        } catch (error) {
            console.error('Failed to fetch lab orders:', error);
            showToast('Failed to load lab orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((q) => fetchOrders(q, statusFilter, 1), 500),
        [statusFilter]
    );

    useEffect(() => {
        fetchOrders(search, statusFilter, pagination.page);
    }, [statusFilter, pagination.page]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value);
    };

    const handleDownloadReport = async (id) => {
        try {
            const res = await labAPI.downloadReport(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showToast('Report not available yet or download failed.', 'error');
        }
    };

    return (
        <div>
            <div className="page-header"><h2>Blood Test Orders</h2><p>Manage and track Redcliffe Lab integrations</p></div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search orders..."
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <select
                    className="form-select"
                    style={{ width: 190 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="HOLD_CREATED">Slot Reserved</option>
                    <option value="PAYMENT_PENDING">Payment Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="SAMPLE_COLLECTED">Collected</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="REPORT_GENERATED">Report Out</option>
                    <option value="FAILED">Failed</option>
                    <option value="MANUAL_RECOVERY_NEEDED">Needs Attention</option>
                </select>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Patient</th>
                                <th>Tests</th>
                                <th>Slot</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                                        <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                                        <div style={{ fontWeight: 600 }}>No Lab Orders Found</div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.clientRefId}</div>
                                            <div className="text-muted text-xs">#{order.redcliffeBookingId || 'Pending'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{order.patient?.name || order.user?.name}</div>
                                            <div className="text-muted text-xs">{order.patient?.phone || order.user?.phone}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {order.packages?.map((pkg, idx) => (
                                                    <span key={idx} className="badge badge-success" style={{ fontSize: 10 }}>
                                                        {pkg.name || pkg.code}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm" style={{ fontWeight: 500 }}>{order.slot?.date || 'N/A'}</div>
                                            <div className="text-muted text-xs">{order.slot?.time || 'No Slot'}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadge[order.status] || 'badge-default'}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                                {order.trackingLink && (
                                                    <a
                                                        href={order.trackingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-secondary"
                                                        title="Track Phlebo"
                                                    >
                                                        <Truck size={14} />
                                                    </a>
                                                )}
                                                {order.status === 'REPORT_GENERATED' && (
                                                    <button
                                                        onClick={() => handleDownloadReport(order.redcliffeBookingId || order.clientRefId)}
                                                        className="btn btn-sm btn-secondary"
                                                        title="Download Report"
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                )}
                                                {order.payments?.[0]?.status === 'SUCCESS' && (
                                                    <a
                                                        href={labAPI.getInvoiceDownloadUrl(order.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-secondary"
                                                        title="Download Invoice"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                )}
                                                <div style={{ position: 'relative' }} ref={openMenuId === order.id ? menuRef : null}>
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                                                        className="btn btn-sm btn-secondary"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                    {openMenuId === order.id && (
                                                        <div
                                                            className="card"
                                                            style={{
                                                                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                                                                width: 220, zIndex: 10, padding: 4, boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.2))',
                                                            }}
                                                        >
                                                            <button
                                                                onClick={() => { setAssignmentInfoOrder(order); setOpenMenuId(null); }}
                                                                className="btn btn-secondary"
                                                                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, border: 'none', background: 'transparent' }}
                                                            >
                                                                <User size={14} style={{ color: 'var(--accent-primary)' }} />
                                                                View Assignment
                                                            </button>
                                                            <button
                                                                onClick={() => { setRescheduleModalOrder(order); setOpenMenuId(null); }}
                                                                disabled={!['CONFIRMED', 'RESCHEDULED'].includes(order.status)}
                                                                className="btn btn-secondary"
                                                                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, border: 'none', background: 'transparent' }}
                                                            >
                                                                <CalendarClock size={14} style={{ color: '#D97706' }} />
                                                                Reschedule
                                                            </button>
                                                            <button
                                                                onClick={() => { setCancelModalOrder(order); setOpenMenuId(null); }}
                                                                disabled={['SAMPLE_COLLECTED', 'REPORT_GENERATED', 'FAILED'].includes(order.status)}
                                                                className="btn btn-secondary"
                                                                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, border: 'none', background: 'transparent', color: 'var(--accent-danger)' }}
                                                            >
                                                                <X size={14} />
                                                                Cancel Booking
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && orders.length > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="text-muted text-xs">
                            Showing {orders.length} of {pagination.total} orders
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="btn btn-sm btn-secondary"
                            >
                                Previous
                            </button>
                            <button
                                disabled={orders.length < pagination.limit}
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="btn btn-sm btn-secondary"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {assignmentInfoOrder && (
                <AssignmentInfoModal
                    order={assignmentInfoOrder}
                    onClose={() => setAssignmentInfoOrder(null)}
                />
            )}
            {rescheduleModalOrder && (
                <RescheduleModal
                    order={rescheduleModalOrder}
                    onClose={() => setRescheduleModalOrder(null)}
                    onSaved={() => {
                        setRescheduleModalOrder(null);
                        fetchOrders(search, statusFilter, pagination.page);
                    }}
                />
            )}
            {cancelModalOrder && (
                <CancelBookingModal
                    order={cancelModalOrder}
                    onClose={() => setCancelModalOrder(null)}
                    onSaved={() => {
                        setCancelModalOrder(null);
                        fetchOrders(search, statusFilter, pagination.page);
                    }}
                />
            )}
        </div>
    );
}
