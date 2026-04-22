import React from 'react';
import { Metadata } from 'next';
import { Heart, Activity, AlertCircle, ShieldCheck, Clock, Receipt, CreditCard } from 'lucide-react';

export const metadata: Metadata = {
  title: "Refund Policy | Oldful",
  description: "Official Refund and Cancellation Policy for Oldful Elder Care Subscription Plans and Services.",
};

const API_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://oldful.onrender.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/REFUND_POLICY`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function RefundPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">

        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Refund Policy'}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
            {doc?.publishedAt
              ? `Last Updated: ${new Date(doc.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
              : 'Last Updated: 01/01/2026'}
          </p>
        </header>

        {doc?.content ? (
          <div
            className="legal-content prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <p className="text-gray-600 leading-relaxed text-lg">
                At Oldful, we strive to provide the highest quality of care for your loved ones. This policy outlines how cancellations, refunds, and adjustments are handled for our subscription plans and one-time services.
              </p>
            </section>

            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Subscription Cancellations</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center gap-3 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">1</div>
                    Cooling-Off Period (First 3 Days)
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Cancel within the first 3 days of your first-ever subscription month with no major service consumed — <span className="text-gray-900 font-extrabold underline decoration-emerald-200 decoration-2 underline-offset-4">100% Refund</span> minus a ₹999 setup fee.
                  </p>
                </div>
                <div className="p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center gap-3 text-amber-600 font-bold text-xs uppercase tracking-widest">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">2</div>
                    Mid-Cycle Cancellation
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Refunds calculated on a <span className="text-gray-900 font-bold">Pro-Rata Basis</span> after the cooling-off period, subject to a ₹999 or 10% cancellation fee.
                  </p>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">One-Time / Third-Party Services</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                  <div className="font-bold text-gray-900 mb-2 text-sm">&gt; 24 Hours Notice</div>
                  <div className="text-emerald-600 font-black text-lg uppercase tracking-tight">100% Refund</div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                  <div className="font-bold text-gray-900 mb-2 text-sm">&lt; 24 Hours Notice</div>
                  <div className="text-amber-600 font-black text-lg uppercase tracking-tight">50% Refund</div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                  <div className="font-bold text-gray-900 mb-2 text-sm">No-Show / Doorstep</div>
                  <div className="text-red-500 font-black text-lg uppercase tracking-tight">No Refund</div>
                </div>
              </div>
            </section>

            <section className="bg-emerald-900 p-10 md:p-14 rounded-[3rem] text-white overflow-hidden relative shadow-2xl shadow-emerald-900/40">
              <div className="relative z-10">
                <h3 className="font-bold text-3xl mb-8 flex items-center gap-3">
                  <Heart className="w-8 h-8 text-red-400 fill-current" /> The &quot;Compassionate Clause&quot;
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">In the event of the Customer&apos;s demise:</h4>
                    <p className="text-sm text-emerald-50/90 leading-relaxed">
                      The subscription will be cancelled immediately. <span className="text-white font-bold underline decoration-emerald-400/50 decoration-2 underline-offset-4">100% of the unused balance</span> will be refunded with no cancellation fees.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Long-term Hospitalization:</h4>
                    <p className="text-sm text-emerald-50/90 leading-relaxed">
                      If the elder is hospitalized for more than 15 days, you may pause the subscription. Unused days will be credited to your account.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-80 h-80 bg-emerald-400/10 rounded-full blur-[100px]" />
            </section>

            <section className="bg-white rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-gray-200/50 p-10 overflow-hidden relative">
              <div className="relative z-10 flex flex-col gap-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">How to Request a Cancellation</h2>
                  <p className="text-gray-500 font-medium">Please contact our Billing Desk or your Care Manager immediately.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Send Email</div>
                      <a href="mailto:client@oldful.com" className="text-sm font-bold text-gray-900 hover:text-emerald-500 transition-colors">client@oldful.com</a>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">Subject: Cancellation Request – (Customer ID)</div>
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-5">
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
            </section>
          </>
        )}

      </div>

      <style>{`
        .legal-content h1 { font-size: 2rem; font-weight: 800; color: #111827; margin: 2rem 0 0.5rem; }
        .legal-content h2 { font-size: 1.5rem; font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin: 2rem 0 1rem; }
        .legal-content h3 { font-size: 1.125rem; font-weight: 700; color: #1f2937; margin: 1.5rem 0 0.75rem; }
        .legal-content p { color: #4b5563; line-height: 1.75; margin-bottom: 1rem; }
        .legal-content ul, .legal-content ol { padding-left: 1.5rem; color: #4b5563; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .legal-content ul { list-style-type: disc; }
        .legal-content ol { list-style-type: decimal; }
        .legal-content strong { color: #111827; }
        .legal-content a { color: #059669; text-decoration: underline; }
      `}</style>
    </div>
  );
}
