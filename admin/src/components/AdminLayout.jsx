"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AdminLayout({ children, currentPage, setCurrentPage }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
