"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Mail, MapPin, Calendar, ExternalLink } from "lucide-react";
import { waitlistAPI } from "@/lib/api";
import { formatDate } from "@/lib/hooks";

export default function WaitlistPage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(search.toLowerCase()) || 
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        (l.city && l.city.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div>
            <div className="page-header">
                <h2>Wellness Waitlist</h2>
                <p>Manage and export leads from the Wellness "Coming Soon" page campaign.</p>
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
                <button onClick={loadLeads} className="btn btn-secondary">Refresh</button>
                <div style={{ flex: 1 }}></div>
                <div className="text-sm text-muted">Total Leads: <strong>{filteredLeads.length}</strong></div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>City</th>
                                <th>Source</th>
                                <th>Joined At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 48 }}>No leads found</td></tr>
                            ) : (
                                filteredLeads.map(lead => (
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
                                            <span className="badge badge-default" style={{ fontSize: 10 }}>{lead.source}</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={14} className="text-muted" />
                                                {formatDate(lead.createdAt)}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" title="View Details">
                                                <ExternalLink size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
