"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Tablet, Globe, Shield, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/hooks";

export default function ActiveSessionsPage() {
    const [sessions, setSessions] = useState({ totalActive: 0, adminSessions: [], userSessions: [] });
    const [loading, setLoading] = useState(true);
    const [filterState, setFilterState] = useState("");
    const [filterType, setFilterType] = useState("all");

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (filterType !== "all") query.append("type", filterType);
            if (filterState) query.append("state", filterState);

            const res = await fetch(`/api/sessions/active?${query.toString()}`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.data);
            } else {
                showToast(data.message || "Failed to load active sessions", "error");
            }
        } catch (err) {
            showToast("Network error loading sessions", "error");
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
            const res = await fetch(`/api/sessions/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (data.success) {
                showToast("Session terminated successfully", "success");
                fetchSessions();
            } else {
                showToast(data.message || "Termination failed", "error");
            }
        } catch (err) {
            showToast("Error terminating session", "error");
        }
    };

    const getDeviceIcon = (deviceType) => {
        if (deviceType === "Mobile") return <Smartphone className="w-5 h-5 text-emerald-600" />;
        if (deviceType === "Tablet") return <Tablet className="w-5 h-5 text-blue-600" />;
        return <Monitor className="w-5 h-5 text-indigo-600" />;
    };

    const allSessionList = [
        ...sessions.adminSessions.map(s => ({ ...s, sessionType: 'ADMIN' })),
        ...sessions.userSessions.map(s => ({ ...s, sessionType: 'USER' }))
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Monitor className="w-7 h-7 text-indigo-600" />
                        Real-Time Active Sessions
                    </h1>
                    <p className="text-sm text-gray-5-100 text-gray-500 mt-1">
                        Monitor live multi-device PC & Mobile sessions across all states
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchSessions}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Active Devices</p>
                        <p className="text-3xl font-extrabold text-emerald-900 mt-1">{sessions.totalActive}</p>
                    </div>
                    <Globe className="w-8 h-8 text-emerald-500 opacity-80" />
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Admin Staff Sessions</p>
                        <p className="text-3xl font-extrabold text-indigo-900 mt-1">{sessions.adminSessions.length}</p>
                    </div>
                    <Shield className="w-8 h-8 text-indigo-500 opacity-80" />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Client / Patient Sessions</p>
                        <p className="text-3xl font-extrabold text-blue-900 mt-1">{sessions.userSessions.length}</p>
                    </div>
                    <Smartphone className="w-8 h-8 text-blue-500 opacity-80" />
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Filter Type:</label>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Sessions</option>
                        <option value="admin">Admin Staff Only</option>
                        <option value="user">Clients Only</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase">State:</label>
                    <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                        Loading active device sessions...
                    </div>
                ) : allSessionList.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        No active sessions matching filter criteria
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4">User & Role</th>
                                    <th className="py-3.5 px-4">Device & OS</th>
                                    <th className="py-3.5 px-4">IP & Location</th>
                                    <th className="py-3.5 px-4">Last Active</th>
                                    <th className="py-3.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allSessionList.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-gray-900">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.email || s.phone || s.uniqueUserId}</div>
                                            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                s.sessionType === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {s.sessionType === 'ADMIN' ? (s.role || 'ADMIN') : 'CLIENT'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                {getDeviceIcon(s.deviceType)}
                                                <div>
                                                    <div className="font-medium text-gray-800">{s.deviceType}</div>
                                                    <div className="text-xs text-gray-500">{s.browser} • {s.os}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-medium text-gray-800">{s.city}, {s.state}</div>
                                            <div className="text-xs text-gray-500 font-mono">{s.ipAddress}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-gray-600">
                                            {new Date(s.lastActiveAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => handleTerminate(s.id, s.sessionType)}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Disconnect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
