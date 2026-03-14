import { useState, useEffect } from "react";
import { Search, Bell, Moon, Sun, Menu, User, LogOut, Settings } from "lucide-react";
import useThemeStore from "@/store/useThemeStore";
import useAuthStore from "@/store/useAuthStore";
import { authAPI } from "@/lib/api";

export default function Header({ onToggleSidebar, onMobileMenu, setCurrentPage }) {
    const { theme, toggleTheme } = useThemeStore();
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
    };

    const handleNav = (id) => {
        setCurrentPage(id);
        setDropdownOpen(false);
    };

    return (
        <header className="admin-header">
            <div className="header-left">
                <button className="header-toggle desktop" onClick={onToggleSidebar}>
                    <Menu size={20} />
                </button>
                <button className="header-toggle mobile" onClick={onMobileMenu}>
                    <Menu size={20} />
                </button>
                <div className="header-search">
                    <Search size={16} />
                    <input type="text" placeholder="Search anything... (⌘K)" />
                </div>
            </div>
            <div className="header-right">
                <button className="header-btn" onClick={toggleTheme} title="Toggle Dark Mode">
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button className="header-btn">
                    <Bell size={18} />
                    <span className="notification-dot"></span>
                </button>
                
                <div className="header-profile-container" style={{ position: 'relative' }}>
                    <div 
                        className="header-avatar" 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ cursor: 'pointer' }}
                    >
                        {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
                    </div>

                    {dropdownOpen && (
                        <div className="profile-dropdown">
                            <div className="dropdown-user-info">
                                <strong>{user?.name || 'Administrator'}</strong>
                                <span>{user?.role?.replace('_', ' ') || 'Admin'}</span>
                            </div>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => handleNav('users')}>
                                <User size={16} /> Profile Settings
                            </button>
                            <button className="dropdown-item" onClick={() => handleNav('dashboard')}>
                                <Settings size={16} /> System Config
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item logout" onClick={handleLogout}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
