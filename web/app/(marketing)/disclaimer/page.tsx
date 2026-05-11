import React from 'react';
import { Metadata } from 'next';
import { AlertTriangle, Info, Scale, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: "Disclaimer | Ayuxacare",
  description: "General Legal Disclaimer for the Ayuxacare platform and its services.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://Ayuxacare.onrender.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/DISCLAIMER`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function DisclaimerPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">

        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Disclaimer'}
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
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900">No Medical Advice Disclaimer</h2>
              </div>

              <div className="flex flex-col gap-4 text-gray-600 leading-relaxed">
                <p>
                  The content provided on the Ayuxacare website, including blogs, health tips, and care plans, is for informational purposes only.
                </p>
                <ul className="list-none flex flex-col gap-4">
                  <li className="flex gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-red-50/10">
                     <div className="shrink-0 w-1.5 h-full bg-red-400 rounded-full" />
                     <div>
                        <strong className="text-gray-900">Not a doctor:</strong> Ayuxacare is a care management company, not a hospital or a medical doctor. Our caregivers are trained for assistance, not for performing invasive medical procedures unless explicitly stated and performed by a qualified nurse/doctor.
                     </div>
                  </li>
                  <li className="flex gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-emerald-50/10">
                     <div className="shrink-0 w-1.5 h-full bg-emerald-400 rounded-full" />
                     <div>
                        <strong className="text-gray-900">Consult Professionals:</strong> Always seek the advice of a physician or qualified health provider regarding medical conditions. Never disregard professional medical advice or delay seeking it because of something read on this Website.
                     </div>
                  </li>
                </ul>
              </div>
            </section>

            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900">Third-Party Service Disclaimer</h2>
              </div>
              <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 flex flex-col gap-4">
                <p className="text-gray-600 leading-relaxed">
                  Ayuxacare may facilitate services provided by third-party vendors (such as physiotherapists, urban maintenance services, or diagnostic labs).
                </p>
                <ul className="list-disc pl-6 text-sm text-blue-900 flex flex-col gap-2 font-medium">
                  <li><strong>Independent Contractors:</strong> These vendors are independent contractors and not employees of Ayuxacare.</li>
                  <li><strong>Liability:</strong> While we exercise due diligence in selecting partners, Ayuxacare assumes no responsibility or liability for any act, error, omission, or negligence committed by third-party providers.</li>
                </ul>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                     <Info className="w-4 h-4 text-emerald-500" /> &quot;As Is&quot; Warranty
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                     The services and the website are provided on an &quot;as is&quot; and &quot;as available&quot; basis. Ayuxacare makes no representations or warranties of any kind, express or implied, regarding the operation of the services or the information, content, or materials included.
                  </p>
               </div>
               <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4 text-amber-500" /> Outcome Disclaimer
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                     While Ayuxacare strives to improve the quality of life for elders, we cannot guarantee specific health outcomes. Health conditions are complex and variable; deterioration due to natural causes or pre-existing conditions is not the liability of Ayuxacare.
                  </p>
               </div>
            </section>

            <div className="border-t border-gray-100 pt-8 pb-12">
                <p className="text-xs text-center text-gray-400 font-medium italic">
                    Legal Notice: Continued use of this website or our services constitutes acceptance of the terms outlined above.
                </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
