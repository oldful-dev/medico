"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Search, Filter, Plus,
    CheckCircle2, AlertCircle, Clock, Trash2, Edit2, X, Shield, HeartPulse, User, Download, Save, ChevronDown, ChevronUp, Users,
    Eye, EyeOff, Info, Send, UserCheck
} from "lucide-react";
import { profilesAPI, cityAPI, labAPI, activityAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";
import GCSUpload from "@/components/GCSUpload";

const TABS = [
    { id: 'management', label: 'Management', icon: Shield, description: 'Administrative staff (coordinators, supervisors)' },
    { id: 'doctor', label: 'Doctors', icon: HeartPulse, description: 'Medical doctors and physicians' },
    { id: 'nurse', label: 'Nurses', icon: HeartPulse, description: 'Registered and auxiliary nurses' },
    { id: 'caregiver', label: 'Caregivers', icon: User, description: 'Healthcare caregivers and attendants' },
];

export default function ProfilesPage() {
    // ── Core Data State ────────────────────────────────
    const [activeTab, setActiveTab] = useState('management');
    const [profiles, setProfiles] = useState([]);
    const [metadata, setMetadata] = useState({ specializations: [], adminRoles: [] });
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // ── Filter State ───────────────────────────────────
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [sort, setSort] = useState({ key: 'createdAt', order: 'desc' });
    const [page, setPage] = useState(1);
    const limit = 10;

    // ── Interaction State ──────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showGuide, setShowGuide] = useState(false);

    // ── Assign Staff to Booking ────────────────────────
    const [assignTarget, setAssignTarget] = useState(null);   // staff profile being assigned
    const [assignOrders, setAssignOrders] = useState([]);     // lab orders to pick from
    const [assignOrdersLoading, setAssignOrdersLoading] = useState(false);
    const [assignOrderSearch, setAssignOrderSearch] = useState('');
    const [assignForm, setAssignForm] = useState({ labOrderId: '', eventType: '', eta: '', statusDetail: '' });
    const [assigning, setAssigning] = useState(false);

    const EVENT_TYPES = [
        { value: 'doctor_assigned',       label: '👨‍⚕️ Doctor Assigned' },
        { value: 'caregiver_assigned',     label: '🤝 Caregiver Assigned' },
        { value: 'nurse_assigned',         label: '💉 Nurse Assigned' },
        { value: 'appointment_confirmed',  label: '✅ Appointment Confirmed' },
        { value: 'sample_collected',       label: '🧪 Lab Sample Collected' },
        { value: 'out_for_delivery',       label: '🚴 Order Out for Delivery' },
        { value: 'medicine_delivered',     label: '📦 Medicine Delivered' },
        { value: 'service_rescheduled',    label: '📅 Service Rescheduled' },
        { value: 'payment_confirmed',      label: '💳 Payment Confirmed' },
    ];

    // Default event type based on staff role
    const defaultEventForRole = (role) => {
        if (!role) return '';
        const r = role.toLowerCase();
        if (r.includes('doctor')) return 'doctor_assigned';
        if (r.includes('nurse')) return 'nurse_assigned';
        if (r.includes('caregiver')) return 'caregiver_assigned';
        if (r.includes('phlebotomist') || r.includes('lab')) return 'sample_collected';
        return 'appointment_confirmed';
    };

    async function openAssignModal(profile) {
        setAssignTarget(profile);
        setAssignForm({ labOrderId: '', eventType: defaultEventForRole(profile.role || profile.specialization), eta: '', statusDetail: '' });
        setAssignOrderSearch('');
        setAssignOrdersLoading(true);
        setAssignOrders([]);
        try {
            // Load recent CONFIRMED/PENDING lab orders to assign to
            const res = await labAPI.getOrders({ status: 'CONFIRMED', limit: 30 });
            setAssignOrders(res.data?.data?.orders || res.data?.data || []);
        } catch { setAssignOrders([]); }
        finally { setAssignOrdersLoading(false); }
    }

    async function handleAssignSubmit() {
        if (!assignForm.labOrderId) { showToast('Select a lab order', 'error'); return; }
        if (!assignForm.eventType) { showToast('Select an event type', 'error'); return; }
        setAssigning(true);
        try {
            const staffIdValue = assignTarget.staffId || assignTarget.employeeId || assignTarget.id?.slice(0, 12).toUpperCase();
            await activityAPI.assignStaff(assignForm.labOrderId, {
                eventType: assignForm.eventType,
                serviceType: 'Blood Test',
                staffName: assignTarget.name,
                staffId: `AYX-${(assignTarget.role || 'STF').slice(0, 3).toUpperCase()}-${staffIdValue}`,
                staffPhone: assignTarget.phone,
                staffPhotoUrl: assignTarget.profileImageUrl || null,
                eta: assignForm.eta || null,
                statusDetail: assignForm.statusDetail || null,
            });
            showToast(`${assignTarget.name} assigned & update pushed to user ✓`, 'success');
            setAssignTarget(null);
        } catch (e) {
            showToast(e.response?.data?.message || 'Assignment failed', 'error');
        } finally {
            setAssigning(false);
        }
    }

    const filteredAssignOrders = assignOrders.filter(o => {
        if (!assignOrderSearch) return true;
        const q = assignOrderSearch.toLowerCase();
        return (
            o.clientRefId?.toLowerCase().includes(q) ||
            o.user?.name?.toLowerCase().includes(q) ||
            o.packages?.[0]?.name?.toLowerCase().includes(q)
        );
    });

    // ── Search Debouncing ──────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // ── Fetching Logic ─────────────────────────────────
    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await profilesAPI.getAll({
                role: activeTab,
                search: debouncedSearch,
                specialization,
                sortBy: sort.key,
                order: sort.order,
                page,
                limit
            });
            if (res.data.success) {
                setProfiles(res.data.data);
                setTotal(res.data.total);
            }
        } catch (e) {
            showToast("Failed to fetch profiles", "error");
        } finally {
            setLoading(false);
        }
    }, [activeTab, debouncedSearch, specialization, sort, page]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [mRes, cRes] = await Promise.all([
                    profilesAPI.getMetadata(),
                    cityAPI.getAll()
                ]);
                if (mRes.data.success) setMetadata(mRes.data.data);
                if (cRes.data.success) setCities(cRes.data.data);
            } catch (err) { console.error(err); }
        };
        fetchMeta();
    }, []);

    // ── Handlers ───────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await profilesAPI.create(activeTab, formData);
            if (res.data.success) {
                showToast("Staff profile created", "success");
                setShowAddModal(false);
                setFormData({});
                loadProfiles();
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Creation failed", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await profilesAPI.update(editingProfile.id, activeTab, formData);
            if (res.data.success) {
                showToast("Profile updated", "success");
                setEditingProfile(null);
                loadProfiles();
            }
        } catch (error) {
            showToast("Update failed", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        try {
            await profilesAPI.delete(id, activeTab);
            showToast("Profile deleted", "success");
            loadProfiles();
        } catch (err) {
            showToast("Delete failed", "error");
        }
    };

    const handleExport = () => {
        if (!profiles.length) return showToast("No records to export", "warning");
        const headers = ["ID", "Name", "Role", "Email", "Phone", "Status", "Joined Date"];
        const csv = [
            headers.join(","),
            ...profiles.map(p => [p.id, p.name, p.role, p.email, p.phone, p.status, p.createdAt].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff_export_${activeTab}_${Date.now()}.csv`;
        a.click();
        showToast("Generating CSV...", "success");
    };

    const openEditModal = (p) => {
        setEditingProfile(p);
        setFormData({
            name: p.name,
            email: p.email,
            phone: p.phone,
            cityId: cities.find(c => c.name === p.city)?.id || '',
            role: p.role,
            specialization: p.role,
            profileImageUrl: p.profileImageUrl
        });
    };

    // ── Render Components ──────────────────────────────
    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'status-active';
            case 'PENDING': return 'status-pending';
            case 'BUSY': return 'status-busy';
            default: return 'status-inactive';
        }
    };

    return (
        <div className="profiles-page">
            <header className="page-header">
                <div className="title-group">
                    <h1>Staff Management</h1>
                    <p>Centralized directory for medical, nursing, and administrative personnel.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => setShowGuide(!showGuide)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Info size={18} /> How to use
                    </button>
                    <button className="btn-secondary" onClick={handleExport}>
                        <Download size={18} /> Export
                    </button>
                    <button className="btn-primary" onClick={() => { setFormData({ cityId: cities[0]?.id }); setShowAddModal(true); }}>
                        <Plus size={20} /> Add Staff
                    </button>
                </div>
            </header>

            {/* GUIDE SECTION */}
            {showGuide && (
                <div className="guide-card">
                    <div className="guide-header">
                        <h3>How to Use Staff Management</h3>
                        <button className="close-btn" onClick={() => setShowGuide(false)}>✕</button>
                    </div>
                    <div className="guide-content">
                        <div className="guide-section">
                            <h4>1. Select a Staff Category</h4>
                            <p>Choose which type of staff you want to manage: <strong>Management</strong>, <strong>Doctors</strong>, <strong>Nurses</strong>, or <strong>Caregivers</strong>.</p>
                        </div>
                        <div className="guide-section">
                            <h4>2. Add New Staff</h4>
                            <p>Click the <strong>[+ Add Staff]</strong> button to create a new profile. Fill in name, email, phone, city, and specialization.</p>
                        </div>
                        <div className="guide-section">
                            <h4>3. Edit Staff</h4>
                            <p>Click the <strong>edit icon (✏️)</strong> next to any staff member to update their information.</p>
                        </div>
                        <div className="guide-section">
                            <h4>4. Remove Staff</h4>
                            <p>Click the <strong>trash icon (🗑️)</strong> to delete a staff member from the system.</p>
                        </div>
                        <div className="guide-section">
                            <h4>5. Search & Filter</h4>
                            <p>Use the search box to find staff by name or contact info. For doctors/nurses, filter by specialization.</p>
                        </div>
                        <div className="guide-section">
                            <h4>6. Export Data</h4>
                            <p>Click <strong>[Export]</strong> to download staff records as CSV file for reporting or backup.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB SELECTOR */}
            <div className="tabs-grid">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-card ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab.id); setPage(1); setSpecialization(""); }}
                        title={tab.description}
                    >
                        <div className="tab-icon"><tab.icon size={20} /></div>
                        <div style={{ flex: 1 }}>
                            <span className="tab-label">{tab.label}</span>
                            <div className="tab-description">{tab.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* FILTERS */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab}s by name or contact...`} 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    {activeTab !== 'management' && (
                        <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                            <option value="">All Specializations</option>
                            {metadata.specializations?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <span className="count-label">Total Results: <b>{total}</b></span>
                </div>
            </div>

            {/* TABLE */}
            <div className="main-card">
                <table className="staff-table">
                    <thead>
                        <tr>
                            <th onClick={() => setSort({ key: 'name', order: sort.order === 'asc' ? 'desc' : 'asc' })} className="sortable">
                                NAME {sort.key === 'name' ? (sort.order === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : ''}
                            </th>
                            <th>ROLE / SPECIALIZATION</th>
                            <th>CONTACT DETAILS</th>
                            <th>CITY</th>
                            <th>STATUS</th>
                            <th align="right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} align="center" style={{ padding: '80px' }}>Loading records...</td></tr>
                        ) : profiles.length === 0 ? (
                            <tr><td colSpan={6} align="center" style={{ padding: '100px' }}>
                                <Users size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                <div style={{ opacity: 0.4 }}>No staff members found matching your search.</div>
                            </td></tr>
                        ) : profiles.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div className="staff-info">
                                        <div className="avatar">
                                            {p.profileImageUrl ? <img src={p.profileImageUrl} alt={p.name} /> : p.name.charAt(0)}
                                        </div>
                                        <div className="name-box">
                                            <div className="name">{p.name}</div>
                                            <div className="id">ID: {p.id.slice(0, 8)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="role-tag">{p.role === p.specialization ? p.role : `${p.role}`}</span></td>
                                <td>
                                    <div className="contact-info">
                                        <div>{p.phone}</div>
                                        <div className="email">{p.email}</div>
                                    </div>
                                </td>
                                <td>{p.city}</td>
                                <td><span className={`status-pill ${getStatusColor(p.status)}`}>{p.status}</span></td>
                                <td align="right">
                                    <div className="actions">
                                        <button className="icon-btn assign" title="Assign to booking" onClick={() => openAssignModal(p)}><UserCheck size={16} /></button>
                                        <button className="icon-btn edit" onClick={() => openEditModal(p)}><Edit2 size={16} /></button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* PAGINATION */}
                <div className="pagination">
                    <div className="pg-info">Showing {profiles.length} of {total} records</div>
                    <div className="pg-controls">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                        <span>Page {page}</span>
                        <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {(showAddModal || editingProfile) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showAddModal ? `Add New Staff (${activeTab})` : 'Edit Staff Profile'}</h3>
                            <button className="close-btn" onClick={() => { setShowAddModal(false); setEditingProfile(null); }}><X /></button>
                        </div>
                        <form onSubmit={showAddModal ? handleAdd : handleUpdate} className="modal-body">
                            <GCSUpload 
                                existingUrl={formData.profileImageUrl}
                                onUploadSuccess={(url) => setFormData({ ...formData, profileImageUrl: url })}
                                label="Staff Profile Photo"
                            />
                            <div className="form-group">
                                <label>Full Name</label>
                                <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>Email</label>
                                    <input type="email" required={activeTab === 'management'} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="form-group flex-1">
                                    <label>Phone</label>
                                    <input required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>City</label>
                                    <select required value={formData.cityId || ''} onChange={e => setFormData({...formData, cityId: e.target.value})}>
                                        <option value="">Select City</option>
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group flex-1">
                                    <label>{activeTab === 'management' ? 'Admin Role' : 'Specialization'}</label>
                                    <select required value={activeTab === 'management' ? formData.role : formData.specialization} onChange={e => setFormData({...formData, [activeTab === 'management' ? 'role' : 'specialization']: e.target.value})}>
                                        <option value="">Select Option</option>
                                        {(activeTab === 'management' ? metadata.adminRoles : metadata.specializations)?.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {showAddModal && activeTab === 'management' && (
                                <div className="form-group">
                                    <label>Password (Temporary)</label>
                                    <div className="password-input-wrapper">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="Default: Medico@123" 
                                            value={formData.password || ''} 
                                            onChange={e => setFormData({...formData, password: e.target.value})} 
                                        />
                                        <button 
                                            type="button" 
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingProfile(null); }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSaving}>
                                    {isSaving ? "Processing..." : (showAddModal ? "Create Profile" : "Save Changes")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ASSIGN STAFF TO BOOKING MODAL
            ══════════════════════════════════════════ */}
            {assignTarget && (
                <div className="modal-overlay" onClick={() => setAssignTarget(null)}>
                    <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Assign to Booking</h3>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 400 }}>
                                    Pushing live update for <strong>{assignTarget.name}</strong>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setAssignTarget(null)}><X /></button>
                        </div>

                        <div className="modal-body" style={{ gap: 16 }}>

                            {/* Staff preview card */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                                <div className="avatar" style={{ width: 46, height: 46, fontSize: 20, flexShrink: 0 }}>
                                    {assignTarget.profileImageUrl
                                        ? <img src={assignTarget.profileImageUrl} alt={assignTarget.name} />
                                        : assignTarget.name?.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{assignTarget.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignTarget.role || assignTarget.specialization} · {assignTarget.phone}</div>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                    AYX-{(assignTarget.role || 'STF').slice(0, 3).toUpperCase()}-{assignTarget.id?.slice(0, 6).toUpperCase()}
                                </div>
                            </div>

                            {/* Event type selector */}
                            <div className="form-group">
                                <label>Event Type *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    {EVENT_TYPES.map(et => (
                                        <button key={et.value} type="button"
                                            onClick={() => setAssignForm(f => ({ ...f, eventType: et.value }))}
                                            style={{
                                                padding: '7px 10px', borderRadius: 8, border: '1.5px solid',
                                                borderColor: assignForm.eventType === et.value ? 'var(--accent-primary)' : 'var(--border-color)',
                                                background: assignForm.eventType === et.value ? 'var(--bg-glass)' : 'var(--bg-secondary)',
                                                color: assignForm.eventType === et.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                cursor: 'pointer', fontSize: 12,
                                                fontWeight: assignForm.eventType === et.value ? 700 : 400,
                                                textAlign: 'left',
                                            }}>
                                            {et.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Lab order picker */}
                            <div className="form-group">
                                <label>Select Lab Order *</label>
                                <input
                                    placeholder="Search by order ID, patient name..."
                                    value={assignOrderSearch}
                                    onChange={e => setAssignOrderSearch(e.target.value)}
                                    style={{ marginBottom: 8 }}
                                />
                                {assignOrdersLoading ? (
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>Loading orders…</div>
                                ) : filteredAssignOrders.length === 0 ? (
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No confirmed lab orders found.</div>
                                ) : (
                                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                        {filteredAssignOrders.map(order => (
                                            <div key={order.id}
                                                onClick={() => setAssignForm(f => ({ ...f, labOrderId: order.id }))}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 12px', cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    background: assignForm.labOrderId === order.id ? 'var(--bg-glass)' : 'var(--bg-card)',
                                                    borderLeft: assignForm.labOrderId === order.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                                }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{order.clientRefId}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {order.user?.name} · {order.packages?.[0]?.name || 'Blood Test'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {order.slot?.date} {order.slot?.time} · {order.bookingType}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: 700 }}>{order.status}</span>
                                                    {assignForm.labOrderId === order.id && <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 700 }}>✓ Selected</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ETA + status detail */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>ETA <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                                    <input placeholder="e.g. 20 mins" value={assignForm.eta} onChange={e => setAssignForm(f => ({ ...f, eta: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Status Message <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(shown to user)</span></label>
                                    <input placeholder="e.g. En route to your location" value={assignForm.statusDetail} onChange={e => setAssignForm(f => ({ ...f, statusDetail: e.target.value }))} />
                                </div>
                            </div>

                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAssignSubmit} disabled={assigning}>
                                {assigning ? 'Assigning…' : <><Send size={14} /> Assign &amp; Notify User</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .profiles-page { color: var(--text-primary); font-family: var(--font-primary); }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
                .title-group h1 { font-size: 32px; font-weight: 800; margin: 0; color: var(--text-primary); }
                .title-group p { color: var(--text-muted); margin: 4px 0 0; font-size: 14px; }

                .guide-card { background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.1) 100%); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; margin-bottom: 32px; }
                .guide-header { padding: 16px 20px; border-bottom: 1px solid rgba(99,102,241,0.2); display: flex; justify-content: space-between; align-items: center; }
                .guide-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
                .guide-content { padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                .guide-section { }
                .guide-section h4 { margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; }
                .guide-section p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
                .guide-section strong { color: var(--text-primary); }

                .header-actions { display: flex; gap: 12px; }
                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; border: none; cursor: pointer; transition: var(--transition-base); }
                .btn-primary { background: var(--gradient-primary); color: white; box-shadow: var(--shadow-md); }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); opacity: 0.9; }
                .btn-secondary { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); }
                .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--accent-primary); }

                .tabs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
                .tab-card { background: var(--bg-card); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg); display: flex; align-items: flex-start; gap: 14px; cursor: pointer; transition: var(--transition-base); color: var(--text-muted); text-align: left; box-shadow: var(--shadow-sm); }
                .tab-card:hover { border-color: var(--accent-primary); background: var(--bg-card-hover); transform: translateY(-2px); }
                .tab-card.active { border-color: var(--accent-primary); background: var(--bg-glass); color: var(--accent-primary); box-shadow: var(--shadow-md); border-width: 2px; }
                .tab-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; transition: var(--transition-base); color: var(--text-muted); flex-shrink: 0; margin-top: 2px; }
                .active .tab-icon { background: var(--accent-primary); color: white; }
                .tab-label { font-weight: 700; font-size: 16px; display: block; }
                .tab-description { font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.4; font-weight: 400; }

                .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
                .search-box { position: relative; width: 100%; max-width: 400px; }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .search-box input { width: 100%; padding: 12px 16px 12px 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none; transition: var(--transition-fast); }
                .search-box input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--bg-glass-hover); }

                .filter-group { display: flex; align-items: center; gap: 20px; }
                .filter-group select { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 16px; border-radius: var(--radius-md); outline: none; font-weight: 600; cursor: pointer; }
                .count-label { font-size: 13px; color: var(--text-muted); }
                .count-label b { color: var(--text-primary); font-size: 16px; margin-left: 4px; }

                .main-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); }
                .staff-table { width: 100%; border-collapse: collapse; text-align: left; }
                .staff-table th { padding: 18px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
                .staff-table th.sortable { cursor: pointer; }
                .staff-table th.sortable:hover { color: var(--accent-primary); }
                .staff-table td { padding: 16px 24px; border-bottom: 1px solid var(--border-color); vertical-align: middle; color: var(--text-secondary); }
                .staff-table tr:hover { background: var(--bg-card-hover); }

                .staff-info { display: flex; align-items: center; gap: 12px; }
                .avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; overflow: hidden; font-size: 18px; }
                .avatar img { width: 100%; height: 100%; object-fit: cover; }
                .name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
                .id { font-size: 10px; color: var(--text-muted); font-weight: 700; }

                .role-tag { padding: 4px 10px; background: var(--bg-glass); border-radius: 8px; font-size: 11px; font-weight: 700; color: var(--accent-primary); border: 1px solid var(--border-color); }
                .status-pill { padding: 4px 12px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-active { background: rgba(16, 185, 129, 0.1); color: #10B981; }
                .status-busy { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
                .status-pending { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
                .status-inactive { background: rgba(239, 68, 68, 0.1); color: #EF4444; }

                .contact-info { line-height: 1.4; font-size: 13px; font-weight: 500; }
                .email { font-size: 11px; color: var(--text-muted); }

                .actions { display: flex; gap: 8px; }
                .icon-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--transition-fast); }
                .icon-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); transform: scale(1.1); }
                .icon-btn.delete:hover { border-color: var(--accent-danger); color: var(--accent-danger); }
                .icon-btn.assign:hover { border-color: #059669; color: #059669; }

                .pagination { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); font-size: 13px; color: var(--text-muted); }
                .pg-controls { display: flex; align-items: center; gap: 16px; }
                .pg-controls button { padding: 6px 14px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: var(--radius-md); cursor: pointer; font-weight: 600; transition: var(--transition-fast); }
                .pg-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
                .pg-controls button:not(:disabled):hover { border-color: var(--accent-primary); color: var(--accent-primary); }
                .pg-controls span { font-weight: 700; color: var(--text-primary); }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
                .modal-content { background: var(--bg-card); border: 1px solid var(--border-color); width: 100%; max-width: 550px; max-height: 90vh; border-radius: var(--radius-lg); overflow-y: auto; box-shadow: var(--shadow-xl); animation: slideUp 0.3s ease-out; color: var(--text-primary); display: flex; flex-direction: column; }
                .modal-content::-webkit-scrollbar { width: 6px; }
                .modal-content::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
                
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .modal-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; background: var(--bg-card); z-index: 10; }
                .modal-header h3 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); }
                .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
                .close-btn:hover { color: var(--text-primary); transform: rotate(90deg); }
                
                .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; flex: 1; }
                .form-group label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
                .form-group input, .form-group select { width: 100%; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none; transition: var(--transition-fast); font-family: var(--font-primary); }
                .form-group input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--bg-glass-hover); }
                .password-input-wrapper { position: relative; width: 100%; }
                .password-input-wrapper input { padding-right: 48px; }
                .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: var(--transition-fast); padding: 4px; border-radius: 6px; }
                .password-toggle:hover { color: var(--accent-primary); background: var(--bg-glass-hover); }
                .form-row { display: flex; gap: 16px; }
                .flex-1 { flex: 1; }
                .modal-footer { display: flex; gap: 12px; padding: 0 24px 24px; position: sticky; bottom: 0; background: var(--bg-card); z-index: 10; }
                .modal-footer button { flex: 1; margin: 0; }

                @media (max-width: 600px) {
                    .form-row { flex-direction: column; gap: 20px; }
                    .modal-content { max-height: 95vh; }
                    .modal-body { padding: 20px; gap: 16px; }
                }
            `}</style>

        </div>
    );
}
