'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Heart, User, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', href: '/app/dashboard', icon: Home },
  { label: 'Plans', href: '/app/plans', icon: ClipboardList },
  { label: 'Wellness', href: '/app/wellness', icon: Heart },
  { label: 'Account', href: '/app/account', icon: User },
  { label: 'Cart', href: '/app/cart', icon: ShoppingCart },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-screen)] font-[var(--font-poppins)] overflow-hidden">
      
      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 md:pl-64">
        <div className="max-w-5xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-[var(--color-bg-header)] border-r border-gray-100 fixed left-0 top-0 z-30 shadow-[var(--shadow-header)]">
        <div className="p-8">
           <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none tracking-tighter">M</span>
            </div>
            <span className="text-[var(--color-primary-deep)] font-bold text-lg tracking-tight">Medico</span>
          </div>

          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                    isActive 
                    ? 'bg-[rgba(4,131,87,0.1)] text-[var(--color-primary)]' 
                    : 'text-gray-400 hover:text-[var(--color-primary)] hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-bg"
                      className="absolute left-0 w-1 h-6 bg-[var(--color-primary)] rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Matching Figma) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[83px] bg-[var(--color-bg-header)] flex items-center justify-around px-4 pb-4 border-t border-gray-100 shadow-[0_-4px_30px_rgba(30,30,30,0.1)] z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <div className={`relative p-1 transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[#AAAEAC]'}`}>
                <Icon className="w-6 h-6" />
                {isActive && (
                  <motion.div 
                    layoutId="active-tab-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full"
                  />
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-[var(--color-primary)]' : 'text-[#AAAEAC]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
