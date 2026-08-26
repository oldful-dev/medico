import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy | Ayuxa",
  description: "Privacy Policy for Ayuxa explaining data collection and usage.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://api.ayuxacare.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/PRIVACY_POLICY`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function PrivacyPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Privacy Policy'}
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
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                Ayuxa (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy and dignity of our users, particularly the elders and families we serve. This Privacy Policy outlines how Ayuxa collects, uses, discloses, and safeguards your information when you visit <span className="text-gray-900 font-semibold underline decoration-emerald-200">www.Ayuxa.com</span> or engage our elder care services.
              </p>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-2">
                <p className="text-sm text-gray-900 font-bold mb-3">This Policy is published in compliance with:</p>
                <ul className="list-disc pl-5 text-sm text-gray-600 flex flex-col gap-2">
                  <li>Section 43A of the Information Technology Act, 2000.</li>
                  <li>Rule 4 of the Information Technology (SPDI) Rules, 2011.</li>
                  <li>Digital Personal Data Protection Act, 2023 (DPDP Act) principles.</li>
                </ul>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Information We Collect</h2>
              <h3 className="text-lg font-bold text-gray-800 mt-2">A. Personal Information</h3>
              <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
                <li><strong>Identity Details:</strong> Name, age, gender, date of birth.</li>
                <li><strong>Contact Information:</strong> Phone numbers, email addresses, residential addresses.</li>
                <li><strong>Emergency Contacts:</strong> Names and phone numbers of family members or guardians.</li>
              </ul>
              <h3 className="text-lg font-bold text-gray-800 mt-4">B. Sensitive Personal Data (SPDI)</h3>
              <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
                <li><strong>Health Information:</strong> Medical history, prescriptions, diagnostic reports, doctor details.</li>
                <li><strong>Dietary & Lifestyle Preferences:</strong> Food restrictions, mobility requirements, daily routine.</li>
                <li><strong>Financial Information:</strong> Payment details processed securely via third-party gateways.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">How We Use Your Information</h2>
              <ol className="list-decimal pl-6 text-gray-600 flex flex-col gap-3">
                <li><strong>Service Delivery:</strong> To deploy caregivers, manage health subscriptions, and coordinate third-party services.</li>
                <li><strong>Care Coordination:</strong> To monitor the health status of the elder and update designated family members.</li>
                <li><strong>Communication:</strong> To send appointment reminders, subscription renewals, and emergency alerts.</li>
                <li><strong>Legal Compliance:</strong> To comply with court orders, applicable laws, or government mandates.</li>
              </ol>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Data Security</h2>
              <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
                <li><strong>Encryption:</strong> Sensitive data is encrypted during transmission.</li>
                <li><strong>Access Control:</strong> Only authorized personnel have access to sensitive health data on a need-to-know basis.</li>
                <li><strong>Secure Servers:</strong> Hosted on secure servers with firewalls and regular security patches.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Grievance Redressal</h2>
              <ul className="list-none bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col gap-2 text-gray-700">
                <li><strong>Name:</strong> Mr. SK. Murgan</li>
                <li><strong>Designation:</strong> Grievance Officer</li>
                <li><strong>Email:</strong> <a href="mailto:privacy@Ayuxa.com" className="text-emerald-700 underline underline-offset-4">privacy@Ayuxa.com</a></li>
                <li><strong>Address:</strong> OLDFUL GENTLORA ESTEEM LLP, No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road, Rajarajeshwari Nagar, Bangalore 560039</li>
              </ul>
            </section>

            <section className="flex flex-col gap-4 mb-16">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Updates to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy to reflect changes in our practices or legal requirements. The &quot;Last Updated&quot; date at the top will indicate the latest revision.
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
