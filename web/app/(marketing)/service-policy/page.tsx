import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Service Policy | Ayuxacare",
  description: "Operational manual and service scope for Ayuxacare care associates and managers.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://Ayuxacare.onrender.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/SERVICE_POLICY`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function ServicePolicyPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">

        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            {doc?.title ?? 'Service Scope & Operational Policy'}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
            {doc?.publishedAt
              ? `Effective Date: ${new Date(doc.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
              : 'Effective Date: 01/01/2026'}
          </p>
        </header>

        {doc?.content ? (
          <div
            className="legal-content prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        ) : (
          <div className="text-gray-600 leading-relaxed space-y-6">
            <p>Service Policy content will be updated soon. Please check back later.</p>
          </div>
        )}

      </div>
    </div>
  );
}
