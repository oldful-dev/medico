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

    const loadMetadata = async () => {
        try {
            setLoading(true);
            const res = await profilesAPI.getMetadata();
            // Ensure structure
            const data = res.data.data;
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

    const handleSave = async () => {
        try {
            setSaving(true);
            await profilesAPI.updateMetadata(metadata);
            showToast("System metadata updated successfully", "success");
        } catch (error) {
            showToast("Failed to save changes", "error");
        } finally {
            setSaving(false);
        }
    };

    const addItem = (section) => {
        const value = prompt(`Add new entry to ${section === 'adminRoles' ? 'Admin Roles' : 'Specializations'}:`);
        if (!value || !value.trim()) return;
        
        const trimmed = value.trim();
        if (metadata[section].includes(trimmed)) return showToast("Entry already exists", "warning");

        setMetadata({
            ...metadata,
            [section]: [...metadata[section], trimmed]
        });
    };

    const removeItem = (section, item) => {
        if (!confirm(`Are you sure you want to remove "${item}"? Existing staff using this entry will not be affected, but it won't appear in new forms.`)) return;
        
        setMetadata({
            ...metadata,
            [section]: metadata[section].filter(i => i !== item)
        });
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
                            <button className="btn-add" onClick={() => addItem(activeSection)}>
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
                            <strong>Enterprise Warning:</strong> Deleting a specialization here removes it from the "Select" dropdowns. 
                            It does <strong>not</strong> delete records already assigned to it.
                        </div>
                    </div>
                </main>
            </div>

            <style jsx>{`
                .metadata-settings { padding: 40px; background: #0B1120; min-height: 100vh; color: #FFFFFF; font-family: 'Poppins', sans-serif; }
                
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
                .title-group h1 { font-size: 32px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .title-group p { color: #64748B; margin: 4px 0 0; font-size: 14px; }
                .header-actions { display: flex; gap: 12px; }

                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-primary { background: #10B981; color: white; }
                .btn-primary:hover:not(:disabled) { background: #059669; transform: translateY(-2px); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { background: #1E293B; border: 1px solid #334155; color: white; }
                .btn-secondary:hover { background: #334155; }

                .settings-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; }
                
                .settings-sidebar nav { display: flex; flex-direction: column; gap: 8px; }
                .settings-sidebar button { 
                    display: flex; align-items: center; gap: 12px; padding: 14px 18px; 
                    background: transparent; border: 1px solid transparent; border-radius: 12px; 
                    color: #94A3B8; cursor: pointer; transition: 0.2s; text-align: left;
                }
                .settings-sidebar button:hover { background: rgba(255,255,255,0.05); color: white; }
                .settings-sidebar button.active { background: #1E293B; border-color: #334155; color: #10B981; font-weight: 700; }
                
                .sidebar-divider { height: 1px; background: #334155; margin: 16px 0; }
                .sidebar-info { display: flex; gap: 10px; padding: 10px; background: rgba(59, 130, 246, 0.05); border-radius: 8px; color: #60A5FA; font-size: 11px; line-height: 1.5; }

                .content-card { background: #1E293B; border: 1px solid #334155; border-radius: 20px; padding: 24px; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .card-header h2 { margin: 0; font-size: 20px; font-weight: 800; color: white; }
                .btn-add { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
                
                .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
                .config-item { 
                    background: #0F172A; border: 1px solid #334155; border-radius: 10px; 
                    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; 
                    transition: 0.2s;
                }
                .config-item:hover { border-color: #10B981; }
                .item-label { font-weight: 600; font-size: 14px; color: #E2E8F0; }
                .delete-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: rgba(239, 68, 68, 0.1); color: #EF4444; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: 0.2s; }
                .config-item:hover .delete-btn { opacity: 1; }
                .delete-btn:hover { background: #EF4444; color: white; }

                .warning-box { margin-top: 24px; padding: 16px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; display: flex; gap: 14px; align-items: center; color: #F59E0B; font-size: 13px; line-height: 1.4; }
                .loading-state { padding: 100px; text-align: center; color: #64748B; font-weight: 600; }
                .empty-state { grid-column: 1 / -1; padding: 40px; text-align: center; color: #64748B; background: #0F172A; border-radius: 12px; }
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
