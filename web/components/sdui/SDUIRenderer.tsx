'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { HomeSection, HomeService } from '@/services/firebase/sduiService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const resolveImage = (iconName: string) => getAssetUrl(iconName);

// ─── Renderers ──────────────────────────────────────────────────────────────

interface SectionProps {
  section: HomeSection;
}

function QuickServices({ section }: SectionProps) {
  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl flex flex-row items-center justify-between py-3 px-2 shadow-[var(--shadow-card)]">
      {section.services.map((item) => (
        <Link
          key={item.id}
          href={item.route}
          className="flex-1 min-h-[85px] flex flex-col items-center justify-center bg-[var(--color-bg-card-muted)] rounded-xl py-2 mx-1 transition-transform active:scale-95 hover:bg-gray-100"
        >
          <img
            src={resolveImage(item.icon)}
            alt={item.label}
            className="w-11 h-11 mb-1 object-contain"
          />
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
  );
}

function ServiceGrid({ section }: SectionProps) {
  const displayItems = section.services.slice(0, section.max_items || 6);

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="font-bold text-[18px] text-[var(--color-primary-deep)] whitespace-pre-wrap">
          {section.title}
        </h2>
        {section.view_all_route && (
          <Link href={section.view_all_route} className="font-semibold text-[12px] text-[var(--color-text-light)] hover:underline">
            View All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.route}
            className="flex flex-col mb-3 bg-[var(--color-bg-card-muted)] rounded-md overflow-hidden items-center group transition-transform hover:scale-105"
          >
            <div className="w-full aspect-[1/0.85] overflow-hidden">
                <img
                src={resolveImage(item.icon)}
                alt={item.label}
                className="w-full h-full object-cover"
                />
            </div>
            <div className="flex-1 w-full px-1 flex flex-col items-center justify-center py-2">
              {item.label.split('\n').map((line, i) => (
                <span key={i} className="font-medium text-[12px] text-[var(--color-primary-text)] text-center leading-[14px]">
                  {line}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EssentialsGrid({ section }: SectionProps) {
  const displayItems = section.services.slice(0, section.max_items || 8);

  return (
    <div className="mx-4 mt-4 bg-white rounded-lg p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-row justify-between items-center mb-4">
        <h3 className="font-bold text-[16px] text-[var(--color-primary-deep)]">
            {section.title}
        </h3>
        {section.view_all_route && (
          <Link href={section.view_all_route} className="font-medium text-[12px] text-[var(--color-text-light)] hover:underline">
            View All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.route}
            className="flex flex-col border border-[var(--color-accent)] rounded items-center justify-center py-1.5 transition-colors hover:bg-gray-50"
          >
            <div className="w-[60%] aspect-square rounded-full overflow-hidden flex items-center justify-center mb-1 bg-white">
              <img
                src={resolveImage(item.icon)}
                alt={item.label}
                className="w-[80%] h-[80%] object-contain"
              />
            </div>
            <div className="flex flex-col items-center leading-3">
                {item.label.split('\n').map((line, i) => (
                <span key={i} className="font-medium text-[10px] text-[var(--color-text-muted)] text-center leading-3">
                    {line}
                </span>
                ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export function SDUIRenderer({ section }: SectionProps) {
  if (!section.enabled) return null;

  switch (section.type) {
    case 'quick_services':
      return <QuickServices section={section} />;
    case 'service_grid':
      return <ServiceGrid section={section} />;
    case 'essentials_grid':
      return <EssentialsGrid section={section} />;
    default:
      return null;
  }
}
