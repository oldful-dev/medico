"use client";
import { useState } from "react";
import { Plus, Edit2, Trash2, Star, FileCheck, Calendar, DollarSign, Eye, Upload, Shield, Clock } from "lucide-react";

const caregivers = [
    { id: 1, name: "Dr. Meena Kumari", type: "Doctor", city: "Bangalore", rating: 4.8, bookings: 156, status: "Active", verification: "Verified", salary: "₹85,000/mo", availability: "Mon-Sat" },
    { id: 2, name: "Nurse Lakshmi", type: "Nurse", city: "Hyderabad", rating: 4.9, bookings: 210, status: "Active", verification: "Verified", salary: "₹45,000/mo", availability: "Mon-Fri" },
    { id: 3, name: "Dr. Ravi Shankar", type: "Doctor", city: "Chennai", rating: 4.7, bookings: 132, status: "Active", verification: "Verified", salary: "₹90,000/mo", availability: "Tue-Sun" },
    { id: 4, name: "Physio Ramesh", type: "Physiotherapist", city: "Bangalore", rating: 4.6, bookings: 98, status: "Active", verification: "Pending", salary: "₹55,000/mo", availability: "Mon-Sat" },
    { id: 5, name: "Nurse Priya", type: "Nurse", city: "Mumbai", rating: 4.5, bookings: 87, status: "On Leave", verification: "Verified", salary: "₹42,000/mo", availability: "—" },
    { id: 6, name: "Kitchen Care Team", type: "Tiffin Vendor", city: "Delhi", rating: 4.3, bookings: 340, status: "Active", verification: "Verified", salary: "₹35,000/mo", availability: "Daily" },
];

export default function CaregiversPage() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div>
            <div className="page-header">
                <h2>Caregiver / Vendor Management</h2>
                <p>Manage caregivers, documents, shifts, and payouts</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                    <div className="stat-card-value">{caregivers.length}</div>
                    <div className="stat-card-label">Total Caregivers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{caregivers.filter(c => c.status === "Active").length}</div>
                    <div className="stat-card-label">Active Now</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{caregivers.filter(c => c.verification === "Pending").length}</div>
                    <div className="stat-card-label">Pending Verification</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">4.7</div>
                    <div className="stat-card-label">Avg. Rating</div>
                </div>
            </div>

            <div className="filter-bar">
                <input className="form-input" placeholder="Search caregiver..." style={{ maxWidth: 260 }} />
                <select className="form-select" style={{ width: 150 }}>
                    <option>All Types</option><option>Doctor</option><option>Nurse</option><option>Physiotherapist</option><option>Tiffin Vendor</option>
                </select>
                <select className="form-select" style={{ width: 140 }}>
                    <option>All Cities</option><option>Bangalore</option><option>Hyderabad</option><option>Chennai</option>
                </select>
                <select className="form-select" style={{ width: 140 }}>
                    <option>All Status</option><option>Active</option><option>On Leave</option><option>Inactive</option>
                </select>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Add Caregiver</button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Name</th><th>Type</th><th>City</th><th>Rating</th><th>Bookings</th><th>Verification</th><th>Availability</th><th>Payout</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {caregivers.map(cg => (
                                <tr key={cg.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{cg.name}</td>
                                    <td><span className="badge badge-purple">{cg.type}</span></td>
                                    <td>{cg.city}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Star size={14} fill="#f59e0b" color="#f59e0b" /> {cg.rating}
                                        </div>
                                    </td>
                                    <td>{cg.bookings}</td>
                                    <td>
                                        <span className={`badge ${cg.verification === "Verified" ? "badge-success" : "badge-warning"}`}>
                                            {cg.verification === "Verified" ? <><Shield size={12} /> Verified</> : <><Clock size={12} /> Pending</>}
                                        </span>
                                    </td>
                                    <td className="text-sm">{cg.availability}</td>
                                    <td className="text-sm font-medium">{cg.salary}</td>
                                    <td><span className={`badge ${cg.status === "Active" ? "badge-success" : "badge-warning"}`}>{cg.status}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary"><Eye size={14} /></button>
                                            <button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button>
                                            <button className="btn btn-sm btn-secondary"><Calendar size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Caregiver</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Full name" /></div>
                                <div className="form-group"><label className="form-label">Type</label>
                                    <select className="form-select"><option>Doctor</option><option>Nurse</option><option>Physiotherapist</option><option>Vendor</option></select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91" /></div>
                                <div className="form-group"><label className="form-label">City</label>
                                    <select className="form-select"><option>Bangalore</option><option>Hyderabad</option><option>Chennai</option></select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Upload Documents</label>
                                <div style={{ border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)", padding: 24, textAlign: "center" }}>
                                    <Upload size={28} color="var(--text-muted)" />
                                    <p className="text-sm text-muted mt-2">Upload ID proof, medical certificates, police verification</p>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Monthly Salary</label><input className="form-input" placeholder="₹" /></div>
                                <div className="form-group"><label className="form-label">Police Verification</label>
                                    <select className="form-select"><option>Pending</option><option>Verified</option><option>Rejected</option></select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary">Add Caregiver</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
