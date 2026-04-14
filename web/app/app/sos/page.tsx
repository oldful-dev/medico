'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Phone, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { SOSButtonUI } from '@/components/sos/SOSButtonUI';
import { SOSCountdown } from '@/components/sos/SOSCountdown';
import { sosService } from '@/services/api/sosService';

export default function SOSPage() {
  const router = useRouter();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Pre-fetch location on mount
  useEffect(() => {
    sosService.getCurrentLocation().then(loc => {
      if (loc) setLocation(loc);
    });
  }, []);

  const handleSOSPress = () => {
    setShowCountdown(true);
  };

  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    setIsTriggering(true);
    const tId = toast.loading('Initiating emergency alerts...');

    try {
      const result = await sosService.triggerSOS(location || undefined);
      
      if (result.success) {
        toast.success('Emergency alerts sent successfully!', { id: tId });
      } else {
        toast.error('Partial alert: Contacting hotline manually.', { id: tId });
      }
    } catch (err) {
      toast.error('Network error. Please call hotline directly.', { id: tId });
    } finally {
      setIsTriggering(false);
      // On web, we can't force a phone call, but we can open the tel: link
      window.location.href = 'tel:+919480198108';
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#FFFFF0] flex flex-col items-center justify-between p-6 pb-12 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-lg flex flex-col items-center gap-2 relative mt-4">
        <button 
          onClick={() => router.back()}
          className="absolute left-0 top-0 p-2 text-gray-800 hover:bg-black/5 rounded-full transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        
        <h1 className="text-2xl font-bold text-[#313A51] mt-12">
          Calling <span className="lowercase">emergency</span>...
        </h1>
        <p className="text-gray-600 text-center px-8">
          {isTriggering 
            ? 'Contacting emergency services...' 
            : 'To start a call, simply press the button'}
        </p>
      </div>

      {/* Center Button Area */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative">
          <button
            onClick={handleSOSPress}
            disabled={isTriggering}
            className={`transition-all ${isTriggering ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95'}`}
          >
            <SOSButtonUI />
          </button>
          
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-red-500/5 blur-[100px] -z-10 rounded-full" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        <div className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Immediate Assistance</p>
            <p className="text-xs text-gray-500">Notifying Admin & Family Contacts</p>
          </div>
        </div>

        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">
          {isTriggering
            ? 'Emergency contacts are being notified...'
            : 'Notifying Emergency Contacts'}
        </p>
      </div>

      <AnimatePresence>
        {showCountdown && (
          <SOSCountdown 
            onComplete={handleCountdownComplete} 
            onCancel={() => setShowCountdown(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
