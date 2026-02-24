"use client";
import { useState } from "react";
import { Image, Upload, Trash2, Copy, Search, FolderOpen, File } from "lucide-react";

const mediaFiles = [
    { id: 1, name: "hero-doctor-visit.jpg", type: "Image", size: "245 KB", dimensions: "1200×600", uploaded: "Feb 22, 2026", category: "Hero Banners" },
    { id: 2, name: "icon-nurse.svg", type: "Icon", size: "4 KB", dimensions: "64×64", uploaded: "Feb 20, 2026", category: "Icons" },
    { id: 3, name: "banner-blood-test.png", type: "Image", size: "180 KB", dimensions: "1080×540", uploaded: "Feb 18, 2026", category: "Hero Banners" },
    { id: 4, name: "icon-medicine.svg", type: "Icon", size: "3 KB", dimensions: "64×64", uploaded: "Feb 15, 2026", category: "Icons" },
    { id: 5, name: "hero-physio.jpg", type: "Image", size: "310 KB", dimensions: "1200×600", uploaded: "Feb 10, 2026", category: "Hero Banners" },
    { id: 6, name: "icon-equipment.svg", type: "Icon", size: "5 KB", dimensions: "64×64", uploaded: "Feb 08, 2026", category: "Icons" },
    { id: 7, name: "promo-annual-plan.png", type: "Image", size: "420 KB", dimensions: "1080×1080", uploaded: "Feb 05, 2026", category: "Promotions" },
    { id: 8, name: "store-banner.jpg", type: "Image", size: "280 KB", dimensions: "1200×400", uploaded: "Feb 01, 2026", category: "Store" },
];

const categories = ["All", "Hero Banners", "Icons", "Promotions", "Store"];

export default function MediaPage() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState("grid");

    const filtered = selectedCategory === "All" ? mediaFiles : mediaFiles.filter(f => f.category === selectedCategory);

    return (
        <div>
            <div className="page-header">
                <h2>Content & Media Library</h2>
                <p>Upload and manage images, icons, and banners with cloud storage integration</p>
            </div>

            <div className="filter-bar">
                <div className="tabs" style={{ marginBottom: 0 }}>
                    {categories.map(c => (
                        <button key={c} className={`tab ${selectedCategory === c ? "active" : ""}`} onClick={() => setSelectedCategory(c)}>{c}</button>
                    ))}
                </div>
                <div style={{ marginLeft: "auto" }} className="flex gap-2">
                    <button className="btn btn-primary"><Upload size={16} /> Upload</button>
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead><tr><th>Preview</th><th>Filename</th><th>Type</th><th>Size</th><th>Dimensions</th><th>Category</th><th>Uploaded</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(file => (
                                <tr key={file.id}>
                                    <td>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: "var(--radius-sm)",
                                            background: file.type === "Icon" ? "var(--bg-glass)" : "var(--gradient-primary)",
                                            display: "flex", alignItems: "center", justifyContent: "center"
                                        }}>
                                            {file.type === "Icon" ? <File size={20} color="var(--text-muted)" /> : <Image size={20} color="white" />}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{file.name}</td>
                                    <td><span className={`badge ${file.type === "Icon" ? "badge-info" : "badge-purple"}`}>{file.type}</span></td>
                                    <td className="text-sm">{file.size}</td>
                                    <td className="text-sm text-muted">{file.dimensions}</td>
                                    <td><span className="badge badge-default">{file.category}</span></td>
                                    <td className="text-sm">{file.uploaded}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" title="Copy URL"><Copy size={14} /></button>
                                            <button className="btn btn-sm btn-secondary" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card mt-6">
                <div className="card-header"><h3>Upload New Media</h3></div>
                <div className="card-body">
                    <div style={{ border: "2px dashed var(--border-color)", borderRadius: "var(--radius-lg)", padding: 48, textAlign: "center" }}>
                        <Upload size={48} color="var(--text-muted)" />
                        <h4 style={{ marginTop: 16, color: "var(--text-secondary)" }}>Drop files here or click to upload</h4>
                        <p className="text-sm text-muted mt-2">PNG, JPG, SVG, WebP • Max 10MB per file • Auto-optimized for mobile</p>
                        <button className="btn btn-primary mt-4">Browse Files</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
