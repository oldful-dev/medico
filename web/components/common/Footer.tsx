'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchPublishedList, typeToSlug, type LegalDoc } from '@/lib/legal';

const COMPANY_NAME_FALLBACK = 'Ayuxa Health Tech Platforms Pvt. Ltd.';

// URLs mirror the "Social Channels" block on the About page.
const SOCIAL_LINKS: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/ayuxacare',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[18px] h-[18px]">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.8c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07Zm0 3.06a4.98 4.98 0 1 1 0 9.96 4.98 4.98 0 0 1 0-9.96Zm0 1.8a3.18 3.18 0 1 0 0 6.36 3.18 3.18 0 0 0 0-6.36Zm5.19-.87a1.17 1.17 0 1 1 0 2.34 1.17 1.17 0 0 1 0-2.34Z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/ayuxacare',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[18px] h-[18px]">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/ayuxacare',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[18px] h-[18px]">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@ayuxacare',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[18px] h-[18px]">
        <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/ayuxacare',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[16px] h-[16px]">
        <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.47l7.73-8.83L1.05 2.25h6.83l4.71 6.23 5.65-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://whatsapp.com/channel/0029VbCl0Lg0lwgh76DNaH1d',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-[18px] h-[18px]">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.02 21.5h-.01c-1.75 0-3.47-.47-4.97-1.36l-.36-.21-3.7.97.99-3.61-.23-.37A9.9 9.9 0 0 1 2.1 11.9c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.01 2.91a9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.92 9.92Zm8.44-18.36A11.8 11.8 0 0 0 12.02.04C5.5.04.2 5.34.2 11.86c0 2.09.55 4.13 1.58 5.93L.1 24l6.35-1.67a11.8 11.8 0 0 0 5.57 1.42h.01c6.52 0 11.82-5.3 11.82-11.82 0-3.16-1.23-6.13-3.47-8.37Z" />
      </svg>
    ),
  },
];

export function Footer() {
  const [companyName, setCompanyName] = useState<string>(COMPANY_NAME_FALLBACK);
  const [legalDocs, setLegalDocs] = useState<LegalDoc[]>([]);

  useEffect(() => {
    fetchPublishedList().then(setLegalDocs).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';
        const res = await fetch(`${apiUrl}/ui-config/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        const found = json?.data?.find((c: { key: string }) => c.key === 'company_global_config');
        let parsed = found?.configJson;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        if (parsed?.company_name) setCompanyName(parsed.company_name);
      } catch {
        /* keep fallback */
      }
    };
    load();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--color-bg-screen)] border-t border-black/10 font-[var(--font-poppins)]">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">

        {/* Copyright */}
        <p className="text-xs text-black/55 order-3 sm:order-1 text-center sm:text-left">
          &copy; {year} {companyName}. All rights reserved.
        </p>

        {/* Legal links */}
        <nav
          aria-label="Legal"
          className="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          {legalDocs.map((doc) => (
            <Link
              key={doc.id}
              href={`/${typeToSlug(doc.type)}`}
              className="text-xs text-black/60 hover:text-[var(--color-primary)] transition-colors"
            >
              {doc.title}
            </Link>
          ))}
        </nav>

        {/* Social links */}
        <div className="order-2 sm:order-3 flex items-center gap-3">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              className="text-black/45 hover:text-[var(--color-primary)] transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
