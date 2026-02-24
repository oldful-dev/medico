"use client";
import { useState } from "react";
import { Sliders, Save, Eye, Copy, RefreshCw, Plus, GripVertical, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

const uiConfig = [
    { id: 1, label: "Doctor Home Visit", iconUrl: "/icons/doctor.svg", sortOrder: 1, visible: true, pricingText: "₹799/visit", ctaText: "Book Now", heroImage: "/heroes/doctor.jpg", bannerColor: "#6366f1" },
    { id: 2, label: "Hospital Trip", iconUrl: "/icons/hospital.svg", sortOrder: 2, visible: true, pricingText: "₹499/trip", ctaText: "Book Trip", heroImage: "/heroes/hospital.jpg", bannerColor: "#06b6d4" },
    { id: 3, label: "Home Nurse", iconUrl: "/icons/nurse.svg", sortOrder: 3, visible: true, pricingText: "₹1,299/day", ctaText: "Book Nurse", heroImage: "/heroes/nurse.jpg", bannerColor: "#10b981" },
    { id: 4, label: "Insurance", iconUrl: "/icons/insurance.svg", sortOrder: 4, visible: true, pricingText: "From ₹199/mo", ctaText: "Explore Plans", heroImage: "/heroes/insurance.jpg", bannerColor: "#8b5cf6" },
    { id: 5, label: "Blood Test", iconUrl: "/icons/blood.svg", sortOrder: 5, visible: true, pricingText: "₹299/test", ctaText: "Book Test", heroImage: "/heroes/blood.jpg", bannerColor: "#ef4444" },
    { id: 6, label: "Medicines", iconUrl: "/icons/medicine.svg", sortOrder: 6, visible: true, pricingText: "At MRP", ctaText: "Order Now", heroImage: "/heroes/medicine.jpg", bannerColor: "#f59e0b" },
];

export default function ServerUIPage() {
    const [config, setConfig] = useState(uiConfig);
    const [showPreview, setShowPreview] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const moveItem = (id, dir) => {
        const idx = config.findIndex(c => c.id === id);
        if ((dir === -1 && idx === 0) || (dir === 1 && idx === config.length - 1)) return;
        const newConfig = [...config];
        const temp = newConfig[idx];
        newConfig[idx] = newConfig[idx + dir];
        newConfig[idx + dir] = temp;
        newConfig.forEach((c, i) => c.sortOrder = i + 1);
        setConfig(newConfig);
        setHasChanges(true);
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2>Server Driven UI Config Panel</h2>
                        <p>Control app UI dynamically — changes auto-sync via JSON fetch</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => setShowPreview(true)}><Eye size={16} /> Preview JSON</button>
                        <button className={`btn ${hasChanges ? "btn-primary" : "btn-secondary"}`}>
                            <Save size={16} /> Publish Config
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>UI Config Items ({config.length})</h3>
                    <button className="btn btn-sm btn-primary"><Plus size={14} /> Add Item</button>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr><th></th><th>Order</th><th>Label</th><th>Icon URL</th><th>Pricing Text</th><th>CTA Text</th><th>Banner Color</th><th>Hero Image</th><th>Visible</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {config.map(item => (
                                <tr key={item.id} style={{ opacity: item.visible ? 1 : 0.5 }}>
                                    <td><GripVertical size={16} className="drag-handle" /></td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <span style={{ fontWeight: 600 }}>{item.sortOrder}</span>
                                            <div className="flex flex-col" style={{ gap: 2 }}>
                                                <button className="btn btn-sm btn-secondary btn-icon" style={{ width: 20, height: 20 }} onClick={() => moveItem(item.id, -1)}><ArrowUp size={10} /></button>
                                                <button className="btn btn-sm btn-secondary btn-icon" style={{ width: 20, height: 20 }} onClick={() => moveItem(item.id, 1)}><ArrowDown size={10} /></button>
                                            </div>
                                        </div>
                                    </td>
                                    <td><input className="form-input" defaultValue={item.label} style={{ width: 140, padding: "4px 8px", fontSize: 13 }} onChange={() => setHasChanges(true)} /></td>
                                    <td><input className="form-input" defaultValue={item.iconUrl} style={{ width: 140, padding: "4px 8px", fontSize: 11 }} onChange={() => setHasChanges(true)} /></td>
                                    <td><input className="form-input" defaultValue={item.pricingText} style={{ width: 110, padding: "4px 8px", fontSize: 13 }} onChange={() => setHasChanges(true)} /></td>
                                    <td><input className="form-input" defaultValue={item.ctaText} style={{ width: 110, padding: "4px 8px", fontSize: 13 }} onChange={() => setHasChanges(true)} /></td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div style={{ width: 24, height: 24, borderRadius: 4, background: item.bannerColor }} />
                                            <input className="form-input" defaultValue={item.bannerColor} style={{ width: 80, padding: "4px 8px", fontSize: 12 }} onChange={() => setHasChanges(true)} />
                                        </div>
                                    </td>
                                    <td><input className="form-input" defaultValue={item.heroImage} style={{ width: 140, padding: "4px 8px", fontSize: 11 }} onChange={() => setHasChanges(true)} /></td>
                                    <td>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked={item.visible} onChange={() => setHasChanges(true)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </td>
                                    <td><button className="btn btn-sm btn-secondary"><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPreview && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>JSON Config Preview</h3>
                            <div className="flex gap-2">
                                <button className="btn btn-sm btn-secondary"><Copy size={14} /> Copy</button>
                                <button onClick={() => setShowPreview(false)} className="btn btn-sm btn-secondary">✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <pre style={{ background: "var(--bg-glass)", padding: 16, borderRadius: "var(--radius-md)", fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)", overflow: "auto", maxHeight: 400 }}>
                                {JSON.stringify({
                                    version: 47, updatedAt: new Date().toISOString(), services: config.map(c => ({
                                        id: c.id, label: c.label, iconUrl: c.iconUrl, sortOrder: c.sortOrder,
                                        visible: c.visible, pricingText: c.pricingText, ctaText: c.ctaText,
                                        heroImage: c.heroImage, bannerColor: c.bannerColor
                                    }))
                                }, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
