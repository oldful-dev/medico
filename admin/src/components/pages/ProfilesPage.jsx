"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
    Search, Filter, Plus, 
    CheckCircle2, AlertCircle, Clock, Trash2, Edit2, X, Shield, HeartPulse, User, Download, Save, ChevronDown, ChevronUp, Users
} from "lucide-react";
import { profilesAPI, cityAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";
import GCSUpload from "@/components/GCSUpload";

const TABS = [
    { id: 'management', label: 'Management', icon: Shield },
    { id: 'doctor', label: 'Doctors', icon: HeartPulse },
    { id: 'nurse', label: 'Nurses', icon: HeartPulse },
    { id: 'caregiver', label: 'Caregivers', icon: User },
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
    const [editingProfile, setEditingProfile] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

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
                    <button className="btn-secondary" onClick={handleExport}>
                        <Download size={18} /> Export
                    </button>
                    <button className="btn-primary" onClick={() => { setFormData({ cityId: cities[0]?.id }); setShowAddModal(true); }}>
                        <Plus size={20} /> Add Staff
                    </button>
                </div>
            </header>

            {/* TAB SELECTOR */}
            <div className="tabs-grid">
                {TABS.map(tab => (
                    <button 
                        key={tab.id}
                        className={`tab-card ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab.id); setPage(1); setSpecialization(""); }}
                    >
                        <div className="tab-icon"><tab.icon size={20} /></div>
                        <span className="tab-label">{tab.label}</span>
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
                                    <input type="password" placeholder="Default: Medico@123" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
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

            <style jsx>{`
                .profiles-page { padding: 40px; background: #0B1120; min-height: 100vh; color: #FFFFFF; font-family: 'Poppins', sans-serif; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
                .title-group h1 { font-size: 32px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .title-group p { color: #64748B; margin: 4px 0 0; font-size: 14px; }

                .header-actions { display: flex; gap: 12px; }
                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-primary { background: #10B981; color: white; }
                .btn-primary:hover { background: #059669; transform: translateY(-2px); }
                .btn-secondary { background: #1E293B; border: 1px solid #334155; color: white; }
                .btn-secondary:hover { background: #334155; }

                .tabs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
                .tab-card { background: #1E293B; border: 1px solid #334155; padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: 0.3s; color: #94A3B8; text-align: left; }
                .tab-card:hover { border-color: rgba(16, 185, 129, 0.4); background: #24243a; }
                .tab-card.active { border-color: #10B981; background: #0F172A; color: white; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1); }
                .tab-icon { width: 44px; height: 44px; border-radius: 12px; background: #334155; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
                .active .tab-icon { background: #10B981; color: white; }
                .tab-label { font-weight: 700; font-size: 16px; }

                .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .search-box { position: relative; width: 400px; }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748B; }
                .search-box input { width: 100%; padding: 12px 16px 12px 48px; background: #1E293B; border: 1px solid #334155; border-radius: 12px; color: white; outline: none; }
                .search-box input:focus { border-color: #10B981; }

                .filter-group { display: flex; align-items: center; gap: 20px; }
                .filter-group select { background: #1E293B; border: 1px solid #334155; color: white; padding: 10px 16px; border-radius: 10px; outline: none; font-weight: 600; cursor: pointer; }
                .count-label { font-size: 13px; color: #64748B; }
                .count-label b { color: white; font-size: 16px; margin-left: 4px; }

                .main-card { background: #1E293B; border: 1px solid #334155; border-radius: 20px; overflow: hidden; }
                .staff-table { width: 100%; border-collapse: collapse; text-align: left; }
                .staff-table th { padding: 18px 24px; font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; cursor: default; }
                .staff-table th.sortable { cursor: pointer; }
                .staff-table th.sortable:hover { color: #10B981; }
                .staff-table td { padding: 16px 24px; border-bottom: 1px solid rgba(51, 65, 85, 0.4); vertical-align: middle; }
                .staff-table tr:hover { background: #0F172A; }

                .staff-info { display: flex; align-items: center; gap: 12px; }
                .avatar { width: 42px; height: 42px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; overflow: hidden; }
                .avatar img { width: 100%; height: 100%; object-fit: cover; }
                .name { font-weight: 700; font-size: 15px; color: white; }
                .id { font-size: 10px; color: #64748B; font-weight: 800; }

                .role-tag { padding: 4px 10px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; font-size: 11px; font-weight: 800; color: #CBD5E1; border: 1px solid rgba(255, 255, 255, 0.1); }
                .status-pill { padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; display: inline-block; }
                .status-active { background: rgba(16, 185, 129, 0.1); color: #10B981; }
                .status-busy { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
                .status-pending { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
                .status-inactive { background: rgba(239, 68, 68, 0.1); color: #EF4444; }

                .contact-info { line-height: 1.4; font-size: 13px; font-weight: 600; }
                .email { font-size: 11px; color: #64748B; }

                .actions { display: flex; gap: 8px; }
                .icon-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #334155; background: #0F172A; color: #94A3B8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .icon-btn:hover { border-color: #10B981; color: #10B981; }

                .pagination { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; background: #0F172A; font-size: 13px; color: #64748B; }
                .pg-controls { display: flex; align-items: center; gap: 16px; }
                .pg-controls button { padding: 6px 14px; background: #1E293B; border: 1px solid #334155; color: white; border-radius: 8px; cursor: pointer; font-weight: 700; }
                .pg-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
                .pg-controls span { font-weight: 800; color: white; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
                .modal-content { background: #1E293B; border: 1px solid #334155; width: 100%; max-width: 550px; border-radius: 20px; overflow: hidden; animation: slideUp 0.3s ease-out; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .modal-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
                .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: white; }
                .close-btn { background: none; border: none; color: #64748B; cursor: pointer; }
                .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .form-group label { display: block; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px; }
                .form-group input, .form-group select { width: 100%; padding: 12px; background: #0F172A; border: 1px solid #334155; border-radius: 10px; color: white; outline: none; }
                .form-row { display: flex; gap: 16px; }
                .flex-1 { flex: 1; }
                .modal-footer { display: flex; gap: 12px; margin-top: 12px; }
                .modal-footer button { flex: 1; }
            `}</style>
        </div>
    );
}
