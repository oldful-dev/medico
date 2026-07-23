"use client";
import React, { useState, useEffect } from "react";
import { 
    Building2, Phone, Mail, Sliders, Briefcase, Heart, Plus, Trash2, Save, Info, CheckCircle2,
    BookOpen, FileText
} from "lucide-react";
import { uiConfigAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function CompanySettingsPage() {
    const [activeSubTab, setActiveSubTab] = useState("contact");
    const [configId, setConfigId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // Initial default state
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
        blogs_html: ""
    });

    const [selectedBlogId, setSelectedBlogId] = useState("featured");
    const [blogEditorTab, setBlogEditorTab] = useState("manager");

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
                            blogs_html: parsedJson?.blogs_html || ""
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

    // Career operations
    const addCareerItem = () => {
        const newItem = {
            id: Date.now().toString(),
            title: "New Job Opening",
            department: "Operations",
            location: "Bengaluru",
            type: "Full Time",
            description: "Provide short summary of duties here..."
        };
        setFormData(prev => ({
            ...prev,
            careers_list: [...prev.careers_list, newItem]
        }));
    };

    const updateCareerItem = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            careers_list: prev.careers_list.map(item => 
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const removeCareerItem = (id) => {
        setFormData(prev => ({
            ...prev,
            careers_list: prev.careers_list.filter(item => item.id !== id)
        }));
    };

    // Charity initiatives operations
    const addCharityInitiative = () => {
        const initiatives = formData.community_content.charity_initiatives || [];
        setFormData(prev => ({
            ...prev,
            community_content: {
                ...prev.community_content,
                charity_initiatives: [...initiatives, "New initiative description..."]
            }
        }));
    };

    const updateCharityInitiative = (index, value) => {
        const initiatives = [...(formData.community_content.charity_initiatives || [])];
        initiatives[index] = value;
        setFormData(prev => ({
            ...prev,
            community_content: {
                ...prev.community_content,
                charity_initiatives: initiatives
            }
        }));
    };

    const removeCharityInitiative = (index) => {
        const initiatives = [...(formData.community_content.charity_initiatives || [])];
        initiatives.splice(index, 1);
        setFormData(prev => ({
            ...prev,
            community_content: {
                ...prev.community_content,
                charity_initiatives: initiatives
            }
        }));
    };

    // Blog operations
    const addBlogPost = () => {
        const posts = formData.blogs_content?.posts || [];
        const newPost = {
            id: Date.now().toString(),
            title: "New Article Title",
            excerpt: "Article excerpt summary...",
            author: "Author Name",
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
            category: "Wellness"
        };
        setFormData(prev => ({
            ...prev,
            blogs_content: {
                ...prev.blogs_content,
                posts: [...posts, newPost]
            }
        }));
    };

    const updateBlogPost = (id, field, value) => {
        const posts = formData.blogs_content?.posts || [];
        setFormData(prev => ({
            ...prev,
            blogs_content: {
                ...prev.blogs_content,
                posts: posts.map(post => post.id === id ? { ...post, [field]: value } : post)
            }
        }));
    };

    const removeBlogPost = (id) => {
        const posts = formData.blogs_content?.posts || [];
        setFormData(prev => ({
            ...prev,
            blogs_content: {
                ...prev.blogs_content,
                posts: posts.filter(post => post.id !== id)
            }
        }));
    };

    const updateFeaturedBlog = (field, value) => {
        setFormData(prev => ({
            ...prev,
            blogs_content: {
                ...prev.blogs_content,
                featured: {
                    ...(prev.blogs_content?.featured || {}),
                    [field]: value
                }
            }
        }));
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
                        Manage official contact details, careers page opportunities, and community content dynamically.
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
                    onClick={() => setActiveSubTab("about")} 
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "about" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "about" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "about" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={16} /> About Us Page
                    </div>
                </button>
                <button 
                    onClick={() => setActiveSubTab("blogs")} 
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "blogs" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "blogs" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "blogs" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <BookOpen size={16} /> Blogs Page
                    </div>
                </button>
                <button 
                    onClick={() => setActiveSubTab("careers")} 
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "careers" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "careers" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "careers" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Briefcase size={16} /> Careers Listings
                    </div>
                </button>
                <button 
                    onClick={() => setActiveSubTab("community")} 
                    style={{
                        padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        background: activeSubTab === "community" ? "var(--bg-glass)" : "transparent",
                        color: activeSubTab === "community" ? "var(--accent-primary)" : "var(--text-muted)",
                        borderBottom: activeSubTab === "community" ? "2.5px solid var(--accent-primary)" : "none"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Heart size={16} /> Community &amp; Charity
                    </div>
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="main-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                
                {/* 1. CONTACT TAB */}
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

                {/* 2. CAREERS LISTINGS TAB */}
                {activeSubTab === "careers" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                Define open positions to be displayed on the careers page.
                            </div>
                            <button className="btn-secondary" onClick={addCareerItem} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Plus size={16} /> Add Position
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {formData.careers_list.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                                    No open positions defined. Click &quot;Add Position&quot; to list a new opportunity.
                                </div>
                            ) : formData.careers_list.map((job) => (
                                <div key={job.id} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 20, background: "var(--bg-secondary)", position: "relative" }}>
                                    <button 
                                        onClick={() => removeCareerItem(job.id)} 
                                        style={{ position: "absolute", top: 16, right: 16, border: "none", background: "transparent", color: "var(--accent-danger)", cursor: "pointer" }}
                                        title="Delete position"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, marginBottom: 12 }}>
                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Job Title</label>
                                            <input 
                                                value={job.title} 
                                                onChange={e => updateCareerItem(job.id, "title", e.target.value)}
                                                style={{ width: "100%", padding: 10, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 13 }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Department</label>
                                            <input 
                                                value={job.department} 
                                                onChange={e => updateCareerItem(job.id, "department", e.target.value)}
                                                style={{ width: "100%", padding: 10, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 13 }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Location</label>
                                            <input 
                                                value={job.location} 
                                                onChange={e => updateCareerItem(job.id, "location", e.target.value)}
                                                style={{ width: "100%", padding: 10, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 13 }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Job Type</label>
                                            <input 
                                                value={job.type} 
                                                onChange={e => updateCareerItem(job.id, "type", e.target.value)}
                                                placeholder="e.g. Full Time"
                                                style={{ width: "100%", padding: 10, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Description / Requirements Summary</label>
                                        <textarea 
                                            rows={2}
                                            value={job.description} 
                                            onChange={e => updateCareerItem(job.id, "description", e.target.value)}
                                            style={{ width: "100%", padding: 10, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontSize: 13, fontFamily: "inherit" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. COMMUNITY TAB */}
                {activeSubTab === "community" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Charity/Community Page Title</label>
                            <input 
                                value={formData.community_content.title} 
                                onChange={e => setFormData({
                                    ...formData,
                                    community_content: { ...formData.community_content, title: e.target.value }
                                })}
                                style={{ width: "100%", padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                            />
                        </div>

                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Charity/Community Page Description</label>
                            <textarea 
                                rows={3}
                                value={formData.community_content.description} 
                                onChange={e => setFormData({
                                    ...formData,
                                    community_content: { ...formData.community_content, description: e.target.value }
                                })}
                                style={{ width: "100%", padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}
                            />
                        </div>

                        <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 10, paddingTop: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Charity Initiatives &amp; Activities</h3>
                                <button className="btn-secondary" onClick={addCharityInitiative} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Plus size={16} /> Add Initiative
                                </button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {(formData.community_content.charity_initiatives || []).length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                                        No initiatives listed yet. Click &quot;Add Initiative&quot; to list a community action.
                                    </div>
                                ) : (formData.community_content.charity_initiatives || []).map((item, index) => (
                                    <div key={index} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                        <input 
                                            value={item} 
                                            onChange={e => updateCharityInitiative(index, e.target.value)}
                                            style={{ flex: 1, padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none" }}
                                        />
                                        <button 
                                            onClick={() => removeCharityInitiative(index)} 
                                            style={{ border: "none", background: "transparent", color: "var(--accent-danger)", cursor: "pointer", padding: 8 }}
                                            title="Remove initiative"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ABOUT US TAB */}
                {activeSubTab === "about" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, minHeight: 500 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>About Page HTML</h3>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>HTML supported</span>
                            </div>
                            <textarea 
                                rows={25}
                                value={formData.about_html || ""} 
                                onChange={e => setFormData({
                                    ...formData,
                                    about_html: e.target.value
                                })}
                                style={{ width: "100%", padding: 16, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", fontSize: 13, resize: "vertical", lineHeight: 1.6 }}
                                placeholder="<h2>About Section</h2>..."
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Live Preview</h3>
                            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 24, background: "#FFFCF6", overflowY: "auto", maxHeight: 535 }}>
                                <div 
                                    className="legal-preview"
                                    dangerouslySetInnerHTML={{ __html: formData.about_html || "<p style='color: var(--text-muted); font-style: italic;'>No content yet.</p>" }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* BLOGS TAB */}
                {activeSubTab === "blogs" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
                            <button 
                                className={`btn-subtab ${blogEditorTab === "manager" ? "active" : ""}`}
                                onClick={() => setBlogEditorTab("manager")}
                                style={{ padding: "8px 16px", background: blogEditorTab === "manager" ? "var(--color-primary)" : "transparent", color: blogEditorTab === "manager" ? "white" : "var(--text-muted)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                            >
                                Blog Posts Manager
                            </button>
                            <button 
                                className={`btn-subtab ${blogEditorTab === "legacy" ? "active" : ""}`}
                                onClick={() => setBlogEditorTab("legacy")}
                                style={{ padding: "8px 16px", background: blogEditorTab === "legacy" ? "var(--color-primary)" : "transparent", color: blogEditorTab === "legacy" ? "white" : "var(--text-muted)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                            >
                                Raw HTML (Legacy Layout)
                            </button>
                        </div>

                        {blogEditorTab === "legacy" ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, minHeight: 500 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Blogs Page HTML</h3>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>HTML supported</span>
                                    </div>
                                    <textarea 
                                        rows={25}
                                        value={formData.blogs_html || ""} 
                                        onChange={e => setFormData({
                                            ...formData,
                                            blogs_html: e.target.value
                                        })}
                                        style={{ width: "100%", padding: 16, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none", fontFamily: "monospace", fontSize: 13, resize: "vertical", lineHeight: 1.6 }}
                                        placeholder="<section>...</section>"
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Live Preview</h3>
                                    <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 24, background: "#FFFCF6", overflowY: "auto", maxHeight: 535 }}>
                                        <div 
                                            className="legal-preview"
                                            dangerouslySetInnerHTML={{ __html: formData.blogs_html || "<p style='color: var(--text-muted); font-style: italic;'>No content yet.</p>" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, minHeight: 500 }}>
                                {/* Left pane: Articles list */}
                                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Articles List</h3>
                                        <button className="btn-secondary" onClick={addBlogPost} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11 }}>
                                            <Plus size={14} /> Add Post
                                        </button>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 450 }}>
                                        {/* Featured post item */}
                                        <div 
                                            onClick={() => setSelectedBlogId("featured")}
                                            style={{ 
                                                padding: 12, 
                                                borderRadius: "var(--radius-md)", 
                                                cursor: "pointer",
                                                background: selectedBlogId === "featured" ? "var(--color-primary-deep)" : "var(--bg-primary)",
                                                color: selectedBlogId === "featured" ? "white" : "var(--text-primary)",
                                                border: "1px solid var(--border-color)",
                                                fontWeight: 600,
                                                fontSize: 12
                                            }}
                                        >
                                            ⭐ Featured Article
                                            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4, fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {formData.blogs_content?.featured?.title || "Untitled Featured"}
                                            </div>
                                        </div>
                                        
                                        {/* List of regular posts */}
                                        {(formData.blogs_content?.posts || []).map((post, index) => (
                                            <div 
                                                key={post.id}
                                                onClick={() => setSelectedBlogId(post.id)}
                                                style={{ 
                                                    padding: 12, 
                                                    borderRadius: "var(--radius-md)", 
                                                    cursor: "pointer",
                                                    background: selectedBlogId === post.id ? "var(--color-primary-deep)" : "var(--bg-primary)",
                                                    color: selectedBlogId === post.id ? "white" : "var(--text-primary)",
                                                    border: "1px solid var(--border-color)",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    fontSize: 12,
                                                    fontWeight: 600
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontSize: 10, display: "block", textTransform: "uppercase", color: selectedBlogId === post.id ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>{post.category}</span>
                                                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                                                        {post.title || "Untitled Post"}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeBlogPost(post.id); }}
                                                    style={{ border: "none", background: "transparent", color: selectedBlogId === post.id ? "white" : "var(--accent-danger)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
                                                    title="Delete Post"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right pane: Editor Form */}
                                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                                    {selectedBlogId === "featured" ? (
                                        // Editor for Featured post
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--color-primary)" }}>Edit Featured Article</h3>
                                            
                                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Article Title</label>
                                                <input 
                                                    value={formData.blogs_content?.featured?.title || ""} 
                                                    onChange={e => updateFeaturedBlog("title", e.target.value)}
                                                    style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                />
                                            </div>
                                            
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Author Name</label>
                                                    <input 
                                                        value={formData.blogs_content?.featured?.author || ""} 
                                                        onChange={e => updateFeaturedBlog("author", e.target.value)}
                                                        style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Publish Date</label>
                                                    <input 
                                                        value={formData.blogs_content?.featured?.date || ""} 
                                                        onChange={e => updateFeaturedBlog("date", e.target.value)}
                                                        style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Cover Image URL</label>
                                                <input 
                                                    value={formData.blogs_content?.featured?.image || ""} 
                                                    onChange={e => updateFeaturedBlog("image", e.target.value)}
                                                    style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                />
                                            </div>

                                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Short Excerpt (Summary)</label>
                                                <textarea 
                                                    rows={2}
                                                    value={formData.blogs_content?.featured?.excerpt || ""} 
                                                    onChange={e => updateFeaturedBlog("excerpt", e.target.value)}
                                                    style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "inherit" }}
                                                />
                                            </div>

                                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Full Article Body (HTML / Paragraphs supported)</label>
                                                <textarea 
                                                    rows={10}
                                                    value={formData.blogs_content?.featured?.content || ""} 
                                                    onChange={e => updateFeaturedBlog("content", e.target.value)}
                                                    style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "monospace", fontSize: 13, lineHeight: 1.5 }}
                                                    placeholder="<p>Write full article here...</p>"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // Editor for regular blog posts
                                        (() => {
                                            const activePost = (formData.blogs_content?.posts || []).find(p => p.id === selectedBlogId);
                                            if (!activePost) return <div style={{ color: "var(--text-muted)" }}>Select a post from the list or click Add Post.</div>;
                                            
                                            return (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--color-primary)" }}>Edit Blog Article</h3>
                                                    
                                                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Article Title</label>
                                                        <input 
                                                            value={activePost.title || ""} 
                                                            onChange={e => updateBlogPost(activePost.id, "title", e.target.value)}
                                                            style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                        />
                                                    </div>

                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Category</label>
                                                            <input 
                                                                value={activePost.category || ""} 
                                                                onChange={e => updateBlogPost(activePost.id, "category", e.target.value)}
                                                                style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Author Name</label>
                                                            <input 
                                                                value={activePost.author || ""} 
                                                                onChange={e => updateBlogPost(activePost.id, "author", e.target.value)}
                                                                style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Publish Date</label>
                                                            <input 
                                                                value={activePost.date || ""} 
                                                                onChange={e => updateBlogPost(activePost.id, "date", e.target.value)}
                                                                style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Cover Image URL</label>
                                                        <input 
                                                            value={activePost.image || ""} 
                                                            onChange={e => updateBlogPost(activePost.id, "image", e.target.value)}
                                                            style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Short Excerpt (Summary)</label>
                                                        <textarea 
                                                            rows={2}
                                                            value={activePost.excerpt || ""} 
                                                            onChange={e => updateBlogPost(activePost.id, "excerpt", e.target.value)}
                                                            style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "inherit" }}
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Full Article Body (HTML / Paragraphs supported)</label>
                                                        <textarea 
                                                            rows={10}
                                                            value={activePost.content || ""} 
                                                            onChange={e => updateBlogPost(activePost.id, "content", e.target.value)}
                                                            style={{ width: "100%", padding: 10, background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "monospace", fontSize: 13, lineHeight: 1.5 }}
                                                            placeholder="<p>Write full article here...</p>"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}




                <style>{`
                    .legal-preview h1,.legal-preview h2,.legal-preview h3 { font-weight:700; margin:1.5rem 0 0.75rem; color:#111827; }
                    .legal-preview h1 { font-size:1.8rem; }
                    .legal-preview h2 { font-size:1.4rem; border-bottom:1px solid #f3f4f6; padding-bottom:0.5rem; }
                    .legal-preview h3 { font-size:1.1rem; }
                    .legal-preview p { margin-bottom:1rem; color:#4b5563; line-height: 1.6; }
                    .legal-preview ul,.legal-preview ol { padding-left:1.5rem; margin-bottom:1rem; }
                    .legal-preview ul { list-style:disc; }
                    .legal-preview ol { list-style:decimal; }
                    .legal-preview li { margin-bottom:0.4rem; color:#4b5563; }
                    .legal-preview strong { color:#111827; }
                    .legal-preview a { color:#10b981; text-decoration: underline; }
                `}</style>

            </div>
        </div>
    );
}
