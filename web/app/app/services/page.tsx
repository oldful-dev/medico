'use client';

import React, { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';
import { getAssetUrl } from '@/utils/getAssetUrl';

export default function ServicesPage() {
  const { useHomeConfig } = useSDUIHooks();
  const { data: config, isLoading } = useHomeConfig();
  const [search, setSearch] = useState('');

  const allServices = (config?.sections || [])
    .flatMap(s => s.services)
    .filter(s => s.enabled);

  const filteredServices = allServices.filter(s => 
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-screen)]">
      <header className="px-6 pt-10 pb-6">
         <h1 className="text-2xl font-bold text-gray-800">Our Services</h1>
         <p className="text-sm text-gray-400 mt-1">Select the care you need today.</p>
         
         <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search services..."
              className="w-full h-12 bg-white rounded-xl pl-12 pr-4 outline-none border border-transparent focus:border-[var(--color-primary)]/30 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </header>

      <div className="flex-1 px-4 flex flex-col gap-6">
        {isLoading || !config ? (
           <div className="grid grid-cols-2 gap-4 pb-20">
             {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-white/50 animate-pulse rounded-2xl" />)}
           </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-32">
             {filteredServices.map((service) => (
               <Link 
                key={service.id}
                href={service.route}
                className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-transparent hover:border-[var(--color-primary)]/20 transition-all active:scale-95 group"
               >
                 <div className="w-16 h-16 relative rounded-2xl bg-[var(--color-bg-card-muted)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Image 
                      src={getAssetUrl(service.icon)} 
                      alt={service.label} 
                      width={40}
                      height={40}
                      className="object-contain" 
                    />
                 </div>
                 <span className="text-xs font-bold text-gray-700 leading-tight">
                    {service.label.replace('\n', ' ')}
                 </span>
                 <ChevronRight className="w-4 h-4 text-gray-300 mt-2" />
               </Link>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
