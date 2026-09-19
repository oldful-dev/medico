"use client";
import { useState, useEffect, useCallback } from "react";
import { Globe, Users, Save } from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import MedicalTourismEnquiriesTab from "@/components/pages/MedicalTourismEnquiriesTab";

/**
 * Medical Tourism — enquiry tracking (status pipeline, coordinator
 * assignment, internal notes, follow-up dates per Medical Tourism.pdf) plus
 * simple settings for the one consultation-enquiry service backing it.
 *
 * The service itself renders through a dedicated hardcoded screen
 * (mobile/app/medical-tourism/index.tsx), not the generic dynamic-service
 * form builder — so unlike Quick Services/Home Essentials, there's no field
 * builder here. Only what actually affects the screen (name shown in
 * headers, consultation fee, enabled/disabled) is editable.
 */
export default function MedicalTourismPage() {
    const [activeTab, setActiveTab] = useState("enquiries");
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", basePrice: "", isEnabled: true });

    const loadService = useCallback(async () => {
        try {
            setLoading(true);
            const res = await serviceAPI.getAll();
            const found = (res.data?.data || []).find(s => s.category === "MEDICAL_TOURISM");
            setService(found || null);
            if (found) {
                setForm({ name: found.name || "", basePrice: found.basePrice || "", isEnabled: !!found.isEnabled });
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to load Medical Tourism service", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadService(); }, [loadService]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!service) return;
        if (!form.basePrice || parseFloat(form.basePrice) <= 0) {
            showToast("Consultation fee must be greater than ₹0", "error");
            return;
        }
        try {
            setSaving(true);
            await serviceAPI.update(service.id, {
                name: form.name,
                basePrice: parseFloat(form.basePrice),
                isEnabled: form.isEnabled,
            });
            showToast("Medical Tourism settings updated", "success");
            loadService();
        } catch (e) {
            console.error(e);
            showToast("Failed to save settings", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="header-icon-box" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Globe size={24} className="text-info" />
                </div>
                <div>
                    <h2>Medical Tourism</h2>
                    <p>Manage the international patient consultation enquiry service and track incoming enquiries end to end.</p>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, margin: "20px 0", borderBottom: "1px solid var(--border-color)" }}>
                <button className={`btn btn-sm ${activeTab === "enquiries" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("enquiries")}>
                    <Users size={13} style={{ marginRight: 4 }} /> Enquiries
                </button>
                <button className={`btn btn-sm ${activeTab === "settings" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("settings")}>Service Settings</button>
            </div>

            {activeTab === "enquiries" ? (
                <MedicalTourismEnquiriesTab />
            ) : loading ? (
                <p className="text-muted">Loading...</p>
            ) : !service ? (
                <p className="text-muted">Medical Tourism service not found — run the seed script (scripts/seed-medical-tourism.js) first.</p>
            ) : (
                <form className="card" style={{ maxWidth: 480 }} onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Service Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Consultation Fee (₹)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="1"
                            step="1"
                            value={form.basePrice}
                            onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
                            required
                        />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <input
                            type="checkbox"
                            id="mt-enabled"
                            checked={form.isEnabled}
                            onChange={e => setForm(f => ({ ...f, isEnabled: e.target.checked }))}
                        />
                        <label htmlFor="mt-enabled" style={{ fontSize: 13 }}>Service Enabled</label>
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                        <Save size={14} style={{ marginRight: 6 }} /> {saving ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            )}
        </div>
    );
}
