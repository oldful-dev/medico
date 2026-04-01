'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export function Navbar() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="w-full absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-xl leading-none -mt-1 tracking-tighter">M</span>
        </div>
        <span className="text-[var(--color-primary-deep)] font-bold text-xl tracking-tight hidden sm:block">Medico</span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <Link href="/" className="text-[var(--color-primary-deep)] font-semibold text-sm hover:text-[var(--color-primary)] transition-colors">Home</Link>
        <Link href="/plans" className="text-gray-500 font-medium text-sm hover:text-[var(--color-primary)] transition-colors">Plans</Link>
        <Link href="/wellness" className="text-gray-500 font-medium text-sm hover:text-[var(--color-primary)] transition-colors">Wellness</Link>
        <Link href="/articles" className="text-gray-500 font-medium text-sm hover:text-[var(--color-primary)] transition-colors">Articles</Link>
        <Link href="/about" className="text-gray-500 font-medium text-sm hover:text-[var(--color-primary)] transition-colors">About Us</Link>
      </div>

      <div className="flex items-center">
        {isAuthenticated ? (
          <button 
            onClick={logout}
            className="bg-[var(--color-primary-deep)] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--color-primary)] transition-all shadow-[0_4px_14px_rgba(4,131,87,0.3)] hover:shadow-[0_6px_20px_rgba(4,131,87,0.4)]"
          >
            Logout
          </button>
        ) : (
          <Link 
            href="/auth"
            className="bg-[var(--color-primary-deep)] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--color-primary)] transition-all shadow-[0_4px_14px_rgba(4,131,87,0.3)] hover:shadow-[0_6px_20px_rgba(4,131,87,0.4)]"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
