"use client";
import { useState } from "react";
import { ClipboardList, Search, Filter, Download } from "lucide-react";

const auditLogs = [
    { id: 1, timestamp: "Feb 23, 2026 20:32", admin: "Arun Kumar", role: "Super Admin", action: "Updated pricing", module: "Pricing", details: "Doctor Home Visit: ₹699 → ₹799", severity: "Medium" },
    { id: 2, timestamp: "Feb 23, 2026 20:15", admin: "Priya Sharma", role: "City Admin", action: "Created caregiver", module: "Caregiver", details: "Added Nurse Rekha - Bangalore", severity: "Low" },
    { id: 3, timestamp: "Feb 23, 2026 19:48", admin: "Arun Kumar", role: "Super Admin", action: "Modified legal doc", module: "Legal", details: "Terms & Conditions v2.2 → v2.3", severity: "High" },
    { id: 4, timestamp: "Feb 23, 2026 19:30", admin: "Deepa Rao", role: "Billing Executive", action: "Processed refund", module: "Payment", details: "₹2,500 refund for BK-4505", severity: "High" },
    { id: 5, timestamp: "Feb 23, 2026 18:12", admin: "Rajesh Nair", role: "City Admin", action: "Updated booking", module: "Booking", details: "BK-4503 status: Pending → Assigned", severity: "Low" },
    { id: 6, timestamp: "Feb 23, 2026 17:45", admin: "Arun Kumar", role: "Super Admin", action: "Enabled city", module: "City", details: "Pune status: Disabled → Coming Soon", severity: "Medium" },
    { id: 7, timestamp: "Feb 23, 2026 16:30", admin: "Sunita Menon", role: "Care Manager", action: "Reassigned caregiver", module: "Booking", details: "BK-4501: Dr. Meena → Dr. Ravi", severity: "Medium" },
    { id: 8, timestamp: "Feb 23, 2026 15:20", admin: "Arun Kumar", role: "Super Admin", action: "Updated plan pricing", module: "Plans", details: "Premium Care Quarterly: ₹7,499 → ₹7,999", severity: "High" },
    { id: 9, timestamp: "Feb 23, 2026 14:00", admin: "Vikram Singh", role: "Support Agent", action: "Closed ticket", module: "Support", details: "Ticket #1248 - Resolved", severity: "Low" },
    { id: 10, timestamp: "Feb 23, 2026 12:30", admin: "Arun Kumar", role: "Super Admin", action: "Deployed service config", module: "Server UI", details: "JSON config v47 published", severity: "High" },
];

const severityColors = { "High": "badge-danger", "Medium": "badge-warning", "Low": "badge-info" };

export default function AuditPage() {
    const [filterModule, setFilterModule] = useState("All");

    const filtered = filterModule === "All" ? auditLogs : auditLogs.filter(l => l.module === filterModule);
    const modules = ["All", ...new Set(auditLogs.map(l => l.module))];

    return (
        <div>
            <div className="page-header">
                <h2>Audit Logs</h2>
                <p>Complete trail of admin actions, pricing changes, and system events</p>
            </div>

            <div className="filter-bar">
                <input className="form-input" placeholder="Search logs..." style={{ maxWidth: 260 }} />
                <select className="form-select" style={{ width: 160 }} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
                    {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="form-select" style={{ width: 140 }}>
                    <option>All Severity</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
                <select className="form-select" style={{ width: 140 }}>
                    <option>All Admins</option><option>Arun Kumar</option><option>Priya Sharma</option><option>Deepa Rao</option>
                </select>
                <button className="btn btn-secondary" style={{ marginLeft: "auto" }}><Download size={16} /> Export</button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Timestamp</th><th>Admin</th><th>Role</th><th>Action</th><th>Module</th><th>Details</th><th>Severity</th></tr></thead>
                        <tbody>
                            {filtered.map(log => (
                                <tr key={log.id}>
                                    <td className="text-sm" style={{ whiteSpace: "nowrap" }}>{log.timestamp}</td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{log.admin}</td>
                                    <td><span className="badge badge-purple">{log.role}</span></td>
                                    <td>{log.action}</td>
                                    <td><span className="badge badge-default">{log.module}</span></td>
                                    <td className="text-sm">{log.details}</td>
                                    <td><span className={`badge ${severityColors[log.severity]}`}>{log.severity}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
