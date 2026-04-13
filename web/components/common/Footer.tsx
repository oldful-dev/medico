import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-gray-300 w-full pt-16 pb-8 px-6 font-[var(--font-poppins)] selection:bg-[var(--color-primary)] selection:text-white relative z-40">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand & Mission */}
        <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
           <div className="flex items-center gap-4 mb-2">
            <div className="w-11 h-11 relative">
              <Image
                src="/olfful-logo.png"
                alt="Oldful Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Oldful</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed pr-4">
            Comprehensive elder care management platform, combining technology with human empathy to keep your loved ones safe, healthy, and happy.
          </p>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
            ISO 9001-2015 Certified
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Quick Links</h3>
          <Link href="/" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Home</Link>
          <Link href="/services" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Services</Link>
          <Link href="/plans" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Homemaker Plans</Link>
          <Link href="/about" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">About Us</Link>
          <Link href="/careers" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Careers</Link>
          <Link href="/contact" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Contact</Link>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Legal</h3>
          <Link href="/terms" className="text-sm hover:text-white transition-colors w-fit">Terms & Conditions</Link>
          <Link href="/privacy" className="text-sm hover:text-white transition-colors w-fit">Privacy Policy</Link>
          <Link href="/about#refund" className="text-sm hover:text-white transition-colors w-fit">Refund Policy</Link>
          <Link href="/about#statutory" className="text-sm hover:text-white transition-colors w-fit">Statutory Disclosures</Link>
        </div>

        {/* Contact Info (from PRD) */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Reach Out</h3>
          <div className="flex flex-col gap-1">
             <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Email Us</span>
             <a href="mailto:compliance@oldful.com" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
               compliance@oldful.com
             </a>
          </div>
          <div className="flex flex-col gap-1">
             <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Call Us (24/7 Support)</span>
             <a href="tel:+919480198108" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
               +91 94801-98108
             </a>
          </div>
          <div className="flex gap-4 mt-2">
            {/* Minimal Social Icons */}
            <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
               <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
            <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
               <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
         <p className="text-xs text-gray-500">© {new Date().getFullYear()} Oldful Gentlora Esteem LLP. All rights reserved.</p>
         <p className="text-xs text-gray-500 text-center md:text-right">Designed with empathy in Bangalore, India.</p>
      </div>
    </footer>
  );
}
