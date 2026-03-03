"use client";
import { useState, useEffect } from "react";
import { MapPin, Plus, ToggleLeft, ToggleRight, Edit2, Trash2 } from "lucide-react";
import { cityAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";

export default function CitiesPage() {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCity, setEditingCity] = useState(null);
    const [form, setForm] = useState({ name: '', code: '', stateCode: '', isEnabled: true, isComingSoon: false });

    useEffect(() => { loadCities(); }, []);

    async function loadCities() {
        try {
            setLoading(true);
            const res = await cityAPI.getAll();
            setCities(res.data?.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    function openAdd() {
        setEditingCity(null);
        setForm({ name: '', code: '', stateCode: '', isEnabled: true, isComingSoon: false });
        setShowModal(true);
    }

    function openEdit(city) {
        setEditingCity(city);
        setForm({ name: city.name, code: city.code, stateCode: city.stateCode, isEnabled: city.isEnabled, isComingSoon: city.isComingSoon });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingCity) {
                await cityAPI.update(editingCity.id, form);
                showToast('City updated successfully');
            } else {
                await cityAPI.create(form);
                showToast('City created successfully');
            }
            setShowModal(false);
            loadCities();
        } catch (e) { showToast(e.response?.data?.message || 'Operation failed', 'error'); }
    }

    async function toggleCity(city) {
        try {
            await cityAPI.update(city.id, { isEnabled: !city.isEnabled });
            showToast(`${city.name} ${city.isEnabled ? 'disabled' : 'enabled'}`);
            loadCities();
        } catch (e) { showToast('Toggle failed', 'error'); }
    }

    async function deleteCity(city) {
        if (!confirm(`Delete ${city.name}? This cannot be undone.`)) return;
        try {
            await cityAPI.delete(city.id);
            showToast('City deleted');
            loadCities();
        } catch (e) { showToast(e.response?.data?.message || 'Delete failed', 'error'); }
    }

    if (loading) return <div className="page-header"><h2>Loading Cities...</h2></div>;

    return (
        <div>
            <div className="page-header"><h2>City Management</h2><p>Manage operational cities for Oldful services</p></div>
            <div className="filter-bar"><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add City</button></div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {cities.map(city => (
                    <div key={city.id} className="card" style={{ borderColor: city.isEnabled ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.2)" }}>
                        <div className="card-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={18} /> {city.name}</h3>
                            <span className={`badge ${city.isEnabled ? 'badge-success' : 'badge-default'}`}>{city.isEnabled ? 'Active' : 'Disabled'}</span>
                        </div>
                        <div className="card-body">
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                <div><div className="text-sm text-muted">Code</div><div style={{ fontWeight: 600 }}>{city.code}</div></div>
                                <div><div className="text-sm text-muted">State</div><div style={{ fontWeight: 600 }}>{city.stateCode}</div></div>
                                <div><div className="text-sm text-muted">Users</div><div style={{ fontWeight: 600 }}>{city._count?.users || 0}</div></div>
                                <div><div className="text-sm text-muted">Coming Soon</div><div style={{ fontWeight: 600 }}>{city.isComingSoon ? 'Yes' : 'No'}</div></div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(city)}><Edit2 size={14} /> Edit</button>
                                <button className={`btn btn-sm ${city.isEnabled ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleCity(city)}>
                                    {city.isEnabled ? <><ToggleRight size={14} /> Disable</> : <><ToggleLeft size={14} /> Enable</>}
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => deleteCity(city)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editingCity ? 'Edit' : 'Add'} City</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">City Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Code *</label><input className="form-input" required placeholder="BLR" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                                    <div className="form-group"><label className="form-label">State Code *</label><input className="form-input" required placeholder="KA-29" value={form.stateCode} onChange={e => setForm({ ...form, stateCode: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group flex items-center gap-2"><input type="checkbox" checked={form.isEnabled} onChange={e => setForm({ ...form, isEnabled: e.target.checked })} /><label>Enabled</label></div>
                                    <div className="form-group flex items-center gap-2"><input type="checkbox" checked={form.isComingSoon} onChange={e => setForm({ ...form, isComingSoon: e.target.checked })} /><label>Coming Soon</label></div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editingCity ? 'Update' : 'Create'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
