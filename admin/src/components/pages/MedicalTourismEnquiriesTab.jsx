"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, X, Phone, Mail, Calendar, FileText, ExternalLink } from "lucide-react";
import { medicalTourismAPI, adminAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

const STATUS_OPTIONS = [
    { value: "NEW", label: "New" },
    { value: "PAYMENT_PENDING", label: "Payment Pending" },
    { value: "PAID", label: "Paid" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "CONTACTED", label: "Contacted" },
    { value: "DOCUMENTS_REQUESTED", label: "Documents Requested" },
    { value: "CONSULTATION_SCHEDULED", label: "Consultation Scheduled" },
    { value: "CLOSED", label: "Closed" },
];

const STATUS_COLORS = {
    NEW: "badge-info",
    PAYMENT_PENDING: "badge-warning",
    PAID: "badge-success",
    UNDER_REVIEW: "badge-warning",
    CONTACTED: "badge-info",
    DOCUMENTS_REQUESTED: "badge-warning",
    CONSULTATION_SCHEDULED: "badge-success",
    CLOSED: "badge-default",
};

const statusLabel = (val) => STATUS_OPTIONS.find(s => s.value === val)?.label || val || "New";

export default function MedicalTourismEnquiriesTab() {
    const [enquiries, setEnquiries] = useState([]);
    const [coordinators, setCoordinators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadEnquiries = useCallback(async () => {
        try {
            setLoading(true);
            const res = await medicalTourismAPI.getEnquiries({
                ...(searchQuery.trim() && { search: searchQuery.trim() }),
                ...(statusFilter && { status: statusFilter }),
                limit: 100,
            });
            setEnquiries(res.data?.data || []);
        } catch (e) {
            console.error(e);
            showToast("Failed to load enquiries", "error");
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => { loadEnquiries(); }, [loadEnquiries]);
    useEffect(() => {
        adminAPI.getAll().then(res => setCoordinators(res.data?.data || [])).catch(() => {});
    }, []);

    const openDetail = (booking) => setSelected(booking);
    const closeDetail = () => setSelected(null);

    const handleUpdate = async (bookingId, patch) => {
        try {
            setSaving(true);
            await medicalTourismAPI.updateEnquiry(bookingId, patch);
            showToast("Enquiry updated", "success");
            await loadEnquiries();
            setSelected(prev => prev && prev.id === bookingId
                ? { ...prev, medicalTourismEnquiry: { ...prev.medicalTourismEnquiry, ...patch } }
                : prev);
        } catch (e) {
            console.error(e);
            showToast("Failed to update enquiry", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 260, display: "flex", alignItems: "center" }}>
                    <Search size={18} className="text-muted" style={{ position: "absolute", left: 12 }} />
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: 38, margin: 0, height: 40 }}
                        placeholder="Search by patient name or enquiry ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <select className="form-input" style={{ margin: 0, height: 40, width: 220 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {loading && enquiries.length === 0 ? (
                <p className="text-muted">Loading enquiries...</p>
            ) : enquiries.length === 0 ? (
                <p className="text-muted">No Medical Tourism enquiries yet.</p>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Enquiry ID</th>
                                <th>Patient</th>
                                <th>Requirement</th>
                                <th>Payment</th>
                                <th>Status</th>
                                <th>Coordinator</th>
                                <th>Received</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {enquiries.map(b => {
                                const enquiry = b.medicalTourismEnquiry;
                                const requirement = b.formDataJson?.requirement_type;
                                return (
                                    <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => openDetail(b)}>
                                        <td style={{ fontWeight: 600 }}>{b.bookingCode}</td>
                                        <td>{b.user?.name || "—"}</td>
                                        <td style={{ textTransform: "capitalize" }}>{(requirement || "").replace(/_/g, " ") || "—"}</td>
                                        <td>
                                            <span className={`badge ${b.paymentStatus === "SUCCESS" ? "badge-success" : "badge-warning"}`}>
                                                {b.paymentStatus === "SUCCESS" ? formatCurrency(b.amount) : b.paymentStatus}
                                            </span>
                                        </td>
                                        <td><span className={`badge ${STATUS_COLORS[enquiry?.status] || "badge-info"}`}>{statusLabel(enquiry?.status)}</span></td>
                                        <td>{enquiry?.assignedCoordinator?.name || <span className="text-muted">Unassigned</span>}</td>
                                        <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                                        <td><ExternalLink size={14} className="text-muted" /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <EnquiryDetailDrawer
                    booking={selected}
                    coordinators={coordinators}
                    saving={saving}
                    onUpdate={handleUpdate}
                    onClose={closeDetail}
                />
            )}
        </div>
    );
}

function EnquiryDetailDrawer({ booking, coordinators, saving, onUpdate, onClose }) {
    const enquiry = booking.medicalTourismEnquiry;
    const form = booking.formDataJson || {};
    const [status, setStatus] = useState(enquiry?.status || "NEW");
    const [coordinatorId, setCoordinatorId] = useState(enquiry?.assignedCoordinatorId || "");
    const [notes, setNotes] = useState(enquiry?.internalNotes || "");
    const [followUpDate, setFollowUpDate] = useState(
        enquiry?.followUpDate ? new Date(enquiry.followUpDate).toISOString().slice(0, 10) : ""
    );

    const fieldLabel = (key) => key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const skipKeys = new Set(["requirement_type", "medical_reports", "disclaimer_banner", "consent_contact", "consent_share_info", "consent_privacy", "attachments", "comments"]);

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
            <div style={{ background: "var(--bg-card, #fff)", width: 460, maxWidth: "100%", height: "100%", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{booking.bookingCode}</h3>
                        <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{new Date(booking.createdAt).toLocaleString()}</p>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                    <h4 style={{ marginTop: 0, fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)" }}>Patient</h4>
                    <p style={{ margin: "4px 0", fontWeight: 600 }}>{form.patient_name || booking.user?.name}</p>
                    <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><Phone size={13} /> {form.mobile_number || booking.user?.phone}</p>
                    <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><Mail size={13} /> {form.email || booking.user?.email}</p>
                    {form.country && <p style={{ margin: "4px 0", fontSize: 13 }}>Country: {form.country}</p>}
                    {form.preferred_contact_method && <p style={{ margin: "4px 0", fontSize: 13 }}>Prefers: {form.preferred_contact_method}</p>}
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                    <h4 style={{ marginTop: 0, fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)" }}>Medical Requirement</h4>
                    <p style={{ margin: "4px 0", textTransform: "capitalize", fontWeight: 600 }}>{(form.requirement_type || "").replace(/_/g, " ") || "—"}</p>
                    {Object.entries(form).filter(([k, v]) => !skipKeys.has(k) && v && typeof v === "string" && k !== "patient_name" && k !== "mobile_number" && k !== "email" && k !== "country" && k !== "preferred_contact_method").map(([k, v]) => (
                        <p key={k} style={{ margin: "4px 0", fontSize: 13 }}><strong>{fieldLabel(k)}:</strong> {v}</p>
                    ))}
                    {Array.isArray(form.travel_support_needs) && form.travel_support_needs.length > 0 && (
                        <p style={{ margin: "4px 0", fontSize: 13 }}><strong>Travel Support:</strong> {form.travel_support_needs.join(", ")}</p>
                    )}
                </div>

                {Array.isArray(form.medical_reports) && form.medical_reports.length > 0 && (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h4 style={{ marginTop: 0, fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)" }}>Documents</h4>
                        {form.medical_reports.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, margin: "4px 0" }}>
                                <FileText size={13} /> Document {i + 1}
                            </a>
                        ))}
                    </div>
                )}

                <div className="card">
                    <h4 style={{ marginTop: 0, fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)" }}>Tracking</h4>

                    <div className="form-group">
                        <label className="form-label text-xs">Status</label>
                        <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label text-xs">Assigned Coordinator</label>
                        <select className="form-input" value={coordinatorId} onChange={e => setCoordinatorId(e.target.value)}>
                            <option value="">Unassigned</option>
                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label text-xs" style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> Follow-up Date</label>
                        <input type="date" className="form-input" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label text-xs">Internal Notes</label>
                        <textarea
                            className="form-input"
                            rows={4}
                            placeholder="Coordinator notes, hospital/provider communication..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        disabled={saving}
                        onClick={() => onUpdate(booking.id, {
                            status,
                            assignedCoordinatorId: coordinatorId || null,
                            internalNotes: notes,
                            followUpDate: followUpDate || null,
                        })}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
