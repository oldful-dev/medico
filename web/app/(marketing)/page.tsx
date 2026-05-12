import { Hero } from '@/components/home/Hero';
import { LogoMarquee } from '@/components/home/LogoMarquee';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { Testimonials } from '@/components/home/Testimonials';
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

export default function LandingPage() {
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
        
        <LogoMarquee />
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* CTA Section */}
      <section className="w-full bg-[var(--color-bg-screen)] py-20 px-8 flex flex-col items-center justify-center text-center">
         <h2 className="text-4xl font-bold tracking-tight text-[var(--color-primary-deep)] mb-6">Ready to prioritize your health?</h2>
         <p className="text-gray-600 mb-10 max-w-2xl text-lg">Join 1.8M users today and get the best medical care directly at your fingertips.</p>
         <a
           href="/auth"
           className="bg-[var(--color-primary)] text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:scale-105 transition-transform active:scale-95 inline-block"
         >
           Get Started Now
         </a>
      </section>
    </div>
  );
}
