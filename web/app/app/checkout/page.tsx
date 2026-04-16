'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { ChevronLeft, Lock, ShieldCheck, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { bookingService } from '@/services/api/bookingService';
import { subscriptionService } from '@/services/api/subscriptionService';
import { paymentService } from '@/services/api/paymentService';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { 
      open(): void; 
      on(event: string, cb: (r: Record<string, unknown>) => void): void 
    };
  }
}

function CheckoutContent() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cash'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdReferenceId, setCreatedReferenceId] = useState<string | null>(null);

  const isSubscription = items.some(i => i.type === 'plan');
  const pendingOrderId = React.useRef<string | null>(null);

  useEffect(() => {
    // Reset reference if payment method changes, ensuring fresh bookings for different methods
    setCreatedReferenceId(null);
  }, [paymentMethod]);

  const cancelPaymentOnBackend = async () => {
    if (pendingOrderId.current) {
      try { await paymentService.cancelPayment(pendingOrderId.current); }
      catch (e) { console.warn('cancelPayment non-blocking error:', e); }
      pendingOrderId.current = null;
    }
  };

  useEffect(() => {
     const script = document.createElement('script');
     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
     script.async = true;
     document.body.appendChild(script);
     
     return () => {
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
     };
  }, []);

  // ─── Precision Rounding (Fixes .333333 to .33) ─────────────────────────
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const taxes = subtotal * 0.18;
  const rawTotal = subtotal + taxes + (isSubscription ? 0 : 50);
  // Ensure we round to exactly 2 decimals
  const total = parseFloat(rawTotal.toFixed(2));

  const handlePayment = async () => {
    if (!user) {
       toast.error('Please login to continue');
       return;
    }

    setIsProcessing(true);
    try {
       let referenceId = createdReferenceId;

       if (!referenceId) {
          if (isSubscription) {
             const planItem = items.find(i => i.type === 'plan')!;
             const subRes = await subscriptionService.initiateSubscription({
                planId: planItem.planId!,
                billingCycle: planItem.billingCycle as "MONTHLY" | "YEARLY",
                amount: planItem.price
             });
             if (!subRes.success || !subRes.data) throw new Error(subRes.message || 'Subscription failed');
             referenceId = subRes.data.id;
          } else {
             const bookingPromises = items.map(item => {
                const rawDate = (item.scheduleTime as string) || (item as Record<string, unknown>).selectedDate as string || '';
                const finalScheduledDate = (rawDate && rawDate !== 'ASAP') 
                   ? rawDate.replace(' at ', ' ') 
                   : new Date().toISOString();

                return bookingService.createBooking({
                  serviceId: item.serviceId!,
                  scheduledDate: finalScheduledDate,
                  scheduledTime: (item.scheduleTime as string) || 'Scheduled',
                  addressLine: item.address as string,
                  amount: item.price,
                  paymentMethod: paymentMethod.toUpperCase() as "CARD" | "UPI" | "CASH",
                  formDataJson: { ...item }
               });
             });

             const results = await Promise.all(bookingPromises);
             if (!results.every(res => res.success)) throw new Error('Booking failed');
             referenceId = results[0].data!.id;
          }
          setCreatedReferenceId(referenceId);
       }

       if (paymentMethod === 'cash') {
          toast.success('Confirmed! Please pay ₹' + total.toFixed(2) + ' upon arrival.', { icon: '⌛' });
          const { USER_QUERY_KEYS } = await import('@/hooks/useUserHooks');
          queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.bookings });
          queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
          clearCart();
          router.push('/app/success');
       } else {
          const initiateRes = await paymentService.initiatePayment({
             amount: total,
             [isSubscription ? 'subscriptionId' : 'bookingId']: referenceId,
          });

          if (!initiateRes.success || !initiateRes.data) throw new Error('Payment initiation failed');

          const { orderId, amount: rzpAmount, currency, key } = initiateRes.data;
          pendingOrderId.current = orderId;

          const options: Record<string, unknown> = {
             key,
             amount: Math.round(rzpAmount * 100), // paise
             currency,
             name: 'Oldful Healthcare',
             description: isSubscription ? 'Care Plan Activation' : `Payment for ${items.length} service(s)`,
             order_id: orderId,
             // ─── UI Filtering: Standardized per Razorpay V1 ────────────────
             config: {
                display: {
                   blocks: {
                      [paymentMethod]: {
                         name: paymentMethod === 'upi' ? "UPI Options" : "Card Options",
                         instruments: [{ method: paymentMethod }],
                      },
                   },
                   sequence: [`block.${paymentMethod}`],
                   preferences: {
                      show_default_blocks: false,
                   },
                },
             },
             handler: async function (response: Record<string, string>) {
                setIsProcessing(true);
                try {
                   const verifyRes = await paymentService.verifyPayment({
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                   });

                    if (verifyRes.success) {
                       pendingOrderId.current = null;
                       const { USER_QUERY_KEYS } = await import('@/hooks/useUserHooks');
                       queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.bookings });
                       queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
                       queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications });
                       
                       toast.success('Payment successful!');
                       clearCart();
                       router.push('/app/success');
                    } else {
                       toast.error('Verification failed.');
                    }
                } catch {
                   toast.error('Error verifying payment.');
                } finally {
                   setIsProcessing(false);
                }
             },
             prefill: {
                name: user?.name || '',
                contact: user?.phone || '',
                email: user?.email || '',
                method: paymentMethod,
             },
             theme: { color: '#10b981' },
             modal: {
                confirm_close: true,
                ondismiss: async () => {
                   if (!isSubscription) await cancelPaymentOnBackend();
                   setIsProcessing(false);
                }
             }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', async function (response: Record<string, unknown>) {
            await cancelPaymentOnBackend();
            const rzpErr = response.error as { description?: string } | undefined;
            toast.error(rzpErr?.description || 'Payment failed.');
            setIsProcessing(false);
         });
          rzp.open();
       }
    } catch (error: unknown) {
       toast.error(error instanceof Error ? error.message : 'Checkout failed');
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc] pb-32">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#f8f9fc] z-10">
        <button onClick={() => router.back()} disabled={isProcessing} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
           <Lock className="w-4 h-4 text-emerald-600" />
           <h1 className="text-lg font-bold text-gray-800">Checkout</h1>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="px-4 flex flex-col gap-6 max-w-xl mx-auto w-full text-center">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-500/20">
           <span className="text-sm text-gray-500 font-medium tracking-wide flex items-center justify-center gap-2">
             <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Payment Summary
           </span>
           <span className="text-4xl font-extrabold text-gray-900 mt-2 block">₹{total.toFixed(2)}</span>
        </div>

        <div className="text-left">
           <h2 className="text-md font-bold text-gray-900 mb-4 px-1">Choose Payment Method</h2>
           <div className="flex flex-col gap-3">
              <button 
                onClick={() => setPaymentMethod('upi')}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Wallet className="w-6 h-6"/>
                </div>
                <div className="flex-1">
                  <div className="font-black text-gray-900 leading-tight">UPI (Apps, QR, VPA)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Instant activation via GPay, PhonePe, etc.</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                   {paymentMethod === 'upi' && <div className="w-2 rounded-full border border-white" />}
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'card' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-600'}`}>
                  <CreditCard className="w-6 h-6"/>
                </div>
                <div className="flex-1">
                  <div className="font-black text-gray-900 leading-tight">Debit / Credit Card</div>
                  <div className="text-xs text-gray-500 mt-0.5">Visa, Mastercard, RuPay, Amex</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                   {paymentMethod === 'card' && <div className="w-2 rounded-full border border-white" />}
                </div>
              </button>

              {!isSubscription && (
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${paymentMethod === 'cash' ? 'border-amber-600 bg-amber-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${paymentMethod === 'cash' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>₹</div>
                  <div className="flex-1">
                    <div className="font-black text-gray-900 leading-tight">Cash on Delivery</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pay at your doorstep</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-amber-600 bg-amber-600' : 'border-gray-300'}`}>
                    {paymentMethod === 'cash' && <div className="w-2 rounded-full border border-white" />}
                  </div>
                </button>
              )}
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-10 md:bottom-8 md:max-w-xl md:mx-auto md:rounded-3xl shadow-2xl z-20">
         <button onClick={handlePayment} disabled={isProcessing} className="w-full h-15 bg-gray-900 text-white rounded-2xl font-black text-lg flex items-center justify-center transition-all active:scale-95 hover:bg-black shadow-xl disabled:opacity-50">
            {isProcessing ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : `Complete Payment • ₹${total.toFixed(2)}`}
         </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading Checkout...</div>}>
      <CheckoutContent />
    </React.Suspense>
  );
}
