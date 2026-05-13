"use client";
import Image from "next/image";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { NAV_SECTIONS } from "@/lib/nav";
import { X } from "lucide-react";

export default function Sidebar({ collapsed, open, currentPath, onClose }) {
    const { user } = useAuthStore();
    const userRole = user?.role || 'CITY_ADMIN';

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
                <nav className="sidebar-nav">
                    {NAV_SECTIONS.map((section) => {
                        const filteredItems = section.items.filter(item => item.roles.includes(userRole));
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={section.title} className="sidebar-section">
                                {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
                                {filteredItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPath === item.href;
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={`sidebar-link ${isActive ? "active" : ""}`}
                                            onClick={onClose}
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
