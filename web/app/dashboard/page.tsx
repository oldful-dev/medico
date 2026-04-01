'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { sduiService, HomeConfig } from '@/services/firebase/sduiService';
import { SDUIRenderer } from '@/components/sdui/SDUIRenderer';
import { getAssetUrl } from '@/utils/getAssetUrl';

export default function DashboardPage() {
  const [config, setConfig] = useState<HomeConfig | null>(null);

  useEffect(() => {
    async function load() {
      await sduiService.init();
      setConfig(sduiService.getHomeConfig());
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] font-[var(--font-poppins)]">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-4">
        
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, User</h1>
              <p className="text-sm text-gray-500 mt-1">Ready to manage your health today?</p>
            </div>
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full text-white flex items-center justify-center font-bold text-lg">
                U
            </div>
        </div>

        {!config ? (
           <div className="flex-1 flex items-center justify-center min-h-[300px]">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
            {/* Main SDUI Stream */}
            <div className="flex flex-col gap-6">
                
                {/* Desktop SDUI Banner override */}
                {config.banners[0]?.enabled && (
                    <div className="w-full h-[160px] relative rounded-2xl overflow-hidden shadow-sm cursor-pointer border border-gray-100/50">
                        <img
                            src={getAssetUrl(config.banners[0].image)}
                            alt={config.banners[0].title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 px-8 flex flex-col justify-center bg-gradient-to-r from-black/60 to-transparent">
                            <h2 className="text-white font-bold text-2xl max-w-[280px]">{config.banners[0].title}</h2>
                            {config.banners[0].subtitle && <p className="text-white/80 mt-2">{config.banners[0].subtitle}</p>}
                        </div>
                    </div>
                )}

                {/* SDUI Core sections expanded for standard web */}
                {config.sections.map((section) => (
                    <div key={section.id} className="-mx-4 md:mx-0">
                         <SDUIRenderer section={section} />
                    </div>
                ))}
            </div>

            {/* Right Sidebar */}
            <div className="flex flex-col gap-6">
                 {/* Quick actions or local context */}
                 <div className="bg-gradient-to-b from-[#F2FCE8] to-white border border-[#E0EBC9] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-[var(--color-primary-deep)] mb-4">Vital Shortcuts</h3>
                    <div className="flex flex-col gap-3">
                        <button className="bg-white border text-left px-4 py-3 rounded-lg text-sm font-semibold hover:border-[var(--color-primary)] transition-all flex items-center justify-between group">
                            Book a Video Consult
                            <span className="text-gray-300 group-hover:text-[var(--color-primary)]">→</span>
                        </button>
                        <button className="bg-white border text-left px-4 py-3 rounded-lg text-sm font-semibold hover:border-[var(--color-primary)] transition-all flex items-center justify-between group">
                            Order Medicines
                            <span className="text-gray-300 group-hover:text-[var(--color-primary)]">→</span>
                        </button>
                    </div>
                 </div>

                 {/* Trust Badges via SDUI */}
                 {config.trust_badges?.filter(b => b.enabled).length > 0 && (
                     <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 text-sm">Why Choose Us</h3>
                        <div className="flex flex-col gap-4">
                            {config.trust_badges.map(badge => (
                                <div key={badge.id} className="flex items-center gap-3">
                                    <img src={getAssetUrl(badge.icon)} className="w-8 h-8 object-contain" alt={badge.label} />
                                    <span className="text-sm font-medium text-gray-600">{badge.label}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                 )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
