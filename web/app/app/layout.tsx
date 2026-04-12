'use client';

import React from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { Footer } from '@/components/common/Footer';
import { AppGuard } from '@/components/auth/AppGuard';

// All /app/** pages get a solid sticky top navbar.
// The marketing floating-pill Navbar is NOT used here.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGuard>
      <div className="min-h-screen bg-[var(--color-bg-screen)] flex flex-col">
        {/* Solid sticky top bar for all authenticated pages */}
        <AppNavbar />

        <main className="flex-1 pt-32">
          {children}
        </main>

        <Footer />
      </div>
    </AppGuard>
  );
}
