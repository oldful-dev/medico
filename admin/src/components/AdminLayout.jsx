"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import useAuthStore from "@/store/useAuthStore";

export default function AdminLayout({ children, currentPage, setCurrentPage }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const { isAuthenticated, loading, checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    if (loading || !isAuthenticated) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-dark)" }}>
                <div style={{ width: 40, height: 40, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <Sidebar
                collapsed={sidebarCollapsed}
                open={sidebarOpen}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="main-content" style={{ marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
                <Header
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onMobileMenu={() => setSidebarOpen(!sidebarOpen)}
                />
                <div className="page-content page-enter">
                    {children}
                </div>
            </div>
        </div>
    );
}
