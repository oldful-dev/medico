"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Eye, UserPlus, AlertTriangle, ChevronLeft, ChevronRight, Edit2, Save, X, Clock, Phone } from "lucide-react";
import { bookingAPI, caregiverAPI, cityAPI, labAPI, activityAPI } from "@/lib/api";
import { formatDate, formatDateTime, formatCurrency, showToast } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

const statusColors = { PENDING: 'badge-warning', CONFIRMED: 'badge-info', ASSIGNED: 'badge-info', IN_PROGRESS: 'badge-purple', COMPLETED: 'badge-success', CANCELLED: 'badge-default', SLA_BREACH: 'badge-danger', PAYMENT_FAILED: 'badge-danger' };
const paymentStatusColors = { PENDING: 'badge-warning', INITIATED: 'badge-info', SUCCESS: 'badge-success', FAILED: 'badge-danger', REFUNDED: 'badge-secondary', REFUND_INITIATED: 'badge-purple', PAYMENT_FAILED: 'badge-danger' };

const EVENT_TYPES = [
    { value: 'doctor_assigned',       label: '👨‍⚕️ Doctor Assigned' },
    { value: 'caregiver_assigned',    label: '🤝 Caregiver Assigned' },
    { value: 'nurse_assigned',        label: '💉 Nurse Assigned' },
    { value: 'appointment_confirmed', label: '✅ Appointment Confirmed' },
    { value: 'sample_collected',      label: '🧪 Lab Sample Collected' },
    { value: 'out_for_delivery',      label: '🚴 Order Out for Delivery' },
    { value: 'medicine_delivered',    label: '📦 Medicine Delivered' },
    { value: 'service_rescheduled',   label: '📅 Service Rescheduled' },
    { value: 'payment_confirmed',     label: '💳 Payment Confirmed' },
];

const EVENT_COLORS = {
    doctor_assigned:       '#2563EB',
    caregiver_assigned:    '#DB2777',
    nurse_assigned:        '#7C3AED',
    appointment_confirmed: '#059669',
    sample_collected:      '#7C3AED',
    out_for_delivery:      '#D97706',
    medicine_delivered:    '#048357',
    service_rescheduled:   '#EA580C',
    payment_confirmed:     '#0284C7',
};

