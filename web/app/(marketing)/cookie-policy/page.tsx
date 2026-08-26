import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Cookie Policy | Ayuxa",
  description: "Cookie Policy for Ayuxa explaining cookie collection and usage.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://api.ayuxacare.com/api';

async function getLegalDoc() {
  try {
    const res = await fetch(`${API_URL}/legal/published/COOKIE_POLICY`);
    if (!res.ok) {
      console.error(`[cookie-policy] fetch non-OK: ${res.status} ${res.statusText} for ${API_URL}/legal/published/COOKIE_POLICY`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.error(`[cookie-policy] fetch threw for ${API_URL}/legal/published/COOKIE_POLICY:`, err);
    return null;
  }
}

export default async function CookiePolicyPage() {
  const doc = await getLegalDoc();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {doc?.title ?? 'Cookie Policy'}
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
                Ayuxa Health Tech Platforms Pvt. Ltd. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses cookies on our website (<span className="text-gray-900 font-semibold underline decoration-emerald-200">www.Ayuxa.com</span>). This Cookie Policy explains what cookies are, how we use them, and your choices regarding cookie management.
              </p>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">What Are Cookies?</h2>
              <p className="text-gray-600 leading-relaxed">
                Cookies are small text files stored on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information.
              </p>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">How We Use Cookies</h2>
              <p className="text-gray-600 leading-relaxed">
                We use cookies for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 flex flex-col gap-2">
                <li><strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences or filling in forms.</li>
                <li><strong>Performance & Analytics Cookies:</strong> These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site.</li>
                <li><strong>Functionality Cookies:</strong> These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Your Choices Regarding Cookies</h2>
              <p className="text-gray-600 leading-relaxed">
                You have the right to choose whether to accept cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. However, this may prevent you from taking full advantage of the website.
              </p>
            </section>

            <section className="flex flex-col gap-4 mb-16">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at <a href="mailto:support@ayuxacare.com" className="text-emerald-700 underline">support@ayuxacare.com</a>.
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
