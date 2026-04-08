import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/common/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-screen)] font-[var(--font-poppins)]">
      <Navbar />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
