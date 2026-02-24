"use client";
import { useState } from "react";
import { CreditCard, Download, RotateCcw, RefreshCw, FileText, Search, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const transactions = [
    { id: "TXN-9001", user: "Rajesh Kumar", type: "Subscription", amount: "₹27,999", status: "Success", method: "UPI", date: "Feb 23, 2026", invoice: true },
    { id: "TXN-9002", user: "Anita Sharma", type: "Booking", amount: "₹799", status: "Success", method: "Card", date: "Feb 23, 2026", invoice: true },
    { id: "TXN-9003", user: "Venkat Reddy", type: "Booking", amount: "₹1,299", status: "Failed", method: "UPI", date: "Feb 23, 2026", invoice: false },
    { id: "TXN-9004", user: "Priya Menon", type: "Refund", amount: "-₹499", status: "Processed", method: "—", date: "Feb 22, 2026", invoice: true },
    { id: "TXN-9005", user: "Suresh Patel", type: "Subscription", amount: "₹2,999", status: "Success", method: "Net Banking", date: "Feb 22, 2026", invoice: true },
    { id: "TXN-9006", user: "Lakshmi Devi", type: "Booking", amount: "₹299", status: "Success", method: "UPI", date: "Feb 22, 2026", invoice: true },
];

const revenueBreakdown = [
    { name: "Subscriptions", value: 68, color: "#6366f1" },
    { name: "Booking Fees", value: 22, color: "#06b6d4" },
    { name: "Add-ons", value: 7, color: "#10b981" },
    { name: "Others", value: 3, color: "#64748b" },
];

const monthlyRevenue = [
    { month: "Sep", revenue: 52000 }, { month: "Oct", revenue: 58000 }, { month: "Nov", revenue: 61000 },
    { month: "Dec", revenue: 64000 }, { month: "Jan", revenue: 69000 }, { month: "Feb", revenue: 73500 },
];

const chartTooltipStyle = { backgroundColor: '#1a2035', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#f1f5f9', fontSize: '12px' };

export default function PaymentsPage() {
    return (
        <div>
            <div className="page-header">
                <h2>Payment & Invoice Management</h2>
                <p>View transactions, process refunds, and manage invoices</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon green"><DollarSign size={22} /></div></div>
                    <div className="stat-card-value">₹73.5K</div>
                    <div className="stat-card-label">This Month Revenue</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon blue"><CreditCard size={22} /></div></div>
                    <div className="stat-card-value">1,247</div>
                    <div className="stat-card-label">Total Transactions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon red"><RotateCcw size={22} /></div></div>
                    <div className="stat-card-value">₹12.4K</div>
                    <div className="stat-card-label">Refunds Processed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon yellow"><RefreshCw size={22} /></div></div>
                    <div className="stat-card-value">8</div>
                    <div className="stat-card-label">Failed Payments</div>
                </div>
            </div>

            <div className="grid-2 mb-6">
                <div className="card">
                    <div className="card-header"><h3>Monthly Revenue Trend</h3></div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `₹${v / 1000}K`} />
                                <Tooltip contentStyle={chartTooltipStyle} formatter={v => [`₹${v.toLocaleString()}`]} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Revenue Breakdown</h3></div>
                    <div className="card-body" style={{ display: "flex", alignItems: "center" }}>
                        <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                                <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                                    {revenueBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={chartTooltipStyle} formatter={v => [`${v}%`]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1 }}>
                            {revenueBreakdown.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                                    <span className="text-sm" style={{ flex: 1 }}>{r.name}</span>
                                    <span className="text-sm font-bold">{r.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>All Transactions</h3>
                    <div className="flex gap-2">
                        <input className="form-input" placeholder="Search..." style={{ width: 200, padding: "6px 12px", fontSize: 13 }} />
                        <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Txn ID</th><th>User</th><th>Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {transactions.map(txn => (
                                <tr key={txn.id}>
                                    <td><code style={{ fontSize: 12, color: "var(--accent-primary-light)" }}>{txn.id}</code></td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{txn.user}</td>
                                    <td><span className={`badge ${txn.type === "Refund" ? "badge-warning" : txn.type === "Subscription" ? "badge-purple" : "badge-info"}`}>{txn.type}</span></td>
                                    <td style={{ fontWeight: 600, color: txn.type === "Refund" ? "var(--accent-danger)" : "var(--text-primary)" }}>{txn.amount}</td>
                                    <td className="text-sm">{txn.method}</td>
                                    <td className="text-sm">{txn.date}</td>
                                    <td><span className={`badge ${txn.status === "Success" ? "badge-success" : txn.status === "Failed" ? "badge-danger" : "badge-warning"}`}>{txn.status}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            {txn.status === "Failed" && <button className="btn btn-sm btn-warning"><RefreshCw size={14} /> Retry</button>}
                                            {txn.status === "Success" && <button className="btn btn-sm btn-secondary"><RotateCcw size={14} /> Refund</button>}
                                            {txn.invoice && <button className="btn btn-sm btn-secondary"><Download size={14} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
