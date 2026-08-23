'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone, Mail, MessageSquare, Search, ChevronRight,
  CheckCircle, Info, BadgeHelp, CheckCircle2, MapPin, Building, Loader2
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FALLBACK_FAQ_DATA: FAQItem[] = [
  { id: 'about',    question: 'What is Ayuxa Health Tech Platforms?', answer: 'Ayuxa is a specialized elder care platform offering comprehensive caregiver support, doctors profiles, nurse profiles, and community activities to keep senior citizens safe and healthy.' },
  { id: 'profiles', question: 'Are caregiver and doctor profiles verified?', answer: 'Yes, all profiles listed on Ayuxa undergo rigorous verification, including official police verification and qualification checks.' },
];

const SUPPORT_PROMISE = [
  { id: 'ack',     text: 'Response within 24-48 business hours', icon: CheckCircle2 },
  { id: 'resolve', text: 'Direct access to corporate officers', icon: CheckCircle2 },
  { id: 'track',   text: 'Official channels for careers & investor relations.', icon: Info },
];

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
  }
};

export default function ContactPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<typeof FALLBACK_SETTINGS | null>(null);
  const [loading, setLoading] = useState(true);
  const [dynamicFaqs, setDynamicFaqs] = useState<FAQItem[] | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${apiUrl}/ui-config/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        let resolved = FALLBACK_SETTINGS;
        if (json.success && json.data) {
          const found = json.data.find((c: any) => c.key === "company_global_config");
          if (found && found.configJson) {
            let parsed = found.configJson;
            if (typeof parsed === "string") {
              try { parsed = JSON.parse(parsed); } catch (_) {}
            }
            resolved = {
              company_name: parsed.company_name || FALLBACK_SETTINGS.company_name,
              address: parsed.address || FALLBACK_SETTINGS.address,
              official_contact: parsed.official_contact || FALLBACK_SETTINGS.official_contact,
              customer_care: parsed.customer_care || FALLBACK_SETTINGS.customer_care,
              emails: {
                support: parsed.emails?.support || FALLBACK_SETTINGS.emails.support,
                investor: parsed.emails?.investor || FALLBACK_SETTINGS.emails.investor,
                careers: parsed.emails?.careers || FALLBACK_SETTINGS.emails.careers,
                enquiries: parsed.emails?.enquiries || FALLBACK_SETTINGS.emails.enquiries
              }
            };
          }
        }
        setSettings(resolved);
      } catch (err) {
        console.error("Failed to load contact settings:", err);
        setSettings(FALLBACK_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    const fetchFaqs = async () => {
      try {
        const res = await fetch(`${apiUrl}/faqs/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDynamicFaqs(json.data.map((f: { id: string; question: string; answer: string }) => ({ id: f.id, question: f.question, answer: f.answer })));
        }
      } catch (err) {
        console.error("Failed to load FAQs:", err);
      }
    };

    fetchSettings();
    fetchFaqs();
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const faqData: FAQItem[] = dynamicFaqs ?? [
    ...FALLBACK_FAQ_DATA,
    { id: 'careers',  question: 'How do I apply for open positions?', answer: `Visit our Careers page to view current job listings and send your profile to ${settings.emails.careers}.` },
    { id: 'enquiry',  question: 'Whom should I contact for general queries?', answer: `For any general inquiries, please email us at ${settings.emails.enquiries} or call our care line at ${settings.customer_care}.` },
  ];

  const filteredFAQs = faqData.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col pt-20">
      {/* ─── Hero Section ─── */}
      <section className="bg-[var(--color-primary-deep)] py-16 px-6 relative overflow-hidden flex flex-col items-center">
        <div className="max-w-4xl w-full text-center relative z-10 px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight"
          >
            Get in <span className="text-emerald-400">Touch</span> with Us
          </motion.h1>
          <p className="text-emerald-50/80 max-w-xl mx-auto mb-8 text-sm md:text-base leading-relaxed">
            Have questions about our team, career opportunities, or community care initiatives? We are here to assist.
          </p>

          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder="Search common queries..."
              className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl shadow-xl outline-none focus:ring-4 ring-white/10 transition-all text-gray-800 text-sm border border-transparent focus:border-emerald-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
      </section>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 -mt-10 pb-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ─── Main Content (2/3) ─── */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Email Directory (Corporate Handles) */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-500" />
                Corporate Email Directory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EmailCard 
                  title="Client Support"
                  email={settings.emails.support}
                  description="For patient care and caregiver enquiries"
                />
                <EmailCard 
                  title="Investor Relations"
                  email={settings.emails.investor}
                  description="For corporate audits & shareholder details"
                />
                <EmailCard 
                  title="Careers"
                  email={settings.emails.careers}
                  description="For employment, nursing, and support roles"
                />
                <EmailCard 
                  title="General Enquiries"
                  email={settings.emails.enquiries}
                  description="For head office administration & partnerships"
                />
              </div>
            </div>

            {/* 2. FAQs Section */}
            <motion.div 
              layout
              className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8"
            >
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BadgeHelp className="w-5 h-5 text-emerald-500" />
                Common Queries
              </h2>
              <div className="space-y-3">
                {(searchQuery ? filteredFAQs : faqData).map((faq) => (
                  <details key={faq.id} className="group bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                    <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer font-bold text-sm md:text-base text-gray-900 list-none hover:bg-emerald-50/50 transition-colors">
                      {faq.question}
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="px-5 pb-5 text-xs md:text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
                  </details>
                ))}
                {searchQuery && filteredFAQs.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    No matches found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </motion.div>

          </div>

          {/* ─── Sidebar (1/3) ─── */}
          <div className="space-y-8">
            {/* 1. Support Promise */}
            <div className="bg-[var(--color-primary-deep)] rounded-[2.5rem] p-8 text-white shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Corporate Response
              </h3>
              <div className="space-y-6">
                {SUPPORT_PROMISE.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="mt-1">
                      <item.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-sm text-emerald-50/80 leading-relaxed font-medium">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Official Contact Numbers & Address */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
              <h2 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-500" />
                Company Details
              </h2>
              
              <div className="space-y-6">
                {/* Entity */}
                <div>
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">Registered Entity</h4>
                  <p className="text-sm font-bold text-gray-900">{settings.company_name}</p>
                </div>

                {/* Headquarters Address */}
                <div className="pt-6 border-t border-gray-50">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">Address</h4>
                  <div className="flex gap-3 items-start">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {settings.address}
                    </p>
                  </div>
                </div>

                {/* Contact Phone Numbers */}
                <div className="pt-6 border-t border-gray-50">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Official Phone Lines</h4>
                  <div className="space-y-4">
                    <a href={`tel:${settings.official_contact}`} className="flex items-center gap-3 text-xs font-bold text-gray-700 hover:text-[var(--color-primary)] transition-colors">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-tight">Official Number</div>
                        {settings.official_contact}
                      </div>
                    </a>
                    <a href={`tel:${settings.customer_care}`} className="flex items-center gap-3 text-xs font-bold text-gray-700 hover:text-[var(--color-primary)] transition-colors">
                      <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-tight">Customer Care</div>
                        {settings.customer_care}
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ───

interface EmailCardProps {
  title: string;
  email: string;
  description: string;
}

function EmailCard({ title, email, description }: EmailCardProps) {
  return (
    <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col gap-2 hover:border-emerald-100 hover:bg-emerald-50/10 transition-all">
      <div className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">{title}</div>
      <a href={`mailto:${email}`} className="text-sm font-bold text-[var(--color-primary-deep)] hover:text-[var(--color-primary)] transition-colors break-all">
        {email}
      </a>
      <p className="text-xs text-gray-500 leading-normal">{description}</p>
    </div>
  );
}
