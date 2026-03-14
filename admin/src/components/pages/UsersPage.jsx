"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Eye, Ban, UserCheck, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { userAPI, cityAPI } from "@/lib/api";
import { formatDate, formatDateTime, showToast } from "@/lib/hooks";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ status: '', cityId: '', healthTag: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);
    const limit = 20;

    useEffect(() => {
        cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { });
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit, search: search || undefined, ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await userAPI.getAll(params);
            setUsers(res.data?.data?.users || res.data?.data || []);
            setTotal(res.data?.data?.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, filters, search]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        loadUsers();
    }

    async function viewUser(id) {
        try {
            const res = await userAPI.getById(id);
            setSelectedUser(res.data?.data);
        } catch (e) { showToast('Failed to load user', 'error'); }
    }

    async function blockUser(id) {
        if (!confirm('Block this user?')) return;
        try {
            await userAPI.block(id);
            showToast('User blocked');
            loadUsers();
            setSelectedUser(null);
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function suspendUser(id) {
        if (!confirm('Suspend this user?')) return;
        try {
            await userAPI.suspend(id);
            showToast('User suspended');
            loadUsers();
            setSelectedUser(null);
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    async function activateUser(id) {
        try {
            await userAPI.activate(id);
            showToast('User activated');
            loadUsers();
            setSelectedUser(null);
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }

    const statusBadge = { ACTIVE: 'badge-success', SUSPENDED: 'badge-warning', BLOCKED: 'badge-danger' };
    const healthBadge = { NORMAL: 'badge-success', DIABETIC: 'badge-warning', HYPERTENSION: 'badge-danger', CARDIAC: 'badge-danger', OTHER: 'badge-default' };

    return (
        <div>
            <div className="page-header"><h2>User Management</h2><p>Manage registered app users, health data, and emergency contacts</p></div>

            <div className="filter-bar">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary"><Search size={16} /></button>
                </form>
                <select className="form-select" style={{ width: 150 }} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="BLOCKED">Blocked</option>
                </select>
                <select className="form-select" style={{ width: 150 }} value={filters.cityId} onChange={e => { setFilters({ ...filters, cityId: e.target.value }); setPage(1); }}>
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-select" style={{ width: 150 }} value={filters.healthTag} onChange={e => { setFilters({ ...filters, healthTag: e.target.value }); setPage(1); }}>
                    <option value="">All Health</option>
                    <option value="NORMAL">Normal</option><option value="DIABETIC">Diabetic</option><option value="HYPERTENSION">Hypertension</option><option value="CARDIAC">Cardiac</option>
                </select>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>User ID</th><th>Name</th><th>Phone</th><th>City</th><th>Health Tag</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                                users.length === 0 ? <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No users found</td></tr> :
                                    users.map(u => (
                                        <tr key={u.id}>
                                            <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{u.uniqueUserId}</code></td>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{u.name}</td>
                                            <td className="text-sm">{u.phone}</td>
                                            <td className="text-sm">{u.city?.name || '—'}</td>
                                            <td><span className={`badge ${healthBadge[u.healthTag] || 'badge-default'}`}>{u.healthTag}</span></td>
                                            <td><span className={`badge ${statusBadge[u.status] || 'badge-default'}`}>{u.status}</span></td>
                                            <td className="text-sm">{formatDate(u.createdAt)}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => viewUser(u.id)}><Eye size={14} /></button>
                                                    {u.status === 'ACTIVE' && <button className="btn btn-sm btn-danger" onClick={() => blockUser(u.id)}><Ban size={14} /></button>}
                                                    {u.status === 'BLOCKED' && <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}><UserCheck size={14} /></button>}
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
                    <span className="text-sm text-muted">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                        <button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}

            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>User Profile — {selectedUser.name}</h3><button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">User ID</label><div className="text-sm">{selectedUser.uniqueUserId}</div></div>
                                <div className="form-group"><label className="form-label">Phone</label><div className="text-sm">{selectedUser.phone}</div></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Email</label><div className="text-sm">{selectedUser.email || '—'}</div></div>
                                <div className="form-group"><label className="form-label">City</label><div className="text-sm">{selectedUser.city?.name || '—'}</div></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Health Tag</label><span className={`badge ${healthBadge[selectedUser.healthTag]}`}>{selectedUser.healthTag}</span></div>
                                <div className="form-group"><label className="form-label">Status</label><span className={`badge ${statusBadge[selectedUser.status]}`}>{selectedUser.status}</span></div>
                            </div>
                            {selectedUser.emergencyContacts?.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Emergency Contacts</label>
                                    {selectedUser.emergencyContacts.map((ec, i) => (
                                        <div key={i} className="text-sm" style={{ marginBottom: 4 }}>{ec.name} — {ec.phone} ({ec.relationship})</div>
                                    ))}
                                </div>
                            )}
                            {selectedUser.medicalCards?.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Medical Information</label>
                                    {selectedUser.medicalCards.map((mc, i) => (
                                        <div key={i} className="text-sm">
                                            <div>Blood Group: {mc.bloodGroup || '—'}</div>
                                            <div>Allergies: {mc.allergies?.join(', ') || '—'}</div>
                                            <div>Chronic Conditions: {mc.chronicConditions?.join(', ') || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            {selectedUser.status === 'ACTIVE' && <>
                                <button className="btn btn-warning" onClick={() => suspendUser(selectedUser.id)}>Suspend</button>
                                <button className="btn btn-danger" onClick={() => blockUser(selectedUser.id)}>Block</button>
                            </>}
                            {selectedUser.status !== 'ACTIVE' && <button className="btn btn-success" onClick={() => activateUser(selectedUser.id)}>Activate</button>}
                            <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
