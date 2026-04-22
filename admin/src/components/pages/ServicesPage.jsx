"use client";
import { useState, useEffect, useCallback } from "react";
import { DollarSign, Edit2, ShieldCheck } from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function ServicesPage({ filterType }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            let res = await serviceAPI.getAll();
            let svc = res.data?.data || [];
            if (filterType) {
                svc = svc.filter(s => s.serviceType === filterType);
            }
            setServices(svc.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => { loadServices(); }, [loadServices]);

    function openEdit(service) {
        setEditingService({ id: service.id, name: service.name, pricingText: service.pricingText || '' });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            await serviceAPI.update(editingService.id, { pricingText: editingService.pricingText });
            showToast('Price updated successfully', 'success');
            setShowModal(false);
            loadServices();
        } catch (e) {
            showToast(e.response?.data?.message || 'Save failed', 'error');
        }
    }

    if (loading) return (
        <div className="loading-state">
            <div className="spinner" />
            <p>Loading pricing data...</p>
        </div>
    );

    return (
        <div className="services-simpl-container">
            <div className="page-header header-minimal">
                <div className="header-icon-box">
                    <DollarSign size={24} className="text-success" />
                </div>
                <div>
                    <h2>Service Pricing Control</h2>
                    <p>Update the public pricing displayed to users in the mobile application</p>
                </div>
            </div>

            <div className="card pricing-card">
                <div className="card-header">
                    <h3>Service Price List</h3>
                    <span className="badge badge-info">{services.length} Total Services</span>
                </div>
                <div className="card-body p-0">
                    <table className="minimal-table">
                        <thead>
                            <tr>
                                <th>Service Name</th>
                                <th>Display Price</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => (
                                <tr key={s.id}>
                                    <td className="font-bold">{s.name}</td>
                                    <td>
                                        <span className="price-tag">{s.pricingText || "No price set"}</span>
                                    </td>
                                    <td className="text-right">
                                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>
                                            <Edit2 size={14} />
                                            <span>Update Price</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && editingService && (
                <div className="modal-overlay active" onClick={() => setShowModal(false)}>
                    <div className="modal pricing-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Update Pricing</h3>
                                <p className="text-sm font-medium text-primary">{editingService.name}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="close-x">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">New Pricing Text</label>
                                    <div className="input-with-icon">
                                        <DollarSign size={18} className="text-muted" />
                                        <input 
                                            className="form-input" 
                                            autoFocus
                                            required 
                                            placeholder="e.g. ₹999 / visit"
                                            value={editingService.pricingText} 
                                            onChange={e => setEditingService({ ...editingService, pricingText: e.target.value })} 
                                        />
                                    </div>
                                    <p className="form-hint">This text will appear directly next to the service on the app.</p>
                                </div>
                            </div>
                            <div className="modal-footer footer-minimal">
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Save New Price</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .services-simpl-container {
                    max-width: 900px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .header-minimal { display: flex; align-items: center; gap: 20px; border-bottom: none; }
                .header-icon-box { 
                    width: 56px; height: 56px; border-radius: 16px; background: rgba(16, 185, 129, 0.1); 
                    display: flex; align-items: center; justify-content: center;
                }

                .pricing-card { border-radius: 24px; border: 1px solid var(--border-color); overflow: hidden; }
                
                .minimal-table { width: 100%; border-collapse: collapse; }
                .minimal-table th { 
                    background: var(--bg-secondary); padding: 16px 24px; text-align: left; 
                    font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);
                }
                .minimal-table td { padding: 18px 24px; border-bottom: 1px solid var(--border-color); }
                .minimal-table tr:last-child td { border-bottom: none; }

                .price-tag { 
                    background: var(--bg-glass); color: var(--accent-primary); 
                    padding: 4px 12px; border-radius: 8px; font-weight: 700; font-size: 13px;
                    border: 1px solid rgba(4, 131, 87, 0.1);
                }

                .btn-ghost { 
                    color: var(--accent-primary); background: transparent; transition: all 0.2s;
                    border: 1px solid transparent; gap: 8px;
                }
                .btn-ghost:hover { background: rgba(4, 131, 87, 0.05); border-color: rgba(4, 131, 87, 0.1); }

                .pricing-modal { max-width: 400px; border-radius: 28px; }
                .input-with-icon { position: relative; }
                .input-with-icon svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); }
                .input-with-icon input { padding-left: 44px; height: 52px; border-radius: 14px; }
                
                .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; }
                .footer-minimal { border-top: none; padding-top: 0; }

                .loading-state { text-align: center; padding: 100px 0; color: var(--text-muted); }
                .spinner { 
                    width: 32px; height: 32px; border: 3px solid var(--border-color); 
                    border-top-color: var(--accent-primary); border-radius: 50%; margin: 0 auto 16px;
                    animation: spin 1s linear infinite; 
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .text-right { text-align: right; }
            `}</style>
        </div>
    );
}
