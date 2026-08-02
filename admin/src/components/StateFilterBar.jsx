"use client";

import React from "react";
import { MapPin, Check } from "lucide-react";

const INDIAN_STATES = [
    { code: "ALL", name: "All India" },
    { code: "DL", name: "Delhi NCR" },
    { code: "UP", name: "Uttar Pradesh" },
    { code: "MH", name: "Maharashtra" },
    { code: "KA", name: "Karnataka" },
    { code: "TN", name: "Tamil Nadu" },
    { code: "WB", name: "West Bengal" },
];

export default function StateFilterBar({ currentState, onSelectState, stateMetrics }) {
    return (
        <div className="card mb-4" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} style={{ color: 'var(--accent-primary-light)' }} />
                    <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
                        Quick State Business Filter
                    </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Click any state to load state-specific business details instantly
                </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: stateMetrics ? 14 : 0 }}>
                {INDIAN_STATES.map((state) => {
                    const isSelected = currentState === state.code || (!currentState && state.code === "ALL");
                    return (
                        <button
                            key={state.code}
                            type="button"
                            onClick={() => onSelectState(state.code === "ALL" ? "" : state.code)}
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            {isSelected && <Check size={14} />}
                            {state.name}
                        </button>
                    );
                })}
            </div>

            {stateMetrics && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 12,
                    background: 'var(--bg-secondary)',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)'
                }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>State Revenue</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-primary-light)', marginTop: 2 }}>₹{(stateMetrics.totalRevenue || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Bookings</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981', marginTop: 2 }}>{stateMetrics.activeBookings || 0}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>State Users</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{stateMetrics.totalUsers || 0}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caregivers</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#8B5CF6', marginTop: 2 }}>{stateMetrics.totalCaregivers || 0}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
