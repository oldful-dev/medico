"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Eye, Ban, UserCheck, RotateCcw, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import Cookies from "js-cookie";
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
                                                    <button className="btn btn-sm btn-secondary" onClick={() => startEditUser(u)}><Edit2 size={14} /></button>
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
                            {selectedUser.healthReports?.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Prescriptions & Health Reports</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        {selectedUser.healthReports.map((hr, i) => {
                                            const isPrescription = hr.title?.toLowerCase().includes('prescription') || hr.title?.toLowerCase().includes('rx') || hr.title?.toLowerCase().includes('drug');
                                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(hr.fileType?.toLowerCase());
                                            return (
                                                <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `4px solid ${isPrescription ? 'var(--accent-danger)' : 'var(--accent-primary)'}`, fontSize: 13, flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{hr.title}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Type: {hr.fileType?.toUpperCase()} • Uploaded: {formatDate(hr.createdAt)}</div>
                                                        {isPrescription && <div style={{ fontSize: 11, background: 'var(--accent-danger)', color: 'white', padding: '2px 6px', borderRadius: 3, display: 'inline-block', marginTop: 4, fontWeight: 600 }}>💊 Prescription</div>}
                                                    </div>
                                                    {hr.flagSeverity && (
                                                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: 8, borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
                                                            ⚠️ Severity: {hr.flagSeverity}
                                                            {hr.flagNote && <div style={{ marginTop: 2, fontSize: 11 }}>{hr.flagNote}</div>}
                                                        </div>
                                                    )}
                                                    {hr.fileUrl && (
                                                        <div style={{ marginTop: 8 }}>
                                                            {isImage ? (
                                                                <img 
                                                                    src={hr.fileUrl} 
                                                                    alt={hr.title} 
                                                                    style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }} 
                                                                    onClick={() => setImageViewer({ title: hr.title, url: hr.fileUrl })}
                                                                />
                                                            ) : (
                                                                <button 
                                                                    className="btn btn-sm btn-secondary" 
                                                                    style={{ width: '100%' }}
                                                                    onClick={() => setImageViewer({ title: hr.title, url: hr.fileUrl })}
                                                                >
                                                                    📄 View Document Inline
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedUser.bookings?.some(b => {
                                if (b.prescriptionUrl) return true;
                                if (b.formDataJson) {
                                    try {
                                        const parsed = typeof b.formDataJson === 'string' ? JSON.parse(b.formDataJson) : b.formDataJson;
                                        return Object.values(parsed).some(val => 
                                            (typeof val === 'string' && val.startsWith('http')) || 
                                            (Array.isArray(val) && val.some(item => typeof item === 'string' && item.startsWith('http')))
                                        );
                                    } catch(e) { return false; }
                                }
                                return false;
                            }) && (
                                <div className="form-group">
                                    <label className="form-label">Booking Photos & Attachments</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {selectedUser.bookings.map((booking, i) => {
                                            const hasPrescription = !!booking.prescriptionUrl;
                                            let uploads = [];
                                            if (booking.formDataJson) {
                                                try {
                                                    const parsed = typeof booking.formDataJson === 'string' ? JSON.parse(booking.formDataJson) : booking.formDataJson;
                                                    Object.entries(parsed).forEach(([key, val]) => {
                                                        if (typeof val === 'string' && val.startsWith('http')) {
                                                            uploads.push({ key, url: val });
                                                        } else if (Array.isArray(val)) {
                                                            val.forEach((item, index) => {
                                                                if (typeof item === 'string' && item.startsWith('http')) {
                                                                    uploads.push({ key: `${key} #${index + 1}`, url: item });
                                                                }
                                                            });
                                                        }
                                                    });
                                                } catch(e) {}
                                            }

                                            if (!hasPrescription && uploads.length === 0) return null;

                                            return (
                                                <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{booking.bookingCode} - {booking.service?.name}</span>
                                                        <span className={`badge ${booking.status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 10 }}>{booking.status}</span>
                                                    </div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8 }}>Scheduled: {formatDate(booking.scheduledDate)} {booking.scheduledTime || ''}</div>
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                                                        {hasPrescription && (
                                                            <div style={{ flex: '1 1 120px' }}>
                                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Prescription:</div>
                                                                <img 
                                                                    src={booking.prescriptionUrl} 
                                                                    alt="Prescription" 
                                                                    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                                                    onClick={() => setImageViewer({ title: `Prescription - ${booking.bookingCode}`, url: booking.prescriptionUrl })}
                                                                />
                                                            </div>
                                                        )}

                                                        {uploads.map((up, idx) => {
                                                            const isImg = /\.(jpg|jpeg|png|webp|gif)/i.test(up.url);
                                                            return (
                                                                <div key={idx} style={{ flex: '1 1 120px' }}>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{up.key}:</div>
                                                                    {isImg ? (
                                                                        <img 
                                                                            src={up.url} 
                                                                            alt={up.key} 
                                                                            style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                                                            onClick={() => setImageViewer({ title: `Attachment: ${up.key}`, url: up.url })}
                                                                        />
                                                                    ) : (
                                                                        <button 
                                                                            className="btn btn-sm btn-secondary" 
                                                                            style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            onClick={() => setImageViewer({ title: `Attachment: ${up.key}`, url: up.url })}
                                                                        >
                                                                            📄 View PDF
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
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
