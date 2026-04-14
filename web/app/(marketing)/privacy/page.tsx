import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy | Oldful",
  description: "Privacy Policy for Oldful explaining data collection and usage.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-16 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)]">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Last Updated: 01/01/2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            Oldful (“we,” “our,” or “us”) is committed to protecting the privacy and dignity of our users (“you,” “your,” or “User”), particularly the elders and families we serve. This Privacy Policy outlines how Oldful collects, uses, discloses, and safeguards your information when you visit our website www.oldful.com or engage our elder care services.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
             <p className="text-sm text-gray-600 font-medium mb-2">This Policy is published in compliance with:</p>
             <ul className="list-disc pl-5 text-sm text-gray-500">
                <li>Section 43A of the Information Technology Act, 2000.</li>
                <li>Rule 4 of the Information Technology (SPDI Rules), 2011.</li>
                <li>Digital Personal Data Protection Act, 2023 (DPDP Act) principles.</li>
             </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Information We Collect</h2>
          
          <h3 className="text-lg font-bold text-gray-800 mt-2">A. Personal Information</h3>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-1">
            <li><strong>Identity Details:</strong> Name, age, gender, date of birth.</li>
            <li><strong>Contact Information:</strong> Phone numbers, email addresses, residential addresses.</li>
            <li><strong>Emergency Contacts:</strong> Names and phone numbers of family members or guardians.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-800 mt-4">B. Sensitive Personal Data or Information (SPDI)</h3>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-1">
            <li><strong>Health Information:</strong> Medical history, prescriptions, diagnostic reports, conditions.</li>
            <li><strong>Dietary & Lifestyle:</strong> Food restrictions, mobility requirements.</li>
            <li><strong>Financial Information:</strong> Bank account or credit card details (processed securely via gateways).</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-800 mt-4">C. Technical Data</h3>
          <ul className="list-disc pl-6 text-gray-600">
            <li>IP address, browser type, operating system, and interaction logs.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">How We Use Your Information</h2>
          <ol className="list-decimal pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Service Delivery:</strong> To deploy caregivers, manage health subscriptions, and coordinate with third parties.</li>
            <li><strong>Care Coordination:</strong> To monitor health status and update designated family members.</li>
            <li><strong>Communication:</strong> To send appointment reminders, renewals, and emergency alerts.</li>
            <li><strong>Quality Improvement:</strong> To analyse service usage and improve our website and care plans.</li>
            <li><strong>Legal Compliance:</strong> To comply with court orders, applicable laws, or government mandates.</li>
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Disclosure of Information</h2>
          <p className="text-gray-600 font-medium">We do not sell your personal data. We may share information only with:</p>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Service Partners:</strong> With vetted third parties (e.g., diagnostic labs) strictly to fulfil requests.</li>
            <li><strong>Medical Professionals:</strong> With doctors or hospitals in a medical emergency.</li>
            <li><strong>Legal Authorities:</strong> If required by law or to protect safety.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Data Security</h2>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Encryption:</strong> Sensitive data is encrypted during transmission.</li>
            <li><strong>Access Control:</strong> Only authorized personnel have access on a need-to-know basis.</li>
            <li><strong>Secure Servers:</strong> Hosted on secure servers with firewalls.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
