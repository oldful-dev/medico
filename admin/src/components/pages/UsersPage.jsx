"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Eye, Ban, UserCheck, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash, FileDown } from "lucide-react";
import Cookies from "js-cookie";
import { userAPI, cityAPI, bookingAPI } from "@/lib/api";
import { formatDate, formatDateTime, showToast } from "@/lib/hooks";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ status: 'ACTIVE', cityId: '', healthTag: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailTab, setDetailTab] = useState('personal');
    const [imageViewer, setImageViewer] = useState(null);
    const limit = 20;
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        cityId: '',
        gender: '',
        dateOfBirth: '',
        healthTag: 'NORMAL',
        status: 'ACTIVE',
        preferredLanguage: 'en',
        pushEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        emailMarketingEnabled: false
    });

    const [reportFile, setReportFile] = useState(null);
    const [reportTitle, setReportTitle] = useState("");
    const [reportCategory, setReportCategory] = useState("Other");
    const [uploadingReport, setUploadingReport] = useState(false);

    useEffect(() => {
        cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => { });
    }, []);

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

    useEffect(() => { loadUsers(); }, [loadUsers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        loadUsers();
    }

    async function viewUser(id) {
        try {
            const res = await userAPI.getById(id);
            setDetailTab('personal');
            setSelectedUser(res.data?.data);
        } catch (e) { showToast('Failed to load user', 'error'); }
    }

    function startEditUser(u) {
        setEditingUser(u);
        setEditForm({
            name: u.name || '',
            phone: u.phone || '',
            email: u.email || '',
            cityId: u.cityId || '',
            gender: u.gender || '',
            dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
            healthTag: u.healthTag || 'NORMAL',
            status: u.status || 'ACTIVE',
            preferredLanguage: u.preferredLanguage || 'en',
            pushEnabled: u.pushEnabled !== false,
            smsEnabled: u.smsEnabled !== false,
            whatsappEnabled: u.whatsappEnabled !== false,
            emailMarketingEnabled: u.emailMarketingEnabled === true,
        });
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...editForm };
            payload.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth).toISOString() : null;
            const res = await userAPI.update(editingUser.id, payload);
            if (res.data?.success || res.status === 200) {
                showToast('User updated successfully');
                setEditingUser(null);
                loadUsers();
            } else {
                showToast(res.data?.message || 'Failed to update user', 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update user', 'error');
        } finally {
            setSaving(false);
        }
    }

    function calculateAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
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

    async function deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user account? The user details will be anonymized, but history records will be archived for compliance.')) return;
        try {
            await userAPI.delete(id);
            showToast('User account deleted successfully');
            loadUsers();
            setSelectedUser(null);
        } catch (e) { showToast(e.response?.data?.message || 'Failed to delete user', 'error'); }
    }

    async function handleUploadReport(e) {
        e.preventDefault();
        if (!reportFile) { showToast('Please select a file to upload', 'error'); return; }
        try {
            setUploadingReport(true);
            const formData = new FormData();
            formData.append('file', reportFile);
            formData.append('title', reportTitle || reportFile.name);
            formData.append('category', reportCategory);

            await userAPI.uploadHealthReport(selectedUser.id, formData);
            showToast('Health data uploaded successfully');
            setReportFile(null);
            setReportTitle("");
            setReportCategory("Other");
            // Reload user details
            const res = await userAPI.getById(selectedUser.id);
            setSelectedUser(res.data?.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload report', 'error');
        } finally {
            setUploadingReport(false);
        }
    }

    async function handleDeleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this health document?')) return;
        try {
            await userAPI.deleteHealthReport(reportId);
            showToast('Health data deleted successfully');
            // Reload user details
            const res = await userAPI.getById(selectedUser.id);
            setSelectedUser(res.data?.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete report', 'error');
        }
    }

    const statusBadge = { ACTIVE: 'badge-success', SUSPENDED: 'badge-warning', BLOCKED: 'badge-danger', DELETED: 'badge-default' };
    const healthBadge = { NORMAL: 'badge-success', DIABETIC: 'badge-warning', HYPERTENSION: 'badge-danger', CARDIAC: 'badge-danger', OTHER: 'badge-default' };

    return (
        <div>
            <div className="page-header"><h2>User Management</h2><p>Manage registered app users, health data, and emergency contacts</p></div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button 
                    className={`btn ${filters.status === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setFilters({ ...filters, status: 'ACTIVE', healthTag: '' }); setPage(1); }}
                >
                    Active
                </button>
                <button 
                    className={`btn ${filters.status === 'SUSPENDED' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setFilters({ ...filters, status: 'SUSPENDED', healthTag: '' }); setPage(1); }}
                >
                    Suspended
                </button>
                <button 
                    className={`btn ${filters.status === 'BLOCKED' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setFilters({ ...filters, status: 'BLOCKED', healthTag: '' }); setPage(1); }}
                >
                    Blocked
                </button>
                <button 
                    className={`btn ${filters.status === 'DELETED' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setFilters({ ...filters, status: 'DELETED', healthTag: '' }); setPage(1); }}
                >
                    Deleted
                </button>
            </div>

            <div className="filter-bar">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary"><Search size={16} /></button>
                </form>
                <select className="form-select" style={{ width: 150 }} value={filters.cityId} onChange={e => { setFilters({ ...filters, cityId: e.target.value }); setPage(1); }}>
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                                    {u.status !== 'DELETED' && <button className="btn btn-sm btn-secondary" onClick={() => startEditUser(u)}><Edit2 size={14} /></button>}
                                                    {u.status === 'ACTIVE' && <button className="btn btn-sm btn-danger" onClick={() => blockUser(u.id)}><Ban size={14} /></button>}
                                                    {u.status === 'BLOCKED' && <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}><UserCheck size={14} /></button>}
                                                    {u.status !== 'DELETED' && <button className="btn btn-sm btn-danger" style={{ background: '#DC2626', borderColor: '#DC2626' }} onClick={() => deleteUser(u.id)}><Trash size={14} /></button>}
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {selectedUser.profileImageUrl ? (
                                <img 
                                    src={selectedUser.profileImageUrl} 
                                    alt={selectedUser.name} 
                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                                />
                            ) : (
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                    {selectedUser.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <h3 style={{ margin: 0 }}>User Profile — {selectedUser.name}</h3>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Tabs Navigation — grouped per the 5-category Client & Patient structure */}
                            <div className="tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 10, marginBottom: 8 }}>
                                {[
                                    { key: 'personal', label: 'Personal Details' },
                                    { key: 'service-history', label: 'Service & Booking History' },
                                    { key: 'subscriptions', label: 'Subscription Details' },
                                    { key: 'medical', label: 'Medical & Relevant Records' },
                                    { key: 'other', label: 'Other Info' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        className={`tab ${(!detailTab && tab.key === 'personal') || detailTab === tab.key ? 'active' : ''}`}
                                        onClick={() => setDetailTab(tab.key)}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            borderRadius: 6,
                                            border: '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            background: ((!detailTab && tab.key === 'personal') || detailTab === tab.key) ? 'var(--accent-primary)' : 'transparent',
                                            borderColor: ((!detailTab && tab.key === 'personal') || detailTab === tab.key) ? 'var(--accent-primary)' : 'var(--border-color)',
                                            color: ((!detailTab && tab.key === 'personal') || detailTab === tab.key) ? '#fff' : 'var(--text-muted)'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* 1. Personal Details — identity, addresses, family, emergency contacts */}
                            {(!detailTab || detailTab === 'personal') && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">User ID</label><div className="text-sm">{selectedUser.uniqueUserId}</div></div>
                                        <div className="form-group"><label className="form-label">Phone</label><div className="text-sm">{selectedUser.phone}</div></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Email</label><div className="text-sm">{selectedUser.email || '—'}</div></div>
                                        <div className="form-group"><label className="form-label">City</label><div className="text-sm">{selectedUser.city?.name || '—'}</div></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Age</label><div className="text-sm">{calculateAge(selectedUser.dateOfBirth) || '—'} {calculateAge(selectedUser.dateOfBirth) ? 'years' : ''}</div></div>
                                        <div className="form-group"><label className="form-label">Date of Birth</label><div className="text-sm">{selectedUser.dateOfBirth ? formatDate(selectedUser.dateOfBirth) : '—'}</div></div>
                                    </div>
                                    <div className="form-row" style={{ marginBottom: 16 }}>
                                        <div className="form-group"><label className="form-label">Health Tag</label><span className={`badge ${healthBadge[selectedUser.healthTag]}`}>{selectedUser.healthTag}</span></div>
                                        <div className="form-group"><label className="form-label">Status</label><span className={`badge ${statusBadge[selectedUser.status]}`}>{selectedUser.status}</span></div>
                                    </div>

                                    {selectedUser.addresses?.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Registered Addresses</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                                {selectedUser.addresses.map((addr, i) => (
                                                    <div key={i} className="text-sm" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                                        <strong>{addr.label}:</strong> {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.cityName}, {addr.state} - {addr.pincode}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedUser.familyMembers?.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Family Members</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                                {selectedUser.familyMembers.map((fm, i) => (
                                                    <div key={i} className="text-sm" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                                        <strong>{fm.name}</strong> ({fm.relation}) {fm.bloodGroup ? `• Blood Group: ${fm.bloodGroup}` : ''}
                                                        {fm.allergies && <div style={{ fontSize: 11, color: 'var(--accent-danger)', marginTop: 2 }}>Allergies: {fm.allergies}</div>}
                                                        {fm.chronicConditions && <div style={{ fontSize: 11, color: 'var(--accent-warning)', marginTop: 2 }}>Conditions: {fm.chronicConditions}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedUser.emergencyContacts?.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Emergency Contacts</label>
                                            {selectedUser.emergencyContacts.map((ec, i) => (
                                                <div key={i} className="text-sm" style={{ marginBottom: 4 }}>{ec.name} — {ec.phone} ({ec.relationship})</div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* 2. Service & Booking History — Bookings + Lab Orders + Product Orders merged */}
                            {detailTab === 'service-history' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Service Bookings</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.bookings || selectedUser.bookings.length === 0) ? <div className="text-muted text-sm">No bookings found</div> :
                                                selectedUser.bookings.map((booking, i) => (
                                                    <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{booking.bookingCode} - {booking.service?.name}</span>
                                                            <span className="badge badge-info" style={{ fontSize: 10 }}>{booking.status}</span>
                                                        </div>
                                                        <div>Price: ₹{booking.totalPrice} • Created: {formatDate(booking.createdAt)}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Scheduled: {formatDate(booking.scheduledDate)} {booking.scheduledTime || ''}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Blood Tests & Lab Orders</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.labOrders || selectedUser.labOrders.length === 0) ? <div className="text-muted text-sm">No lab orders found</div> :
                                                selectedUser.labOrders.map((lo, i) => (
                                                    <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Ref: {lo.clientRefId || lo.id}</span>
                                                            <span className="badge badge-warning" style={{ fontSize: 10 }}>{lo.status}</span>
                                                        </div>
                                                        <div>
                                                            Packages: {
                                                                Array.isArray(lo.packages)
                                                                    ? lo.packages.map(p => p.name || p.package_name || p).join(', ')
                                                                    : typeof lo.packages === 'string'
                                                                        ? (() => {
                                                                            try {
                                                                                const parsed = JSON.parse(lo.packages);
                                                                                return Array.isArray(parsed) ? parsed.map(p => p.name || p.package_name || p).join(', ') : parsed;
                                                                            } catch (e) { return lo.packages; }
                                                                        })()
                                                                        : '—'
                                                            }
                                                        </div>
                                                        <div>Total Price: ₹{lo.totalPrice || lo.amount} • Created: {formatDate(lo.createdAt)}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Wellness Store Orders</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.productOrders || selectedUser.productOrders.length === 0) ? <div className="text-muted text-sm">No product orders found</div> :
                                                selectedUser.productOrders.map((po, i) => (
                                                    <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Order: #{po.orderCode || po.id}</span>
                                                            <span className="badge badge-success" style={{ fontSize: 10 }}>{po.status}</span>
                                                        </div>
                                                        <div>
                                                            Items: {
                                                                Array.isArray(po.items)
                                                                    ? po.items.map(it => `${it.name} (x${it.quantity || 1})`).join(', ')
                                                                    : typeof po.items === 'string'
                                                                        ? (() => {
                                                                            try {
                                                                                const parsed = JSON.parse(po.items);
                                                                                return Array.isArray(parsed) ? parsed.map(it => `${it.name} (x${it.quantity || 1})`).join(', ') : parsed;
                                                                            } catch (e) { return po.items; }
                                                                        })()
                                                                        : po.product?.name || '—'
                                                            }
                                                        </div>
                                                        <div>Amount: ₹{po.amount || po.totalAmount} • Date: {formatDate(po.createdAt)}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 3. Subscription Details */}
                            {detailTab === 'subscriptions' && (
                                <div className="form-group">
                                    <label className="form-label">Subscriptions</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {(!selectedUser.subscriptions || selectedUser.subscriptions.length === 0) ? <div className="text-muted text-sm">No subscriptions found</div> :
                                            selectedUser.subscriptions.map((sub, i) => (
                                                <div key={i} className="text-sm" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, borderLeft: '4px solid var(--accent-success)' }}>
                                                    <strong>{sub.plan?.name}</strong> — {sub.status} • Exp: {formatDate(sub.expiresAt)}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* 4. Medical & Relevant Records — medical card data + health report uploads */}
                            {detailTab === 'medical' && (
                                <>
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
                                    {selectedUser.medicalCards?.length > 0 && selectedUser.medicalCards[0]?.currentMedications?.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Current Medications</label>
                                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                {selectedUser.medicalCards[0].currentMedications.map((med, i) => (
                                                    <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < selectedUser.medicalCards[0].currentMedications.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{med}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Health Records & Medical History</span>
                                        </label>

                                        {/* Upload Form */}
                                        <form onSubmit={handleUploadReport} style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>Upload New Health Document</div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 11 }}>Document Title</label>
                                                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="e.g. Lab Report Feb, Prescription..." value={reportTitle} onChange={e => setReportTitle(e.target.value)} required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 11 }}>Category</label>
                                                    <select className="form-select" style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }} value={reportCategory} onChange={e => setReportCategory(e.target.value)}>
                                                        <option value="Prescription">Prescription</option>
                                                        <option value="Lab Report">Lab Report</option>
                                                        <option value="Vaccination">Vaccination</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 11 }}>Select File (PDF, JPG, PNG)</label>
                                                <input type="file" accept=".pdf,image/*" onChange={e => setReportFile(e.target.files[0])} required style={{ fontSize: 12 }} />
                                            </div>
                                            <button type="submit" disabled={uploadingReport} className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start', padding: '6px 16px', fontSize: 12 }}>
                                                {uploadingReport ? 'Uploading & Processing OCR...' : 'Upload Document'}
                                            </button>
                                        </form>

                                        {/* Reports List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.healthReports || selectedUser.healthReports.length === 0) ? <div className="text-muted text-sm">No health documents uploaded</div> :
                                                selectedUser.healthReports.map((report) => (
                                                    <div key={report.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{report.title}</span>
                                                            <span className="badge badge-info" style={{ fontSize: 10 }}>{report.category || 'Other'}</span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                            Uploaded: {formatDate(report.createdAt)} • By: {report.uploadedBy === selectedUser.id ? 'Client' : 'Staff / Admin'}
                                                        </div>
                                                        {report.ocrStatus && (
                                                            <div style={{ fontSize: 11, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                <span>OCR:</span>
                                                                <span className={`badge ${report.ocrStatus === 'completed' ? 'badge-success' : report.ocrStatus === 'processing' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                                                                    {report.ocrStatus}
                                                                </span>
                                                                {report.flagSeverity && (
                                                                    <span className="badge badge-danger" style={{ fontSize: 9 }}>{report.flagSeverity}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <a href={report.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>View Document</a>
                                                            <button onClick={() => handleDeleteReport(report.id)} className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: 11, background: '#DC2626', borderColor: '#DC2626' }}>Delete</button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 5. All Other Associated Info — SOS alerts + Payments ledger */}
                            {detailTab === 'other' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">SOS Trigger Alerts</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.sosAlerts || selectedUser.sosAlerts.length === 0) ? <div className="text-muted text-sm">No SOS alerts triggered</div> :
                                                selectedUser.sosAlerts.map((sos, i) => (
                                                    <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, borderLeft: '4px solid var(--accent-danger)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Triggered Alert</span>
                                                            <span className="badge badge-danger" style={{ fontSize: 10 }}>{sos.status}</span>
                                                        </div>
                                                        <div>Location: {sos.latitude}, {sos.longitude}</div>
                                                        <div>Date: {formatDate(sos.createdAt)}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Payments Ledger</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {(!selectedUser.payments || selectedUser.payments.length === 0) ? <div className="text-muted text-sm">No payments recorded</div> :
                                                selectedUser.payments.map((p, i) => (
                                                    <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ID: {p.razorpayPaymentId || p.id}</span>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <span className={`badge ${p.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>{p.status}</span>
                                                                {p.bookingId && p.status === 'SUCCESS' && (
                                                                    <>
                                                                        <button className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} title="View Invoice Inline" onClick={() => setImageViewer({ title: `Invoice: ${p.razorpayPaymentId || p.id}`, url: bookingAPI.getInvoiceDownloadUrl(p.bookingId) })}><Eye size={12} /></button>
                                                                        <a href={bookingAPI.getInvoiceDownloadUrl(p.bookingId)} download className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Download Invoice PDF" target="_blank" rel="noreferrer"><FileDown size={12} /></a>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>Amount: ₹{p.amount} • Purpose: {p.purpose || 'Booking Payment'}</div>
                                                        <div>Date: {formatDate(p.createdAt)}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            {selectedUser.status === 'ACTIVE' && <>
                                <button className="btn btn-warning" onClick={() => suspendUser(selectedUser.id)}>Suspend</button>
                                <button className="btn btn-danger" onClick={() => blockUser(selectedUser.id)}>Block</button>
                            </>}
                            {selectedUser.status !== 'ACTIVE' && selectedUser.status !== 'DELETED' && <button className="btn btn-success" onClick={() => activateUser(selectedUser.id)}>Activate</button>}
                            {selectedUser.status !== 'DELETED' && (
                                <button className="btn btn-danger" style={{ background: '#DC2626', borderColor: '#DC2626' }} onClick={() => deleteUser(selectedUser.id)}>Delete Account</button>
                            )}
                            <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {imageViewer && (
                <div className="modal-overlay" onClick={() => setImageViewer(null)} style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 20 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageViewer(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 28, width: 40, height: 40, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✕</button>
                        <div style={{ width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{imageViewer.title}</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                                {imageViewer.url?.toLowerCase().includes('.pdf') ? (
                                    <iframe 
                                        src={imageViewer.url} 
                                        style={{ width: '100%', height: '100%', border: 'none' }} 
                                        title={imageViewer.title} 
                                    />
                                ) : (
                                    <img src={imageViewer.url} alt={imageViewer.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                )}
                            </div>
                            <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setImageViewer(null)} style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Edit User — {editingUser.name}</h3>
                            <button type="button" onClick={() => setEditingUser(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Name *</label>
                                        <input type="text" required className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone *</label>
                                        <input type="text" required className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">City *</label>
                                        <select required className="form-select" value={editForm.cityId} onChange={e => setEditForm({ ...editForm, cityId: e.target.value })}>
                                            <option value="">Select City</option>
                                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Gender</label>
                                        <select className="form-select" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth</label>
                                        <input type="date" className="form-input" value={editForm.dateOfBirth} onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Health Tag</label>
                                        <select className="form-select" value={editForm.healthTag} onChange={e => setEditForm({ ...editForm, healthTag: e.target.value })}>
                                            <option value="NORMAL">Normal</option>
                                            <option value="DIABETIC">Diabetic</option>
                                            <option value="HYPERTENSION">Hypertension</option>
                                            <option value="CARDIAC">Cardiac</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="SUSPENDED">Suspended</option>
                                            <option value="BLOCKED">Blocked</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Preferred Language</label>
                                        <select className="form-select" value={editForm.preferredLanguage} onChange={e => setEditForm({ ...editForm, preferredLanguage: e.target.value })}>
                                            <option value="en">English</option>
                                            <option value="hi">Hindi</option>
                                            <option value="kn">Kannada</option>
                                            <option value="ta">Tamil</option>
                                            <option value="te">Telugu</option>
                                            <option value="ml">Malayalam</option>
                                            <option value="mr">Marathi</option>
                                            <option value="bn">Bengali</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 16 }}>
                                            <input type="checkbox" checked={editForm.emailMarketingEnabled} onChange={e => setEditForm({ ...editForm, emailMarketingEnabled: e.target.checked })} />
                                            Email Marketing Enabled
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: 12 }}>
                                    <label className="form-label">Notification Channels</label>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={editForm.pushEnabled} onChange={e => setEditForm({ ...editForm, pushEnabled: e.target.checked })} />
                                            Push Notifications
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={editForm.smsEnabled} onChange={e => setEditForm({ ...editForm, smsEnabled: e.target.checked })} />
                                            SMS
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={editForm.whatsappEnabled} onChange={e => setEditForm({ ...editForm, whatsappEnabled: e.target.checked })} />
                                            WhatsApp
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
