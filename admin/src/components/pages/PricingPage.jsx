"use client";
import { useState, useEffect } from "react";
import { DollarSign, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { planAPI, serviceAPI } from "@/lib/api";
import { showToast, formatCurrency } from "@/lib/hooks";

export default function PricingPage() {
    const [plans, setPlans] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [pRes, sRes] = await Promise.all([planAPI.getAll(), serviceAPI.getAll()]);
                setPlans(pRes.data?.data || []);
                setServices(sRes.data?.data || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    if (loading) return <div className="page-header"><h2>Loading Pricing Engine...</h2></div>;

    return (
        <div>
            <div className="page-header"><h2>Pricing Engine</h2><p>Overview of all plans and service pricing</p></div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {plans.map(p => (
                    <div key={p.id} className="card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))" }}>
                        <div className="card-header"><h3>{p.name}</h3><span className={`badge ${p.isVisible ? 'badge-success' : 'badge-default'}`}>{p.isVisible ? 'Active' : 'Hidden'}</span></div>
                        <div className="card-body">
                            <p className="text-sm text-muted mb-4">{p.description || 'No description'}</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, textAlign: "center" }}>
                                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                    <div className="text-sm text-muted">Quarterly</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-primary-light)" }}>{formatCurrency(p.quarterlyPrice)}</div>
                                    <div className="text-sm text-muted">/3 months</div>
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                    <div className="text-sm text-muted">Biannual</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-success)" }}>{formatCurrency(p.biannualPrice)}</div>
                                    <div className="text-sm text-muted">/6 months</div>
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 8px", borderRadius: 10 }}>
                                    <div className="text-sm text-muted">Yearly</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-warning)" }}>{formatCurrency(p.yearlyPrice)}</div>
                                    <div className="text-sm text-muted">/year</div>
                                </div>
                            </div>
                            {p.benefits && <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.benefits}</div>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="card mt-6">
                <div className="card-header"><h3>Service Pricing Reference</h3></div>
                <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
                    <table className="data-table">
                        <thead><tr><th>Service</th><th>Type</th><th>Pricing Text</th><th>Status</th></tr></thead>
                        <tbody>
                            {services.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.icon} {s.name}</td>
                                    <td className="text-sm">{s.serviceType?.replace(/_/g, ' ')}</td>
                                    <td><span className="badge badge-success">{s.pricingText || '—'}</span></td>
                                    <td><span className={`badge ${s.isEnabled ? 'badge-success' : 'badge-default'}`}>{s.isEnabled ? 'Active' : 'Disabled'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
