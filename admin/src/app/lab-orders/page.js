'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Eye, AlertTriangle, 
    CheckCircle, Truck, FileText, MoreVertical 
} from 'lucide-react';

export default function LabOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock Fetching orders from Prisma via backend API
    useEffect(() => {
        // fetch('/api/admin/labs/orders')...
        setLoading(false);
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'SAMPLE_COLLECTED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'REPORT_GENERATED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lab Orders</h1>
                    <p className="text-gray-500 font-medium">Manage and track Redcliffe Lab integrations</p>
                </div>
                <div className="flex gap-3">
                    <button className="h-12 px-6 bg-white border border-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="h-12 px-6 bg-[var(--color-primary-deep)] text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Patient</th>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Test Name</th>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Date/Slot</th>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tracking</th>
                            <th className="px-6 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={7} className="px-6 py-5 h-16 bg-gray-50/50"></td>
                                </tr>
                            ))
                        ) : (
                            <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                                <td className="px-6 py-5 font-bold text-gray-900">LAB-8FA92B</td>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-gray-800">John Doe</div>
                                    <div className="text-[10px] text-gray-400">9999999999</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-gray-700">Full Body Diamond</div>
                                    <div className="text-[10px] text-emerald-600 font-black uppercase">Fasting Required</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-gray-700">Oct 24, 2026</div>
                                    <div className="text-xs text-gray-400 font-medium">08:00 - 09:00 AM</div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor('SAMPLE_COLLECTED')}`}>
                                        Sample Collected
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <a href="#" className="flex items-center gap-2 text-emerald-600 font-black hover:underline">
                                        <Truck className="w-4 h-4" /> Track Phlebo
                                    </a>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <button className="p-2 text-gray-400 hover:text-gray-900">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
