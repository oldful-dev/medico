'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingCart, User as UserIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

const GUEST_LINKS = [
  { href: '/',             label: 'Home' },
  { href: '/wellness',      label: 'Wellness' },
  { href: '/plans',        label: 'Plans' },
  { href: '/app/services', label: 'Services' },
  { href: '/about',        label: 'About' },
  { href: '/contact',      label: 'Contact' },
];

const AUTH_LINKS = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/services',  label: 'Services' },
  { href: '/wellness',      label: 'Wellness' },
  { href: '/plans',         label: 'Plans' },
];

export function Navbar() {
  const { isAuthenticated, isLoading, logout, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const NAV_LINKS = isAuthenticated ? AUTH_LINKS : GUEST_LINKS;

  // Active link detection — supports nested routes (e.g. /app/services/doctor-visit)
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`z-[60] transition-all duration-300 flex items-center justify-between mx-auto backdrop-blur-xl fixed ${
          isScrolled
            ? 'top-4 left-4 right-4 sm:left-6 sm:right-6 max-w-6xl px-4 sm:px-6 py-2 bg-white/70 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20'
            : 'top-0 left-0 right-0 w-full px-4 sm:px-8 py-4 bg-transparent'
        }`}
      >
        {/* Logo */}
        <Link href={isAuthenticated ? '/app/dashboard' : '/'} className="flex items-center gap-1.5 sm:gap-2 group">
          <div className={`relative transition-all duration-300 ${isScrolled ? 'w-10 h-10' : 'w-14 h-14'}`}>
            <Image src="/olfful-logo.png" alt="Oldful Logo" fill className="object-contain" priority />
          </div>
          <span className={`text-[var(--color-primary-deep)] font-bold tracking-tight hidden sm:block transition-all duration-300 ${isScrolled ? 'text-xl' : 'text-2xl'}`}>
            Oldful
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className={`hidden md:flex items-center gap-5 lg:gap-8 ${isAuthenticated ? 'flex-1 justify-center' : ''}`}>
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-semibold text-xs lg:text-sm transition-colors ${
                  active
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

        {/* Desktop right actions */}
        <div className="flex items-center gap-2">
          {/* Mobile toggle */}
          <button
            className="md:hidden p-1.5 text-[var(--color-primary-deep)] hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsMobileMenuOpen(v => !v)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            {isLoading ? (
              <div className="w-9 h-9 bg-gray-100 rounded-full animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Avatar */}
                <button
                  onClick={() => router.push('/app/account')}
                  className={`rounded-full font-bold text-[var(--color-primary-deep)] flex items-center justify-center overflow-hidden border-2 transition-all duration-300 ${
                    pathname === '/app/account'
                      ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 scale-105 border-transparent shadow-emerald-200'
                      : 'border-white/40 shadow-sm hover:shadow-md'
                  } ${isScrolled ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}`}
                >
                  {user?.profileImageUrl ? (
                    <Image src={user.profileImageUrl} alt={user.name || 'User'} width={40} height={40} className="w-full h-full object-cover" />
                  ) : userInitial}
                </button>

                {/* Cart Icon */}
                <Link
                  href="/app/cart"
                  className="relative p-2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className={`text-gray-600 rounded-full font-bold hover:text-gray-900 transition-all ${isScrolled ? 'px-4 py-1.5 text-[10px]' : 'px-5 py-2 text-xs'}`}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className={`text-[var(--color-primary-deep)] border-2 border-[var(--color-primary-deep)] rounded-full font-bold hover:bg-[var(--color-primary-deep)] hover:text-white transition-all active:scale-95 ${isScrolled ? 'px-4 py-1.5 text-[11px] sm:text-xs' : 'px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm'}`}
              >
                Login
              </Link>
            )}
          </div>
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
            className={`fixed md:hidden z-50 left-4 right-4 bg-white/98 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden ${isScrolled ? 'top-20' : 'top-24'}`}
          >
            <div className="flex flex-col p-4">
              {/* Authenticated user card */}
              {isAuthenticated && (
                <div
                  className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl mb-4 cursor-pointer"
                  onClick={() => router.push('/app/account')}
                >
                  <div className="w-10 h-10 border-2 border-emerald-100 rounded-full flex items-center justify-center text-[var(--color-primary-deep)] font-bold overflow-hidden">
                    {user?.profileImageUrl ? (
                      <Image src={user.profileImageUrl} alt={user.name || 'User'} width={40} height={40} className="w-full h-full object-cover" />
                    ) : userInitial}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{user?.name || 'My Account'}</div>
                    <div className="text-xs text-gray-500">{user?.phone || 'View Profile'}</div>
                  </div>
                </div>
              )}

              {/* Nav links */}
              {NAV_LINKS.map(link => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`py-3 px-4 flex items-center gap-3 font-semibold text-sm border-b border-gray-50 last:border-0 rounded-lg transition-colors ${
                      active
                        ? 'text-[var(--color-primary-deep)]'
                        : 'text-gray-700 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {link.label === 'Account' && <UserIcon className="w-4 h-4" />}
                    {link.label}
                    {active && <div className="ml-auto w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />}
                  </Link>
                );
              })}

              <div className="mt-4 pt-4 border-t border-gray-100">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-rose-600 border border-rose-200 py-3 rounded-full text-sm font-semibold active:scale-95 transition-all"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="block w-full text-center bg-[var(--color-primary-deep)] text-white py-3 rounded-full text-sm font-semibold shadow-lg active:scale-95 transition-all"
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

export default Navbar;
