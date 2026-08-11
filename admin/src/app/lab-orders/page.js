'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Filter, Eye, AlertTriangle,
    CheckCircle, Truck, FileText, MoreVertical,
    Download, ExternalLink, RefreshCw, CalendarClock, X, User
} from 'lucide-react';
import { labAPI, activityAPI } from '@/lib/api';
import { debounce } from 'lodash';

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Phlebotomist Assignment</h2>
                        <p className="text-xs text-gray-400 font-medium">{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Assignment is handled entirely by Redcliffe Labs. This view only reflects data Redcliffe has sent us — it cannot be edited here.
                </p>

                {loading ? (
                    <div className="py-8 text-center text-sm text-gray-400 font-bold">Loading...</div>
                ) : updates.length === 0 ? (
                    <div className="py-8 text-center">
                        <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-500">No assignment data received yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {updates.map(u => (
                            <div key={u.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <p className="text-sm font-bold text-gray-800">{u.staffName || 'Unnamed'}</p>
                                <p className="text-xs text-gray-400">{u.staffPhone}</p>
                                {u.statusDetail && <p className="text-xs text-gray-500 mt-1">{u.statusDetail}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {order.trackingLink && (
                    <a
                        href={order.trackingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 mt-4 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-black rounded-xl text-sm hover:bg-blue-100 transition-colors"
                    >
                        <Truck className="w-4 h-4" /> Open Redcliffe Tracking Link
                    </a>
                )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Reschedule Booking</h2>
                        <p className="text-xs text-gray-400 font-medium">{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">New Date *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">New Time *</label>
                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Reason (optional)</label>
                        <input
                            value={form.reason}
                            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="e.g. Partner availability issue"
                        />
                    </div>

                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-colors"
                    >
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Cancel Booking</h2>
                        <p className="text-xs text-gray-400 font-medium">{order.clientRefId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    This cancels the booking with Redcliffe (if already confirmed there) and notifies the customer. This cannot be undone.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Reason (optional)</label>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="e.g. Duplicate booking"
                        />
                    </div>

                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full h-12 mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl transition-colors"
                    >
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'HOLD_CREATED': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'PAYMENT_PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'RESCHEDULED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'SAMPLE_COLLECTED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'PROCESSING': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
            case 'REPORT_GENERATED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            case 'MANUAL_RECOVERY_NEEDED': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
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
            alert('Report not available yet or download failed.');
        }
    };

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lab Orders</h1>
                    <p className="text-gray-500 font-medium">Manage and track Redcliffe Lab integrations</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-12 px-4 bg-white border border-gray-200 rounded-xl font-bold outline-none hover:bg-gray-50 transition-all"
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
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Reference</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Patient</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Tests</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Slot</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5 h-20 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                            <FileText className="w-12 h-12" />
                                            <p className="font-black text-xl">No Lab Orders Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5 shrink-0">
                                            <div className="font-bold text-gray-900">{order.clientRefId}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">#{order.redcliffeBookingId || 'Pending'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-800">{order.patient?.name || order.user?.name}</div>
                                            <div className="text-[10px] text-gray-400">{order.patient?.phone || order.user?.phone}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">
                                                {order.packages?.map((pkg, idx) => (
                                                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        {pkg.name || pkg.code}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-700 truncate max-w-[120px]">{order.slot?.date || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{order.slot?.time || 'No Slot'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {order.trackingLink && (
                                                    <a
                                                        href={order.trackingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Track Phlebo"
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {order.status === 'REPORT_GENERATED' && (
                                                    <button
                                                        onClick={() => handleDownloadReport(order.redcliffeBookingId || order.clientRefId)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Download Report"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {order.payments?.[0]?.status === 'SUCCESS' && (
                                                    <a
                                                        href={labAPI.getInvoiceDownloadUrl(order.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Download Invoice"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <div className="relative" ref={openMenuId === order.id ? menuRef : null}>
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {openMenuId === order.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden">
                                                            <button
                                                                onClick={() => { setAssignmentInfoOrder(order); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                                            >
                                                                <User className="w-4 h-4 text-emerald-600" />
                                                                View Assignment
                                                            </button>
                                                            <button
                                                                onClick={() => { setRescheduleModalOrder(order); setOpenMenuId(null); }}
                                                                disabled={!['CONFIRMED', 'RESCHEDULED'].includes(order.status)}
                                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <CalendarClock className="w-4 h-4 text-amber-600" />
                                                                Reschedule
                                                            </button>
                                                            <button
                                                                onClick={() => { setCancelModalOrder(order); setOpenMenuId(null); }}
                                                                disabled={['SAMPLE_COLLECTED', 'REPORT_GENERATED', 'FAILED'].includes(order.status)}
                                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
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

                {/* Pagination */}
                {!loading && orders.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Showing {orders.length} of {pagination.total} orders
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="h-10 px-4 border border-gray-200 rounded-lg font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <button
                                disabled={orders.length < pagination.limit}
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="h-10 px-4 border border-gray-200 rounded-lg font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
