import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Right to Access Data | Ayuxa",
  description: "How to request and download your complete personal data from Ayuxa.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://api.ayuxacare.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(
      `${API_URL}/legal/published/RIGHTS_TO_ACCESS_DATA`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function RightToAccessDataPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        <header className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Right to Access Data'}
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
          <div className="text-gray-600 leading-relaxed space-y-6">
            <p>This page will be updated soon. Please check back later.</p>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
          <p className="text-gray-700 mb-3">
            To download your complete data, open the Ayuxa app and go to Account &rarr; Legal &amp; Documents.
          </p>
          <Link
            href="/"
            className="inline-block bg-[var(--color-primary)] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Download the App Now
          </Link>
        </div>

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
