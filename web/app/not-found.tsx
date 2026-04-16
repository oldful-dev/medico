'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, HeartPulse } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-50/50 rounded-full blur-[120px]" />
      
      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Animated Icon */}
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          className="relative inline-block mb-8"
        >
          <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl shadow-emerald-200/50 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent group-hover:scale-110 transition-transform duration-500" />
             <HeartPulse className="w-16 h-16 text-emerald-600 relative z-10 animate-pulse" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-4 bg-gray-900 text-white text-[40px] font-black px-4 rounded-2xl shadow-xl"
          >
            404
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-12 max-w-lg mx-auto leading-relaxed">
            The page you&apos;re looking for seems to have wandered off. Let&apos;s get your health journey back on track.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link 
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95 group"
          >
            <Home className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
            Return Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-emerald-100 text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </motion.div>

        {/* Quick Links / Search Suggestion */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.6 }}
           transition={{ delay: 0.8 }}
           className="mt-16 flex items-center justify-center gap-8 text-sm font-bold text-gray-400 uppercase tracking-widest"
        >
           <Link href="/services" className="hover:text-emerald-600 transition-colors">Services</Link>
           <Link href="/plans" className="hover:text-emerald-600 transition-colors">Care Plans</Link>
           <Link href="/wellness" className="hover:text-emerald-600 transition-colors">Wellness</Link>
        </motion.div>
      </div>

      {/* Floating Elements for Premium Feel */}
      <motion.div 
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[20%] right-[15%] hidden lg:block"
      >
         <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-50 flex items-center justify-center text-emerald-100">
            <Search className="w-8 h-8 opacity-20" />
         </div>
      </motion.div>
    </div>
  );
}
