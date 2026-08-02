"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Tablet, Globe, Shield, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import { sessionAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function ActiveSessionsPage() {
    const [sessions, setSessions] = useState({ totalActive: 0, adminSessions: [], userSessions: [] });
    const [loading, setLoading] = useState(true);
    const [filterState, setFilterState] = useState("");
    const [filterType, setFilterType] = useState("all");

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType !== "all") params.type = filterType;
            if (filterState) params.state = filterState;

            const res = await sessionAPI.getActive(params);
            if (res.data?.success) {
                setSessions(res.data.data);
            } else {
                showToast(res.data?.message || "Failed to load active sessions", "error");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Network error loading sessions", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [filterState, filterType]);

    const handleTerminate = async (id, type) => {
        if (!confirm("Are you sure you want to force disconnect this session?")) return;
        try {
            const res = await sessionAPI.terminate(id, type);
            if (res.data?.success) {
                showToast("Session terminated successfully", "success");
                fetchSessions();
            } else {
                showToast(res.data?.message || "Termination failed", "error");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Error terminating session", "error");
        }
    };

    const getDeviceIcon = (deviceType) => {
        if (deviceType === "Mobile") return <Smartphone size={18} style={{ color: '#10B981' }} />;
        if (deviceType === "Tablet") return <Tablet size={18} style={{ color: '#3B82F6' }} />;
        return <Monitor size={18} style={{ color: '#6366F1' }} />;
    };

    const allSessionList = [
        ...sessions.adminSessions.map(s => ({ ...s, sessionType: 'ADMIN' })),
        ...sessions.userSessions.map(s => ({ ...s, sessionType: 'USER' }))
    ];

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2>Real-Time Active Sessions</h2>
                    <p>Monitor live multi-device PC & Mobile sessions across all states</p>
                </div>
                <button
                    onClick={fetchSessions}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Metrics Bar */}
            <div className="stats-grid mb-4">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon green"><Globe size={22} /></div>
                    </div>
                    <div className="stat-card-value">{sessions.totalActive}</div>
                    <div className="stat-card-label">Total Active Devices</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon purple"><Shield size={22} /></div>
                    </div>
                    <div className="stat-card-value">{sessions.adminSessions.length}</div>
                    <div className="stat-card-label">Admin Staff Sessions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon blue"><Smartphone size={22} /></div>
                    </div>
                    <div className="stat-card-value">{sessions.userSessions.length}</div>
                    <div className="stat-card-label">Client / Patient Sessions</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Filter Type:</label>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-select"
                        style={{ width: 140 }}
                    >
                        <option value="all">All Sessions</option>
                        <option value="admin">Admin Staff Only</option>
                        <option value="user">Clients Only</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>State:</label>
                    <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="form-select"
                        style={{ width: 140 }}
                    >
                        <option value="">All States</option>
                        <option value="Delhi">Delhi NCR</option>
                        <option value="UP">Uttar Pradesh</option>
                        <option value="MH">Maharashtra</option>
                        <option value="KA">Karnataka</option>
                    </select>
                </div>
            </div>

            {/* Sessions Table */}
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                            Loading active device sessions...
                        </div>
                    ) : allSessionList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                            <AlertCircle size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                            No active sessions matching filter criteria
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User & Role</th>
                                    <th>Device & OS</th>
                                    <th>IP & Location</th>
                                    <th>Last Active</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allSessionList.map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.email || s.phone || s.uniqueUserId}</div>
                                            <span className={`badge ${s.sessionType === 'ADMIN' ? 'badge-purple' : 'badge-info'}`} style={{ marginTop: 4 }}>
                                                {s.sessionType === 'ADMIN' ? (s.role || 'ADMIN') : 'CLIENT'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {getDeviceIcon(s.deviceType)}
                                                <div>
                                                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.deviceType}</div>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.browser} • {s.os}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.city}, {s.state}</div>
                                            <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.ipAddress}</code>
                                        </td>
                                        <td className="text-sm">
                                            {new Date(s.lastActiveAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleTerminate(s.id, s.sessionType)}
                                                className="btn btn-sm btn-danger"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <XCircle size={14} />
                                                Disconnect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
