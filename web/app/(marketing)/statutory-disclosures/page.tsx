import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Statutory Disclosures | Oldful",
  description: "Statutory and compliance disclosures for Oldful Gentlora Esteem LLP.",
};

export default function StatutoryPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Statutory Disclosures</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Last Updated: 01/01/2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Corporate Identity</h2>
          <ul className="list-none flex flex-col gap-3 text-gray-600">
            <li><strong>Legal Name of Entity:</strong> OLDFUL GENTLORA ESTEEM LLP</li>
            <li><strong>Headquarters Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
            <li><strong>Branch Office(s):</strong> None</li>
            <li><strong>Contact:</strong> compliance@oldful.com | +91 80621 80429</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Grievance Redressal Mechanism</h2>
          <p className="text-sm text-gray-500 italic mb-2">(As per Rule 4(4) and Rule 4(5) of the Consumer Protection (E-Commerce) Rules, 2020)</p>
          <ul className="list-none flex flex-col gap-3 text-gray-600">
            <li><strong>Grievance Officer:</strong> SK Murgan</li>
            <li><strong>Designation:</strong> Grievance Officer</li>
            <li><strong>Email:</strong> compliance@oldful.com</li>
            <li><strong>Direct Phone:</strong> +91 80621 80429</li>
          </ul>
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 mt-2">
            <h4 className="text-emerald-900 font-bold mb-2">Our Promise:</h4>
            <ul className="list-disc pl-5 text-emerald-800 text-sm flex flex-col gap-1">
              <li>Acknowledgement within 48 hours.</li>
              <li>Resolution within 1 month.</li>
              <li>Unique Ticket Number provided for tracking.</li>
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Nodal Officer</h2>
          <p className="text-sm text-gray-500 italic mb-2">(For Law Enforcement Coordination)</p>
          <ul className="list-none flex flex-col gap-2 text-gray-600">
            <li><strong>Name:</strong> SK Murgan</li>
            <li><strong>Email:</strong> compliance@oldful.com</li>
            <li><strong>Role:</strong> Responsible for compliance and coordination with government agencies/Police/Cyber Cells.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Service Provider Details</h2>
          <p className="text-gray-600 leading-relaxed">
            Oldful acts as a <span className="text-gray-900 font-semibold">Marketplace / Facilitator</span> for specific medical and home maintenance services. The specific service provider (Seller) details, including their legal name and contact, will be provided to the User upon confirmation of booking. 
          </p>
          <p className="text-gray-600"><strong>Country of Origin:</strong> All services and goods supplied are of Indian Origin.</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Pricing & Payments</h2>
          <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
            <li><strong>Single Figure Total:</strong> All subscription prices displayed include all compulsory charges, taxes (GST), and handling fees.</li>
            <li><strong>Price Breakup:</strong> A detailed breakup (Base Fee + GST) is provided at checkout.</li>
            <li><strong>Refunds:</strong> Governed by our Refund Policy (www.oldful.com/refund).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Quality Standards</h2>
          <p className="text-gray-600 leading-relaxed">
            Oldful maintains <span className="text-gray-900 font-bold underline decoration-[var(--color-primary)]">ISO 9001-2015 Certification</span>, ensuring precision and excellence in our geriatric care management processes.
          </p>
        </section>

      </div>
    </div>
  );
}
