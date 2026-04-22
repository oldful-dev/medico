import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms and Conditions | Oldful",
  description: "Terms and Conditions for using the Oldful elder care platform.",
};

const API_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://oldful.onrender.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/TERMS_AND_CONDITIONS`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function TermsPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Terms and Conditions'}
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
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing the website <span className="text-gray-900 font-semibold">www.oldful.com</span> ("Website") or subscribing to the services provided by Oldful ("Company," "we," "us," or "our"), you ("User," "Client," or "Subscriber") agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
              </p>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Service Description</h2>
              <p className="text-gray-600 leading-relaxed mb-2">Oldful provides comprehensive elder care management services, including but not limited to:</p>
              <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
                <li>Care coordination and health monitoring.</li>
                <li>Assistance with daily living activities via deployed caregivers.</li>
                <li>Facilitation of third-party services (e.g., physiotherapy, home maintenance).</li>
              </ul>
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-100 mt-2 italic">
                <strong>Note:</strong> Oldful acts as a care management platform. While we vet our partners, specific medical or maintenance services may be executed by independent third-party professionals.
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">User Obligations & Eligibility</h2>
              <ul className="list-none flex flex-col gap-4 text-gray-600">
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <div><strong className="text-gray-900">Accuracy of Information:</strong> You agree to provide accurate, current, and complete medical and personal information regarding the elder. Oldful is not liable for adverse outcomes resulting from withheld or inaccurate medical history.</div>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <div><strong className="text-gray-900">Safe Environment:</strong> You agree to provide a safe and respectful environment for our caregivers and service partners. We have a zero-tolerance policy for abuse, harassment, or misconduct towards our staff.</div>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <div><strong className="text-gray-900">Authority:</strong> If you are subscribing on behalf of an elder, you represent that you have the legal authority/consent to make decisions regarding their care.</div>
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Subscription, Payments, and Billing</h2>
              <ul className="list-none flex flex-col gap-3 text-gray-600">
                <li className="flex gap-2"><span className="text-emerald-500 font-bold">•</span><div><strong>Subscription Model:</strong> Services are offered on a subscription basis (e.g., Monthly, Quarterly, Annual).</div></li>
                <li className="flex gap-2"><span className="text-emerald-500 font-bold">•</span><div><strong>Auto-Renewal:</strong> Subscriptions will automatically renew at the end of the billing cycle unless cancelled in writing 7 days prior to the renewal date.</div></li>
                <li className="flex gap-2"><span className="text-emerald-500 font-bold">•</span><div><strong>Payment Terms:</strong> Fees must be paid in advance. We reserve the right to suspend services immediately if payment is not received by the due date.</div></li>
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Limitation of Liability</h2>
              <ul className="list-none flex flex-col gap-4 text-gray-600">
                <li className="flex gap-2"><span className="text-gray-900 font-bold">•</span><div><strong>Third-Party Services:</strong> Oldful is not liable for the negligence or malpractice of independent third-party providers, though we will assist in dispute resolution.</div></li>
                <li className="flex gap-2"><span className="text-gray-900 font-bold">•</span><div><strong>Cap on Liability:</strong> Oldful's total liability for any claim shall not exceed the total amount paid by the User in the three (3) months preceding the claim.</div></li>
              </ul>
            </section>

            <section className="flex flex-col gap-4 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Governing Law and Jurisdiction</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms shall be governed by the laws of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
              </p>
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
