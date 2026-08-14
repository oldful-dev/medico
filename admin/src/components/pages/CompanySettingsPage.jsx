"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Building2, Phone, Mail, Save, Bell, Briefcase, Plus, Edit2, Trash2, X
} from "lucide-react";
import { uiConfigAPI, profilesAPI, cityAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import GCSUpload from "@/components/GCSUpload";

// Contact Details and Notifications only — all public ayuxacare.com website
// content (About, Blogs, Careers, Community, Reviews & Partners) moved to
// WebsiteSettingsPage.jsx (Operations > All Website Settings). Both pages
// share the same backend record (UIConfig key "company_global_config"), so
// saves here still round-trip the full formData shape to avoid clobbering
// the website-content fields on write.
export default function CompanySettingsPage() {
    const [activeSubTab, setActiveSubTab] = useState("contact");
    const [configId, setConfigId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        company_name: "Ayuxa Health Tech Platforms Pvt. Ltd.",
        address: "",
        official_contact: "",
        customer_care: "",
        emails: {
            support: "support@ayuxacare.com",
            investor: "office@ayuxa.co.in",
            careers: "careers@ayuxa.co.in",
            enquiries: "ho@ayuxa.co.in"
        },
        careers_list: [],
        community_content: {
            title: "Ayuxa Care Community",
            description: "Engaging, educating, and supporting senior health and wellness throughout the community.",
            charity_initiatives: []
        },
        blogs_content: {
            posts: [],
            featured: {
                title: "",
                excerpt: "",
                image: "",
                content: ""
            }
        },
        about_html: "",
        blogs_html: "",
        show_reviews: true,
        partners_list: [],
        reviews_list: [],
        notifications: {
            booking: { sms: '', whatsapp: '', email: '' },
            careers: { email: '' }
        }
    });

    // ── Team Management State (synced with website /team via profilesAPI type=management) ──
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [cities, setCities] = useState([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [teamFormData, setTeamFormData] = useState({});
    const [isSavingMember, setIsSavingMember] = useState(false);

    const loadTeamMembers = useCallback(async () => {
        try {
            setTeamLoading(true);
            const res = await profilesAPI.getAll({ role: 'management', limit: 100 });
            if (res.data.success) setTeamMembers(res.data.data);
        } catch (e) {
            showToast("Failed to fetch team members", "error");
        } finally {
            setTeamLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeSubTab === "team") {
            loadTeamMembers();
            cityAPI.getAll().then(res => {
                if (res.data.success) setCities(res.data.data);
            }).catch(() => {});
        }
    }, [activeSubTab, loadTeamMembers]);

    const parseDocs = (documentsJson) => {
        if (!documentsJson) return {};
        try {
            return typeof documentsJson === 'string' ? JSON.parse(documentsJson) : documentsJson;
        } catch {
            return {};
        }
    };

    const openAddTeamModal = () => {
        setEditingMember(null);
        setTeamFormData({ cityId: cities[0]?.id || '' });
        setShowTeamModal(true);
    };

    const openEditTeamModal = (member) => {
        const docs = parseDocs(member.documentsJson);
        setEditingMember(member);
        setTeamFormData({
            name: member.name,
            email: member.email,
            cityId: cities.find(c => c.name === member.city)?.id || '',
            role: docs.title || member.role,
            profileImageUrl: member.profileImageUrl,
            documentsJson: {
                title: docs.title || '',
                linkedin: docs.linkedin || '',
                fullBio: Array.isArray(docs.fullBio) ? docs.fullBio.join('\n\n') : (docs.fullBio || ''),
            }
        });
        setShowTeamModal(true);
    };

    const handleTeamSave = async (e) => {
        e.preventDefault();
        setIsSavingMember(true);
        try {
            const docs = teamFormData.documentsJson || {};
            const payload = {
                ...teamFormData,
                documentsJson: {
                    title: docs.title || '',
                    linkedin: docs.linkedin || '',
                    fullBio: (docs.fullBio || '').split('\n\n').map(p => p.trim()).filter(Boolean),
                }
            };

            if (editingMember) {
                const res = await profilesAPI.update(editingMember.id, 'management', payload);
                if (res.data.success) {
                    showToast("Team member updated — live on website", "success");
                }
            } else {
                const res = await profilesAPI.create('management', payload);
                if (res.data.success) {
                    showToast("Team member added — live on website", "success");
                }
            }
            setShowTeamModal(false);
            setEditingMember(null);
            setTeamFormData({});
            loadTeamMembers();
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to save team member", "error");
        } finally {
            setIsSavingMember(false);
        }
    };

    const handleTeamDelete = async (id) => {
        if (!confirm("Remove this team member from the website? This cannot be undone.")) return;
        try {
            await profilesAPI.delete(id, 'management');
            showToast("Team member removed", "success");
            loadTeamMembers();
        } catch (err) {
            showToast("Delete failed", "error");
        }
    };

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const res = await uiConfigAPI.getAll();
                if (res.data.success) {
                    const found = res.data.data.find(c => c.key === "company_global_config");
                    if (found) {
                        setConfigId(found.id);
                        let parsedJson = found.configJson;
                        if (typeof parsedJson === "string") {
                            try { parsedJson = JSON.parse(parsedJson); } catch (_) {}
                        }
                        setFormData(prev => ({
                            ...prev,
                            ...parsedJson,
                            emails: { ...prev.emails, ...(parsedJson?.emails || {}) },
                            careers_list: parsedJson?.careers_list || [],
                            community_content: { ...prev.community_content, ...(parsedJson?.community_content || {}) },
                            blogs_content: {
                                posts: parsedJson?.blogs_content?.posts || [],
                                featured: parsedJson?.blogs_content?.featured || { title: "", excerpt: "", image: "", content: "" }
                            },
                            about_html: parsedJson?.about_html || "",
                            blogs_html: parsedJson?.blogs_html || "",
                            show_reviews: parsedJson?.show_reviews !== undefined ? parsedJson.show_reviews : true,
                            partners_list: parsedJson?.partners_list || prev.partners_list,
                            reviews_list: parsedJson?.reviews_list || prev.reviews_list,
                            notifications: {
                                booking: {
                                    sms:      parsedJson?.notifications?.booking?.sms      || '',
                                    whatsapp: parsedJson?.notifications?.booking?.whatsapp  || '',
                                    email:    parsedJson?.notifications?.booking?.email     || '',
                                },
                                careers: {
                                    email: parsedJson?.notifications?.careers?.email || '',
                                },
                            },
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load company global config:", err);
                showToast("Failed to load settings", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                type: "CUSTOM",
                key: "company_global_config",
                label: "Company Global Settings",
                configJson: formData,
                isVisible: true
            };

            if (configId) {
                // Update existing
                await uiConfigAPI.update(configId, payload);
                await uiConfigAPI.publish(configId);
            } else {
                // Create new
                const createRes = await uiConfigAPI.create(payload);
                if (createRes.data.success) {
                    setConfigId(createRes.data.data.id);
                    await uiConfigAPI.publish(createRes.data.data.id);
                }
            }
            showToast("Company settings saved and published successfully ✓", "success");
        } catch (err) {
            console.error("Save company config failed:", err);
            showToast("Failed to save settings", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                Loading settings panel...
            </div>
        );
    }

    return (
        <div className="company-settings-page" style={{ color: "var(--text-primary)", fontFamily: "var(--font-primary)" }}>
            <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                <div className="title-group">
                    <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Company Settings</h1>
                    <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 14 }}>
                        Manage official contact details and internal notification recipients.
                    </p>
                </div>
                <div>
                    <button className="btn-primary" onClick={handleSave} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", cursor: "pointer", background: "var(--gradient-primary)", color: "white", boxShadow: "var(--shadow-md)" }}>
                        <Save size={18} /> {isSaving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </header>

            {/* TAB SELECTOR */}
            <div className="subtabs-bar" style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 24 }}>
                <button
                    onClick={() => setActiveSubTab("contact")}
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "contact" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "contact" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "contact" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building2 size={16} /> Contact Details
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab("notifications")}
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "notifications" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "notifications" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "notifications" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Bell size={16} /> Notifications
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab("team")}
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "team" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "team" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "team" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Briefcase size={16} /> Team
                    </div>
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="main-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>

                {/* CONTACT TAB */}
                {activeSubTab === "contact" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company Name</label>
                            <input
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                style={{ width: "100%", padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                            />
                        </div>

                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company Address</label>
                            <textarea
                                rows={3}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Enter official corporate address..."
                                style={{ width: "100%", padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Official Contact Number</label>
                                <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                    <Phone size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                    <input
                                        value={formData.official_contact}
                                        onChange={e => setFormData({ ...formData, official_contact: e.target.value })}
                                        placeholder="+91 94801 98108"
                                        style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                    />
                                </div>
                            </div>
                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Care Number</label>
                                <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                    <Phone size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                    <input
                                        value={formData.customer_care}
                                        onChange={e => setFormData({ ...formData, customer_care: e.target.value })}
                                        placeholder="080 4728 0789"
                                        style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 10, paddingTop: 20 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Corporate Email Directory</h3>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Support Email</label>
                                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                        <Mail size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                        <input
                                            type="email"
                                            value={formData.emails.support}
                                            onChange={e => setFormData({ ...formData, emails: { ...formData.emails, support: e.target.value } })}
                                            placeholder="support@ayuxacare.com"
                                            style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Investor Relations Email</label>
                                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                        <Mail size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                        <input
                                            type="email"
                                            value={formData.emails.investor}
                                            onChange={e => setFormData({ ...formData, emails: { ...formData.emails, investor: e.target.value } })}
                                            placeholder="office@ayuxa.co.in"
                                            style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Careers / Recruitment Email</label>
                                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                        <Mail size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                        <input
                                            type="email"
                                            value={formData.emails.careers}
                                            onChange={e => setFormData({ ...formData, emails: { ...formData.emails, careers: e.target.value } })}
                                            placeholder="careers@ayuxa.co.in"
                                            style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>General Enquiries Email</label>
                                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                        <Mail size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                                        <input
                                            type="email"
                                            value={formData.emails.enquiries}
                                            onChange={e => setFormData({ ...formData, emails: { ...formData.emails, enquiries: e.target.value } })}
                                            placeholder="ho@ayuxa.co.in"
                                            style={{ width: "100%", padding: "12px 12px 12px 38px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeSubTab === "notifications" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                        {/* Info Banner */}
                        <div style={{ display: "flex", gap: 12, padding: 16, background: "rgba(4,131,87,0.06)", border: "1px solid rgba(4,131,87,0.15)", borderRadius: "var(--radius-md)", alignItems: "flex-start" }}>
                            <Bell size={20} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                                <strong>Dynamic Notification Recipients</strong><br/>
                                Configure who receives SMS, WhatsApp, and Email notifications for key booking events.
                                Recipients configured here replace any previously hardcoded numbers. Leaving a field blank disables that channel for admin notifications — it never affects user-facing notifications.
                            </div>
                        </div>

                        {/* Booking Notifications Card */}
                        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 10 }}>
                                <Bell size={16} style={{ color: "var(--accent-primary)" }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Booking Notifications</h3>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Notified on: New booking created, Assigned, Completed, Cancelled</p>
                                </div>
                            </div>
                            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        <Phone size={12} style={{ display: "inline", marginRight: 5 }} />
                                        Booking SMS Number
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+919876543210"
                                        value={formData.notifications?.booking?.sms || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            notifications: {
                                                ...formData.notifications,
                                                booking: { ...formData.notifications?.booking, sms: e.target.value }
                                            }
                                        })}
                                        style={{ width: "100%", padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 14, fontFamily: "inherit" }}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Receives DLT-approved SMS when a booking is created or updated. Use international format.</span>
                                </div>

                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        <Phone size={12} style={{ display: "inline", marginRight: 5 }} />
                                        Booking WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+919876543210"
                                        value={formData.notifications?.booking?.whatsapp || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            notifications: {
                                                ...formData.notifications,
                                                booking: { ...formData.notifications?.booking, whatsapp: e.target.value }
                                            }
                                        })}
                                        style={{ width: "100%", padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 14, fontFamily: "inherit" }}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Receives WhatsApp template messages via WABA when a booking event occurs.</span>
                                </div>

                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        <Mail size={12} style={{ display: "inline", marginRight: 5 }} />
                                        Booking Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="bookings@ayuxacare.com"
                                        value={formData.notifications?.booking?.email || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            notifications: {
                                                ...formData.notifications,
                                                booking: { ...formData.notifications?.booking, email: e.target.value }
                                            }
                                        })}
                                        style={{ width: "100%", padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 14, fontFamily: "inherit" }}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Booking confirmation emails are sent to this address. Can be a shared inbox.</span>
                                </div>
                            </div>
                        </div>

                        {/* Careers Notifications Card */}
                        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 10 }}>
                                <Briefcase size={16} style={{ color: "var(--accent-primary)" }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Career Application Notifications</h3>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Notified when a candidate submits a job application</p>
                                </div>
                            </div>
                            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        <Mail size={12} style={{ display: "inline", marginRight: 5 }} />
                                        Career Application Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="careers@ayuxacare.com"
                                        value={formData.notifications?.careers?.email || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            notifications: {
                                                ...formData.notifications,
                                                careers: { ...formData.notifications?.careers, email: e.target.value }
                                            }
                                        })}
                                        style={{ width: "100%", padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 14, fontFamily: "inherit" }}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>HR inbox that receives career application details when candidates apply via the careers page.</span>
                                </div>
                            </div>
                        </div>

                        {/* Save Reminder */}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button className="btn-primary" onClick={handleSave} disabled={isSaving}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: "var(--radius-md)", fontWeight: 600, border: "none", cursor: "pointer", background: "var(--gradient-primary)", color: "white", boxShadow: "var(--shadow-md)" }}>
                                <Save size={16} /> {isSaving ? "Saving..." : "Save Notification Settings"}
                            </button>
                        </div>
                    </div>
                )}

                {/* TEAM TAB */}
                {activeSubTab === "team" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", gap: 12, padding: 16, background: "rgba(4,131,87,0.06)", border: "1px solid rgba(4,131,87,0.15)", borderRadius: "var(--radius-md)", alignItems: "flex-start" }}>
                            <Briefcase size={20} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                                <strong>Public-Facing Team</strong><br/>
                                Changes here go live immediately on <strong>ayuxacare.com/team</strong> — no separate publish step needed. This manages the same records shown under Management Profiles.
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={openAddTeamModal}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--gradient-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600 }}
                            >
                                <Plus size={18} /> Add Team Member
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {teamLoading ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading team members...</div>
                            ) : teamMembers.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                                    No team members yet. Click &quot;Add Team Member&quot; to feature someone on the website.
                                </div>
                            ) : (
                                teamMembers.map((member) => {
                                    const docs = parseDocs(member.documentsJson);
                                    return (
                                        <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: 14, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                                            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "var(--bg-glass)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--accent-primary)" }}>
                                                {member.profileImageUrl
                                                    ? <img src={member.profileImageUrl} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    : member.name?.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{member.name}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{docs.title || member.role} · {member.city}</div>
                                            </div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button type="button" onClick={() => openEditTeamModal(member)} style={{ padding: 8, background: "var(--bg-glass)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--accent-primary)" }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button type="button" onClick={() => handleTeamDelete(member.id)} style={{ padding: 8, background: "rgba(255,68,68,0.1)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ff4444" }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* TEAM MEMBER MODAL */}
            {showTeamModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editingMember ? "Edit Team Member" : "Add Team Member"}</h3>
                            <button type="button" onClick={() => { setShowTeamModal(false); setEditingMember(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleTeamSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <GCSUpload
                                existingUrl={teamFormData.profileImageUrl}
                                onUploadSuccess={(url) => setTeamFormData({ ...teamFormData, profileImageUrl: url })}
                                label="Profile Photo"
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Name *</label>
                                <input required value={teamFormData.name || ''} onChange={e => setTeamFormData({ ...teamFormData, name: e.target.value })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Email *</label>
                                <input required type="email" value={teamFormData.email || ''} onChange={e => setTeamFormData({ ...teamFormData, email: e.target.value })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>LinkedIn</label>
                                <input placeholder="linkedin.com/in/username" value={teamFormData.documentsJson?.linkedin || ''}
                                    onChange={e => setTeamFormData({ ...teamFormData, documentsJson: { ...teamFormData.documentsJson, linkedin: e.target.value } })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>City *</label>
                                <select required value={teamFormData.cityId || ''} onChange={e => setTeamFormData({ ...teamFormData, cityId: e.target.value })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}>
                                    <option value="">Select City</option>
                                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Position (shown on website) *</label>
                                <input required placeholder="e.g. Chief Executive Officer" value={teamFormData.documentsJson?.title || ''}
                                    onChange={e => setTeamFormData({ ...teamFormData, documentsJson: { ...teamFormData.documentsJson, title: e.target.value } })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Full Bio</label>
                                <textarea rows={5} value={teamFormData.documentsJson?.fullBio || ''}
                                    onChange={e => setTeamFormData({ ...teamFormData, documentsJson: { ...teamFormData.documentsJson, fullBio: e.target.value } })}
                                    style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit", resize: "vertical" }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                                <button type="button" onClick={() => { setShowTeamModal(false); setEditingMember(null); }}
                                    style={{ padding: "10px 20px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-primary)", fontWeight: 600 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSavingMember}
                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--gradient-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600 }}>
                                    <Save size={16} /> {isSavingMember ? "Saving..." : (editingMember ? "Save Changes" : "Add to Website")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
