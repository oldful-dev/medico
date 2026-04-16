"use client";
import React, { useState, useEffect } from 'react';
import { 
    Shield, HeartPulse, User, Plus, Trash2, Save, RotateCcw, 
    LayoutGrid, ChevronRight, Settings, Info
} from "lucide-react";
import { profilesAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function MetadataSettings() {
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('specializations');

    useEffect(() => {
        loadMetadata();
    }, []);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newValue, setNewValue] = useState("");

    const loadMetadata = async () => {
        try {
            setLoading(true);
            const res = await profilesAPI.getMetadata();
            const data = res.data; // Response helper returns data directly
            setMetadata({
                specializations: data.specializations || [],
                adminRoles: data.adminRoles || [],
                staffRoles: data.staffRoles || ['doctor', 'nurse', 'caregiver', 'management']
            });
        } catch (error) {
            showToast("Failed to load metadata", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (explicitData) => {
        // Fallback to current state if no explicit data provided (or if called via onClick event)
        const payload = (explicitData && !explicitData.nativeEvent) ? explicitData : metadata;
        
        try {
            setSaving(true);
            await profilesAPI.updateMetadata(payload);
            showToast("System metadata updated successfully", "success");
            setShowAddModal(false);
            setNewValue("");
        } catch (error) {
            console.error("Save error:", error);
            showToast("Failed to save changes", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newValue || !newValue.trim()) {
            return showToast("Please enter a valid name", "warning");
        }
        
        const trimmed = newValue.trim();
        if (metadata[activeSection].includes(trimmed)) {
            return showToast("This entry already exists", "warning");
        }

        const newMetadata = {
            ...metadata,
            [activeSection]: [...metadata[activeSection], trimmed]
        };
        
        setMetadata(newMetadata);
        await handleSave(newMetadata); // Auto-save to backend
        setShowAddModal(false);
        setNewValue("");
    };

    const removeItem = async (section, item) => {
        if (!confirm(`Are you sure you want to remove "${item}"? Existing staff using this entry will not be affected, but it won't appear in new forms.`)) return;
        
        const newMetadata = {
            ...metadata,
            [section]: metadata[section].filter(i => i !== item)
        };
        setMetadata(newMetadata);
        await handleSave(newMetadata); // Auto-save to backend
    };

    if (loading) return <div className="loading-state">Initializing Staff Metadata Config...</div>;

    return (
        <div className="metadata-settings">
            <header className="page-header">
                <div className="title-group">
                    <h1>Staff Configuration</h1>
                    <p>Manage the dynamic roles and specializations available across the platform.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={loadMetadata}><RotateCcw size={18} /> Revert</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </header>

            <div className="settings-layout">
                {/* SIDEBAR */}
                <aside className="settings-sidebar">
                    <nav>
                        <button className={activeSection === 'specializations' ? 'active' : ''} onClick={() => setActiveSection('specializations')}>
                            <HeartPulse size={18} /> <span>Medical Specializations</span>
                        </button>
                        <button className={activeSection === 'adminRoles' ? 'active' : ''} onClick={() => setActiveSection('adminRoles')}>
                            <Shield size={18} /> <span>Management Roles</span>
                        </button>
                        <div className="sidebar-divider"></div>
                        <div className="sidebar-info">
                            <Info size={14} />
                            <p>These options populate dropdowns in the Staff Creation & Profile Editor forms.</p>
                        </div>
                    </nav>
                </aside>

                {/* CONTENT */}
                <main className="settings-content">
                    <div className="content-card">
                        <div className="card-header">
                            <h2>{activeSection === 'specializations' ? 'Medical Specializations' : 'Management Roles'}</h2>
                            <button className="btn-add" onClick={() => setShowAddModal(true)}>
                                <Plus size={16} /> Add New
                            </button>
                        </div>
                        
                        <div className="items-grid">
                            {metadata[activeSection].length === 0 ? (
                                <div className="empty-state">No entries configured. Fallback system will be used.</div>
                            ) : (
                                metadata[activeSection].map(item => (
                                    <div key={item} className="config-item">
                                        <div className="item-label">{item}</div>
                                        <button className="delete-btn" onClick={() => removeItem(activeSection, item)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="warning-box">
                        <AlertCircle size={18} />
                        <div>
                            <strong>Enterprise Warning:</strong> Deleting a specialization here removes it from the &quot;Select&quot; dropdowns. 
                            It does <strong>not</strong> delete records already assigned to it.
                        </div>
                    </div>
                </main>
            </div>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New {activeSection === 'adminRoles' ? 'Admin Role' : 'Specialization'}</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddItem} className="modal-body">
                            <div className="form-group">
                                <label>Entry Name</label>
                                <input 
                                    autoFocus
                                    placeholder={activeSection === 'adminRoles' ? "e.g. OPERATIONS_MANAGER" : "e.g. Cardiologist"}
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    required
                                />
                                <p className="input-hint">Use a descriptive name that will appear in selection forms.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Add Element</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
                .modal-content { background: var(--bg-card); border: 1px solid var(--border-color); width: 100%; max-width: 450px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xl); animation: slideUp 0.3s ease-out; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .modal-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
                .modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary); }
                .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
                .close-btn:hover { color: var(--accent-primary); transform: rotate(90deg); }

                .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .form-group label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
                .form-group input { width: 100%; padding: 12px 14px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none; transition: var(--transition-fast); font-size: 14px; }
                .form-group input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--bg-glass-hover); }
                .input-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

                .modal-footer { display: flex; gap: 12px; padding: 0 24px 24px; }
                .modal-footer button { flex: 1; }
                .metadata-settings { color: var(--text-primary); font-family: var(--font-primary); }
                
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
                .title-group h1 { font-size: 32px; font-weight: 800; margin: 0; color: var(--text-primary); }
                .title-group p { color: var(--text-muted); margin: 4px 0 0; font-size: 14px; }
                .header-actions { display: flex; gap: 12px; }

                .btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; border: none; cursor: pointer; transition: var(--transition-base); }
                .btn-primary { background: var(--gradient-primary); color: white; box-shadow: var(--shadow-md); }
                .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-lg); opacity: 0.9; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); }
                .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--accent-primary); }

                .settings-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; }
                
                .settings-sidebar nav { display: flex; flex-direction: column; gap: 8px; }
                .settings-sidebar button { 
                    display: flex; align-items: center; gap: 12px; padding: 14px 18px; 
                    background: transparent; border: 1px solid transparent; border-radius: var(--radius-md); 
                    color: var(--text-muted); cursor: pointer; transition: var(--transition-fast); text-align: left;
                    font-weight: 500;
                }
                .settings-sidebar button:hover { background: var(--bg-glass-hover); color: var(--text-primary); }
                .settings-sidebar button.active { background: var(--bg-glass); border-color: var(--accent-primary); color: var(--accent-primary); font-weight: 700; }
                
                .sidebar-divider { height: 1px; background: var(--border-color); margin: 16px 0; }
                .sidebar-info { display: flex; gap: 10px; padding: 12px; background: var(--bg-glass); border-radius: var(--radius-md); color: var(--accent-info); font-size: 11px; line-height: 1.5; border: 1px solid var(--border-color); }

                .content-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .card-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); }
                .btn-add { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--accent-primary); color: white; border: none; border-radius: var(--radius-md); font-weight: 600; font-size: 13px; cursor: pointer; transition: var(--transition-fast); }
                .btn-add:hover { background: var(--accent-primary-dark); transform: scale(1.05); }
                
                .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
                .config-item { 
                    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); 
                    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; 
                    transition: var(--transition-fast);
                }
                .config-item:hover { border-color: var(--accent-primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
                .item-label { font-weight: 600; font-size: 14px; color: var(--text-secondary); }
                .delete-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: rgba(239, 68, 68, 0.1); color: var(--accent-danger); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: var(--transition-fast); }
                .config-item:hover .delete-btn { opacity: 1; }
                .delete-btn:hover { background: var(--accent-danger); color: white; }

                .warning-box { margin-top: 24px; padding: 16px; background: var(--bg-glass); border: 1px solid var(--accent-warning); border-radius: var(--radius-md); display: flex; gap: 14px; align-items: center; color: var(--accent-warning); font-size: 13px; line-height: 1.4; }
                .loading-state { padding: 100px; text-align: center; color: var(--text-muted); font-weight: 600; font-family: var(--font-primary); }
                .empty-state { grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-secondary); border-radius: var(--radius-md); }
            `}</style>

        </div>
    );
}

function AlertCircle({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
    );
}
