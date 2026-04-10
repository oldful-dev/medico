'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, ArrowRight, Clock, Star, ChevronRight } from 'lucide-react';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';
import { getAssetUrl } from '@/utils/getAssetUrl';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  medical: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  therapy: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  diagnostic: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  emergency: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const SERVICE_META: Record<string, { price: string; duration: string; rating: string }> = {
  default: { price: '₹299', duration: '60 min', rating: '4.8' },
};

export default function ServicesPage() {
  const { useHomeConfig } = useSDUIHooks();
  const { data: config, isLoading } = useHomeConfig();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const sections = config?.sections || [];

  const categoryNames = useMemo(() => {
    return ['All', ...sections.map(s => s.title || 'Other').filter(Boolean)];
  }, [sections]);

  const filteredSections = useMemo(() => {
    return sections.map(section => ({
      ...section,
      services: (section.services || [])
        .filter(s => s.enabled)
        .filter(s => s.label.toLowerCase().includes(search.toLowerCase())),
    })).filter(section => {
      if (activeCategory !== 'All' && section.title !== activeCategory) return false;
      return section.services.length > 0;
    });
  }, [sections, search, activeCategory]);

  const totalCount = filteredSections.reduce((acc, s) => acc + s.services.length, 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Health Services</h1>
          <p className="text-gray-500 text-base">Professional healthcare delivered to your doorstep — certified doctors &amp; caregivers.</p>
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services, symptoms, specializations..."
              className="w-full h-12 bg-white rounded-xl pl-11 pr-4 text-sm outline-none border border-gray-200 focus:border-[var(--color-primary)] shadow-sm transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 h-12 px-5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 shadow-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* ── Category Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {categoryNames.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[var(--color-primary-deep)] text-white border-[var(--color-primary-deep)] shadow-md shadow-emerald-900/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        {!isLoading && (
          <p className="text-sm text-gray-500 mb-6">
            Showing <span className="font-semibold text-gray-800">{totalCount}</span> services
            {search && <> for "<span className="text-[var(--color-primary)] font-semibold">{search}</span>"</>}
          </p>
        )}

        {/* ── Service Sections ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 bg-white animate-pulse rounded-2xl border border-gray-100" />
            ))}
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No services found</h3>
            <p className="text-gray-500 text-sm">Try a different search term or category.</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); }} className="mt-4 text-sm text-[var(--color-primary)] font-semibold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {filteredSections.map((section, si) => {
              const colors = Object.values(CATEGORY_COLORS)[si % Object.keys(CATEGORY_COLORS).length];
              return (
                <div key={section.id}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {section.services.length} services
                    </span>
                  </div>

                  {/* Services grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {section.services.map(service => {
                      const meta = SERVICE_META[service.id] || SERVICE_META.default;
                      return (
                        <Link
                          key={service.id}
                          href={service.route}
                          className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[var(--color-primary)]/20 transition-all overflow-hidden"
                        >
                          {/* Card top — icon area */}
                          <div className={`${colors.bg} p-6 flex items-center justify-center`}>
                            <div className="w-16 h-16 relative group-hover:scale-110 transition-transform duration-300">
                              <Image
                                src={getAssetUrl(service.icon)}
                                alt={service.label}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>

                          {/* Card body */}
                          <div className="p-4">
                            <h3 className="font-bold text-gray-900 text-sm mb-1">
                              {service.label.replace('\n', ' ')}
                            </h3>
                            <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
                              Expert care at home by certified professionals.
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {meta.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {meta.rating}
                              </span>
                              <span className="font-bold text-[var(--color-primary)]">from {meta.price}</span>
                            </div>

                            {/* CTA */}
                            <div className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold ${colors.text} ${colors.bg} group-hover:bg-[var(--color-primary-deep)] group-hover:text-white transition-all`}>
                              Book Now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
