'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, MapPin, Package, ShieldCheck, CreditCard, ChevronRight, Phone, Download, AlertCircle, Calendar, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { bookingService } from '@/services/api/bookingService';
import { SERVICES_CONFIG } from '@/lib/services-config';
import { getAssetUrl } from '@/utils/getAssetUrl';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { paymentService } from '@/services/api/paymentService';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: Record<string, unknown>) => void): void };
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CONFIRMED:       { label: 'Confirmed',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck },
  PENDING:         { label: 'Pay on Arrival',    color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },       // COD real booking
  ASSIGNED:        { label: 'Provider Assigned', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: ShieldCheck },
  COMPLETED:       { label: 'Service Completed', color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: Package },
  CANCELLED:       { label: 'Cancelled',         color: 'bg-red-50 text-red-600 border-red-200',      icon: AlertCircle },
  IN_PROGRESS:     { label: 'In Progress',       color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Activity },
  // ─── New payment-state statuses ─────────────────────────────────────────────
  PAYMENT_PENDING: { label: 'Awaiting Payment',  color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Clock },
  PAYMENT_FAILED:  { label: 'Payment Failed',    color: 'bg-red-50 text-red-600 border-red-200',      icon: AlertCircle },
};

export default function BookingDetailsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { user } = useAuthStore();
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const pendingOrderId = React.useRef<string | null>(null);

  React.useEffect(() => {
     // Load Razorpay script for retries
     const script = document.createElement('script');
     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
     script.async = true;
     document.body.appendChild(script);
     return () => { document.body.removeChild(script); };
  }, []);

  const cancelPaymentOnBackend = async () => {
    if (pendingOrderId.current) {
      try { await paymentService.cancelPayment(pendingOrderId.current); }
      catch (e) { console.warn('cancelPayment error:', e); }
      pendingOrderId.current = null;
    }
  };
  
  const { data: res, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getBookingById(id as string),
    enabled: !!id,
  });

  const booking = res?.data;
  const serviceConfig = booking?.service?.slug ? SERVICES_CONFIG[booking.service.slug] : null;

  const handleDownload = async () => {
     if (isDownloading) return;
     setIsDownloading(true);
     const tId = toast.loading('Generating invoice...');
     try {
        const blob = await bookingService.downloadInvoice(id as string);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${booking?.bookingCode || 'booking'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Invoice downloaded', { id: tId });
     } catch (err: unknown) {
        toast.error((err instanceof Error ? err.message : null) || 'Failed to download invoice', { id: tId });
     } finally {
        setIsDownloading(false);
     }
  };

  const handleRetryPayment = async () => {
    if (!user || !booking) return;

    setIsProcessingPayment(true);
    try {
       const total = (booking.amount || 0) + Math.round((booking.amount || 0) * 0.18) + 50;

       const initiateRes = await paymentService.initiatePayment({
          amount: total,
          bookingId: booking.id,
       });

       if (!initiateRes.success) {
          throw new Error(initiateRes.message || 'Failed to initiate payment');
       }

       const { orderId, amount, currency, key } = initiateRes.data;
       pendingOrderId.current = orderId;

       const options: Record<string, unknown> = {
          key: key,
          amount: amount * 100, // paise
          currency: currency,
          name: 'Oldful Healthcare',
          description: `Payment for Booking #${booking.bookingCode || booking.id.slice(0,8)}`,
          order_id: orderId,
          handler: async function (response: Record<string, string>) {
             setIsProcessingPayment(true);
             try {
                const verifyRes = await paymentService.verifyPayment({
                   razorpayOrderId: response.razorpay_order_id,
                   razorpayPaymentId: response.razorpay_payment_id,
                   razorpaySignature: response.razorpay_signature,
                });

                if (verifyRes.success) {
                   pendingOrderId.current = null;
                   toast.success('Payment successful! Your booking is confirmed.');
                   // Refresh the page
                   window.location.reload();
                } else {
                   toast.error('Payment verification failed. Please do NOT retry.');
                }
             } catch {
                toast.error('Error verifying payment. Please contact support.');
             } finally {
                setIsProcessingPayment(false);
             }
          },
          prefill: {
             name: user.name,
             contact: user.phone,
             email: user.email || '',
             method: 'upi',
          },
          theme: { color: '#10b981' },
          modal: {
             confirm_close: true,
             ondismiss: async function() {
                await cancelPaymentOnBackend();
                setIsProcessingPayment(false);
                toast('Payment cancelled. You can try again anytime.', { icon: 'ℹ️' });
             }
          }
       };

       const rzp = new window.Razorpay(options);
       rzp.on('payment.failed', async function (response: Record<string, Record<string, string>>) {
          await cancelPaymentOnBackend();
          toast.error(response.error?.description || 'Payment failed. Please try again.');
          setIsProcessingPayment(false);
       });

       rzp.open();
    } catch (error: unknown) {
       console.error('Retry Payment Error:', error);
       toast.error((error instanceof Error ? error.message : null) || 'Failed to initialize payment.');
       setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center">
         <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
         <p className="mt-4 text-gray-500 font-medium">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center">
         <AlertCircle className="w-16 h-16 text-red-200 mb-4" />
         <h1 className="text-xl font-bold text-gray-900">Booking not found</h1>
         <p className="text-gray-500 mt-2 max-w-xs">We couldn&apos;t retrieve the details for this booking. It might have been deleted or moved.</p>
         <button 
           onClick={() => router.back()}
           className="mt-6 px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-2xl"
         >
           Go Back
         </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-6 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="w-11 h-11 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 border border-gray-100 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Booking Details</h1>
          <p className="text-xs text-gray-500 font-mono">#{booking.bookingCode || id.toString().slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between p-5 rounded-3xl border ${status.color}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status.color.split(' ')[0]} border shadow-sm`}>
               <status.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs opacity-70 font-bold uppercase tracking-widest mb-0.5">Status</p>
              <h3 className="text-lg font-bold">{status.label}</h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-30" />
        </motion.div>

        {/* Service Details */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
           <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                 <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center p-2">
                    {serviceConfig?.icon ? (
                       <Image 
                         src={getAssetUrl(serviceConfig.icon)} 
                         alt={booking.service.name} 
                         width={48} 
                         height={48}
                         className="object-contain"
                       />
                    ) : (
                       <Package className="w-8 h-8 text-emerald-500" />
                    )}
                 </div>
                 <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{booking.service?.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{serviceConfig?.tagline || 'Professional Care Service'}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
                       <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scheduled Date</p>
                       <p className="text-sm font-bold text-gray-800">
                          {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'TBD'}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
                       <Clock className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time Slot</p>
                       <p className="text-sm font-bold text-gray-800">
                          {booking.scheduledTime || 'TBD'}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
                       <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Address</p>
                       <p className="text-sm font-bold text-gray-800 line-clamp-2">
                          {booking.addressLine || 'Address details not provided'}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Metadata / Details */}
        {booking.formDataJson && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
             <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" /> Additional Details
             </h3>
             <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                {Object.entries(booking.formDataJson).map(([key, value]) => {
                  // Skip keys that are already displayed at top level
                  if (['serviceId', 'id', 'price', 'address', 'scheduleTime', 'providerType'].includes(key)) return null;
                  if (typeof value !== 'string' && typeof value !== 'number') return null;
                  
                  return (
                    <div key={key}>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                       <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* Bill Breakdown */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
           <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" /> Payment Summary
           </h3>
           <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                 <span>Service Charges</span>
                 <span className="font-semibold text-gray-900">₹{booking.amount || 0}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                 <span>GST & Taxes (18%)</span>
                 <span className="font-semibold text-gray-900">₹{Math.round((booking.amount || 0) * 0.18)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                 <span>Convenience Fee</span>
                 <span className="font-semibold text-gray-900">₹50</span>
              </div>
              <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-lg font-bold text-gray-900">
                 <span>Total Amount Paid</span>
                 <span className="text-emerald-700">₹{(booking.amount || 0) + Math.round((booking.amount || 0) * 0.18) + 50}</span>
              </div>
           </div>
           
           {booking.payments?.[0]?.razorpayPaymentId && (
              <div className="mt-6 flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> SECURE TRANSACTION
                 </div>
                 <span className="text-[10px] text-gray-400 font-mono">{booking.payments[0].razorpayPaymentId}</span>
              </div>
           )}
        </div>

        {/* Support Actions */}
        <div className="grid grid-cols-2 gap-4">
           <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform">
              <Phone className="w-6 h-6 text-emerald-600 mb-2" />
              <span className="text-xs font-bold text-gray-800">Support</span>
           </button>
           {booking.payments?.some((p: Record<string, unknown>) => p.status === 'SUCCESS') ? (
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                 {isDownloading ? (
                   <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" />
                 ) : (
                   <Download className="w-6 h-6 text-emerald-600 mb-2" />
                 )}
                 <span className="text-xs font-bold text-gray-800">Invoice</span>
              </button>
           ) : ['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(booking.status) ? (
              <button 
                onClick={handleRetryPayment}
                disabled={isProcessingPayment}
                className={`flex flex-col items-center justify-center p-4 bg-[var(--color-primary)] text-white rounded-2xl shadow-sm active:scale-95 transition-transform ${isProcessingPayment ? 'opacity-70' : ''}`}
              >
                 {isProcessingPayment ? (
                   <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                 ) : (
                   <CreditCard className="w-6 h-6 mb-2" />
                 )}
                 <span className="text-xs font-bold">Retry Payment</span>
              </button>
           ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-50 cursor-not-allowed">
                 <AlertCircle className="w-6 h-6 text-gray-400 mb-2" />
                 <span className="text-xs font-bold text-gray-400 text-center leading-tight">Invoice<br/>Pending</span>
              </div>
           )}
        </div>

      </div>
    </div>
  );
}

