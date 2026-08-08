"use client";
import { useState, useEffect } from "react";
import { BarChart3, Download } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { reportAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/hooks";

const chartTooltipStyle = { backgroundColor: '#1a2035', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#f1f5f9', fontSize: '12px' };
const colors = ["#6366f1", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];

export default function ReportsPage() {
    const [revByCity, setRevByCity] = useState([]);
    const [revByPlan, setRevByPlan] = useState([]);
    const [svcUsage, setSvcUsage] = useState([]);
    const [cgPerf, setCgPerf] = useState([]);
    const [retention, setRetention] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [c, p, s, cg, r] = await Promise.all([
                    reportAPI.revenueByCity(), reportAPI.revenueByPlan(), reportAPI.serviceUsage(), reportAPI.caregiverPerformance(), reportAPI.customerRetention(),
                ]);
                setRevByCity(c.data?.data || []);
                setRevByPlan(p.data?.data || []);
                setSvcUsage(s.data?.data || []);
                setCgPerf(cg.data?.data || []);
                setRetention(r.data?.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    async function exportCSV(type) {
        try {
            const res = await reportAPI.exportCSV(type);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a'); link.href = url; link.download = `${type}-report.csv`; link.click();
        } catch (e) { console.error(e); }
    }

    if (loading) return <div className="page-header"><h2>Loading Reports...</h2></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Reports & Analytics</h2>
                <p>Comprehensive business intelligence</p>
            </div>

            <div className="filter-bar">
                <button className="btn btn-secondary" onClick={() => exportCSV('bookings')}><Download size={14} /> Export Bookings</button>
                <button className="btn btn-secondary" onClick={() => exportCSV('payments')}><Download size={14} /> Export Payments</button>
                <button className="btn btn-secondary" onClick={() => exportCSV('users')}><Download size={14} /> Export Users</button>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Revenue Breakdown by City</h3>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                            <span style={{ color: '#818cf8', fontWeight: 600 }}>■ Ayuxa Revenue</span>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>■ Provider Revenue</span>
                        </div>
                    </div>
                    <div className="card-body">
                        {revByCity.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={revByCity.map(c => ({
                                    ...c,
                                    ayuxaRevenue: c.ayuxaRevenue ?? Math.round((c.totalRevenue || 0) * 0.2),
                                    providerRevenue: c.providerRevenue ?? Math.round((c.totalRevenue || 0) * 0.8)
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Bar dataKey="ayuxaRevenue" name="Ayuxa Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="providerRevenue" name="Provider Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No data</p>}
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Service Usage</h3></div>
                    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        {svcUsage.length > 0 ? (
                            <>
                                <ResponsiveContainer width="50%" height={240}>
                                    <PieChart><Pie data={svcUsage.map((s, i) => ({ ...s, color: colors[i % colors.length] }))} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="totalBookings">{svcUsage.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} /></PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1 }}>{svcUsage.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[i % colors.length] }} /><span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{s.name}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{s.totalBookings}</span></div>)}</div>
                            </>
                        ) : <p className="text-muted" style={{ textAlign: 'center', width: '100%', padding: 24 }}>No data</p>}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><h3>Caregiver Performance</h3></div>
                    <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Rating</th><th>Bookings</th><th>City</th></tr></thead>
                            <tbody>
                                {cgPerf.map((c, i) => <tr key={i}><td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</td><td>{c.performanceRating?.toFixed(1) || '—'}</td><td>{c.totalBookings}</td><td className="text-sm">{c.city?.name || '—'}</td></tr>)}
                                {cgPerf.length === 0 && <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No data</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Customer Retention</h3></div>
                    <div className="card-body">
                        {retention ? (
                            <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <div><div className="text-sm text-muted">Total Users</div><div style={{ fontSize: 24, fontWeight: 700 }}>{retention.totalUsers || 0}</div></div>
                                <div><div className="text-sm text-muted">Active Subscribers</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-success)" }}>{retention.activeSubscribers || 0}</div></div>
                                <div><div className="text-sm text-muted">Retention Rate</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-primary-light)" }}>{retention.retentionRate || '—'}%</div></div>
                                <div><div className="text-sm text-muted">Churn Rate</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-danger)" }}>{retention.retentionRate ? (100 - parseFloat(retention.retentionRate)).toFixed(1) : '—'}%</div></div>
                            </div>
                        ) : <p className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No data</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
