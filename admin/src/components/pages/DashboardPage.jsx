"use client";
import { useState } from "react";
import {
    Users, CreditCard, CalendarCheck, AlertTriangle, DollarSign, TrendingUp,
    TrendingDown, ArrowUpRight, Activity, Clock, MapPin, UserCheck
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

const revenueData = [
    { name: "Jan", revenue: 42000, bookings: 320 },
    { name: "Feb", revenue: 48000, bookings: 380 },
    { name: "Mar", revenue: 55000, bookings: 410 },
    { name: "Apr", revenue: 51000, bookings: 390 },
    { name: "May", revenue: 62000, bookings: 470 },
    { name: "Jun", revenue: 68000, bookings: 520 },
    { name: "Jul", revenue: 73500, bookings: 560 },
];

const serviceBreakdown = [
    { name: "Doctor Visit", value: 28, color: "#6366f1" },
    { name: "Home Nurse", value: 22, color: "#06b6d4" },
    { name: "Blood Test", value: 18, color: "#8b5cf6" },
    { name: "Medicines", value: 12, color: "#10b981" },
    { name: "Physio", value: 10, color: "#f59e0b" },
    { name: "Others", value: 10, color: "#64748b" },
];

const cityData = [
    { city: "Bangalore", users: 12400, revenue: "₹18.5L", growth: "+12%" },
    { city: "Hyderabad", users: 8900, revenue: "₹12.2L", growth: "+18%" },
    { city: "Chennai", users: 6200, revenue: "₹8.7L", growth: "+9%" },
    { city: "Mumbai", users: 4100, revenue: "₹6.1L", growth: "+22%" },
    { city: "Delhi", users: 3500, revenue: "₹4.8L", growth: "+15%" },
];

const sosAlerts = [
    { id: 1, user: "Rajesh Kumar", phone: "+91 98765 43210", location: "Koramangala, BLR", time: "2 min ago", status: "Active" },
    { id: 2, user: "Sunita Devi", phone: "+91 87654 32109", location: "Banjara Hills, HYD", time: "8 min ago", status: "Assigned" },
    { id: 3, user: "Mohan Rao", phone: "+91 76543 21098", location: "T.Nagar, CHN", time: "15 min ago", status: "Resolved" },
];

const expiringPlans = [
    { user: "Anita Sharma", plan: "Yearly Premium", expires: "Feb 28, 2026", city: "Bangalore" },
    { user: "Venkat Reddy", plan: "Quarterly Basic", expires: "Mar 01, 2026", city: "Hyderabad" },
    { user: "Priya Menon", plan: "Biannual Care+", expires: "Mar 02, 2026", city: "Chennai" },
    { user: "Suresh Patel", plan: "Yearly Premium", expires: "Mar 03, 2026", city: "Mumbai" },
];

const chartTooltipStyle = {
    backgroundColor: '#1a2035',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '12px',
};

export default function DashboardPage() {
    const [revenueFilter, setRevenueFilter] = useState("monthly");

    return (
        <div>
            <div className="page-header">
                <h2>Super Admin Dashboard</h2>
                <p>Real-time overview of your healthcare operations</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon purple"><Users size={22} /></div>
                        <div className="stat-card-trend up"><TrendingUp size={14} /> +12.5%</div>
                    </div>
                    <div className="stat-card-value">35,100</div>
                    <div className="stat-card-label">Total Users</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon green"><CreditCard size={22} /></div>
                        <div className="stat-card-trend up"><TrendingUp size={14} /> +8.2%</div>
                    </div>
                    <div className="stat-card-value">12,840</div>
                    <div className="stat-card-label">Active Subscriptions</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon blue"><CalendarCheck size={22} /></div>
                        <div className="stat-card-trend up"><TrendingUp size={14} /> +5.1%</div>
                    </div>
                    <div className="stat-card-value">847</div>
                    <div className="stat-card-label">Today's Bookings</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon yellow"><Clock size={22} /></div>
                        <div className="stat-card-trend down"><TrendingDown size={14} /> -3.2%</div>
                    </div>
                    <div className="stat-card-value">124</div>
                    <div className="stat-card-label">Pending Assignments</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon green"><DollarSign size={22} /></div>
                        <div className="stat-card-trend up"><TrendingUp size={14} /> +18.7%</div>
                    </div>
                    <div className="stat-card-value">₹73.5K</div>
                    <div className="stat-card-label">Revenue (This Month)</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon red"><AlertTriangle size={22} /></div>
                        <div className="stat-card-trend down"><TrendingDown size={14} /> -1</div>
                    </div>
                    <div className="stat-card-value">3</div>
                    <div className="stat-card-label">Active SOS Alerts</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon blue"><Activity size={22} /></div>
                        <div className="stat-card-trend up"><TrendingUp size={14} /> +6.3%</div>
                    </div>
                    <div className="stat-card-value">94.7%</div>
                    <div className="stat-card-label">Service Performance</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon purple"><UserCheck size={22} /></div>
                        <div className="stat-card-trend down"><TrendingDown size={14} /> 28</div>
                    </div>
                    <div className="stat-card-value">28</div>
                    <div className="stat-card-label">Plans Expiring (7 days)</div>
                </div>
            </div>

            {/* Revenue Chart + Service Breakdown */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3>Revenue Overview</h3>
                        <div className="tabs">
                            {["daily", "monthly", "yearly"].map((f) => (
                                <button key={f} className={`tab ${revenueFilter === f ? "active" : ""}`} onClick={() => setRevenueFilter(f)}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}K`} />
                                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>Service Breakdown</h3>
                    </div>
                    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        <ResponsiveContainer width="50%" height={240}>
                            <PieChart>
                                <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {serviceBreakdown.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}%`, "Share"]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1 }}>
                            {serviceBreakdown.map((s, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{s.name}</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SOS + City + Expiring Plans */}
            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {/* SOS Live Feed */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="status-dot live"></span> SOS Alerts
                        </h3>
                        <span className="badge badge-danger">Live</span>
                    </div>
                    <div className="card-body">
                        <div className="live-feed">
                            {sosAlerts.map((alert) => (
                                <div key={alert.id} className="live-feed-item">
                                    <div className={`live-feed-dot ${alert.status === "Active" ? "critical" : "info"}`} />
                                    <div className="live-feed-content">
                                        <h5>{alert.user}</h5>
                                        <p>{alert.phone} • {alert.location}</p>
                                        <p>{alert.time} • <span className={`badge badge-${alert.status === "Active" ? "danger" : alert.status === "Assigned" ? "warning" : "success"}`}>{alert.status}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* City Revenue */}
                <div className="card">
                    <div className="card-header">
                        <h3>City-wise Revenue</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>City</th>
                                    <th>Users</th>
                                    <th>Revenue</th>
                                    <th>Growth</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cityData.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.city}</td>
                                        <td>{c.users.toLocaleString()}</td>
                                        <td>{c.revenue}</td>
                                        <td><span className="badge badge-success">{c.growth}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Expiring Plans */}
                <div className="card">
                    <div className="card-header">
                        <h3>Plans Expiring (7 Days)</h3>
                        <span className="badge badge-warning">{expiringPlans.length} Users</span>
                    </div>
                    <div className="card-body">
                        {expiringPlans.map((p, i) => (
                            <div key={i} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "12px 0", borderBottom: i < expiringPlans.length - 1 ? "1px solid var(--border-color)" : "none"
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{p.user}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.plan} • {p.city}</div>
                                </div>
                                <span className="badge badge-warning">{p.expires}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bookings Trend */}
            <div className="card">
                <div className="card-header">
                    <h3>Booking Trends</h3>
                </div>
                <div className="card-body">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Bar dataKey="bookings" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
