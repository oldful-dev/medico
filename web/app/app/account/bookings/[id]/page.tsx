'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
    ChevronLeft, Clock, MapPin, Package, ShieldCheck, 
    CreditCard, ChevronRight, Phone, Download, AlertCircle, 
    Calendar, FileText, Activity, X, Camera, Eye 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { bookingService } from '@/services/api/bookingService';
import { labService } from '@/services/api/labService';
import { getServiceConfig } from '@/lib/services-config';
import { getAssetUrl } from '@/utils/getAssetUrl';
import Image from 'next/image';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { paymentService } from '@/services/api/paymentService';
import { BookingDetailsSkeleton } from '@/components/booking/BookingDetailsSkeleton';
import { useUserHooks } from '@/hooks/useUserHooks';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

declare global {
   interface Window {
      Razorpay: new (options: Record<string, unknown>) => { 
         open(): void; 
         on(event: string, cb: (r: Record<string, unknown>) => void): void 
      };
   }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
   CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck },
   PENDING: { label: 'Pay on Arrival', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
   ASSIGNED: { label: 'Provider Assigned', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: ShieldCheck },
   COMPLETED: { label: 'Service Completed', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package },
   CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
   IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Activity },
   PAYMENT_PENDING: { label: 'Awaiting Payment', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Clock },
   PAYMENT_FAILED: { label: 'Payment Failed', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
};

