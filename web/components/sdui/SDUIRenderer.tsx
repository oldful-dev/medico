'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { HomeSection } from '@/services/firebase/sduiService';

// ─── Renderers ──────────────────────────────────────────────────────────────

interface SectionProps {
  section: HomeSection;
}

const QuickServices = memo(({ section }: SectionProps) => (
  <div className="mx-4 mt-4 bg-white rounded-2xl flex flex-row items-center justify-between py-3 px-2 shadow-[var(--shadow-card)]">
    {section.services.map((item) => (
      <Link
        key={item.id}
        href={item.route}
        className="flex-1 min-h-[85px] flex flex-col items-center justify-center bg-[var(--color-bg-card-muted)] rounded-xl py-2 mx-1 transition-all active:scale-95 hover:bg-gray-100 group"
      >
        <div className="w-11 h-11 relative mb-1 group-hover:scale-110 transition-transform">
          <Image
            src={getAssetUrl(item.icon)}
            alt={item.label}
            fill
            className="object-contain"
          />
        </div>
        <div className="flex flex-col items-center leading-3">
          {item.label.split('\n').map((line, i) => (
            <span key={i} className="font-medium text-[10px] text-[var(--color-primary-text)] text-center">
              {line}
            </span>
          ))}
        </div>
      </Link>
    ))}
  </div>
));

const ServiceGrid = memo(({ section }: SectionProps) => {
  const displayItems = section.services.slice(0, section.max_items || 6);

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-row justify-between items-center mb-4 px-1">
        <h2 className="font-bold text-[18px] text-[var(--color-primary-deep)] whitespace-pre-wrap">
          {section.title}
        </h2>
        {section.view_all_route && (
          <Link href={section.view_all_route} className="font-semibold text-[12px] text-[var(--color-text-light)] hover:text-[var(--color-primary)] transition-colors">
            View All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.route}
            className="flex flex-col mb-1 bg-[var(--color-bg-card-muted)] rounded-xl overflow-hidden items-center group transition-all border border-transparent hover:border-[var(--color-primary)]/20 hover:shadow-md"
          >
            <div className="w-full aspect-[1/0.75] relative overflow-hidden">
                <Image
                    src={getAssetUrl(item.icon)}
                    alt={item.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
            </div>
            <div className="flex-1 w-full px-1 flex flex-col items-center justify-center py-2 h-12">
              {item.label.split('\n').map((line, i) => (
                <span key={i} className="font-semibold text-[11px] text-[var(--color-primary-text)] text-center leading-[13px]">
                  {line}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

const EssentialsGrid = memo(({ section }: SectionProps) => {
  const displayItems = section.services.slice(0, section.max_items || 8);

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-row justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-[16px] text-[var(--color-primary-deep)]">
            {section.title}
        </h3>
        {section.view_all_route && (
          <Link href={section.view_all_route} className="font-medium text-[12px] text-[var(--color-text-light)] hover:underline">
            View All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.route}
            className="flex flex-col border border-[var(--color-accent)] rounded-lg items-center justify-center py-2 transition-all hover:bg-[var(--color-bg-card-muted)]"
          >
            <div className="w-10 h-10 relative rounded-full overflow-hidden flex items-center justify-center mb-1 bg-[rgba(4,131,87,0.05)]">
              <Image
                src={getAssetUrl(item.icon)}
                alt={item.label}
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="flex flex-col items-center leading-3">
                {item.label.split('\n').map((line, i) => (
                <span key={i} className="font-medium text-[9px] text-[var(--color-text-muted)] text-center leading-3">
                    {line}
                </span>
                ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

const TrustBadges = memo(({ section }: SectionProps) => (
  <div className="mx-4 mt-4 bg-white rounded-2xl py-5 px-2 shadow-[var(--shadow-card)] flex items-center justify-around divide-x divide-gray-100">
    {section.services.map((item) => (
      <div key={item.id} className="flex-1 flex flex-col items-center justify-center">
        <div className="w-10 h-10 relative mb-2 grayscale opacity-60">
           <Image 
             src={getAssetUrl(item.icon)} 
             fill 
             className="object-contain" 
             alt={item.label} 
           />
        </div>
        <span className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter leading-none px-1 h-6 flex items-center">
          {item.label}
        </span>
      </div>
    ))}
  </div>
));

// ─── Registry ────────────────────────────────────────────────────────────────

const COMPONENT_REGISTRY: Record<string, React.FC<SectionProps>> = {
  quick_services: QuickServices,
  service_grid: ServiceGrid,
  essentials_grid: EssentialsGrid,
  trust_badges: TrustBadges,
};

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const SDUIRenderer = memo(({ section }: SectionProps) => {
  if (!section.enabled) return null;

  const Renderer = COMPONENT_REGISTRY[section.type];
  if (!Renderer) return null;

  return <Renderer section={section} />;
});
