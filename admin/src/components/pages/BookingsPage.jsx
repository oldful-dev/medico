"use client";
import { useState, useEffect } from "react";
import { Search, Eye, UserPlus, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { bookingAPI, caregiverAPI, cityAPI } from "@/lib/api";
import { formatDate, formatDateTime, formatCurrency, showToast } from "@/lib/hooks";

const statusColors = { PENDING: 'badge-warning', ASSIGNED: 'badge-info', IN_PROGRESS: 'badge-purple', COMPLETED: 'badge-success', CANCELLED: 'badge-default', SLA_BREACH: 'badge-danger' };

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
    const limit = 20;

    useEffect(() => {
        Promise.all([cityAPI.getAll(), caregiverAPI.getAll()]).then(([c, cg]) => {
            setCities(c.data?.data || []);
            setCaregivers(cg.data?.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => { loadBookings(); }, [page, filters]);

    async function loadBookings() {
        try {
            setLoading(true);
            const params = { page, limit, ...filters };
            if (search) params.search = search;
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await bookingAPI.getAll(params);
            setBookings(res.data?.data?.bookings || res.data?.data || []);
            setTotal(res.data?.data?.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
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

    return (
        <div>
            <div className="page-header"><h2>Booking Management</h2><p>View, assign, and manage all bookings</p></div>

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
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>Booking Details — {selected.bookingCode}</h3><button onClick={() => setSelected(null)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-row"><div className="form-group"><label className="form-label">User</label><div className="text-sm">{selected.user?.name}</div></div><div className="form-group"><label className="form-label">Service</label><div className="text-sm">{selected.service?.name}</div></div></div>
                            <div className="form-row"><div className="form-group"><label className="form-label">Status</label><span className={`badge ${statusColors[selected.status]}`}>{selected.status}</span></div><div className="form-group"><label className="form-label">Amount</label><div className="text-sm">{formatCurrency(selected.amount)}</div></div></div>
                            <div className="form-row"><div className="form-group"><label className="form-label">Scheduled</label><div className="text-sm">{formatDateTime(selected.scheduledDate)} {selected.scheduledTime || ''}</div></div><div className="form-group"><label className="form-label">Caregiver</label><div className="text-sm">{selected.caregiver?.name || '—'}</div></div></div>
                            {selected.addressLine && <div className="form-group"><label className="form-label">Address</label><div className="text-sm">{selected.addressLine}</div></div>}
                            {selected.adminNotes && <div className="form-group"><label className="form-label">Notes</label><div className="text-sm">{selected.adminNotes}</div></div>}
                        </div>
                        <div className="modal-footer">
                            {selected.status === 'ASSIGNED' && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}>Start</button>}
                            {selected.status === 'IN_PROGRESS' && <button className="btn btn-success" onClick={() => updateStatus(selected.id, 'COMPLETED')}>Complete</button>}
                            {!['COMPLETED', 'CANCELLED'].includes(selected.status) && <button className="btn btn-danger" onClick={() => updateStatus(selected.id, 'CANCELLED')}>Cancel</button>}
                            <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
