import React from 'react';
import { Metadata } from 'next';
import { Heart, Globe, Users, Gift } from 'lucide-react';

export const metadata: Metadata = {
  title: "Community Care & Charity | Oldful",
  description: "Oldful's commitment to providing elderly care to the underprivileged and giving back to the community.",
};

export default function CommunityCarePage() {
  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        <header className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <Heart className="w-3.5 h-3.5" /> Giving Back
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">Community Care</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            At Oldful, we believe that quality elder care is a basic human right, not just a luxury. Our Community Care initiative is dedicated to reaching those who need us most but can afford us least.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Free Health Camps</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              We organize monthly health screening camps in rural and underprivileged urban areas, providing free check-ups, basic medication, and geriatric counseling to elders.
            </p>
          </div>
          <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Subsidized Care</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              A portion of every paid subscription goes towards subsidizing care for abandoned elders in community shelters, ensuring they receive dignity and medical attention.
            </p>
          </div>
        </section>

        <section className="bg-[var(--color-primary-deep)] rounded-[2.5rem] p-10 md:p-16 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <Globe className="w-12 h-12 text-emerald-400 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-6">Partner With Us</h2>
            <p className="text-emerald-50/80 mb-10 max-w-xl mx-auto leading-relaxed">
              If you represent an NGO, a community shelter, or wish to contribute to our mission of making healthcare accessible to every elder in India, we&apos;d love to hear from you.
            </p>
            <a 
              href="https://wa.me/918062180429?text=Hi%20Team%20Oldful,%20I'd%20love%20to%20know%20more%20about%20your%20Community%20Care%20and%20Charity%20initiatives!" 
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-white text-[var(--color-primary-deep)] px-8 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all"
            >
              Contact Impact Team
            </a>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </section>

        <div className="border-t border-gray-100 pt-8 pb-12">
            <p className="text-xs text-center text-gray-400 font-medium italic">
                &quot;The greatness of a community is most accurately measured by the compassionate actions of its members.&quot; — Coretta Scott King
            </p>
        </div>

      </div>
    </div>
  );
}
