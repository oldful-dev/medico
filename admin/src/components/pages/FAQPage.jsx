"use client";
import { useState, useEffect } from "react";
import {
    Plus, Edit2, Trash2, GripVertical, X,
    Search, HelpCircle, AlertCircle, ChevronDown
} from "lucide-react";
import { faqAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

const CATEGORIES = ["GENERAL", "BOOKING", "PAYMENTS", "ACCOUNT", "SERVICES"];

export default function FAQPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    const [form, setForm] = useState({
        question: "",
        answer: "",
        category: "GENERAL",
        order: 0,
        isActive: true,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [filterActive, setFilterActive] = useState("ALL");

    useEffect(() => {
        loadFAQs();
    }, []);

    async function loadFAQs() {
        try {
            setLoading(true);
            const res = await faqAPI.getAll({ limit: 500 });
            setFaqs(res.data?.data || []);
        } catch (e) {
            console.error(e);
            showToast("Failed to load FAQs", "error");
        } finally {
            setLoading(false);
        }
    }

    function openAddModal() {
        setEditing(null);
        setForm({
            question: "",
            answer: "",
            category: "GENERAL",
            order: faqs.length,
            isActive: true,
        });
        setShowModal(true);
    }

    function openEditModal(faq) {
        setEditing(faq);
        setForm({
            question: faq.question,
            answer: faq.answer,
            category: faq.category || "GENERAL",
            order: faq.order,
            isActive: faq.isActive,
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.question || !form.answer) {
            showToast("Please fill in required fields", "error");
            return;
        }

        try {
            if (editing) {
                await faqAPI.update(editing.id, form);
                showToast("FAQ updated successfully");
            } else {
                await faqAPI.create(form);
                showToast("FAQ created successfully");
            }
            setShowModal(false);
            loadFAQs();
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to save FAQ", "error");
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await faqAPI.delete(id);
            showToast("FAQ deleted");
            loadFAQs();
        } catch (e) {
            showToast("Failed to delete", "error");
        }
    }

    async function handleToggle(id, isActive) {
        try {
            await faqAPI.toggle(id, { isActive: !isActive });
            showToast(`FAQ ${!isActive ? "enabled" : "disabled"}`);
            loadFAQs();
        } catch (e) {
            showToast("Failed to toggle", "error");
        }
    }

    function handleDragStart(id) {
        setDraggedId(id);
    }

    function handleDragOver(e, id) {
        e.preventDefault();
        setDragOverId(id);
    }

    function handleDragLeave() {
        setDragOverId(null);
    }

    async function handleDrop(targetId) {
        setDragOverId(null);
        if (!draggedId || draggedId === targetId) return;

        const newFaqs = [...faqs];
        const draggedIdx = newFaqs.findIndex(f => f.id === draggedId);
        const targetIdx = newFaqs.findIndex(f => f.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;

        [newFaqs[draggedIdx], newFaqs[targetIdx]] = [newFaqs[targetIdx], newFaqs[draggedIdx]];

        const reorderData = newFaqs.map((f, idx) => ({ id: f.id, order: idx }));

        try {
            await faqAPI.reorder({ faqs: reorderData });
            setFaqs(newFaqs);
            showToast("FAQs reordered");
        } catch (e) {
            showToast("Failed to reorder", "error");
            loadFAQs();
        } finally {
            setDraggedId(null);
        }
    }

    const filteredFAQs = faqs
        .filter(f => filterActive === "ALL" || (filterActive === "ACTIVE" ? f.isActive : !f.isActive))
        .filter(f => f.question.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="page-enter">
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        padding: 10,
                        backgroundColor: "var(--bg-glass)",
                        color: "var(--accent-primary)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-sm)",
                    }}>
                        <HelpCircle size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                            FAQ Management
                        </h2>
                        <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: 13.5 }}>
                            Manage FAQs shown in the mobile app&apos;s Help &amp; Support and the website&apos;s Contact Us page.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="filter-bar" style={{
                backgroundColor: "var(--bg-card)",
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
                flexWrap: "wrap"
            }}>
                <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                    <Search size={18} style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)"
                    }} />
                    <input
                        type="text"
                        placeholder="Search FAQs by question..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: 40, width: "100%", height: 44 }}
                    />
                </div>

                <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="form-select"
                    style={{ minWidth: 160, height: 44 }}
                >
                    <option value="ALL">All FAQs</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Inactive Only</option>
                </select>

                <button
                    className="btn btn-primary"
                    onClick={openAddModal}
                    style={{ height: 44, padding: "0 20px" }}
                >
                    <Plus size={18} /> Add New FAQ
                </button>
            </div>

            {faqs.length > 1 && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                    marginBottom: 16,
                    paddingLeft: 4
                }}>
                    <GripVertical size={14} style={{ color: "var(--accent-primary)" }} />
                    <span>Tip: Drag and drop rows to reorder how FAQs appear on the app and website.</span>
                </div>
            )}

            {/* FAQ List — collapsed accordion rows, same UX pattern this feature ships to the app */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 }}>
                    <div style={{
                        width: 40, height: 40,
                        border: "3px solid var(--border-color)",
                        borderTopColor: "var(--accent-primary)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading FAQs...</p>
                </div>
            ) : filteredFAQs.length === 0 ? (
                <div className="empty-state card" style={{
                    padding: "64px 32px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: "50%",
                        backgroundColor: "var(--bg-tertiary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-muted)", marginBottom: 20
                    }}>
                        <HelpCircle size={36} style={{ opacity: 0.6 }} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-secondary)" }}>
                        No FAQs Found
                    </h4>
                    <p style={{
                        margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: 14,
                        maxWidth: 420, textAlign: "center", lineHeight: 1.5
                    }}>
                        {searchTerm
                            ? "No FAQs match your search term."
                            : "Add frequently asked questions to help users on the app and website."}
                    </p>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 24 }}>
                        Create First FAQ
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredFAQs.map((faq) => {
                        const isOpen = expandedId === faq.id;
                        return (
                            <div
                                key={faq.id}
                                draggable
                                onDragStart={() => handleDragStart(faq.id)}
                                onDragOver={(e) => handleDragOver(e, faq.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={() => handleDrop(faq.id)}
                                className="card"
                                style={{
                                    opacity: draggedId === faq.id ? 0.3 : 1,
                                    cursor: "grab",
                                    transition: "all var(--transition-base)",
                                    borderColor: dragOverId === faq.id ? "var(--accent-primary)" : "var(--border-color)",
                                    borderWidth: dragOverId === faq.id ? 2 : 1,
                                    borderStyle: dragOverId === faq.id ? "dashed" : "solid",
                                    padding: 0,
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    onClick={() => setExpandedId(isOpen ? null : faq.id)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 14,
                                        padding: "14px 16px", cursor: "pointer",
                                    }}
                                >
                                    <GripVertical size={18} className="drag-handle" style={{ color: "var(--text-muted)", flexShrink: 0 }} />

                                    <span className={`badge ${faq.isActive ? "badge-success" : "badge-danger"}`} style={{ flexShrink: 0 }}>
                                        {faq.isActive ? "Active" : "Hidden"}
                                    </span>

                                    <span className="badge badge-purple" style={{ flexShrink: 0, fontSize: 11 }}>
                                        {faq.category || "GENERAL"}
                                    </span>

                                    <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                                        {faq.question}
                                    </h3>

                                    <label className="toggle-switch" title={faq.isActive ? "Disable" : "Enable"} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={faq.isActive}
                                            onChange={() => handleToggle(faq.id, faq.isActive)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>

                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={(e) => { e.stopPropagation(); openEditModal(faq); }}
                                        title="Edit FAQ"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        className="btn btn-danger btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}
                                        title="Delete FAQ"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <ChevronDown
                                        size={18}
                                        style={{
                                            color: "var(--text-muted)", flexShrink: 0,
                                            transition: "transform var(--transition-fast)",
                                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                        }}
                                    />
                                </div>

                                {isOpen && (
                                    <div style={{
                                        padding: "0 16px 16px 48px",
                                        color: "var(--text-secondary)",
                                        fontSize: 13.5,
                                        lineHeight: 1.6,
                                        whiteSpace: "pre-wrap",
                                    }}>
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 620, width: "95%" }}>
                        <div className="modal-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    padding: 8, backgroundColor: "var(--bg-glass)",
                                    color: "var(--accent-primary)", borderRadius: "var(--radius-md)",
                                }}>
                                    <HelpCircle size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                    {editing ? "Edit FAQ" : "Create New FAQ"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    width: 32, height: 32, borderRadius: "50%",
                                    backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)",
                                    cursor: "pointer",
                                }}
                                className="btn-secondary"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ padding: 28 }}>
                                <div className="form-group">
                                    <label className="form-label">Question <span style={{ color: "red" }}>*</span></label>
                                    <input
                                        type="text"
                                        value={form.question}
                                        onChange={(e) => setForm({ ...form, question: e.target.value })}
                                        placeholder="e.g., How do I book a service?"
                                        maxLength={300}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Answer <span style={{ color: "red" }}>*</span></label>
                                    <textarea
                                        value={form.answer}
                                        onChange={(e) => setForm({ ...form, answer: e.target.value })}
                                        placeholder="Answer shown when the user expands this question."
                                        rows={5}
                                        className="form-textarea"
                                        style={{ minHeight: 120 }}
                                        required
                                    />
                                </div>

                                <div className="form-row" style={{ alignItems: "center" }}>
                                    <div>
                                        <label className="form-label">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            className="form-select"
                                            style={{ width: "100%", height: 40 }}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Display Order</label>
                                        <input
                                            type="number"
                                            value={form.order}
                                            onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                                            min={0}
                                            className="form-input"
                                        />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
                                        <span className="form-label" style={{ margin: 0 }}>Publish Status</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={form.isActive}
                                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                            <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                                                {form.isActive ? "Active" : "Hidden"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: "flex", alignItems: "flex-start", gap: 8, marginTop: 20,
                                    backgroundColor: "rgba(4, 131, 87, 0.05)", padding: 12, borderRadius: 8,
                                }}>
                                    <AlertCircle size={15} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 1 }} />
                                    <span style={{ fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                                        Saving publishes immediately to the mobile app&apos;s Help &amp; Support FAQs and the website&apos;s Contact Us page.
                                    </span>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: "0 20px", height: 40 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ padding: "0 24px", height: 40 }}
                                >
                                    {editing ? "Save Updates" : "Create FAQ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
