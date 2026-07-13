'use client';

import React, { useEffect, useState } from 'react';
import { uiConfigService } from '@/services/api/uiConfigService';
import { Loader2 } from 'lucide-react';

const FALLBACK_HTML = `<section>
  <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About Ayuxa</h1>
  <p class="text-lg text-gray-600 leading-relaxed mb-6">
    Ayuxa provides comprehensive elder care management services, including care coordination, health monitoring, and assistance with daily living activities. We act as a dedicated care management platform, blending technology with deep human empathy to keep your loved ones safe.
  </p>
</section>

<section id="statutory" class="bg-gray-50 p-8 md:p-10 rounded-3xl border border-gray-100">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Statutory Disclosures</h2>
  <p class="text-sm text-gray-500 mb-8 italic">(As per Consumer Protection [E-Commerce] Rules, 2020)</p>
  
  <div class="flex flex-col gap-8">
    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Corporate Identity</h3>
      <ul class="list-none flex flex-col gap-2 text-gray-600">
        <li><strong class="text-gray-800">Legal Name:</strong> OLDFUL GENTLORA ESTEEM LLP</li>
        <li><strong class="text-gray-800">Headquarters Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
        <li><strong class="text-gray-800">Email:</strong> <a href="mailto:compliance@Ayuxa.com" class="text-[var(--color-primary)] hover:underline">compliance@Ayuxa.com</a></li>
        <li><strong class="text-gray-800">Mobile:</strong> +91 80621 80429</li>
        <li><strong class="text-gray-800">Website:</strong> www.Ayuxa.com</li>
      </ul>
    </div>

    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Grievance Redressal Mechanism</h3>
      <p class="text-gray-600 mb-3">If you have a complaint regarding our services, privacy, or usage, please contact our designated officer:</p>
      <ul class="list-none flex flex-col gap-2 text-gray-600 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <li><strong class="text-gray-800">Grievance Officer:</strong> SK Murgan</li>
        <li><strong class="text-gray-800">Email:</strong> <a href="mailto:compliance@Ayuxa.com" class="text-[var(--color-primary)] hover:underline">compliance@Ayuxa.com</a></li>
        <li><strong class="text-gray-800">Phone:</strong> +91 80621 80429</li>
        <li><strong class="text-gray-800">Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
      </ul>
      <p class="text-gray-600 mt-4 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <strong>Our Promise:</strong> We will acknowledge your complaint within 48 hours and resolve it within 1 month from the date of receipt. You will be issued a unique Ticket Number to track the status of your complaint.
      </p>
    </div>
    
    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Nodal Officer</h3>
      <p class="text-gray-600 mb-3">For Law Enforcement Coordination.</p>
      <ul class="list-none flex flex-col gap-2 text-gray-600">
        <li><strong class="text-gray-800">Name:</strong> SK Murgan</li>
        <li><strong class="text-gray-800">Email:</strong> compliance@Ayuxa.com</li>
      </ul>
    </div>
  </div>
</section>

<section id="refund" class="bg-red-50 p-8 md:p-10 rounded-3xl border border-red-100">
  <h2 class="text-2xl font-bold text-red-900 mb-4">Refund Policy Overview</h2>
  <p class="text-red-800 leading-relaxed">
    <strong>Cancellations:</strong> Refunds for mid-cycle cancellations are calculated on a pro-rata basis, subject to a distinct cancellation fee.<br /><br />
    <strong>Service Failure:</strong> Full refunds are issued only if Ayuxa fails to deploy a caregiver/service as per the agreed Service Level Agreement (SLA).
  </p>
</section>`;

export default function AboutPage() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const config = await uiConfigService.getCompanyGlobalConfig();
        if (config && config.about_html) {
          setHtmlContent(config.about_html);
        } else {
          setHtmlContent(FALLBACK_HTML);
        }
      } catch (err) {
        console.error("Error loading about us data:", err);
        setHtmlContent(FALLBACK_HTML);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#FFFCF6] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="bg-[#FFFCF6] min-h-screen pt-12 md:pt-16 pb-16 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)]">
      <div 
        className="max-w-4xl mx-auto flex flex-col gap-12"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
