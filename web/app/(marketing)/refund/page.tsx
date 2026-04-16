import React from 'react';
import { Metadata } from 'next';
import { Heart, Activity, AlertCircle, ShieldCheck, Clock, Receipt, CreditCard } from 'lucide-react';

export const metadata: Metadata = {
  title: "Refund Policy | Oldful",
  description: "Official Refund and Cancellation Policy for Oldful Elder Care Subscription Plans and Services.",
};

export default function RefundPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Refund Policy</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Last Updated: 01/01/2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <p className="text-gray-600 leading-relaxed text-lg">
            At Oldful, we strive to provide the highest quality of care for your loved ones. However, we understand that 
            circumstances change. This policy outlines how cancellations, refunds, and adjustments are handled for our 
            subscription plans and one-time services.
          </p>
        </section>

        {/* --- SUBSCRIPTION CANCELLATIONS --- */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
             <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900">Subscription Cancellations</h2>
          </div>
          
          <p className="text-gray-600 leading-relaxed font-medium">
            You may cancel your Oldful Care Subscription at any time. Refunds are processed based on when the cancellation 
            request is received.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
             <div className="p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-5 group hover:border-emerald-100 transition-colors">
                <div className="flex items-center gap-3 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                   <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">1</div>
                   Cooling-Off Period (First 7 Days)
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  If you cancel within the first 3 days of your first-ever subscription month, and no major service (like a doctor visit or heavy caregiving) has been consumed, we offer a <span className="text-gray-900 font-extrabold underline decoration-emerald-200 decoration-2 underline-offset-4">100% Refund</span> (minus a nominal registration/setup fee of ₹999).
                </p>
             </div>
             <div className="p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-5 group hover:border-amber-100 transition-colors">
                <div className="flex items-center gap-3 text-amber-600 font-bold text-xs uppercase tracking-widest">
                   <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">2</div>
                   Mid-Cycle Cancellation
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  <p className="mb-4">If you cancel after the cooling-off period, refunds are calculated on a <span className="text-gray-900 font-bold">Pro-Rata Basis</span>.</p>
                  <div className="p-4 bg-gray-50 rounded-2xl font-mono text-[11px] border border-gray-100 text-gray-600">
                    Formula: (Total Fee Paid) – (Days of Service Used × Daily Rate) – (Cancellation Fee of ₹999 or 10% of balance) = Refund Amount.
                  </div>
                  <p className="mt-4 text-[10px] italic text-gray-400">Note: The &quot;Daily Rate&quot; is calculated based on the standard non-discounted monthly price.</p>
                </div>
             </div>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
             <Clock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
             <div>
                <h3 className="font-bold text-blue-900 text-sm mb-1 uppercase tracking-wider">Notice Period</h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  We require a 3-day notice for cancellation to allow us to demobilize our caregivers and update our rosters. The subscription remains active and billable during this notice period.
                </p>
             </div>
          </div>
        </section>

        {/* --- ONE-TIME SERVICES --- */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
             <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900">One-Time / Third-Party Services</h2>
          </div>
          
          <p className="text-gray-600 leading-relaxed text-sm font-medium">
            For ad-hoc services booked through Oldful (e.g., Physiotherapy, Lab Tests, Deep Cleaning):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center group hover:bg-emerald-50/30 transition-colors">
                <div className="font-bold text-gray-900 mb-2 text-sm">&gt; 24 Hours Notice</div>
                <div className="text-emerald-600 font-black text-lg uppercase tracking-tight">100% Refund</div>
             </div>
             <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center group hover:bg-amber-50/30 transition-colors">
                <div className="font-bold text-gray-900 mb-2 text-sm">&lt; 24 Hours Notice</div>
                <div className="text-amber-600 font-black text-lg uppercase tracking-tight">50% Refund</div>
             </div>
             <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center group hover:bg-red-50/30 transition-colors">
                <div className="font-bold text-gray-900 mb-2 text-sm">No-Show / Doorstep</div>
                <div className="text-red-500 font-black text-lg uppercase tracking-tight">No Refund</div>
             </div>
          </div>
        </section>

        {/* --- SERVICE FAILURE --- */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
             <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900">Refunds Due to Service Failure (SLA Breach)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-8 bg-gray-50/50 rounded-2xl border border-gray-200 border-dashed">
                <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-400 rounded-full" /> Missed Visits
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  If a caregiver fails to show up and no backup is provided within the SLA timeframe, you are entitled to a <span className="text-gray-900 font-bold underline decoration-red-200">100% refund for that specific visit</span> plus a service credit.
                </p>
             </div>
             <div className="p-8 bg-gray-50/50 rounded-2xl border border-gray-200 border-dashed">
                <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-400 rounded-full" /> Quality Issues
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  If a verified complaint regarding service quality is substantiated, we may offer a partial refund or free re-service at our discretion.
                </p>
             </div>
          </div>
        </section>

        {/* --- COMPASSIONATE CLAUSE --- */}
        <section className="bg-emerald-900 p-10 md:p-14 rounded-[3rem] text-white overflow-hidden relative shadow-2xl shadow-emerald-900/40">
          <div className="relative z-10">
             <h3 className="font-bold text-3xl mb-8 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-400 fill-current" /> The &quot;Compassionate Clause&quot;
             </h3>
             <p className="text-base text-emerald-50/70 mb-10 max-w-2xl leading-relaxed">
               We understand that elder care involves sensitive life transitions. These specific rules override our general policy in exceptional circumstances.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="flex flex-col gap-4">
                  <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">In the event of the Customer&apos;s demise:</h4>
                  <p className="text-sm text-emerald-50/90 leading-relaxed">
                    The subscription will be cancelled immediately upon notification. <span className="text-white font-bold underline decoration-emerald-400/50 decoration-2 underline-offset-4">100% of the unused balance</span> will be refunded to the registered family member/nominee. No cancellation fees or notice period charges will apply.
                  </p>
               </div>
               <div className="flex flex-col gap-4">
                  <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Long-term Hospitalization:</h4>
                  <p className="text-sm text-emerald-50/90 leading-relaxed">
                    If the elder is hospitalized for more than 15 days, you may pause the subscription. Unused days will be credited to your account for when they return home.
                  </p>
               </div>
             </div>
          </div>
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-emerald-400/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-red-400/5 rounded-full blur-[100px]" />
        </section>

        {/* --- NON-REFUNDABLE & PROCESSING --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
           <section className="md:col-span-2 flex flex-col gap-6 p-8 bg-gray-50 rounded-3xl border border-gray-100">
             <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-gray-400" /> Non-Refundable Items
             </h2>
             <ul className="text-xs text-gray-500 list-none space-y-4">
                <li className="flex gap-3"><div className="w-1 h-1 bg-gray-300 rounded-full mt-1.5 shrink-0" /> One-time Registration/Onboarding Fees.</li>
                <li className="flex gap-3"><div className="w-1 h-1 bg-gray-300 rounded-full mt-1.5 shrink-0" /> Consumables purchased (e.g., adult diapers, medicines, medical supplies) that have been opened or used.</li>
                <li className="flex gap-3"><div className="w-1 h-1 bg-gray-300 rounded-full mt-1.5 shrink-0" /> Taxes (GST) collected and deposited to the government (unless the invoice is cancelled within same month).</li>
             </ul>
           </section>

           <section className="md:col-span-3 flex flex-col gap-8 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
             <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="w-5 h-5 text-blue-500" /> Processing of Refunds
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Timeline</h4>
                   <p className="text-sm text-gray-600 font-medium font-[var(--font-poppins)]">Refunds are typically processed within 5-7 business days after approval.</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Method</h4>
                   <p className="text-sm text-gray-600 font-medium font-[var(--font-poppins)]">Credited back to the original source (Bank/UPI/Card). No cash refunds.</p>
                </div>
             </div>
           </section>
        </div>

        {/* --- HOW TO REQUEST --- */}
        <section className="bg-white rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-gray-200/50 p-10 mt-6 overflow-hidden relative group">
           <div className="relative z-10 flex flex-col gap-8">
              <div className="space-y-2">
                 <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">How to Request a Cancellation</h2>
                 <p className="text-gray-500 font-medium">Please contact our Billing Desk or your Care Manager immediately.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-6 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-5 hover:bg-white hover:border-emerald-100 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                       <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Send Email</div>
                       <a href="mailto:client@oldful.com" className="text-sm font-bold text-gray-900 hover:text-emerald-500 transition-colors">client@oldful.com</a>
                       <div className="text-[10px] text-gray-400 font-medium mt-0.5">Subject: Cancellation Request – (Customer ID)</div>
                    </div>
                 </div>
                 <div className="p-6 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-5 hover:bg-white hover:border-emerald-100 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                       <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Call Support</div>
                       <a href="tel:+919480198108" className="text-sm font-bold text-gray-900 hover:text-emerald-500 transition-colors">+91-94801-98108</a>
                       <div className="text-[10px] text-gray-400 font-medium mt-0.5">Available during business hours</div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
        </section>

      </div>
    </div>
  );
}
