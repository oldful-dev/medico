'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FloatingCards } from './FloatingCards';
import { PhoneFrame } from './PhoneFrame';
import { Star, ShieldCheck } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative w-full min-h-[120vh] bg-gradient-to-b from-[#FFFCF6] to-[#FFF3E0]/30 pt-32 pb-20 overflow-hidden flex flex-col items-center">
      
      {/* Background Radial Glow */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[90vw] h-[90vw] max-w-[900px] max-h-[900px] bg-gradient-radial from-[#FFF3E0] via-white/40 to-transparent rounded-full opacity-80 pointer-events-none z-0 blur-[80px]"></div>

      {/* Content wrapper */}
      <div className="relative z-30 container mx-auto px-4 max-w-4xl text-center flex flex-col items-center">
        
        {/* Animated Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6 drop-shadow-sm"
        >
          Care that feels <br/> like family
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-lg md:text-xl text-gray-600 max-w-2xl mb-12 font-medium"
        >
          We bring high-quality healthcare and expert elder care management directly to you—combining human empathy with modern technology.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-row items-center justify-center gap-4 mb-2"
        >
          <button className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl hover:scale-105 hover:bg-gray-800 transition-all shadow-xl active:scale-95">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.5 14.5c0-3.3 2.7-5 2.8-5-1.5-2.2-3.9-2.5-4.8-2.6-2-.2-4 1.2-5.1 1.2-1.1 0-2.7-1.1-4.4-1.1-2.1 0-4.1 1.2-5.2 3.1-2.2 3.8-.6 9.4 1.5 12.5 1.1 1.5 2.3 3.2 3.9 3.1 1.5-.1 2.1-1.1 4-1.1 1.8 0 2.4 1.1 4 1.1 1.6.1 2.7-1.7 3.7-3.2 1.2-1.7 1.6-3.4 1.7-3.5-.1-.1-3.2-1.2-3.2-4.5zM14.6 6.7c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.6 1.8-.7.8-1.4 2.2-1.2 3.6 1.4.1 2.8-.6 3.6-1.6z" /></svg>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] text-gray-300 uppercase font-bold tracking-wider">Download on the</span>
                <span className="text-base font-bold tracking-wide mt-0.5">App Store</span>
            </div>
          </button>
          
          <button className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl hover:scale-105 hover:bg-gray-800 transition-all shadow-xl active:scale-95">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.523 15.341l4.624-2.658c-.149-.074-2.138-1.189-4.624-2.658l-5.466 5.466 5.466 5.466c2.486-1.469 4.475-2.584 4.624-2.658zM16.591 16.324L7.494 21.6c-.63.364-1.229.02-1.229-.726v-5.064l6.19-6.19 4.136 6.704zM6.265 14.156v-4.312c0-.746.599-1.09 1.229-.726l9.097 5.276-4.136 6.704-6.19-6.19zM16.591 7.676l-4.136-6.704-6.19 6.19v5.064c0 .746.599 1.09 1.229.726l9.097-5.276z"/></svg>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] text-gray-300 uppercase font-bold tracking-wider">GET IT ON</span>
                <span className="text-base font-bold tracking-wide mt-0.5">Google Play</span>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Floating Center Stage (Phone + Cards + Emojis) */}
      <div className="relative w-full max-w-6xl mx-auto flex justify-center mt-8 pb-32">
        <FloatingCards />
        <PhoneFrame />

        {/* Top Floating Badge */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="absolute top-0 right-[25%] md:right-[35%] z-40 bg-white shadow-xl rounded-full px-4 py-2 border border-blue-50 flex items-center gap-2 -rotate-3"
          >
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="text-blue-500 w-3 h-3" />
            </div>
            <span className="text-sm font-bold text-gray-800">Verified Caregivers</span>
        </motion.div>
      </div>

      {/* Bottom Footer Overlay */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute bottom-10 left-10 z-40 flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-3 rounded-full cursor-pointer hover:bg-white transition-colors border border-white/50 shadow-lg"
      >
        <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-inner">
             <Star className="text-white w-4 h-4 fill-current" />
        </div>
        <span className="font-bold text-sm text-gray-800">900k+ reviews on Trust Pilot</span>
      </motion.div>

      {/* Extreme Bottom Mask for layout blending */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent pointer-events-none z-30" />

    </section>
  );
}
