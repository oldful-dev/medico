'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { SDUIRenderer } from '@/components/sdui/SDUIRenderer';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';

const Header = memo(() => (
  <header className="px-6 pt-10 pb-6">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 leading-tight">
          Good Morning,<br/>Heena
        </h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          15 Sep, 2024 • Monday
        </p>
      </div>
      <div className="flex gap-2">
        <button className="bg-[var(--color-sos-red)] rounded-lg px-3 py-1.5 shadow-md active:scale-95 transition-transform flex items-center justify-center">
          <span className="text-white text-[10px] font-bold tracking-widest">SOS</span>
        </button>
        <div className="w-10 h-10 relative rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
          <Image 
            src="https://i.pravatar.cc/100?img=33" 
            alt="Profile" 
            fill 
            className="object-cover" 
          />
        </div>
      </div>
    </div>
  </header>
));

Header.displayName = 'Header';

const Banner = memo(({ banner }: { banner: any }) => (
  <div className="mx-4 mt-2 h-[130px] relative rounded-2xl overflow-hidden shadow-sm group cursor-pointer active:scale-[0.98] transition-all">
    <Image
      src={getAssetUrl(banner.image)}
      alt={banner.title}
      fill
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      sizes="(max-w-768px) 100vw, 800px"
      priority
    />
    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-center px-6">
      <h2 className="text-white font-bold text-lg leading-tight max-w-[180px]">
        {banner.title}
      </h2>
      {banner.subtitle && (
        <p className="text-white/80 text-xs mt-1 font-medium italic opacity-0 group-hover:opacity-100 transition-opacity">
          {banner.subtitle}
        </p>
      )}
    </div>
  </div>
));

Banner.displayName = 'Banner';

export default function DashboardPage() {
  const { useHomeConfig } = useSDUIHooks();
  const { data: config, isLoading } = useHomeConfig();

  if (isLoading || !config) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-screen)]">
        <Header />
        <div className="mx-4 h-[130px] bg-gray-100 animate-pulse rounded-2xl mt-2 mb-6" />
        <div className="grid grid-cols-4 gap-2 mx-4 mb-8">
           {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-gray-50 animate-pulse rounded-xl" />)}
        </div>
        <div className="mx-4 h-40 bg-gray-50 animate-pulse rounded-2xl mb-8" />
        <div className="mx-4 h-64 bg-gray-50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--color-bg-screen)] pb-12">
      <Header />
      
      {config.banners?.length > 0 && config.banners[0].enabled && (
        <Banner banner={config.banners[0]} />
      )}

      <div className="flex flex-col gap-4">
        {config.sections.map((section) => (
          <SDUIRenderer key={section.id} section={section} />
        ))}
      </div>

      {/* Decorative Padding */}
      <div className="h-6" />
    </div>
  );
}
