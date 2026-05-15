import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-8 bg-[#1A1A1A] text-gray-300 w-full pt-16 pb-8 px-6 font-[var(--font-poppins)] selection:bg-[var(--color-primary)] selection:text-white relative z-40">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand & Mission */}
        <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 relative">
              <Image
                src="/onlylogo.png"
                alt="Ayuxa Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Ayuxa</span>
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
          <Link href="/team" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Ayuxa Team (Management)</Link>
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
            <a href="mailto:compliance@ayuxa.co.in" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              compliance@ayuxa.co.in
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
            {/* Instagram */}
            <a href="https://www.instagram.com/ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.117.6c-.779.263-1.438.648-2.087 1.297-.648.649-1.033 1.308-1.297 2.087-.266.788-.468 1.658-.527 3.937C.04 8.333.025 8.74.025 12c0 3.26.015 3.667.072 4.947.061 1.278.262 2.148.529 2.936.264.788.649 1.447 1.298 2.096.649.649 1.308 1.034 2.087 1.298.788.266 1.658.467 2.936.528 1.28.06 1.687.075 4.947.075s3.668-.015 4.947-.072c1.278-.06 2.148-.262 2.936-.529.788-.264 1.447-.649 2.096-1.298.649-.649 1.034-1.308 1.298-2.087.266-.788.467-1.658.528-2.936.06-1.28.075-1.687.075-4.947s-.015-3.667-.072-4.947c-.06-1.278-.262-2.148-.529-2.936-.264-.788-.649-1.447-1.298-2.096-.649-.649-1.308-1.034-2.087-1.298-.788-.266-1.658-.467-2.936-.528C15.667.048 15.26.035 12 .035zm0 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.246 2.227.408.56.217.96.477 1.382.896.419.42.679.822.896 1.381.162.422.354 1.057.408 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.246 1.805-.408 2.227-.217.56-.477.96-.896 1.382-.42.419-.822.679-1.381.896-.422.162-1.057.354-2.227.408-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.246-2.227-.408-.56-.217-.96-.477-1.382-.896-.419-.42-.679-.822-.896-1.381-.162-.422-.354-1.057-.408-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.246-1.805.408-2.227.217-.56.477-.96.896-1.382.42-.419.822-.679 1.381-.896.422-.162 1.057-.354 2.227-.408 1.266-.058 1.646-.07 4.85-.07z" /><circle cx="12" cy="12" r="3.605" /></svg>
            </a>
            {/* Facebook */}
            <a href="https://www.facebook.com/ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
            </a>
            {/* YouTube */}
            <a href="https://www.youtube.com/@ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
            </a>
            {/* X (Twitter) */}
            <a href="https://x.com/ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.207-6.807-5.974 6.807H2.882l7.728-8.835L1.1 2.25h6.82l4.713 6.231 5.429-6.231zM17.15 18.75h1.829L5.293 3.75H3.3l13.85 15z" /></svg>
            </a>
            {/* Threads */}
            <a href="https://www.threads.net/@ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.001 2.001c5.519 0 10 4.481 10 10s-4.481 10-10 10-10-4.481-10-10 4.481-10 10-10zm6.406 10.844c-.468-2.009-2.124-3.502-4.156-3.502-1.032 0-1.968.375-2.687.987-.719-.612-1.655-.987-2.687-.987-2.032 0-3.688 1.493-4.156 3.502H4.5v.156c0 3.844 3.031 6.969 6.75 6.969s6.75-3.125 6.75-6.969v-.156h-1.593zm-4.656 4.688c-1.438 0-2.625-1.156-2.625-2.625s1.188-2.625 2.625-2.625 2.625 1.156 2.625 2.625-1.188 2.625-2.625 2.625z" /></svg>
            </a>
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/ayuxacare" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Ayuxa Gentlora Esteem LLP. All rights reserved.</p>
        <p className="text-xs text-gray-500 text-center md:text-right">Designed with empathy in Bangalore, India.</p>
      </div>
    </footer>
  );
}
