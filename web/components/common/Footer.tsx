import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-8 bg-[#1B1B1B] text-gray-300 w-full pt-16 pb-8 px-6 font-[var(--font-poppins)] selection:bg-[var(--color-primary)] selection:text-white relative z-40">
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
            Ayuxa Health Tech Platforms Pvt. Ltd.
          </p>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
            Address:
            <p className="text-xs text-gray-400 normal-case tracking-normal mt-1 leading-relaxed">
              No. 42, 3rd Main Road, Sector 7, HSR Layout, Bengaluru, Karnataka 560102
            </p>
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
            ISO 9001-2015 Certified
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Navigation</h3>
          <Link href="/" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Home</Link>
          <Link href="/about" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">About Us</Link>
          <Link href="/team" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Team</Link>
          <Link href="/community-care" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Community</Link>
          <Link href="/careers" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Careers</Link>
          <Link href="/blogs" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Blog</Link>
          <Link href="/contact" className="text-sm hover:text-[var(--color-primary)] transition-colors w-fit">Contact Us</Link>
        </div>

        {/* Legal Policies */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Legal</h3>
          <Link href="/privacy" className="text-sm hover:text-white transition-colors w-fit">Privacy Policy</Link>
          <Link href="/terms" className="text-sm hover:text-white transition-colors w-fit">Terms & Conditions</Link>
          <Link href="/refund" className="text-sm hover:text-white transition-colors w-fit">Refund & Cancellation Policy</Link>
          <Link href="/disclaimer" className="text-sm hover:text-white transition-colors w-fit">Disclaimer</Link>
          <Link href="/cookie-policy" className="text-sm hover:text-white transition-colors w-fit">Cookie Policy</Link>
          <Link href="/legal" className="text-sm hover:text-white transition-colors w-fit">Legal Information</Link>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Contact Information</h3>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Client Support</span>
            <a href="mailto:support@ayuxacare.com" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              support@ayuxacare.com
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Investor Relations</span>
            <a href="mailto:office@ayuxa.co.in" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              office@ayuxa.co.in
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Careers</span>
            <a href="mailto:careers@ayuxa.co.in" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              careers@ayuxa.co.in
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">General Enquiries</span>
            <a href="mailto:ho@ayuxa.co.in" className="text-sm text-[var(--color-primary)] hover:text-white transition-colors">
              ho@ayuxa.co.in
            </a>
          </div>

          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Official Contact Number</span>
            <a href="tel:+919480198108" className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              +91 94801 98108
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Customer Care</span>
            <a href="tel:08047280789" className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              080 4728 0789
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Ayuxa Health Tech Platforms Pvt. Ltd. All rights reserved. Copyright Information.</p>
        <p className="text-xs text-gray-500 text-center md:text-right">Designed with empathy in Bangalore, India.</p>
      </div>
    </footer>
  );
}
