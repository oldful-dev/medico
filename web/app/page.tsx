import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/home/Hero';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#FFFCF6] font-[var(--font-poppins)] overflow-hidden">
      <Navbar />
      <Hero />
      {/* 
        Step 4 requested building Other Pages:
        Home (Hero, Services Grid, Trust Signals, Testimonials, CTA)
        We will structure more sections below hero in future iterations,
        or we can load more SDUI driven generic components here.
      */}

      {/* Trust Signals Section */}
      <section className="w-full bg-white py-24 px-8 border-t border-gray-100 flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">Trusted by world class organizations</h2>
        <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
          {/* Mock Logos */}
          <div className="w-32 h-10 bg-gray-300 rounded-md"></div>
          <div className="w-32 h-10 bg-gray-300 rounded-md"></div>
          <div className="w-32 h-10 bg-gray-300 rounded-md"></div>
          <div className="w-32 h-10 bg-gray-300 rounded-md"></div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-[var(--color-bg-screen)] py-24 px-8 flex flex-col items-center justify-center text-center">
         <h2 className="text-4xl font-bold tracking-tight text-[var(--color-primary-deep)] mb-6">Ready to prioritize your health?</h2>
         <p className="text-gray-600 mb-10 max-w-2xl text-lg">Join 1.8M users today and get the best medical care directly at your fingertips.</p>
         <button className="bg-[var(--color-primary)] text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:scale-105 transition-transform">
           Get Started Now
         </button>
      </section>
    </main>
  );
}
