'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function SOSButtonUI() {
  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Dashed Rings - CSS replication of Figma rings */}
      {[0.6, 0.75, 0.9, 1.0].map((scale, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.2, 0.4, 0.2],
            scale: [scale * 0.95, scale * 1.05, scale * 0.95] 
          }}
          transition={{ 
            duration: 3 + i, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/20"
          style={{ transform: `scale(${scale})` }}
        />
      ))}

      {/* Neumorphic Outer Ring */}
      <div className="relative w-48 h-48 rounded-full bg-[#f5f5fa] flex items-center justify-center shadow-[6px_6px_24px_#aaaacc,-6px_-6px_24px_#ffffff]">
        
        {/* Inner Pulsing Core */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-36 h-36 rounded-full bg-gradient-to-br from-[#FFAD59] to-[#FF7E7B] flex items-center justify-center shadow-[0_8px_24px_rgba(255,126,123,0.45)]"
        >
          <span className="text-white text-4xl font-black tracking-widest drop-shadow-md">
            SOS
          </span>
        </motion.div>
      </div>
    </div>
  );
}
