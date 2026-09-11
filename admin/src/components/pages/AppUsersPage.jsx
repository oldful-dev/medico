"use client";
import { useState, useEffect } from "react";
import { Users, Activity, UserCheck, TrendingUp } from "lucide-react";
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { userAPI } from "@/lib/api";

const chartTooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    boxShadow: 'var(--shadow-lg)',
};

const DEVICE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#818cf8', '#34d399'];

export default function AppUsersPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await userAPI.getAppStats();
                if (!cancelled) setStats(res.data?.data || null);
            } catch (e) {
                if (!cancelled) setError(e.response?.data?.message || "Failed to load app usage stats");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const deviceData = (stats?.deviceBreakdown || []).map((d) => ({
        name: `${d.deviceType} · ${d.os}`,
        value: d.count,
    }));

    const trendData = (stats?.signupTrend || []).map((t) => ({
        ...t,
        label: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    }));

    return (
        <div>
            <div className="page-header"><h2>App Users</h2><p>Registered users, active users, and engagement — computed from real app data</p></div>

            {error && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent-danger)' }}><div className="card-body text-danger">{error}</div></div>}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon purple"><Users size={22} /></div></div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.totalRegisteredUsers ?? 0)}</div>
                    <div className="stat-card-label">Total Registered Users</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon blue"><Activity size={22} /></div></div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.activeUsers?.daily ?? 0)}</div>
                    <div className="stat-card-label">Daily Active Users</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon green"><UserCheck size={22} /></div></div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.activeUsers?.weekly ?? 0)}</div>
                    <div className="stat-card-label">Weekly Active Users</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-icon yellow"><TrendingUp size={22} /></div></div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.activeUsers?.monthly ?? 0)}</div>
                    <div className="stat-card-label">Monthly Active Users</div>
                </div>
            </div>

            <div className="grid-2" style={{ marginTop: 16 }}>
                <div className="card">
                    <div className="card-header"><h3>New Signups — Last 30 Days</h3></div>
                    <div className="card-body">
                        {!loading && trendData.some(t => t.count > 0) ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} interval={4} />
                                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Area type="monotone" dataKey="count" name="Signups" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                                {loading ? 'Loading...' : 'No signups in the last 30 days'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h3>Active Sessions by Device</h3></div>
                    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        {!loading && deviceData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="50%" height={220}>
                                    <PieChart>
                                        <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                                            {deviceData.map((entry, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={chartTooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1 }}>
                                    {deviceData.map((d, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                                            <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{d.name}</span>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted" style={{ textAlign: 'center', width: '100%', padding: 24 }}>
                                {loading ? 'Loading...' : 'No active sessions in the last 30 days'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
