"use client";
import { useState } from "react";
import { Shield, Plus, Edit2, Trash2, Eye, EyeOff, Search, ChevronDown, Clock } from "lucide-react";

const roles = [
    { id: 1, name: "Super Admin", users: 2, permissions: "Full Access", color: "#ef4444" },
    { id: 2, name: "City Admin", users: 8, permissions: "City-restricted CRUD", color: "#f59e0b" },
    { id: 3, name: "Care Manager", users: 15, permissions: "Bookings, Caregivers, Users", color: "#06b6d4" },
    { id: 4, name: "Support Agent", users: 12, permissions: "Tickets, Users (Read)", color: "#10b981" },
    { id: 5, name: "Billing Executive", users: 5, permissions: "Payments, Invoices, Plans", color: "#8b5cf6" },
];

const admins = [
    { id: 1, name: "Arun Kumar", email: "arun@medico.in", role: "Super Admin", city: "All", status: "Active", lastLogin: "2 hours ago" },
    { id: 2, name: "Priya Sharma", email: "priya@medico.in", role: "City Admin", city: "Bangalore", status: "Active", lastLogin: "30 min ago" },
    { id: 3, name: "Rajesh Nair", email: "rajesh@medico.in", role: "City Admin", city: "Hyderabad", status: "Active", lastLogin: "1 hour ago" },
    { id: 4, name: "Sunita Menon", email: "sunita@medico.in", role: "Care Manager", city: "Chennai", status: "Active", lastLogin: "4 hours ago" },
    { id: 5, name: "Vikram Singh", email: "vikram@medico.in", role: "Support Agent", city: "Mumbai", status: "Inactive", lastLogin: "3 days ago" },
    { id: 6, name: "Deepa Rao", email: "deepa@medico.in", role: "Billing Executive", city: "Bangalore", status: "Active", lastLogin: "1 hour ago" },
];

const auditLogs = [
    { time: "10:32 AM", admin: "Arun Kumar", action: "Updated pricing for Doctor Home Visit", type: "Pricing" },
    { time: "10:15 AM", admin: "Priya Sharma", action: "Created new caregiver profile - Nurse Lakshmi", type: "Caregiver" },
    { time: "09:48 AM", admin: "Rajesh Nair", action: "Changed city status for Delhi to Active", type: "City" },
    { time: "09:30 AM", admin: "Arun Kumar", action: "Modified Terms & Conditions v2.3", type: "Legal" },
    { time: "09:12 AM", admin: "Deepa Rao", action: "Processed refund ₹2,500 for Booking #4521", type: "Payment" },
];

const permissionModules = [
    "Dashboard", "Users", "Bookings", "Services", "Cities", "Caregivers",
    "Plans", "Pricing", "Payments", "SOS", "Notifications", "Legal",
    "Store", "Media", "Reports", "Audit Logs", "Server UI", "Support"
];

export default function RolesPage() {
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState("admins");

    return (
        <div>
            <div className="page-header">
                <h2>Role & Access Management (RBAC)</h2>
                <p>Manage admin users, roles, permissions, and audit trails</p>
            </div>

            <div className="tabs mb-6">
                {["admins", "roles", "permissions", "audit"].map((t) => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === "roles" && (
                <div className="stats-grid">
                    {roles.map((role) => (
                        <div key={role.id} className="stat-card">
                            <div className="stat-card-header">
                                <div className="stat-card-icon" style={{ background: role.color }}><Shield size={20} /></div>
                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button>
                                    <button className="btn btn-sm btn-secondary"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div className="stat-card-value" style={{ fontSize: 20 }}>{role.name}</div>
                            <div className="stat-card-label">{role.users} users • {role.permissions}</div>
                        </div>
                    ))}
                    <div className="stat-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed var(--border-color)" }}>
                        <div style={{ textAlign: "center" }}>
                            <Plus size={32} color="var(--text-muted)" />
                            <div className="stat-card-label mt-2">Add New Role</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "admins" && (
                <>
                    <div className="filter-bar">
                        <div className="header-search">
                            <Search size={16} />
                            <input type="text" placeholder="Search admins..." className="form-input" style={{ paddingLeft: 36 }} />
                        </div>
                        <select className="form-select" style={{ width: 160 }}>
                            <option>All Roles</option>
                            {roles.map((r) => <option key={r.id}>{r.name}</option>)}
                        </select>
                        <select className="form-select" style={{ width: 160 }}>
                            <option>All Cities</option>
                            <option>Bangalore</option><option>Hyderabad</option><option>Chennai</option><option>Mumbai</option>
                        </select>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Add Admin
                        </button>
                    </div>

                    <div className="card">
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Status</th><th>Last Login</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map((admin) => (
                                        <tr key={admin.id}>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{admin.name}</td>
                                            <td>{admin.email}</td>
                                            <td><span className="badge badge-purple">{admin.role}</span></td>
                                            <td>{admin.city}</td>
                                            <td><span className={`badge ${admin.status === "Active" ? "badge-success" : "badge-default"}`}>{admin.status}</span></td>
                                            <td><span className="text-muted text-sm">{admin.lastLogin}</span></td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === "permissions" && (
                <div className="card">
                    <div className="card-header">
                        <h3>Permission Matrix</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Module</th>
                                    {roles.map((r) => <th key={r.id}>{r.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {permissionModules.map((mod, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{mod}</td>
                                        {roles.map((r) => (
                                            <td key={r.id}>
                                                <div className="flex gap-2">
                                                    {["C", "R", "U", "D"].map((p) => (
                                                        <label key={p} className="toggle-switch" style={{ width: "auto" }}>
                                                            <input type="checkbox" defaultChecked={r.name === "Super Admin" || (Math.random() > 0.3)} />
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                                                                background: "var(--bg-glass)", color: "var(--text-muted)",
                                                                cursor: "pointer"
                                                            }}>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "audit" && (
                <div className="card">
                    <div className="card-header">
                        <h3>Audit Logs</h3>
                        <button className="btn btn-secondary btn-sm">Export Logs</button>
                    </div>
                    <div className="card-body">
                        <div className="timeline">
                            {auditLogs.map((log, i) => (
                                <div key={i} className="timeline-item">
                                    <h5>{log.action}</h5>
                                    <p>By {log.admin} • <span className="badge badge-info">{log.type}</span></p>
                                    <time>{log.time}</time>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Admin</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-input" placeholder="Enter full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" placeholder="email@medico.in" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-select">
                                        {roles.map((r) => <option key={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City Restriction</label>
                                    <select className="form-select">
                                        <option>All Cities</option>
                                        <option>Bangalore</option><option>Hyderabad</option><option>Chennai</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Temporary Password</label>
                                <input type="password" className="form-input" placeholder="Min 8 characters" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary">Create Admin</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
