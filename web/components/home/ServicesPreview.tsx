'use client';

import React from 'react';
import Image from 'next/image';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';
import { getAssetUrl } from '@/utils/getAssetUrl';

export function ServicesPreview() {
  const { useHomeConfig } = useSDUIHooks();
  const { data: config, isLoading } = useHomeConfig();

  const previewServices = (config?.sections || [])
    .filter(s => s.enabled)
    .flatMap(s => s.services)
    .filter(s => s.enabled)
    .slice(0, 6);

  return (
    <section className="w-full bg-[#f8f9fc] py-16 px-4 flex flex-col items-center">
      <div className="max-w-5xl w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 px-4 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Our Core Services</h2>
            <p className="text-lg text-gray-500 max-w-xl">
              Everything you need to manage elder care right from your home, delivered by trusted professionals.
            </p>
          </div>
        </div>

        {isLoading || !config ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 px-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white/50 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 px-4">
            {previewServices.map(service => (
              // Static card — NOT clickable (landing page preview only)
              <div
                key={service.id}
                className="bg-white rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm border border-transparent"
              >
                <div className="w-20 h-20 mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Image
                    src={getAssetUrl(service.icon)}
                    alt={service.label}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-gray-800 text-lg leading-tight mb-2">
                  {service.label.replace('\n', ' ')}
                </span>
                <p className="text-sm text-gray-400 line-clamp-2">
                  Professional care delivered to your doorstep.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
