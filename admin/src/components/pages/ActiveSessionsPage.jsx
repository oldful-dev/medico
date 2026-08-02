"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, Tablet, Globe, Shield, RefreshCw, XCircle, AlertCircle, ArrowLeft, Radio } from "lucide-react";
import { sessionAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import Cookies from "js-cookie";

export default function ActiveSessionsPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState({ totalActive: 0, adminSessions: [], userSessions: [] });
    const [loading, setLoading] = useState(true);
    const [filterState, setFilterState] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [autoSync, setAutoSync] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const fetchSessions = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const params = {};
            if (filterType !== "all") params.type = filterType;
            if (filterState) params.state = filterState;

            const res = await sessionAPI.getActive(params);
            if (res.data?.success) {
                setSessions(res.data.data);
                setLastSyncTime(new Date());
            } else if (!isBackground) {
                showToast(res.data?.message || "Failed to load active sessions", "error");
            }
        } catch (err) {
            if (!isBackground) {
                showToast(err.response?.data?.message || "Network error loading sessions", "error");
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Decode JWT from cookie to find the current active session ID
    useEffect(() => {
        try {
            const token = Cookies.get("adminToken");
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                setCurrentSessionId(decoded.sessionId);
            }
        } catch (e) {
            console.error('Failed to decode adminToken cookie:', e);
        }
    }, []);

    // Initial load + filter change trigger
    useEffect(() => {
        fetchSessions();
    }, [filterState, filterType]);

    // WebSocket Real-Time Listener
    useEffect(() => {
        const handleSessionSocketUpdate = (data) => {
            console.log('[Socket] 📡 Active session update received:', data);
            fetchSessions(true); // Silent re-fetch in background
        };

        // Initialize listener
        import("@/lib/socket").then(({ onSocketEvent, offSocketEvent }) => {
            onSocketEvent("session_update", handleSessionSocketUpdate);
        });

        return () => {
            import("@/lib/socket").then(({ offSocketEvent }) => {
                offSocketEvent("session_update", handleSessionSocketUpdate);
            });
        };
    }, [filterState, filterType]);

    // Fallback Background Poll (every 30 seconds)
    useEffect(() => {
        if (!autoSync) return;
        const interval = setInterval(() => {
            fetchSessions(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [autoSync, filterState, filterType]);

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

    const handleCurrentDeviceClick = () => {
        alert("This is your active session. You cannot disconnect your current device from here.");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
            {/* Top Navigation & Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                    onClick={() => router.back()}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, borderRadius: 10 }}
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Dashboard &nbsp;/&nbsp; Operations &nbsp;/&nbsp; <strong style={{ color: 'var(--text-primary)' }}>Active Sessions</strong>
                </div>
            </div>

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, margin: 0 }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Real-Time Active Sessions</h2>
                    <p style={{ marginTop: 4 }}>Monitor live multi-device PC & Mobile sessions across all states</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => setAutoSync(!autoSync)}
                        className={`btn ${autoSync ? 'btn-success' : 'btn-secondary'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '8px 16px', borderRadius: 10 }}
                    >
                        <Radio size={14} className={autoSync ? 'animate-pulse' : ''} />
                        {autoSync ? 'Live Sync: ON (30s)' : 'Live Sync: OFF'}
                    </button>
                    <button
                        onClick={() => fetchSessions()}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '8px 16px', borderRadius: 10 }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Live Sync Status Banner */}
            {lastSyncTime && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: autoSync ? '#10B981' : '#F59E0B', display: 'inline-block' }}></span>
                    {autoSync ? 'Real-time live updates active' : 'Auto-sync paused'}&nbsp;•&nbsp;Last updated at {lastSyncTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            )}

            {/* Metrics Bar */}
            <div className="stats-grid" style={{ gap: '20px' }}>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-card-header" style={{ marginBottom: 12 }}>
                        <div className="stat-card-icon green"><Globe size={22} /></div>
                    </div>
                    <div className="stat-card-value" style={{ fontSize: '28px' }}>{sessions.totalActive}</div>
                    <div className="stat-card-label">Total Active Devices</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-card-header" style={{ marginBottom: 12 }}>
                        <div className="stat-card-icon purple"><Shield size={22} /></div>
                    </div>
                    <div className="stat-card-value" style={{ fontSize: '28px' }}>{sessions.adminSessions.length}</div>
                    <div className="stat-card-label">Admin Staff Sessions</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-card-header" style={{ marginBottom: 12 }}>
                        <div className="stat-card-icon blue"><Smartphone size={22} /></div>
                    </div>
                    <div className="stat-card-value" style={{ fontSize: '28px' }}>{sessions.userSessions.length}</div>
                    <div className="stat-card-label">Client / Patient Sessions</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Filter Type:</label>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-select"
                        style={{ width: 160, borderRadius: 8, padding: '6px 12px' }}
                    >
                        <option value="all">All Sessions</option>
                        <option value="admin">Admin Staff Only</option>
                        <option value="user">Clients Only</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>State:</label>
                    <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="form-select"
                        style={{ width: 160, borderRadius: 8, padding: '6px 12px' }}
                    >
                        <option value="">All States</option>
                        <option value="Delhi">Delhi NCR</option>
                        <option value="UP">Uttar Pradesh</option>
                        <option value="MH">Maharashtra</option>
                        <option value="KA">Karnataka</option>
                    </select>
                </div>
            </div>

            {/* Sessions Table / Cards */}
            <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="card-body" style={{ padding: 0 }}>
                    {loading && allSessionList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent-primary)' }} />
                            Loading active device sessions...
                        </div>
                    ) : allSessionList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--text-muted)' }} />
                            No active sessions matching filter criteria
                        </div>
                    ) : (
                        <>
                            {/* Desktop View Table */}
                            <div className="desktop-only-table" style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600 }}>User & Role</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600 }}>Device & OS</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600 }}>IP & Location</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600 }}>Last Active</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allSessionList.map((s) => {
                                            const isCurrent = s.id === currentSessionId;
                                            return (
                                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                                    <td style={{ padding: '18px 20px' }}>
                                                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: '14px' }}>{s.name}</div>
                                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.email || s.phone || s.uniqueUserId}</div>
                                                        <span className={`badge ${s.sessionType === 'ADMIN' ? 'badge-purple' : 'badge-info'}`} style={{ marginTop: 6 }}>
                                                            {s.sessionType === 'ADMIN' ? (s.role || 'ADMIN') : 'CLIENT'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '18px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {getDeviceIcon(s.deviceType)}
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: '13px' }}>{s.deviceType}</div>
                                                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.browser} • {s.os}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '18px 20px' }}>
                                                        <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: '13px' }}>{s.city}, {s.state}</div>
                                                        <code style={{ fontSize: 11, color: "var(--text-muted)", display: 'block', marginTop: 4 }}>{s.ipAddress}</code>
                                                    </td>
                                                    <td style={{ padding: '18px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {new Date(s.lastActiveAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </td>
                                                    <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                                                        {isCurrent ? (
                                                            <span 
                                                                className="badge badge-success" 
                                                                style={{ padding: '8px 16px', borderRadius: 8, fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--accent-primary)', display: 'inline-block' }}
                                                                onClick={handleCurrentDeviceClick}
                                                            >
                                                                Current Device
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleTerminate(s.id, s.sessionType)}
                                                                className="btn btn-sm btn-danger"
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8 }}
                                                            >
                                                                <XCircle size={14} />
                                                                Disconnect
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View Cards */}
                            <div className="mobile-only-cards" style={{ display: 'none', padding: '20px', flexDirection: 'column', gap: '16px' }}>
                                {allSessionList.map((s) => {
                                    const isCurrent = s.id === currentSessionId;
                                    return (
                                        <div key={s.id} style={{ padding: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{s.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.email || s.phone || s.uniqueUserId}</div>
                                                    <span className={`badge ${s.sessionType === 'ADMIN' ? 'badge-purple' : 'badge-info'}`} style={{ marginTop: 6 }}>
                                                        {s.sessionType === 'ADMIN' ? (s.role || 'ADMIN') : 'CLIENT'}
                                                    </span>
                                                </div>
                                                {isCurrent ? (
                                                    <span 
                                                        className="badge badge-success" 
                                                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--accent-primary)' }}
                                                        onClick={handleCurrentDeviceClick}
                                                    >
                                                        Current Device
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleTerminate(s.id, s.sessionType)}
                                                        className="btn btn-sm btn-danger"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, borderRadius: 8 }}
                                                    >
                                                        <XCircle size={12} /> Disconnect
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: 12 }}>
                                                <div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Device & OS</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        {getDeviceIcon(s.deviceType)}
                                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.deviceType} ({s.os})</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Location & IP</div>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginTop: 4 }}>{s.city}, {s.state}</div>
                                                    <code style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>{s.ipAddress}</code>
                                                </div>
                                            </div>

                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                <span>Last Active:</span>
                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {new Date(s.lastActiveAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Responsive Media Query Helper */}
            <style jsx global>{`
                @media (max-width: 768px) {
                    .desktop-only-table {
                        display: none !important;
                    }
                    .mobile-only-cards {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
}
