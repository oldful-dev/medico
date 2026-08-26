import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ayuxa's Master Agreement | Ayuxa",
  description:
    "Ayuxa's Master Agreement outlining the terms, privacy policy, and service policy for the Ayuxa platform.",
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  "https://api.ayuxacare.com/api";

async function getLegalDoc() {
  try {
    const res = await fetch(`${API_URL}/legal/published/MASTER_POLICY`);
    if (!res.ok) {
      console.error(`[legal] fetch non-OK: ${res.status} ${res.statusText} for ${API_URL}/legal/published/MASTER_POLICY`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.error(`[legal] fetch threw for ${API_URL}/legal/published/MASTER_POLICY:`, err);
    return null;
  }
}

export default async function LegalPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? "Ayuxa's Master Agreement"}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
            {doc?.publishedAt
              ? `Last Updated: ${new Date(doc.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`
              : "Last Updated: 01/01/2026"}
          </p>
        </header>

        {doc?.content ? (
          <div
            className="legal-content prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        ) : (
          <section className="flex flex-col gap-4">
            <p className="text-gray-600 leading-relaxed">
              Ayuxa&apos;s Master Agreement could not be loaded. Please try
              again later or contact support.
            </p>
          </section>
        )}
      </div>

   
    </div>
  );
}
