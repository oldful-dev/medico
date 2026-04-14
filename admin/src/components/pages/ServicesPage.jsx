"use client";
import { useState, useEffect } from "react";
import { Settings, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Edit2, Plus, Trash2 } from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function ServicesPage({ filterType }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            let res = await serviceAPI.getAll();
            let svc = res.data?.data || [];
            if (filterType) {
                svc = svc.filter(s => s.serviceType === filterType);
            }
            setServices(svc.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [filterType]);

    useEffect(() => { loadServices(); }, [loadServices]);

    async function toggleService(id) {
        try {
            await serviceAPI.toggle(id);
            showToast('Service toggled');
            loadServices();
        } catch (e) { showToast('Toggle failed', 'error'); }
    }

    async function moveService(index, dir) {
        const newList = [...services];
        const target = index + dir;
        if (target < 0 || target >= newList.length) return;
        [newList[index], newList[target]] = [newList[target], newList[index]];
        const orders = newList.map((s, i) => ({ id: s.id, sortOrder: i + 1 }));
        try {
            await serviceAPI.reorder({ orders });
            setServices(newList.map((s, i) => ({ ...s, sortOrder: i + 1 })));
        } catch (e) { showToast('Reorder failed', 'error'); }
    }

    function openEdit(service) {
        setEditingService({ ...service, formFieldsJson: service.formFieldsJson ? JSON.stringify(service.formFieldsJson, null, 2) : '' });
        setShowModal(true);
    }

    function openAdd() {
        setEditingService({ name: '', slug: '', icon: '', tagline: '', description: '', pricingText: '', heroImageUrl: '', route: '', serviceType: 'DOCTOR_HOME_VISIT', formFieldsJson: '', sortOrder: services.length + 1, isEnabled: true });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        const data = { ...editingService };
        try { data.formFieldsJson = data.formFieldsJson ? JSON.parse(data.formFieldsJson) : null; }
        catch { showToast('Invalid JSON in form fields', 'error'); return; }

        try {
            if (data.id) {
                await serviceAPI.update(data.id, data);
                showToast('Service updated');
            } else {
                await serviceAPI.create(data);
                showToast('Service created');
            }
            setShowModal(false);
            loadServices();
        } catch (e) { showToast(e.response?.data?.message || 'Save failed', 'error'); }
    }

    async function deleteService(id) {
        if (!confirm('Delete this service?')) return;
        try {
            await serviceAPI.delete(id);
            showToast('Service deleted');
            loadServices();
        } catch (e) { showToast('Delete failed', 'error'); }
    }

    if (loading) return <div className="page-header"><h2>Loading Services...</h2></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Service Management</h2>
                <p>Server-driven UI — Everything is dynamic and editable from here</p>
            </div>
            <div className="filter-bar">
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Service</button>
            </div>

            <div className="card">
                <div className="card-header"><h3>All Services ({services.length})</h3></div>
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Order</th><th>Icon</th><th>Service Name</th><th>Tagline</th><th>Pricing Text</th><th>Route</th><th>Type</th><th>Enabled</th><th>Actions</th></tr></thead>
                        <tbody>
                            {services.map((s, index) => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <span>{s.sortOrder}</span>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                <button className="btn btn-sm btn-secondary" style={{ padding: "2px 4px" }} onClick={() => moveService(index, -1)}><ArrowUp size={12} /></button>
                                                <button className="btn btn-sm btn-secondary" style={{ padding: "2px 4px" }} onClick={() => moveService(index, 1)}><ArrowDown size={12} /></button>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 24 }}>{s.icon || "—"}</td>
                                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                                    <td className="text-sm">{s.tagline || '—'}</td>
                                    <td><span className="badge badge-success">{s.pricingText || '—'}</span></td>
                                    <td className="text-sm">{s.route || '—'}</td>
                                    <td className="text-sm">{s.serviceType?.replace(/_/g, ' ')}</td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" onClick={() => toggleService(s.id)}>
                                            {s.isEnabled ? <ToggleRight size={18} color="#10b981" /> : <ToggleLeft size={18} color="#64748b" />}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-primary" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => deleteService(s.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && editingService && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header"><h3>{editingService.id ? 'Edit' : 'Add'} Service</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Slug *</label><input className="form-input" required value={editingService.slug} onChange={e => setEditingService({ ...editingService, slug: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Icon (emoji/URL)</label><input className="form-input" value={editingService.icon || ''} onChange={e => setEditingService({ ...editingService, icon: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Route</label><input className="form-input" value={editingService.route || ''} onChange={e => setEditingService({ ...editingService, route: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Tagline</label><input className="form-input" value={editingService.tagline || ''} onChange={e => setEditingService({ ...editingService, tagline: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={editingService.description || ''} onChange={e => setEditingService({ ...editingService, description: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Pricing Text</label><input className="form-input" placeholder="₹799 / visit" value={editingService.pricingText || ''} onChange={e => setEditingService({ ...editingService, pricingText: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Service Type</label>
                                        <select className="form-select" value={editingService.serviceType} onChange={e => setEditingService({ ...editingService, serviceType: e.target.value })}>
                                            {['DOCTOR_HOME_VISIT', 'HOSPITAL_TRIP', 'HOME_NURSE', 'INSURANCE', 'BLOOD_TEST', 'MEDICINES', 'PHYSIO_FITNESS', 'EQUIPMENT_RENTAL', 'HOME_ESSENTIALS', 'CLUB_EVENTS', 'TIFFIN', 'TECH_HELPER', 'PAPERWORK_LEGAL'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Hero Image URL</label><input className="form-input" value={editingService.heroImageUrl || ''} onChange={e => setEditingService({ ...editingService, heroImageUrl: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Form Fields (JSON)</label><textarea className="form-input" rows={5} style={{ fontFamily: 'monospace', fontSize: 12 }} value={editingService.formFieldsJson || ''} onChange={e => setEditingService({ ...editingService, formFieldsJson: e.target.value })} placeholder='[{"label":"Symptoms","type":"text","required":true}]' /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
