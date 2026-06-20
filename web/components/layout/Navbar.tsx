'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/team', label: 'Team', hasDropdown: true },
  { href: '/community-care', label: 'Community' },
  { href: '/careers', label: 'Careers' },
  { href: '/blogs', label: 'Blog' },
  { href: '/contact', label: 'Contact Us' },
];

const TEAM_SUB_LINKS = [
  { href: '/team#management', label: 'Management' },
  { href: '/team#shareholders', label: 'Shareholders' },
  { href: '/team#doctors', label: 'Doctors' },
  { href: '/team#nurses', label: 'Nurses' },
  { href: '/team#caregivers', label: 'Caregivers' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isMobileTeamOpen, setIsMobileTeamOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active link detection
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`z-[60] transition-all duration-300 flex items-center justify-between mx-auto backdrop-blur-xl fixed ${isScrolled
            ? 'top-4 left-4 right-4 sm:left-6 sm:right-6 max-w-6xl px-4 sm:px-6 py-2 bg-white/80 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/20'
            : 'top-0 left-0 right-0 w-full px-4 sm:px-8 py-4 bg-transparent'
          }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <div className={`relative transition-all duration-300 ${isScrolled ? 'h-10 w-28' : 'h-14 w-36'}`}>
            <Image src="/PNG TRANS.png" alt="Ayuxa Logo" fill className="object-contain" priority />
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 justify-center flex-1">
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            if (link.hasDropdown) {
              return (
                <div 
                  key={link.href}
                  className="relative py-2"
                  onMouseEnter={() => setIsTeamDropdownOpen(true)}
                  onMouseLeave={() => setIsTeamDropdownOpen(false)}
                >
                  <button
                    className={`flex items-center gap-1 font-semibold text-xs lg:text-sm transition-colors ${active || isTeamDropdownOpen
                        ? 'text-[var(--color-primary-deep)]'
                        : 'text-gray-500 hover:text-[var(--color-primary)]'
                      }`}
                  >
                    {link.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isTeamDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                      >
                        {TEAM_SUB_LINKS.map(subLink => (
                          <Link
                            key={subLink.href}
                            href={subLink.href}
                            onClick={() => setIsTeamDropdownOpen(false)}
                            className="block px-4 py-2.5 text-xs lg:text-sm font-medium text-gray-600 hover:bg-emerald-50 hover:text-[var(--color-primary-deep)] transition-colors"
                          >
                            {subLink.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {active && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute -bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full"
                    />
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-semibold text-xs lg:text-sm transition-colors ${active
                    ? 'text-[var(--color-primary-deep)]'
                    : 'text-gray-500 hover:text-[var(--color-primary)]'
                  }`}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side contact CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className={`hidden md:inline-block text-white bg-[var(--color-primary-deep)] rounded-full font-bold hover:opacity-95 transition-all active:scale-[0.98] ${isScrolled ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'}`}
          >
            Contact Us
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 text-[var(--color-primary-deep)] hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsMobileMenuOpen(v => !v)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed md:hidden z-50 left-4 right-4 bg-white/98 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden ${isScrolled ? 'top-20' : 'top-24'}`}
          >
            <div className="flex flex-col p-4 max-h-[80vh] overflow-y-auto">
              {NAV_LINKS.map(link => {
                const active = isActive(link.href);
                if (link.hasDropdown) {
                  return (
                    <div key={link.href} className="flex flex-col">
                      <button
                        onClick={() => setIsMobileTeamOpen(v => !v)}
                        className={`w-full py-3 px-4 flex items-center justify-between font-semibold text-sm border-b border-gray-50 rounded-lg transition-colors ${active
                            ? 'text-[var(--color-primary-deep)]'
                            : 'text-gray-700 hover:text-[var(--color-primary)]'
                          }`}
                      >
                        <span>{link.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMobileTeamOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isMobileTeamOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-emerald-50/50 rounded-xl mx-2 my-1"
                          >
                            {TEAM_SUB_LINKS.map(subLink => (
                              <Link
                                key={subLink.href}
                                href={subLink.href}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setIsMobileTeamOpen(false);
                                }}
                                className="block py-2.5 px-6 text-xs font-semibold text-gray-600 hover:text-[var(--color-primary-deep)] transition-colors"
                              >
                                {subLink.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`py-3 px-4 flex items-center gap-3 font-semibold text-sm border-b border-gray-50 last:border-0 rounded-lg transition-colors ${active
                        ? 'text-[var(--color-primary-deep)]'
                        : 'text-gray-700 hover:text-[var(--color-primary)]'
                      }`}
                  >
                    {link.label}
                    {active && <div className="ml-auto w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />}
                  </Link>
                );
              })}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center bg-[var(--color-primary-deep)] text-white py-3 rounded-full text-sm font-semibold shadow-lg active:scale-95 transition-all"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
