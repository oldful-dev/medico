'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';

export function BookingDetailsSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header Skeleton */}
            <div className="bg-white px-6 py-6 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                    <ChevronLeft className="w-6 h-6 text-gray-300" />
                </div>
                <div className="space-y-1">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Status Card Skeleton */}
                <div className="h-24 bg-white rounded-3xl border border-gray-100 animate-pulse" />

                {/* Service Details Skeleton */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-gray-200 rounded" />
                            <div className="h-4 w-32 bg-gray-100 rounded" />
                        </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="h-10 bg-gray-50 rounded-xl" />
                        <div className="h-10 bg-gray-50 rounded-xl" />
                        <div className="h-10 bg-gray-50 rounded-xl" />
                    </div>
                </div>

                {/* Additional Details Skeleton */}
                <div className="h-40 bg-white rounded-3xl border border-gray-100 animate-pulse" />

                {/* Bill Breakdown Skeleton */}
                <div className="h-52 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            </div>
        </div>
    );
}
