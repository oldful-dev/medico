import {
    LayoutDashboard, Users, Shield, MapPin, Settings, CalendarCheck,
    HeartPulse, CreditCard, DollarSign, AlertTriangle, Bell, FileText,
    ShoppingBag, Image as ImageIcon, BarChart3, ClipboardList, Sliders, LifeBuoy, Brain, Clock, Activity, Sparkles, PartyPopper
} from "lucide-react";

export const NAV_SECTIONS = [
    {
        title: "Overview",
        items: [
            { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'] },
            { id: "sessions", href: "/sessions", label: "Active Sessions", icon: Activity, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Staff & Users",
        items: [
            { id: "profiles", href: "/profiles", label: "Staff Profiles", icon: Shield, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "staff-config", href: "/settings/profiles", label: "Staff Configuration", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "users", href: "/users", label: "Clients / Patients", icon: Users, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
        ],
    },
    {
        title: "System Config",
        items: [
            { id: "roles", href: "/roles", label: "Roles & Access", icon: Shield, roles: ['SUPER_ADMIN'] },
            { id: "cities", href: "/cities", label: "City Management", icon: MapPin, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "services", href: "/services", label: "Service Management", icon: Settings, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "home-essentials", href: "/home-essentials", label: "Home Essentials", icon: HeartPulse, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "bookings", href: "/bookings", label: "Booking Management", icon: CalendarCheck, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "server-ui", href: "/server-ui", label: "Server UI Config", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "company-settings", href: "/settings/company", label: "Company Settings", icon: Settings, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Finance",
        items: [
            { id: "plans", href: "/plans", label: "Plans & Subscriptions", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "pricing", href: "/pricing", label: "Pricing Engine", icon: DollarSign, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "payments", href: "/payments", label: "Payments & Invoices", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
        ],
    },
    {
        title: "Operations",
        items: [
            { id: "sos", href: "/sos", label: "SOS Emergency", icon: AlertTriangle, badge: "Live", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "notifications", href: "/notifications", label: "Notifications", icon: Bell, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "banners", href: "/banners", label: "Home Banners", icon: Sparkles, badge: "New", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "meetups", href: "/meetups", label: "Local Meetups", icon: PartyPopper, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "legal", href: "/legal", label: "Legal CMS", icon: FileText, roles: ['SUPER_ADMIN'] },
            { id: "store", href: "/store", label: "Wellness Store", icon: ShoppingBag, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "media", href: "/media", label: "Media Library", icon: ImageIcon, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
        ],
    },
    {
        title: "Intelligence",
        items: [
            { id: "reports", href: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "audit", href: "/audit", label: "Audit Logs", icon: ClipboardList, roles: ['SUPER_ADMIN'] },
            { id: "support", href: "/support", label: "Support & Tickets", icon: LifeBuoy, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'SUPPORT_AGENT'] },
            { id: "smart", href: "/smart", label: "Smart Features", icon: Brain, roles: ['SUPER_ADMIN'] },
        ],
    },
];

export const ALL_PAGES = NAV_SECTIONS.flatMap(section => 
    section.items.map(item => ({
        ...item,
        category: section.title
    }))
);
