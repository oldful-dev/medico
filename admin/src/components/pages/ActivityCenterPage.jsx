"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Phone, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { activityAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

const EVENT_TYPES = [
    { value: '',                    label: 'All',                   emoji: '📋' },
    { value: 'doctor_assigned',     label: 'Doctor Assigned',       emoji: '👨‍⚕️' },
    { value: 'caregiver_assigned',  label: 'Caregiver Assigned',    emoji: '🤝' },
    { value: 'nurse_assigned',      label: 'Nurse Assigned',        emoji: '💉' },
    { value: 'appointment_confirmed', label: 'Appointment',         emoji: '✅' },
    { value: 'sample_collected',    label: 'Lab Sample',            emoji: '🧪' },
    { value: 'out_for_delivery',    label: 'Delivery',              emoji: '🚴' },
    { value: 'medicine_delivered',  label: 'Delivered',             emoji: '📦' },
    { value: 'service_rescheduled', label: 'Rescheduled',           emoji: '📅' },
    { value: 'payment_confirmed',   label: 'Payment',               emoji: '💳' },
];

const EVENT_COLORS = {
    doctor_assigned:       { color: '#2563EB', bg: '#DBEAFE' },
    caregiver_assigned:    { color: '#DB2777', bg: '#FCE7F3' },
    nurse_assigned:        { color: '#7C3AED', bg: '#EDE9FE' },
    appointment_confirmed: { color: '#059669', bg: '#D1FAE5' },
    sample_collected:      { color: '#7C3AED', bg: '#EDE9FE' },
    out_for_delivery:      { color: '#D97706', bg: '#FEF3C7' },
    medicine_delivered:    { color: '#048357', bg: '#D1FAE5' },
    service_rescheduled:   { color: '#EA580C', bg: '#FFEDD5' },
    payment_confirmed:     { color: '#0284C7', bg: '#E0F2FE' },
};

function formatTs(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
}

function relativeTime(iso) {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ''; }
}

function ActivityCard({ update }) {
    const cfg = EVENT_COLORS[update.eventType] || { color: '#048357', bg: '#D1FAE5' };
    const eventLabel = EVENT_TYPES.find(e => e.value === update.eventType);

    return (
        <div style={{
            display: 'flex', gap: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
            {/* Accent bar */}
            <div style={{ width: 4, background: cfg.color, flexShrink: 0 }} />

            <div style={{ flex: 1, padding: '14px 16px' }}>
                {/* Row 1: event badge + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: cfg.bg, color: cfg.color,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        }}>
                            {eventLabel?.emoji} {eventLabel?.label || update.eventType}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{update.serviceType}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{relativeTime(update.createdAt)}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTs(update.createdAt)}</span>
                    </div>
                </div>

                {/* Row 2: staff + order info */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Staff avatar */}
                    {update.staffPhotoUrl ? (
                        <img src={update.staffPhotoUrl} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={18} color={cfg.color} />
                        </div>
                    )}

                    {/* Staff info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{update.staffName}</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>ID: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{update.staffId}</span></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Phone size={11} />
                                <a href={`tel:${update.staffPhone}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{update.staffPhone}</a>
                            </span>
                        </div>
                        {update.statusDetail && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{update.statusDetail}</div>
                        )}
                    </div>

                    {/* ETA */}
                    {update.eta && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ECFDF5', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>
                            <Clock size={12} color="#059669" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>ETA {update.eta}</span>
                        </div>
                    )}
                </div>

                {/* Row 3: order ref */}
                {update.labOrder && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>Order: <code style={{ color: 'var(--accent-primary-light)', fontSize: 11 }}>{update.labOrder.clientRefId}</code></span>
                        {update.labOrder.user && <span>Client: <strong style={{ color: 'var(--text-secondary)' }}>{update.labOrder.user.name}</strong></span>}
                        {update.labOrder.user?.phone && <span>{update.labOrder.user.phone}</span>}
                        <span style={{
                            padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: update.labOrder.status === 'CONFIRMED' ? '#DBEAFE' : update.labOrder.status === 'REPORT_GENERATED' ? '#D1FAE5' : '#F3F4F6',
                            color: update.labOrder.status === 'CONFIRMED' ? '#2563EB' : update.labOrder.status === 'REPORT_GENERATED' ? '#059669' : '#6B7280',
                        }}>{update.labOrder.status}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

const LIMIT = 30;

export default function ActivityCenterPage() {
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [eventFilter, setEventFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const params = { page, limit: LIMIT };
            if (eventFilter) params.eventType = eventFilter;
            const res = await activityAPI.getAllUpdates(params);
            setUpdates(res.data?.data || []);
            setTotal(res.data?.meta?.total || 0);
        } catch {
            showToast('Failed to load activity feed', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, eventFilter]);

    useEffect(() => { load(); }, [load]);

    function handleFilterChange(val) {
        setEventFilter(val);
        setPage(1);
    }

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2>Activity Center</h2>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'white', marginRight: 6 }} />
                        Live
                    </span>
                </div>
                <p>All staff assignments and service updates across every booking</p>
            </div>

            {/* ── Filter tabs ── */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {EVENT_TYPES.map(et => (
                    <button
                        key={et.value}
                        onClick={() => handleFilterChange(et.value)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                            borderColor: eventFilter === et.value ? 'var(--accent-primary)' : 'var(--border-color)',
                            background: eventFilter === et.value ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: eventFilter === et.value ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 12, fontWeight: eventFilter === et.value ? 600 : 400,
                            transition: 'all 0.15s',
                        }}
                    >
                        {et.emoji} {et.label}
                    </button>
                ))}

                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}
                >
                    <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {/* ── Feed ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                        <div style={{ width: 32, height: 32, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                        Loading activity feed…
                    </div>
                ) : updates.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>No activity updates yet</div>
                        <div className="text-sm text-muted">Staff assignments and service events will appear here in real time.</div>
                    </div>
                ) : (
                    updates.map(u => <ActivityCard key={u.id} update={u} />)
                )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span className="text-sm text-muted">{total} updates · Page {page} of {totalPages}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
