"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Mail, MapPin, Calendar } from "lucide-react";
import { waitlistAPI } from "@/lib/api";
import { formatDate } from "@/lib/hooks";

const SOURCE_LABELS = {
    city_selection: { label: 'City Launch', color: 'badge-purple' },
    wellness_page:  { label: 'Wellness',    color: 'badge-info'   },
};

export default function WaitlistPage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState("all");

    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);
            const res = await waitlistAPI.getAll();
            setLeads(res.data?.data || []);
        } catch (e) {
            console.error("Failed to load waitlist:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    const filteredLeads = leads.filter(l => {
        const matchesSearch =
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.email.toLowerCase().includes(search.toLowerCase()) ||
            (l.city && l.city.toLowerCase().includes(search.toLowerCase()));
        const matchesSource = sourceFilter === 'all' || l.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    const cityCount     = leads.filter(l => l.source === 'city_selection').length;
    const wellnessCount = leads.filter(l => l.source === 'wellness_page').length;

    return (
        <div>
            <div className="page-header">
                <h2>Waitlist & City Demand</h2>
                <p>Users who requested to be notified when Oldful launches in their city or wellness feature goes live.</p>
            </div>

            {/* Stats row */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-value">{leads.length}</div>
                    <div className="stat-label">Total Leads</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{cityCount}</div>
                    <div className="stat-label">City Launch Requests</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{wellnessCount}</div>
                    <div className="stat-label">Wellness Waitlist</div>
                </div>
            </div>

            <div className="filter-bar">
                <div style={{ position: "relative", flex: 1, maxWidth: 350 }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search by name, email, or city..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="form-select" style={{ width: 180 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                    <option value="all">All Sources</option>
                    <option value="city_selection">City Launch Requests</option>
                    <option value="wellness_page">Wellness Waitlist</option>
                </select>
                <button onClick={loadLeads} className="btn btn-secondary">Refresh</button>
                <div style={{ flex: 1 }} />
                <div className="text-sm text-muted">Showing: <strong>{filteredLeads.length}</strong></div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>City Requested</th>
                                <th>Source</th>
                                <th>Joined At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: 48 }}>No leads found</td></tr>
                            ) : (
                                filteredLeads.map(lead => {
                                    const src = SOURCE_LABELS[lead.source] || { label: lead.source, color: 'badge-default' };
                                    return (
                                        <tr key={lead.id}>
                                            <td style={{ fontWeight: 600 }}>{lead.name}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-muted" />
                                                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                                                </div>
                                            </td>
                                            <td>
                                                {lead.city ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-muted" />
                                                        {lead.city}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <span className={`badge ${src.color}`} style={{ fontSize: 10 }}>{src.label}</span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className="text-muted" />
                                                    {formatDate(lead.createdAt)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
