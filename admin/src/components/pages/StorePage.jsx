"use client";
import { useState } from "react";
import { ShoppingBag, Plus, Edit2, Eye, EyeOff, Image, Upload, Users, Package } from "lucide-react";

const products = [
    { id: 1, name: "Blood Pressure Monitor", category: "Devices", price: "₹2,499", stock: "In Stock", enabled: true },
    { id: 2, name: "Glucometer Kit", category: "Devices", price: "₹1,299", stock: "In Stock", enabled: true },
    { id: 3, name: "Orthopedic Pillow", category: "Comfort", price: "₹899", stock: "Low Stock", enabled: true },
    { id: 4, name: "Ayurvedic Wellness Pack", category: "Wellness", price: "₹1,999", stock: "In Stock", enabled: true },
    { id: 5, name: "Digital Thermometer", category: "Devices", price: "₹499", stock: "In Stock", enabled: false },
];

const waitlistUsers = [
    { name: "Suresh Patel", email: "suresh@email.com", city: "Mumbai", date: "Feb 22, 2026" },
    { name: "Kavita Joshi", email: "kavita@email.com", city: "Bangalore", date: "Feb 21, 2026" },
    { name: "Ramu Prasad", email: "ramu@email.com", city: "Delhi", date: "Feb 20, 2026" },
];

export default function StorePage() {
    const [storeEnabled, setStoreEnabled] = useState(true);

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2>Wellness Store CMS</h2>
                        <p>Manage store, products, banners, and waitlist</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted">Store Status:</span>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={storeEnabled} onChange={() => setStoreEnabled(!storeEnabled)} />
                            <span className="toggle-slider"></span>
                        </label>
                        <span className={`badge ${storeEnabled ? "badge-success" : "badge-danger"}`}>{storeEnabled ? "Live" : "Offline"}</span>
                    </div>
                </div>
            </div>

            <div className="grid-2 mb-6">
                <div className="card">
                    <div className="card-header"><h3>Hero Banner</h3><button className="btn btn-sm btn-secondary"><Edit2 size={14} /> Edit</button></div>
                    <div className="card-body">
                        <div style={{ background: "var(--gradient-primary)", borderRadius: "var(--radius-md)", padding: 32, textAlign: "center" }}>
                            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Wellness Essentials</h3>
                            <p className="text-sm" style={{ opacity: 0.8 }}>Quality healthcare products for your loved ones</p>
                            <button className="btn btn-sm btn-secondary mt-4">Shop Now</button>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Waitlist ({waitlistUsers.length})</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>City</th><th>Date</th></tr></thead>
                            <tbody>
                                {waitlistUsers.map((u, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{u.name}</td>
                                        <td className="text-sm">{u.email}</td>
                                        <td>{u.city}</td>
                                        <td className="text-sm">{u.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3>Products</h3><button className="btn btn-primary btn-sm"><Plus size={14} /> Add Product</button></div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visible</th><th>Actions</th></tr></thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} style={{ opacity: p.enabled ? 1 : 0.5 }}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</td>
                                    <td><span className="badge badge-purple">{p.category}</span></td>
                                    <td style={{ fontWeight: 600 }}>{p.price}</td>
                                    <td><span className={`badge ${p.stock === "In Stock" ? "badge-success" : "badge-warning"}`}>{p.stock}</span></td>
                                    <td><label className="toggle-switch"><input type="checkbox" defaultChecked={p.enabled} /><span className="toggle-slider"></span></label></td>
                                    <td><div className="flex gap-2"><button className="btn btn-sm btn-secondary"><Edit2 size={14} /></button><button className="btn btn-sm btn-secondary"><Image size={14} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
