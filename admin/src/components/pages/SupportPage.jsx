"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, CheckCircle, Eye, Send, ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Clock, User, Headphones } from "lucide-react";
import { supportAPI } from "@/lib/api";
import { showToast, formatDateTime, timeAgo } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";

const statusColors = { open: 'badge-warning', 'in-progress': 'badge-info', resolved: 'badge-success', closed: 'badge-default' };
const priorityColors = { low: 'badge-default', medium: 'badge-info', high: 'badge-warning', critical: 'badge-danger' };

export default function SupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const limit = 20;
    const chatEndRef = useRef(null);
    const pollRef = useRef(null);

    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit, ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const r = await supportAPI.getTickets(params);
            setTickets(r.data?.data?.tickets || r.data?.data || []);
            setTotal(r.data?.data?.total || 0);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [page, filters, limit]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    // Real-time socket updates
    useEffect(() => {
        const socket = getSocket();

        // New ticket created
        socket.on("new_ticket", (newTicket) => {
            // Reload to get fresh list without duplicates
            setPage(1);
            loadTickets();
            showToast(`🎫 New Support Ticket: ${newTicket.subject}`, 'success');
        });

        // New message in any ticket
        socket.on("ticket_message_added", (data) => {
            const { ticketId, message, senderName } = data;

            // Update selected ticket if viewing it
            if (selected?.id === ticketId) {
                setSelected(prev => {
                    if (prev) {
                        return {
                            ...prev,
                            messages: [...(prev.messages || []), message]
                        };
                    }
                    return prev;
                });
                showToast(`💬 New message from ${senderName}`, 'info');
            }

            // Update ticket in list
            setTickets(prev =>
                prev.map(t =>
                    t.id === ticketId ? { ...t, lastMessageAt: new Date() } : t
                )
            );
        });

        // Ticket status changed
        socket.on("ticket_status_changed", (data) => {
            const { ticketId, status } = data;

            if (selected?.id === ticketId) {
                setSelected(prev => prev ? { ...prev, status } : prev);
            }

            setTickets(prev =>
                prev.map(t => t.id === ticketId ? { ...t, status } : t)
            );
            showToast(`Ticket status: ${status}`, 'info');
        });

        // Ticket assigned to agent
        socket.on("ticket_assigned", (data) => {
            const { ticketId, agentName } = data;

            if (selected?.id === ticketId) {
                setSelected(prev => prev ? { ...prev, assignedAgent: agentName } : prev);
            }

            setTickets(prev =>
                prev.map(t => t.id === ticketId ? { ...t, assignedAgent: agentName } : t)
            );
        });

        return () => {
            socket.off("new_ticket");
            socket.off("ticket_message_added");
            socket.off("ticket_status_changed");
            socket.off("ticket_assigned");
        };
    }, [selected?.id]);

    // Auto-scroll chat to bottom when messages change
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selected?.messages?.length]);



    async function viewTicket(id) {
        try {
            const r = await supportAPI.getTicketById(id);
            setSelected(r.data?.data);
            setReply('');
        } catch (e) { showToast('Failed to load ticket', 'error'); }
    }

    async function resolveTicket(id) {
        const note = prompt('Resolution note:');
        if (note === null) return;
        try {
            await supportAPI.resolveTicket(id, { resolutionNote: note });
            showToast('Ticket resolved');
            setSelected(null);
            loadTickets();
        } catch (e) { showToast('Failed', 'error'); }
    }

    async function handleReply() {
        if (!reply.trim() || sending) return;
        setSending(true);
        try {
            await supportAPI.addMessage(selected.id, { message: reply, senderType: 'admin', senderId: 'admin' });
            setReply('');
            // Immediately refresh the ticket to show the new message
            const r = await supportAPI.getTicketById(selected.id);
            if (r.data?.data) setSelected(r.data.data);
            showToast('Reply sent');
        } catch (e) { showToast('Failed to send', 'error'); }
        finally { setSending(false); }
    }

    async function updateStatus(id, status) {
        try {
            await supportAPI.updateTicket(id, { status });
            showToast(`Status: ${status}`);
            loadTickets();
            if (selected?.id === id) viewTicket(id);
        } catch (e) { showToast('Failed', 'error'); }
    }

    // ─── Chat View (full-page when ticket selected) ───────────
    if (selected) {
        const isActive = selected.status !== 'resolved' && selected.status !== 'closed';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
                {/* Chat Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'var(--bg-secondary)',
                }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setSelected(null); loadTickets(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ fontSize: 12, color: 'var(--accent-primary-light)' }}>{selected.ticketCode}</code>
                            <span className={`badge ${statusColors[selected.status] || 'badge-default'}`}>{selected.status}</span>
                            <span className={`badge ${priorityColors[selected.priority] || 'badge-default'}`}>{selected.priority}</span>
                        </div>
                        <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>{selected.subject}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {selected.status === 'open' && (
                            <button className="btn btn-sm btn-info" onClick={() => updateStatus(selected.id, 'in-progress')}>
                                Start Working
                            </button>
                        )}
                        {isActive && (
                            <button className="btn btn-sm btn-success" onClick={() => resolveTicket(selected.id)}>
                                <CheckCircle size={14} style={{ marginRight: 4 }} /> Resolve
                            </button>
                        )}
                    </div>
                </div>

                {/* Description */}
                {selected.description && (
                    <div style={{
                        padding: '12px 24px', background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, color: 'var(--text-secondary)',
                    }}>
                        <span style={{ fontWeight: 600, marginRight: 8, color: 'var(--text-muted)' }}>Description:</span>
                        {selected.description}
                        <span style={{ marginLeft: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                            {selected.category && `${selected.category} · `}
                            {timeAgo(selected.createdAt)}
                        </span>
                    </div>
                )}

                {/* Messages Area */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px 24px',
                    display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                    {(!selected.messages || selected.messages.length === 0) ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                            <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                            <p>No messages yet. Send a reply to start the conversation.</p>
                        </div>
                    ) : (
                        selected.messages.map((msg, i) => {
                            const isAdmin = msg.senderType === 'admin';
                            return (
                                <div key={msg.id || i} style={{
                                    display: 'flex',
                                    justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                                }}>
                                    <div style={{
                                        maxWidth: '70%',
                                        background: isAdmin
                                            ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.15))'
                                            : 'rgba(255,255,255,0.06)',
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        borderBottomRightRadius: isAdmin ? 4 : 12,
                                        borderBottomLeftRadius: isAdmin ? 12 : 4,
                                    }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                                            fontSize: 11, fontWeight: 600,
                                            color: isAdmin ? 'rgba(129,140,248,0.9)' : 'rgba(255,255,255,0.5)',
                                        }}>
                                            {isAdmin ? <Headphones size={12} /> : <User size={12} />}
                                            {isAdmin ? 'Support Team' : 'Customer'}
                                        </div>
                                        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                            {msg.message}
                                        </div>
                                        <div style={{
                                            fontSize: 10, color: 'var(--text-muted)', marginTop: 6,
                                            textAlign: isAdmin ? 'right' : 'left',
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                                        }}>
                                            <Clock size={10} />
                                            {timeAgo(msg.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Reply Input */}
                {isActive ? (
                    <div style={{
                        padding: '12px 24px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: 'var(--bg-secondary)',
                        display: 'flex', gap: 12, alignItems: 'flex-end',
                    }}>
                        <textarea
                            className="form-input"
                            style={{
                                flex: 1, resize: 'none', minHeight: 44, maxHeight: 120,
                                fontSize: 14, lineHeight: 1.5, padding: '10px 14px',
                            }}
                            placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReply();
                                }
                            }}
                            rows={1}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleReply}
                            disabled={!reply.trim() || sending}
                            style={{
                                height: 44, width: 44, padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%', opacity: (!reply.trim() || sending) ? 0.5 : 1,
                            }}
                        >
                            {sending ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                        </button>
                    </div>
                ) : (
                    <div style={{
                        padding: '16px 24px', textAlign: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 13,
                    }}>
                        This ticket has been <strong>{selected.status}</strong>.
                        {selected.resolutionNote && <span style={{ marginLeft: 8 }}>— {selected.resolutionNote}</span>}
                    </div>
                )}
            </div>
        );
    }

    // ─── Ticket List View ─────────────────────────────────────
    return (
        <div>
            <div className="page-header">
                <h2>Support & Ticketing System</h2>
                <p>Manage customer support tickets</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{tickets.filter(t => t.status === 'open').length}</div><div className="stat-card-label">Open</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-primary-light)" }}>{tickets.filter(t => t.status === 'in-progress').length}</div><div className="stat-card-label">In Progress</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-success)" }}>{tickets.filter(t => t.status === 'resolved').length}</div><div className="stat-card-label">Resolved</div></div>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.priority === 'critical').length}</div><div className="stat-card-label">Critical</div></div>
            </div>

            <div className="filter-bar">
                <input
                    className="form-input"
                    style={{ width: 240 }}
                    placeholder="Search tickets..."
                    value={filters.search}
                    onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
                />
                <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                    <option value="">All Status</option>{Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filters.priority} onChange={e => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}>
                    <option value="">All Priority</option>{Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button className="btn btn-sm btn-secondary" onClick={loadTickets} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ticket</th><th>Subject</th><th>Category</th><th>Priority</th>
                            <th>Status</th><th>Messages</th><th>Created</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            tickets.length === 0 ? <tr><td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No tickets</td></tr> :
                                tickets.map(t => (
                                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => viewTicket(t.id)}>
                                        <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{t.ticketCode}</code></td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.subject}</td>
                                        <td className="text-sm" style={{ textTransform: 'capitalize' }}>{t.category || '—'}</td>
                                        <td><span className={`badge ${priorityColors[t.priority] || 'badge-default'}`}>{t.priority}</span></td>
                                        <td><span className={`badge ${statusColors[t.status] || 'badge-default'}`}>{t.status}</span></td>
                                        <td className="text-sm">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <MessageSquare size={12} /> {t._count?.messages || 0}
                                            </span>
                                        </td>
                                        <td className="text-sm">{timeAgo(t.createdAt)}</td>
                                        <td>
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => viewTicket(t.id)} title="Open Chat">
                                                    <MessageSquare size={14} />
                                                </button>
                                                {t.status !== 'resolved' && t.status !== 'closed' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => resolveTicket(t.id)} title="Resolve">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {total > limit && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted">Page {page} of {Math.ceil(total / limit)}</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                        <button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
