"use client";
import useAuthStore from "@/store/useAuthStore";
import {
    LayoutDashboard, Users, Shield, MapPin, UserCog, Settings, CalendarCheck,
    HeartPulse, CreditCard, DollarSign, AlertTriangle, Bell, FileText,
    ShoppingBag, Image, BarChart3, ClipboardList, Sliders, LifeBuoy, Brain, ChevronRight, X
} from "lucide-react";

const navSections = [
    {
        title: "Overview",
        items: [
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'] },
        ],
    },
    {
        title: "Management",
        items: [
            { id: "roles", label: "Roles & Access", icon: Shield, roles: ['SUPER_ADMIN'] },
            { id: "cities", label: "City Management", icon: MapPin, roles: ['SUPER_ADMIN'] },
            { id: "users", label: "User Management", icon: UserCog, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "services", label: "Service Management", icon: Settings, badge: "Critical", roles: ['SUPER_ADMIN'] },
            { id: "home-essentials", label: "Home Essentials", icon: HeartPulse, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "bookings", label: "Booking Management", icon: CalendarCheck, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER'] },
            { id: "caregivers", label: "Caregiver / Vendor", icon: HeartPulse, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER'] },
        ],
    },
    {
        title: "Finance",
        items: [
            { id: "plans", label: "Plans & Subscriptions", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "pricing", label: "Pricing Engine", icon: DollarSign, roles: ['SUPER_ADMIN'] },
            { id: "payments", label: "Payments & Invoices", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE', 'CITY_ADMIN'] },
        ],
    },
    {
        title: "Operations",
        items: [
            { id: "sos", label: "SOS Emergency", icon: AlertTriangle, badge: "Live", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "notifications", label: "Notifications", icon: Bell, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "legal", label: "Legal CMS", icon: FileText, roles: ['SUPER_ADMIN'] },
            { id: "store", label: "Wellness Store", icon: ShoppingBag, roles: ['SUPER_ADMIN'] },
            { id: "media", label: "Media Library", icon: Image, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
        ],
    },
    {
        title: "Intelligence",
        items: [
            { id: "reports", label: "Reports & Analytics", icon: BarChart3, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "audit", label: "Audit Logs", icon: ClipboardList, roles: ['SUPER_ADMIN'] },
            { id: "server-ui", label: "Server Driven UI", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "support", label: "Support & Tickets", icon: LifeBuoy, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'SUPPORT_AGENT'] },
            { id: "smart", label: "Smart Features", icon: Brain, roles: ['SUPER_ADMIN'] },
        ],
    },
];

export default function Sidebar({ collapsed, open, currentPage, setCurrentPage, onClose }) {
    const { user } = useAuthStore();
    const userRole = user?.role || 'CITY_ADMIN';

    return (
        <>
            {open && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/icon.png" alt="O" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                                    return (
                                        <button
                                            key={item.id}
                                            className={`sidebar-link ${currentPage === item.id ? "active" : ""}`}
                                            onClick={() => { setCurrentPage(item.id); onClose?.(); }}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon size={18} />
                                            {!collapsed && <span>{item.label}</span>}
                                            {!collapsed && item.badge && (
                                                <span className="sidebar-badge">{item.badge}</span>
                                            )}
                                        </button>
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
