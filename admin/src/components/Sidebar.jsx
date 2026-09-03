"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { NAV_SECTIONS } from "@/lib/nav";
import { X } from "lucide-react";

export default function Sidebar({ collapsed, open, currentPath, onClose }) {
    const { user } = useAuthStore();
    const userRole = user?.role || 'CITY_ADMIN';
    const searchParams = useSearchParams();
    const currentSearch = searchParams ? searchParams.toString() : "";
    const navRef = useRef(null);
    const activeLinkRef = useRef(null);

    // Restore scroll position or scroll active item into view on route change
    useEffect(() => {
        if (!navRef.current) return;
        const savedScroll = sessionStorage.getItem("admin_sidebar_scroll_top");
        if (savedScroll !== null) {
            navRef.current.scrollTop = parseInt(savedScroll, 10);
        } else if (activeLinkRef.current) {
            activeLinkRef.current.scrollIntoView({ block: "nearest" });
        }
    }, [currentPath, currentSearch]);

    const handleScroll = (e) => {
        sessionStorage.setItem("admin_sidebar_scroll_top", String(e.currentTarget.scrollTop));
    };

    const handleLinkClick = () => {
        if (navRef.current) {
            sessionStorage.setItem("admin_sidebar_scroll_top", String(navRef.current.scrollTop));
        }
        if (onClose) onClose();
    };

    return (
        <>
            {open && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Image src="/onlylogo.png" alt="Ayuxa Logo" width={40} height={40} style={{ objectFit: 'contain' }} priority />
                    </div>
                    {(!collapsed || open) && (
                        <div className="sidebar-brand">
                            <h1>Ayuxa</h1>
                            <span>Admin Panel</span>
                        </div>
                    )}
                    <button className="mobile-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <nav className="sidebar-nav" ref={navRef} onScroll={handleScroll}>
                    {NAV_SECTIONS.map((section) => {
                        const filteredItems = section.items.filter(item => item.roles.includes(userRole));
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={section.title} className="sidebar-section">
                                {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
                                {filteredItems.map((item) => {
                                    const Icon = item.icon;
                                    const [itemPath, itemQuery = ""] = item.href.split('?');
                                    
                                    let isActive = false;
                                    if (itemQuery) {
                                        isActive = currentPath === itemPath && currentSearch.includes(itemQuery);
                                    } else {
                                        if (itemPath === "/dashboard") {
                                            isActive = currentPath === "/dashboard" || currentPath === "/";
                                        } else {
                                            isActive = currentPath === itemPath || currentPath.startsWith(itemPath + '/');
                                        }
                                    }

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            ref={isActive ? activeLinkRef : null}
                                            className={`sidebar-link ${isActive ? "active" : ""}`}
                                            onClick={handleLinkClick}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon size={18} />
                                            {!collapsed && <span>{item.label}</span>}
                                            {!collapsed && item.badge && (
                                                <span className="sidebar-badge">{item.badge}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
