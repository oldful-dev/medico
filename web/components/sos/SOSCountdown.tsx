'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface SOSCountdownProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function SOSCountdown({ onComplete, onCancel }: SOSCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
    >
      <div className="max-w-md w-full">
        <h2 className="text-red-500 text-3xl font-black tracking-wider mb-2">
          EMERGENCY ALERT
        </h2>
        <p className="text-white/80 text-lg mb-12">
          Contacting Admin and Family in
        </p>

        <motion.div 
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-40 rounded-full border-8 border-red-500 flex items-center justify-center mx-auto mb-16"
        >
          <span className="text-white text-7xl font-black">{count}</span>
        </motion.div>

        <button
          onClick={onCancel}
          className="mx-auto flex items-center gap-2 px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white font-bold transition-all active:scale-95"
        >
          <X className="w-5 h-5" /> CANCEL
        </button>
      </div>
    </motion.div>
  );
}
