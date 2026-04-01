'use client';

import { useEffect, useState } from 'react';
import { sduiService, HomeConfig } from '@/services/firebase/sduiService';
import { SDUIRenderer } from '@/components/sdui/SDUIRenderer';
import { getAssetUrl } from '@/utils/getAssetUrl';

export function DashboardMock() {
  const [config, setConfig] = useState<HomeConfig | null>(null);

  useEffect(() => {
    async function load() {
      await sduiService.init();
      setConfig(sduiService.getHomeConfig());
    }
    load();
  }, []);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-full bg-[var(--color-bg-screen)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-transparent border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const activeBanner = config.banners[0];

  return (
    <div className="flex-1 bg-[var(--color-bg-screen)] pb-6 overflow-y-auto no-scrollbar relative max-h-full">
      {/* HEADER MOCK (can be moved to a Header component) */}
      <div className="bg-[var(--color-bg-header)] shadow-[var(--shadow-header)] px-4 py-4 flex items-center justify-between z-10 sticky top-0 rounded-b-xl border-b border-gray-100/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 font-medium">Current Location</span>
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
            Bengaluru 
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </span>
        </div>
        <div className="flex gap-2">
          <div className="bg-[var(--color-sos-red)] rounded px-2.5 py-1 flex items-center justify-center shadow-sm cursor-pointer hover:bg-red-600 transition-colors">
            <span className="text-white text-[9px] font-bold tracking-wider">SOS</span>
          </div>
          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-300">
             <img src="https://i.pravatar.cc/100?img=33" alt="user" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
          <h1 className="text-gray-800 font-bold text-lg leading-tight">Good Morning,<br/>Heena</h1>
          <p className="text-gray-400 text-[10px] uppercase font-semibold mt-1 tracking-wide">15 Sep, 2024 • Monday</p>
      </div>

      {/* BANNER */}
      {activeBanner && activeBanner.enabled && (
        <div className="w-[calc(100%-2rem)] h-[100px] relative mt-4 mx-4 rounded-xl overflow-hidden shadow-sm cursor-pointer">
          <img
            src={getAssetUrl(activeBanner.image)}
            alt={activeBanner.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 px-4 flex flex-col justify-center bg-black/10">
            <h2 className="text-white font-bold text-sm max-w-[150px]">{activeBanner.title}</h2>
          </div>
        </div>
      )}

      {/* SECTIONS */}
      {config.sections.map((section) => (
        <SDUIRenderer key={section.id} section={section} />
      ))}
      
      {/* Pad bottom for aesthetic */}
      <div className="h-10"></div>
    </div>
  );
}
