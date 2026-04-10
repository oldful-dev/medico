import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us | Oldful",
  description: "Learn about Oldful Gentlora Esteem LLP and our mission to provide the best elder care management.",
};

export default function AboutPage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-24 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)]">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        <section>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About Oldful</h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            Oldful provides comprehensive elder care management services, including care coordination, health monitoring, and assistance with daily living activities. We act as a dedicated care management platform, blending technology with deep human empathy to keep your loved ones safe.
          </p>
        </section>

        <section id="statutory" className="bg-gray-50 p-8 md:p-10 rounded-3xl border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Statutory Disclosures</h2>
          <p className="text-sm text-gray-500 mb-8 italic">(As per Consumer Protection [E-Commerce] Rules, 2020)</p>
          
          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 block">Corporate Identity</h3>
              <ul className="list-none flex flex-col gap-2 text-gray-600">
                <li><strong className="text-gray-800">Legal Name:</strong> OLDFUL GENTLORA ESTEEM LLP</li>
                <li><strong className="text-gray-800">Headquarters Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
                <li><strong className="text-gray-800">Email:</strong> <a href="mailto:compliance@oldful.com" className="text-[var(--color-primary)] hover:underline">compliance@oldful.com</a></li>
                <li><strong className="text-gray-800">Mobile:</strong> +91-94801-98108</li>
                <li><strong className="text-gray-800">Website:</strong> www.oldful.com</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 block">Grievance Redressal Mechanism</h3>
              <p className="text-gray-600 mb-3">If you have a complaint regarding our services, privacy, or usage, please contact our designated officer:</p>
              <ul className="list-none flex flex-col gap-2 text-gray-600 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <li><strong className="text-gray-800">Grievance Officer:</strong> SK Murgan</li>
                <li><strong className="text-gray-800">Email:</strong> <a href="mailto:compliance@oldful.com" className="text-[var(--color-primary)] hover:underline">compliance@oldful.com</a></li>
                <li><strong className="text-gray-800">Phone:</strong> +91 94801-98108</li>
                <li><strong className="text-gray-800">Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
              </ul>
              <p className="text-gray-600 mt-4 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <strong>Our Promise:</strong> We will acknowledge your complaint within 48 hours and resolve it within 1 month from the date of receipt. You will be issued a unique Ticket Number to track the status of your complaint.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 block">Nodal Officer</h3>
              <p className="text-gray-600 mb-3">For Law Enforcement Coordination.</p>
              <ul className="list-none flex flex-col gap-2 text-gray-600">
                <li><strong className="text-gray-800">Name:</strong> SK Murgan</li>
                <li><strong className="text-gray-800">Email:</strong> compliance@oldful.com</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="refund" className="bg-red-50 p-8 md:p-10 rounded-3xl border border-red-100">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Refund Policy Overview</h2>
          <p className="text-red-800 leading-relaxed">
            <strong>Cancellations:</strong> Refunds for mid-cycle cancellations are calculated on a pro-rata basis, subject to a distinct cancellation fee.<br /><br />
            <strong>Service Failure:</strong> Full refunds are issued only if Oldful fails to deploy a caregiver/service as per the agreed Service Level Agreement (SLA).
          </p>
        </section>

      </div>
    </div>
  );
}
