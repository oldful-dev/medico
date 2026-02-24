"use client";
import { useState } from "react";
import { FileText, Save, Clock, Eye, Plus, History, Edit2 } from "lucide-react";

const legalDocs = [
    { id: 1, title: "Terms & Conditions", version: "v2.3", lastUpdated: "Feb 18, 2026", updatedBy: "Arun Kumar", status: "Published" },
    { id: 2, title: "Privacy Policy", version: "v1.8", lastUpdated: "Feb 10, 2026", updatedBy: "Arun Kumar", status: "Published" },
    { id: 3, title: "Refund Policy", version: "v1.5", lastUpdated: "Jan 25, 2026", updatedBy: "Deepa Rao", status: "Published" },
    { id: 4, title: "Disclaimer", version: "v1.2", lastUpdated: "Jan 15, 2026", updatedBy: "Arun Kumar", status: "Published" },
    { id: 5, title: "Statutory Disclosures", version: "v1.0", lastUpdated: "Dec 20, 2025", updatedBy: "Legal Team", status: "Draft" },
];

const versionHistory = [
    { version: "v2.3", date: "Feb 18, 2026", editor: "Arun Kumar", changes: "Updated service liability clauses" },
    { version: "v2.2", date: "Jan 30, 2026", editor: "Arun Kumar", changes: "Added caregiver responsibility section" },
    { version: "v2.1", date: "Jan 10, 2026", editor: "Legal Team", changes: "Revised refund timeline to 7 days" },
    { version: "v2.0", date: "Dec 15, 2025", editor: "Legal Team", changes: "Major restructuring for GST compliance" },
];

export default function LegalPage() {
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    return (
        <div>
            <div className="page-header">
                <h2>Legal CMS</h2>
                <p>Manage all legal documents with rich text editing and version control</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {legalDocs.map(doc => (
                    <div key={doc.id} className="stat-card" style={{ cursor: "pointer" }} onClick={() => setSelectedDoc(doc)}>
                        <div className="stat-card-header">
                            <div className="stat-card-icon purple"><FileText size={20} /></div>
                            <span className={`badge ${doc.status === "Published" ? "badge-success" : "badge-warning"}`}>{doc.status}</span>
                        </div>
                        <div className="stat-card-value" style={{ fontSize: 18 }}>{doc.title}</div>
                        <div className="stat-card-label">{doc.version} • Updated {doc.lastUpdated}</div>
                        <div className="text-xs text-muted mt-2">By {doc.updatedBy}</div>
                        <div className="flex gap-2 mt-4">
                            <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}><Edit2 size={14} /> Edit</button>
                            <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}><History size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedDoc && (
                <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
                    <div className="modal" style={{ maxWidth: 900, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Editing: {selectedDoc.title} ({selectedDoc.version})</h3>
                            <button onClick={() => setSelectedDoc(null)} className="btn btn-sm btn-secondary">✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            <div className="rich-editor">
                                <div className="rich-editor-toolbar">
                                    {["B", "I", "U", "S"].map(b => <button key={b} style={{ fontWeight: b === "B" ? 700 : 400, fontStyle: b === "I" ? "italic" : "normal", textDecoration: b === "U" ? "underline" : b === "S" ? "line-through" : "none" }}>{b}</button>)}
                                    <div style={{ width: 1, height: 20, background: "var(--border-color)", margin: "0 4px" }} />
                                    {["H1", "H2", "H3", "¶"].map(b => <button key={b}>{b}</button>)}
                                    <div style={{ width: 1, height: 20, background: "var(--border-color)", margin: "0 4px" }} />
                                    {["UL", "OL", "Link", "Table"].map(b => <button key={b} style={{ fontSize: 11 }}>{b}</button>)}
                                </div>
                                <div className="rich-editor-content" contentEditable suppressContentEditableWarning style={{ minHeight: 350 }}>
                                    <h2>1. Introduction</h2>
                                    <p>These Terms and Conditions (&quot;Terms&quot;) govern your use of the Medico healthcare platform (&quot;Platform&quot;) operated by Medico Care Pvt. Ltd.</p>
                                    <h2>2. Services</h2>
                                    <p>The Platform provides access to various healthcare services including but not limited to doctor home visits, nursing care, diagnostic tests, medicine delivery, and emergency services.</p>
                                    <h2>3. User Responsibilities</h2>
                                    <p>Users must provide accurate personal and medical information. Any misrepresentation may result in termination of services.</p>
                                    <h2>4. Payment & Refunds</h2>
                                    <p>All payments are processed securely. Refund requests must be submitted within 7 business days of service delivery.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary">Save as Draft</button>
                            <button className="btn btn-primary"><Save size={14} /> Publish</button>
                        </div>
                    </div>
                </div>
            )}

            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>Version History</h3><button onClick={() => setShowHistory(false)} className="btn btn-sm btn-secondary">✕</button></div>
                        <div className="modal-body">
                            <div className="timeline">
                                {versionHistory.map((v, i) => (
                                    <div key={i} className="timeline-item">
                                        <h5>{v.version} — {v.changes}</h5>
                                        <p>By {v.editor}</p>
                                        <time>{v.date}</time>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

