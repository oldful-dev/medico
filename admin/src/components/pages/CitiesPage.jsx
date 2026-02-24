"use client";
import { useState } from "react";
import { MapPin, Plus, Edit2, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight, DollarSign } from "lucide-react";

const cities = [
    { id: 1, name: "Bangalore", code: "BLR", status: "Active", users: 12400, revenue: "₹18.5L", comingSoon: false },
    { id: 2, name: "Hyderabad", code: "HYD", status: "Active", users: 8900, revenue: "₹12.2L", comingSoon: false },
    { id: 3, name: "Chennai", code: "CHN", status: "Active", users: 6200, revenue: "₹8.7L", comingSoon: false },
    { id: 4, name: "Mumbai", code: "MUM", status: "Active", users: 4100, revenue: "₹6.1L", comingSoon: false },
    { id: 5, name: "Delhi", code: "DEL", status: "Active", users: 3500, revenue: "₹4.8L", comingSoon: false },
    { id: 6, name: "Pune", code: "PUN", status: "Coming Soon", users: 0, revenue: "—", comingSoon: true },
    { id: 7, name: "Kolkata", code: "KOL", status: "Disabled", users: 0, revenue: "—", comingSoon: false },
];

export default function CitiesPage() {
    const [showModal, setShowModal] = useState(false);
    const [cityList, setCityList] = useState(cities);

    const toggleCity = (id) => {
        setCityList(cityList.map(c => c.id === id ? { ...c, status: c.status === "Active" ? "Disabled" : "Active" } : c));
    };

    return (
        <div>
            <div className="page-header">
                <h2>City Management</h2>
                <p>Manage operational cities, codes, and status</p>
            </div>

            <div className="filter-bar">
                <select className="form-select" style={{ width: 160 }}>
                    <option>All Status</option><option>Active</option><option>Disabled</option><option>Coming Soon</option>
                </select>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add City
                </button>
            </div>

            <div className="stats-grid">
                {cityList.map((city) => (
                    <div key={city.id} className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon" style={{
                                background: city.status === "Active" ? "var(--gradient-success)" :
                                    city.status === "Coming Soon" ? "var(--gradient-warning)" : "var(--bg-tertiary)"
                            }}>
                                <MapPin size={20} />
                            </div>
                            <span className={`badge ${city.status === "Active" ? "badge-success" : city.status === "Coming Soon" ? "badge-warning" : "badge-default"}`}>
                                {city.status}
                            </span>
                        </div>
                        <div className="stat-card-value" style={{ fontSize: 22 }}>{city.name}</div>
                        <div className="stat-card-label mb-4">Code: {city.code}</div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted">Users</span>
                            <span className="text-sm font-bold">{city.users.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-muted">Revenue</span>
                            <span className="text-sm font-bold">{city.revenue}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-sm btn-secondary" style={{ flex: 1 }}><Edit2 size={14} /> Edit</button>
                            <button className={`btn btn-sm ${city.status === "Active" ? "btn-danger" : "btn-success"}`} style={{ flex: 1 }} onClick={() => toggleCity(city.id)}>
                                {city.status === "Active" ? <><EyeOff size={14} /> Disable</> : <><Eye size={14} /> Enable</>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New City</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City Name</label>
                                    <input className="form-input" placeholder="e.g. Jaipur" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City Code</label>
                                    <input className="form-input" placeholder="e.g. JAI" maxLength={3} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Initial Status</label>
                                <select className="form-select">
                                    <option>Coming Soon</option><option>Active</option><option>Disabled</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    Show "Coming Soon" Page
                                    <label className="toggle-switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary">Add City</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
