'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { ChevronLeft, Lock, ShieldCheck, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { bookingService } from '@/services/api/bookingService';
import { paymentService } from '@/services/api/paymentService';
import { toast } from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cash'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdBookingIds, setCreatedBookingIds] = useState<string[] | null>(null);

  // ─── Stores orderId after initiatePayment — used by cancel/failure handlers ──
  // Prevents ghost PAYMENT_PENDING bookings from remaining after dismiss/failure.
  const pendingOrderId = React.useRef<string | null>(null);

  // ─── Helper: mark the booking PAYMENT_FAILED on backend (non-blocking) ────────
  const cancelPaymentOnBackend = async () => {
    if (pendingOrderId.current) {
      try { await paymentService.cancelPayment(pendingOrderId.current); }
      catch (e) { console.warn('cancelPayment non-blocking error:', e); }
      pendingOrderId.current = null;
    }
  };

  useEffect(() => {
     // Load Razorpay script
     const script = document.createElement('script');
     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
     script.async = true;
     document.body.appendChild(script);
     
     return () => {
        document.body.removeChild(script);
     };
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const taxes = Math.round(subtotal * 0.18);
  const total = subtotal + taxes + 50;

  const handlePayment = async () => {
    if (!user) {
       toast.error('Please login to continue');
       return;
    }

    setIsProcessing(true);
    try {
       let bookingId = createdBookingIds?.[0];

       // 1. Create Booking only if we haven't already for this session
       if (!bookingId) {
          const bookingPromises = items.map(item => {
             // Safety check for scheduleTime to prevent crash
             const scheduleTime = item.scheduleTime || '';
             const cleanedDate = scheduleTime.includes(' at ') 
                ? scheduleTime.replace(' at ', ' ') 
                : scheduleTime;
             
             return bookingService.createBooking({
                serviceId: item.serviceId,
                scheduledDate: cleanedDate || new Date().toISOString(),
                scheduledTime: item.scheduleTime,
                addressLine: item.address,
                amount: item.price,
                staffType: item.providerType || undefined,
                formDataJson: item,
                paymentMethod: paymentMethod,
             });
          });

          const bookingResults = await Promise.all(bookingPromises);
          const allBookingsSuccessful = bookingResults.every(res => res.success);

          if (!allBookingsSuccessful) {
             throw new Error('Failed to create booking records. Please try again.');
          }

          const newIds = bookingResults.map(res => res.data.id);
          setCreatedBookingIds(newIds);
          bookingId = newIds[0];
       }

       // 2. Handle Payment Flow
       if (paymentMethod === 'cash') {
          // COD Flow — Booking is CONFIRMED (real booking), caregiver will collect payment
          toast.success('Booking Awaiting Payment! Our provider will collect ₹' + total + ' upon arrival.', {
             duration: 6000,
             icon: '⌛'
          });
          clearCart();
          router.push('/app/success');
       } else {
          // Razorpay Flow
          // a. Initiate Payment (creates Razorpay order on backend)
          const initiateRes = await paymentService.initiatePayment({
             amount: total,
             bookingId: bookingId,
          });

          if (!initiateRes.success) {
             throw new Error(initiateRes.message || 'Failed to initiate payment');
          }

          const { orderId, amount, currency, key } = initiateRes.data;

          // ─── CRITICAL: Store orderId so cancel/failure handlers can call cancelPayment
          // The booking is now PAYMENT_PENDING on backend — invisible to bookings list.
          // It must be promoted to CONFIRMED (via verify) or dropped to PAYMENT_FAILED.
          pendingOrderId.current = orderId;

          // b. Open Razorpay Modal
          const options: any = {
             key: key,
             amount: amount * 100, // Razorpay expects paise
             currency: currency,
             name: 'Oldful Healthcare',
             description: `Payment for ${items.length} service(s)`,
             order_id: orderId,
             handler: async function (response: any) {
                // c. Verify Payment on backend — this is the source of truth
                // Backend: PAYMENT_PENDING → CONFIRMED + SLA clock starts
                setIsProcessing(true);
                try {
                   const verifyRes = await paymentService.verifyPayment({
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                   });

                   if (verifyRes.success) {
                      pendingOrderId.current = null; // clear so cancel helper won't fire
                      toast.success('Payment successful! Your booking is confirmed.');
                      clearCart();
                      router.push('/app/success');
                   } else {
                      // Signature mismatch — backend already marks PAYMENT_FAILED
                      toast.error('Payment verification failed. Our team has been notified. Please do NOT retry the payment.');
                   }
                } catch (err: any) {
                   toast.error('Error verifying payment. Please contact support.');
                } finally {
                   setIsProcessing(false);
                }
             },
             prefill: {
                name: user.name,
                contact: user.phone,
                email: user.email || '',
                method: paymentMethod === 'upi' ? 'upi' : 'card',
             },
             config: {
                display: {
                   blocks: {
                      banks: {
                         name: paymentMethod === 'upi' ? 'UPI' : 'Card',
                         instruments: [
                            {
                               method: paymentMethod === 'upi' ? 'upi' : 'card',
                            },
                         ],
                      },
                   },
                   sequence: ['block.banks'],
                   preferences: {
                      show_default_blocks: false,
                   },
                },
             },
             theme: {
                color: '#10b981', // emerald-500
             },
             modal: {
                confirm_close: true,
                // ─── CRITICAL: User dismissed Razorpay ──────────────────────────────
                // Must mark booking PAYMENT_FAILED so it disappears from bookings list.
                ondismiss: async function() {
                   await cancelPaymentOnBackend();
                   setIsProcessing(false);
                   toast('Payment cancelled. You can try again anytime.', { icon: 'ℹ️' });
                }
             }
          };

          const rzp = new window.Razorpay(options);

          // ─── CRITICAL: Payment failure event ────────────────────────────────────
          // Mark booking PAYMENT_FAILED so it disappears from the bookings list.
          rzp.on('payment.failed', async function (response: any) {
             await cancelPaymentOnBackend();
             toast.error(response.error?.description || 'Payment failed. Please try again.');
             setIsProcessing(false);
          });

          rzp.open();
       }
    } catch (error: any) {
       console.error('Checkout error:', error);
       toast.error(error?.message || 'Failed to process booking. Please check your connection.');
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc] pb-32">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#f8f9fc] z-10">
        <button 
          onClick={() => router.back()}
          disabled={isProcessing}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform disabled:opacity-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
           <Lock className="w-4 h-4 text-emerald-600" />
           <h1 className="text-lg font-bold text-gray-800">Checkout</h1>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="px-4 flex flex-col gap-6 max-w-xl mx-auto w-full">
        {/* Total Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-primary)]/20 flex flex-col items-center justify-center text-center">
           <span className="text-sm text-gray-500 font-medium">Total Payable Amount</span>
           <span className="text-4xl font-extrabold text-gray-900 mt-2">₹{total}</span>
           
           <div className="mt-4 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
             <ShieldCheck className="w-4 h-4" /> 100% Secure Payment via Razorpay
           </div>
        </div>

        {/* Payment Methods */}
        <div>
           <h2 className="text-md font-bold text-gray-800 mb-4 px-1">Payment Method</h2>
           <div className="flex flex-col gap-3">
              <button 
                onClick={() => setPaymentMethod('upi')}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'upi' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-100 bg-white'}`}
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Wallet className="w-5 h-5"/>
                </div>
                <div className="flex-1 text-left font-bold text-gray-800">UPI (GPay, PhonePe, Paytm)</div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi' ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                  {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full" />}
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-100 bg-white'}`}
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600">
                  <CreditCard className="w-5 h-5"/>
                </div>
                <div className="flex-1 text-left font-bold text-gray-800">Credit / Debit Card</div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                  {paymentMethod === 'card' && <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full" />}
                </div>
              </button>

              {/* COD Restriction: Only show if NOT a subscription checkout */}
              {/* @ts-ignore - subscriptionId check for future growth */}
              {!searchParams.get('subscriptionId') && (
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-100 bg-white'}`}
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 text-lg font-black">
                    ₹
                  </div>
                  <div className="flex-1 text-left font-bold text-gray-800">Cash on Delivery</div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                    {paymentMethod === 'cash' && <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full" />}
                  </div>
                </button>
              )}
           </div>
        </div>

        {paymentMethod === 'cash' && (
          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-200">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
             <p className="text-sm text-amber-800">Please prepare exact change if possible. Our provider will collect ₹{total} upon arrival.</p>
          </div>
        )}
      </div>

      {/* Confirmation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 md:bottom-8 md:left-auto md:right-auto md:w-full md:max-w-xl md:mx-auto md:rounded-3xl md:shadow-2xl z-20">
         <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full h-14 bg-gray-900 overflow-hidden relative text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-90"
         >
            {isProcessing ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex items-center gap-2"
              >
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </motion.div>
            ) : (
              `Pay ₹${total}`
            )}
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
