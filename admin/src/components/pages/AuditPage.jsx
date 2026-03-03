"use client";
import { useState, useEffect } from "react";
import { Clock, Eye, Filter } from "lucide-react";
import { auditAPI } from "@/lib/api";
import { formatDateTime } from "@/lib/hooks";

export default function AuditPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ entity: '', action: '' });
    const [selected, setSelected] = useState(null);

    useEffect(() => { loadLogs(); }, [filters]);

    async function loadLogs() {
        try { setLoading(true); const params = { limit: 100 }; if (filters.entity) params.entity = filters.entity; if (filters.action) params.action = filters.action; const r = await auditAPI.getAll(params); setLogs(r.data?.data || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    async function viewLog(id) {
        try { const r = await auditAPI.getById(id); setSelected(r.data?.data); }
        catch (e) { console.error(e); }
    }

    const entities = [...new Set(logs.map(l => l.entity))];

    return (
        <div>
            <div className="page-header"><h2>Audit Logs</h2><p>Track all admin actions for compliance and security</p></div>
            <div className="filter-bar">
                <select className="form-select" style={{ width: 180 }} value={filters.entity} onChange={e => setFilters({ ...filters, entity: e.target.value })}>
                    <option value="">All Entities</option>
                    {entities.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                <table className="data-table">
                    <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>IP Address</th><th>Details</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr> :
                            logs.length === 0 ? <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No audit logs</td></tr> :
                                logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="text-sm" style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{log.admin?.name || '—'}</td>
                                        <td><span className="badge badge-info">{log.action}</span></td>
                                        <td><span className="badge badge-default">{log.entity}</span></td>
                                        <td className="text-sm" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{log.entityId || '—'}</td>
                                        <td className="text-sm">{log.ipAddress || '—'}</td>
                                        <td><button className="btn btn-sm btn-secondary" onClick={() => viewLog(log.id)}><Eye size={14} /></button></td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div></div>

            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                    <div className="modal-header"><h3>Audit Log Details</h3><button onClick={() => setSelected(null)} className="btn btn-sm btn-secondary">✕</button></div>
                    <div className="modal-body">
                        <div className="form-row"><div className="form-group"><label className="form-label">Action</label><div>{selected.action}</div></div><div className="form-group"><label className="form-label">Entity</label><div>{selected.entity}</div></div></div>
                        <div className="form-row"><div className="form-group"><label className="form-label">Admin</label><div>{selected.admin?.name || '—'}</div></div><div className="form-group"><label className="form-label">Timestamp</label><div className="text-sm">{formatDateTime(selected.createdAt)}</div></div></div>
                        {selected.oldValue && <div className="form-group"><label className="form-label">Old Value</label><pre style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200 }}>{JSON.stringify(selected.oldValue, null, 2)}</pre></div>}
                        {selected.newValue && <div className="form-group"><label className="form-label">New Value</label><pre style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200 }}>{JSON.stringify(selected.newValue, null, 2)}</pre></div>}
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button></div>
                </div></div>
            )}
        </div>
    );
}
