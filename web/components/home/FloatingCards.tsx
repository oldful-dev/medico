'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, Globe, TrendingUp } from 'lucide-react';

const FloatingCard = ({ children, className, delay = 0, yOffset = 10 }: { children: React.ReactNode, className: string, delay?: number, yOffset?: number }) => (
  <motion.div
    initial={{ y: 0, opacity: 0 }}
    animate={{ y: [0, -yOffset, 0], opacity: 1 }}
    transition={{ 
      y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay },
      opacity: { duration: 0.8, delay: delay * 0.2 } 
    }}
    className={`absolute bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-4 ${className}`}
  >
    {children}
  </motion.div>
);

const FloatingEmoji = ({ emoji, className, delay = 0 }: { emoji: string, className: string, delay?: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0, rotate: -20 }}
    animate={{ scale: 1, opacity: 1, y: [0, -15, 0], rotate: [-5, 5, -5] }}
    transition={{ 
      y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay },
      rotate: { duration: 8, repeat: Infinity, ease: 'linear', delay },
      scale: { duration: 0.5, delay: delay * 0.5 } 
    }}
    className={`absolute text-5xl md:text-6xl drop-shadow-xl ${className}`}
  >
    {emoji}
  </motion.div>
);

export function FloatingCards() {
  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10 hidden md:block" style={{ top: '-10%', height: '110%' }}>
      {/* Top Left: Heart Rate Card */}
      <FloatingCard className="top-[30%] left-[10%] rotate-[-5deg]" delay={0} yOffset={12}>
        <div className="flex flex-col gap-2 min-w-[120px]">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-xl text-gray-800">120</span>
            <span className="text-xs text-gray-400 font-medium">bpm</span>
          </div>
          <div className="h-8 flex items-end gap-1 overflow-hidden opacity-60">
             {/* Fake EKG bars */}
             {[4, 8, 3, 12, 16, 5, 8, 4, 18, 5, 3].map((h, i) => (
                <div key={i} className="w-[3px] bg-red-400 rounded-t-sm" style={{ height: `${h * 2}px` }}></div>
             ))}
          </div>
          <span className="text-xs font-semibold text-gray-500 mt-1">Heart rate</span>
        </div>
      </FloatingCard>

      {/* Bottom Left: Trust Card */}
      <FloatingCard className="bottom-[15%] left-[15%] rotate-[3deg] p-5" delay={1} yOffset={15}>
        <div className="flex flex-col gap-3 min-w-[100px] items-center text-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="text-yellow-500 w-5 h-5 fill-current" />
            </div>
          <span className="text-sm font-bold text-gray-800 leading-tight">1.8m users<br/>world wide</span>
        </div>
      </FloatingCard>

      {/* Top Right: BP Card */}
      <FloatingCard className="top-[40%] right-[10%] rotate-[4deg]" delay={0.5} yOffset={8}>
         <div className="flex flex-col gap-2 min-w-[130px]">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-xl text-gray-800">148</span>
            <span className="text-xs text-gray-400 font-medium">mm/Hg</span>
          </div>
          <div className="h-8 flex items-end gap-1 overflow-hidden justify-center opacity-70">
             {/* Fake Bars */}
             {[5, 7, 9, 12, 10, 8, 6, 4].map((h, i) => (
                <div key={i} className={`w-1 rounded-full ${i===3||i===4 ? 'bg-[var(--color-primary)]' : 'bg-orange-300'}`} style={{ height: `${h * 2}px` }}></div>
             ))}
          </div>
          <span className="text-xs font-semibold text-gray-500 mt-1">Blood pressure</span>
        </div>
      </FloatingCard>

      {/* Bottom Right: Globe Card */}
      <FloatingCard className="bottom-[25%] right-[15%] rotate-[-4deg]" delay={1.5} yOffset={10}>
         <div className="flex flex-col gap-3 min-w-[100px] justify-center text-center">
            <div className="w-full flex justify-center mb-1">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Globe className="text-blue-500 w-4 h-4" />
                </div>
            </div>
            <span className="text-sm font-bold text-gray-800 leading-tight">Across 120+<br/>countries</span>
        </div>
      </FloatingCard>

      {/* Emojis */}
      <FloatingEmoji emoji="😊" className="top-[15%] left-[20%]" delay={0.2} />
      <FloatingEmoji emoji="😇" className="top-[25%] right-[25%]" delay={1} />
      <FloatingEmoji emoji="😅" className="bottom-[10%] left-[8%] text-4xl" delay={0.7} />
      <FloatingEmoji emoji="🥰" className="bottom-[15%] right-[8%] text-5xl" delay={1.2} />
    </div>
  );
}
