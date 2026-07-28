'use client';

import { useState, useEffect } from 'react';
import { Hero } from '@/components/home/Hero';
import { LogoMarquee } from '@/components/home/LogoMarquee';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { Testimonials } from '@/components/home/Testimonials';
import { uiConfigService } from '@/services/api/uiConfigService';

export default function LandingPage() {
  const [showReviews, setShowReviews] = useState(true);
  const [partners, setPartners] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await uiConfigService.getCompanyGlobalConfig();
        if (config) {
          if (config.show_reviews !== undefined) {
            setShowReviews(config.show_reviews);
          }
          if (Array.isArray(config.partners_list)) {
            setPartners(config.partners_list);
          }
          if (Array.isArray(config.reviews_list)) {
            setReviews(config.reviews_list);
          }
        }
      } catch (err) {
        console.error('Failed to load landing page configs:', err);
      }
    };
    checkConfig();
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      <Hero />

      {/* Dynamic SDUI Services Preview Grid */}
      <ServicesPreview />

      {/* Trust Signals Section */}
      <section className="w-full bg-white py-12 sm:py-16 border-t border-gray-100 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-8 sm:mb-12 text-center px-4">
          Trusted by world class organizations
        </h2>
        
        <LogoMarquee partners={partners} />
      </section>

      {/* Testimonials Section */}
      {showReviews && <Testimonials reviews={reviews} />}

      {/* CTA Section */}
      <section className="w-full bg-[var(--color-bg-screen)] py-20 px-8 flex flex-col items-center justify-center text-center">
         <h2 className="text-4xl font-bold tracking-tight text-[var(--color-primary-deep)] mb-6">Ready to support your loved ones?</h2>
         <p className="text-gray-600 mb-10 max-w-2xl text-lg">Contact our team to learn more about our caregivers, doctors, and elder care platform.</p>
         <a
           href="/contact"
           className="bg-[var(--color-primary)] text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:scale-105 transition-transform active:scale-95 inline-block"
         >
           Contact Us
         </a>
      </section>
    </div>
  );
}
