'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FloatingCards } from './FloatingCards';
import { PhoneFrame } from './PhoneFrame';
import { Star } from 'lucide-react';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative w-full min-h-[120vh] bg-white pt-32 pb-20 overflow-hidden flex flex-col items-center">
      
      {/* Background Radial Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-gradient-radial from-[var(--color-bg-screen)] via-[#FFF8E7] to-white rounded-full opacity-60 pointer-events-none z-0 blur-3xl"></div>

      {/* Content wrapper */}
      <div className="relative z-20 container mx-auto px-4 max-w-4xl text-center flex flex-col items-center">
        
        {/* Animated Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6"
        >
          Care that feels <br/> like family
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 font-medium"
        >
          With intuitive features and user-friendly design, you can monitor vital signs, manage your health goals, and receive personalized care—all in real time.
        </motion.p>

        {/* Badges / CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-row items-center justify-center gap-4 mb-16"
        >
           {/* Note: I'm making text-based buttons that act as the App Store buttons to save asset sourcing */}
          <button className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.5 14.5c0-3.3 2.7-5 2.8-5-1.5-2.2-3.9-2.5-4.8-2.6-2-.2-4 1.2-5.1 1.2-1.1 0-2.7-1.1-4.4-1.1-2.1 0-4.1 1.2-5.2 3.1-2.2 3.8-.6 9.4 1.5 12.5 1.1 1.5 2.3 3.2 3.9 3.1 1.5-.1 2.1-1.1 4-1.1 1.8 0 2.4 1.1 4 1.1 1.6.1 2.7-1.7 3.7-3.2 1.2-1.7 1.6-3.4 1.7-3.5-.1-.1-3.2-1.2-3.2-4.5zM14.6 6.7c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.6 1.8-.7.8-1.4 2.2-1.2 3.6 1.4.1 2.8-.6 3.6-1.6z" /></svg>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] text-gray-300 uppercase font-medium">Download on the</span>
                <span className="text-sm font-semibold mt-0.5 tracking-wide">App Store</span>
            </div>
          </button>
          
          <button className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.523 15.341l4.624-2.658c-.149-.074-2.138-1.189-4.624-2.658l-5.466 5.466 5.466 5.466c2.486-1.469 4.475-2.584 4.624-2.658zM16.591 16.324L7.494 21.6c-.63.364-1.229.02-1.229-.726v-5.064l6.19-6.19 4.136 6.704zM6.265 14.156v-4.312c0-.746.599-1.09 1.229-.726l9.097 5.276-4.136 6.704-6.19-6.19zM16.591 7.676l-4.136-6.704-6.19 6.19v5.064c0 .746.599 1.09 1.229.726l9.097-5.276z"/></svg>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] text-gray-300 uppercase font-medium">GET IT ON</span>
                <span className="text-sm font-semibold tracking-wide">Google Play</span>
            </div>
          </button>
        </motion.div>

      </div>

      {/* Floating Center Stage (Phone + Cards) */}
      <div className="relative w-full max-w-6xl mx-auto flex justify-center mt-[-20px] pb-32">
        <FloatingCards />
        <PhoneFrame />
      </div>

      {/* Bottom Footer Overlay */}
      <div className="absolute bottom-8 left-8 z-30 flex items-center gap-3 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full cursor-pointer hover:bg-white transition-colors border border-gray-100 shadow-sm">
        <div className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
             <Star className="text-white w-3 h-3 fill-current" />
        </div>
        <span className="font-semibold text-sm text-gray-800">900k+ reviews on Trust Pilot</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
      </div>

    </section>
  );
}
