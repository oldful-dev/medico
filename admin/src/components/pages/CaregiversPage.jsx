"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Shield, ShieldCheck, ShieldX, ToggleLeft, ToggleRight } from "lucide-react";
import { caregiverAPI, cityAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";

const verifyColors = { PENDING: 'badge-warning', VERIFIED: 'badge-success', REJECTED: 'badge-danger' };

export default function CaregiversPage() {
    const [caregivers, setCaregivers] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', email: '', specialization: '', qualification: '', cityId: '', shiftType: 'FLEXIBLE', salary: 0 });

    useEffect(() => {
        cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { });
        loadData();
    }, []);

    async function loadData() {
        try { setLoading(true); const res = await caregiverAPI.getAll(); setCaregivers(res.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    function openAdd() {
        setEditing(null);
        setForm({ name: '', phone: '', email: '', specialization: '', qualification: '', cityId: cities[0]?.id || '', shiftType: 'FLEXIBLE', salary: 0 });
        setShowModal(true);
    }

    function openEdit(cg) {
        setEditing(cg);
        setForm({ name: cg.name, phone: cg.phone, email: cg.email || '', specialization: cg.specialization || '', qualification: cg.qualification || '', cityId: cg.cityId, shiftType: cg.shiftType, salary: cg.salary });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editing) { await caregiverAPI.update(editing.id, form); showToast('Caregiver updated'); }
            else { await caregiverAPI.create(form); showToast('Caregiver added'); }
            setShowModal(false); loadData();
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function toggleAvailability(id) {
        try { await caregiverAPI.toggleAvailability(id); showToast('Availability toggled'); loadData(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    async function updateVerification(id, status) {
        try { await caregiverAPI.updateVerification(id, { policeVerification: status }); showToast(`Verification: ${status}`); loadData(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    async function deleteCg(id) {
        if (!confirm('Delete this caregiver?')) return;
        try { await caregiverAPI.delete(id); showToast('Deleted'); loadData(); }
        catch (e) { showToast('Delete failed', 'error'); }
    }

    if (loading) return <div className="page-header"><h2>Loading Caregivers...</h2></div>;

    return (
        <div>
            <div className="page-header"><h2>Caregiver / Vendor Management</h2><p>Manage caregivers, verify documents, and track performance</p></div>
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card"><div className="stat-card-value">{caregivers.length}</div><div className="stat-card-label">Total Caregivers</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-success)" }}>{caregivers.filter(c => c.policeVerification === 'VERIFIED').length}</div><div className="stat-card-label">Verified</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{caregivers.filter(c => c.policeVerification === 'PENDING').length}</div><div className="stat-card-label">Pending Verification</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-primary-light)" }}>{caregivers.filter(c => c.isAvailable).length}</div><div className="stat-card-label">Available Now</div></div>
            </div>
            <div className="filter-bar"><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Caregiver</button></div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Specialization</th><th>Shift</th><th>Verification</th><th>Available</th><th>Rating</th><th>Bookings</th><th>Actions</th></tr></thead>
                        <tbody>
                            {caregivers.map(cg => (
                                <tr key={cg.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{cg.name}</td>
                                    <td className="text-sm">{cg.phone}</td>
                                    <td className="text-sm">{cg.city?.name || '—'}</td>
                                    <td className="text-sm">{cg.specialization || '—'}</td>
                                    <td className="text-sm">{cg.shiftType}</td>
                                    <td>
                                        <div className="flex gap-1 items-center">
                                            <span className={`badge ${verifyColors[cg.policeVerification]}`}>{cg.policeVerification}</span>
                                            {cg.policeVerification === 'PENDING' && <>
                                                <button className="btn btn-sm btn-success" style={{ padding: '2px 6px' }} onClick={() => updateVerification(cg.id, 'VERIFIED')}><ShieldCheck size={12} /></button>
                                                <button className="btn btn-sm btn-danger" style={{ padding: '2px 6px' }} onClick={() => updateVerification(cg.id, 'REJECTED')}><ShieldX size={12} /></button>
                                            </>}
                                        </div>
                                    </td>
                                    <td><button className="btn btn-sm btn-secondary" onClick={() => toggleAvailability(cg.id)}>{cg.isAvailable ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}</button></td>
                                    <td>{cg.performanceRating?.toFixed(1) || '—'}</td>
                                    <td>{cg.totalBookings}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(cg)}><Edit2 size={14} /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => deleteCg(cg.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {caregivers.length === 0 && <tr><td colSpan={10} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No caregivers found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editing ? 'Edit' : 'Add'} Caregiver</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row"><div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="form-group"><label className="form-label">Phone *</label><input className="form-input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                                <div className="form-row"><div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="form-group"><label className="form-label">City *</label><select className="form-select" required value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })}><option value="">Select</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                                <div className="form-row"><div className="form-group"><label className="form-label">Specialization</label><input className="form-input" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} /></div><div className="form-group"><label className="form-label">Qualification</label><input className="form-input" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} /></div></div>
                                <div className="form-row"><div className="form-group"><label className="form-label">Shift Type</label><select className="form-select" value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })}>{['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'FLEXIBLE'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="form-group"><label className="form-label">Salary (₹)</label><input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} /></div></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
