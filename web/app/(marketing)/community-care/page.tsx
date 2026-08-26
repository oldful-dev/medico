'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Globe, Users, Gift, Loader2 } from 'lucide-react';

interface CommunityContent {
  title: string;
  description: string;
  charity_initiatives: string[];
}

const FALLBACK_CONTENT: CommunityContent = {
  title: "Ayuxa Community Initiatives",
  description: "At Ayuxa, we believe that quality elder care is a basic human right, not just a luxury. Our Community Care initiative is dedicated to reaching those who need us most but can afford us least.",
  charity_initiatives: [
    "Free Health Camps: We organize monthly health screening camps in rural and underprivileged urban areas, providing free check-ups, basic medication, and geriatric counseling to elders.",
    "Subsidized Care: A portion of every paid subscription goes towards subsidizing care for abandoned elders in community shelters, ensuring they receive dignity and medical attention."
  ]
};

export default function CommunityCarePage() {
  const [content, setContent] = useState<CommunityContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';
        const res = await fetch(`${apiUrl}/ui-config/published?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        let resolved = FALLBACK_CONTENT;
        if (json.success && json.data) {
          const found = json.data.find((c: { key: string }) => c.key === "company_global_config");
          if (found && found.configJson) {
            let parsed = found.configJson;
            if (typeof parsed === "string") {
              try { parsed = JSON.parse(parsed); } catch {}
            }
            if (parsed?.community_content) {
              const cc = parsed.community_content;
              resolved = {
                title: cc.title || FALLBACK_CONTENT.title,
                description: cc.description || FALLBACK_CONTENT.description,
                charity_initiatives: cc.charity_initiatives && cc.charity_initiatives.length > 0
                  ? cc.charity_initiatives
                  : FALLBACK_CONTENT.charity_initiatives
              };
            }
          }
        }
        setContent(resolved);
      } catch (err) {
        console.error("Failed to load community content:", err);
        setContent(FALLBACK_CONTENT);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading || !content) {
    return (
      <div className="bg-[#FFFCF6] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        <header className="text-center mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Heart className="w-3.5 h-3.5" /> Giving Back
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight"
          >
            {content.title.split(/(Community)/i).map((part, i) =>
              part.toLowerCase() === 'community'
                ? <span key={i} className="text-[var(--color-primary)]">{part}</span>
                : part
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            {content.description}
          </motion.p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.charity_initiatives.map((item, index) => {
            const hasColon = item.includes(':');
            const title = hasColon ? item.split(':')[0] : `Initiative ${index + 1}`;
            const desc = hasColon ? item.substring(item.indexOf(':') + 1).trim() : item;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  {index % 2 === 0 ? <Users className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            );
          })}
        </section>

        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-[var(--color-primary-deep)] rounded-[2.5rem] p-10 md:p-16 text-white text-center relative overflow-hidden"
        >
          <div className="relative z-10">
            <Globe className="w-12 h-12 text-emerald-400 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-6">Partner With Us</h2>
            <p className="text-emerald-50/80 mb-10 max-w-xl mx-auto leading-relaxed">
              If you represent an NGO, a community shelter, or wish to contribute to our mission of making healthcare accessible to every elder in India, we&apos;d love to hear from you.
            </p>
            <a
              href="https://wa.me/919480198108?text=Hi%20Team%20Ayuxa,%20I'd%20love%20to%20know%20more%20about%20your%20Community%20Care%20and%20Charity%20initiatives!"
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-white text-[var(--color-primary-deep)] px-8 py-4 rounded-2xl font-bold hover:shadow-2xl active:scale-95 transition-all"
            >
              Contact Impact Team
            </a>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t border-gray-100 pt-8 pb-12"
        >
            <p className="text-xs text-center text-gray-400 font-medium italic">
                &quot;The greatness of a community is most accurately measured by the compassionate actions of its members.&quot; — Coretta Scott King
            </p>
        </motion.div>

      </div>
    </div>
  );
}
