'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { ChevronLeft, Info, Calendar, MapPin, Stethoscope, ArrowRight, ShieldCheck, Clock, Package } from 'lucide-react';
import { getServiceConfig } from '@/lib/services-config';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { formatPrice } from '@/utils/formatPrice';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[var(--color-bg-screen)]">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl shadow-emerald-900/10 flex items-center justify-center text-4xl mb-6 animate-bounce">🛒</div>
        <h2 className="text-2xl font-black text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2 text-center max-w-xs font-medium">Looks like you haven&apos;t booked any service yet. Let&apos;s find something for you!</p>
        <button 
          onClick={() => router.push('/app/services')}
          className="mt-10 bg-[var(--color-primary-deep)] text-white font-bold h-14 px-10 rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
        >
          Explore Services
        </button>
      </div>
    );
  }

  const isSubscriptionCheckout = items.some(i => i.type === 'plan');
  const isProductCheckout = items.some(i => i.type === 'product');
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const taxes = Math.round(subtotal * 0.18);
  // Plans and products don't have platform fee
  const platformFee = (isSubscriptionCheckout || isProductCheckout) ? 0 : 50;
  const total = subtotal + taxes + platformFee;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc] pb-32">
      {/* Premium Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-[#f8f9fc]/80 backdrop-blur-xl z-30">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-800 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Booking Cart</h1>
        <div className="w-10"></div>
      </header>

      <div className="px-5 flex flex-col gap-6 max-w-2xl mx-auto w-full">
        
        {/* Items List */}
        <div className="flex flex-col gap-4">
           <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Items ({items.length})</h2>
           {items.map((item) => {
             const isPlan = item.type === 'plan';
             const isProductItem = item.type === 'product';
             const config = !isPlan && !isProductItem && item.serviceId ? getServiceConfig(item.serviceId) : null;

             return (
               <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-5 relative group">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center p-3 overflow-hidden">
                        {isPlan ? (
                           <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        ) : isProductItem ? (
                           item.imageUrl
                             ? <img src={item.imageUrl as string} alt={item.name || 'Product'} className="w-full h-full object-cover rounded-xl" />
                             : <Package className="w-8 h-8 text-emerald-600" />
                        ) : (
                           <img
                              src={getAssetUrl(config?.icon || 'default-service.png')}
                              alt={config?.title || item.name || 'Service'}
                              className="w-full h-full object-contain"
                           />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-black text-gray-900 text-base leading-none mb-1">
                          {config?.title || item.name || (item.serviceId ? item.serviceId.replace('-', ' ') : 'Package')}
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{isPlan ? 'Care Subscription' : isProductItem ? 'Wellness Product' : (config?.category || 'Service')}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <div className="font-black text-gray-900 text-lg">₹{formatPrice(item.price)}</div>
                       <button 
                         onClick={() => removeItem(item.id)}
                         className="text-[10px] font-black text-red-400 uppercase tracking-tighter hover:text-red-600 transition-colors"
                       >
                         Remove
                       </button>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gray-50 -mx-5" />

                  {isPlan ? (
                     <div className="bg-emerald-50/50 rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Subscription Coverage
                        </span>
                        <p className="text-xs text-emerald-900 font-black">
                           {item.billingCycle === 'MONTHLY' ? '30 Days Complete Coverage' : 'Active Subscription for ' + item.billingCycle}
                        </p>
                     </div>
                  ) : isProductItem ? (
                     <div className="bg-emerald-50/50 rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-2">
                           <Package className="w-3 h-3" /> Wellness Store
                        </span>
                        <p className="text-xs text-emerald-900 font-black">1× {item.name}</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                           <Calendar className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Schedule</span>
                           <span className="text-xs text-gray-700 font-black">{String(item.scheduleTime || '')}</span>
                        </div>
                        </div>

                        <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                           <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Location</span>
                           <span className="text-xs text-gray-700 font-black line-clamp-1">{String(item.address || '')}</span>
                        </div>
                        </div>
                     </div>
                  )}

                  {/* Dynamic Fields Details */}
                  {!isPlan && !isProductItem && Object.entries(item).some(([k]) => !['id', 'serviceId', 'type', 'price', 'address', 'scheduleTime', 'problem', 'providerType', 'name', 'planId', 'billingCycle'].includes(k)) && (
                     <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                           <Info className="w-3 h-3" /> Additional Details
                        </span>
                        <div className="grid grid-cols-2 gap-y-2">
                           {Object.entries(item).map(([key, value]) => {
                             if (['id', 'serviceId', 'type', 'price', 'address', 'scheduleTime', 'problem', 'providerType', 'name', 'planId', 'billingCycle'].includes(key)) return null;
                             return (
                               <div key={key} className="flex flex-col">
                                  <span className="text-[9px] text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                  <span className="text-xs text-gray-700 font-bold">{String(value)}</span>
                                </div>
                             );
                           })}
                        </div>
                     </div>
                  )}
               </div>
             );
           })}
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
           <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest border-b border-gray-50 pb-2 mb-1">Bill Summary</h3>
           
           <div className="flex justify-between text-sm font-bold text-gray-500">
             <span>Items Subtotal</span>
             <span className="text-gray-900 font-black">₹{subtotal.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-sm font-bold text-gray-500">
             <span className="flex items-center gap-1.5">Taxes & GST <Info className="w-3.5 h-3.5 text-gray-300"/></span>
             <span className="text-gray-900 font-black">₹{taxes.toFixed(2)}</span>
           </div>
           {platformFee > 0 && (
              <div className="flex justify-between text-sm font-bold text-gray-500">
                <span>Platform Fee</span>
                <span className="text-gray-900 font-black">₹{platformFee}</span>
              </div>
           )}
           
           <div className="h-px bg-gray-50 mt-2" />
           
           <div className="flex justify-between items-center py-2">
              <div className="flex flex-col">
                 <span className="text-lg font-black text-gray-900">Total Amount</span>
                 <span className="text-[10px] text-emerald-600 font-bold">Inclusive of all taxes</span>
              </div>
              <div className="text-2xl font-black text-[var(--color-primary-deep)] tracking-tighter">₹{total.toFixed(2)}</div>
           </div>
        </div>

        {/* Safety Note */}
        {!isSubscriptionCheckout && (
           <div className="flex gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                 <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-[11px] text-blue-700 font-semibold leading-relaxed">
                 Our professionals follow strict safety protocols and sanitization guidelines for every home visit.
              </p>
           </div>
        )}

      </div>

      {/* Instant Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-white via-white to-transparent">
         <div className="max-w-xl mx-auto">
            <button 
              onClick={() => router.push('/app/checkout')}
              className="group w-full h-16 bg-[var(--color-primary-deep)] text-white rounded-2xl font-black text-lg flex items-center justify-between px-8 shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all"
            >
              <div className="flex flex-col items-start leading-none text-left">
                 <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Pay Total</span>
                 <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                 Proceed to Pay <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
         </div>
      </div>
    </div>
  );
}
