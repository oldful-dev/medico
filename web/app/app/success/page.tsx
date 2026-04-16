'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { USER_QUERY_KEYS } from '@/hooks/useUserHooks';
import { CheckCircle2, ChevronRight, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuccessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearCart = useCartStore(state => state.clearCart);
  const [bookingId] = React.useState(() => Math.floor(100000 + Math.random() * 900000));

  useEffect(() => {
    clearCart();
    
    // Proactively refresh data for Dashboard/Account
    const refreshData = async () => {
      await Promise.all([
        queryClient.resetQueries({ queryKey: USER_QUERY_KEYS.bookings }),
        queryClient.resetQueries({ queryKey: USER_QUERY_KEYS.profile }),
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications }),
      ]);
    };
    
    refreshData();
  }, [clearCart, queryClient, USER_QUERY_KEYS]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-primary-deep)] p-6 text-white pb-24 text-center">
      
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
           <CheckCircle2 className="w-16 h-16 text-[var(--color-primary)]" />
        </div>
      </motion.div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="text-3xl font-extrabold mb-2"
      >
        Booking Confirmed!
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-white/80 font-medium mb-10 max-w-sm"
      >
        Your provider has been notified and will arrive at your scheduled time.
        <br/><br/>
        <span className="bg-white/20 px-3 py-1 rounded-md text-xs tracking-widest uppercase">ID: ODF-{bookingId}</span>
      </motion.p>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
         <button 
           onClick={() => router.push('/app/account')}
           className="w-full h-14 bg-white text-[var(--color-primary-deep)] rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
         >
           <User className="w-5 h-5" /> View in Account
         </button>

         <button 
           onClick={() => router.push('/app/services')}
           className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-white/20"
         >
            Book Another Service <ChevronRight className="w-5 h-5" />
         </button>
      </motion.div>

    </div>
  );
}
