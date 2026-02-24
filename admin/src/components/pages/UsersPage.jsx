"use client";
import { useState } from "react";
import { Search, Filter, Edit2, Trash2, Lock, Unlock, Eye, AlertTriangle, FileText, Phone, UserX, UserCheck } from "lucide-react";

const users = [
    { id: "MED-BLR-00001", name: "Rajesh Kumar", city: "Bangalore", plan: "Yearly Premium", healthTag: "Diabetic", status: "Active", phone: "+91 98765 43210", age: 72 },
    { id: "MED-BLR-00002", name: "Anita Sharma", city: "Bangalore", plan: "Quarterly Basic", healthTag: "Hypertension", status: "Active", phone: "+91 87654 32109", age: 68 },
    { id: "MED-HYD-00003", name: "Venkat Reddy", city: "Hyderabad", plan: "Biannual Care+", healthTag: "Normal", status: "Active", phone: "+91 76543 21098", age: 75 },
    { id: "MED-CHN-00004", name: "Priya Menon", city: "Chennai", plan: "Yearly Premium", healthTag: "Cardiac", status: "Suspended", phone: "+91 65432 10987", age: 65 },
    { id: "MED-MUM-00005", name: "Suresh Patel", city: "Mumbai", plan: "Quarterly Basic", healthTag: "Normal", status: "Active", phone: "+91 54321 09876", age: 80 },
    { id: "MED-BLR-00006", name: "Lakshmi Devi", city: "Bangalore", plan: "Yearly Premium", healthTag: "Diabetic", status: "Active", phone: "+91 43210 98765", age: 70 },
    { id: "MED-DEL-00007", name: "Amit Verma", city: "Delhi", plan: "Biannual Care+", healthTag: "Hypertension", status: "Blocked", phone: "+91 32109 87654", age: 62 },
];

