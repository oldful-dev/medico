'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ShoppingCart, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/services',  label: 'Services' },
  { href: '/wellness',      label: 'Wellness' },
  { href: '/plans',         label: 'Plans' },
];

export function AppNavbar() {
  const { logout, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/app/dashboard') return pathname === '/app/dashboard';
    return pathname.startsWith(href);
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'U';

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`z-[100] transition-all duration-300 flex items-center justify-between mx-auto backdrop-blur-xl fixed ${
          isScrolled
            ? 'top-4 left-0 right-0 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl px-3 sm:px-6 py-2 bg-white/70 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20'
            : 'top-0 left-0 right-0 w-full px-4 sm:px-8 py-4 bg-transparent'
        }`}
      >
        {/* Logo */}
        <Link href="/app/dashboard" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group">
          <div className={`relative transition-all duration-300 ${isScrolled ? 'w-8 h-8' : 'w-11 h-11'}`}>
            <Image src="/olfful-logo.png" alt="Oldful" fill className="object-contain" priority />
          </div>
          <span className={`text-[var(--color-primary-deep)] font-bold tracking-tight transition-all duration-300 ${isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
            Oldful
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-2 lg:gap-4">
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 font-bold text-xs lg:text-sm transition-all rounded-full ${
                  active
                    ? 'text-[var(--color-primary-deep)]'
                    : 'text-gray-500 hover:text-[var(--color-primary)]'
                }`}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="app-nav-active-pill"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Avatar */}
          {isLoading ? (
            <div className="w-9 h-9 bg-gray-100/50 rounded-full animate-pulse" />
          ) : (
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
          )}

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
            className={`text-gray-600 rounded-full font-bold hover:text-gray-900 transition-all hidden xs:block ${isScrolled ? 'px-4 py-1.5 text-[10px]' : 'px-5 py-2 text-xs'}`}
          >
            Logout
          </button>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-800 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed md:hidden z-[90] left-4 right-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ${isScrolled ? 'top-20' : 'top-20'}`}
          >
            <div className="flex flex-col p-4">
              {/* User info */}
              {user && (
                <div 
                  className="flex items-center gap-3 p-4 border border-gray-100 rounded-2xl mb-4 cursor-pointer"
                  onClick={() => { router.push('/app/account'); setMobileOpen(false); }}
                >
                  <div className="w-10 h-10 border-2 border-emerald-100 rounded-full flex items-center justify-center font-bold text-[var(--color-primary-deep)] text-sm overflow-hidden">
                    {user.profileImageUrl
                      ? <Image src={user.profileImageUrl} alt={user.name || ''} width={40} height={40} className="w-full h-full object-cover" />
                      : userInitial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                {NAV_LINKS.map(link => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        active
                          ? 'text-[var(--color-primary-deep)]'
                          : 'text-gray-600'
                      }`}
                    >
                      {link.label}
                      {active && <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-4 mt-2 border-t border-gray-100">
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 border border-rose-100 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
