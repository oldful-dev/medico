"use client";
import { useState } from "react";
import { CalendarCheck, Search, Filter, Eye, Edit2, UserPlus, MessageSquare, RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";

const bookings = [
    { id: "BK-4501", user: "Rajesh Kumar", service: "Doctor Home Visit", city: "Bangalore", date: "Feb 23, 2026", time: "10:00 AM", status: "Pending", caregiver: "—", amount: "₹799" },
    { id: "BK-4502", user: "Anita Sharma", service: "Blood Test", city: "Bangalore", date: "Feb 23, 2026", time: "11:30 AM", status: "Assigned", caregiver: "Dr. Meena", amount: "₹299" },
    { id: "BK-4503", user: "Venkat Reddy", service: "Home Nurse", city: "Hyderabad", date: "Feb 23, 2026", time: "09:00 AM", status: "In Progress", caregiver: "Nurse Lakshmi", amount: "₹1,299" },
    { id: "BK-4504", user: "Priya Menon", service: "Physio & Fitness", city: "Chennai", date: "Feb 22, 2026", time: "04:00 PM", status: "Completed", caregiver: "Physio Ram", amount: "₹699" },
    { id: "BK-4505", user: "Suresh Patel", service: "Hospital Trip", city: "Mumbai", date: "Feb 22, 2026", time: "08:00 AM", status: "Cancelled", caregiver: "—", amount: "₹499" },
    { id: "BK-4506", user: "Lakshmi Devi", service: "Doctor Home Visit", city: "Bangalore", date: "Feb 21, 2026", time: "02:00 PM", status: "SLA Breach", caregiver: "Dr. Ravi", amount: "₹799" },
    { id: "BK-4507", user: "Amit Verma", service: "Tiffin", city: "Delhi", date: "Feb 23, 2026", time: "12:30 PM", status: "Assigned", caregiver: "Kitchen Care", amount: "₹149" },
];

const statusConfig = {
    "Pending": "badge-warning",
    "Assigned": "badge-info",
    "In Progress": "badge-purple",
    "Completed": "badge-success",
    "Cancelled": "badge-default",
    "SLA Breach": "badge-danger",
};

export default function BookingsPage() {
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    const filtered = statusFilter === "all" ? bookings : bookings.filter(b => b.status === statusFilter);

    return (
        <div>
            <div className="page-header">
                <h2>Booking Management</h2>
                <p>View, assign, and manage all service bookings</p>
            </div>

            {/* Status Summary */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {Object.keys(statusConfig).map(status => {
                    const count = bookings.filter(b => b.status === status).length;
                    return (
                        <div key={status} className="stat-card" style={{ cursor: "pointer" }} onClick={() => setStatusFilter(status === statusFilter ? "all" : status)}>
                            <div className="stat-card-value" style={{ fontSize: 24 }}>{count}</div>
                            <div className="stat-card-label">{status}</div>
                        </div>
                    );
                })}
            </div>

            <div className="filter-bar">
                <input className="form-input" placeholder="Search booking ID, user..." style={{ maxWidth: 260 }} />
                <select className="form-select" style={{ width: 160 }}>
                    <option>All Services</option>
                    <option>Doctor Home Visit</option><option>Blood Test</option><option>Home Nurse</option><option>Hospital Trip</option>
                </select>
                <input className="form-input" type="date" style={{ width: 160 }} />
                <select className="form-select" style={{ width: 140 }}>
                    <option>All Cities</option><option>Bangalore</option><option>Hyderabad</option><option>Chennai</option>
                </select>
                <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Booking ID</th><th>User</th><th>Service</th><th>City</th><th>Date & Time</th><th>Caregiver</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(booking => (
                                <tr key={booking.id}>
                                    <td><code style={{ color: "var(--accent-primary-light)", fontSize: 12 }}>{booking.id}</code></td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{booking.user}</td>
                                    <td>{booking.service}</td>
                                    <td>{booking.city}</td>
                                    <td className="text-sm">{booking.date}, {booking.time}</td>
                                    <td>{booking.caregiver}</td>
                                    <td style={{ fontWeight: 600 }}>{booking.amount}</td>
                                    <td><span className={`badge ${statusConfig[booking.status]}`}>{booking.status}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedBooking(booking)}><Eye size={14} /></button>
                                            {booking.status === "Pending" && <button className="btn btn-sm btn-primary"><UserPlus size={14} /></button>}
                                            {booking.status === "SLA Breach" && <button className="btn btn-sm btn-danger"><AlertTriangle size={14} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedBooking && (
                <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Booking {selectedBooking.id}</h3>
                            <button onClick={() => setSelectedBooking(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">User</label><input className="form-input" value={selectedBooking.user} readOnly /></div>
                                <div className="form-group"><label className="form-label">Service</label><input className="form-input" value={selectedBooking.service} readOnly /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Date</label><input className="form-input" value={selectedBooking.date} readOnly /></div>
                                <div className="form-group"><label className="form-label">Status</label>
                                    <select className="form-select" defaultValue={selectedBooking.status}>
                                        {Object.keys(statusConfig).map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assign Caregiver</label>
                                <select className="form-select">
                                    <option>Select caregiver...</option><option>Dr. Meena</option><option>Nurse Lakshmi</option><option>Dr. Ravi</option><option>Physio Ram</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Internal Notes</label>
                                <textarea className="form-textarea" placeholder="Add notes about this booking..."></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-danger btn-sm">Refund</button>
                            <button className="btn btn-warning btn-sm">Escalate</button>
                            <button className="btn btn-primary">Update Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
