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
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Quick State Business Filter
                    </h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                    Click any state to load state-specific business details instantly
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {INDIAN_STATES.map((state) => {
                    const isSelected = currentState === state.code || (!currentState && state.code === "ALL");
                    return (
                        <button
                            key={state.code}
                            onClick={() => onSelectState(state.code === "ALL" ? "" : state.code)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {state.name}
                        </button>
                    );
                })}
            </div>

            {stateMetrics && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">State Revenue</p>
                        <p className="text-base font-extrabold text-indigo-900">₹{stateMetrics.totalRevenue?.toLocaleString('en-IN') || 0}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Active Bookings</p>
                        <p className="text-base font-extrabold text-emerald-700">{stateMetrics.activeBookings || 0}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">State Users</p>
                        <p className="text-base font-extrabold text-blue-900">{stateMetrics.totalUsers || 0}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Caregivers</p>
                        <p className="text-base font-extrabold text-purple-900">{stateMetrics.totalCaregivers || 0}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
