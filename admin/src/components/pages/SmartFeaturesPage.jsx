"use client";
import { useState } from "react";
import { Brain, Activity, Clock, Heart, Shield, AlertTriangle, RefreshCw, Pause, TrendingUp } from "lucide-react";

const ocrFlags = [
    { user: "Rajesh Kumar", flag: "Blood Glucose: 320 mg/dL", severity: "Critical", detected: "Feb 23, 2026", action: "Alert Sent" },
    { user: "Anita Sharma", flag: "BP: 180/110 mmHg", severity: "Critical", detected: "Feb 22, 2026", action: "Doctor Notified" },
    { user: "Lakshmi Devi", flag: "HbA1c: 9.2%", severity: "High", detected: "Feb 21, 2026", action: "Alert Sent" },
    { user: "Venkat Reddy", flag: "Cholesterol: 280 mg/dL", severity: "Medium", detected: "Feb 20, 2026", action: "Pending Review" },
];

const refillReminders = [
    { user: "Rajesh Kumar", medicine: "Metformin 500mg", lastOrder: "Feb 01, 2026", nextDue: "Feb 28, 2026", status: "Reminder Sent" },
    { user: "Anita Sharma", medicine: "Amlodipine 5mg", lastOrder: "Feb 05, 2026", nextDue: "Mar 05, 2026", status: "Scheduled" },
    { user: "Suresh Patel", medicine: "Atorvastatin 10mg", lastOrder: "Jan 20, 2026", nextDue: "Feb 20, 2026", status: "Overdue" },
];

const slaBreaches = [
    { bookingId: "BK-4506", service: "Doctor Home Visit", expectedTime: "2:00 PM", actualTime: "3:15 PM", delay: "75 min", caregiver: "Dr. Ravi" },
    { bookingId: "BK-4498", service: "Blood Test", expectedTime: "10:00 AM", actualTime: "11:30 AM", delay: "90 min", caregiver: "Lab Team 2" },
    { bookingId: "BK-4490", service: "Medicine Delivery", expectedTime: "4:00 PM", actualTime: "6:20 PM", delay: "140 min", caregiver: "PharmaCare" },
];

const compassionateClauses = [
    { user: "Kamala Iyer", reason: "Hospitalization", extension: "30 days", approvedBy: "Arun Kumar", date: "Feb 20, 2026" },
    { user: "Ramu Prasad", reason: "Family Emergency", extension: "15 days", approvedBy: "Priya Sharma", date: "Feb 18, 2026" },
];

