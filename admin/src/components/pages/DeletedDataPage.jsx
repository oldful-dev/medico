"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, BarChart3, Database, ShieldAlert, Heart, Calendar } from "lucide-react";
import { userAPI, cityAPI, bookingAPI } from "@/lib/api";
import { formatDate, formatDateTime, formatCurrency, showToast } from "@/lib/hooks";

export default function DeletedDataPage() {
    const [users, setUsers] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ cityId: "" });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [metrics, setMetrics] = useState({ totalBookings: 0, totalFees: 0 });
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailTab, setDetailTab] = useState("overview");
    const limit = 20;

    useEffect(() => {
        cityAPI.getAll().then(r => setCities(r.data?.data || [])).catch(() => {});
    }, []);

    const loadDeletedUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                status: "DELETED",
                page,
                limit,
                search: search || undefined,
                cityId: filters.cityId || undefined
            };
            const res = await userAPI.getAll(params);
            setUsers(res.data?.data || []);
            setTotal(res.data?.pagination?.total || res.data?.total || 0);
            if (res.data?.archiveMetrics) {
                setMetrics(res.data.archiveMetrics);
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to load archived records", "error");
        } finally {
            setLoading(false);
        }
    }, [page, filters, search]);

    useEffect(() => {
        loadDeletedUsers();
    }, [loadDeletedUsers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        loadDeletedUsers();
    }

    async function viewUser(id) {
        try {
            const res = await userAPI.getById(id);
            setDetailTab("overview");
            setSelectedUser(res.data?.data);
        } catch (e) {
            showToast("Failed to load archived details", "error");
        }
    }

    function calculateAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    }

    return (
        <div>
            <div className="page-header">
                <h2>Intelligence Column</h2>
                <p>Centralized archive for deleted user accounts, historical data, and retained booking revenue</p>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', p: 10, padding: 12, borderRadius: 10 }}>
                            <ShieldAlert size={28} style={{ color: 'var(--accent-danger)' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{total}</h3>
                            <span className="text-muted text-sm">Archived User Profiles</span>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 12, borderRadius: 10 }}>
                            <Database size={28} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{metrics.totalBookings}</h3>
                            <span className="text-muted text-sm">Historical Bookings Retained</span>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--accent-success)' }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 10 }}>
                            <BarChart3 size={28} style={{ color: 'var(--accent-success)' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{formatCurrency(metrics.totalFees)}</h3>
                            <span className="text-muted text-sm">Total Retained Booking Fees</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="filter-bar">
                <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name, phone, ID..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary"><Search size={16} /></button>
                </form>
                <select className="form-select" style={{ width: 150 }} value={filters.cityId} onChange={e => { setFilters({ ...filters, cityId: e.target.value }); setPage(1); }}>
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Anonymized Name</th>
                                <th>Phone Reference</th>
                                <th>City</th>
                                <th>Deleted At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Loading archived records...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: 24 }}>No deleted profiles found</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id}>
                                        <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{u.uniqueUserId}</code></td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{u.name}</td>
                                        <td className="text-sm">{u.phone}</td>
                                        <td className="text-sm">{u.city?.name || "—"}</td>
                                        <td className="text-sm">{u.deletedAt ? formatDateTime(u.deletedAt) : formatDate(u.updatedAt)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" onClick={() => viewUser(u.id)}>
                                                <Eye size={14} style={{ marginRight: 4 }} /> View History
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {total > limit && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                        <button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}

            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}>
                        <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#4B5563", display: "flex", alignItems: "center", justify: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 14 }}>
                                ARC
                            </div>
                            <h3 style={{ margin: 0 }}>Archived Account History — {selectedUser.uniqueUserId}</h3>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            
                            {/* Modal Tabs */}
                            <div className="tabs" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-color)", paddingBottom: 8, marginBottom: 8, overflowX: "auto" }}>
                                {["overview", "bookings", "lab-orders", "payments"].map(tab => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={`tab ${detailTab === tab ? "active" : ""}`}
                                        onClick={() => setDetailTab(tab)}
                                        style={{
                                            padding: "6px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            borderRadius: 4,
                                            border: "none",
                                            cursor: "pointer",
                                            background: detailTab === tab ? "var(--accent-primary)" : "transparent",
                                            color: detailTab === tab ? "#fff" : "var(--text-muted)"
                                        }}
                                    >
                                        {tab.toUpperCase().replace("-", " ")}
                                    </button>
                                ))}
                            </div>

                            {detailTab === "overview" && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Unique User ID</label><div className="text-sm">{selectedUser.uniqueUserId}</div></div>
                                        <div className="form-group"><label className="form-label">Phone (PII Redacted)</label><div className="text-sm">{selectedUser.phone}</div></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Email (PII Redacted)</label><div className="text-sm">{selectedUser.email || "—"}</div></div>
                                        <div className="form-group"><label className="form-label">City Location</label><div className="text-sm">{selectedUser.city?.name || "—"}</div></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label className="form-label">Gender</label><div className="text-sm">{selectedUser.gender || "—"}</div></div>
                                        <div className="form-group"><label className="form-label">Age at Archival</label><div className="text-sm">{calculateAge(selectedUser.dateOfBirth) || "—"} {calculateAge(selectedUser.dateOfBirth) ? "years" : ""}</div></div>
                                    </div>
                                    <div className="form-group" style={{ background: "rgba(239, 68, 68, 0.05)", padding: 12, borderRadius: 8, border: "1px dashed rgba(239, 68, 68, 0.2)" }}>
                                        <div style={{ color: "var(--accent-danger)", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Archival Record Notice</div>
                                        <div className="text-xs text-muted">This profile was soft-deleted and all personally identifiable information (PII) has been fully redacted for data privacy compliance. All historical transactional and medical logs are archived here.</div>
                                    </div>
                                </>
                            )}

                            {detailTab === "bookings" && (
                                <div className="form-group">
                                    <label className="form-label">Archived Service Bookings</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {(!selectedUser.bookings || selectedUser.bookings.length === 0) ? <div className="text-muted text-sm">No bookings found</div> :
                                            selectedUser.bookings.map((booking, i) => (
                                                <div key={i} style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 8, fontSize: 13 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{booking.bookingCode} - {booking.service?.name}</span>
                                                        <span className="badge badge-info" style={{ fontSize: 10 }}>{booking.status}</span>
                                                    </div>
                                                    <div>Price: {formatCurrency(booking.totalPrice)} • Created: {formatDate(booking.createdAt)}</div>
                                                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Scheduled Date: {formatDate(booking.scheduledDate)}</div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {detailTab === "lab-orders" && (
                                <div className="form-group">
                                    <label className="form-label">Archived Lab Orders</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {(!selectedUser.labOrders || selectedUser.labOrders.length === 0) ? <div className="text-muted text-sm">No lab orders found</div> :
                                            selectedUser.labOrders.map((lo, i) => (
                                                <div key={i} style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 8, fontSize: 13 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Ref: {lo.clientRefId || lo.id}</span>
                                                        <span className="badge badge-warning" style={{ fontSize: 10 }}>{lo.status}</span>
                                                    </div>
                                                    <div>Total Price: {formatCurrency(lo.totalPrice || lo.amount)} • Date: {formatDate(lo.createdAt)}</div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {detailTab === "payments" && (
                                <div className="form-group">
                                    <label className="form-label">Archived Transaction Ledger</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {(!selectedUser.payments || selectedUser.payments.length === 0) ? <div className="text-muted text-sm">No payments recorded</div> :
                                            selectedUser.payments.map((p, i) => (
                                                <div key={i} style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 8, fontSize: 13 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>ID: {p.razorpayPaymentId || p.id}</span>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            <span className="badge badge-success" style={{ fontSize: 10 }}>{p.status}</span>
                                                            {p.bookingId && p.status === 'SUCCESS' && (
                                                                <a href={bookingAPI.getInvoiceDownloadUrl(p.bookingId)} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} title="Download Invoice PDF">Download Invoice</a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>Amount: {formatCurrency(p.amount)} • Purpose: {p.purpose || "Booking Payment"}</div>
                                                    {p.invoice?.invoiceNumber && (
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                                            Invoice No: <code style={{ color: "var(--accent-primary-light)" }}>{p.invoice.invoiceNumber}</code>
                                                        </div>
                                                    )}
                                                    <div>Date: {formatDate(p.createdAt)}</div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
