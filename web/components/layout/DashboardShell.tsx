'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function DashboardShell() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-screen)]">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Top Bar Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2 animate-pulse">
                        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
                        <div className="h-4 w-32 bg-gray-100 rounded-md" />
                    </div>
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                        <div className="px-10 py-5 bg-red-100 rounded-xl" />
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hero Banner Skeleton */}
                        <div className="h-52 bg-white border border-gray-100 rounded-2xl animate-pulse overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent" />
                        </div>

                        {/* Stats Row Skeleton */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm h-32" />
                            ))}
                        </div>

                        {/* Recent Activity / Actions Skeleton */}
                        <div className="h-[400px] bg-white border border-gray-100 rounded-2xl animate-pulse" />
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="flex flex-col gap-6">
                        {/* Profile Card Skeleton */}
                        <div className="h-[240px] bg-[var(--color-primary-deep)]/20 rounded-2xl animate-pulse" />
                        
                        {/* Upcoming Skeleton */}
                        <div className="h-[180px] bg-white border border-gray-100 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
