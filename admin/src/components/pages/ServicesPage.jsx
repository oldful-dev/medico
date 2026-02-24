"use client";
import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, Image, ArrowUp, ArrowDown, Settings, ExternalLink } from "lucide-react";

const servicesData = [
    { id: 1, name: "Doctor Home Visit", icon: "🩺", tagline: "Expert doctors at your doorstep", sortOrder: 1, enabled: true, route: "/services/doctor-visit", pricing: "₹799 / visit", heroImage: true, formFields: 4 },
    { id: 2, name: "Hospital Trip", icon: "🏥", tagline: "Safe & comfortable hospital trips", sortOrder: 2, enabled: true, route: "/services/hospital-trip", pricing: "₹499 / trip", heroImage: true, formFields: 3 },
    { id: 3, name: "Home Nurse", icon: "👩‍⚕️", tagline: "Professional nursing care at home", sortOrder: 3, enabled: true, route: "/services/home-nurse", pricing: "₹1,299 / day", heroImage: true, formFields: 5 },
    { id: 4, name: "Insurance", icon: "🛡️", tagline: "Comprehensive health insurance plans", sortOrder: 4, enabled: true, route: "/services/insurance", pricing: "From ₹199/mo", heroImage: true, formFields: 6 },
    { id: 5, name: "Blood Test", icon: "🩸", tagline: "Lab tests at home, reports online", sortOrder: 5, enabled: true, route: "/services/blood-test", pricing: "₹299 / test", heroImage: true, formFields: 3 },
    { id: 6, name: "Medicines", icon: "💊", tagline: "Doorstep medicine delivery", sortOrder: 6, enabled: true, route: "/services/medicines", pricing: "As per MRP", heroImage: false, formFields: 2 },
    { id: 7, name: "Physio & Fitness", icon: "🏋️", tagline: "Personalized physiotherapy sessions", sortOrder: 7, enabled: true, route: "/services/physio", pricing: "₹699 / session", heroImage: true, formFields: 4 },
    { id: 8, name: "Equipment Rental", icon: "🦽", tagline: "Medical equipment on rent", sortOrder: 8, enabled: true, route: "/services/equipment", pricing: "From ₹99/day", heroImage: false, formFields: 3 },
    { id: 9, name: "Home Essentials", icon: "🏠", tagline: "Daily essentials delivered", sortOrder: 9, enabled: false, route: "/services/essentials", pricing: "Varies", heroImage: false, formFields: 2 },
    { id: 10, name: "Club & Events", icon: "🎭", tagline: "Social clubs & wellness events", sortOrder: 10, enabled: true, route: "/services/events", pricing: "₹199 / event", heroImage: true, formFields: 4 },
    { id: 11, name: "Tiffin", icon: "🍱", tagline: "Healthy meals for seniors", sortOrder: 11, enabled: true, route: "/services/tiffin", pricing: "₹149 / meal", heroImage: true, formFields: 3 },
    { id: 12, name: "Tech Helper", icon: "💻", tagline: "Technology assistance for seniors", sortOrder: 12, enabled: true, route: "/services/tech-helper", pricing: "₹399 / visit", heroImage: false, formFields: 3 },
    { id: 13, name: "Paperwork & Legal", icon: "📋", tagline: "Legal & paperwork assistance", sortOrder: 13, enabled: false, route: "/services/legal-help", pricing: "From ₹999", heroImage: false, formFields: 5 },
];

const customFields = [
    { id: 1, label: "Preferred Date", type: "date", required: true },
    { id: 2, label: "Preferred Time Slot", type: "select", required: true },
    { id: 3, label: "Special Instructions", type: "textarea", required: false },
    { id: 4, label: "Number of Patients", type: "number", required: true },
];

