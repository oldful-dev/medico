"use client";
import { useState } from "react";
import { Bell, Mail, MessageSquare, Send, Edit2, ToggleLeft, Plus, Smartphone } from "lucide-react";

const whatsappTemplates = [
    { id: 1, name: "Booking Confirmation", status: "Approved", lastEdited: "Feb 20, 2026", autoSend: true },
    { id: 2, name: "SOS Alert Notification", status: "Approved", lastEdited: "Feb 18, 2026", autoSend: true },
    { id: 3, name: "Plan Expiry Reminder", status: "Approved", lastEdited: "Feb 15, 2026", autoSend: true },
    { id: 4, name: "Invoice Attached", status: "Pending Review", lastEdited: "Feb 22, 2026", autoSend: false },
    { id: 5, name: "Caregiver Assignment", status: "Approved", lastEdited: "Feb 10, 2026", autoSend: true },
];

const emailTemplates = [
    { id: 1, name: "Welcome Email", subject: "Welcome to Medico Care!", enabled: true },
    { id: 2, name: "Expiry Reminder", subject: "Your plan expires in {{days}} days", enabled: true },
    { id: 3, name: "Invoice Mail", subject: "Invoice #{{invoice_id}} - Medico", enabled: true },
    { id: 4, name: "Emergency Alert", subject: "🚨 Emergency Alert for {{user_name}}", enabled: true },
    { id: 5, name: "Monthly Report", subject: "Your Monthly Health Summary", enabled: false },
];

const pushHistory = [
    { id: 1, title: "New Service: Tiffin Delivery!", date: "Feb 22, 2026", audience: "All Users", sent: 35100, opened: 18200 },
    { id: 2, title: "20% Off on Annual Plans", date: "Feb 20, 2026", audience: "Bangalore", sent: 12400, opened: 7800 },
    { id: 3, title: "Book Blood Test for ₹199", date: "Feb 18, 2026", audience: "Hyderabad", sent: 8900, opened: 4200 },
];

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState("whatsapp");
    const [showPushModal, setShowPushModal] = useState(false);

    return (
        <div>
            <div className="page-header">
                <h2>Notification & Automation Center</h2>
                <p>Manage WhatsApp, email, and push notification templates and campaigns</p>
            </div>

            <div className="tabs mb-6">
                {[{ id: "whatsapp", icon: MessageSquare, label: "WhatsApp" }, { id: "email", icon: Mail, label: "Email" }, { id: "push", icon: Smartphone, label: "Push Notifications" }].map(t => (
                    <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "whatsapp" && (
                <div className="card">
                    <div className="card-header">
                        <h3>WhatsApp API Templates</h3>
                        <button className="btn btn-primary btn-sm"><Plus size={14} /> New Template</button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Template Name</th><th>Status</th><th>Last Edited</th><th>Auto-Send</th><th>Actions</th></tr></thead>
                            <tbody>
                                {whatsappTemplates.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.name}</td>
                                        <td><span className={`badge ${t.status === "Approved" ? "badge-success" : "badge-warning"}`}>{t.status}</span></td>
                                        <td className="text-sm">{t.lastEdited}</td>
                                        <td>
                                            <label className="toggle-switch"><input type="checkbox" defaultChecked={t.autoSend} /><span className="toggle-slider"></span></label>
                                        </td>
                                        <td><button className="btn btn-sm btn-secondary"><Edit2 size={14} /> Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "email" && (
                <div className="card">
                    <div className="card-header">
                        <h3>Email Templates</h3>
                        <button className="btn btn-primary btn-sm"><Plus size={14} /> New Template</button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Template</th><th>Subject</th><th>Enabled</th><th>Actions</th></tr></thead>
                            <tbody>
                                {emailTemplates.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.name}</td>
                                        <td className="text-sm">{t.subject}</td>
                                        <td>
                                            <label className="toggle-switch"><input type="checkbox" defaultChecked={t.enabled} /><span className="toggle-slider"></span></label>
                                        </td>
                                        <td><button className="btn btn-sm btn-secondary"><Edit2 size={14} /> Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "push" && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary" onClick={() => setShowPushModal(true)}><Send size={16} /> Send New Notification</button>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Push Notification History</h3></div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>Title</th><th>Date</th><th>Audience</th><th>Sent</th><th>Opened</th><th>Open Rate</th></tr></thead>
                                <tbody>
                                    {pushHistory.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{p.title}</td>
                                            <td className="text-sm">{p.date}</td>
                                            <td><span className="badge badge-info">{p.audience}</span></td>
                                            <td>{p.sent.toLocaleString()}</td>
                                            <td>{p.opened.toLocaleString()}</td>
                                            <td><span className="badge badge-success">{Math.round(p.opened / p.sent * 100)}%</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {showPushModal && (
                <div className="modal-overlay" onClick={() => setShowPushModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Send Push Notification</h3><button onClick={() => setShowPushModal(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Title</label><input className="form-input" placeholder="Notification title" /></div>
                            <div className="form-group"><label className="form-label">Message</label><textarea className="form-textarea" placeholder="Write your message..." style={{ minHeight: 80 }}></textarea></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Audience</label>
                                    <select className="form-select"><option>All Users</option><option>Bangalore</option><option>Hyderabad</option><option>Chennai</option><option>Premium Users</option></select>
                                </div>
                                <div className="form-group"><label className="form-label">Type</label>
                                    <select className="form-select"><option>Promotional</option><option>Informational</option><option>Reminder</option></select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowPushModal(false)}>Cancel</button><button className="btn btn-primary"><Send size={14} /> Send Now</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
