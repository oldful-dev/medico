"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Eye, UserPlus, AlertTriangle, ChevronLeft, ChevronRight, Edit2, Save, X } from "lucide-react";
import { bookingAPI, caregiverAPI, cityAPI } from "@/lib/api";
import { formatDate, formatDateTime, formatCurrency, showToast } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

const statusColors = { PENDING: 'badge-warning', CONFIRMED: 'badge-info', ASSIGNED: 'badge-info', IN_PROGRESS: 'badge-purple', COMPLETED: 'badge-success', CANCELLED: 'badge-default', SLA_BREACH: 'badge-danger', PAYMENT_FAILED: 'badge-danger' };
const paymentStatusColors = { PENDING: 'badge-warning', INITIATED: 'badge-info', SUCCESS: 'badge-success', FAILED: 'badge-danger', REFUNDED: 'badge-secondary', REFUND_INITIATED: 'badge-purple', PAYMENT_FAILED: 'badge-danger' };

export default function BookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [cities, setCities] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', cityId: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedCaregiver, setSelectedCaregiver] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [servicePersonModal, setServicePersonModal] = useState(false);
    const [servicePerson, setServicePerson] = useState({ name: '', phone: '', notes: '' });
    const limit = 20;

    useEffect(() => {
        Promise.all([cityAPI.getAll(), caregiverAPI.getAll()]).then(([c, cg]) => {
            setCities(c.data?.data || []);
            setCaregivers(cg.data?.data || []);
        }).catch(() => { });
    }, []);

    // Keep a ref to latest loadBookings so socket handlers never go stale
    const loadBookingsRef = useRef(loadBookings);
    useEffect(() => { loadBookingsRef.current = loadBookings; });

    useEffect(() => {
        loadBookings();
    }, [page, filters, search]);

    useEffect(() => {
        const socket = getSocket();

        socket.on("new_booking", (newBooking) => {
            loadBookingsRef.current(false);
            showToast(`📅 New Booking: ${newBooking.serviceType || 'Service'}`, 'success');
        });

        socket.on("booking_updated", (updatedBooking) => {
            setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
            setSelected(prev => prev?.id === updatedBooking.id ? { ...prev, ...updatedBooking } : prev);
        });

        socket.on("booking_status_changed", (data) => {
            setBookings(prev => prev.map(b => b.id === data.bookingId ? { ...b, status: data.status } : b));
            setSelected(prev => prev?.id === data.bookingId ? { ...prev, status: data.status } : prev);
        });

        socket.on("booking_assigned", (data) => {
            setBookings(prev => prev.map(b => b.id === data.bookingId ? { ...b, caregiver: { name: data.caregiverName } } : b));
            setSelected(prev => prev?.id === data.bookingId ? { ...prev, caregiver: { name: data.caregiverName } } : prev);
            showToast(`✓ Caregiver assigned: ${data.caregiverName}`, 'success');
        });

        socket.on("booking_payment_updated", (data) => {
            const applyPaymentUpdate = (b) => ({
                ...b,
                ...(data.bookingStatus ? { status: data.bookingStatus } : {}),
                paymentStatus: data.paymentStatus,
            });
            setBookings(prev => prev.map(b => b.id === data.bookingId ? applyPaymentUpdate(b) : b));
            setSelected(prev => prev?.id === data.bookingId ? applyPaymentUpdate(prev) : prev);
            if (data.paymentStatus === 'SUCCESS') {
                showToast(`💳 Payment confirmed: ${data.bookingCode || ''}`, 'success');
            } else if (data.paymentStatus === 'FAILED') {
                showToast(`❌ Payment failed: ${data.bookingCode || ''}`, 'danger');
            }
        });

        return () => {
            socket.off("new_booking");
            socket.off("booking_updated");
            socket.off("booking_status_changed");
            socket.off("booking_assigned");
            socket.off("booking_payment_updated");
        };
    }, []);

    async function loadBookings(showLoading = true) {
        try {
            if (showLoading) setLoading(true);
            const params = { page, limit, ...filters };
            if (search) params.search = search;
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await bookingAPI.getAll(params);
            const data = res.data?.data?.bookings || res.data?.data || [];

            // Only update if data changed to prevent unnecessary re-renders
            setBookings(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
            setTotal(res.data?.data?.total || 0);
        } catch (e) { console.error(e); }
        finally { if (showLoading) setLoading(false); }
    }

    async function viewBooking(id) {
        try {
            const res = await bookingAPI.getById(id);
            setSelected(res.data?.data);
        } catch (e) { showToast('Failed to load booking', 'error'); }
    }

    async function handleAssign() {
        if (!selectedCaregiver) { showToast('Select a caregiver', 'error'); return; }
        try {
            await bookingAPI.assignCaregiver(assignModal.id, { caregiverId: selectedCaregiver });
            showToast('Caregiver assigned');
            setAssignModal(null);
            loadBookings();
        } catch (e) { showToast(e.response?.data?.message || 'Assign failed', 'error'); }
    }

    async function updateStatus(id, status) {
        try {
            await bookingAPI.updateStatus(id, { status });
            showToast(`Booking status updated to ${status}`);
            loadBookings();
            setSelected(null);
        } catch (e) { showToast('Update failed', 'error'); }
    }

    async function escalateBooking(id) {
        try {
            await bookingAPI.escalate(id);
            showToast('Booking escalated');
            loadBookings();
            setSelected(null);
        } catch (e) { showToast('Escalation failed', 'error'); }
    }

    async function updateBookingDetails() {
        try {
            const calls = [];
            if (editData.status && editData.status !== selected.status) {
                calls.push(bookingAPI.updateStatus(selected.id, { status: editData.status }));
            }
            const currentPaymentStatus = selected.paymentStatus || 'PENDING';
            if (editData.paymentStatus && editData.paymentStatus !== currentPaymentStatus) {
                calls.push(bookingAPI.updatePaymentStatus(selected.id, { paymentStatus: editData.paymentStatus }));
            }
            if (calls.length === 0) {
                showToast('No changes to save', 'info');
                setEditMode(false);
                return;
            }
            await Promise.all(calls);
            showToast('Booking updated successfully', 'success');
            setEditMode(false);
            await viewBooking(selected.id);
        } catch (e) {
            showToast(e.response?.data?.message || 'Update failed', 'error');
        }
    }

    async function addServicePerson() {
        if (!servicePerson.name || !servicePerson.phone) {
            showToast('Enter name and phone', 'error');
            return;
        }
        try {
            await bookingAPI.updateServicePerson(selected.id, {
                servicePersonName: servicePerson.name,
                servicePersonPhone: servicePerson.phone,
                servicePersonNotes: servicePerson.notes || null,
            });
            showToast('Service person details added');
            setServicePersonModal(false);
            setServicePerson({ name: '', phone: '', notes: '' });
            await viewBooking(selected.id);
        } catch (e) {
            showToast('Failed to add service person', 'error');
        }
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

            <div className="filter-bar">
                <form onSubmit={(e) => { e.preventDefault(); setPage(1); loadBookings(); }} style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search booking code..." value={search} onChange={e => setSearch(e.target.value)} />
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
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Booking Code</th><th>User</th><th>Service</th><th>City</th><th>Scheduled</th><th>Amount</th><th>Status</th><th>Caregiver</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                                bookings.length === 0 ? <tr><td colSpan={9} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No bookings found</td></tr> :
                                    bookings.map(b => (
                                        <tr key={b.id}>
                                            <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{b.bookingCode}</code></td>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.user?.name || '—'}</td>
                                            <td className="text-sm">{b.service?.name || '—'}</td>
                                            <td className="text-sm">{b.city?.name || '—'}</td>
                                            <td className="text-sm">{formatDate(b.scheduledDate)}</td>
                                            <td>{formatCurrency(b.amount)}</td>
                                            <td><span className={`badge ${statusColors[b.status] || 'badge-default'}`}>{b.status?.replace(/_/g, ' ')}</span></td>
                                            <td className="text-sm">{b.caregiver?.name || '—'}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => viewBooking(b.id)}><Eye size={14} /></button>
                                                    {b.status === 'PENDING' && <button className="btn btn-sm btn-primary" onClick={() => { setAssignModal(b); setSelectedCaregiver(''); }}><UserPlus size={14} /></button>}
                                                    {!b.isEscalated && <button className="btn btn-sm btn-warning" onClick={() => escalateBooking(b.id)}><AlertTriangle size={14} /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {total > limit && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted">Page {page} of {Math.ceil(total / limit)}</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                        <button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}

            {assignModal && (
                <div className="modal-overlay" onClick={() => setAssignModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header"><h3>Assign Caregiver</h3><button onClick={() => setAssignModal(null)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <p className="text-sm mb-4">Booking: <strong>{assignModal.bookingCode}</strong></p>
                            <div className="form-group"><label className="form-label">Select Caregiver</label>
                                <select className="form-select" value={selectedCaregiver} onChange={e => setSelectedCaregiver(e.target.value)}>
                                    <option value="">— Choose —</option>
                                    {caregivers.filter(cg => cg.isAvailable).map(cg => <option key={cg.id} value={cg.id}>{cg.name} — {cg.specialization || 'General'}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAssign}>Assign</button></div>
                    </div>
                </div>
            )}

            {selected && (
                <div className="modal-overlay" onClick={() => { setSelected(null); setEditMode(false); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Booking Details — {selected.bookingCode}</h3>
                            <button onClick={() => { setSelected(null); setEditMode(false); }} className="btn btn-sm btn-secondary">✕</button>
                        </div>

                        <div className="modal-body" style={{ padding: '20px' }}>
                            {/* User & Service Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                <div><label className="form-label">User Name</label><div className="text-sm font-semibold">{selected.user?.name}</div></div>
                                <div><label className="form-label">User ID</label><div className="text-sm font-semibold">{selected.user?.uniqueUserId}</div></div>
                                <div><label className="form-label">Phone</label><div className="text-sm">{selected.user?.phone}</div></div>
                                <div><label className="form-label">City</label><div className="text-sm">{selected.city?.name}</div></div>
                                <div colSpan="2"><label className="form-label">Service Type</label><div className="text-sm font-semibold">{selected.service?.name}</div></div>
                            </div>

                            {/* Service Details (Dynamic based on service type) */}
                            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                <h4 style={{ marginBottom: 12, color: 'var(--text-primary)', fontWeight: 600 }}>Service Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div><label className="form-label">Service Type</label><div className="text-sm font-semibold">{selected.service?.name || '—'}</div></div>
                                    <div><label className="form-label">Scheduled Date</label><div className="text-sm">{selected.scheduledDate ? formatDate(selected.scheduledDate) : '—'}</div></div>
                                    <div><label className="form-label">Scheduled Time</label><div className="text-sm">{selected.scheduledTime || '—'}</div></div>
                                    {selected.addressLine && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Service Address</label><div className="text-sm">{selected.addressLine}</div></div>}

                                    {/* Doctor Visit Fields */}
                                    {selected.doctorType && <>
                                        <div><label className="form-label">Doctor Type</label><div className="text-sm">{selected.doctorType}</div></div>
                                        {selected.symptoms && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Symptoms</label><div className="text-sm">{Array.isArray(selected.symptoms) ? selected.symptoms.join(', ') : selected.symptoms}</div></div>}
                                        {selected.prescriptionUrl && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Prescription</label><a href={selected.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600">View Prescription</a></div>}
                                    </>}

                                    {/* Nurse Care Fields */}
                                    {selected.staffType && <>
                                        <div><label className="form-label">Staff Type</label><div className="text-sm">{selected.staffType}</div></div>
                                        {selected.shiftDuration && <div><label className="form-label">Shift Duration</label><div className="text-sm">{selected.shiftDuration}</div></div>}
                                        {selected.startDate && <div><label className="form-label">Start Date</label><div className="text-sm">{formatDate(selected.startDate)}</div></div>}
                                        {selected.endDate && <div><label className="form-label">End Date</label><div className="text-sm">{formatDate(selected.endDate)}</div></div>}
                                        {selected.requirements && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Requirements</label><div className="text-sm">{Array.isArray(selected.requirements) ? selected.requirements.join(', ') : selected.requirements}</div></div>}
                                    </>}

                                    {/* Transportation Fields */}
                                    {selected.vehicleType && <>
                                        <div><label className="form-label">Vehicle Type</label><div className="text-sm">{selected.vehicleType}</div></div>
                                        {selected.pickupAddress && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Pickup Address</label><div className="text-sm">{selected.pickupAddress}</div></div>}
                                        {selected.dropAddress && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Drop Address</label><div className="text-sm">{selected.dropAddress}</div></div>}
                                    </>}

                                    {/* Location Info */}
                                    {(selected.latitude || selected.longitude) && <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Location</label><div className="text-sm">{selected.latitude}, {selected.longitude}</div></div>}
                                </div>
                            </div>

                            {/* Status & Payment Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <label className="form-label">Booking Status</label>
                                    {editMode ? (
                                        <select className="form-select" value={editData.status || ''} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                                            <option value="">— Select —</option>
                                            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`badge ${statusColors[selected.status]}`}>{selected.status?.replace(/_/g, ' ')}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="form-label">Payment Status</label>
                                    {editMode ? (
                                        <select className="form-select" value={editData.paymentStatus || ''} onChange={e => setEditData({ ...editData, paymentStatus: e.target.value })}>
                                            <option value="">— Select —</option>
                                            {Object.keys(paymentStatusColors).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`badge ${paymentStatusColors[selected.paymentStatus] || 'badge-warning'}`}>{selected.paymentStatus || 'PENDING'}</span>
                                    )}
                                </div>
                                <div><label className="form-label">Amount</label><div className="text-sm font-semibold">{formatCurrency(selected.amount)}</div></div>
                            </div>

                            {/* Assigned Caregiver */}
                            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                <label className="form-label">Assigned Caregiver</label>
                                <div className="text-sm">{selected.caregiver?.name ? `${selected.caregiver.name} — ${selected.caregiver.phone}` : '—'}</div>
                            </div>

                            {/* Service Person Details */}
                            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Service Person Details</h4>
                                    <button className="btn btn-sm btn-primary" onClick={() => setServicePersonModal(true)}>+ Add Person</button>
                                </div>
                                {selected.servicePersonName ? (
                                    <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8 }}>
                                        <div><strong>{selected.servicePersonName}</strong></div>
                                        <div className="text-sm">{selected.servicePersonPhone}</div>
                                        {selected.servicePersonNotes && <div className="text-sm text-muted">{selected.servicePersonNotes}</div>}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted">No service person assigned yet</div>
                                )}
                            </div>

                            {/* Admin Notes */}
                            {selected.adminNotes && (
                                <div>
                                    <label className="form-label">Admin Notes</label>
                                    <div className="text-sm" style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8 }}>{selected.adminNotes}</div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {editMode ? (
                                <>
                                    <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                                    <button className="btn btn-success" onClick={updateBookingDetails}><Save size={14} /> Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ flex: 1 }}></div>
                                    {selected.status === 'ASSIGNED' && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}>Start</button>}
                                    {selected.status === 'IN_PROGRESS' && <button className="btn btn-success" onClick={() => updateStatus(selected.id, 'COMPLETED')}>Complete</button>}
                                    {!['COMPLETED', 'CANCELLED'].includes(selected.status) && <button className="btn btn-danger" onClick={() => updateStatus(selected.id, 'CANCELLED')}>Cancel</button>}
                                    <button className="btn btn-primary" onClick={() => { setEditMode(true); setEditData({ status: selected.status, paymentStatus: selected.paymentStatus || 'PENDING' }); }}><Edit2 size={14} /> Edit Details</button>
                                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Service Person Modal */}
            {servicePersonModal && (
                <div className="modal-overlay" onClick={() => setServicePersonModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header"><h3>Add Service Person Details</h3><button onClick={() => setServicePersonModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-group mb-4">
                                <label className="form-label">Person Name</label>
                                <input type="text" className="form-input" placeholder="Full name" value={servicePerson.name} onChange={e => setServicePerson({ ...servicePerson, name: e.target.value })} />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Phone Number</label>
                                <input type="tel" className="form-input" placeholder="Mobile number" maxLength={10} value={servicePerson.phone} onChange={e => setServicePerson({ ...servicePerson, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Notes (Optional)</label>
                                <textarea className="form-input" rows="3" placeholder="Additional notes..." value={servicePerson.notes} onChange={e => setServicePerson({ ...servicePerson, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setServicePersonModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={addServicePerson}>Add Person</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
