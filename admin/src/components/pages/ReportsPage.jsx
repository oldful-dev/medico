"use client";
import { useState } from "react";
import { BarChart3, Download, TrendingUp, Users, DollarSign, Star, RotateCcw, UserCheck } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = [
    { month: "Aug", revenue: 42000 }, { month: "Sep", revenue: 48000 }, { month: "Oct", revenue: 52000 },
    { month: "Nov", revenue: 58000 }, { month: "Dec", revenue: 61000 }, { month: "Jan", revenue: 69000 }, { month: "Feb", revenue: 73500 },
];

const serviceUsage = [
    { service: "Doctor Visit", usage: 2840 }, { service: "Blood Test", usage: 2100 },
    { service: "Home Nurse", usage: 1560 }, { service: "Physio", usage: 980 },
    { service: "Medicines", usage: 1800 }, { service: "Hospital Trip", usage: 720 },
    { service: "Tiffin", usage: 1340 }, { service: "Equipment", usage: 450 },
];

const cityGrowth = [
    { month: "Sep", blr: 10200, hyd: 7100, chn: 4800, mum: 2900, del: 2100 },
    { month: "Oct", blr: 10800, hyd: 7600, chn: 5200, mum: 3200, del: 2500 },
    { month: "Nov", blr: 11300, hyd: 8000, chn: 5600, mum: 3500, del: 2800 },
    { month: "Dec", blr: 11800, hyd: 8400, chn: 5900, mum: 3700, del: 3100 },
    { month: "Jan", blr: 12100, hyd: 8700, chn: 6000, mum: 3900, del: 3300 },
    { month: "Feb", blr: 12400, hyd: 8900, chn: 6200, mum: 4100, del: 3500 },
];

const chartTooltipStyle = { backgroundColor: '#1a2035', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#f1f5f9', fontSize: '12px' };

export default function ReportsPage() {
    const [reportType, setReportType] = useState("revenue");

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2>Reports & Analytics</h2>
                        <p>Comprehensive insights across all operations</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary"><Download size={16} /> Export CSV</button>
                        <button className="btn btn-primary"><Download size={16} /> Export PDF</button>
                    </div>
                </div>
            </div>

            <div className="tabs mb-6">
                {["revenue", "services", "cities", "caregivers", "retention"].map(t => (
                    <button key={t} className={`tab ${reportType === t ? "active" : ""}`} onClick={() => setReportType(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {reportType === "revenue" && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                        <div className="stat-card"><div className="stat-card-value">₹73.5K</div><div className="stat-card-label">This Month</div></div>
                        <div className="stat-card"><div className="stat-card-value">₹3.99L</div><div className="stat-card-label">This Quarter</div></div>
                        <div className="stat-card"><div className="stat-card-value">₹8.42L</div><div className="stat-card-label">This Year</div></div>
                        <div className="stat-card"><div className="stat-card-value">₹12.4K</div><div className="stat-card-label">Refunds</div></div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Revenue Trend</h3></div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={revenueData}>
                                    <defs><linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `₹${v / 1000}K`} />
                                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => [`₹${v.toLocaleString()}`]} />
                                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {reportType === "services" && (
                <div className="card">
                    <div className="card-header"><h3>Service Usage This Month</h3></div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={serviceUsage} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis type="number" stroke="#64748b" fontSize={12} />
                                <YAxis type="category" dataKey="service" stroke="#64748b" fontSize={12} width={100} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Bar dataKey="usage" fill="#6366f1" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {reportType === "cities" && (
                <div className="card">
                    <div className="card-header"><h3>City-wise User Growth</h3></div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={cityGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Line type="monotone" dataKey="blr" stroke="#6366f1" name="Bangalore" strokeWidth={2} />
                                <Line type="monotone" dataKey="hyd" stroke="#06b6d4" name="Hyderabad" strokeWidth={2} />
                                <Line type="monotone" dataKey="chn" stroke="#10b981" name="Chennai" strokeWidth={2} />
                                <Line type="monotone" dataKey="mum" stroke="#f59e0b" name="Mumbai" strokeWidth={2} />
                                <Line type="monotone" dataKey="del" stroke="#ef4444" name="Delhi" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {reportType === "caregivers" && (
                <div className="card">
                    <div className="card-header"><h3>Caregiver Performance</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Caregiver</th><th>Bookings</th><th>Rating</th><th>On-Time %</th><th>SLA Breaches</th><th>Revenue Generated</th></tr></thead>
                            <tbody>
                                {[
                                    { name: "Dr. Meena", bookings: 156, rating: 4.8, onTime: "96%", breaches: 2, revenue: "₹1.24L" },
                                    { name: "Nurse Lakshmi", bookings: 210, rating: 4.9, onTime: "98%", breaches: 1, revenue: "₹2.73L" },
                                    { name: "Dr. Ravi", bookings: 132, rating: 4.7, onTime: "94%", breaches: 4, revenue: "₹1.05L" },
                                    { name: "Physio Ram", bookings: 98, rating: 4.6, onTime: "92%", breaches: 3, revenue: "₹68.5K" },
                                ].map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</td>
                                        <td>{c.bookings}</td>
                                        <td><span className="flex items-center gap-1"><Star size={14} fill="#f59e0b" color="#f59e0b" />{c.rating}</span></td>
                                        <td><span className="badge badge-success">{c.onTime}</span></td>
                                        <td><span className={`badge ${c.breaches > 3 ? "badge-danger" : "badge-warning"}`}>{c.breaches}</span></td>
                                        <td style={{ fontWeight: 600 }}>{c.revenue}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {reportType === "retention" && (
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="stat-card"><div className="stat-card-value text-success">87.3%</div><div className="stat-card-label">Customer Retention Rate</div></div>
                    <div className="stat-card"><div className="stat-card-value">4.2%</div><div className="stat-card-label">Monthly Churn Rate</div></div>
                    <div className="stat-card"><div className="stat-card-value">₹18,420</div><div className="stat-card-label">Avg. Customer Lifetime Value</div></div>
                </div>
            )}
        </div>
    );
}
