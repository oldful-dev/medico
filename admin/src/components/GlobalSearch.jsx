"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ALL_PAGES } from "@/lib/nav";
import { Search, X, Users, Shield, ChevronRight } from "lucide-react";
import { profilesAPI, userAPI } from "@/lib/api";

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ staff: [], users: [], navigation: ALL_PAGES.slice(0, 5) });
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Toggle with Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 10);
            }
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults({ staff: [], users: [], navigation: ALL_PAGES.slice(0, 5) });
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                // Local navigation search
                const filteredNav = ALL_PAGES.filter(item => 
                    item.label.toLowerCase().includes(query.toLowerCase())
                );

                // API searches
                const [staffRes, userRes] = await Promise.all([
                    profilesAPI.getAll({ search: query, limit: 3 }),
                    userAPI.getAll({ search: query, limit: 3 })
                ]);

                setResults({
                    navigation: filteredNav,
                    staff: staffRes.data.success ? staffRes.data.data : [],
                    users: userRes.data.success ? userRes.data.data : []
                });
            } catch (err) {
                console.error("Global search failed", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleNavigate = (url) => {
        router.push(url);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div className="global-search-container" ref={containerRef}>
            <div className={`header-search ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(true)}>
                <Search size={16} />
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Search anything... (⌘K)" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button className="clear-btn" onClick={(e) => { e.stopPropagation(); setQuery(""); }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="search-dropdown-overlay">
                    <div className="search-results">
                        {loading && <div className="search-status">Searching...</div>}
                        
                        {!loading && results.navigation.length > 0 && (
                            <div className="result-section">
                                <div className="section-title">Pages</div>
                                {results.navigation.map((item, idx) => (
                                    <div key={idx} className="result-item" onClick={() => handleNavigate(item.href)}>
                                        <item.icon size={16} />
                                        <span>{item.label}</span>
                                        <ChevronRight size={14} className="arrow" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && results.staff.length > 0 && (
                            <div className="result-section">
                                <div className="section-title">Staff Members</div>
                                {results.staff.map((p) => (
                                    <div key={p.id} className="result-item" onClick={() => handleNavigate(`/profiles?search=${p.name}`)}>
                                        <Shield size={16} />
                                        <div className="item-details">
                                            <span className="title">{p.name}</span>
                                            <span className="subtitle">{p.role} • {p.city}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && results.users.length > 0 && (
                            <div className="result-section">
                                <div className="section-title">Clients</div>
                                {results.users.map((u) => (
                                    <div key={u.id} className="result-item" onClick={() => handleNavigate(`/users?search=${u.name}`)}>
                                        <Users size={16} />
                                        <div className="item-details">
                                            <span className="title">{u.name}</span>
                                            <span className="subtitle">{u.phone}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && query && results.staff.length === 0 && results.users.length === 0 && results.navigation.length === 0 && (
                            <div className="search-status">No results found for "{query}"</div>
                        )}
                        
                        <div className="search-footer">
                            <span><kbd>ESC</kbd> to close</span>
                            <span><kbd>↵</kbd> to select</span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .global-search-container { position: relative; }
                .clear-btn { background: none; border: none; padding: 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); }
                .clear-btn:hover { color: var(--accent-danger); }

                .search-dropdown-overlay { position: absolute; top: calc(100% + 12px); left: 0; width: 450px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); overflow: hidden; z-index: 2000; animation: slideDown 0.2s ease; }
                
                @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                .search-results { max-height: 480px; overflow-y: auto; padding: 8px; }
                .search-status { padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 14px; }
                
                .result-section { margin-bottom: 12px; }
                .section-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; }
                
                .result-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; color: var(--text-secondary); }
                .result-item:hover { background: var(--bg-glass-hover); color: var(--accent-primary); }
                .result-item .arrow { margin-left: auto; opacity: 0; transform: translateX(-5px); transition: 0.2s; }
                .result-item:hover .arrow { opacity: 1; transform: translateX(0); }
                
                .item-details { display: flex; flex-direction: column; }
                .item-details .title { font-size: 14px; font-weight: 600; }
                .item-details .subtitle { font-size: 11px; opacity: 0.7; }

                .search-footer { padding: 10px 16px; border-top: 1px solid var(--border-color); background: var(--bg-secondary); display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
                kbd { background: var(--bg-glass-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); font-weight: 700; color: var(--text-secondary); }

                @media (max-width: 768px) {
                    .search-dropdown-overlay { position: fixed; inset: 0; top: var(--header-height); width: 100%; border-radius: 0; }
                }
            `}</style>
        </div>
    );
}
