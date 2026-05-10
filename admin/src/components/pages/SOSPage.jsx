"use client";
import { useState, useEffect } from "react";
import {
    AlertTriangle, Phone, MapPin, Clock, UserPlus, CheckCircle,
    Activity, Shield, Users, Radio, Navigation, ExternalLink, ChevronRight,
    Search, Filter, ChevronLeft, ChevronDown
} from "lucide-react";
import { sosAPI, caregiverAPI } from "@/lib/api";
import { timeAgo, showToast } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

export default function SOSPage() {
    const [alerts, setAlerts] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState(null);
    const [resolveModal, setResolveModal] = useState(null);
    const [detailsModal, setDetailsModal] = useState(null);
    const [selectedCg, setSelectedCg] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    const [responderLocations, setResponderLocations] = useState({});
    const [systemAlerts, setSystemAlerts] = useState([]);
    const [lowAvailabilityWarning, setLowAvailabilityWarning] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

    useEffect(() => {
        loadData();

        const socket = getSocket();

        socket.on("connect", () => {
            setSocketConnected(true);
            console.log("✅ Connected to real-time gateway");
        });

        socket.on("disconnect", () => {
            setSocketConnected(false);
            console.log("❌ Disconnected from real-time gateway");
        });

        // Real-time SOS events
        socket.on("new_sos", (data) => {
            setPage(1);
            loadData();
            showToast(`🚨 Critical: New SOS Alert`, 'danger');
        });

        socket.on("sos_updated", (alert) => {
            setAlerts(prevAlerts =>
                prevAlerts.map(a => a.id === alert.id ? alert : a)
            );
        });

        // Real-time responder events
        socket.on("responder_location_update", (data) => {
            setResponderLocations(prev => ({
                ...prev,
                [data.responderId]: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    status: data.status
                }
            }));
        });

        socket.on("responder_availability_changed", (data) => {
            setCaregivers(prev =>
                prev.map(c =>
                    c.id === data.responderId ? { ...c, isAvailable: data.isAvailable } : c
                )
            );
        });

        // System alerts & warnings
        socket.on("low_responder_availability", (data) => {
            setLowAvailabilityWarning(true);
            setSystemAlerts(prev => [...prev, {
                id: Date.now(),
                type: 'warning',
                message: `⚠️ Low availability: Only ${data.availableCount} responders available`,
                timestamp: new Date()
            }]);
        });

        socket.on("response_time_breach", (data) => {
            const { minutesWaiting, userName } = data;
            setSystemAlerts(prev => [...prev, {
                id: Date.now(),
                type: 'critical',
                message: `🚨 Alert waiting: ${userName} - ${minutesWaiting} mins unassigned`,
                timestamp: new Date()
            }]);
            showToast(`Alert waiting ${minutesWaiting}+ mins`, 'danger');
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("new_sos");
            socket.off("sos_updated");
            socket.off("responder_location_update");
            socket.off("responder_availability_changed");
            socket.off("low_responder_availability");
            socket.off("response_time_breach");
        };
    }, []);

    useEffect(() => {
        loadData();
    }, [statusFilter, page, searchQuery]);

    async function loadData() {
        try {
            const params = {
                page,
                limit,
            };
            if (statusFilter !== 'ALL') params.status = statusFilter;

            const [aRes, cRes] = await Promise.all([
                sosAPI.getAll(params),
                caregiverAPI.getAll()
            ]);

            const fetchedAlerts = aRes.data?.data?.alerts || aRes.data?.data;
            let alertsArray = Array.isArray(fetchedAlerts) ? fetchedAlerts : [];

            if (searchQuery) {
                alertsArray = alertsArray.filter(a =>
                    a.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.user?.uniqueUserId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.user?.phone?.includes(searchQuery)
                );
            }

            setAlerts(alertsArray);
            setTotalPages(aRes.data?.data?.pages || 1);

            const fetchedCaregivers = cRes.data?.data;
            setCaregivers(Array.isArray(fetchedCaregivers) ? fetchedCaregivers : []);
        } catch (e) {
            console.error(e);
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleAssign() {
        if (!selectedCg) return;
        try {
            await sosAPI.assignResponder(assignModal.id, { responderId: selectedCg });
            showToast('Responder assigned successfully', 'success');
            setAssignModal(null);
            setSelectedCg('');
            loadData();
        } catch (e) {
            showToast('Assignment failed', 'error');
        }
    }

    async function handleResolve() {
        if (!resolutionNotes.trim()) {
            showToast('Please enter resolution notes', 'error');
            return;
        }
        try {
            await sosAPI.resolve(resolveModal.id, { notes: resolutionNotes });
            showToast('SOS alert resolved', 'success');
            setResolveModal(null);
            setResolutionNotes('');
            loadData();
        } catch (e) {
            showToast('Resolution failed', 'error');
        }
    }

    const active = alerts.filter(a => a.status === 'ACTIVE');
    const responding = alerts.filter(a => a.status === 'RESPONDING');
    const resolved = alerts.filter(a => a.status === 'RESOLVED');

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        setPage(1);
    };

    return (
        <div className="sos-page-container">
            {/* System Alerts Panel */}
            {systemAlerts.length > 0 && (
                <div className="system-alerts-panel">
                    <div className="alerts-header">
                        <span className="alerts-title">⚠️ System Alerts</span>
                        <button
                            className="btn-sm-clear"
                            onClick={() => setSystemAlerts([])}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="alerts-list">
                        {systemAlerts.slice(-5).map(alert => (
                            <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                                <span className="alert-message">{alert.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Command Center Header */}
            <div className="command-header">
                <div className="header-info">
                    <div className="live-pill">
                        <Radio size={14} className="pulse-icon" />
                        <span>LIVE COMMAND CENTRE</span>
                    </div>
                    <h2>Emergency Management</h2>
                    <p>Real-time oversight of all medical emergencies and SOS triggers</p>
                </div>
                <div className="header-actions">
                    <div className={`active-counter ${active.length > 0 ? 'critical' : ''}`}>
                        <span className="count">{active.length}</span>
                        <span className="label">ACTIVE EMERGENCIES</span>
                    </div>
                </div>
            </div>

            {/* Critical Stats Radar */}
            <div className="sos-stats-grid">
                <div
                    className={`sos-stat-card critical ${statusFilter === 'ACTIVE' ? 'active-filter' : ''}`}
                    onClick={() => handleStatusFilter('ACTIVE')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-icon"><AlertTriangle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{active.length}</div>
                        <div className="stat-label">Critical Alerts</div>
                    </div>
                    <div className="radar-wave"></div>
                </div>
                <div
                    className={`sos-stat-card warning ${statusFilter === 'RESPONDING' ? 'active-filter' : ''}`}
                    onClick={() => handleStatusFilter('RESPONDING')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-icon"><Activity size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{responding.length}</div>
                        <div className="stat-label">In Response</div>
                    </div>
                </div>
                <div
                    className={`sos-stat-card success ${statusFilter === 'RESOLVED' ? 'active-filter' : ''}`}
                    onClick={() => handleStatusFilter('RESOLVED')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-icon"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{resolved.length}</div>
                        <div className="stat-label">Resolved</div>
                    </div>
                </div>
                <div
                    className={`sos-stat-card info ${statusFilter === 'ALL' ? 'active-filter' : ''}`}
                    onClick={() => handleStatusFilter('ALL')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-icon"><Users size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{alerts.length}</div>
                        <div className="stat-label">Total Visible</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="search-filter-bar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or phone..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="search-input"
                    />
                </div>
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('ALL')}
                    >
                        <Filter size={14} /> All
                    </button>
                    <button
                        className={`filter-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('ACTIVE')}
                    >
                        Active
                    </button>
                    <button
                        className={`filter-btn ${statusFilter === 'RESPONDING' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('RESPONDING')}
                    >
                        Responding
                    </button>
                    <button
                        className={`filter-btn ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('RESOLVED')}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            {/* Alert Stream */}
            <div className="card glass-card">
                <div className="card-header stream-header">
                    <div className="header-title">
                        <Radio size={18} className="text-danger" />
                        <h3>Emergency Alert Stream</h3>
                        <span className="results-count">({alerts.length} results)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="pulse-dot" style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }}></span>
                        <span className="last-sync text-sm" style={{ color: '#10B981', fontWeight: 600 }}>LIVE OPERATIONAL STREAM</span>
                    </div>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="sos-loader">
                            <div className="spinner" />
                            <span>Connecting to emergency services...</span>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="sos-empty">
                            <Shield size={48} className="text-muted" />
                            <h4>All Systems Clear</h4>
                            <p>No active emergencies detected at this time.</p>
                        </div>
                    ) : (
                        <div className="alert-stream">
                            {alerts.map((alert) => (
                                <div key={alert.id} className={`stream-item ${alert.status.toLowerCase()}`}>
                                    <div className="item-indicator">
                                        <div className="status-dot" />
                                        <div className="indicator-line" />
                                    </div>
                                    <div className="item-card">
                                        <div className="item-main">
                                            <div className="item-header">
                                                <div className="user-profile">
                                                    <div className="user-avatar">{alert.user?.name?.charAt(0)}</div>
                                                    <div className="user-info">
                                                        <h4>{alert.user?.name || 'Anonymous User'}</h4>
                                                        <span className="user-id">#{alert.user?.uniqueUserId || 'MED-0000'}</span>
                                                    </div>
                                                </div>
                                                <span className={`status-badge ${alert.status.toLowerCase()}`}>
                                                    {alert.status}
                                                </span>
                                            </div>

                                            <div className="item-body">
                                                <div className="info-row">
                                                    <div className="info-chip">
                                                        <Phone size={14} />
                                                        <span>{alert.user?.phone || 'No phone'}</span>
                                                    </div>
                                                    <div
                                                        className="info-chip location"
                                                        onClick={() => alert.latitude && alert.longitude
                                                            ? window.open(`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`, '_blank')
                                                            : null
                                                        }
                                                        style={!(alert.latitude && alert.longitude) ? { cursor: 'default', opacity: 0.6 } : {}}
                                                    >
                                                        <Navigation size={14} />
                                                        <span className="truncate">{alert.addressSnapshot || (alert.latitude && alert.longitude ? 'View on map' : 'Location unavailable')}</span>
                                                        {alert.latitude && alert.longitude && <ExternalLink size={12} className="ml-1" />}
                                                    </div>
                                                    <div className="info-chip">
                                                        <Clock size={14} />
                                                        <span>{timeAgo(alert.createdAt)}</span>
                                                    </div>
                                                </div>

                                                {alert.responder && (
                                                    <div className="responder-block">
                                                        <div className="responder-info">
                                                            <div className="responder-avatar green"><Users size={14} /></div>
                                                            <span>Assigned: <strong>{alert.responder.name}</strong></span>
                                                        </div>
                                                        <span className="payout-type">{alert.responder.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="item-actions">
                                            {alert.status === 'ACTIVE' && (
                                                <>
                                                    <button className="btn btn-primary btn-glow" onClick={() => { setAssignModal(alert); setSelectedCg(''); }}>
                                                        <UserPlus size={16} />
                                                        <span>Assign Responder</span>
                                                    </button>
                                                    <button className="btn btn-outline-warning" onClick={() => { setResolveModal(alert); setResolutionNotes(''); }}>
                                                        <CheckCircle size={16} />
                                                        <span>Quick Resolve</span>
                                                    </button>
                                                </>
                                            )}
                                            {alert.status === 'RESPONDING' && (
                                                <button className="btn btn-outline-success" onClick={() => { setResolveModal(alert); setResolutionNotes(''); }}>
                                                    <CheckCircle size={16} />
                                                    <span>Mark Resolved</span>
                                                </button>
                                            )}
                                            {alert.status === 'RESOLVED' && (
                                                <div className="resolved-status">
                                                    <CheckCircle size={16} />
                                                    <span>Alert Resolved</span>
                                                </div>
                                            )}
                                            <button
                                                className="btn btn-icon"
                                                title="View Full Log"
                                                onClick={() => setDetailsModal(alert)}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination-bar">
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <span className="page-info">Page {page} of {totalPages}</span>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Assign Modal - Refined */}
            {assignModal && (
                <div className="modal-overlay active" onClick={() => setAssignModal(null)}>
                    <div className="modal premium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <UserPlus className="text-primary" size={20} />
                                <div>
                                    <h3>Deploy Emergency Responder</h3>
                                    <p className="text-sm">Dispatching for {assignModal.user?.name}</p>
                                </div>
                            </div>
                            <button className="close-x" onClick={() => setAssignModal(null)}>✕</button>
                        </div>
                        <div className="modal-body p-6">
                            <div className="form-group mb-6">
                                <label className="form-label font-bold">Available Responders nearby</label>
                                <div className="responder-selector">
                                    {caregivers.filter(c => c.isAvailable).length === 0 ? (
                                        <p className="text-danger p-4 bg-glass rounded-lg text-center font-medium">No available responders found in this city!</p>
                                    ) : (
                                        <div className="responder-list">
                                            {caregivers.filter(c => c.isAvailable).map(c => (
                                                <div
                                                    key={c.id}
                                                    className={`responder-option ${selectedCg === c.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedCg(c.id)}
                                                >
                                                    <div className="responder-avatar-circle">{c.name.charAt(0)}</div>
                                                    <div className="responder-details">
                                                        <div className="responder-name">{c.name}</div>
                                                        <div className="responder-spec">{c.specialization || 'General Responder'}</div>
                                                    </div>
                                                    <div className="responder-rating">⭐ {c.performanceRating || '4.5'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="emergency-notice">
                                <AlertTriangle size={18} className="text-danger" />
                                <p>Immediate dispatch will trigger a WhatsApp notification to the responder.</p>
                            </div>
                        </div>
                        <div className="modal-footer g-3">
                            <button className="btn btn-secondary flex-1" onClick={() => setAssignModal(null)}>Cancel</button>
                            <button
                                className="btn btn-primary flex-1 btn-glow"
                                onClick={handleAssign}
                                disabled={!selectedCg}
                            >
                                Dispatch Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolution Modal */}
            {resolveModal && (
                <div className="modal-overlay active" onClick={() => setResolveModal(null)}>
                    <div className="modal premium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <CheckCircle className="text-success" size={20} />
                                <div>
                                    <h3>Resolve Emergency Alert</h3>
                                    <p className="text-sm">Complete resolution for {resolveModal.user?.name}</p>
                                </div>
                            </div>
                            <button className="close-x" onClick={() => setResolveModal(null)}>✕</button>
                        </div>
                        <div className="modal-body p-6">
                            <div className="form-group mb-6">
                                <label className="form-label font-bold">Resolution Notes</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Enter what was done to resolve this emergency (required)..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    rows={5}
                                />
                                <small className="text-muted">These notes will be recorded in the incident log.</small>
                            </div>
                        </div>
                        <div className="modal-footer g-3">
                            <button className="btn btn-secondary flex-1" onClick={() => setResolveModal(null)}>Cancel</button>
                            <button
                                className="btn btn-success flex-1"
                                onClick={handleResolve}
                            >
                                <CheckCircle size={16} /> Confirm Resolution
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsModal && (
                <div className="modal-overlay active" onClick={() => setDetailsModal(null)}>
                    <div className="modal premium-modal large-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <Radio className="text-danger" size={20} />
                                <div>
                                    <h3>Alert Full Details</h3>
                                    <p className="text-sm">Complete incident log for {detailsModal.user?.name}</p>
                                </div>
                            </div>
                            <button className="close-x" onClick={() => setDetailsModal(null)}>✕</button>
                        </div>
                        <div className="modal-body p-6">
                            <div className="details-grid">
                                <div className="detail-group">
                                    <label className="detail-label">Alert ID</label>
                                    <div className="detail-value font-mono">{detailsModal.id}</div>
                                </div>
                                <div className="detail-group">
                                    <label className="detail-label">User</label>
                                    <div className="detail-value">{detailsModal.user?.name} (#{detailsModal.user?.uniqueUserId})</div>
                                </div>
                                <div className="detail-group">
                                    <label className="detail-label">Phone</label>
                                    <div className="detail-value">{detailsModal.user?.phone}</div>
                                </div>
                                <div className="detail-group">
                                    <label className="detail-label">Status</label>
                                    <div className={`status-badge ${detailsModal.status.toLowerCase()}`}>{detailsModal.status}</div>
                                </div>
                                <div className="detail-group">
                                    <label className="detail-label">Created At</label>
                                    <div className="detail-value">{new Date(detailsModal.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="detail-group">
                                    <label className="detail-label">Address</label>
                                    <div className="detail-value">
                                        {detailsModal.addressSnapshot || 'Not available'}
                                        {detailsModal.latitude && detailsModal.longitude && (
                                            <a
                                                href={`https://www.google.com/maps?q=${detailsModal.latitude},${detailsModal.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ marginLeft: 8, color: 'var(--accent-primary)', fontSize: 12 }}
                                            >
                                                Open map ↗
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {detailsModal.responder && (
                                    <>
                                        <div className="detail-group">
                                            <label className="detail-label">Assigned Responder</label>
                                            <div className="detail-value">{detailsModal.responder?.name}</div>
                                        </div>
                                        <div className="detail-group">
                                            <label className="detail-label">Responder Phone</label>
                                            <div className="detail-value">{detailsModal.responder?.phone}</div>
                                        </div>
                                    </>
                                )}
                                {detailsModal.resolvedAt && (
                                    <>
                                        <div className="detail-group">
                                            <label className="detail-label">Resolved At</label>
                                            <div className="detail-value">{new Date(detailsModal.resolvedAt).toLocaleString()}</div>
                                        </div>
                                        <div className="detail-group col-span-full">
                                            <label className="detail-label">Resolution Notes</label>
                                            <div className="detail-value-box">{detailsModal.resolvedNotes || 'No notes provided'}</div>
                                        </div>
                                    </>
                                )}
                                {detailsModal.callLogNotes && (
                                    <div className="detail-group col-span-full">
                                        <label className="detail-label">Call Log Notes</label>
                                        <div className="detail-value-box">{detailsModal.callLogNotes}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDetailsModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .sos-page-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }

                /* Header Styling */
                .command-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding-bottom: 8px;
                    border-bottom: 2px solid var(--border-color);
                }

                .live-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--accent-danger);
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    margin-bottom: 12px;
                }

                .pulse-icon { animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

                .command-header h2 { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
                .command-header p { color: var(--text-muted); font-size: 14px; }

                .active-counter {
                    background: var(--bg-card);
                    border: 2px solid var(--border-color);
                    padding: 8px 20px;
                    border-radius: 16px;
                    text-align: center;
                    box-shadow: var(--shadow-sm);
                }

                .active-counter.critical {
                    border-color: var(--accent-danger);
                    background: rgba(239, 68, 68, 0.05);
                }

                .active-counter .count { font-size: 24px; font-weight: 800; display: block; color: var(--text-primary); }
                .active-counter .label { font-size: 10px; font-weight: 700; color: var(--text-muted); white-space: nowrap; }

                /* Stats Grid */
                .sos-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                }

                .sos-stat-card {
                    background: var(--bg-card);
                    padding: 24px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    border: 1px solid var(--border-color);
                    position: relative;
                    overflow: hidden;
                    box-shadow: var(--shadow-md);
                    transition: all 0.3s ease;
                }

                .sos-stat-card.active-filter {
                    border-color: var(--accent-primary);
                    background: rgba(4, 131, 87, 0.05);
                    box-shadow: 0 0 20px rgba(4, 131, 87, 0.2);
                }

                .sos-stat-card.critical { border-color: rgba(239, 68, 68, 0.3); }
                .sos-stat-card.warning { border-color: rgba(245, 158, 11, 0.3); }
                .sos-stat-card.success { border-color: rgba(16, 185, 129, 0.3); }

                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .critical .stat-icon { background: rgba(239, 68, 68, 0.1); color: var(--accent-danger); }
                .warning .stat-icon { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
                .success .stat-icon { background: rgba(16, 185, 129, 0.1); color: var(--accent-success); }
                .info .stat-icon { background: var(--bg-glass); color: var(--accent-primary); }

                .stat-value { font-size: 32px; font-weight: 800; line-height: 1; color: var(--text-primary); }
                .stat-label { font-size: 13px; color: var(--text-muted); font-weight: 500; }

                .radar-wave {
                    position: absolute;
                    inset: 0;
                    border-radius: 20px;
                    box-shadow: inset 0 0 40px rgba(239, 68, 68, 0.15);
                    animation: radar 2s infinite ease-out;
                    pointer-events: none;
                }

                @keyframes radar {
                    0% { transform: scale(0.9); opacity: 1; }
                    100% { transform: scale(1.2); opacity: 0; }
                }

                /* Alert Stream Styling */
                .stream-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; }
                .header-title { display: flex; align-items: center; gap: 12px; }
                
                .alert-stream { padding: 8px 20px 24px; }
                
                .stream-item { display: flex; gap: 20px; }
                .item-indicator { position: relative; width: 2px; }
                .indicator-line { position: absolute; top: 0; bottom: 0; left: 0; width: 2px; background: var(--border-color); }
                .status-dot { 
                    position: absolute; 
                    top: 32px; 
                    left: -5px; 
                    width: 12px; 
                    height: 12px; 
                    border-radius: 50%; 
                    background: var(--bg-card);
                    border: 2px solid var(--border-color);
                    z-index: 1;
                }

                .stream-item:last-child .indicator-line { height: 32px; }

                .stream-item.active .status-dot { background: var(--accent-danger); border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 10px var(--accent-danger); }
                .stream-item.responding .status-dot { background: #F59E0B; border-color: rgba(245, 158, 11, 0.3); }
                .stream-item.resolved .status-dot { background: var(--accent-success); border-color: rgba(16, 185, 129, 0.3); }

                .item-card {
                    flex: 1;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    transition: all 0.3s;
                    box-shadow: var(--shadow-sm);
                }

                .stream-item.active .item-card { border-left: 4px solid var(--accent-danger); background: rgba(239, 68, 68, 0.02); }
                .item-card:hover { transform: translateX(8px); box-shadow: var(--shadow-md); border-color: var(--accent-primary-light); }

                .item-main { flex: 1; min-width: 0; }
                .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }

                .user-profile { display: flex; align-items: center; gap: 14px; }
                .user-avatar { 
                    width: 44px; 
                    height: 44px; 
                    border-radius: 12px; 
                    background: var(--gradient-primary); 
                    color: white; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: 800; 
                    font-size: 18px; 
                }

                .user-info h4 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
                .user-id { font-size: 11px; font-weight: 600; color: var(--text-muted); font-family: monospace; }

                .status-badge { 
                    padding: 4px 12px; 
                    border-radius: 8px; 
                    font-size: 10px; 
                    font-weight: 800; 
                    letter-spacing: 0.5px;
                }
                .status-badge.active { background: rgba(239, 68, 68, 0.1); color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.2); }
                .status-badge.responding { background: rgba(245, 158, 11, 0.1); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.2); }
                .status-badge.resolved { background: rgba(16, 185, 129, 0.1); color: var(--accent-success); border: 1px solid rgba(16, 185, 129, 0.2); }

                .info-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
                .info-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-glass); border-radius: 10px; font-size: 12px; font-weight: 500; color: var(--text-secondary); }
                .info-chip.location { cursor: pointer; max-width: 250px; }
                .info-chip.location:hover { background: var(--bg-glass-hover); color: var(--accent-primary); }

                .responder-block {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px dashed var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .responder-info { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-primary); }
                .responder-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                .responder-avatar.green { background: var(--accent-success); color: white; }

                .item-actions { display: flex; flex-direction: column; gap: 8px; justify-content: center; padding-left: 20px; border-left: 1px solid var(--border-color); }
                .btn-glow { box-shadow: 0 4px 14px rgba(4, 131, 87, 0.2); }
                .btn-glow:hover { transform: scale(1.02); box-shadow: 0 6px 20px rgba(4, 131, 87, 0.3); }

                .btn-outline-warning {
                    border: 1px solid rgba(245, 158, 11, 0.5);
                    background: transparent;
                    color: #B45309;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: center;
                }

                .btn-outline-warning:hover {
                    border-color: #F59E0B;
                    background: rgba(245, 158, 11, 0.1);
                    color: #F59E0B;
                }

                .resolved-status { display: flex; align-items: center; gap: 8px; color: var(--accent-success); font-size: 12px; font-weight: 700; }

                .sos-empty { text-align: center; padding: 64px 20px; color: var(--text-muted); }
                .sos-empty h4 { color: var(--text-primary); font-size: 20px; margin-top: 16px; margin-bottom: 8px; }

                /* Premium Modal */
                .premium-modal { border-radius: 28px; border: 1px solid var(--border-color); overflow: hidden; }
                .modal-title-group { display: flex; align-items: center; gap: 16px; }
                .modern-select { height: 50px; padding: 0 16px; border-radius: 12px; border: 2px solid var(--border-color); font-size: 14px; }
                .modern-select:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 4px rgba(4, 131, 87, 0.1); }

                .emergency-notice { display: flex; gap: 12px; padding: 12px 16px; background: rgba(239, 68, 68, 0.05); border-radius: 12px; font-size: 12px; color: var(--accent-danger); font-weight: 500; }

                /* Search and Filter Bar */
                .search-filter-bar {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    align-items: center;
                    background: var(--bg-card);
                    padding: 16px 24px;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }

                .search-box {
                    flex: 1;
                    min-width: 250px;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    color: var(--text-muted);
                }

                .search-input {
                    width: 100%;
                    padding: 10px 16px 10px 40px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--bg-glass);
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 4px rgba(4, 131, 87, 0.1);
                }

                .filter-buttons {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .filter-btn:hover {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                }

                .filter-btn.active {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(4, 131, 87, 0.2);
                }

                .results-count {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-left: 8px;
                }

                /* Responder List in Modal */
                .responder-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .responder-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: var(--bg-glass);
                }

                .responder-option:hover {
                    border-color: var(--accent-primary);
                    background: rgba(4, 131, 87, 0.05);
                }

                .responder-option.selected {
                    border-color: var(--accent-primary);
                    background: rgba(4, 131, 87, 0.1);
                    box-shadow: 0 0 12px rgba(4, 131, 87, 0.2);
                }

                .responder-avatar-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--gradient-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                .responder-details {
                    flex: 1;
                }

                .responder-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .responder-spec {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .responder-rating {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 13px;
                }

                /* Form Elements */
                .form-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--bg-glass);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                    transition: all 0.3s;
                }

                .form-textarea:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 4px rgba(4, 131, 87, 0.1);
                }

                /* Pagination */
                .pagination-bar {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-top: 1px solid var(--border-color);
                }

                .page-info {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                .btn-sm {
                    padding: 8px 16px;
                    font-size: 12px;
                    height: auto;
                }

                .btn-outline {
                    border: 1px solid var(--border-color);
                    background: transparent;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .btn-outline:hover:not(:disabled) {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                }

                .btn-outline:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Details Modal */
                .large-modal {
                    max-width: 600px;
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }

                .details-grid .col-span-full {
                    grid-column: 1 / -1;
                }

                .detail-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .detail-label {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .detail-value {
                    font-size: 14px;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .detail-value-box {
                    padding: 12px 16px;
                    background: var(--bg-glass);
                    border-radius: 10px;
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    word-break: break-word;
                }

                .font-mono {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                }

                /* System Alerts Panel */
                .system-alerts-panel {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 158, 11, 0.05));
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 24px;
                }

                .alerts-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .alerts-title {
                    font-weight: 700;
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .btn-sm-clear {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    padding: 4px 8px;
                }

                .btn-sm-clear:hover {
                    color: var(--accent-danger);
                }

                .alerts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .alert-item {
                    display: flex;
                    align-items: center;
                    padding: 10px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                }

                .alert-item.alert-critical {
                    background: rgba(239, 68, 68, 0.1);
                    border-left: 3px solid var(--accent-danger);
                    color: var(--accent-danger);
                }

                .alert-item.alert-warning {
                    background: rgba(245, 158, 11, 0.1);
                    border-left: 3px solid #F59E0B;
                    color: #B45309;
                }

                .alert-message {
                    font-weight: 500;
                }

                @media (max-width: 992px) {
                    .item-card { flex-direction: column; gap: 20px; }
                    .item-actions { border-left: none; border-top: 1px solid var(--border-color); padding-left: 0; padding-top: 20px; flex-direction: row; }
                    .search-filter-bar { flex-direction: column; align-items: stretch; }
                    .search-box { min-width: auto; }
                    .filter-buttons { width: 100%; }
                    .details-grid { grid-template-columns: 1fr; }
                    .large-modal { max-width: 90vw; }
                    .sos-stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .command-header { flex-direction: column; gap: 16px; align-items: flex-start; }
                    .header-actions { width: 100%; }
                }
            `}</style>
        </div>
    );
}
