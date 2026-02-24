"use client";
import {
    LayoutDashboard, Users, Shield, MapPin, UserCog, Settings, CalendarCheck,
    HeartPulse, CreditCard, DollarSign, AlertTriangle, Bell, FileText,
    ShoppingBag, Image, BarChart3, ClipboardList, Sliders, LifeBuoy, Brain, ChevronRight
} from "lucide-react";

const navSections = [
    {
        title: "Overview",
        items: [
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "Management",
        items: [
            { id: "roles", label: "Roles & Access", icon: Shield },
            { id: "cities", label: "City Management", icon: MapPin },
            { id: "users", label: "User Management", icon: UserCog },
            { id: "services", label: "Service Management", icon: Settings, badge: "Critical" },
            { id: "bookings", label: "Booking Management", icon: CalendarCheck },
            { id: "caregivers", label: "Caregiver / Vendor", icon: HeartPulse },
        ],
    },
    {
        title: "Finance",
        items: [
            { id: "plans", label: "Plans & Subscriptions", icon: CreditCard },
            { id: "pricing", label: "Pricing Engine", icon: DollarSign },
            { id: "payments", label: "Payments & Invoices", icon: CreditCard },
        ],
    },
    {
        title: "Operations",
        items: [
            { id: "sos", label: "SOS Emergency", icon: AlertTriangle, badge: "Live" },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "legal", label: "Legal CMS", icon: FileText },
            { id: "store", label: "Wellness Store", icon: ShoppingBag },
            { id: "media", label: "Media Library", icon: Image },
        ],
    },
    {
        title: "Intelligence",
        items: [
            { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
            { id: "audit", label: "Audit Logs", icon: ClipboardList },
            { id: "server-ui", label: "Server Driven UI", icon: Sliders },
            { id: "support", label: "Support & Tickets", icon: LifeBuoy },
            { id: "smart", label: "Smart Features", icon: Brain },
        ],
    },
];

export default function Sidebar({ collapsed, open, currentPage, setCurrentPage, onClose }) {
    return (
        <>
            {open && <div className="sidebar-overlay" onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99
            }} />}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">M</div>
                    {!collapsed && (
                        <div className="sidebar-brand">
                            <h1>Medico</h1>
                            <span>Admin Panel</span>
                        </div>
                    )}
                </div>
                <nav className="sidebar-nav">
                    {navSections.map((section) => (
                        <div key={section.title} className="sidebar-section">
                            {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
                            {section.items.map((item) => {
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
                    ))}
                </nav>
            </aside>
        </>
    );
}
