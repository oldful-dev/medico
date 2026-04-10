'use client';

import { motion } from 'framer-motion';
import React from 'react';

const PARTNERS = [
  { name: 'Redcliffe Labs', color: '#E91E63' },
  { name: 'Apollo Homecare', color: '#00BFA5' },
  { name: 'Fortis Health', color: '#1A237E' },
  { name: 'Manipal Hospitals', color: '#FF6D00' },
  { name: 'MedPlus', color: '#C62828' },
  { name: 'Portea', color: '#6A1B9A' },
  { name: 'HealthKart', color: '#2E7D32' },
  { name: 'Practo', color: '#1565C0' },
];

export function LogoMarquee() {
  return (
    <div className="w-full overflow-hidden py-10 pointer-events-none select-none">
      <div className="relative flex max-w-[100vw]">
        {/* First Marquee Set */}
        <motion.div
          animate={{ x: [0, -1920] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 40,
              ease: "linear",
            },
          }}
          className="flex flex-none gap-10 sm:gap-20 items-center whitespace-nowrap pr-10 sm:pr-20"
        >
          {PARTNERS.map((partner, i) => (
            <PartnerBadge key={`p1-${i}`} partner={partner} />
          ))}
          {PARTNERS.map((partner, i) => (
            <PartnerBadge key={`p1-dup-${i}`} partner={partner} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function PartnerBadge({ partner }: { partner: typeof PARTNERS[0] }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-gray-50/50 px-6 py-3 rounded-2xl border border-gray-100 shadow-sm backdrop-blur-sm">
      <div 
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-inner overflow-hidden"
        style={{ backgroundColor: partner.color }}
      >
        <div className="w-full h-full flex items-center justify-center bg-black/10">
          {partner.name[0]}
        </div>
      </div>
      <span className="text-base sm:text-lg font-bold text-gray-400 uppercase tracking-tight">
        {partner.name}
      </span>
      <div className="bg-red-500/10 text-red-500 text-[8px] sm:text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ml-2">
        Demo
      </div>
    </div>
  );
}
