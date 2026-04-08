import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms and Conditions | Oldful",
  description: "Terms and Conditions for using the Oldful elder care platform.",
};

export default function TermsPage() {
  return (
    <div className="bg-white min-h-screen py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Last Updated: 01/01/2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing the website www.oldful.com (“Website”) or subscribing to the services provided by Oldful (“Company,” “we,” “us,” or “our”), you (“User,” “Client,” or “Subscriber”) agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
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
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-100 mt-2">
            <strong>Note:</strong> Oldful acts as a care management platform. While we vet our partners, specific medical or maintenance services may be executed by independent third-party professionals.
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">User Obligations & Eligibility</h2>
          <ul className="list-none flex flex-col gap-4 text-gray-600">
            <li>
              <strong className="text-gray-900">Accuracy of Information:</strong> You agree to provide accurate, current, and complete medical and personal information regarding the elder (care recipient). Oldful is not liable for adverse outcomes resulting from withheld or inaccurate medical history.
            </li>
            <li>
              <strong className="text-gray-900">Safe Environment:</strong> You agree to provide a safe and respectful environment for our caregivers and service partners. We have a zero-tolerance policy for abuse, harassment, or misconduct towards our staff.
            </li>
            <li>
              <strong className="text-gray-900">Authority:</strong> If you are subscribing on behalf of an elder, you represent that you have the legal authority/consent to make decisions regarding their care.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Subscription, Payments, and Billing</h2>
          <ul className="list-none flex flex-col gap-3 text-gray-600">
            <li><strong>Subscription Model:</strong> Services are offered on a subscription basis (e.g., Monthly, Quarterly, Annual).</li>
            <li><strong>Auto-Renewal:</strong> Subscriptions will automatically renew at the end of the billing cycle unless cancelled in writing 7 days prior to the renewal date.</li>
            <li><strong>Payment Terms:</strong> Fees must be paid in advance. We reserve the right to suspend services immediately if payment is not received by the due date.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Medical Emergency Protocol</h2>
          <div className="p-4 bg-red-50 text-red-800 rounded-xl text-sm border border-red-100 mb-2">
            <strong className="block text-red-900 mb-1">Oldful is NOT an Emergency Service:</strong>
            In the event of a life-threatening medical emergency (heart attack, stroke, etc.), the User must contact emergency services (Ambulance/Hospital) immediately.
          </div>
          <p className="text-gray-600"><strong>Support Role:</strong> Our role during an emergency is limited to facilitating transport, notifying family members, and providing medical history to doctors. We are not liable for the outcome of medical emergencies.</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Limitation of Liability</h2>
          <ul className="list-none flex flex-col gap-3 text-gray-600">
            <li><strong>Third-Party Services:</strong> Oldful integrates services from third-party vendors. We are not liable for the negligence or malpractice of these independent providers.</li>
            <li><strong>Cap on Liability:</strong> To the maximum extent permitted by Indian law, Oldful’s total liability for any claim arising out of these terms shall not exceed the total amount paid by the User to Oldful in the three (3) months preceding the claim.</li>
          </ul>
        </section>
        
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Governing Law and Jurisdiction</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms shall be governed by the laws of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
          </p>
        </section>

      </div>
    </div>
  );
}
