"use client";
import { useState } from "react";
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle, AlertTriangle, User, Search } from "lucide-react";

const tickets = [
    { id: "TKT-1250", user: "Rajesh Kumar", subject: "Doctor didn't arrive on time", category: "Booking", priority: "High", status: "Open", assignee: "Vikram Singh", created: "Feb 23, 2026", sla: "2h remaining" },
    { id: "TKT-1249", user: "Anita Sharma", subject: "Refund not received for BK-4421", category: "Payment", priority: "Medium", status: "In Progress", assignee: "Vikram Singh", created: "Feb 22, 2026", sla: "On track" },
    { id: "TKT-1248", user: "Venkat Reddy", subject: "Unable to update emergency contact", category: "Account", priority: "Low", status: "Resolved", assignee: "Support Team", created: "Feb 21, 2026", sla: "Met" },
    { id: "TKT-1247", user: "Priya Menon", subject: "Medicine delivery delayed by 3 hours", category: "Service", priority: "High", status: "Open", assignee: "—", created: "Feb 23, 2026", sla: "1h remaining" },
    { id: "TKT-1246", user: "Suresh Patel", subject: "Subscription not activating after payment", category: "Payment", priority: "Critical", status: "Escalated", assignee: "Arun Kumar", created: "Feb 22, 2026", sla: "Breached" },
];

const priorityColors = { "Critical": "badge-danger", "High": "badge-warning", "Medium": "badge-info", "Low": "badge-default" };
const statusColors = { "Open": "badge-warning", "In Progress": "badge-info", "Resolved": "badge-success", "Escalated": "badge-danger", "Closed": "badge-default" };

export default function SupportPage() {
    const [showModal, setShowModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    return (
        <div>
            <div className="page-header">
                <h2>Support & Ticketing System</h2>
                <p>Manage customer support tickets, assign agents, and track SLA</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.status === "Open").length}</div><div className="stat-card-label">Open</div></div>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.status === "In Progress").length}</div><div className="stat-card-label">In Progress</div></div>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.status === "Escalated").length}</div><div className="stat-card-label">Escalated</div></div>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.status === "Resolved").length}</div><div className="stat-card-label">Resolved</div></div>
                <div className="stat-card"><div className="stat-card-value">92%</div><div className="stat-card-label">SLA Compliance</div></div>
            </div>

            <div className="filter-bar">
                <input className="form-input" placeholder="Search tickets..." style={{ maxWidth: 260 }} />
                <select className="form-select" style={{ width: 140 }}><option>All Status</option><option>Open</option><option>In Progress</option><option>Escalated</option><option>Resolved</option></select>
                <select className="form-select" style={{ width: 140 }}><option>All Priority</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Raise Ticket</button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Ticket ID</th><th>User</th><th>Subject</th><th>Category</th><th>Priority</th><th>Assignee</th><th>SLA</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td><code style={{ fontSize: 12, color: "var(--accent-primary-light)" }}>{t.id}</code></td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.user}</td>
                                    <td className="text-sm">{t.subject}</td>
                                    <td><span className="badge badge-default">{t.category}</span></td>
                                    <td><span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                                    <td className="text-sm">{t.assignee}</td>
                                    <td><span className={`badge ${t.sla === "Breached" ? "badge-danger" : t.sla === "Met" ? "badge-success" : "badge-warning"}`}>{t.sla}</span></td>
                                    <td><span className={`badge ${statusColors[t.status]}`}>{t.status}</span></td>
                                    <td><button className="btn btn-sm btn-secondary" onClick={() => setSelectedTicket(t)}>View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedTicket && (
                <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Ticket {selectedTicket.id}</h3><button onClick={() => setSelectedTicket(null)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">User</label><input className="form-input" value={selectedTicket.user} readOnly /></div>
                                <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={selectedTicket.category} readOnly /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={selectedTicket.subject} readOnly /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Priority</label>
                                    <select className="form-select" defaultValue={selectedTicket.priority}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
                                </div>
                                <div className="form-group"><label className="form-label">Assign To</label>
                                    <select className="form-select" defaultValue={selectedTicket.assignee}><option>Vikram Singh</option><option>Support Team</option><option>Arun Kumar</option></select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Status</label>
                                <select className="form-select" defaultValue={selectedTicket.status}><option>Open</option><option>In Progress</option><option>Escalated</option><option>Resolved</option><option>Closed</option></select>
                            </div>
                            <div className="form-group"><label className="form-label">Internal Notes</label><textarea className="form-textarea" placeholder="Add internal notes..."></textarea></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Cancel</button><button className="btn btn-primary">Update Ticket</button></div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Raise New Ticket</h3><button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">User</label><input className="form-input" placeholder="Search user..." /></div>
                            <div className="form-group"><label className="form-label">Subject</label><input className="form-input" placeholder="Brief description" /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Category</label><select className="form-select"><option>Booking</option><option>Payment</option><option>Service</option><option>Account</option><option>Other</option></select></div>
                                <div className="form-group"><label className="form-label">Priority</label><select className="form-select"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Detailed description..."></textarea></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary">Create Ticket</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