export default function BookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [cities, setCities] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', cityId: '' });
    const [viewMode, setViewMode] = useState("dateGrid"); // dateGrid | clientConsolidated
    const [expandedClients, setExpandedClients] = useState({});
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedCaregiver, setSelectedCaregiver] = useState('');
    const [cgSearch, setCgSearch] = useState('');
    const [cgRoleFilter, setCgRoleFilter] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [servicePersonModal, setServicePersonModal] = useState(false);
    const [servicePerson, setServicePerson] = useState({ name: '', phone: '', notes: '' });

    // ── Lab orders tab inside detail modal ──────────
    const [labOrders, setLabOrders] = useState([]);
    const [labLoading, setLabLoading] = useState(false);
    const [detailTab, setDetailTab] = useState('details'); // 'details' | 'lab'

    // ── Lab order activity history (read-only) ──────
    // Phlebotomist assignment is done entirely by Redcliffe's own dispatch —
    // Ayuxa has no roster to assign from, so this is view-only: it shows
    // whatever ActivityUpdate rows Redcliffe's webhook has actually produced,
    // never lets an admin type in a fabricated staff name/phone.
    const [expandedLabOrderId, setExpandedLabOrderId] = useState(null);
    const [orderUpdates, setOrderUpdates] = useState([]); // activity updates for the expanded lab order

    const limit = 20;

    useEffect(() => {
        Promise.all([cityAPI.getAll(), caregiverAPI.getAll()]).then(([c, cg]) => {
            setCities(c.data?.data || []);
            setCaregivers(cg.data?.data || []);
        }).catch(() => { });
    }, []);

    const loadBookingsRef = useRef(loadBookings);
    useEffect(() => { loadBookingsRef.current = loadBookings; });

    useEffect(() => { loadBookings(); }, [page, filters, search]);

    useEffect(() => {
        (async () => {
            try {
                const socket = await getSocket();
                if (!socket) return;

                socket.on("new_booking", () => loadBookingsRef.current(false));
                socket.on("booking_updated", (u) => {
                    setBookings(prev => prev.map(b => b.id === u.id ? { ...b, ...u } : b));
                    setSelected(prev => prev?.id === u.id ? { ...prev, ...u } : prev);
                });
                socket.on("booking_status_changed", (d) => {
                    setBookings(prev => prev.map(b => b.id === d.bookingId ? { ...b, status: d.status } : b));
                    setSelected(prev => prev?.id === d.bookingId ? { ...prev, status: d.status } : prev);
                });
                socket.on("booking_assigned", (d) => {
                    setBookings(prev => prev.map(b => b.id === d.bookingId ? { ...b, caregiver: { name: d.caregiverName } } : b));
                    setSelected(prev => prev?.id === d.bookingId ? { ...prev, caregiver: { name: d.caregiverName } } : prev);
                });
                socket.on("booking_payment_updated", (d) => {
                    const apply = b => ({ ...b, ...(d.bookingStatus ? { status: d.bookingStatus } : {}), paymentStatus: d.paymentStatus });
                    setBookings(prev => prev.map(b => b.id === d.bookingId ? apply(b) : b));
                    setSelected(prev => prev?.id === d.bookingId ? apply(prev) : prev);
                });

                return () => {
                    socket.off("new_booking");
                    socket.off("booking_updated");
                    socket.off("booking_status_changed");
                    socket.off("booking_assigned");
                    socket.off("booking_payment_updated");
                };
            } catch (err) {
                console.error("[BookingsPage] Socket error:", err);
            }
        })();
    }, []);

    async function loadBookings(showLoading = true) {
        try {
            if (showLoading) setLoading(true);
            const params = { page, limit, ...filters };
            if (search) params.search = search;
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await bookingAPI.getAll(params);
            const data = res.data?.data?.bookings || res.data?.data || [];
            setBookings(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
            setTotal(res.data?.data?.total || 0);
        } catch (e) { console.error(e); }
        finally { if (showLoading) setLoading(false); }
    }

    async function viewBooking(id) {
        try {
            const res = await bookingAPI.getById(id);
            const booking = res.data?.data;
            setSelected(booking);
            setDetailTab('details');
            if (booking?.user?.id || booking?.userId) {
                loadLabOrders(booking.user?.id || booking.userId);
            }
        } catch { showToast('Failed to load booking', 'error'); }
    }

    async function loadLabOrders(userId) {
        setLabLoading(true);
        try {
            const res = await labAPI.getOrders({ userId, limit: 50 });
            setLabOrders(res.data?.data?.orders || res.data?.data || []);
        } catch { setLabOrders([]); }
        finally { setLabLoading(false); }
    }

    async function loadOrderUpdates(labOrderId) {
        try {
            const res = await activityAPI.getOrderUpdates(labOrderId);
            setOrderUpdates(res.data?.data || []);
        } catch { setOrderUpdates([]); }
    }

    async function handleAssign() {
        if (!selectedCaregiver) { showToast('Select a staff member', 'error'); return; }
        try {
            await bookingAPI.assignCaregiver(assignModal.id, { caregiverId: selectedCaregiver });
            showToast('Staff assigned successfully');
            setAssignModal(null);
            setSelectedCaregiver('');
            setCgSearch('');
            setCgRoleFilter('');
            loadBookings();
        } catch (e) { showToast(e.response?.data?.message || 'Assign failed', 'error'); }
    }

    async function updateStatus(id, status) {
        try {
            await bookingAPI.updateStatus(id, { status });
            showToast(`Status updated to ${status}`);
            loadBookings();
            setSelected(null);
        } catch { showToast('Update failed', 'error'); }
    }

    async function escalateBooking(id) {
        try {
            await bookingAPI.escalate(id);
            showToast('Booking escalated');
            loadBookings();
            setSelected(null);
        } catch { showToast('Escalation failed', 'error'); }
    }

    async function updateBookingDetails() {
        try {
            const calls = [];
            if (editData.status && editData.status !== selected.status)
                calls.push(bookingAPI.updateStatus(selected.id, { status: editData.status }));
            if (editData.paymentStatus && editData.paymentStatus !== (selected.paymentStatus || 'PENDING'))
                calls.push(bookingAPI.updatePaymentStatus(selected.id, { paymentStatus: editData.paymentStatus }));
            if (!calls.length) { showToast('No changes', 'info'); setEditMode(false); return; }
            await Promise.all(calls);
            showToast('Updated successfully', 'success');
            setEditMode(false);
            await viewBooking(selected.id);
        } catch (e) { showToast(e.response?.data?.message || 'Update failed', 'error'); }
    }

    async function addServicePerson() {
        if (!servicePerson.name || !servicePerson.phone) { showToast('Enter name and phone', 'error'); return; }
        try {
            await bookingAPI.updateServicePerson(selected.id, {
                servicePersonName: servicePerson.name,
                servicePersonPhone: servicePerson.phone,
                servicePersonNotes: servicePerson.notes || null,
            });
            showToast('Service person added');
            setServicePersonModal(false);
            setServicePerson({ name: '', phone: '', notes: '' });
            await viewBooking(selected.id);
        } catch { showToast('Failed to add service person', 'error'); }
    }

    // Toggle the read-only activity history for a lab order card in the "lab" tab.
    function toggleLabOrderHistory(order) {
        if (expandedLabOrderId === order.id) {
            setExpandedLabOrderId(null);
            setOrderUpdates([]);
            return;
        }
        setExpandedLabOrderId(order.id);
        loadOrderUpdates(order.id);
    }

    function formatTs(iso) {
        try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    }

    return (
        <div>
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <h2>Booking Management</h2>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>
                        <span className="pulse-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'white', marginRight: 6 }}></span>
                        Live Stream
                    </span>
                </div>
                <p>View, assign, and manage all bookings in real-time</p>
            </div>

            {/* ── Filter Bar ── */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <form onSubmit={e => { e.preventDefault(); setPage(1); loadBookings(); }} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search booking code, user..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary"><Search size={16} /></button>
                </form>
                <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                    <option value="">All Status</option>
                    {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filters.cityId} onChange={e => { setFilters({ ...filters, cityId: e.target.value }); setPage(1); }}>
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, gap: 4 }}>
                    <button
                        className={`btn btn-sm ${viewMode === 'dateGrid' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => setViewMode('dateGrid')}
                    >
                        Date Grid
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === 'clientConsolidated' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => setViewMode('clientConsolidated')}
                    >
                        Client Consolidated
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-secondary)', borderRadius: 12, color: 'var(--text-muted)' }}>Loading bookings...</div>
            ) : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-secondary)', borderRadius: 12, color: 'var(--text-muted)' }}>No bookings found</div>
            ) : viewMode === 'dateGrid' ? (
                /* ─── DATE-WISE GRID LAYOUT ─── */
                <div>
                    {(() => {
                        const dateGroups = {};
                        bookings.forEach(b => {
                            const dateStr = b.scheduledDate ? formatDate(b.scheduledDate) : "Unscheduled";
                            if (!dateGroups[dateStr]) dateGroups[dateStr] = [];
                            dateGroups[dateStr].push(b);
                        });
                        return Object.entries(dateGroups).map(([date, list]) => (
                            <div key={date} style={{ marginBottom: 28 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    📅 {date} <span className="badge badge-default" style={{ fontSize: 11, padding: '2px 8px' }}>{list.length} bookings</span>
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
                                    {list.map(b => (
                                        <div key={b.id} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <code style={{ fontSize: 11, color: 'var(--accent-primary-light)' }}>{b.bookingCode}</code>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{b.user?.name || '—'}</div>
                                                </div>
                                                <span className={`badge ${statusColors[b.status] || 'badge-default'}`}>{b.status?.replace(/_/g, ' ')}</span>
                                            </div>

                                            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed var(--border-color)', paddingTop: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">Service:</span>
                                                    <span style={{ fontWeight: 500 }}>{b.service?.name || '—'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">City:</span>
                                                    <span>{b.city?.name || '—'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">Staff:</span>
                                                    <span>{b.caregiver?.name || '—'}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                                                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(b.amount)}</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-sm btn-secondary" style={{ padding: 6 }} onClick={() => viewBooking(b.id)} title="View Detail"><Eye size={13} /></button>
                                                    {!b.isEscalated && (
                                                        <button className="btn btn-sm btn-warning" style={{ padding: 6 }} onClick={() => escalateBooking(b.id)} title="Escalate"><AlertTriangle size={13} /></button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            ) : (
                /* ─── CLIENT CONSOLIDATED LAYOUT ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(() => {
                        const clientGroups = {};
                        bookings.forEach(b => {
                            const u = b.user || { id: "deleted", name: "Deleted User", phone: "—", uniqueUserId: "—" };
                            if (!clientGroups[u.id]) {
                                clientGroups[u.id] = {
                                    user: u,
                                    bookings: []
                                };
                            }
                            clientGroups[u.id].bookings.push(b);
                        });
                        return Object.values(clientGroups).map(group => {
                            const isExpanded = !!expandedClients[group.user.id];
                            const totalSpent = group.bookings.reduce((sum, b) => sum + b.amount, 0);
                            return (
                                <div key={group.user.id} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                                    <div 
                                        style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-card)', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
                                        onClick={() => setExpandedClients(prev => ({ ...prev, [group.user.id]: !prev[group.user.id] }))}
                                    >
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 16 }}>
                                                {group.user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{group.user.name}</div>
                                                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                                    <span>Ref ID: <code style={{ color: 'var(--accent-primary-light)' }}>{group.user.uniqueUserId}</code></span>
                                                    <span>•</span>
                                                    <span>{group.user.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Spent / Orders</div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, marginTop: 2 }}>
                                                    {formatCurrency(totalSpent)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({group.bookings.length})</span>
                                                </div>
                                            </div>
                                            <button className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                                                {isExpanded ? 'Collapse' : 'View History'}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: 20, background: 'rgba(0,0,0,0.12)' }}>
                                            <h4 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Date-Wise Order History</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {group.bookings.map(b => (
                                                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }}>
                                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', width: 140 }}>
                                                                📅 {formatDate(b.scheduledDate)}
                                                            </div>
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                {b.service?.name}
                                                            </div>
                                                            <code style={{ fontSize: 10, color: 'var(--accent-primary-light)' }}>{b.bookingCode}</code>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(b.amount)}</span>
                                                            <span className={`badge ${statusColors[b.status] || 'badge-default'}`} style={{ fontSize: 9 }}>{b.status}</span>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => viewBooking(b.id)}>Details</button>
                                                                {!b.isEscalated && (
                                                                    <button className="btn btn-sm btn-warning" style={{ padding: '4px' }} onClick={() => escalateBooking(b.id)}><AlertTriangle size={12} /></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* ── Pagination ── */}
            {total > limit && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted">Page {page} of {Math.ceil(total / limit)}</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                        <button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                BOOKING DETAIL MODAL
            ══════════════════════════════════════════ */}
            {selected && (
                <div className="modal-overlay" onClick={() => { setSelected(null); setEditMode(false); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Booking — {selected.bookingCode}</h3>
                            <button onClick={() => { setSelected(null); setEditMode(false); }} className="btn btn-sm btn-secondary"><X size={14} /></button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', padding: '0 20px', background: 'var(--bg-card)' }}>
                            {['details', 'lab'].map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)}
                                    style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: detailTab === tab ? 600 : 400, color: detailTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: detailTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent', fontSize: 13 }}>
                                    {tab === 'details' ? 'Booking Details' : '🧪 Lab Orders & Assignments'}
                                </button>
                            ))}
                        </div>

                        <div className="modal-body" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

                            {/* ── DETAILS TAB ── */}
                            {detailTab === 'details' && (<>
                                {/* User & Service */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                    <div><label className="form-label">User Name</label><div className="text-sm font-semibold">{selected.user?.name}</div></div>
                                    <div><label className="form-label">User ID</label><div className="text-sm">{selected.user?.uniqueUserId}</div></div>
                                    <div><label className="form-label">Phone</label><div className="text-sm">{selected.user?.phone}</div></div>
                                    <div><label className="form-label">City</label><div className="text-sm">{selected.city?.name}</div></div>
                                    <div><label className="form-label">Service Type</label><div className="text-sm font-semibold">{selected.service?.name}</div></div>
                                </div>

                                {/* Service Details */}
                                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                    <h4 style={{ marginBottom: 12, fontWeight: 600 }}>Service Details</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div><label className="form-label">Scheduled Date</label><div className="text-sm">{selected.scheduledDate ? formatDate(selected.scheduledDate) : (selected.service?.slug === 'blood-test' && labOrders?.[0]?.slot?.date ? formatDate(labOrders[0].slot.date) : '—')}</div></div>
                                        <div><label className="form-label">Scheduled Time</label><div className="text-sm">{selected.scheduledTime || (selected.service?.slug === 'blood-test' && labOrders?.[0]?.slot?.time ? labOrders[0].slot.time : selected.formDataJson?.scheduleTime || selected.formDataJson?.time || '—')}</div></div>
                                        {selected.startDate && <div><label className="form-label">Start Date</label><div className="text-sm">{formatDate(selected.startDate)}</div></div>}
                                        {selected.endDate && <div><label className="form-label">End Date</label><div className="text-sm">{formatDate(selected.endDate)}</div></div>}
                                        {selected.pickupAddress && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Pickup Address</label><div className="text-sm">{selected.pickupAddress}</div></div>}
                                        {selected.dropAddress && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Drop Address</label><div className="text-sm">{selected.dropAddress}</div></div>}
                                        {selected.addressLine && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Address</label><div className="text-sm">{selected.addressLine}</div></div>}
                                        {selected.doctorType && <><div><label className="form-label">Doctor Type</label><div className="text-sm">{selected.doctorType}</div></div>{selected.symptoms && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Symptoms</label><div className="text-sm">{Array.isArray(selected.symptoms) ? selected.symptoms.join(', ') : selected.symptoms}</div></div>}</>}
                                        {selected.staffType && <><div><label className="form-label">Staff Type</label><div className="text-sm">{selected.staffType}</div></div>{selected.shiftDuration && <div><label className="form-label">Shift</label><div className="text-sm">{selected.shiftDuration}</div></div>}</>}
                                        {selected.vehicleType && <div><label className="form-label">Vehicle</label><div className="text-sm">{selected.vehicleType}</div></div>}
                                        {selected.requirements && selected.requirements.length > 0 && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Requirements</label><div className="text-sm">{selected.requirements.join(', ')}</div></div>}
                                        {selected.prescriptionUrl && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Uploaded Prescription</label><div style={{ marginTop: 4 }}><a href={selected.prescriptionUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-primary)', color: '#fff', padding: '6px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>📄 View Prescription</a></div></div>}
                                    </div>
                                </div>

                                {/* Status & Payment */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label className="form-label">Status</label>
                                        {editMode
                                            ? <select className="form-select" value={editData.status || ''} onChange={e => setEditData({ ...editData, status: e.target.value })}>{Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select>
                                            : <span className={`badge ${statusColors[selected.status]}`}>{selected.status?.replace(/_/g, ' ')}</span>}
                                    </div>
                                    <div>
                                        <label className="form-label">Payment Status</label>
                                        {editMode
                                            ? <select className="form-select" value={editData.paymentStatus || ''} onChange={e => setEditData({ ...editData, paymentStatus: e.target.value })}>{Object.keys(paymentStatusColors).map(s => <option key={s} value={s}>{s}</option>)}</select>
                                            : <span className={`badge ${paymentStatusColors[selected.paymentStatus] || 'badge-warning'}`}>{selected.paymentStatus || 'PENDING'}</span>}
                                    </div>
                                    <div>
                                        <label className="form-label">Amount</label>
                                        <div className="text-sm font-semibold">{formatCurrency(selected.amount)}</div>
                                        {selected.paymentStatus === 'SUCCESS' && (
                                            <a
                                                href={bookingAPI.getInvoiceDownloadUrl(selected.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}
                                            >
                                                📄 View Invoice
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Staff Assignment */}
                                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label className="form-label">Staff Assignment</label>
                                    </div>
                                    <div className="text-sm">{selected.caregiver?.name ? `${selected.caregiver.name} — ${selected.caregiver.phone}` : '—'}</div>
                                </div>

                                {/* External Contact Info */}
                                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h4 style={{ fontWeight: 600 }}>External Contact Info</h4>
                                        {(selected.status === 'PENDING' || selected.status === 'CONFIRMED') && (
                                            <button className="btn btn-sm btn-primary" onClick={() => setServicePersonModal(true)}>+ Add</button>
                                        )}
                                    </div>
                                    {selected.servicePersonName
                                        ? <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8 }}><strong>{selected.servicePersonName}</strong><div className="text-sm">{selected.servicePersonPhone}</div>{selected.servicePersonNotes && <div className="text-sm text-muted">{selected.servicePersonNotes}</div>}</div>
                                        : <div className="text-sm text-muted">None added</div>}
                                </div>

                                {/* Dynamic Booking Form Data Json Details (Rendered if formDataJson exists) */}
                                {selected.formDataJson && typeof selected.formDataJson === 'object' && Object.keys(selected.formDataJson).length > 0 && (() => {
                                    const fd = selected.formDataJson;
                                    const formatKey = (k) => {
                                        // Convert camelCase or snake_case to human readable Title Case
                                        const result = k.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ");
                                        return result.charAt(0).toUpperCase() + result.slice(1);
                                    };
                                    const renderVal = (v) => {
                                        if (typeof v === 'boolean') return v ? '✅ Yes' : '❌ No';
                                        if (Array.isArray(v)) return v.join(', ');
                                        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                                        return String(v);
                                    };
                                    return (
                                        <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                            <h4 style={{ marginBottom: 12, fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                📝 Form Submission & Special Requests
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                {Object.entries(fd).map(([key, val]) => {
                                                    if (val === undefined || val === null || val === '') return null;
                                                    // Skip attributes already mapped at the top level
                                                    if (['serviceId', 'id', 'price', 'address', 'scheduleTime', 'time', 'providerType'].includes(key)) return null;
                                                    // Make description/special fields full width
                                                    // Detect if value is an attachment URL or list of URLs
                                                    const isAttachment = key.toLowerCase().includes('attachment') || key.toLowerCase().includes('prescription') || key.toLowerCase().includes('file');
                                                    let parsedAttachments = [];
                                                    if (isAttachment) {
                                                        try {
                                                            if (Array.isArray(val)) {
                                                                parsedAttachments = val;
                                                            } else if (typeof val === 'string') {
                                                                if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
                                                                    parsedAttachments = JSON.parse(val);
                                                                } else if (val.startsWith('http')) {
                                                                    parsedAttachments = [val];
                                                                }
                                                            }
                                                        } catch (e) {
                                                            parsedAttachments = [];
                                                        }
                                                    }
                                                    
                                                    const isLongText = String(val).length > 60 || ['description', 'notes', 'specialRequirements', 'additionalDetails', 'purposeOfTravel', 'symptoms', 'addressLine'].includes(key) || isAttachment;
                                                    return (
                                                        <div key={key} style={{ gridColumn: isLongText ? '1 / -1' : 'auto' }}>
                                                            <label className="form-label" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatKey(key)}</label>
                                                            <div className="text-sm font-semibold" style={{ 
                                                                background: isLongText ? 'var(--bg-glass)' : 'transparent', 
                                                                padding: isLongText ? '8px 12px' : '0', 
                                                                borderRadius: isLongText ? 8 : 0,
                                                                border: isLongText ? '1px solid var(--border-color)' : 'none',
                                                                color: 'var(--text-primary)'
                                                            }}>
                                                                {isAttachment && parsedAttachments.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                                                                        {parsedAttachments.map((url, idx) => (
                                                                            <a 
                                                                                key={idx} 
                                                                                href={url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                style={{ 
                                                                                    display: 'inline-flex', 
                                                                                    alignItems: 'center', 
                                                                                    gap: 6, 
                                                                                    background: 'var(--accent-primary)', 
                                                                                    color: '#fff', 
                                                                                    padding: '6px 12px', 
                                                                                    borderRadius: 6, 
                                                                                    textDecoration: 'none',
                                                                                    fontSize: 12,
                                                                                    fontWeight: 600,
                                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                                                }}
                                                                            >
                                                                                📁 View Attachment {parsedAttachments.length > 1 ? `#${idx + 1}` : ''}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                ) : renderVal(val)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {selected.adminNotes && <div><label className="form-label">Admin Notes</label><div className="text-sm" style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8 }}>{selected.adminNotes}</div></div>}
                            </>)}

                            {/* ── LAB ORDERS TAB ── */}
                            {detailTab === 'lab' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h4 style={{ fontWeight: 600 }}>Lab Orders</h4>
                                        <span className="text-sm text-muted">{labOrders.length} order{labOrders.length !== 1 ? 's' : ''}</span>
                                    </div>

                                    {labLoading ? (
                                        <div className="text-sm text-muted" style={{ textAlign: 'center', padding: 24 }}>Loading lab orders…</div>
                                    ) : labOrders.length === 0 ? (
                                        <div className="text-sm text-muted" style={{ textAlign: 'center', padding: 32 }}>No lab orders linked to this booking.</div>
                                    ) : labOrders.map(order => (
                                        <div key={order.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
                                            {/* Lab order header */}
                                            <div style={{ background: 'var(--bg-glass)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{order.clientRefId}</span>
                                                    <span className={`badge badge-${order.status === 'CONFIRMED' ? 'info' : order.status === 'REPORT_GENERATED' ? 'success' : order.status === 'CANCELLED' ? 'default' : 'warning'}`} style={{ marginLeft: 8, fontSize: 10 }}>{order.status}</span>
                                                </div>
                                            </div>

                                            {/* Lab order body */}
                                            <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                                <div><label className="form-label" style={{ fontSize: 10 }}>Patient</label><div className="text-sm">{order.patient?.name || '—'}</div></div>
                                                <div><label className="form-label" style={{ fontSize: 10 }}>Collection</label><div className="text-sm">{order.bookingType}</div></div>
                                                <div><label className="form-label" style={{ fontSize: 10 }}>Slot</label><div className="text-sm">{order.slot?.date} {order.slot?.time}</div></div>
                                                <div><label className="form-label" style={{ fontSize: 10 }}>Package</label><div className="text-sm">{order.packages && order.packages.length > 0 ? (Array.isArray(order.packages) && typeof order.packages[0] === 'object' ? order.packages.map(p => p.name).join(', ') : order.packages.join(', ')) : '—'}</div></div>
                                                <div><label className="form-label" style={{ fontSize: 10 }}>Amount</label><div className="text-sm">₹{order.packages && order.packages.length > 0 ? (Array.isArray(order.packages) && typeof order.packages[0] === 'object' ? order.packages.reduce((sum, p) => sum + (p.price || p.cost || 0), 0) : order.paymentDetails?.amount || '—') : order.paymentDetails?.amount || '—'}</div></div>
                                                {order.assignedStaff && (
                                                    <div><label className="form-label" style={{ fontSize: 10 }}>Assigned Staff</label>
                                                        <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#DBEAFE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>👤</span>
                                                            <span><strong>{order.assignedStaff.name}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{order.assignedStaff.staffId}</span></span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Phlebotomist assignment is done entirely by Redcliffe's own
                                                dispatch, not Ayuxa — this only displays whatever ActivityUpdate
                                                rows Redcliffe's webhook has actually produced. Read-only. */}
                                            <div style={{ borderTop: '1px solid var(--border-color)', padding: '8px 14px' }}>
                                                <button
                                                    className="btn btn-xs btn-secondary"
                                                    style={{ fontSize: 11 }}
                                                    onClick={() => toggleLabOrderHistory(order)}
                                                >
                                                    {expandedLabOrderId === order.id ? 'Hide Activity History' : 'View Activity History'}
                                                </button>
                                                {expandedLabOrderId === order.id && (
                                                    orderUpdates.length === 0 ? (
                                                        <div className="text-sm text-muted" style={{ padding: '10px 0' }}>No activity updates received from Redcliffe yet.</div>
                                                    ) : (
                                                        <div style={{ marginTop: 10 }}>
                                                            {orderUpdates.map(u => (
                                                                <div key={u.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px', background: 'var(--bg-glass)', borderRadius: 8, marginBottom: 8 }}>
                                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${EVENT_COLORS[u.eventType] || '#048357'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                                                        {EVENT_TYPES.find(e => e.value === u.eventType)?.label?.split(' ')[0] || '📋'}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: EVENT_COLORS[u.eventType] || 'var(--text-primary)', marginBottom: 2 }}>{EVENT_TYPES.find(e => e.value === u.eventType)?.label?.replace(/^.{2}/, '') || u.eventType}</div>
                                                                        <div style={{ fontSize: 12, marginBottom: 2 }}>{u.staffName} <span style={{ color: 'var(--text-muted)' }}>· {u.staffId}</span></div>
                                                                        {u.statusDetail && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.statusDetail}</div>}
                                                                    </div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatTs(u.createdAt)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {editMode ? (
                                <>
                                    <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                                    <button className="btn btn-success" onClick={updateBookingDetails}><Save size={14} /> Save</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ flex: 1 }} />
                                    {selected.status === 'ASSIGNED' && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}>Start</button>}
                                    {selected.status === 'IN_PROGRESS' && <button className="btn btn-success" onClick={() => updateStatus(selected.id, 'COMPLETED')}>Complete</button>}
                                    {!['COMPLETED', 'CANCELLED'].includes(selected.status) && <button className="btn btn-danger" onClick={() => updateStatus(selected.id, 'CANCELLED')}>Cancel</button>}
                                    <button className="btn btn-primary" onClick={() => { setEditMode(true); setEditData({ status: selected.status, paymentStatus: selected.paymentStatus || 'PENDING' }); }}><Edit2 size={14} /> Edit</button>
                                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ASSIGN CAREGIVER MODAL — searchable picker
            ══════════════════════════════════════════ */}
            {assignModal && (() => {
                const ROLE_FILTERS = ['', 'Doctor', 'Nurse', 'Caregiver', 'Physiotherapist', 'Lab'];
                const filtered = caregivers.filter(cg => {
                    const q = cgSearch.toLowerCase();
                    const matchesSearch = !q || cg.name?.toLowerCase().includes(q) || cg.phone?.includes(q) || cg.specialization?.toLowerCase().includes(q);
                    const matchesRole = !cgRoleFilter || (cg.role || cg.specialization || '').toLowerCase().includes(cgRoleFilter.toLowerCase());
                    return matchesSearch && matchesRole;
                });
                const chosen = caregivers.find(cg => cg.id === selectedCaregiver);
                return (
                    <div className="modal-overlay" onClick={() => { setAssignModal(null); setCgSearch(''); setCgRoleFilter(''); setSelectedCaregiver(''); }}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ marginBottom: 2 }}>Assign Staff</h3>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Booking: <strong>{assignModal.bookingCode}</strong></div>
                                </div>
                                <button onClick={() => { setAssignModal(null); setCgSearch(''); setCgRoleFilter(''); setSelectedCaregiver(''); }} className="btn btn-sm btn-secondary"><X size={14} /></button>
                            </div>

                            <div className="modal-body" style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
                                {/* Search input */}
                                <div style={{ position: 'relative', marginBottom: 10 }}>
                                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 32, fontSize: 13 }}
                                        placeholder="Search by name, phone, or specialization…"
                                        value={cgSearch}
                                        onChange={e => { setCgSearch(e.target.value); setSelectedCaregiver(''); }}
                                        autoFocus
                                    />
                                </div>

                                {/* Role filter pills */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                    {ROLE_FILTERS.map(r => (
                                        <button key={r} onClick={() => { setCgRoleFilter(r); setSelectedCaregiver(''); }}
                                            style={{ padding: '4px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: 11, fontWeight: cgRoleFilter === r ? 600 : 400, borderColor: cgRoleFilter === r ? 'var(--accent-primary)' : 'var(--border-color)', background: cgRoleFilter === r ? 'var(--accent-primary)' : 'var(--bg-card)', color: cgRoleFilter === r ? '#fff' : 'var(--text-secondary)', transition: 'all 0.12s' }}>
                                            {r || 'All Roles'}
                                        </button>
                                    ))}
                                </div>

                                {/* Staff list */}
                                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                                    {filtered.length === 0 ? (
                                        <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No staff found matching your search</div>
                                    ) : filtered.map((cg, i) => {
                                        const isSelected = selectedCaregiver === cg.id;
                                        return (
                                            <div key={cg.id} onClick={() => setSelectedCaregiver(isSelected ? '' : cg.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: isSelected ? 'var(--accent-primary)10' : 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none', borderRadius: i === 0 ? '10px 10px 0 0' : i === filtered.length - 1 ? '0 0 10px 10px' : 0, transition: 'background 0.1s' }}>
                                                {/* Avatar */}
                                                {cg.photoUrl ? (
                                                    <img src={cg.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: isSelected ? '#DBEAFE' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                                                        {cg.name?.[0] || '?'}
                                                    </div>
                                                )}
                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{cg.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                                                        <span>{cg.specialization || cg.role || 'General'}</span>
                                                        {cg.city?.name && <span>· {cg.city.name}</span>}
                                                        {cg.phone && <span>· {cg.phone}</span>}
                                                    </div>
                                                </div>
                                                {/* Availability badge */}
                                                <div style={{ flexShrink: 0 }}>
                                                    {cg.isAvailable
                                                        ? <span style={{ padding: '2px 8px', borderRadius: 10, background: '#D1FAE5', color: '#059669', fontSize: 10, fontWeight: 600 }}>Available</span>
                                                        : <span style={{ padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: '#9CA3AF', fontSize: 10 }}>Busy</span>}
                                                </div>
                                                {/* Selected check */}
                                                {isSelected && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ color: '#fff', fontSize: 12 }}>✓</span>
                                                </div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Selected preview */}
                                {chosen && (
                                    <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10, border: '1.5px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ fontSize: 18 }}>✅</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{chosen.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{chosen.specialization || chosen.role || 'General'}{chosen.phone ? ` · ${chosen.phone}` : ''}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => { setAssignModal(null); setCgSearch(''); setCgRoleFilter(''); setSelectedCaregiver(''); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedCaregiver}>
                                    Assign{chosen ? ` ${chosen.name}` : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══════════════════════════════════════════
                ADD SERVICE PERSON MODAL (existing)
            ══════════════════════════════════════════ */}
            {servicePersonModal && (
                <div className="modal-overlay" onClick={() => setServicePersonModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header"><h3>Add Service Person</h3><button onClick={() => setServicePersonModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-group mb-4"><label className="form-label">Name</label><input type="text" className="form-input" value={servicePerson.name} onChange={e => setServicePerson({ ...servicePerson, name: e.target.value })} /></div>
                            <div className="form-group mb-4"><label className="form-label">Phone</label><input type="tel" className="form-input" maxLength={10} value={servicePerson.phone} onChange={e => setServicePerson({ ...servicePerson, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div>
                            <div className="form-group mb-4"><label className="form-label">Notes</label><textarea className="form-input" rows="3" value={servicePerson.notes} onChange={e => setServicePerson({ ...servicePerson, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setServicePersonModal(false)}>Cancel</button><button className="btn btn-primary" onClick={addServicePerson}>Save</button></div>
                    </div>
                </div>
            )}

        </div>
    );
}
