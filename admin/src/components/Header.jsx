import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Bell, Moon, Sun, Menu, User, LogOut, Settings,
    AlertTriangle, Calendar, CreditCard, LifeBuoy, Clock, ChevronRight,
    CheckCircle2, MessageSquare, AlertCircle
} from "lucide-react";
import useThemeStore from "@/store/useThemeStore";
import useAuthStore from "@/store/useAuthStore";
import GlobalSearch from "./GlobalSearch";
import { reportAPI } from "@/lib/api";
import { timeAgo, showToast } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

export default function Header({ onToggleSidebar, onMobileMenu }) {
    const { theme, toggleTheme } = useThemeStore();
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        // Initial fetch
        fetchAlerts();

        // Establish Real-time Connection
        const socket = getSocket();

        const handleNewAlert = (data) => {
            setAlerts(prev => [data, ...prev].slice(0, 10));
        };

        // SOS & Booking alerts
        socket.on("new_sos", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'sos',
                title: data.title,
                description: data.title,
                href: '/sos',
                time: new Date()
            });
            showToast(`🚨 ${data.title}`, 'danger');
        });

        socket.on("new_booking", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'booking',
                title: `New Booking: ${data.serviceType || 'Service'}`,
                description: `By: ${data.userName}`,
                href: '/bookings',
                time: new Date()
            });
            showToast(`📅 New Booking: ${data.serviceType || 'Service'}`, 'success');
        });

        // Support & Ticket alerts
        socket.on("new_ticket", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'ticket',
                title: `New Ticket: ${data.subject}`,
                description: `Priority: ${data.priority}`,
                href: '/support',
                time: new Date()
            });
            showToast(`🎫 New Support Ticket: ${data.subject}`, 'success');
        });

        socket.on("ticket_message_added", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'ticket_message',
                title: `New Message on Ticket`,
                description: `From: ${data.senderName}`,
                href: '/support',
                time: new Date()
            });
            showToast(`💬 New Support Message from ${data.senderName}`, 'info');
        });

        socket.on("booking_status_changed", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'booking_status',
                title: `Booking Status: ${data.status}`,
                description: `User: ${data.userName}`,
                href: '/bookings',
                time: new Date()
            });
        });

        socket.on("low_responder_availability", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'warning',
                title: 'Low Responder Availability',
                description: `Only ${data.availableCount} responders available`,
                href: '/caregivers',
                time: new Date()
            });
            showToast(`⚠️ Low availability: Only ${data.availableCount} responders available`, 'warning');
        });

        socket.on("response_time_breach", (data) => {
            handleNewAlert({
                id: Date.now() + Math.random(),
                type: 'critical',
                title: 'Response Time Breach',
                description: `${data.userName} waiting ${data.minutesWaiting}+ mins`,
                href: '/sos',
                time: new Date()
            });
            showToast(`🚨 Alert waiting ${data.minutesWaiting}+ minutes`, 'danger');
        });

        socket.on("booking_updated", fetchAlerts);

        return () => {
            socket.off("new_sos");
            socket.off("new_booking");
            socket.off("new_ticket");
            socket.off("ticket_message_added");
            socket.off("booking_status_changed");
            socket.off("low_responder_availability");
            socket.off("response_time_breach");
            socket.off("booking_updated");
        };
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await reportAPI.getAlerts();
            setAlerts(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
    };

    const getAlertUI = (type) => {
        switch (type) {
            case 'sos':
            case 'SOS':
                return { icon: <AlertTriangle size={14} />, color: 'critical', label: 'SOS' };
            case 'booking':
            case 'BOOKING':
                return { icon: <Calendar size={14} />, color: 'primary', label: 'BOOKING' };
            case 'booking_status':
                return { icon: <Calendar size={14} />, color: 'info', label: 'STATUS' };
            case 'ticket':
            case 'ticket_message':
            case 'TICKET':
                return { icon: <MessageSquare size={14} />, color: 'info', label: 'SUPPORT' };
            case 'critical':
                return { icon: <AlertTriangle size={14} />, color: 'critical', label: 'CRITICAL' };
            case 'warning':
                return { icon: <AlertCircle size={14} />, color: 'warning', label: 'WARNING' };
            case 'PAYMENT':
                return { icon: <CreditCard size={14} />, color: 'warning', label: 'PAYMENT' };
            default:
                return { icon: <Bell size={14} />, color: 'secondary', label: 'SYSTEM' };
        }
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
                <GlobalSearch />
            </div>
            <div className="header-right">
                <button className="header-btn" onClick={toggleTheme} title="Toggle Dark Mode">
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* Notification Dropdown */}
                <div className="header-notif-container" ref={notifRef}>
                    <button
                        className={`header-btn ${notifOpen ? 'active' : ''}`}
                        onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
                    >
                        <Bell size={18} />
                        {alerts.length > 0 && <span className="notification-dot pulse"></span>}
                    </button>

                    {notifOpen && (
                        <div className="notif-dropdown premium-dropdown shadow-xl">
                            <div className="dropdown-header glass-header">
                                <div className="flex flex-col">
                                    <h3>Operational Alerts</h3>
                                    <span className="text-2xs font-bold text-muted uppercase tracking-wider">Real-time Command Centre</span>
                                </div>
                                <div className="header-badges">
                                    <span className="count-badge">{alerts.length} New</span>
                                </div>
                            </div>
                            <div className="dropdown-body custom-scrollbar">
                                {alerts.length === 0 ? (
                                    <div className="empty-notif">
                                        <div className="empty-icon-box"><CheckCircle2 size={32} /></div>
                                        <h4>All Systems Normal</h4>
                                        <p>No high-priority alerts pending attention.</p>
                                    </div>
                                ) : (
                                    alerts.map(alert => {
                                        const ui = getAlertUI(alert.type);
                                        return (
                                            <Link
                                                key={alert.id}
                                                href={alert.href}
                                                className={`notif-item ${ui.color}`}
                                                onClick={() => setNotifOpen(false)}
                                            >
                                                <div className={`notif-icon-box ${ui.color}`}>
                                                    {ui.icon}
                                                </div>
                                                <div className="notif-content">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`type-tag ${ui.color}`}>{ui.label}</span>
                                                        <span className="notif-time">
                                                            <Clock size={10} /> {timeAgo(alert.time)}
                                                        </span>
                                                    </div>
                                                    <p className="notif-title">{alert.title}</p>
                                                </div>
                                                <ChevronRight size={14} className="notif-arrow" />
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                            <Link href="/notifications" className="dropdown-footer" onClick={() => setNotifOpen(false)}>
                                <span>Access Command Logs</span>
                                <ChevronRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="header-profile-container" ref={dropdownRef}>
                    <div
                        className="header-avatar"
                        onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
                    >
                        {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
                    </div>

                    {dropdownOpen && (
                        <div className="profile-dropdown premium-dropdown shadow-xl">
                            <div className="dropdown-user-info user-hero">
                                <div className="hero-avatar">{user?.name?.charAt(0)}</div>
                                <div className="hero-meta">
                                    <strong>{user?.name || 'Administrator'}</strong>
                                    <span>{user?.role?.replace('_', ' ') || 'Admin Account'}</span>
                                </div>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="p-2 flex flex-col gap-1">
                                <Link href="/profile" className="dropdown-item-new" onClick={() => setDropdownOpen(false)}>
                                    <div className="item-icon-bg"><User size={16} /></div>
                                    <span>My Profile</span>
                                </Link>
                                <Link href="/dashboard" className="dropdown-item-new" onClick={() => setDropdownOpen(false)}>
                                    <div className="item-icon-bg"><Settings size={16} /></div>
                                    <span>System Settings</span>
                                </Link>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="p-2">
                                <button className="dropdown-item-new logout" onClick={handleLogout}>
                                    <div className="item-icon-bg"><LogOut size={16} /></div>
                                    <span>Terminate Session</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .header-notif-container, .header-profile-container { position: relative; }

                /* Premium Dropdown Base */
                .premium-dropdown {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: -8px;
                    width: 420px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    z-index: 1000;
                    overflow: hidden;
                    transform-origin: top right;
                    animation: premiumIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
                }

                @keyframes premiumIn {
                    from { opacity: 0; transform: scale(0.92) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                /* Notification Specifics */
                .glass-header {
                    padding: 24px;
                    background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99, 102, 241, 0.02) 100%);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                }
                .glass-header h3 { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0; }
                .glass-header span { font-size: 11px; }
                .count-badge { background: linear-gradient(135deg, var(--accent-danger), #dc2626); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; }

                .dropdown-body { max-height: 500px; overflow-y: auto; padding: 8px 0; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

                .notif-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px 16px;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    border-bottom: 1px solid var(--border-color);
                    margin: 0 8px;
                    border-radius: 8px;
                    margin-bottom: 4px;
                }
                .notif-item:hover { background: var(--bg-glass-hover); transform: translateX(3px); }
                .notif-item:last-child { border-bottom: none; margin-bottom: 0; }

                .notif-icon-box {
                    width: 38px; height: 38px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-size: 18px;
                }
                .notif-icon-box.critical { background: rgba(239, 68, 68, 0.15); color: var(--accent-danger); }
                .notif-icon-box.primary { background: rgba(4, 131, 87, 0.15); color: var(--accent-primary); }
                .notif-icon-box.warning { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
                .notif-icon-box.info { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
                .notif-icon-box.secondary { background: rgba(107, 114, 128, 0.15); color: #6B7280; }

                .notif-content { flex: 1; min-width: 0; }
                .type-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 3px 7px; border-radius: 5px; display: inline-block; }
                .type-tag.critical { background: rgba(239, 68, 68, 0.12); color: var(--accent-danger); }
                .type-tag.primary { background: rgba(4, 131, 87, 0.12); color: var(--accent-primary); }
                .type-tag.warning { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
                .type-tag.info { background: rgba(59, 130, 246, 0.12); color: #3B82F6; }

                .notif-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 3px 0 4px; line-height: 1.3; }
                .notif-time { font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 3px; font-weight: 600; opacity: 0.7; }

                .notif-arrow { color: var(--text-muted); opacity: 0.3; transition: all 0.2s ease; }
                .notif-item:hover .notif-arrow { opacity: 0.6; transform: translateX(2px); }

                .empty-notif { padding: 56px 24px; text-align: center; }
                .empty-icon-box { color: var(--accent-success); margin-bottom: 16px; opacity: 0.4; font-size: 40px; }
                .empty-notif h4 { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
                .empty-notif p { font-size: 13px; color: var(--text-muted); margin: 0; }

                .dropdown-footer {
                    padding: 16px 24px; text-align: center; border-top: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    font-size: 13px; font-weight: 700; color: var(--text-primary); background: var(--bg-secondary);
                    transition: all 0.2s; text-decoration: none; cursor: pointer;
                }
                .dropdown-footer:hover { background: linear-gradient(135deg, var(--bg-secondary), rgba(99, 102, 241, 0.02)); }

                /* Profile Dropdown */
                .profile-dropdown {
                    width: 320px;
                }

                /* Profile Hero Section */
                .user-hero {
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99, 102, 241, 0.03) 100%);
                }
                .hero-avatar {
                    width: 48px; height: 48px; border-radius: 12px;
                    background: var(--gradient-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 20px;
                    flex-shrink: 0;
                    box-shadow: 0 6px 12px rgba(99, 102, 241, 0.25);
                }
                .hero-meta { display: flex; flex-direction: column; gap: 2px; }
                .hero-meta strong { font-size: 15px; display: block; color: var(--text-primary); font-weight: 700; }
                .hero-meta span { font-size: 12px; color: var(--text-muted); font-weight: 500; }

                .dropdown-divider { height: 1px; background: var(--border-color); margin: 0; }

                .dropdown-item-new {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 11px 12px;
                    margin: 4px 8px;
                    border-radius: 10px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    cursor: pointer;
                }
                .dropdown-item-new:hover {
                    background: var(--bg-glass);
                    color: var(--text-primary);
                    transform: translateX(3px);
                }
                .item-icon-bg {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    color: var(--text-muted);
                }
                .dropdown-item-new:hover .item-icon-bg {
                    background: rgba(99, 102, 241, 0.15);
                    color: var(--accent-primary);
                }
                .logout { color: var(--text-secondary); }
                .logout:hover { background: rgba(239, 68, 68, 0.08); color: var(--accent-danger); }
                .logout:hover .item-icon-bg { background: rgba(239, 68, 68, 0.12); color: var(--accent-danger); }

                /* Mobile Responsiveness */
                @media (max-width: 768px) {
                    .premium-dropdown {
                        width: 380px;
                    }
                }

                @media (max-width: 480px) {
                    .premium-dropdown {
                        position: fixed;
                        top: 70px;
                        left: 12px;
                        right: 12px;
                        width: auto;
                        max-width: none;
                        border-radius: 16px;
                    }
                    .profile-dropdown {
                        right: auto !important;
                        left: -8px !important;
                    }
                }

                .notification-dot.pulse { animation: pulseAnim 2s infinite; }
                @keyframes pulseAnim {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </header>
    );
}
