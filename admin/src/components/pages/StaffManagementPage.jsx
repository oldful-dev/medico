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

    const REQUIRED_DOCS = [
        { key: 'aadhaarUrl', label: 'Aadhaar Card' },
        { key: 'panUrl', label: 'PAN Card' },
        { key: 'policeVerificationUrl', label: 'Police Verification Certificate' },
        { key: 'certificationUrl', label: 'Professional Certification' },
    ];

    const validateComplianceDocs = () => {
        const docs = formData.documentsJson || {};
        const missing = REQUIRED_DOCS.filter(d => !docs[d.key]);
        if (missing.length > 0) {
            showToast(`Missing required documents: ${missing.map(d => d.label).join(', ')}`, "error");
            return false;
        }
        return true;
    };

    // ── Handlers ───────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!validateComplianceDocs()) return;
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
        if (!validateComplianceDocs()) return;
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
                            <div className="form-group">
                                <label>Full Name <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="form-group">
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
                            <div className="form-group">
                                <label>Position <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    required
                                    value={OPERATIONAL_POSITIONS.includes(formData.role) ? formData.role : (formData.role ? 'Other Operational Role' : '')}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value === 'Other Operational Role' ? '' : e.target.value, specialization: e.target.value === 'Other Operational Role' ? '' : e.target.value })}
                                >
                                    <option value="">Select Position</option>
                                    {OPERATIONAL_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                    <option value="Other Operational Role">Other Operational Role (specify)</option>
                                </select>
                                {!OPERATIONAL_POSITIONS.includes(formData.role) && formData.role !== undefined && (
                                    <input
                                        type="text"
                                        style={{ marginTop: 8 }}
                                        required
                                        placeholder="Enter operational position"
                                        value={formData.role || ''}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value, specialization: e.target.value })}
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label style={{ marginBottom: 0 }}>Compliance Documents <span style={{ color: 'red' }}>*</span></label>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 12px' }}>Internal only — never shown on the public website.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <GCSUpload
                                        folder="staff-compliance"
                                        existingUrl={formData.documentsJson?.aadhaarUrl}
                                        onUploadSuccess={(url) => setFormData({ ...formData, documentsJson: { ...formData.documentsJson, aadhaarUrl: url } })}
                                        label="Aadhaar Card"
                                    />
                                    <GCSUpload
                                        folder="staff-compliance"
                                        existingUrl={formData.documentsJson?.panUrl}
                                        onUploadSuccess={(url) => setFormData({ ...formData, documentsJson: { ...formData.documentsJson, panUrl: url } })}
                                        label="PAN Card"
                                    />
                                    <GCSUpload
                                        folder="staff-compliance"
                                        existingUrl={formData.documentsJson?.policeVerificationUrl}
                                        onUploadSuccess={(url) => setFormData({ ...formData, documentsJson: { ...formData.documentsJson, policeVerificationUrl: url } })}
                                        label="Police Verification Certificate"
                                    />
                                    <GCSUpload
                                        folder="staff-compliance"
                                        existingUrl={formData.documentsJson?.certificationUrl}
                                        onUploadSuccess={(url) => setFormData({ ...formData, documentsJson: { ...formData.documentsJson, certificationUrl: url } })}
                                        label="Professional Certification"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
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

            <style jsx>{`
                .profiles-page { color: var(--text-primary); font-family: var(--font-primary); }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
                .title-group h1 { font-size: 32px; font-weight: 800; margin: 0; color: var(--text-primary); }
                .title-group p { color: var(--text-muted); margin: 4px 0 0; font-size: 14px; }

                .guide-card { background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.1) 100%); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; margin-bottom: 32px; }
                .guide-header { padding: 16px 20px; border-bottom: 1px solid rgba(99,102,241,0.2); display: flex; justify-content: space-between; align-items: center; }
                .guide-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
                .guide-content { padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                .guide-section h4 { margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; }
                .guide-section p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

                .header-actions { display: flex; gap: 12px; }
                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; border: none; cursor: pointer; transition: var(--transition-base); }
                .btn-primary { background: var(--gradient-primary); color: white; box-shadow: var(--shadow-md); }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); opacity: 0.9; }
                .btn-secondary { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); }
                .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--accent-primary); }

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
                .modal-footer { display: flex; gap: 12px; padding: 0 24px 24px; position: sticky; bottom: 0; background: var(--bg-card); z-index: 10; }
                .modal-footer button { flex: 1; margin: 0; }

                @media (max-width: 600px) {
                    .modal-content { max-height: 95vh; }
                    .modal-body { padding: 20px; gap: 16px; }
                }
            `}</style>
        </div>
    );
}