export default function ServicesPage() {
    const [services, setServices] = useState(servicesData);
    const [editingService, setEditingService] = useState(null);
    const [showFormEditor, setShowFormEditor] = useState(false);

    const toggleService = (id) => {
        setServices(services.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    const moveService = (id, direction) => {
        const idx = services.findIndex(s => s.id === id);
        if ((direction === -1 && idx === 0) || (direction === 1 && idx === services.length - 1)) return;
        const newServices = [...services];
        const temp = newServices[idx];
        newServices[idx] = newServices[idx + direction];
        newServices[idx + direction] = temp;
        newServices.forEach((s, i) => s.sortOrder = i + 1);
        setServices(newServices);
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2>Service Management</h2>
                        <p>Server-driven UI — Everything is dynamic and editable from here</p>
                    </div>
                    <span className="badge badge-danger" style={{ fontSize: 13, padding: "6px 14px" }}>⚠️ Most Critical Module</span>
                </div>
            </div>

            <div className="card mb-6">
                <div className="card-header">
                    <h3>All Services ({services.length})</h3>
                    <button className="btn btn-primary"><Plus size={16} /> Add Service</button>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}></th>
                                <th>Order</th>
                                <th>Icon</th>
                                <th>Service Name</th>
                                <th>Tagline</th>
                                <th>Pricing Text</th>
                                <th>Route</th>
                                <th>Hero Image</th>
                                <th>Form Fields</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr key={service.id} style={{ opacity: service.enabled ? 1 : 0.5 }}>
                                    <td><GripVertical size={16} className="drag-handle" /></td>
                                    <td>
                                        <div className="flex gap-2 items-center">
                                            <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{service.sortOrder}</span>
                                            <div className="flex flex-col gap-1" style={{ gap: 2 }}>
                                                <button className="btn btn-sm btn-secondary btn-icon" style={{ width: 22, height: 22 }} onClick={() => moveService(service.id, -1)}><ArrowUp size={12} /></button>
                                                <button className="btn btn-sm btn-secondary btn-icon" style={{ width: 22, height: 22 }} onClick={() => moveService(service.id, 1)}><ArrowDown size={12} /></button>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 24 }}>{service.icon}</td>
                                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{service.name}</td>
                                    <td className="text-sm">{service.tagline}</td>
                                    <td><span className="badge badge-info">{service.pricing}</span></td>
                                    <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{service.route}</code></td>
                                    <td>{service.heroImage ? <span className="badge badge-success">✓</span> : <span className="badge badge-default">—</span>}</td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" onClick={() => setShowFormEditor(true)}>{service.formFields} fields</button>
                                    </td>
                                    <td>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={service.enabled} onChange={() => toggleService(service.id)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => setEditingService(service)}><Edit2 size={14} /></button>
                                            <button className="btn btn-sm btn-secondary"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Service Modal */}
            {editingService && (
                <div className="modal-overlay" onClick={() => setEditingService(null)}>
                    <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Service: {editingService.name}</h3>
                            <button onClick={() => setEditingService(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Service Label</label>
                                    <input className="form-input" defaultValue={editingService.name} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Icon (Emoji / URL)</label>
                                    <input className="form-input" defaultValue={editingService.icon} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tagline</label>
                                <input className="form-input" defaultValue={editingService.tagline} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Pricing Text</label>
                                    <input className="form-input" defaultValue={editingService.pricing} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Redirect Route</label>
                                    <input className="form-input" defaultValue={editingService.route} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Sort Order</label>
                                    <input className="form-input" type="number" defaultValue={editingService.sortOrder} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" defaultValue={editingService.enabled ? "enabled" : "disabled"}>
                                        <option value="enabled">Enabled</option>
                                        <option value="disabled">Disabled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hero Image</label>
                                <div style={{ border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)", padding: 32, textAlign: "center" }}>
                                    <Image size={32} color="var(--text-muted)" />
                                    <p className="text-sm text-muted mt-2">Click to upload or drag & drop</p>
                                    <p className="text-xs text-muted">PNG, JPG up to 5MB</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingService(null)}>Cancel</button>
                            <button className="btn btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Fields Editor */}
            {showFormEditor && (
                <div className="modal-overlay" onClick={() => setShowFormEditor(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Custom Form Fields</h3>
                            <button onClick={() => setShowFormEditor(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            {customFields.map((field) => (
                                <div key={field.id} style={{
                                    display: "flex", alignItems: "center", gap: 12, padding: 12,
                                    background: "var(--bg-glass)", borderRadius: "var(--radius-md)", marginBottom: 8,
                                    border: "1px solid var(--border-color)"
                                }}>
                                    <GripVertical size={16} className="drag-handle" />
                                    <input className="form-input" defaultValue={field.label} style={{ flex: 1 }} />
                                    <select className="form-select" defaultValue={field.type} style={{ width: 120 }}>
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="select">Select</option>
                                        <option value="textarea">Textarea</option>
                                        <option value="file">File Upload</option>
                                    </select>
                                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                        <input type="checkbox" defaultChecked={field.required} /> Required
                                    </label>
                                    <button className="btn btn-sm btn-secondary"><Trash2 size={14} /></button>
                                </div>
                            ))}
                            <button className="btn btn-secondary mt-4"><Plus size={16} /> Add Field</button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowFormEditor(false)}>Cancel</button>
                            <button className="btn btn-primary">Save Fields</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
