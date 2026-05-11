import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-8 bg-[#1A1A1A] text-gray-300 w-full pt-16 pb-8 px-6 font-[var(--font-poppins)] selection:bg-[var(--color-primary)] selection:text-white relative z-40">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand & Mission */}
        <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-11 h-11 relative">
              <Image
                src="/onlylogo.png"
                alt="ayuxacare Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">ayuxacare</span>
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
          <Link href="/app/services" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Services</Link>
          <Link href="/wellness" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Wellness</Link>
          <Link href="/blogs" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Blogs</Link>
          <Link href="/app/plans" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Homemaker Plans</Link>
          <Link href="/about" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">About Us</Link>
          <Link href="/careers" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Careers</Link>
          <Link href="/contact" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Contact</Link>
          <Link href="/community-care" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Community Care (Charity)</Link>
          <Link href="/team" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">ayuxacare Team (Management)</Link>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Legal</h3>
          <Link href="/terms" className="text-sm hover:text-white transition-colors w-fit">Terms & Conditions</Link>
          <Link href="/privacy" className="text-sm hover:text-white transition-colors w-fit">Privacy Policy</Link>
          <Link href="/service-policy" className="text-sm hover:text-white transition-colors w-fit">Service Policy</Link>
          <Link href="/refund" className="text-sm hover:text-white transition-colors w-fit">Refund Policy</Link>
          <Link href="/statutory-disclosures" className="text-sm hover:text-white transition-colors w-fit">Statutory Disclosures</Link>
          <Link href="/disclaimer" className="text-sm hover:text-white transition-colors w-fit">Disclaimer</Link>
        </div>

        {/* Contact Info (from PRD) */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Reach Out</h3>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Email Us</span>
            <a href="mailto:compliance@ayuxacare.com" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              compliance@ayuxacare.com
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Call Us (24/7 Support)</span>
            <a href="tel:+918062180429" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              +91 80621 80429
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Registered Office</span>
            <p className="text-sm leading-relaxed">
              No 402-B 1TF, ITI HBCS Layout,<br />
              Phase 3, Mysore Road,<br />
              Bangalore 560039
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            {/* Facebook */}
            <a href="https://www.facebook.com/ayuxacare/" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
            </a>
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/ayuxacare/" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} ayuxacare Gentlora Esteem LLP. All rights reserved.</p>
        <p className="text-xs text-gray-500 text-center md:text-right">Designed with empathy in Bangalore, India.</p>
      </div>
    </footer>
  );
}
