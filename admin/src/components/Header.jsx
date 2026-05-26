import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
    Bell, Moon, Sun, Menu, User, LogOut, Settings,
    AlertTriangle, Calendar, CreditCard, LifeBuoy, Clock, ChevronRight,
    CheckCircle2, MessageSquare, AlertCircle, X, LayoutList, Trash2
} from "lucide-react";
import useThemeStore from "@/store/useThemeStore";
import useAuthStore from "@/store/useAuthStore";
import GlobalSearch from "./GlobalSearch";
import { reportAPI } from "@/lib/api";
import { timeAgo, showToast, playTing } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

export default function Header({ onToggleSidebar, onMobileMenu }) {
    const { theme, toggleTheme } = useThemeStore();
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await reportAPI.getAlerts();
            const allAlerts = res.data.data || [];
            
            // Apply persistent filters
            const dismissedIds = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
            const lastCleared = parseInt(localStorage.getItem('lastClearedAlerts') || '0');
            
            const filtered = allAlerts.filter(alert => {
                const isDismissed = dismissedIds.includes(alert.id);
                const isOld = new Date(alert.time).getTime() <= lastCleared;
                return !isDismissed && !isOld;
            });
            
            setAlerts(filtered);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        // Initial fetch
        (async () => {
            await fetchAlerts();
        })();

        // Establish Real-time Connection
        (async () => {
            try {
                const socket = await getSocket();
                if (!socket) return;

                const handleNewAlert = (data) => {
                    const lastCleared = parseInt(localStorage.getItem('lastClearedAlerts') || '0');
                    if (new Date(data.time).getTime() <= lastCleared) return;

                    setAlerts(prev => {
                        const dismissedIds = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
                        if (dismissedIds.includes(data.id)) return prev;
                        return [data, ...prev].slice(0, 10);
                    });
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
                    playTing('sos');
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
                    playTing();
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
                    playTing();
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
                    playTing('message');
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

                socket.on("booking_payment_updated", (data) => {
                    handleNewAlert({
                        id: Date.now() + Math.random(),
                        type: data.paymentStatus === 'SUCCESS' ? 'booking' : 'warning',
                        title: data.paymentStatus === 'SUCCESS'
                            ? `💳 Payment Confirmed: ${data.bookingCode || ''}`
                            : `❌ Payment Failed: ${data.bookingCode || ''}`,
                        description: `${data.userName || ''} · ${data.serviceName || ''}`,
                        href: '/bookings',
                        time: new Date()
                    });
                    if (data.paymentStatus === 'SUCCESS') {
                        playTing();
                        showToast(`💳 Payment confirmed: ${data.bookingCode || ''}`, 'success');
                    } else {
                        playTing('sos');
                        showToast(`❌ Payment failed for ${data.userName || 'booking'}`, 'danger');
                    }
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
            } catch (err) {
                console.error('[Header] Socket error:', err);
            }
        })();
    }, []);

    const dismissAlert = (id, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Persist dismissal
        const dismissedIds = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
        if (!dismissedIds.includes(id)) {
            dismissedIds.push(id);
            localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedIds));
        }
        
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const clearAllAlerts = (e) => {
        if (e) e.stopPropagation();
        
        // Persist "Clear All" by setting a timestamp
        localStorage.setItem('lastClearedAlerts', Date.now().toString());
        // Also clear specific dismissed IDs to save space
        localStorage.setItem('dismissedAlerts', '[]');
        
        setAlerts([]);
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                                <div className="flex items-center gap-3">
                                    {alerts.length > 0 && (
                                        <button className="clear-all-btn" onClick={clearAllAlerts}>
                                            <Trash2 size={12} />
                                            <span>Clear All</span>
                                        </button>
                                    )}
                                    <Link 
                                        href="/notifications" 
                                        className="header-icon-btn" 
                                        title="Access Command Logs"
                                        onClick={() => setNotifOpen(false)}
                                    >
                                        <LayoutList size={16} />
                                    </Link>
                                    <span className="count-badge">{alerts.length}</span>
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
                                                className="notif-link"
                                                onClick={() => setNotifOpen(false)}
                                            >
                                                <div className={`notif-card ${ui.color}`}>
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
                                                        {alert.description && <p className="notif-desc">{alert.description}</p>}
                                                    </div>
                                                    <div className="notif-actions">
                                                        <button
                                                            className="dismiss-btn"
                                                            onClick={(e) => dismissAlert(alert.id, e)}
                                                            title="Dismiss"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <ChevronRight size={14} className="notif-arrow" />
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
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
                                <div className="hero-avatar">
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="hero-meta">
                                    <strong>{user?.name || 'Administrator'}</strong>
                                    <span className="badge-role">{user?.role?.replace('_', ' ') || 'SUPER ADMIN'}</span>
                                </div>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="p-3 flex flex-col gap-2">
                                <Link href="/profile" className="menu-link" onClick={() => setDropdownOpen(false)}>
                                    <div className="dropdown-item-new">
                                        <div className="item-icon-bg"><User size={16} /></div>
                                        <span>My Profile</span>
                                    </div>
                                </Link>
                                <Link href="/dashboard" className="menu-link" onClick={() => setDropdownOpen(false)}>
                                    <div className="dropdown-item-new">
                                        <div className="item-icon-bg"><Settings size={16} /></div>
                                        <span>System Settings</span>
                                    </div>
                                </Link>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="p-3">
                                <button className="menu-link-btn" onClick={handleLogout}>
                                    <div className="dropdown-item-new logout">
                                        <div className="item-icon-bg"><LogOut size={16} /></div>
                                        <span>Terminate Session</span>
                                    </div>
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

                .dropdown-body { max-height: 400px; overflow-y: auto; padding: 8px 0; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

                .notif-link {
                    text-decoration: none;
                    display: block;
                    margin: 0 10px 8px;
                }
                .notif-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    padding: 18px 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .notif-link:hover .notif-card { 
                    background: var(--bg-glass-hover); 
                    border-color: var(--accent-primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }

                .notif-icon-box {
                    width: 38px; height: 38px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-size: 18px;
                }
                .notif-icon-box.critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .notif-icon-box.primary { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
                .notif-icon-box.warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .notif-icon-box.info { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
                .notif-icon-box.secondary { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

                .notif-content { flex: 1; min-width: 0; }
                .type-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px; display: inline-block; }
                .type-tag.critical { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .type-tag.primary { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .type-tag.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .type-tag.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

                .notif-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 4px 0 2px; line-height: 1.4; }
                .notif-desc { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4; opacity: 0.8; }
                .notif-time { font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; font-weight: 600; opacity: 0.6; }

                .notif-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .notif-arrow { color: var(--text-muted); opacity: 0.3; transition: all 0.2s ease; }
                
                .dismiss-btn {
                    width: 22px; height: 22px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); opacity: 0; transition: all 0.2s;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                }
                .notif-link:hover .dismiss-btn { opacity: 0.8; }
                .dismiss-btn:hover { opacity: 1 !important; scale: 1.1; color: var(--accent-danger); border-color: var(--accent-danger); }

                .notif-link:hover .notif-arrow { opacity: 0.6; transform: translateX(2px); }

                .empty-notif { padding: 56px 24px; text-align: center; }
                .empty-icon-box { color: var(--accent-success); margin-bottom: 16px; opacity: 0.4; font-size: 40px; }
                .empty-notif h4 { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
                .empty-notif p { font-size: 13px; color: var(--text-muted); margin: 0; }

                .header-avatar {
                    width: 38px; height: 38px; border-radius: 50%;
                    background: var(--gradient-primary);
                    color: white; display: flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 800; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 2px solid var(--bg-card);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }
                .header-avatar:hover { transform: scale(1.08); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); }

                .clear-all-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 12px; border-radius: 6px;
                    font-size: 10px; font-weight: 800; text-transform: uppercase;
                    color: var(--text-muted); background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    transition: all 0.2s; cursor: pointer;
                }
                .clear-all-btn:hover {
                    color: #ef4444; background: rgba(239, 68, 68, 0.05);
                    border-color: rgba(239, 68, 68, 0.2);
                }

                .header-icon-btn {
                    width: 28px; height: 28px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); background: rgba(99, 102, 241, 0.05);
                    transition: all 0.2s ease;
                    border: 1px solid var(--border-color);
                }
                .header-icon-btn:hover {
                    color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.15);
                    border-color: var(--accent-primary);
                    transform: translateY(-1px);
                }

                /* Profile Dropdown */
                .profile-dropdown {
                    width: 320px;
                }

                /* Profile Hero Section */
                .user-hero {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 16px;
                    background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
                    border-bottom: 1px solid var(--border-color);
                }
                .hero-avatar {
                    width: 64px; height: 64px; border-radius: 50%;
                    background: var(--gradient-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 26px;
                    flex-shrink: 0;
                    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
                    border: 4px solid var(--bg-card);
                }
                .hero-meta { display: flex; flex-direction: column; align-items: center; gap: 6px; }
                .hero-meta strong { font-size: 17px; color: var(--text-primary); font-weight: 800; }
                .badge-role { 
                    font-size: 9px; font-weight: 800; text-transform: uppercase; 
                    letter-spacing: 1px; padding: 4px 10px; border-radius: 20px;
                    background: rgba(99, 102, 241, 0.1); color: var(--accent-primary);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                }

                .dropdown-divider { height: 1px; background: var(--border-color); margin: 0; }

                .menu-link, .menu-link-btn {
                    text-decoration: none;
                    display: block;
                    width: 100%;
                    background: transparent;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                }

                .dropdown-item-new {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 14px 18px;
                    border-radius: 14px;
                    color: var(--text-secondary);
                    font-size: 15px;
                    font-weight: 600;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid transparent;
                }
                .menu-link:hover .dropdown-item-new, .menu-link-btn:hover .dropdown-item-new {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    transform: translateX(5px);
                    border-color: var(--border-color);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
                }
                .item-icon-bg {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    color: var(--text-muted);
                    border: 1px solid var(--border-color);
                }
                .menu-link:hover .item-icon-bg, .menu-link-btn:hover .item-icon-bg {
                    background: white;
                    color: var(--accent-primary);
                    border-color: var(--accent-primary);
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
                }
                .dropdown-item-new.logout { color: #ef4444; }
                .menu-link-btn:hover .dropdown-item-new.logout { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }
                .logout .item-icon-bg { background: rgba(239, 68, 68, 0.05); border-color: transparent; }
                .menu-link-btn:hover .logout .item-icon-bg { background: white; color: #ef4444; border-color: #ef4444; }

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
