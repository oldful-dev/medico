'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/plans", label: "Plans" },
  { href: "/wellness", label: "Wellness" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About Us" }
];

export function Navbar() {
  const { isAuthenticated, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`z-[60] transition-all duration-300 flex items-center justify-between mx-auto backdrop-blur-md ${
          isScrolled 
            ? 'fixed top-4 left-0 right-0 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-5xl px-3 sm:px-6 py-2 sm:py-3 bg-white/95 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E5E5CA]/50'
            : 'absolute top-0 left-0 right-0 w-full max-w-7xl px-4 sm:px-8 py-4 sm:py-6 bg-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`flex items-center justify-center bg-[var(--color-primary)] rounded-full transition-all ${isScrolled ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'}`}>
            <span className={`text-white font-bold leading-none -mt-0.5 sm:-mt-1 tracking-tighter ${isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>M</span>
          </div>
          <span className={`text-[var(--color-primary-deep)] font-bold tracking-tight hidden sm:block ${isScrolled ? 'text-lg' : 'text-xl'}`}>Medico</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
          {NAV_LINKS.map(link => (
             <Link key={link.href} href={link.href} className={`font-medium ${link.label === 'Home' ? 'text-[var(--color-primary-deep)] font-semibold' : 'text-gray-500'} text-xs lg:text-sm hover:text-[var(--color-primary)] transition-colors`}>{link.label}</Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-1.5 text-[var(--color-primary-deep)] hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden md:block">
            {isAuthenticated ? (
              <button 
                onClick={logout}
                className={`bg-[var(--color-primary-deep)] text-white rounded-full font-semibold hover:bg-[var(--color-primary)] transition-all shadow-[0_4px_14px_rgba(4,131,87,0.3)] hover:shadow-[0_6px_20px_rgba(4,131,87,0.4)] active:scale-95 ${isScrolled ? 'px-4 py-1.5 text-[11px] sm:text-xs' : 'px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm'}`}
              >
                Logout
              </button>
            ) : (
              <Link 
                href="/auth"
                className={`bg-[var(--color-primary-deep)] text-white rounded-full font-semibold hover:bg-[var(--color-primary)] transition-all shadow-[0_4px_14px_rgba(4,131,87,0.3)] hover:shadow-[0_6px_20px_rgba(4,131,87,0.4)] active:scale-95 ${isScrolled ? 'px-4 py-1.5 text-[11px] sm:text-xs' : 'px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm'}`}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed md:hidden z-50 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-b-3xl rounded-t-xl shadow-2xl border border-gray-100 overflow-hidden ${isScrolled ? 'top-20' : 'top-24'}`}
          >
            <div className="flex flex-col p-4">
              {NAV_LINKS.map(link => (
                 <Link 
                   key={link.href} 
                   href={link.href}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="py-3 px-4 text-gray-700 font-medium text-sm border-b border-gray-50 last:border-0 hover:bg-[#E6F3EE] hover:text-[var(--color-primary)] rounded-lg transition-colors"
                 >
                   {link.label}
                 </Link>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-100 px-4">
                {isAuthenticated ? (
                  <button 
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-[var(--color-primary-deep)] text-white py-3 rounded-full text-sm font-semibold shadow-lg active:scale-95 transition-all outline-none"
                  >
                    Logout
                  </button>
                ) : (
                  <Link 
                    href="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center bg-[var(--color-primary-deep)] text-white py-3 rounded-full text-sm font-semibold shadow-lg active:scale-95 transition-all outline-none"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
