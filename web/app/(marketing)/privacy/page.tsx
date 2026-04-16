import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy | Oldful",
  description: "Privacy Policy for Oldful explaining data collection and usage.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Last Updated: 01/01/2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            Oldful (“we,” “our,” or “us”) is committed to protecting the privacy and dignity of our users (“you,” “your,” or “User”), particularly the elders and families we serve. This Privacy Policy outlines how Oldful collects, uses, discloses, and safeguards your information when you visit our website <span className="text-gray-900 font-semibold underline decoration-emerald-200">www.oldful.com</span> or engage our elder care services.
          </p>
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-2">
             <p className="text-sm text-gray-900 font-bold mb-3">This Policy is published in compliance with:</p>
             <ul className="list-disc pl-5 text-sm text-gray-600 flex flex-col gap-2">
                <li>Section 43A of the Information Technology Act, 2000.</li>
                <li>Rule 4 of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules).</li>
                <li>Digital Personal Data Protection Act, 2023 (DPDP Act) principles.</li>
             </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Information We Collect</h2>
          <p className="text-gray-600">We collect information to provide comprehensive, personalized care. This includes:</p>
          
          <h3 className="text-lg font-bold text-gray-800 mt-2">A. Personal Information</h3>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Identity Details:</strong> Name, age, gender, date of birth.</li>
            <li><strong>Contact Information:</strong> Phone numbers, email addresses, residential addresses (for care delivery).</li>
            <li><strong>Emergency Contacts:</strong> Names and phone numbers of family members or guardians.</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-800 mt-4">B. Sensitive Personal Data or Information (SPDI)</h3>
          <p className="text-sm text-gray-500 italic mb-2">Given the nature of elder care, we may collect:</p>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Health Information:</strong> Medical history, prescriptions, diagnostic reports, doctor details, physical and mental health conditions.</li>
            <li><strong>Dietary & Lifestyle Preferences:</strong> Food restrictions, mobility requirements, and daily routine details necessary for caregiving.</li>
            <li><strong>Financial Information:</strong> Bank account or credit card details (processed securely via third-party payment gateways for subscriptions/payments).</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-800 mt-4">C. Technical Data</h3>
          <ul className="list-disc pl-6 text-gray-600">
            <li>IP address, browser type, operating system, and interaction logs when you visit our website.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">How We Use Your Information</h2>
          <p className="text-gray-600">We use your data strictly for lawful purposes:</p>
          <ol className="list-decimal pl-6 text-gray-600 flex flex-col gap-3">
            <li><strong>Service Delivery:</strong> To deploy caregivers, manage health subscriptions, and coordinate with third-party service providers (e.g., physiotherapists, housekeepers).</li>
            <li><strong>Care Coordination:</strong> To monitor the health status of the elder and update designated family members.</li>
            <li><strong>Communication:</strong> To send appointment reminders, subscription renewals, and emergency alerts.</li>
            <li><strong>Quality Improvement:</strong> To analyse service usage and improve our website and care plans.</li>
            <li><strong>Legal Compliance:</strong> To comply with court orders, applicable laws, or government mandates.</li>
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Disclosure of Information</h2>
          <p className="text-gray-600 font-medium italic underline decoration-red-200">We do not sell your personal data. We may share information only in the following circumstances:</p>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-3">
            <li><strong>Service Partners:</strong> With vetted third parties (e.g., diagnostic labs, specialized caregivers, or maintenance professionals) strictly to fulfil the service requested.</li>
            <li><strong>Medical Professionals:</strong> With doctors or hospitals in case of a medical emergency.</li>
            <li><strong>Legal Authorities:</strong> If required by law or to protect the safety and rights of Oldful, our users, or the public.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as a business asset.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Data Security</h2>
          <p className="text-gray-600">We implement reasonable security practices and procedures as mandated by the IT Act, 2000 and international standards:</p>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Encryption:</strong> Sensitive data is encrypted during transmission.</li>
            <li><strong>Access Control:</strong> Only authorized personnel (care managers) have access to sensitive health data on a need-to-know basis.</li>
            <li><strong>Secure Servers:</strong> Our website and databases are hosted on secure servers with firewalls and regular security patches.</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2">Note: While we strive to use commercially acceptable means to protect your data, no method of transmission over the Internet is 100% secure.</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">User Rights</h2>
          <ul className="list-none flex flex-col gap-3 text-gray-600">
            <li className="flex gap-2">
               <span className="text-emerald-500 font-bold">•</span>
               <div><strong>Right to Access:</strong> You may request a summary of the personal data we hold about you.</div>
            </li>
            <li className="flex gap-2">
               <span className="text-emerald-500 font-bold">•</span>
               <div><strong>Right to Correction:</strong> You may request updates to inaccurate or incomplete medical or contact information.</div>
            </li>
            <li className="flex gap-2">
               <span className="text-emerald-500 font-bold">•</span>
               <div><strong>Withdrawal of Consent:</strong> You may withdraw your consent for data processing at any time by writing to us. Note that withdrawing consent may limit our ability to provide essential care services.</div>
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Data Retention</h2>
          <p className="text-gray-600">We retain your personal and health data only as long as necessary to:</p>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li>Provide the agreed services.</li>
            <li>Comply with legal obligations (e.g., tax laws requiring transaction records for a specific period).</li>
            <li>Resolve disputes and enforce our agreements.</li>
          </ul>
          <p className="text-sm text-gray-500 mt-2 italic">Upon termination of services, data will be securely deleted or anonymized in accordance with our retention policy.</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            Our website uses cookies to enhance user experience. You can choose to disable cookies through your browser settings, though this may affect the functionality of our website.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Grievance Redressal</h2>
          <p className="text-gray-600 leading-relaxed">
            In accordance with the Information Technology Act, 2000, if you have any complaints or concerns regarding your privacy or data usage, please contact our Grievance Officer:
          </p>
          <ul className="list-none bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col gap-2 text-gray-700">
            <li><strong>Name:</strong> Mr. SK. Murgan</li>
            <li><strong>Designation:</strong> Grievance Officer</li>
            <li><strong>Email:</strong> <a href="mailto:privacy@oldful.com" className="text-emerald-700 underline underline-offset-4 decoration-emerald-200">privacy@oldful.com</a></li>
            <li><strong>Address:</strong> OLDFUL GENTLORA ESTEEM LLP, No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Updates to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy to reflect changes in our practices or legal requirements. The “Last Updated” date at the top will indicate the latest revision. We encourage you to review this page periodically.
          </p>
        </section>

      </div>
    </div>
  );
}
