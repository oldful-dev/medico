'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Search, Filter, Eye, AlertTriangle, 
    CheckCircle, Truck, FileText, MoreVertical,
    Download, ExternalLink, RefreshCw
} from 'lucide-react';
import { labAPI } from '@/lib/api';
import { debounce } from 'lodash';

export default function LabOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchOrders = async (currentSearch, currentStatus, currentPage) => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.limit,
                search: currentSearch || undefined,
                status: currentStatus || undefined
            };
            const res = await labAPI.getOrders(params);
            if (res.data.success) {
                setOrders(res.data.data);
                setPagination(prev => ({ ...prev, total: res.data.total }));
            }
        } catch (error) {
            console.error('Failed to fetch lab orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((q) => fetchOrders(q, statusFilter, 1), 500),
        [statusFilter]
    );

    useEffect(() => {
        fetchOrders(search, statusFilter, pagination.page);
    }, [statusFilter, pagination.page]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'SAMPLE_COLLECTED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'REPORT_GENERATED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            case 'PROCESSING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'HOLD_CREATED': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleDownloadReport = async (id) => {
        try {
            const res = await labAPI.downloadReport(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Report not available yet or download failed.');
        }
    };

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lab Orders</h1>
                    <p className="text-gray-500 font-medium">Manage and track Redcliffe Lab integrations</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search orders..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-12 px-4 bg-white border border-gray-200 rounded-xl font-bold outline-none hover:bg-gray-50 transition-all"
                    >
                        <option value="">All Statuses</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="SAMPLE_COLLECTED">Collected</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="REPORT_GENERATED">Report Out</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Reference</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Patient</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Tests</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Slot</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5 h-20 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                            <FileText className="w-12 h-12" />
                                            <p className="font-black text-xl">No Lab Orders Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5 shrink-0">
                                            <div className="font-bold text-gray-900">{order.clientRefId}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">#{order.redcliffeBookingId || 'Pending'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-800">{order.patient?.name || order.user?.name}</div>
                                            <div className="text-[10px] text-gray-400">{order.patient?.phone || order.user?.phone}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">
                                                {order.packages?.map((pkg, idx) => (
                                                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        {pkg.name || pkg.code}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-700 truncate max-w-[120px]">{order.slot?.date || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{order.slot?.time || 'No Slot'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {order.trackingLink && (
                                                    <a 
                                                        href={order.trackingLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Track Phlebo"
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {order.status === 'REPORT_GENERATED' && (
                                                    <button 
                                                        onClick={() => handleDownloadReport(order.redcliffeBookingId || order.clientRefId)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Download Report"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && orders.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Showing {orders.length} of {pagination.total} orders
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
                                className="h-10 px-4 border border-gray-200 rounded-lg font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <button 
                                disabled={orders.length < pagination.limit}
                                onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
                                className="h-10 px-4 border border-gray-200 rounded-lg font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
