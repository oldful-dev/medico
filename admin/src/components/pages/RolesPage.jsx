"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Shield, Eye, Clock, UserPlus } from "lucide-react";
import { adminAPI, authAPI, cityAPI, auditAPI } from "@/lib/api";
import { formatDateTime, showToast } from "@/lib/hooks";

export default function RolesPage() {
    const [activeTab, setActiveTab] = useState("admins");
    const [admins, setAdmins] = useState([]);
    const [cities, setCities] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CITY_ADMIN', phone: '', cityId: '' });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [admRes, cityRes] = await Promise.all([adminAPI.getAll(), cityAPI.getAll()]);
            setAdmins(admRes.data?.data || []);
            setCities(cityRes.data?.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function loadAuditLogs() {
        try {
            const res = await auditAPI.getAll({ limit: 20 });
            setAuditLogs(res.data?.data || []);
        } catch (e) { console.error(e); }
    }

    useEffect(() => { if (activeTab === 'audit') loadAuditLogs(); }, [activeTab]);

    async function handleCreate(e) {
        e.preventDefault();
        try {
            await authAPI.register(form);
            showToast('Admin created successfully');
            setShowModal(false);
            setForm({ name: '', email: '', password: '', role: 'CITY_ADMIN', phone: '', cityId: '' });
            loadData();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to create admin', 'error'); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this admin?')) return;
        try {
            await adminAPI.delete(id);
            showToast('Admin deleted');
            loadData();
        } catch (e) { showToast('Delete failed', 'error'); }
    }

    const roles = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'BILLING_EXECUTIVE', 'SUPPORT_AGENT'];
    const roleBadge = { 
        SUPER_ADMIN: 'badge-danger', 
        CITY_ADMIN: 'badge-purple', 
        OPERATIONS_EXECUTIVE: 'badge-info', 
        CARE_MANAGER: 'badge-purple', 
        SUPPORT_AGENT: 'badge-warning', 
        BILLING_EXECUTIVE: 'badge-success' 
    };

    return (
        <div>
            <div className="page-header"><h2>Role & Access Management</h2><p>Manage admins, roles, and permissions</p></div>
            <div className="tabs mb-6">
                {["admins", "audit"].map(t => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t === 'admins' ? 'Admins' : 'Audit Logs'}
                    </button>
                ))}
            </div>

            {activeTab === "admins" && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}><UserPlus size={16} /> Add Admin</button>
                    </div>
                    {loading ? <p className="text-muted">Loading...</p> : (
                        <div className="card">
                            <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>City</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {admins.map(a => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{a.name}</td>
                                                <td className="text-sm">{a.email}</td>
                                                <td className="text-sm">{a.phone || '—'}</td>
                                                <td><span className={`badge ${roleBadge[a.role] || 'badge-default'}`}>{a.role.replace(/_/g, ' ')}</span></td>
                                                <td className="text-sm">{a.city?.name || '—'}</td>
                                                <td><span className={`badge ${a.isActive ? 'badge-success' : 'badge-danger'}`}>{a.isActive ? 'Active' : 'Inactive'}</span></td>
                                                <td className="text-sm">{formatDateTime(a.lastLoginAt)}</td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {admins.length === 0 && <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No admins found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === "audit" && (
                <div className="card">
                    <div className="card-header"><h3>Recent Audit Logs</h3></div>
                    <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>IP Address</th></tr></thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="text-sm" style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{log.admin?.name || '—'}</td>
                                        <td>{log.action}</td>
                                        <td><span className="badge badge-default">{log.entity}</span></td>
                                        <td className="text-sm">{log.entityId || '—'}</td>
                                        <td className="text-sm">{log.ipAddress || '—'}</td>
                                    </tr>
                                ))}
                                {auditLogs.length === 0 && <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No audit logs yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Create New Admin</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" maxLength={10} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Role *</label>
                                        <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            {roles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">City</label>
                                        <select className="form-select" value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })}>
                                            <option value="">— All Cities —</option>
                                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Admin</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
