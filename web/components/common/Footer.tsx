'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollText, ShieldCheck, Banknote, AlertTriangle, Cookie, Landmark, Download } from 'lucide-react';

const FALLBACK_SETTINGS = {
  company_name: "Ayuxa Health Tech Platforms Pvt. Ltd.",
  address: "No. 42, 3rd Main Road, Sector 7, HSR Layout, Bengaluru, Karnataka 560102",
  official_contact: "+91 94801 98108",
  customer_care: "080 4728 0789",
  emails: {
    support: "support@ayuxacare.com",
    investor: "office@ayuxa.co.in",
    careers: "careers@ayuxa.co.in",
    enquiries: "ho@ayuxa.co.in"
  },
  iso_certifications: [] as { label: string; certNumber?: string }[]
};

function TextSkeleton({ width }: { width: string }) {
  return <span className="inline-block h-[1em] align-middle bg-gray-700/60 rounded animate-pulse" style={{ width }} />;
}

export function Footer() {
  const [settings, setSettings] = useState<typeof FALLBACK_SETTINGS | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/ui-config/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          const found = json.data.find((c: { key: string }) => c.key === "company_global_config");
          if (found && found.configJson) {
            let parsed = found.configJson;
            if (typeof parsed === "string") {
              try { parsed = JSON.parse(parsed); } catch {}
            }
            setSettings({
              company_name: parsed.company_name || FALLBACK_SETTINGS.company_name,
              address: parsed.address || FALLBACK_SETTINGS.address,
              official_contact: parsed.official_contact || FALLBACK_SETTINGS.official_contact,
              customer_care: parsed.customer_care || FALLBACK_SETTINGS.customer_care,
              emails: {
                support: parsed.emails?.support || FALLBACK_SETTINGS.emails.support,
                investor: parsed.emails?.investor || FALLBACK_SETTINGS.emails.investor,
                careers: parsed.emails?.careers || FALLBACK_SETTINGS.emails.careers,
                enquiries: parsed.emails?.enquiries || FALLBACK_SETTINGS.emails.enquiries
              },
              iso_certifications: Array.isArray(parsed.iso_certifications) ? parsed.iso_certifications : []
            });
            return;
          }
        }
        setLoadFailed(true);
      } catch (err) {
        console.error("Failed to load footer settings:", err);
        setLoadFailed(true);
      }
    };
    fetchSettings();
  }, []);

  // Show real fetched data, or the static fallback only once the fetch has
  // definitively failed/returned nothing — never as a pre-fetch flash.
  const display = settings || (loadFailed ? FALLBACK_SETTINGS : null);

  return (
    <footer className="mt-8 bg-[#1B1B1B] text-gray-300 w-full pt-16 pb-8 px-6 font-[var(--font-poppins)] selection:bg-[var(--color-primary)] selection:text-white relative z-40">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand & Mission */}
        <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 relative">
              <Image
                src="/onlylogo.png"
                alt="Ayuxa Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Ayuxa</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed pr-4">
            {display ? display.company_name : <TextSkeleton width="180px" />}
          </p>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
            Address:
            <p className="text-xs text-gray-400 normal-case tracking-normal mt-1 leading-relaxed">
              {display ? display.address : <TextSkeleton width="90%" />}
            </p>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {!display ? (
              <TextSkeleton width="140px" />
            ) : (
              (display.iso_certifications.length > 0
                ? display.iso_certifications
                : [{ label: "ISO 9001-2015 Certified" }]
              ).map((cert, i) => (
                <div key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {cert.label}
                  {cert.certNumber ? <span className="normal-case tracking-normal text-gray-600"> · {cert.certNumber}</span> : null}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Navigation</h3>
          <Link href="/" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Home</Link>
          <Link href="/about" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">About Us</Link>
          <Link href="/team" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Team</Link>
          <Link href="/community-care" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Community</Link>
          <Link href="/careers" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Careers</Link>
          <Link href="/blogs" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Blog</Link>
          <Link href="/contact" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Contact Us</Link>
        </div>

        {/* Legal Policies */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Legal</h3>
          <Link href="/privacy" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" /> Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <ScrollText className="w-4 h-4 shrink-0" /> Terms & Conditions
          </Link>
          <Link href="/refund" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <Banknote className="w-4 h-4 shrink-0" /> Refund & Cancellation Policy
          </Link>
          <Link href="/disclaimer" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Disclaimer
          </Link>
          <Link href="/cookie-policy" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <Cookie className="w-4 h-4 shrink-0" /> Cookie Policy
          </Link>
          <Link href="/legal" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <Landmark className="w-4 h-4 shrink-0" /> Legal Information
          </Link>
          <Link href="/right-to-access-data" className="text-sm hover:text-white transition-colors w-fit flex items-center gap-2">
            <Download className="w-4 h-4 shrink-0" /> Right to Access Data
          </Link>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Contact Information</h3>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Client Support</span>
            {display ? (
              <a href={`mailto:${display.emails.support}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
                {display.emails.support}
              </a>
            ) : <TextSkeleton width="160px" />}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Investor Relations</span>
            {display ? (
              <a href={`mailto:${display.emails.investor}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
                {display.emails.investor}
              </a>
            ) : <TextSkeleton width="160px" />}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Careers</span>
            {display ? (
              <a href={`mailto:${display.emails.careers}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
                {display.emails.careers}
              </a>
            ) : <TextSkeleton width="160px" />}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">General Enquiries</span>
            {display ? (
              <a href={`mailto:${display.emails.enquiries}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
                {display.emails.enquiries}
              </a>
            ) : <TextSkeleton width="160px" />}
          </div>

          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Official Contact Number</span>
            {display ? (
              <a href={`tel:${display.official_contact}`} className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
                {display.official_contact}
              </a>
            ) : <TextSkeleton width="130px" />}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Customer Care</span>
            {display ? (
              <a href={`tel:${display.customer_care}`} className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
                {display.customer_care}
              </a>
            ) : <TextSkeleton width="130px" />}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-center gap-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} {display ? display.company_name : <TextSkeleton width="180px" />}. All rights reserved.</p>
      </div>
    </footer>
  );
}
