"use client";
import { useState } from "react";
import { Plus, Edit2, Eye, EyeOff, CreditCard, Pause, X, ArrowRight, Clock, RefreshCw, Receipt } from "lucide-react";

const plans = [
    { id: 1, name: "Basic Care", quarterly: "₹2,999", biannual: "₹5,499", yearly: "₹9,999", benefits: "Doctor Visit (2/mo), Blood Test (1/mo), 24/7 SOS", active: 3200, visible: true },
    { id: 2, name: "Care Plus", quarterly: "₹4,999", biannual: "₹9,499", yearly: "₹16,999", benefits: "All Basic + Home Nurse (2/mo), Insurance, Physio", active: 5800, visible: true },
    { id: 3, name: "Premium Care", quarterly: "₹7,999", biannual: "₹14,999", yearly: "₹27,999", benefits: "Unlimited services, Priority booking, Dedicated manager", active: 3840, visible: true },
    { id: 4, name: "Family Plan", quarterly: "₹11,999", biannual: "₹22,999", yearly: "₹42,999", benefits: "Premium for 2 members + Tiffin + Tech Helper", active: 0, visible: false },
];

const subscriptions = [
    { id: 1, user: "Rajesh Kumar", plan: "Premium Care", period: "Yearly", startDate: "Jan 15, 2026", expiryDate: "Jan 14, 2027", status: "Active", amount: "₹27,999", autoRenew: true },
    { id: 2, user: "Anita Sharma", plan: "Basic Care", period: "Quarterly", startDate: "Dec 01, 2025", expiryDate: "Feb 28, 2026", status: "Expiring", amount: "₹2,999", autoRenew: false },
    { id: 3, user: "Venkat Reddy", plan: "Care Plus", period: "Biannual", startDate: "Sep 15, 2025", expiryDate: "Mar 14, 2026", status: "Active", amount: "₹9,499", autoRenew: true },
    { id: 4, user: "Priya Menon", plan: "Premium Care", period: "Yearly", startDate: "Mar 20, 2025", expiryDate: "Mar 19, 2026", status: "Active", amount: "₹27,999", autoRenew: true },
    { id: 5, user: "Suresh Patel", plan: "Basic Care", period: "Quarterly", startDate: "Nov 10, 2025", expiryDate: "Feb 09, 2026", status: "Expired", amount: "₹2,999", autoRenew: false },
];

export default function PlansPage() {
    const [activeTab, setActiveTab] = useState("plans");
    const [editingPlan, setEditingPlan] = useState(null);

    return (
        <div>
            <div className="page-header">
                <h2>Plan & Subscription Management</h2>
                <p>Manage plans, pricing, subscriptions, and automation</p>
            </div>

            <div className="tabs mb-6">
                {["plans", "subscriptions", "automation"].map(t => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === "plans" && (
                <>
                    <div className="filter-bar">
                        <button className="btn btn-primary"><Plus size={16} /> Add Plan</button>
                    </div>
                    <div className="stats-grid">
                        {plans.map(plan => (
                            <div key={plan.id} className="stat-card" style={{ opacity: plan.visible ? 1 : 0.5 }}>
                                <div className="stat-card-header">
                                    <span className="badge badge-purple">{plan.name}</span>
                                    <label className="toggle-switch">
                                        <input type="checkbox" defaultChecked={plan.visible} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">Quarterly</span>
                                        <span className="text-sm font-bold">{plan.quarterly}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">Biannual</span>
                                        <span className="text-sm font-bold">{plan.biannual}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted">Yearly</span>
                                        <span className="text-sm font-bold">{plan.yearly}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted mt-4" style={{ lineHeight: 1.6 }}>{plan.benefits}</p>
                                <div className="flex justify-between items-center mt-4" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                                    <span className="text-sm text-muted">{plan.active.toLocaleString()} active users</span>
                                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingPlan(plan)}><Edit2 size={14} /> Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === "subscriptions" && (
                <>
                    <div className="filter-bar">
                        <input className="form-input" placeholder="Search user..." style={{ maxWidth: 240 }} />
                        <select className="form-select" style={{ width: 140 }}><option>All Plans</option>{plans.map(p => <option key={p.id}>{p.name}</option>)}</select>
                        <select className="form-select" style={{ width: 140 }}><option>All Status</option><option>Active</option><option>Expiring</option><option>Expired</option><option>Paused</option></select>
                    </div>
                    <div className="card">
                        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>User</th><th>Plan</th><th>Period</th><th>Start</th><th>Expiry</th><th>Amount</th><th>Auto-Renew</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {subscriptions.map(sub => (
                                        <tr key={sub.id}>
                                            <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{sub.user}</td>
                                            <td><span className="badge badge-purple">{sub.plan}</span></td>
                                            <td>{sub.period}</td>
                                            <td className="text-sm">{sub.startDate}</td>
                                            <td className="text-sm">{sub.expiryDate}</td>
                                            <td style={{ fontWeight: 600 }}>{sub.amount}</td>
                                            <td>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked={sub.autoRenew} />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </td>
                                            <td><span className={`badge ${sub.status === "Active" ? "badge-success" : sub.status === "Expiring" ? "badge-warning" : "badge-default"}`}>{sub.status}</span></td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-sm btn-secondary" title="Pause"><Pause size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary" title="Extend"><ArrowRight size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary" title="Cancel"><X size={14} /></button>
                                                    <button className="btn btn-sm btn-secondary" title="Invoice"><Receipt size={14} /></button>
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

            {activeTab === "automation" && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-header"><h3>Expiry Reminders</h3></div>
                        <div className="card-body">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <div className="font-medium">7-Day Expiry Reminder</div>
                                    <div className="text-sm text-muted">WhatsApp + Email notification</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <div className="font-medium">3-Day Expiry Reminder</div>
                                    <div className="text-sm text-muted">WhatsApp + Push notification</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium">Expiry Day Notification</div>
                                    <div className="text-sm text-muted">All channels + call</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Auto-Renewal & Invoicing</h3></div>
                        <div className="card-body">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <div className="font-medium">Auto-Renew Subscriptions</div>
                                    <div className="text-sm text-muted">Charge automatically on expiry</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <div className="font-medium">GST Invoice Generation</div>
                                    <div className="text-sm text-muted">Auto-generate PDF invoices</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium">Send Invoice via Email</div>
                                    <div className="text-sm text-muted">Attach PDF to confirmation email</div>
                                </div>
                                <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingPlan && (
                <div className="modal-overlay" onClick={() => setEditingPlan(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Edit Plan: {editingPlan.name}</h3><button onClick={() => setEditingPlan(null)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Plan Name</label><input className="form-input" defaultValue={editingPlan.name} /></div>
                            <div className="form-row-3">
                                <div className="form-group"><label className="form-label">Quarterly Price</label><input className="form-input" defaultValue={editingPlan.quarterly} /></div>
                                <div className="form-group"><label className="form-label">Biannual Price</label><input className="form-input" defaultValue={editingPlan.biannual} /></div>
                                <div className="form-group"><label className="form-label">Yearly Price</label><input className="form-input" defaultValue={editingPlan.yearly} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Benefits</label><textarea className="form-textarea" defaultValue={editingPlan.benefits}></textarea></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditingPlan(null)}>Cancel</button><button className="btn btn-primary">Save Changes</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
