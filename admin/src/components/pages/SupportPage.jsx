"use client";
import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, Eye, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { supportAPI } from "@/lib/api";
import { showToast, formatDateTime, timeAgo } from "@/lib/hooks";

const statusColors = { open: 'badge-warning', 'in-progress': 'badge-info', resolved: 'badge-success', closed: 'badge-default' };
const priorityColors = { low: 'badge-default', medium: 'badge-info', high: 'badge-warning', critical: 'badge-danger' };

export default function SupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', priority: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [reply, setReply] = useState('');
    const limit = 20;

    useEffect(() => { loadTickets(); }, [page, filters]);

    async function loadTickets() {
        try { setLoading(true); const params = { page, limit, ...filters }; Object.keys(params).forEach(k => !params[k] && delete params[k]); const r = await supportAPI.getTickets(params); setTickets(r.data?.data?.tickets || r.data?.data || []); setTotal(r.data?.data?.total || 0); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    async function viewTicket(id) {
        try { const r = await supportAPI.getTicketById(id); setSelected(r.data?.data); setReply(''); }
        catch (e) { showToast('Failed to load ticket', 'error'); }
    }

    async function resolveTicket(id) {
        const note = prompt('Resolution note:');
        if (note === null) return;
        try { await supportAPI.resolveTicket(id, { resolutionNote: note }); showToast('Ticket resolved'); setSelected(null); loadTickets(); }
        catch (e) { showToast('Failed', 'error'); }
    }

    async function handleReply() {
        if (!reply.trim()) return;
        try { await supportAPI.addMessage(selected.id, { message: reply, senderType: 'admin', senderId: 'admin' }); showToast('Reply sent'); viewTicket(selected.id); setReply(''); }
        catch (e) { showToast('Failed', 'error'); }
    }

    async function updateStatus(id, status) {
        try { await supportAPI.updateTicket(id, { status }); showToast(`Status: ${status}`); loadTickets(); if (selected?.id === id) viewTicket(id); }
        catch (e) { showToast('Failed', 'error'); }
    }

    return (
        <div>
            <div className="page-header"><h2>Support & Ticketing System</h2><p>Manage customer support tickets</p></div>
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{tickets.filter(t => t.status === 'open').length}</div><div className="stat-card-label">Open</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-primary-light)" }}>{tickets.filter(t => t.status === 'in-progress').length}</div><div className="stat-card-label">In Progress</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: "var(--accent-success)" }}>{tickets.filter(t => t.status === 'resolved').length}</div><div className="stat-card-label">Resolved</div></div>
                <div className="stat-card"><div className="stat-card-value">{tickets.filter(t => t.priority === 'critical').length}</div><div className="stat-card-label">Critical</div></div>
            </div>

            <div className="filter-bar">
                <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                    <option value="">All Status</option>{Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filters.priority} onChange={e => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}>
                    <option value="">All Priority</option>{Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead><tr><th>Ticket</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            tickets.length === 0 ? <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No tickets</td></tr> :
                                tickets.map(t => (
                                    <tr key={t.id}>
                                        <td><code style={{ fontSize: 11, color: "var(--accent-primary-light)" }}>{t.ticketCode}</code></td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.subject}</td>
                                        <td className="text-sm">{t.category || '—'}</td>
                                        <td><span className={`badge ${priorityColors[t.priority] || 'badge-default'}`}>{t.priority}</span></td>
                                        <td><span className={`badge ${statusColors[t.status] || 'badge-default'}`}>{t.status}</span></td>
                                        <td className="text-sm">{timeAgo(t.createdAt)}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-sm btn-secondary" onClick={() => viewTicket(t.id)}><Eye size={14} /></button>
                                                {t.status !== 'resolved' && t.status !== 'closed' && <button className="btn btn-sm btn-success" onClick={() => resolveTicket(t.id)}><CheckCircle size={14} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {total > limit && <div className="flex justify-between items-center mt-4"><span className="text-sm text-muted">Page {page}</span><div className="flex gap-2"><button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button><button className="btn btn-sm btn-secondary" disabled={page * limit >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button></div></div>}

            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
                    <div className="modal-header"><h3>{selected.ticketCode} — {selected.subject}</h3><button onClick={() => setSelected(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <div className="form-row mb-4"><div className="form-group"><label className="form-label">Status</label><span className={`badge ${statusColors[selected.status]}`}>{selected.status}</span></div><div className="form-group"><label className="form-label">Priority</label><span className={`badge ${priorityColors[selected.priority]}`}>{selected.priority}</span></div></div>
                        {selected.description && <div className="form-group"><label className="form-label">Description</label><div className="text-sm">{selected.description}</div></div>}

                        <div className="form-group"><label className="form-label">Conversation</label>
                            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, maxHeight: 300, overflowY: 'auto' }}>
                                {(selected.messages || []).map((msg, i) => (
                                    <div key={i} style={{ marginBottom: 12, textAlign: msg.senderType === 'admin' ? 'right' : 'left' }}>
                                        <div style={{ display: 'inline-block', background: msg.senderType === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 10, maxWidth: '80%' }}>
                                            <div className="text-sm">{msg.message}</div>
                                            <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 4 }}>{msg.senderType === 'admin' ? 'Admin' : 'User'} • {timeAgo(msg.createdAt)}</div>
                                        </div>
                                    </div>
                                ))}
                                {(!selected.messages || selected.messages.length === 0) && <p className="text-muted text-sm" style={{ textAlign: 'center' }}>No messages yet</p>}
                            </div>
                        </div>
                        {selected.status !== 'resolved' && selected.status !== 'closed' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" style={{ flex: 1 }} placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} />
                                <button className="btn btn-primary" onClick={handleReply}><Send size={14} /></button>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {selected.status === 'open' && <button className="btn btn-info" onClick={() => updateStatus(selected.id, 'in-progress')}>Start Working</button>}
                        {selected.status !== 'resolved' && selected.status !== 'closed' && <button className="btn btn-success" onClick={() => resolveTicket(selected.id)}>Resolve</button>}
                        <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                    </div>
                </div></div>
            )}
        </div>
    );
}
