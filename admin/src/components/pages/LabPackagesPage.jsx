"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ArrowUp, ArrowDown, Star, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { labAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import { debounce } from "lodash";

export default function LabPackagesPage() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(null); // code currently being added

    const loadFeatured = useCallback(async () => {
        try {
            setLoading(true);
            const res = await labAPI.getFeatured();
            setFeatured(res.data?.data || []);
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to load featured tests", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFeatured(); }, [loadFeatured]);

    // Debounced search against Redcliffe's live catalog — same endpoint the
    // customer app uses, so results always match what's actually bookable.
    const runSearch = useCallback(
        debounce(async (q) => {
            if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
            try {
                const res = await labAPI.searchPackages(q, 1);
                setSearchResults(res.data?.data || []);
            } catch (e) {
                showToast("Search failed", "error");
            } finally {
                setSearching(false);
            }
        }, 400),
        []
    );

    const onSearchChange = (v) => {
        setSearchText(v);
        setSearching(true);
        runSearch(v);
    };

    const featuredCodes = new Set(featured.map((f) => f.code));

    async function handleAdd(pkg) {
        setAdding(pkg.code);
        try {
            await labAPI.addFeatured(pkg.code);
            showToast(`${pkg.name} added to featured tests`);
            await loadFeatured();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to add test", "error");
        } finally {
            setAdding(null);
        }
    }

    async function handleRemove(item) {
        if (!confirm(`Remove "${item.name}" from featured tests?`)) return;
        try {
            await labAPI.removeFeatured(item.code);
            showToast("Removed from featured tests");
            loadFeatured();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to remove", "error");
        }
    }

    async function handleToggle(item) {
        try {
            await labAPI.toggleFeatured(item.code);
            loadFeatured();
        } catch (e) {
            showToast("Failed to toggle", "error");
        }
    }

    async function handleReorder(item, direction) {
        const ordered = [...featured].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = ordered.findIndex((f) => f.id === item.id);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;

        [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
        setFeatured(ordered.map((f, i) => ({ ...f, sortOrder: i }))); // optimistic

        try {
            await labAPI.reorderFeatured(ordered.map((f) => f.code));
        } catch (e) {
            showToast("Failed to save order", "error");
            loadFeatured();
        }
    }

    const sortedFeatured = [...featured].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <div>
            <div className="page-header">
                <h2>Blood Test Catalog</h2>
                <p>Pick which tests show first under the app&apos;s Featured tab — the rest stay searchable under All Tests</p>
            </div>

            <div className="filter-bar">
                <button className="btn btn-primary" onClick={() => setSearchOpen(true)}><Plus size={16} /> Add Featured Test</button>
            </div>

            {loading ? (
                <div className="card"><div className="card-body text-muted" style={{ textAlign: "center", padding: 32 }}>Loading...</div></div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th style={{ width: 90 }}>Order</th><th>Test</th><th>Code</th><th>Status</th><th style={{ width: 140 }}>Actions</th></tr>
                        </thead>
                        <tbody>
                            {sortedFeatured.map((item, i) => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                disabled={i === 0}
                                                onClick={() => handleReorder(item, "up")}
                                                style={{ padding: "4px 8px" }}
                                            >
                                                <ArrowUp size={13} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                disabled={i === sortedFeatured.length - 1}
                                                onClick={() => handleReorder(item, "down")}
                                                style={{ padding: "4px 8px" }}
                                            >
                                                <ArrowDown size={13} />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Star size={14} style={{ color: "#f59e0b" }} />
                                            {item.name}
                                        </div>
                                    </td>
                                    <td className="text-muted" style={{ fontFamily: "monospace", fontSize: 12 }}>{item.code}</td>
                                    <td><span className={`badge ${item.isActive ? "badge-success" : "badge-default"}`}>{item.isActive ? "Active" : "Hidden"}</span></td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleToggle(item)} title={item.isActive ? "Hide from app" : "Show in app"}>
                                                {item.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleRemove(item)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedFeatured.length === 0 && (
                                <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: 32 }}>
                                    No featured tests yet. Click &quot;Add Featured Test&quot; to pick some from the catalog.
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {searchOpen && (
                <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>Add Featured Test</h3>
                            <button onClick={() => setSearchOpen(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <div style={{ position: "relative" }}>
                                    <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
                                    <input
                                        autoFocus
                                        className="form-input"
                                        style={{ paddingLeft: 36 }}
                                        placeholder="Search the Redcliffe test catalog by name..."
                                        value={searchText}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ maxHeight: 360, overflowY: "auto", marginTop: 8 }}>
                                {searching && <div className="text-muted" style={{ textAlign: "center", padding: 16 }}>Searching...</div>}
                                {!searching && searchText.trim() && searchResults.length === 0 && (
                                    <div className="text-muted" style={{ textAlign: "center", padding: 16 }}>No matching tests found</div>
                                )}
                                {!searching && searchResults.map((pkg) => {
                                    const already = featuredCodes.has(pkg.code);
                                    return (
                                        <div key={pkg.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: "1px solid var(--border-color)" }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.name}</div>
                                                <div className="text-sm text-muted">₹{pkg.discounted_cost ?? pkg.cost} · {pkg.code}</div>
                                            </div>
                                            <button
                                                className={`btn btn-sm ${already ? "btn-secondary" : "btn-primary"}`}
                                                disabled={already || adding === pkg.code}
                                                onClick={() => handleAdd(pkg)}
                                            >
                                                {already ? "Added" : adding === pkg.code ? "Adding..." : "Add"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
