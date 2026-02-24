"use client";
import { useState } from "react";
import { AlertTriangle, Phone, MapPin, Clock, CheckCircle, User, PhoneCall } from "lucide-react";

const sosAlerts = [
    { id: 1, user: "Rajesh Kumar", phone: "+91 98765 43210", location: "Koramangala 4th Block, Bangalore", lat: "12.9352", lng: "77.6245", time: "2 min ago", timestamp: "Feb 23, 2026 - 08:31 PM", status: "Active", responder: "—", family: "+91 87654 00001" },
    { id: 2, user: "Sunita Devi", phone: "+91 87654 32109", location: "Banjara Hills, Hyderabad", lat: "17.4138", lng: "78.4478", time: "8 min ago", timestamp: "Feb 23, 2026 - 08:25 PM", status: "Assigned", responder: "Nurse Lakshmi", family: "+91 76543 00002" },
    { id: 3, user: "Mohan Rao", phone: "+91 76543 21098", location: "T.Nagar, Chennai", lat: "13.0399", lng: "80.2340", time: "15 min ago", timestamp: "Feb 23, 2026 - 08:18 PM", status: "Assigned", responder: "Dr. Ravi", family: "+91 65432 00003" },
    { id: 4, user: "Kamala Iyer", phone: "+91 65432 10987", location: "Andheri West, Mumbai", lat: "19.1358", lng: "72.8266", time: "42 min ago", timestamp: "Feb 23, 2026 - 07:51 PM", status: "Resolved", responder: "EMT Team 3", family: "+91 54321 00004" },
    { id: 5, user: "Ramu Prasad", phone: "+91 54321 09876", location: "Indiranagar, Bangalore", lat: "12.9716", lng: "77.6412", time: "1 hr ago", timestamp: "Feb 23, 2026 - 07:33 PM", status: "Resolved", responder: "Dr. Meena", family: "+91 43210 00005" },
];

export default function SOSPage() {
    const [selectedAlert, setSelectedAlert] = useState(null);

    const activeCount = sosAlerts.filter(a => a.status === "Active").length;
    const assignedCount = sosAlerts.filter(a => a.status === "Assigned").length;

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="status-dot live" style={{ width: 12, height: 12 }}></span>
                            SOS Emergency Control Panel
                        </h2>
                        <p>Real-time monitoring of emergency alerts</p>
                    </div>
                    <span className="badge badge-danger" style={{ fontSize: 14, padding: "8px 16px", animation: "pulse-dot 1.5s infinite" }}>
                        {activeCount} ACTIVE ALERT{activeCount !== 1 ? "S" : ""}
                    </span>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
                    <div className="stat-card-value" style={{ color: "var(--accent-danger)" }}>{activeCount}</div>
                    <div className="stat-card-label">Active Alerts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value" style={{ color: "var(--accent-warning)" }}>{assignedCount}</div>
                    <div className="stat-card-label">Assigned</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value" style={{ color: "var(--accent-success)" }}>{sosAlerts.filter(a => a.status === "Resolved").length}</div>
                    <div className="stat-card-label">Resolved Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">2m 34s</div>
                    <div className="stat-card-label">Avg. Response Time</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>SOS Alert Feed</h3>
                    <span className="badge badge-danger">Live</span>
                </div>
                <div className="card-body">
                    {sosAlerts.map(alert => (
                        <div key={alert.id} style={{
                            display: "flex", alignItems: "flex-start", gap: 16, padding: 16,
                            background: alert.status === "Active" ? "rgba(239,68,68,0.06)" : "transparent",
                            borderRadius: "var(--radius-md)", marginBottom: 8,
                            border: `1px solid ${alert.status === "Active" ? "rgba(239,68,68,0.2)" : "var(--border-color)"}`,
                            cursor: "pointer", transition: "all 0.2s ease"
                        }} onClick={() => setSelectedAlert(alert)}>
                            <div className={`live-feed-dot ${alert.status === "Active" ? "critical" : alert.status === "Assigned" ? "warning" : "info"}`} style={{ marginTop: 4 }} />
                            <div style={{ flex: 1 }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{alert.user}</span>
                                    <span className={`badge ${alert.status === "Active" ? "badge-danger" : alert.status === "Assigned" ? "badge-warning" : "badge-success"}`}>{alert.status}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted">
                                    <span className="flex items-center gap-1"><Phone size={12} /> {alert.phone}</span>
                                    <span className="flex items-center gap-1"><MapPin size={12} /> {alert.location}</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> {alert.time}</span>
                                </div>
                                {alert.responder !== "—" && (
                                    <div className="text-sm mt-1" style={{ color: "var(--accent-info)" }}>
                                        <User size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Responder: {alert.responder}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {alert.status === "Active" && (
                                    <>
                                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); }}><User size={14} /> Assign</button>
                                        <button className="btn btn-sm btn-warning" onClick={(e) => { e.stopPropagation(); }}><PhoneCall size={14} /></button>
                                    </>
                                )}
                                {alert.status === "Assigned" && (
                                    <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); }}><CheckCircle size={14} /> Resolve</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedAlert && (
                <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <AlertTriangle size={20} color="var(--accent-danger)" /> SOS Alert Details
                            </h3>
                            <button onClick={() => setSelectedAlert(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">User Name</label><input className="form-input" value={selectedAlert.user} readOnly /></div>
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={selectedAlert.phone} readOnly /></div>
                            </div>
                            <div className="form-group"><label className="form-label">GPS Location</label><input className="form-input" value={`${selectedAlert.location} (${selectedAlert.lat}, ${selectedAlert.lng})`} readOnly /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Timestamp</label><input className="form-input" value={selectedAlert.timestamp} readOnly /></div>
                                <div className="form-group"><label className="form-label">Assigned Responder</label>
                                    <select className="form-select" defaultValue={selectedAlert.responder}>
                                        <option>—</option><option>Dr. Meena</option><option>Nurse Lakshmi</option><option>Dr. Ravi</option><option>EMT Team 1</option><option>EMT Team 2</option><option>EMT Team 3</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Family Contact</label><input className="form-input" value={selectedAlert.family} readOnly /></div>
                            <div className="form-group"><label className="form-label">Call Log / Notes</label><textarea className="form-textarea" placeholder="Record call notes here..."></textarea></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-warning"><PhoneCall size={14} /> Call User</button>
                            <button className="btn btn-info" style={{ background: "var(--gradient-info)", color: "white" }}><Phone size={14} /> Notify Family</button>
                            <button className="btn btn-success"><CheckCircle size={14} /> Mark Resolved</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
