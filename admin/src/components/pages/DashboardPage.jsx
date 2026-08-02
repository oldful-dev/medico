"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Users, CreditCard, CalendarCheck, AlertTriangle, DollarSign, TrendingUp,
    TrendingDown, Activity, Clock, UserCheck
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { reportAPI, analyticsAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/hooks";

import StateFilterBar from "@/components/StateFilterBar";

const chartTooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    boxShadow: 'var(--shadow-lg)',
};

export default function DashboardPage() {
    const router = useRouter();
    const [summary, setSummary] = useState(null);
    const [revByCity, setRevByCity] = useState([]);
    const [svcUsage, setSvcUsage] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentState, setCurrentState] = useState("");
    const [stateMetrics, setStateMetrics] = useState(null);

    const loadDashboardData = async (stCode) => {
        try {
            setLoading(true);
            const params = stCode ? { stateCode: stCode } : {};
            const [dashRes, cityRes, svcRes, stateRes] = await Promise.all([
                reportAPI.dashboard(params),
                reportAPI.revenueByCity(params),
                reportAPI.serviceUsage(params),
                analyticsAPI.getStateBusiness({ stateCode: stCode || 'DL' }),
            ]);
            setSummary(dashRes.data?.data || dashRes.data);
            setRevByCity(cityRes.data?.data || []);
            setSvcUsage(svcRes.data?.data || []);
            if (stateRes.data?.success) {
                setStateMetrics(stateRes.data.data.metrics);
            }
        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectState = (stCode) => {
        setCurrentState(stCode);
        loadDashboardData(stCode);
    };

    useEffect(() => {
        loadDashboardData("");
    }, []);

    if (loading) return <div className="page-header"><h2>Loading Dashboard...</h2></div>;

    const s = summary || {};

    const serviceColors = ["#6366f1", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];
    const serviceBreakdown = (svcUsage || []).map((sv, i) => ({
        name: sv.name || sv.service || `Service ${i + 1}`,
        value: sv.bookingCount || sv.count || 0,
        color: serviceColors[i % serviceColors.length],
    }));

    return (
        <div className="space-y-6">
            <div className="page-header">
                <h2>Operations & Business Dashboard</h2>
                <p>Real-time overview of your healthcare operations across India</p>
            </div>

            <StateFilterBar
                currentState={currentState}
                onSelectState={handleSelectState}
                stateMetrics={stateMetrics}
            />

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon purple"><Users size={22} /></div>
                    </div>
                    <div className="stat-card-value">{(s.totalUsers || 0).toLocaleString()}</div>
                    <div className="stat-card-label">Total Users</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon green"><CreditCard size={22} /></div>
                    </div>
                    <div className="stat-card-value">{(s.activeSubscriptions || 0).toLocaleString()}</div>
                    <div className="stat-card-label">Active Subscriptions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon blue"><CalendarCheck size={22} /></div>
                    </div>
                    <div className="stat-card-value">{(s.todayBookings || 0).toLocaleString()}</div>
                    <div className="stat-card-label">Today&apos;s Bookings</div>
                </div>
                <div className="stat-card" style={{ cursor: s.pendingBookings > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }} onClick={() => s.pendingBookings > 0 && router.push('/bookings')} onMouseEnter={e => s.pendingBookings > 0 && (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = 'var(--shadow-lg)')} onMouseLeave={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '')}>
                    <div className="stat-card-header">
                        <div className={`stat-card-icon ${s.pendingBookings > 0 ? 'red' : 'yellow'}`}><Clock size={22} /></div>
                    </div>
                    <div className="stat-card-value">{(s.pendingBookings || 0).toLocaleString()}</div>
                    <div className="stat-card-label">Pending Assignments</div>
                    {s.pendingBookings > 0 && <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 8 }}>Click to assign →</div>}
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon green"><DollarSign size={22} /></div>
                    </div>
                    <div className="stat-card-value">{formatCurrency(s.totalRevenue || 0)}</div>
                    <div className="stat-card-label">Total Revenue</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon red"><AlertTriangle size={22} /></div>
                    </div>
                    <div className="stat-card-value">{s.activeSOSAlerts || 0}</div>
                    <div className="stat-card-label">Active SOS Alerts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon blue"><Activity size={22} /></div>
                    </div>
                    <div className="stat-card-value">{s.totalServices || 0}</div>
                    <div className="stat-card-label">Active Services</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon purple"><UserCheck size={22} /></div>
                    </div>
                    <div className="stat-card-value">{s.expiringSubscriptions || 0}</div>
                    <div className="stat-card-label">Plans Expiring (7 days)</div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><h3>City-wise Revenue</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>City</th><th>Users</th><th>Revenue</th></tr></thead>
                            <tbody>
                                {(revByCity || []).map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.cityName || c.name}</td>
                                        <td>{(c.userCount || 0).toLocaleString()}</td>
                                        <td>{formatCurrency(c.totalRevenue || c.revenue || 0)}</td>
                                    </tr>
                                ))}
                                {(!revByCity || revByCity.length === 0) && <tr><td colSpan={3} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No revenue data yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Service Usage</h3></div>
                    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        {serviceBreakdown.length > 0 ? (
                            <>
                                <ResponsiveContainer width="50%" height={240}>
                                    <PieChart>
                                        <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                            {serviceBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={chartTooltipStyle}
                                            itemStyle={{ color: "var(--text-primary)" }}
                                            labelStyle={{ color: "var(--text-secondary)", marginBottom: "4px" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1 }}>
                                    {serviceBreakdown.map((sv, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: sv.color }} />
                                            <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{sv.name}</span>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{sv.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted" style={{ textAlign: 'center', width: '100%', padding: 24 }}>No service usage data yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
