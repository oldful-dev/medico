"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    Search, 
    Plus, 
    ArrowUp, 
    ArrowDown, 
    Star, 
    Trash2, 
    ToggleLeft, 
    ToggleRight, 
    RefreshCw, 
    TestTube2, 
    CheckCircle2, 
    EyeOff, 
    Sparkles, 
    Info, 
    Clock, 
    AlertCircle,
    X,
    Filter,
    Layers
} from "lucide-react";
import { labAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import { debounce } from "lodash";

export default function LabPackagesPage() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("featured"); // "featured" | "catalog"

    // Featured Table Controls
    const [filterQuery, setFilterQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "ACTIVE" | "HIDDEN"
    const [reordering, setReordering] = useState(false);

    // Add Modal & Catalog Explorer State
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(null); // code currently being added

    // Details Modal State
    const [selectedPackage, setSelectedPackage] = useState(null);

    // Delete Confirmation Modal
    const [deletingItem, setDeletingItem] = useState(null);

    const loadFeatured = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await labAPI.getFeatured();
            setFeatured(res.data?.data || []);
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to load featured tests", "error");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { 
        loadFeatured(); 
    }, [loadFeatured]);

    // Live search against Redcliffe's package catalog
    const runSearch = useCallback(
        debounce(async (q) => {
            if (!q.trim()) { 
                setSearchResults([]); 
                setSearching(false); 
                return; 
            }
            try {
                setSearching(true);
                const res = await labAPI.searchPackages(q, 1);
                setSearchResults(res.data?.data || []);
            } catch (e) {
                showToast("Search failed against diagnostic catalog", "error");
            } finally {
                setSearching(false);
            }
        }, 350),
        []
    );

    const onSearchChange = (v) => {
        setSearchText(v);
        if (!v.trim()) {
            setSearchResults([]);
            setSearching(false);
        } else {
            setSearching(true);
            runSearch(v);
        }
    };

    const featuredCodes = useMemo(() => new Set(featured.map((f) => f.code)), [featured]);

    // Summary Statistics
    const stats = useMemo(() => {
        const total = featured.length;
        const active = featured.filter(f => f.isActive).length;
        const hidden = total - active;
        return { total, active, hidden };
    }, [featured]);

    // Filtered Featured List
    const filteredFeatured = useMemo(() => {
        let list = [...featured].sort((a, b) => a.sortOrder - b.sortOrder);
        
        if (statusFilter === "ACTIVE") {
            list = list.filter(item => item.isActive);
        } else if (statusFilter === "HIDDEN") {
            list = list.filter(item => !item.isActive);
        }

        if (filterQuery.trim()) {
            const q = filterQuery.toLowerCase().trim();
            list = list.filter(item => 
                (item.name && item.name.toLowerCase().includes(q)) || 
                (item.code && item.code.toLowerCase().includes(q))
            );
        }

        return list;
    }, [featured, statusFilter, filterQuery]);

    async function handleAdd(pkg) {
        setAdding(pkg.code);
        try {
            await labAPI.addFeatured(pkg.code);
            showToast(`"${pkg.name}" added to featured tests`, "success");
            await loadFeatured(true);
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to add test", "error");
        } finally {
            setAdding(null);
        }
    }

    async function confirmDelete() {
        if (!deletingItem) return;
        try {
            await labAPI.removeFeatured(deletingItem.code);
            showToast(`Removed "${deletingItem.name}" from featured tests`, "success");
            setDeletingItem(null);
            loadFeatured(true);
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to remove test", "error");
        }
    }

    async function handleToggle(item) {
        try {
            // Optimistic update
            setFeatured(prev => prev.map(f => f.code === item.code ? { ...f, isActive: !f.isActive } : f));
            await labAPI.toggleFeatured(item.code);
            showToast(`Test is now ${!item.isActive ? 'Active' : 'Hidden'} in mobile app`, "info");
        } catch (e) {
            showToast("Failed to toggle status", "error");
            loadFeatured(true);
        }
    }

    async function handleReorder(item, direction) {
        const ordered = [...featured].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = ordered.findIndex((f) => f.id === item.id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;

        setReordering(true);
        [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
        const newOrder = ordered.map((f, i) => ({ ...f, sortOrder: i }));
        setFeatured(newOrder); // Optimistic UI update

        try {
            await labAPI.reorderFeatured(newOrder.map((f) => f.code));
            showToast("Display priority updated", "success");
        } catch (e) {
            showToast("Failed to save order", "error");
            loadFeatured(true);
        } finally {
            setReordering(false);
        }
    }

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            {/* ── Page Header ── */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ 
                            width: 38, 
                            height: 38, 
                            borderRadius: "var(--radius-md)", 
                            background: "var(--gradient-primary)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            color: "white",
                            boxShadow: "var(--shadow-glow)"
                        }}>
                            <TestTube2 size={20} />
                        </div>
                        <h2 style={{ margin: 0 }}>Blood Test Catalog</h2>
                        <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}>
                            <Sparkles size={11} /> Redcliffe Live
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5 }}>
                        Manage featured tests showcased in the customer mobile app & explore the full live diagnostic catalog.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => loadFeatured()} 
                        disabled={loading}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                        title="Reload latest data"
                    >
                        <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
                        <span>Refresh</span>
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            setSearchText("");
                            setSearchResults([]);
                            setSearchOpen(true);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
                    >
                        <Plus size={16} /> 
                        <span>Add Featured Test</span>
                    </button>
                </div>
            </div>

            {/* ── Stat Summary Cards ── */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="stat-card" style={{ padding: "18px 20px" }}>
                    <div className="stat-card-header" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Total Featured Tests
                        </span>
                        <div className="stat-card-icon purple" style={{ width: 36, height: 36 }}>
                            <Star size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
                        {stats.total}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Curated for Mobile App Home
                    </div>
                </div>

                <div className="stat-card" style={{ padding: "18px 20px" }}>
                    <div className="stat-card-header" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Active in App
                        </span>
                        <div className="stat-card-icon green" style={{ width: 36, height: 36 }}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--accent-success)" }}>
                        {stats.active}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Visible to all users
                    </div>
                </div>

                <div className="stat-card" style={{ padding: "18px 20px" }}>
                    <div className="stat-card-header" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Hidden / Draft
                        </span>
                        <div className="stat-card-icon" style={{ width: 36, height: 36, background: "rgba(132, 132, 132, 0.15)", color: "var(--text-muted)" }}>
                            <EyeOff size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-secondary)" }}>
                        {stats.hidden}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Temporarily hidden from home
                    </div>
                </div>

                <div className="stat-card" style={{ padding: "18px 20px" }}>
                    <div className="stat-card-header" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Redcliffe Integration
                        </span>
                        <div className="stat-card-icon" style={{ width: 36, height: 36, background: "rgba(4, 131, 87, 0.12)", color: "var(--accent-primary)" }}>
                            <Layers size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-primary)" }}>
                        Full Live Access
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        All diagnostic tests searchable
                    </div>
                </div>
            </div>

            {/* ── Navigation Tabs ── */}
            <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border-color)", marginBottom: 20 }}>
                <button
                    onClick={() => setActiveTab("featured")}
                    style={{
                        padding: "10px 18px",
                        border: "none",
                        background: "transparent",
                        borderBottom: activeTab === "featured" ? "3px solid var(--accent-primary)" : "3px solid transparent",
                        color: activeTab === "featured" ? "var(--accent-primary)" : "var(--text-muted)",
                        fontWeight: activeTab === "featured" ? 600 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all var(--transition-fast)"
                    }}
                >
                    <Star size={16} />
                    <span>Featured Tests</span>
                    <span style={{ 
                        fontSize: 11, 
                        padding: "2px 7px", 
                        borderRadius: 12, 
                        background: activeTab === "featured" ? "var(--bg-glass-hover)" : "var(--bg-tertiary)",
                        color: activeTab === "featured" ? "var(--accent-primary)" : "var(--text-muted)"
                    }}>
                        {featured.length}
                    </span>
                </button>

                <button
                    onClick={() => {
                        setActiveTab("catalog");
                        if (!searchResults.length && !searchText) {
                            runSearch("blood");
                        }
                    }}
                    style={{
                        padding: "10px 18px",
                        border: "none",
                        background: "transparent",
                        borderBottom: activeTab === "catalog" ? "3px solid var(--accent-primary)" : "3px solid transparent",
                        color: activeTab === "catalog" ? "var(--accent-primary)" : "var(--text-muted)",
                        fontWeight: activeTab === "catalog" ? 600 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all var(--transition-fast)"
                    }}
                >
                    <Search size={16} />
                    <span>Explore Full Catalog</span>
                </button>
            </div>

            {/* ── TAB 1: Featured Tests Management ── */}
            {activeTab === "featured" && (
                <>
                    {/* Filter & Search Bar */}
                    <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260, maxWidth: 460 }}>
                            <div style={{ position: "relative", width: "100%" }}>
                                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                <input
                                    type="text"
                                    placeholder="Search by test name or code..."
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    className="form-input"
                                    style={{ paddingLeft: 36, height: 40, width: "100%", borderRadius: "var(--radius-md)" }}
                                />
                                {filterQuery && (
                                    <button 
                                        onClick={() => setFilterQuery("")} 
                                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Filter size={15} style={{ color: "var(--text-muted)" }} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-input"
                                style={{ height: 40, padding: "0 12px", minWidth: 140, borderRadius: "var(--radius-md)" }}
                            >
                                <option value="ALL">All Status ({stats.total})</option>
                                <option value="ACTIVE">Active Only ({stats.active})</option>
                                <option value="HIDDEN">Hidden Only ({stats.hidden})</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View inside Card */}
                    {loading ? (
                        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            <div className="spin-icon" style={{ margin: "0 auto 12px", width: 28, height: 28, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%" }} />
                            <div>Loading featured blood tests...</div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 110, textAlign: "center" }}>Priority</th>
                                            <th style={{ textAlign: "left" }}>Test Name</th>
                                            <th style={{ width: 150, textAlign: "center" }}>Test Code</th>
                                            <th style={{ width: 140, textAlign: "center" }}>Status</th>
                                            <th style={{ width: 150, textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFeatured.map((item, i) => {
                                            const globalIndex = featured.findIndex(f => f.id === item.id);
                                            return (
                                                <tr key={item.id}>
                                                    {/* Reorder Buttons & Rank Badge */}
                                                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                            <span style={{ 
                                                                fontSize: 12, 
                                                                fontWeight: 700, 
                                                                background: "rgba(4, 131, 87, 0.1)", 
                                                                color: "var(--accent-primary)", 
                                                                padding: "3px 8px", 
                                                                borderRadius: 6,
                                                                minWidth: 32,
                                                                textAlign: "center"
                                                            }}>
                                                                #{globalIndex + 1}
                                                            </span>
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                                <button
                                                                    className="btn btn-sm btn-secondary"
                                                                    disabled={globalIndex === 0 || reordering}
                                                                    onClick={() => handleReorder(item, "up")}
                                                                    style={{ padding: 0, height: 18, width: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                    title="Move higher in app list"
                                                                >
                                                                    <ArrowUp size={11} />
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-secondary"
                                                                    disabled={globalIndex === featured.length - 1 || reordering}
                                                                    onClick={() => handleReorder(item, "down")}
                                                                    style={{ padding: 0, height: 18, width: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                    title="Move lower in app list"
                                                                >
                                                                    <ArrowDown size={11} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Test Name & Badge */}
                                                    <td style={{ textAlign: "left", verticalAlign: "middle" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                            <div style={{ 
                                                                width: 32, 
                                                                height: 32, 
                                                                borderRadius: "var(--radius-md)", 
                                                                background: "rgba(4, 131, 87, 0.08)", 
                                                                color: "var(--accent-primary)", 
                                                                display: "flex", 
                                                                alignItems: "center", 
                                                                justifyContent: "center",
                                                                flexShrink: 0
                                                            }}>
                                                                <TestTube2 size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                                                                    {item.name}
                                                                </div>
                                                                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                                                    Order Priority: {item.sortOrder}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Test Code */}
                                                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                                        <span style={{ 
                                                            fontFamily: "monospace", 
                                                            fontSize: 12, 
                                                            fontWeight: 600, 
                                                            background: "var(--bg-glass-hover)", 
                                                            color: "var(--text-secondary)", 
                                                            padding: "4px 8px", 
                                                            borderRadius: 6,
                                                            border: "1px solid var(--border-color)"
                                                        }}>
                                                            {item.code}
                                                        </span>
                                                    </td>

                                                    {/* Interactive Status Toggle */}
                                                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                                        <button
                                                            onClick={() => handleToggle(item)}
                                                            style={{ 
                                                                background: "none", 
                                                                border: "none", 
                                                                cursor: "pointer", 
                                                                display: "inline-flex", 
                                                                alignItems: "center", 
                                                                gap: 6,
                                                                padding: "4px 10px",
                                                                borderRadius: "var(--radius-full)",
                                                                backgroundColor: item.isActive ? "rgba(40, 167, 69, 0.1)" : "rgba(132, 132, 132, 0.1)",
                                                                transition: "all var(--transition-fast)"
                                                            }}
                                                            title="Click to toggle visibility in app"
                                                        >
                                                            <span style={{ 
                                                                width: 8, 
                                                                height: 8, 
                                                                borderRadius: "50%", 
                                                                backgroundColor: item.isActive ? "var(--accent-success)" : "var(--text-muted)" 
                                                            }} />
                                                            <span style={{ 
                                                                fontSize: 12, 
                                                                fontWeight: 600, 
                                                                color: item.isActive ? "var(--accent-success)" : "var(--text-muted)" 
                                                            }}>
                                                                {item.isActive ? "Active" : "Hidden"}
                                                            </span>
                                                        </button>
                                                    </td>

                                                    {/* Action Buttons */}
                                                    <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                            <button 
                                                                className="btn btn-sm btn-secondary" 
                                                                onClick={() => setSelectedPackage({ code: item.code, name: item.name })}
                                                                title="Inspect test details"
                                                                style={{ padding: "6px 8px" }}
                                                            >
                                                                <Info size={14} />
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-secondary" 
                                                                onClick={() => handleToggle(item)} 
                                                                title={item.isActive ? "Hide from customer app" : "Show in customer app"}
                                                                style={{ padding: "6px 8px", color: item.isActive ? "var(--accent-primary)" : "var(--text-muted)" }}
                                                            >
                                                                {item.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-danger" 
                                                                onClick={() => setDeletingItem(item)}
                                                                title="Remove from featured tests"
                                                                style={{ padding: "6px 8px" }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {filteredFeatured.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px" }}>
                                                    <div style={{ color: "var(--text-muted)", marginBottom: 12 }}>
                                                        <AlertCircle size={32} style={{ opacity: 0.6, margin: "0 auto 8px" }} />
                                                        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-secondary)" }}>
                                                            {filterQuery ? "No matching featured tests found" : "No featured tests configured"}
                                                        </div>
                                                        <div style={{ fontSize: 13, marginTop: 4 }}>
                                                            {filterQuery 
                                                                ? "Try searching for a different test name or code." 
                                                                : "Click \"Add Featured Test\" to choose blood tests from the Redcliffe diagnostic catalog."}
                                                        </div>
                                                    </div>
                                                    {!filterQuery && (
                                                        <button 
                                                            className="btn btn-primary" 
                                                            onClick={() => {
                                                                setSearchText("");
                                                                setSearchResults([]);
                                                                setSearchOpen(true);
                                                            }}
                                                            style={{ marginTop: 8 }}
                                                        >
                                                            <Plus size={15} /> Add First Featured Test
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── TAB 2: Live Catalog Explorer ── */}
            {activeTab === "catalog" && (
                <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                            Redcliffe Diagnostic Catalog Explorer
                        </h3>
                        <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)" }}>
                            Search all available lab tests, health checkup packages, and panels available for booking in the customer app.
                        </p>
                    </div>

                    {/* Catalog Search Input */}
                    <div style={{ position: "relative", maxWidth: 600, marginBottom: 24 }}>
                        <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            placeholder="Type test name (e.g., 'Thyroid', 'CBC', 'Lipid', 'Full Body')..."
                            value={searchText}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: 42, height: 46, fontSize: 14.5, borderRadius: "var(--radius-md)" }}
                        />
                        {searchText && (
                            <button 
                                onClick={() => onSearchChange("")} 
                                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Catalog Results Grid */}
                    {searching ? (
                        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            <div className="spin-icon" style={{ margin: "0 auto 12px", width: 28, height: 28, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%" }} />
                            <div>Searching live Redcliffe catalog...</div>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                            {searchResults.map((pkg) => {
                                const already = featuredCodes.has(pkg.code);
                                const discountPrice = pkg.discounted_cost ?? pkg.cost;
                                const mrpPrice = pkg.cost;
                                const hasDiscount = mrpPrice && discountPrice && mrpPrice > discountPrice;

                                return (
                                    <div 
                                        key={pkg.code} 
                                        style={{
                                            border: "1px solid var(--border-color)",
                                            borderRadius: "var(--radius-md)",
                                            padding: 16,
                                            background: already ? "rgba(4, 131, 87, 0.02)" : "var(--bg-card)",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            transition: "all var(--transition-fast)"
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.3 }}>
                                                    {pkg.name}
                                                </div>
                                                <span style={{ 
                                                    fontFamily: "monospace", 
                                                    fontSize: 11, 
                                                    background: "var(--bg-glass-hover)", 
                                                    color: "var(--text-muted)", 
                                                    padding: "2px 6px", 
                                                    borderRadius: 4 
                                                }}>
                                                    {pkg.code}
                                                </span>
                                            </div>

                                            {/* Pricing Row */}
                                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-primary)" }}>
                                                    ₹{discountPrice}
                                                </span>
                                                {hasDiscount && (
                                                    <span style={{ fontSize: 12, textDecoration: "line-through", color: "var(--text-muted)" }}>
                                                        ₹{mrpPrice}
                                                    </span>
                                                )}
                                                {hasDiscount && (
                                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-success)", background: "rgba(40, 167, 69, 0.1)", padding: "1px 5px", borderRadius: 4 }}>
                                                        {Math.round(((mrpPrice - discountPrice) / mrpPrice) * 100)}% OFF
                                                    </span>
                                                )}
                                            </div>

                                            {/* Details Badges */}
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                                                {pkg.fasting_time && (
                                                    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <Clock size={11} /> {pkg.fasting_time}
                                                    </span>
                                                )}
                                                {pkg.report_tat && (
                                                    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>
                                                        TAT: {pkg.report_tat}
                                                    </span>
                                                )}
                                                {pkg.parameters && (
                                                    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>
                                                        {pkg.parameters.length || pkg.parameters} Parameters
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => setSelectedPackage(pkg)}
                                                style={{ fontSize: 12 }}
                                            >
                                                Details
                                            </button>
                                            <button
                                                className={`btn btn-sm ${already ? "btn-secondary" : "btn-primary"}`}
                                                disabled={already || adding === pkg.code}
                                                onClick={() => handleAdd(pkg)}
                                                style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
                                            >
                                                {already ? (
                                                    <>
                                                        <CheckCircle2 size={13} color="var(--accent-success)" />
                                                        <span>Featured</span>
                                                    </>
                                                ) : adding === pkg.code ? (
                                                    <span>Adding...</span>
                                                ) : (
                                                    <>
                                                        <Plus size={14} />
                                                        <span>Add to Featured</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : searchText.trim() ? (
                        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            <AlertCircle size={28} style={{ opacity: 0.6, margin: "0 auto 8px" }} />
                            <div style={{ fontWeight: 600 }}>No tests found for &quot;{searchText}&quot;</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>Try searching for generic terms like &quot;Blood&quot;, &quot;Diabetes&quot;, or &quot;Kidney&quot;.</div>
                        </div>
                    ) : (
                        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            <Search size={32} style={{ opacity: 0.5, margin: "0 auto 8px" }} />
                            <div style={{ fontWeight: 600 }}>Type a query in the search bar above to explore packages</div>
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: Add Featured Test (Quick Search) ── */}
            {searchOpen && (
                <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, width: "95%", borderRadius: "var(--radius-lg)" }}>
                        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Star size={18} style={{ color: "#f59e0b" }} />
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add Featured Test to Home</h3>
                            </div>
                            <button onClick={() => setSearchOpen(false)} className="btn btn-sm btn-secondary" style={{ padding: 4 }}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="modal-body" style={{ padding: 24 }}>
                            <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "var(--text-muted)" }}>
                                Search the live Redcliffe diagnostic database by test name or code. Selected tests will be featured immediately on the customer mobile app home screen.
                            </p>

                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <div style={{ position: "relative" }}>
                                    <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                    <input
                                        autoFocus
                                        className="form-input"
                                        style={{ paddingLeft: 40, height: 44, fontSize: 14 }}
                                        placeholder="Search tests (e.g., Complete Blood Count, HbA1c, Vitamin D)..."
                                        value={searchText}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                    {searchText && (
                                        <button 
                                            onClick={() => onSearchChange("")} 
                                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                                {searching && (
                                    <div className="text-muted" style={{ textAlign: "center", padding: 32 }}>
                                        <div className="spin-icon" style={{ margin: "0 auto 8px", width: 24, height: 24, border: "2px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%" }} />
                                        <span>Searching catalog...</span>
                                    </div>
                                )}

                                {!searching && searchText.trim() && searchResults.length === 0 && (
                                    <div className="text-muted" style={{ textAlign: "center", padding: 32 }}>
                                        <AlertCircle size={24} style={{ opacity: 0.6, margin: "0 auto 8px" }} />
                                        <div>No matching tests found in catalog.</div>
                                    </div>
                                )}

                                {!searching && !searchText.trim() && (
                                    <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 13 }}>
                                        Type a search query above to browse the Redcliffe catalog.
                                    </div>
                                )}

                                {!searching && searchResults.map((pkg) => {
                                    const already = featuredCodes.has(pkg.code);
                                    const discountPrice = pkg.discounted_cost ?? pkg.cost;
                                    const mrpPrice = pkg.cost;
                                    const hasDiscount = mrpPrice && discountPrice && mrpPrice > discountPrice;

                                    return (
                                        <div 
                                            key={pkg.code} 
                                            style={{ 
                                                display: "flex", 
                                                alignItems: "center", 
                                                justifyContent: "space-between", 
                                                padding: "12px 14px", 
                                                borderRadius: "var(--radius-md)",
                                                border: "1px solid var(--border-color)",
                                                marginBottom: 8,
                                                background: already ? "rgba(4, 131, 87, 0.03)" : "var(--bg-card)",
                                                transition: "all var(--transition-fast)"
                                            }}
                                        >
                                            <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {pkg.name}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)" }}>
                                                        ₹{discountPrice}
                                                    </span>
                                                    {hasDiscount && (
                                                        <span style={{ fontSize: 11, textDecoration: "line-through", color: "var(--text-muted)" }}>
                                                            ₹{mrpPrice}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                                        • {pkg.code}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                className={`btn btn-sm ${already ? "btn-secondary" : "btn-primary"}`}
                                                disabled={already || adding === pkg.code}
                                                onClick={() => handleAdd(pkg)}
                                                style={{ flexShrink: 0, fontWeight: 600, minWidth: 80 }}
                                            >
                                                {already ? "Added" : adding === pkg.code ? "Adding..." : "+ Add"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
                            <button className="btn btn-secondary" onClick={() => setSearchOpen(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Test Details Inspector ── */}
            {selectedPackage && (
                <div className="modal-overlay" onClick={() => setSelectedPackage(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, width: "95%", borderRadius: "var(--radius-lg)" }}>
                        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <TestTube2 size={18} style={{ color: "var(--accent-primary)" }} />
                                <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700 }}>Package Details</h3>
                            </div>
                            <button onClick={() => setSelectedPackage(null)} className="btn btn-sm btn-secondary" style={{ padding: 4 }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: 24 }}>
                            <div style={{ marginBottom: 16 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 0.5 }}>
                                    Package Title
                                </span>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                                    {selectedPackage.name}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                                <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>DIAGNOSTIC CODE</div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
                                        {selectedPackage.code}
                                    </div>
                                </div>
                                <div style={{ padding: 12, background: "rgba(4, 131, 87, 0.06)", borderRadius: "var(--radius-md)" }}>
                                    <div style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 600 }}>FEATURED STATUS</div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent-primary)", marginTop: 2 }}>
                                        {featuredCodes.has(selectedPackage.code) ? "Featured in App" : "Standard Catalog"}
                                    </div>
                                </div>
                            </div>

                            {selectedPackage.cost && (
                                <div style={{ padding: 14, border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>PRICING</div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-primary)" }}>
                                            ₹{selectedPackage.discounted_cost ?? selectedPackage.cost}
                                        </span>
                                        {selectedPackage.discounted_cost && selectedPackage.cost > selectedPackage.discounted_cost && (
                                            <span style={{ fontSize: 13, textDecoration: "line-through", color: "var(--text-muted)" }}>
                                                ₹{selectedPackage.cost}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedPackage.fasting_time && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Fasting Instruction:</span>
                                    <div style={{ fontSize: 13.5, color: "var(--text-primary)", marginTop: 2 }}>
                                        {selectedPackage.fasting_time}
                                    </div>
                                </div>
                            )}

                            {selectedPackage.report_tat && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Turnaround Time (TAT):</span>
                                    <div style={{ fontSize: 13.5, color: "var(--text-primary)", marginTop: 2 }}>
                                        {selectedPackage.report_tat}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {!featuredCodes.has(selectedPackage.code) ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        handleAdd(selectedPackage);
                                        setSelectedPackage(null);
                                    }}
                                >
                                    <Plus size={15} /> Feature in App
                                </button>
                            ) : (
                                <span style={{ fontSize: 12, color: "var(--accent-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                    <CheckCircle2 size={14} /> Currently Featured
                                </span>
                            )}
                            <button className="btn btn-secondary" onClick={() => setSelectedPackage(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Delete / Remove Confirmation ── */}
            {deletingItem && (
                <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "95%", borderRadius: "var(--radius-lg)" }}>
                        <div className="modal-body" style={{ padding: 24, textAlign: "center" }}>
                            <div style={{ 
                                width: 48, 
                                height: 48, 
                                borderRadius: "50%", 
                                background: "rgba(255, 59, 48, 0.1)", 
                                color: "var(--accent-danger)", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                margin: "0 auto 16px" 
                            }}>
                                <Trash2 size={24} />
                            </div>
                            <h3 style={{ margin: "0 0 8px 0", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
                                Remove Featured Test?
                            </h3>
                            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                                Are you sure you want to remove <strong style={{ color: "var(--text-primary)" }}>&quot;{deletingItem.name}&quot;</strong> from the featured list?
                                It will still remain searchable in the app catalog.
                            </p>
                        </div>
                        <div className="modal-footer" style={{ padding: "14px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setDeletingItem(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={confirmDelete} style={{ fontWeight: 600 }}>
                                Remove Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .spin-icon {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
