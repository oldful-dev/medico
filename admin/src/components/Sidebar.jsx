"use client";
import Image from "next/image";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import {
    LayoutDashboard, Users, Shield, MapPin, UserCog, Settings, CalendarCheck,
    HeartPulse, CreditCard, DollarSign, AlertTriangle, Bell, FileText,
    ShoppingBag, Image as ImageIcon, BarChart3, ClipboardList, Sliders, LifeBuoy, Brain, ChevronRight, X
} from "lucide-react";

const navSections = [
    {
        title: "Overview",
        items: [
            { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'] },
        ],
    },
    {
        title: "Staff & Users",
        items: [
            { id: "profiles", href: "/profiles", label: "Staff Profiles", icon: Shield, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "staff-config", href: "/settings/profiles", label: "Staff Configuration", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "users", href: "/users", label: "Clients / Patients", icon: Users, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
        ],
    },
    {
        title: "System Config",
        items: [
            { id: "roles", href: "/roles", label: "Roles & Access", icon: Shield, roles: ['SUPER_ADMIN'] },
            { id: "cities", href: "/cities", label: "City Management", icon: MapPin, roles: ['SUPER_ADMIN'] },
            { id: "services", href: "/services", label: "Service Management", icon: Settings, roles: ['SUPER_ADMIN'] },
            { id: "home-essentials", href: "/home-essentials", label: "Home Essentials", icon: HeartPulse, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "bookings", href: "/bookings", label: "Booking Management", icon: CalendarCheck, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER'] },
        ],
    },
    {
        title: "Finance",
        items: [
            { id: "plans", href: "/plans", label: "Plans & Subscriptions", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "pricing", href: "/pricing", label: "Pricing Engine", icon: DollarSign, roles: ['SUPER_ADMIN'] },
            { id: "payments", href: "/payments", label: "Payments & Invoices", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE', 'CITY_ADMIN'] },
        ],
    },
    {
        title: "Operations",
        items: [
            { id: "sos", href: "/sos", label: "SOS Emergency", icon: AlertTriangle, badge: "Live", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "notifications", href: "/notifications", label: "Notifications", icon: Bell, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "legal", href: "/legal", label: "Legal CMS", icon: FileText, roles: ['SUPER_ADMIN'] },
            { id: "store", href: "/store", label: "Wellness Store", icon: ShoppingBag, roles: ['SUPER_ADMIN'] },
            { id: "media", href: "/media", label: "Media Library", icon: ImageIcon, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
        ],
    },
    {
        title: "Intelligence",
        items: [
            { id: "reports", href: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "audit", href: "/audit", label: "Audit Logs", icon: ClipboardList, roles: ['SUPER_ADMIN'] },
            { id: "server-ui", href: "/server-ui", label: "Server Driven UI", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "support", href: "/support", label: "Support & Tickets", icon: LifeBuoy, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'SUPPORT_AGENT'] },
            { id: "smart", href: "/smart", label: "Smart Features", icon: Brain, roles: ['SUPER_ADMIN'] },
        ],
    },
];

export default function Sidebar({ collapsed, open, currentPage, onClose }) {
    const { user } = useAuthStore();
    const userRole = user?.role || 'CITY_ADMIN';

    return (
        <>
            {open && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Image src="/icon.png" alt="O" width={40} height={40} style={{ objectFit: 'contain' }} priority />
                    </div>
                    {(!collapsed || open) && (
                        <div className="sidebar-brand">
                            <h1>Oldful</h1>
                            <span>Admin Panel</span>
                        </div>
                    )}
                    <button className="mobile-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {navSections.map((section) => {
                        const filteredItems = section.items.filter(item => item.roles.includes(userRole));
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={section.title} className="sidebar-section">
                                {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
                                {filteredItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPage === item.id;
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
