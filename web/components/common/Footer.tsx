'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  const [settings, setSettings] = useState({
    company_name: "Ayuxa Health Tech Platforms Pvt. Ltd.",
    address: "No. 42, 3rd Main Road, Sector 7, HSR Layout, Bengaluru, Karnataka 560102",
    official_contact: "+91 94801 98108",
    customer_care: "080 4728 0789",
    emails: {
      support: "support@ayuxacare.com",
      investor: "office@ayuxa.co.in",
      careers: "careers@ayuxa.co.in",
      enquiries: "ho@ayuxa.co.in"
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/ui-config/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          const found = json.data.find((c: any) => c.key === "company_global_config");
          if (found && found.configJson) {
            let parsed = found.configJson;
            if (typeof parsed === "string") {
              try { parsed = JSON.parse(parsed); } catch (_) {}
            }
            setSettings({
              company_name: parsed.company_name || "Ayuxa Health Tech Platforms Pvt. Ltd.",
              address: parsed.address || "No. 42, 3rd Main Road, Sector 7, HSR Layout, Bengaluru, Karnataka 560102",
              official_contact: parsed.official_contact || "+91 94801 98108",
              customer_care: parsed.customer_care || "080 4728 0789",
              emails: {
                support: parsed.emails?.support || "support@ayuxacare.com",
                investor: parsed.emails?.investor || "office@ayuxa.co.in",
                careers: parsed.emails?.careers || "careers@ayuxa.co.in",
                enquiries: parsed.emails?.enquiries || "ho@ayuxa.co.in"
              }
            });
          }
        }
      } catch (err) {
        console.error("Failed to load footer settings:", err);
      }
    };
    fetchSettings();
  }, []);

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
            {settings.company_name}
          </p>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
            Address:
            <p className="text-xs text-gray-400 normal-case tracking-normal mt-1 leading-relaxed">
              {settings.address}
            </p>
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
            ISO 9001-2015 Certified
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
          <Link href="/privacy" className="text-sm hover:text-white transition-colors w-fit">Privacy Policy</Link>
          <Link href="/terms" className="text-sm hover:text-white transition-colors w-fit">Terms & Conditions</Link>
          <Link href="/refund" className="text-sm hover:text-white transition-colors w-fit">Refund & Cancellation Policy</Link>
          <Link href="/disclaimer" className="text-sm hover:text-white transition-colors w-fit">Disclaimer</Link>
          <Link href="/cookie-policy" className="text-sm hover:text-white transition-colors w-fit">Cookie Policy</Link>
          <Link href="/legal" className="text-sm hover:text-white transition-colors w-fit">Legal Information</Link>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Contact Information</h3>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Client Support</span>
            <a href={`mailto:${settings.emails.support}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              {settings.emails.support}
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Investor Relations</span>
            <a href={`mailto:${settings.emails.investor}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              {settings.emails.investor}
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Careers</span>
            <a href={`mailto:${settings.emails.careers}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              {settings.emails.careers}
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">General Enquiries</span>
            <a href={`mailto:${settings.emails.enquiries}`} className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              {settings.emails.enquiries}
            </a>
          </div>

          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Official Contact Number</span>
            <a href={`tel:${settings.official_contact}`} className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              {settings.official_contact}
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Customer Care</span>
            <a href={`tel:${settings.customer_care}`} className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              {settings.customer_care}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} {settings.company_name}. All rights reserved. | ISO 9001:2015 Certified Elder Care Platform.</p>
        <p className="text-xs text-gray-500 text-center md:text-right font-medium text-gray-400">Designed with empathy in Bangalore, India.</p>
      </div>
    </footer>
  );
}
