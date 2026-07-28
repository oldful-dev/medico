import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/common/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Ayuxa",
  description: "Comprehensive elder care management platform delivering healthcare to your door.",
  openGraph: {
    title: "Ayuxa",
    description: "Technology meets human empathy to keep your loved ones safe.",
    type: "website",
  }
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-screen)] font-[var(--font-poppins)]">
      <Navbar />
      <main className="flex-1 w-full pt-20 md:pt-24 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