export default function BookingDetailsPage() {
   const router = useRouter();
   const { id } = useParams<{ id: string }>();
   const [isDownloading, setIsDownloading] = React.useState(false);
   const { user, isAuthenticated } = useAuthStore();
   const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
   const [showCancelModal, setShowCancelModal] = React.useState(false);
   const pendingOrderId = React.useRef<string | null>(null);

   const { useCancelBooking } = useUserHooks();
   const cancelBookingMutation = useCancelBooking();

   React.useEffect(() => {
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
      enabled: !!id && isAuthenticated,
   });
   
   const booking = res?.data;
   const rcId = booking?.formDataJson?.redcliffeBookingId;

   const { data: labRes, isLoading: isLabLoading } = useQuery({
      queryKey: ['lab-status', rcId],
      queryFn: () => labService.getBookingStatus(rcId as string),
      enabled: !!rcId && booking?.service?.slug === 'blood-test',
      refetchInterval: 30000, // Refresh status every 30s
   });

   const labStatusData = labRes?.data?.data?.[0]; // Redcliffe returns array of matches
   const serviceConfig = booking?.service?.slug ? getServiceConfig(booking.service.slug) : null;

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
         const base = booking.amount || 0;
      const total = parseFloat((base + base * 0.18 + (booking.service?.slug === 'blood-test' ? 50 : 0)).toFixed(2));
         const initiateRes = await paymentService.initiatePayment({
            amount: total,
            bookingId: booking.id,
         });

         if (!initiateRes.success || !initiateRes.data) {
            throw new Error(initiateRes.message || 'Failed to initiate payment');
         }

         const { orderId, amount, currency, key } = initiateRes.data;
         pendingOrderId.current = orderId;

         const options: Record<string, unknown> = {
            key: key,
            amount: amount * 100,
            currency: currency,
            name: 'Ayuxacare Healthcare',
            description: `Payment for Booking #${booking.bookingCode || booking.id.slice(0, 8)}`,
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
                     window.location.reload();
                  } else {
                     toast.error('Payment verification failed.');
                  }
               } catch {
                  toast.error('Error verifying payment.');
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
               ondismiss: async function () {
                  await cancelPaymentOnBackend();
                  setIsProcessingPayment(false);
               }
            }
         };

         const rzp = new window.Razorpay(options);
         rzp.on('payment.failed', async function (response: Record<string, unknown>) {
            await cancelPaymentOnBackend();
            const rzpErr = response.error as { description?: string } | undefined;
            toast.error(rzpErr?.description || 'Payment failed.');
            setIsProcessingPayment(false);
         });
         rzp.open();
      } catch (error: unknown) {
         toast.error('Failed to initialize payment.');
         setIsProcessingPayment(false);
      }
   };

   const handleCancelBooking = async () => {
      try {
         await cancelBookingMutation.mutateAsync(id as string);
         toast.success('Booking cancelled successfully');
         setShowCancelModal(false);
      } catch (err: unknown) {
         const e = err as { response?: { data?: { message?: string } }; message?: string };
         toast.error(e.response?.data?.message || e.message || 'Failed to cancel booking');
      }
   };

   if (isLoading) {
      return <BookingDetailsSkeleton />;
   }

   if (error || !booking) {
      return (
         <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-16 h-16 text-red-200 mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Booking not found</h1>
            <p className="text-gray-500 mt-2 max-w-xs">We couldn&apos;t retrieve the details for this booking.</p>
            <button onClick={() => router.back()} className="mt-6 px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-2xl">
               Go Back
            </button>
         </div>
      );
   }

   const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;

   return (
      <div className="min-h-screen bg-gray-50 pb-24">
         <div className="bg-white px-6 py-6 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-4">
            <button onClick={() => router.back()} className="w-11 h-11 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 border border-gray-100 transition-transform active:scale-95">
               <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
               <h1 className="text-lg font-bold text-gray-900">Booking Details</h1>
               <p className="text-xs text-gray-500 font-mono">#{booking.bookingCode || id.toString().slice(0, 8).toUpperCase()}</p>
            </div>
         </div>

         <div className="max-w-2xl mx-auto p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center justify-between p-5 rounded-3xl border ${status.color}`}>
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

            {/* ─── LAB TEST TRACKER (CONDITIONAL) ─── */}
            {booking?.service?.slug === 'blood-test' && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" /> Lab Test Progress
                     </h3>
                     {isLabLoading && <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />}
                  </div>

                  {!labStatusData ? (
                     <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                        <Clock className="w-5 h-5 text-gray-300" />
                        <p className="text-xs font-medium text-gray-400">Waiting for lab to acknowledge...</p>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        {/* Phlebo Card */}
                        {labStatusData.phlebo_name && (
                           <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🤵</div>
                                 <div>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Phlebotomist Assigned</p>
                                    <p className="text-sm font-black text-emerald-900">{labStatusData.phlebo_name}</p>
                                 </div>
                              </div>
                              <a href={`tel:${labStatusData.phlebo_mobile}`} className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                 <Phone className="w-4 h-4" />
                              </a>
                           </div>
                        )}

                        {/* Status Timeline / Steps */}
                        <div className="grid grid-cols-4 gap-2">
                           {[
                              { label: 'Booking', active: true },
                              { label: 'Sample', active: !!labStatusData.sample_collected_time },
                              { label: 'In Lab', active: labStatusData.booking_status === 'Testing' || labStatusData.booking_status === 'Partially Report Published' || labStatusData.booking_status === 'Final Report Published' },
                              { label: 'Report', active: labStatusData.booking_status === 'Final Report Published' }
                           ].map((step, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-2">
                                 <div className={`h-1.5 w-full rounded-full ${step.active ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                                 <span className={`text-[9px] font-black uppercase ${step.active ? 'text-emerald-700' : 'text-gray-300'}`}>{step.label}</span>
                              </div>
                           ))}
                        </div>

                        {/* Report Download Action */}
                        {(labStatusData.booking_status === 'Final Report Published' || labStatusData.booking_status === 'Partially Report Published') && (
                           <button 
                              onClick={async () => {
                                 const tId = toast.loading('Opening report...');
                                 try {
                                    const blob = await labService.downloadReport(rcId as string);
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                    toast.success('Report opened', { id: tId });
                                 } catch (err) {
                                    toast.error('Could not fetch report yet', { id: tId });
                                 }
                              }}
                              className="w-full h-14 bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                           >
                              <Download className="w-5 h-5" /> View Results
                           </button>
                        )}
                     </div>
                  )}

                  <div className="mt-4 p-3 bg-gray-50/50 rounded-xl flex items-center gap-2">
                     <AlertCircle className="w-3 h-3 text-gray-400" />
                     <p className="text-[9px] text-gray-400 font-bold leading-tight">Reports are typically shared 12-24 hours after sample collection.</p>
                  </div>
               </motion.div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm p-6 space-y-6">
               <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center p-2">
                     {serviceConfig?.icon ? (
                        <Image src={getAssetUrl(serviceConfig.icon)} alt={booking.service?.name || 'Service'} width={48} height={48} className="object-contain" />
                     ) : (
                        <Package className="w-8 h-8 text-emerald-500" />
                     )}
                  </div>
                  <div>
                     <h2 className="text-xl font-bold text-gray-900">{booking.service?.name}</h2>
                     <p className="text-sm text-gray-500 mt-1">{serviceConfig?.tagline || 'Professional Care Service'}</p>
                  </div>
               </div>

               <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Calendar className="w-5 h-5" /></div>
                     <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scheduled Date</p>
                        <p className="text-sm font-bold text-gray-800">{booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'TBD'}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Clock className="w-5 h-5" /></div>
                     <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time Slot</p>
                        <p className="text-sm font-bold text-gray-800">
                           {!booking.scheduledTime
                              ? 'TBD'
                              : booking.scheduledTime === 'ASAP'
                              ? 'ASAP (Next 60 mins)'
                              : (() => {
                                  const d = new Date(booking.scheduledTime);
                                  if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                  return booking.scheduledTime; // raw slot string like "07:00 AM - 08:00 AM"
                                })()}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><MapPin className="w-5 h-5" /></div>
                     <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Address</p>
                        <p className="text-sm font-bold text-gray-800 line-clamp-2">{booking.addressLine || 'No address provided'}</p>
                     </div>
                  </div>
               </div>
            </div>

            {booking.formDataJson && (
               <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <FileText className="w-4 h-4 text-emerald-500" /> Additional Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     {Object.entries(booking.formDataJson).map(([key, value]) => {
                        if (['serviceId', 'id', 'price', 'address', 'scheduleTime', 'providerType', 'attachments', 'photos', 'documents'].includes(key)) return null;
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

            {/* Uploaded Documents Section */}
            {(() => {
               const allAttachments = [
                  ...(booking.attachments || []),
                  ...(booking.photos || []),
                  ...(booking.formDataJson?.attachments as string[] || []),
                  ...(booking.formDataJson?.photos as string[] || []),
                  ...(booking.formDataJson?.documents as string[] || []),
               ].filter((v, i, a) => v && typeof v === 'string' && a.indexOf(v) === i);

               if (allAttachments.length === 0) return null;

               return (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                     <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-500" /> Uploaded Documents
                     </h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {allAttachments.map((url, i) => (
                           <motion.div 
                              key={i} 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => window.open(getAssetUrl(url), '_blank')}
                              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
                           >
                              <Image 
                                 src={getAssetUrl(url)} 
                                 alt={`Attachment ${i + 1}`} 
                                 fill 
                                 className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Eye className="w-6 h-6 text-white" />
                              </div>
                           </motion.div>
                        ))}
                     </div>
                     <p className="text-[10px] text-gray-400 mt-3 font-medium text-center">
                        Click on an image to view it in full screen
                     </p>
                  </div>
               );
            })()}

            {(() => {
               const payment = booking.payments?.[0];
               const invoice = payment?.invoice;
               // Prefer invoice breakdown (most accurate), fall back to recomputing from amount
               const subtotal = invoice?.subtotal ?? booking.amount ?? 0;
               const gst = invoice?.gstAmount ?? parseFloat(((booking.amount ?? 0) * 0.18).toFixed(2));
               const isLabBooking = booking.service?.slug === 'blood-test';
               const serviceFee = isLabBooking ? 50 : 0;
               const total = invoice?.totalAmount ?? parseFloat((subtotal + gst + serviceFee).toFixed(2));
               return (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                     <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" /> Payment Summary
                     </h3>
                     <div className="space-y-2.5">
                        <div className="flex justify-between text-sm text-gray-600">
                           <span>Service Charges</span>
                           <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                           <span>GST (18%)</span>
                           <span className="font-semibold text-gray-900">₹{gst.toFixed(2)}</span>
                        </div>
                        {isLabBooking && (
                           <div className="flex justify-between text-sm text-gray-600">
                              <span>Home Collection Fee</span>
                              <span className="font-semibold text-gray-900">₹{serviceFee}</span>
                           </div>
                        )}
                        <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-lg font-bold text-gray-900">
                           <span>Total Paid</span>
                           <span className="text-emerald-700">₹{total.toFixed(2)}</span>
                        </div>
                     </div>
                     {payment?.razorpayPaymentId && (
                        <div className="mt-6 flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                           <div className="text-[10px] font-bold text-gray-400">SECURE TRANSACTION</div>
                           <span className="text-[10px] text-gray-400 font-mono">{payment.razorpayPaymentId}</span>
                        </div>
                     )}
                  </div>
               );
            })()}

            <div className={`grid ${['COMPLETED', 'CANCELLED'].includes(booking.status) ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
               <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform">
                  <Phone className="w-5 h-5 text-emerald-600 mb-2" />
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-tight">Support</span>
               </button>

               {!['COMPLETED', 'CANCELLED', 'PAYMENT_FAILED'].includes(booking.status) &&
                !(booking.scheduledDate && new Date(booking.scheduledDate) < new Date()) && (
                  <button onClick={() => setShowCancelModal(true)} className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform text-red-500">
                     <X className="w-5 h-5 mb-2" />
                     <span className="text-[10px] font-bold uppercase tracking-tight">Cancel</span>
                  </button>
               )}
               
               {booking.payments?.some((p) => p.status === 'SUCCESS') ? (
                  <button onClick={handleDownload} disabled={isDownloading} className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform disabled:opacity-50">
                     {isDownloading ? <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" /> : <Download className="w-5 h-5 text-emerald-600 mb-2" />}
                     <span className="text-[10px] font-bold text-gray-800 uppercase tracking-tight">Invoice</span>
                  </button>
               ) : ['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(booking.status) ? (
                  <button onClick={handleRetryPayment} disabled={isProcessingPayment} className="flex flex-col items-center justify-center p-4 bg-[var(--color-primary)] text-white rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-70">
                     {isProcessingPayment ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" /> : <CreditCard className="w-5 h-5 mb-2" />}
                     <span className="text-[10px] font-bold uppercase tracking-tight">Retry Pay</span>
                  </button>
               ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-50 cursor-not-allowed">
                     <AlertCircle className="w-5 h-5 text-gray-400 mb-2" />
                     <span className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tight">Invoice<br />Pending</span>
                  </div>
               )}
            </div>
         </div>

         <ConfirmationModal 
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelBooking}
            isLoading={cancelBookingMutation.isPending}
            title="Cancel Booking?"
            message="Are you sure you want to cancel this booking? This action cannot be undone and any paid amount will be refunded according to our policy."
            confirmText="Yes, Cancel it"
            type="danger"
         />
      </div>
   );
}