export default function SmartFeaturesPage() {
    const [activeTab, setActiveTab] = useState("ocr");

    return (
        <div>
            <div className="page-header">
                <h2>Advanced Smart Features</h2>
                <p>AI-powered health intelligence, automation, and compliance tracking</p>
            </div>

            <div className="tabs mb-6">
                {[
                    { id: "ocr", label: "OCR Health Flags" },
                    { id: "refill", label: "Auto-Refill Reminders" },
                    { id: "compassionate", label: "Compassionate Clause" },
                    { id: "pause-credits", label: "Pause Credits" },
                    { id: "sla", label: "SLA Breach Tracker" },
                ].map(t => (
                    <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {activeTab === "ocr" && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                        <div className="stat-card" style={{ borderColor: "rgba(239,68,68,0.3)" }}><div className="stat-card-value" style={{ color: "var(--accent-danger)" }}>{ocrFlags.filter(f => f.severity === "Critical").length}</div><div className="stat-card-label">Critical Flags</div></div>
                        <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{ocrFlags.filter(f => f.severity === "High").length}</div><div className="stat-card-label">High Priority</div></div>
                        <div className="stat-card"><div className="stat-card-value">{ocrFlags.filter(f => f.severity === "Medium").length}</div><div className="stat-card-label">Medium Priority</div></div>
                        <div className="stat-card"><div className="stat-card-value">{ocrFlags.length}</div><div className="stat-card-label">Total Flags (30 days)</div></div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Activity size={18} color="var(--accent-danger)" /> OCR Health Flag Engine</h3></div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>User</th><th>Detected Flag</th><th>Severity</th><th>Detected On</th><th>Action Status</th></tr></thead>
                                <tbody>
                                    {ocrFlags.map((f, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{f.user}</td>
                                            <td>{f.flag}</td>
                                            <td><span className={`badge ${f.severity === "Critical" ? "badge-danger" : f.severity === "High" ? "badge-warning" : "badge-info"}`}>{f.severity}</span></td>
                                            <td className="text-sm">{f.detected}</td>
                                            <td><span className={`badge ${f.action === "Pending Review" ? "badge-warning" : "badge-success"}`}>{f.action}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === "refill" && (
                <div className="card">
                    <div className="card-header"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><RefreshCw size={18} /> Auto-Refill Reminder System</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>User</th><th>Medicine</th><th>Last Order</th><th>Next Due</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {refillReminders.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{r.user}</td>
                                        <td>{r.medicine}</td>
                                        <td className="text-sm">{r.lastOrder}</td>
                                        <td className="text-sm">{r.nextDue}</td>
                                        <td><span className={`badge ${r.status === "Overdue" ? "badge-danger" : r.status === "Reminder Sent" ? "badge-success" : "badge-info"}`}>{r.status}</span></td>
                                        <td><button className="btn btn-sm btn-primary">Send Reminder</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "compassionate" && (
                <div className="card">
                    <div className="card-header"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Heart size={18} color="var(--accent-danger)" /> Compassionate Clause Automation</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>User</th><th>Reason</th><th>Extension</th><th>Approved By</th><th>Date</th></tr></thead>
                            <tbody>
                                {compassionateClauses.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.user}</td>
                                        <td>{c.reason}</td>
                                        <td><span className="badge badge-success">{c.extension}</span></td>
                                        <td className="text-sm">{c.approvedBy}</td>
                                        <td className="text-sm">{c.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "pause-credits" && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-header"><h3>Subscription Pause Credits</h3></div>
                        <div className="card-body">
                            <div className="flex justify-between items-center mb-4">
                                <div><div className="font-medium">Allow Subscription Pause</div><div className="text-sm text-muted">Users can pause up to 30 days/year</div></div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div><div className="font-medium">Auto-Credit Pause Days</div><div className="text-sm text-muted">Extend expiry by paused days</div></div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center">
                                <div><div className="font-medium">Max Pause Per Year</div><div className="text-sm text-muted">Maximum pause duration per subscription</div></div>
                                <input className="form-input" defaultValue="30" style={{ width: 80, textAlign: "center" }} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Currently Paused</h3></div>
                        <div className="card-body">
                            {[
                                { user: "Mohan Rao", pausedSince: "Feb 15, 2026", daysRemaining: 12 },
                                { user: "Kavita Joshi", pausedSince: "Feb 18, 2026", daysRemaining: 22 },
                            ].map((p, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i === 0 ? "1px solid var(--border-color)" : "none" }}>
                                    <div>
                                        <div className="font-medium">{p.user}</div>
                                        <div className="text-sm text-muted">Paused since {p.pausedSince}</div>
                                    </div>
                                    <span className="badge badge-warning">{p.daysRemaining} days left</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "sla" && (
                <div className="card">
                    <div className="card-header"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={18} color="var(--accent-warning)" /> SLA Breach Tracker</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Booking ID</th><th>Service</th><th>Expected</th><th>Actual</th><th>Delay</th><th>Caregiver</th><th>Actions</th></tr></thead>
                            <tbody>
                                {slaBreaches.map((b, i) => (
                                    <tr key={i}>
                                        <td><code style={{ fontSize: 12, color: "var(--accent-primary-light)" }}>{b.bookingId}</code></td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.service}</td>
                                        <td className="text-sm">{b.expectedTime}</td>
                                        <td className="text-sm">{b.actualTime}</td>
                                        <td><span className="badge badge-danger">{b.delay}</span></td>
                                        <td>{b.caregiver}</td>
                                        <td><button className="btn btn-sm btn-warning">Investigate</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
