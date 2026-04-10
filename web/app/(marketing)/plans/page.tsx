import React from 'react';

// This page is now wrapped by (marketing)/layout.tsx which includes the Navbar.
export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF6] font-[var(--font-poppins)] pb-24">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Flexible plans for every family</h1>
          <p className="text-lg text-gray-500 font-medium tracking-wide">Choose the care subscription that fits your parents' needs perfectly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Basic Plan */}
           <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col hover:shadow-xl transition-shadow relative">
             <h3 className="text-xl font-bold text-gray-800 mb-2">Basic Care</h3>
             <p className="text-gray-500 text-sm h-10">Essential medical monitoring and emergency support.</p>
             <div className="my-6">
                <span className="text-4xl font-extrabold text-[#111]">₹999</span>
                <span className="text-gray-400 font-semibold text-sm"> / month</span>
             </div>
             <button className="w-full bg-[#f6f6f6] hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors mb-8">
                Start Basic Plan
             </button>
             <ul className="space-y-4 text-sm font-medium text-gray-600 flex-1">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  Monthly checkup call
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  24/7 SOS Support
                </li>
             </ul>
           </div>

           {/* Pro Plan - Primary Color */}
           <div className="bg-[var(--color-primary)] rounded-[24px] p-8 shadow-[0_10px_30px_rgba(4,131,87,0.2)] border-0 flex flex-col hover:-translate-y-2 transition-transform relative top-[-10px]">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--color-accent-bright)] text-[#034C2A] text-[10px] font-bold py-1 px-3 rounded-b-lg tracking-wider uppercase">Most Popular</div>
             
             <h3 className="text-xl font-bold text-white mb-2">Pro Wellness</h3>
             <p className="text-emerald-100 text-sm h-10">Comprehensive home care and regular physical visits.</p>
             <div className="my-6">
                <span className="text-4xl font-extrabold text-white">₹2,499</span>
                <span className="text-emerald-200 font-semibold text-sm"> / month</span>
             </div>
             <button className="w-full bg-[#0EDD94] hover:bg-[#34C759] text-[#034C2A] font-bold py-3.5 rounded-xl transition-colors mb-8 shadow-lg">
                Get Pro Plan
             </button>
             <ul className="space-y-4 text-sm font-medium text-emerald-50 flex-1">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-[#0EDD94] rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[#034C2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  1 Doctor Home Visit / month
                </li>
                <li className="flex items-start gap-3">
                   <span className="w-5 h-5 bg-[#0EDD94] rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[#034C2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  Unlimited Tele-consultations
                </li>
                <li className="flex items-start gap-3">
                   <span className="w-5 h-5 bg-[#0EDD94] rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[#034C2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  15% off on Medicines
                </li>
             </ul>
           </div>

           {/* Enterprise / Max */}
           <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col hover:shadow-xl transition-shadow relative">
             <h3 className="text-xl font-bold text-gray-800 mb-2">Max Care</h3>
             <p className="text-gray-500 text-sm h-10">Dedicated nurse visits and 24/7 dedicated attendant tracking.</p>
             <div className="my-6">
                <span className="text-4xl font-extrabold text-[#111]">₹5,999</span>
                <span className="text-gray-400 font-semibold text-sm"> / month</span>
             </div>
             <button className="w-full bg-[#f6f6f6] hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors mb-8">
                Start Max Plan
             </button>
             <ul className="space-y-4 text-sm font-medium text-gray-600 flex-1">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  All Pro Features included
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>
                  4 Nurse Home Visits / month
                </li>
             </ul>
           </div>
        </div>

      </main>
    </div>
  );
}
