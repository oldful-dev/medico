import React from 'react';
import { Metadata } from 'next';
import { CheckCircle2, XCircle, Info, Clock, UserCheck, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: "Service Policy | Oldful",
  description: "Operational manual and service scope for Oldful care associates and managers.",
};

export default function ServicePolicyPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        
        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Service Scope & Operational Policy</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Effective Date: 01/01/2026
          </p>
        </header>

        {/* 1. Purpose */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm leading-relaxed text-gray-600">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-500" /> Purpose
          </h2>
          <p>
            To clearly define the duties, limitations, and operational protocols for Oldful Care Associates (Caregivers) and Care Managers to ensure professional, safe, and dignified care.
          </p>
        </section>

        {/* 2. Scope of Services */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Scope of Services (What We Do)
          </h2>
          <p className="text-gray-600 text-sm">Our Care Associates are trained to assist with the following:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">A. Personal Care (ADLs)</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Hygiene:</strong> Bathing, sponging, grooming (hair/nails), and oral care.
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Toileting:</strong> Diaper changing, bedpan assistance, and catheter bag emptying (not insertion).
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Mobility:</strong> Assisting with walking, transfers (bed to wheelchair), and fall prevention.
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">B. Health Support</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Vitals Monitoring:</strong> Checking BP, Sugar (Glucometer), Pulse, and Temperature.
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Medication:</strong> Reminding and administering oral medicines as per the prescription.
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  <strong>Exercise:</strong> Assisting with basic physiotherapy exercises prescribed by a doctor.
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">C. Nutritional Support</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Assisting with feeding (oral/tube feeding if qualified).
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Light meal preparation strictly for the patient (e.g., tea, oats, soup, khichdi).
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">D. Companionship</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Reading, conversation, accompanying on walks, and cognitive engagement activities.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Service Exclusions */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500" /> Service Exclusions (What We DO NOT Do)
          </h2>
          <div className="bg-red-50/50 p-6 md:p-8 rounded-[2rem] border border-red-100 space-y-4">
            <p className="text-sm text-red-900/70 italic">To protect our staff and liability, Oldful Care Associates are strictly prohibited from performing these tasks:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="flex gap-3 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                <div><strong>Domestic Help:</strong> No sweeping/mopping, washing family clothes, or cooking for other members. cleaning is limited to patient&apos;s area.</div>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                <div><strong>Invasive Medical:</strong> No injections (IV/IM), catheter insertion, or wound suturing (unless RN with prescription).</div>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                <div><strong>Financial Handling:</strong> Forbidden from handling cash, credit cards, or ATM transactions.</div>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                <div><strong>Heavy Lifting:</strong> Moving heavy furniture or gas cylinders.</div>
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Staff Welfare */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 font-[var(--font-poppins)]">
            <UserCheck className="w-6 h-6 text-blue-500" /> Staff Welfare & Working Conditions
          </h2>
          <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col gap-8">
            <div>
              <h4 className="font-bold text-blue-900 text-sm mb-4 uppercase tracking-widest">Rest Periods</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <li className="text-sm text-blue-800 leading-relaxed">
                  <strong className="block text-blue-900 mb-1">12-Hour Shift:</strong> 1 hour of break time for meals/rest.
                </li>
                <li className="text-sm text-blue-800 leading-relaxed">
                  <strong className="block text-blue-900 mb-1">24-Hour (Live-in) Shift:</strong> Min 8 hours sleep at night + 2 hours break during day. Continuous 24-hour wakefulness is not permitted.
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-blue-100">
              <h4 className="font-bold text-blue-900 text-sm mb-4 uppercase tracking-widest">Food & Accommodation</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                The Client must provide clean, hygienic sleeping arrangements (bed/mattress) and access to a toilet. Adequate food (3 meals + tea) must be provided, or a food allowance must be paid.
              </p>
            </div>
            <div className="pt-6 border-t border-blue-100">
              <h4 className="font-bold text-blue-900 text-sm mb-4 uppercase tracking-widest">Safety</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                The environment must be free from harassment. We reserve the right to pull staff out immediately if they face verbal or physical abuse.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Inventory & Cross Gender */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Inventory & Consumables</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex gap-2"><strong>•</strong> Family must provide all necessary medical/hygiene supplies (Gloves, Sanitizers, Diapers, etc).</li>
              <li className="flex gap-2"><strong>•</strong> Staff will use resources efficiently but are not liable for cost of replenishment.</li>
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Cross-Gender Care Policy</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex gap-2"><strong>•</strong> Generally assign same-gender care for personal hygiene tasks.</li>
              <li className="flex gap-2"><strong>•</strong> Exceptions made ONLY upon explicit written family request and staff consent.</li>
            </ul>
          </section>
        </div>

        {/* 6. Medical Disclaimer */}
        <section className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100">
           <div className="flex gap-4">
              <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Medical Disclaimer</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  Oldful Care Associates are caregivers, not doctors. They will never make medical decisions (e.g. insulin adjustment). They will contact the Family or Care Manager who will consult the treating physician.
                </p>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
}
