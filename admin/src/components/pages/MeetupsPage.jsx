"use client";
import { useState, useEffect } from "react";
import {
    Plus, Edit2, Trash2, Users, MapPin, Calendar, Clock,
    Search, ChevronDown, ChevronUp, X, Eye, EyeOff,
    Star, Tag, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import { meetupAPI } from "@/lib/api";
import { showToast, formatDate } from "@/lib/hooks";

const STATUS_COLORS = {
    CONFIRMED: { bg: "#D1FAE5", color: "#065F46" },
    PENDING:   { bg: "#FEF3C7", color: "#92400E" },
    ATTENDED:  { bg: "#EDE9FE", color: "#4C1D95" },
    CANCELLED: { bg: "#FEE2E2", color: "#991B1B" },
};

const EMPTY_FORM = {
    title: "",
    description: "",
    venue: "",
    venueAddress: "",
    city: "",
    pinCode: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    capacity: 50,
    serviceCharge: 299,
    isFeatured: false,
    isActive: true,
    organizerName: "",
    organizerContact: "",
    includedItems: ["Meetup coordination", "Event management support", "Registration handling", "Basic assistance support"],
    extraCharges: ["Snacks", "Transportation", "Personal caregiver support", "Special medical assistance"],
    imageUrl: "",
};

export default function MeetupsPage() {
    const [meetups, setMeetups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Registrations drawer
    const [showRegistrations, setShowRegistrations] = useState(false);
    const [selectedMeetup, setSelectedMeetup] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [regLoading, setRegLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterActive, setFilterActive] = useState("ALL");

    // Tag input helpers
    const [newIncludedItem, setNewIncludedItem] = useState("");
    const [newExtraCharge, setNewExtraCharge] = useState("");

    useEffect(() => { loadMeetups(); }, []);

    async function loadMeetups() {
        try {
            setLoading(true);
            const res = await meetupAPI.getAll();
            setMeetups(res.data?.data || []);
        } catch (e) {
            showToast("Failed to load meetups", "error");
        } finally {
            setLoading(false);
        }
    }

    async function loadRegistrations(meetupId) {
        try {
            setRegLoading(true);
            const res = await meetupAPI.getRegistrations(meetupId);
            setRegistrations(res.data?.data || []);
        } catch (e) {
            showToast("Failed to load registrations", "error");
        } finally {
            setRegLoading(false);
        }
    }

    function openCreate() {
        setEditing(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(meetup) {
        setEditing(meetup);
        const d = new Date(meetup.eventDate);
        const dateStr = d.toISOString().slice(0, 10);
        setForm({
            title: meetup.title || "",
            description: meetup.description || "",
            venue: meetup.venue || "",
            venueAddress: meetup.venueAddress || "",
            city: meetup.city || "",
            pinCode: meetup.pinCode || "",
            eventDate: dateStr,
            startTime: meetup.startTime || "",
            endTime: meetup.endTime || "",
            capacity: meetup.capacity ?? 50,
            serviceCharge: meetup.serviceCharge ?? 299,
            isFeatured: meetup.isFeatured ?? false,
            isActive: meetup.isActive ?? true,
            organizerName: meetup.organizerName || "",
            organizerContact: meetup.organizerContact || "",
            includedItems: meetup.includedItems || [],
            extraCharges: meetup.extraCharges || [],
            imageUrl: meetup.imageUrl || "",
        });
        setShowModal(true);
    }

    function openRegistrations(meetup) {
        setSelectedMeetup(meetup);
        setShowRegistrations(true);
        loadRegistrations(meetup.id);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title || !form.venue || !form.city || !form.eventDate || !form.startTime) {
            showToast("Title, venue, city, date and start time are required", "error");
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await meetupAPI.update(editing.id, form);
                showToast("Meetup updated successfully");
            } else {
                await meetupAPI.create(form);
                showToast("Meetup created successfully");
            }
            setShowModal(false);
            loadMeetups();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to save meetup", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Deactivate this meetup? Existing registrations will not be affected.")) return;
        try {
            await meetupAPI.delete(id);
            showToast("Meetup deactivated");
            loadMeetups();
        } catch (e) {
            showToast("Failed to deactivate", "error");
        }
    }

    async function handleToggle(meetup) {
        try {
            await meetupAPI.update(meetup.id, { isActive: !meetup.isActive });
            showToast(`Meetup ${!meetup.isActive ? "activated" : "deactivated"}`);
            loadMeetups();
        } catch (e) {
            showToast("Failed to update", "error");
        }
    }

    async function handleUpdateRegStatus(regId, status) {
        try {
            await meetupAPI.updateRegistrationStatus(selectedMeetup.id, regId, status);
            showToast("Status updated");
            loadRegistrations(selectedMeetup.id);
        } catch (e) {
            showToast("Failed to update status", "error");
        }
    }

    // Tag helpers
    function addIncludedItem() {
        if (!newIncludedItem.trim()) return;
        setForm(f => ({ ...f, includedItems: [...f.includedItems, newIncludedItem.trim()] }));
        setNewIncludedItem("");
    }
    function removeIncludedItem(i) {
        setForm(f => ({ ...f, includedItems: f.includedItems.filter((_, idx) => idx !== i) }));
    }
    function addExtraCharge() {
        if (!newExtraCharge.trim()) return;
        setForm(f => ({ ...f, extraCharges: [...f.extraCharges, newExtraCharge.trim()] }));
        setNewExtraCharge("");
    }
    function removeExtraCharge(i) {
        setForm(f => ({ ...f, extraCharges: f.extraCharges.filter((_, idx) => idx !== i) }));
    }

    // Filtered meetups
    const filtered = meetups.filter(m => {
        const matchSearch = !searchTerm ||
            m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.venue.toLowerCase().includes(searchTerm.toLowerCase());
        const matchActive =
            filterActive === "ALL" ? true :
            filterActive === "ACTIVE" ? m.isActive :
            filterActive === "INACTIVE" ? !m.isActive :
            filterActive === "FEATURED" ? m.isFeatured : true;
        return matchSearch && matchActive;
    });

    return (
        <div className="page-enter">
            {/* ── Page Header ── */}
            <div className="page-header" style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        padding: 10, backgroundColor: "var(--bg-glass)",
                        borderRadius: 12, border: "1px solid var(--border-color)",
                    }}>
                        <Users size={24} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, color: "var(--text-primary)", fontWeight: 700 }}>
                            Local Meetups
                        </h2>
                        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                            Create and manage senior community events
                        </p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Plus size={16} /> Create Meetup
                </button>
            </div>

            {/* ── Filter Bar ── */}
            <div className="filter-bar" style={{ marginBottom: 24 }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search by title, city, venue..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="form-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
                    <option value="ALL">All Meetups</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="FEATURED">Featured</option>
                </select>
                <div style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
                    {filtered.length} meetup{filtered.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div style={{ display: "grid", gap: 16 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card" style={{ height: 120, opacity: 0.4, animation: "pulse 1.5s infinite" }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                    <Users size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 15 }}>
                        {searchTerm ? "No meetups match your search" : "No meetups yet. Create your first one!"}
                    </p>
                    {!searchTerm && (
                        <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                            <Plus size={15} /> Create Meetup
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: "grid", gap: 16 }}>
                    {filtered.map(meetup => {
                        const eventDate = new Date(meetup.eventDate);
                        const dateStr = eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                        const seatsFilled = meetup.registeredCount ?? 0;
                        const seatsTotal = meetup.capacity;
                        const fillPct = Math.min(100, Math.round((seatsFilled / seatsTotal) * 100));
                        return (
                            <div key={meetup.id} className="card" style={{
                                padding: 0, overflow: "hidden",
                                border: meetup.isFeatured ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-color)",
                                opacity: meetup.isActive ? 1 : 0.65,
                            }}>
                                {/* Card top bar */}
                                <div style={{
                                    background: "linear-gradient(135deg, var(--accent-primary) 0%, #065F46 100%)",
                                    padding: "12px 20px",
                                    display: "flex", alignItems: "center", gap: 10,
                                }}>
                                    {meetup.isFeatured && (
                                        <Star size={14} fill="#fff" color="#fff" />
                                    )}
                                    <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", flex: 1 }}>
                                        {meetup.title}
                                    </span>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600,
                                        background: meetup.isActive ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                                        color: "#fff", borderRadius: 6, padding: "2px 10px",
                                    }}>
                                        {meetup.isActive ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                </div>

                                <div style={{ padding: "16px 20px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "start" }}>
                                        {/* Details */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <Calendar size={14} color="var(--accent-primary)" />
                                                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{dateStr}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <Clock size={14} color="var(--accent-primary)" />
                                                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                                                    {meetup.startTime}{meetup.endTime ? ` – ${meetup.endTime}` : ""}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <MapPin size={14} color="var(--accent-primary)" />
                                                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{meetup.venue}, {meetup.city}</span>
                                            </div>
                                        </div>

                                        {/* Capacity */}
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                                                Registrations
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                                                {seatsFilled} <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>/ {seatsTotal}</span>
                                            </div>
                                            <div style={{
                                                height: 6, borderRadius: 3, backgroundColor: "var(--border-color)",
                                                marginTop: 8, overflow: "hidden",
                                            }}>
                                                <div style={{
                                                    height: "100%", borderRadius: 3,
                                                    width: `${fillPct}%`,
                                                    background: fillPct >= 90 ? "#DC2626" : fillPct >= 70 ? "#D97706" : "var(--accent-primary)",
                                                }} />
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                                {meetup.availableSeats ?? seatsTotal - seatsFilled} seats available
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Service Charge</div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-primary)" }}>
                                                ₹{meetup.serviceCharge}
                                            </div>
                                            {meetup.pinCode && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                                                    <Tag size={12} color="var(--text-muted)" />
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>PIN: {meetup.pinCode}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                                                onClick={() => openRegistrations(meetup)}
                                            >
                                                <Users size={13} /> Registrations
                                            </button>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => openEdit(meetup)}
                                                    style={{
                                                        padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                                                        border: "1px solid var(--border-color)", background: "var(--bg-glass)",
                                                        display: "flex", alignItems: "center", gap: 5, color: "var(--text-primary)",
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={13} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleToggle(meetup)}
                                                    style={{
                                                        padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                                                        border: "1px solid var(--border-color)", background: "var(--bg-glass)",
                                                        display: "flex", alignItems: "center", gap: 5, color: meetup.isActive ? "#D97706" : "var(--accent-primary)",
                                                    }}
                                                    title={meetup.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {meetup.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                                                    {meetup.isActive ? "Disable" : "Enable"}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(meetup.id)}
                                                    style={{
                                                        padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                                                        border: "1px solid #FEE2E2", background: "#FFF5F5",
                                                        display: "flex", alignItems: "center", color: "#DC2626",
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                CREATE / EDIT MODAL
            ══════════════════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 680, width: "95%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>{editing ? "Edit Meetup" : "Create New Meetup"}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                                <X size={20} color="var(--text-muted)" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: "grid", gap: 20 }}>

                                {/* Basic Info */}
                                <div>
                                    <label className="form-label">Title <span style={{ color: "#DC2626" }}>*</span></label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Morning Wellness Meetup at the Park"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        placeholder="Brief description of the meetup..."
                                        style={{ resize: "vertical" }}
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    />
                                </div>

                                {/* Location */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                    <div>
                                        <label className="form-label">Venue Name <span style={{ color: "#DC2626" }}>*</span></label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Cubbon Park"
                                            value={form.venue}
                                            onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">City <span style={{ color: "#DC2626" }}>*</span></label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Bengaluru"
                                            value={form.city}
                                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Venue Address</label>
                                        <input
                                            className="form-input"
                                            placeholder="Full address"
                                            value={form.venueAddress}
                                            onChange={e => setForm(f => ({ ...f, venueAddress: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">PIN Code</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. 560038"
                                            value={form.pinCode}
                                            onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                                    <div>
                                        <label className="form-label">Event Date <span style={{ color: "#DC2626" }}>*</span></label>
                                        <input
                                            className="form-input"
                                            type="date"
                                            value={form.eventDate}
                                            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Start Time <span style={{ color: "#DC2626" }}>*</span></label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. 07:30 AM"
                                            value={form.startTime}
                                            onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">End Time</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. 10:30 AM"
                                            value={form.endTime}
                                            onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Capacity & Pricing */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                    <div>
                                        <label className="form-label">Capacity</label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min={1}
                                            value={form.capacity}
                                            onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 50 }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Service Charge (₹)</label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min={0}
                                            value={form.serviceCharge}
                                            onChange={e => setForm(f => ({ ...f, serviceCharge: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>

                                {/* Organizer */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                    <div>
                                        <label className="form-label">Organizer Name</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Ayuxa Senior Community"
                                            value={form.organizerName}
                                            onChange={e => setForm(f => ({ ...f, organizerName: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Organizer Contact</label>
                                        <input
                                            className="form-input"
                                            placeholder="Phone number"
                                            value={form.organizerContact}
                                            onChange={e => setForm(f => ({ ...f, organizerContact: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Image URL */}
                                <div>
                                    <label className="form-label">Banner Image URL</label>
                                    <input
                                        className="form-input"
                                        placeholder="https://..."
                                        value={form.imageUrl}
                                        onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                                    />
                                </div>

                                {/* Included Items */}
                                <div>
                                    <label className="form-label">Included in Service Charge</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                                        {form.includedItems.map((item, i) => (
                                            <span key={i} style={{
                                                display: "flex", alignItems: "center", gap: 6,
                                                background: "#D1FAE5", color: "#065F46",
                                                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                                            }}>
                                                <CheckCircle size={12} />
                                                {item}
                                                <button type="button" onClick={() => removeIncludedItem(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "#065F46" }}>
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            className="form-input"
                                            placeholder="Add included item..."
                                            value={newIncludedItem}
                                            onChange={e => setNewIncludedItem(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addIncludedItem(); } }}
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-primary" style={{ padding: "0 16px" }} onClick={addIncludedItem}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Extra Charges */}
                                <div>
                                    <label className="form-label">Additional Charges (Extra)</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                                        {form.extraCharges.map((item, i) => (
                                            <span key={i} style={{
                                                display: "flex", alignItems: "center", gap: 6,
                                                background: "#FEE2E2", color: "#991B1B",
                                                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                                            }}>
                                                <XCircle size={12} />
                                                {item}
                                                <button type="button" onClick={() => removeExtraCharge(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "#991B1B" }}>
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            className="form-input"
                                            placeholder="Add extra charge item..."
                                            value={newExtraCharge}
                                            onChange={e => setNewExtraCharge(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addExtraCharge(); } }}
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-primary" style={{ padding: "0 16px" }} onClick={addExtraCharge}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div style={{ display: "flex", gap: 24 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                                            style={{ width: 16, height: 16, accentColor: "var(--accent-primary)" }}
                                        />
                                        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>Active (visible in app)</span>
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={form.isFeatured}
                                            onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
                                            style={{ width: 16, height: 16, accentColor: "var(--accent-primary)" }}
                                        />
                                        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>⭐ Featured (shown in banner)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Saving..." : editing ? "Update Meetup" : "Create Meetup"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                REGISTRATIONS DRAWER
            ══════════════════════════════════════════════ */}
            {showRegistrations && selectedMeetup && (
                <div className="modal-overlay" onClick={() => setShowRegistrations(false)}>
                    <div
                        className="modal"
                        style={{ maxWidth: 760, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Registrations</h3>
                                <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                                    {selectedMeetup.title}
                                </p>
                            </div>
                            <button onClick={() => setShowRegistrations(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                                <X size={20} color="var(--text-muted)" />
                            </button>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
                            {regLoading ? (
                                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                    Loading registrations...
                                </div>
                            ) : registrations.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 40 }}>
                                    <Users size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                                    <p style={{ color: "var(--text-muted)", margin: 0 }}>No registrations yet</p>
                                </div>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                                            {["Booking Code", "Name", "Mobile", "Age / Gender", "Pickup", "Status", "Amount", "Actions"].map(h => (
                                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrations.map(reg => {
                                            const sc = STATUS_COLORS[reg.status] || STATUS_COLORS.PENDING;
                                            return (
                                                <tr key={reg.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 700 }}>
                                                        {reg.bookingCode}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {reg.fullName}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>
                                                        {reg.mobile}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                                                        {reg.age}y · {reg.gender}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                                                        {reg.pickupEnabled ? (
                                                            <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                                                                ✓ {reg.pickupAddress?.slice(0, 20)}{reg.pickupAddress?.length > 20 ? "…" : ""}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "var(--text-muted)" }}>No pickup</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px" }}>
                                                        <span style={{
                                                            fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px",
                                                            backgroundColor: sc.bg, color: sc.color,
                                                        }}>
                                                            {reg.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "var(--accent-primary)" }}>
                                                        ₹{reg.amountPaid}
                                                    </td>
                                                    <td style={{ padding: "10px 12px" }}>
                                                        <select
                                                            style={{
                                                                fontSize: 12, padding: "4px 8px", borderRadius: 6,
                                                                border: "1px solid var(--border-color)", background: "var(--bg-glass)",
                                                                color: "var(--text-primary)", cursor: "pointer",
                                                            }}
                                                            value={reg.status}
                                                            onChange={e => handleUpdateRegStatus(reg.id, e.target.value)}
                                                        >
                                                            <option value="CONFIRMED">Confirmed</option>
                                                            <option value="PENDING">Pending</option>
                                                            <option value="ATTENDED">Attended</option>
                                                            <option value="CANCELLED">Cancelled</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Summary bar */}
                        {registrations.length > 0 && (
                            <div style={{
                                padding: "12px 24px", borderTop: "1px solid var(--border-color)",
                                display: "flex", gap: 24, background: "var(--bg-glass)",
                            }}>
                                {Object.entries(
                                    registrations.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
                                ).map(([status, count]) => {
                                    const sc = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
                                    return (
                                        <div key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: sc.color, display: "inline-block" }} />
                                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{status}: <strong style={{ color: "var(--text-primary)" }}>{count}</strong></span>
                                        </div>
                                    );
                                })}
                                <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                                    Total revenue: <strong style={{ color: "var(--accent-primary)" }}>
                                        ₹{registrations.filter(r => r.status !== "CANCELLED").reduce((s, r) => s + (r.amountPaid || 0), 0).toLocaleString("en-IN")}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
