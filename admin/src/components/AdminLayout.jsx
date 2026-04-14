"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import useAuthStore from "@/store/useAuthStore";
import useThemeStore from "@/store/useThemeStore";

export default function AdminLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, loading, checkAuth } = useAuthStore();
    const { theme } = useThemeStore();

    // The key is the ID used in our navSections
    const currentPage = pathname.split('/').pop() || 'dashboard';

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [sidebarOpen]);

    if (loading || !isAuthenticated) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-dark)" }}>
                <div style={{ width: 40, height: 40, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar
                collapsed={sidebarCollapsed}
                open={sidebarOpen}
                currentPage={currentPage}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="main-content">
                <Header
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onMobileMenu={() => setSidebarOpen(!sidebarOpen)}
                />
                <div className="page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
