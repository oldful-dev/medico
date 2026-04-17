import React from 'react';
import LabTestBooking from '@/components/services/LabTestBooking';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Home Blood Test | Medico',
    description: 'Book lab tests and checkups at your doorstep with Medico and Redcliffe Labs.',
};

export default function LabTestsPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 pt-20">
            <LabTestBooking />
        </div>
    );
}
