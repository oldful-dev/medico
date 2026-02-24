"use client";
import { Search, Bell, Moon, Menu } from "lucide-react";

export default function Header({ onToggleSidebar, onMobileMenu }) {
    return (
        <header className="admin-header">
            <div className="header-left">
                <button className="header-toggle" onClick={onToggleSidebar}>
                    <Menu size={20} />
                </button>
                <div className="header-search">
                    <Search size={16} />
                    <input type="text" placeholder="Search anything... (⌘K)" />
                </div>
            </div>
            <div className="header-right">
                <button className="header-btn">
                    <Moon size={18} />
                </button>
                <button className="header-btn">
                    <Bell size={18} />
                    <span className="notification-dot"></span>
                </button>
                <div className="header-avatar">SA</div>
            </div>
        </header>
    );
}
