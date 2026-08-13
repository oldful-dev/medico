"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Search, Filter, Plus, Edit2, Trash2, X, Shield, Download, Info, ChevronDown, ChevronUp, Users
} from "lucide-react";
import { profilesAPI, cityAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";
import GCSUpload from "@/components/GCSUpload";

const OPERATIONAL_POSITIONS = [
    'SOS Team',
    'Nurse',
    'Doctor',
    'Driver',
    'Caregiver',
    'Phlebotomist / Lab Tech',
    'Other Staff'
];

export default function StaffManagementPage() {
    // ── Core Data State ────────────────────────────────
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
    const [showGuide, setShowGuide] = useState(false);

    // ── Search Debouncing ──────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // ── Fetching Logic ─────────────────────────────────
    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await profilesAPI.getAll({
                role: 'staff',
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
    }, [debouncedSearch, specialization, sort, page]);

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
            const res = await profilesAPI.create('staff', formData);
            if (res.data.success) {
                showToast("Staff member added", "success");
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
            const res = await profilesAPI.update(editingProfile.id, 'staff', formData);
            if (res.data.success) {
                showToast("Staff member updated", "success");
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
            await profilesAPI.delete(id, 'staff');
            showToast("Staff member deleted", "success");
            loadProfiles();
        } catch (err) {
            showToast("Delete failed", "error");
        }
    };

    const handleExport = () => {
        if (!profiles.length) return showToast("No records to export", "warning");
        const headers = ["ID", "Name", "Position", "Email", "Phone", "City", "Status", "Joined Date"];
        const csv = [
            headers.join(","),
            ...profiles.map(p => [p.id, p.name, p.role, p.email, p.phone, p.city, p.status, p.createdAt].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff_export_${Date.now()}.csv`;
        a.click();
        showToast("Generating CSV...", "success");
    };

    const openEditModal = (p) => {
        setEditingProfile(p);

        let docs = {};
        if (p.documentsJson) {
            try {
                docs = typeof p.documentsJson === 'string'
                    ? JSON.parse(p.documentsJson)
                    : p.documentsJson;
            } catch (e) {
                docs = {};
            }
        }

        setFormData({
            name: p.name,
            email: p.email,
            phone: p.phone,
            cityId: cities.find(c => c.name === p.city)?.id || '',
            role: p.role,
            specialization: p.specialization || p.role,
            profileImageUrl: p.profileImageUrl,
            documentsJson: docs
        });
    };

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
                    <p>Manage operational staff (nurses, doctors, drivers, caregivers) for booking assignments.</p>
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
                            <h4>1. Add New Staff Member</h4>
                            <p>Click the <strong>[+ Add Staff]</strong> button to create a new staff profile. Fill in name, email, phone, city, and position.</p>
                        </div>
                        <div className="guide-section">
                            <h4>2. Edit Staff Information</h4>
                            <p>Click the <strong>edit icon (✏️)</strong> next to any staff member to update their information or photo.</p>
                        </div>
                        <div className="guide-section">
                            <h4>3. Remove Staff Member</h4>
                            <p>Click the <strong>trash icon (🗑️)</strong> to delete a staff member from the system.</p>
                        </div>
                        <div className="guide-section">
                            <h4>4. Search & Filter</h4>
                            <p>Use the search box to find staff by name. Filter by position to view specific types of staff.</p>
                        </div>
                        <div className="guide-section">
                            <h4>5. Export Data</h4>
                            <p>Click <strong>[Export]</strong> to download staff records as CSV for backup or reporting.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search staff by name or contact..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                        <option value="">All Positions</option>
                        {metadata.specializations?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                            <th>POSITION</th>
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
                                <div style={{ opacity: 0.4 }}>No staff members found. Click [+ Add Staff] to add one.</div>
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
                                <td><span className="role-tag">{p.role}</span></td>
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
                    <div className="modal-content" style={{ maxWidth: 640 }}>
                        <div className="modal-header">
                            <h3>{showAddModal ? 'Add Staff Member' : 'Edit Staff Member'}</h3>
                            <button className="close-btn" onClick={() => { setShowAddModal(false); setEditingProfile(null); }}><X /></button>
                        </div>
                        <form onSubmit={showAddModal ? handleAdd : handleUpdate} className="modal-body">
                            <GCSUpload
                                existingUrl={formData.profileImageUrl}
                                onUploadSuccess={(url) => setFormData({ ...formData, profileImageUrl: url })}
                                label="Profile Photo"
                            />
                            <div className="form-grid">
                                <label>Full Name <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="form-grid">
                                <label>Email <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="form-grid">
                                <label>Phone <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="form-grid">
                                <label>City <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    required
                                    value={formData.cityId || ''}
                                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                                >
                                    <option value="">Select City</option>
                                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-grid">
                                <label>Position <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    required
                                    value={formData.role || ''}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value, specialization: e.target.value })}
                                >
                                    <option value="">Select Position</option>
                                    {OPERATIONAL_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingProfile(null); }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : (showAddModal ? 'Add Staff' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