const healthFlags = [
    { user: "Rajesh Kumar", flag: "High Sugar (Blood Glucose: 320 mg/dL)", severity: "Critical", date: "Feb 22, 2026" },
    { user: "Anita Sharma", flag: "Elevated BP (180/110 mmHg)", severity: "High", date: "Feb 21, 2026" },
    { user: "Lakshmi Devi", flag: "High HbA1c (9.2%)", severity: "Critical", date: "Feb 20, 2026" },
];

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [selectedUser, setSelectedUser] = useState(null);

    return (
        <div>
            <div className="page-header">
                <h2>User Management</h2>
                <p>View, edit, and manage all registered users and their health data</p>
            </div>

            <div className="tabs mb-6">
                {["all", "health-flags", "medical-cards"].map((t) => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t === "all" ? "All Users" : t === "health-flags" ? "OCR Health Flags" : "Medical Cards"}
                    </button>
                ))}
            </div>

            {activeTab === "all" && (
                <>
                    <div className="filter-bar">
                        <input className="form-input" placeholder="Search by name, ID, phone..." style={{ maxWidth: 280 }} />
                        <select className="form-select" style={{ width: 150 }}>
                            <option>All Cities</option><option>Bangalore</option><option>Hyderabad</option><option>Chennai</option><option>Mumbai</option><option>Delhi</option>
                        </select>
                        <select className="form-select" style={{ width: 150 }}>
                            <option>All Plans</option><option>Yearly Premium</option><option>Quarterly Basic</option><option>Biannual Care+</option>
                        </select>
                        <select className="form-select" style={{ width: 150 }}>
                            <option>All Health Tags</option><option>Diabetic</option><option>Hypertension</option><option>Cardiac</option><option>Normal</option>
                        </select>
                        <select className="form-select" style={{ width: 130 }}>
                            <option>All Status</option><option>Active</option><option>Suspended</option><option>Blocked</option>
                        </select>
                    </div>

                    <div className="card">
                        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User ID</th><th>Name</th><th>City</th><th>Plan</th><th>Health Tag</th><th>Age</th><th>Status</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td><code style={{ fontSize: 12, color: "var(--accent-primary-light)" }}>{user.id}</code></td>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{user.name}</td>
                                            <td>{user.city}</td>
                                            <td><span className="badge badge-purple">{user.plan}</span></td>
                                            <td>
                                                <span className={`badge ${user.healthTag === "Normal" ? "badge-success" : user.healthTag === "Cardiac" ? "badge-danger" : "badge-warning"}`}>
                                                    {user.healthTag}
                                                </span>
                                            </td>
                                            <td>{user.age}</td>
                                            <td>
                                                <span className={`badge ${user.status === "Active" ? "badge-success" : user.status === "Suspended" ? "badge-warning" : "badge-danger"}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => setSelectedUser(user)}><Eye size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary"><Lock size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary"><FileText size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pagination mt-6">
                        <button className="pagination-btn">‹</button>
                        <button className="pagination-btn active">1</button>
                        <button className="pagination-btn">2</button>
                        <button className="pagination-btn">3</button>
                        <button className="pagination-btn">›</button>
                    </div>
                </>
            )}

            {activeTab === "health-flags" && (
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertTriangle size={18} color="var(--accent-danger)" /> OCR Health Flag Alerts
                        </h3>
                    </div>
                    <div className="card-body">
                        {healthFlags.map((flag, i) => (
                            <div key={i} className="live-feed-item">
                                <div className={`live-feed-dot ${flag.severity === "Critical" ? "critical" : "info"}`} />
                                <div className="live-feed-content" style={{ flex: 1 }}>
                                    <h5>{flag.user}</h5>
                                    <p>{flag.flag}</p>
                                    <p className="text-xs text-muted">{flag.date}</p>
                                </div>
                                <span className={`badge ${flag.severity === "Critical" ? "badge-danger" : "badge-warning"}`}>{flag.severity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "medical-cards" && (
                <div className="card">
                    <div className="card-header"><h3>Medical Cards Overview</h3></div>
                    <div className="card-body">
                        <div className="stats-grid" style={{ marginBottom: 0 }}>
                            {users.slice(0, 4).map((u) => (
                                <div key={u.id} className="stat-card">
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                                            <div className="text-sm text-muted">{u.id}</div>
                                        </div>
                                        <span className={`badge ${u.healthTag === "Normal" ? "badge-success" : "badge-warning"}`}>{u.healthTag}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">Age</span><span className="text-sm">{u.age}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">City</span><span className="text-sm">{u.city}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">Emergency Contact</span><span className="text-sm">{u.phone}</span>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button className="btn btn-sm btn-secondary" style={{ flex: 1 }}><Eye size={14} /> View Reports</button>
                                        <button className="btn btn-sm btn-primary" style={{ flex: 1 }}><FileText size={14} /> SLA PDF</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>User Profile: {selectedUser.name}</h3>
                            <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">User ID</label><input className="form-input" value={selectedUser.id} readOnly /></div>
                                <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" defaultValue={selectedUser.name} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" defaultValue={selectedUser.phone} /></div>
                                <div className="form-group"><label className="form-label">City</label><select className="form-select" defaultValue={selectedUser.city}>
                                    <option>Bangalore</option><option>Hyderabad</option><option>Chennai</option><option>Mumbai</option><option>Delhi</option>
                                </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Plan</label><input className="form-input" value={selectedUser.plan} readOnly /></div>
                                <div className="form-group"><label className="form-label">Health Tag</label><select className="form-select" defaultValue={selectedUser.healthTag}>
                                    <option>Normal</option><option>Diabetic</option><option>Hypertension</option><option>Cardiac</option>
                                </select></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Emergency Contacts</label>
                                <input className="form-input" placeholder="Son: +91 12345 67890" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-danger btn-sm"><UserX size={14} /> Block</button>
                            <button className="btn btn-warning btn-sm"><Lock size={14} /> Reset Password</button>
                            <button className="btn btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
