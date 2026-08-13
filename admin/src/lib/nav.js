import {
    LayoutDashboard, Users, Shield, MapPin, Settings, CalendarCheck,
    HeartPulse, CreditCard, DollarSign, AlertTriangle, Bell, FileText,
    ShoppingBag, Image as ImageIcon, BarChart3, ClipboardList, Sliders, LifeBuoy, Brain, Clock, Activity, Sparkles, PartyPopper,
    Trash2, Banknote, TestTube2, Smartphone, Globe
} from "lucide-react";

export const NAV_SECTIONS = [
    {
        title: "Overview",
        items: [
            { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'] },
        ],
    },
    {
        title: "Staff & Users",
        items: [
            { id: "staff-management", href: "/staff-management", label: "Staff Management", icon: Shield, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "roles", href: "/roles", label: "Role & Access Management", icon: Shield, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "User Profiles",
        items: [
            { id: "users", href: "/users", label: "Client & Patient", icon: Users, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "app-users", href: "/app-users", label: "App Users & Installation", icon: Smartphone, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Operations",
        items: [
            { id: "services", href: "/services", label: "Service Management", icon: Settings, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "home-essentials", href: "/home-essentials", label: "Home Essential", icon: HeartPulse, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "bookings", href: "/bookings", label: "Booking Management", icon: CalendarCheck, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "server-ui", href: "/server-ui", label: "Server UI Configuration", icon: Sliders, roles: ['SUPER_ADMIN'] },
            { id: "store", href: "/store", label: "Wellness Store", icon: ShoppingBag, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "company-settings", href: "/settings/company", label: "Company Settings", icon: Settings, roles: ['SUPER_ADMIN'], subItems: ['contact', 'notifications', 'team'] },
            { id: "website-settings", href: "/website-settings", label: "All Website Settings", icon: Globe, roles: ['SUPER_ADMIN'] },
            { id: "sos", href: "/sos", label: "SOS & Emergency", icon: AlertTriangle, badge: "Live", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT'] },
            { id: "cities", href: "/cities", label: "City Management", icon: MapPin, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "meetups", href: "/meetups", label: "Local Meetups", icon: PartyPopper, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "banners", href: "/banners", label: "Home Banner", icon: Sparkles, badge: "New", roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "media", href: "/media", label: "Media Library", icon: ImageIcon, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "lab-orders", href: "/lab-orders", label: "Blood Test Orders", icon: TestTube2, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'] },
            { id: "notifications", href: "/notifications", label: "Notification Management", icon: Bell, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
        ],
    },
    {
        title: "Finance & Subscription",
        items: [
            { id: "plans", href: "/plans", label: "Plans & Subscriptions", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "payments", href: "/payments", label: "Payments & Invoices", icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "pricing", href: "/pricing", label: "Pricing Engine", icon: DollarSign, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "failed-payments", href: "/payments?status=FAILED", label: "Failed Payments", icon: AlertTriangle, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
            { id: "cod", href: "/payments?method=CASH", label: "Cash on Delivery", icon: Banknote, roles: ['SUPER_ADMIN', 'BILLING_EXECUTIVE'] },
        ],
    },
    {
        title: "Intelligence & Control",
        items: [
            { id: "support", href: "/support", label: "Support Tickets", icon: LifeBuoy, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'SUPPORT_AGENT'] },
            { id: "legal", href: "/legal", label: "Legal CMS", icon: FileText, roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
            { id: "smart", href: "/smart", label: "Smart Features", icon: Brain, roles: ['SUPER_ADMIN'] },
            { id: "sessions", href: "/sessions", label: "Active Sessions", icon: Activity, roles: ['SUPER_ADMIN'] },
            { id: "user-activity", href: "/user-activity", label: "User Activity", icon: Activity, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "audit", href: "/audit", label: "Audit Logs", icon: ClipboardList, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "reports", href: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'] },
            { id: "deleted-data", href: "/deleted-data", label: "Deleted Data Repository", icon: Trash2, roles: ['SUPER_ADMIN'] },
        ],
    },
];

export const ALL_PAGES = NAV_SECTIONS.flatMap(section =>
    section.items.map(item => ({
        ...item,
        category: section.title
    }))
);
