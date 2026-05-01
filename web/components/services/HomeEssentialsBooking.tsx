'use client';

import React, { useState } from 'react';
import {
   MapPin, CheckCircle2,
   Info, Camera, Calendar, ArrowRight, ChevronRight, Loader2,
} from 'lucide-react';
import { ServiceConfig } from '@/lib/services-config';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils/formatPrice';

interface Props {
   config: ServiceConfig;
   onBook: (data: Record<string, unknown>) => void;
   isLoading?: boolean;
   livePrice?: number; // API-sourced price — overrides hardcoded config pricing
}

export default function HomeEssentialsBooking({ config, onBook, isLoading = false, livePrice }: Props) {
   const { user } = useAuthStore();
   const [formData, setFormData] = useState<Record<string, unknown>>({});
   const [selectedDate, setSelectedDate] = useState('');
   const [address, setAddress] = useState(user?.addresses?.[0]?.line1 || '');
   const [images, setImages] = useState<File[]>([]);

   // Effective price: prefer live API price, fall back to config
   const displayPrice = livePrice ?? config.pricing[0]?.price ?? 0;

   const handleFieldChange = (id: string, value: unknown) => {
      setFormData(prev => ({ ...prev, [id]: value }));
   };

   const isFormValid = config.formFields.every(f => !f.required || formData[f.id]) && selectedDate && address;

   return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

         {/* ── LEFT COLUMN: INFO (7 Cols) ── */}
         <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Hero Banner */}
            <div className="relative min-h-[260px] md:min-h-[300px] rounded-3xl overflow-hidden group shadow-xl bg-[var(--color-primary-deep)] flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
               <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-all duration-500 z-5" />

               {/* Mock Hero Image Background */}
               <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-full opacity-30 scale-150 blur-3xl bg-emerald-400 rounded-full animate-pulse" />
                  <div className="relative z-20 flex flex-col items-center text-center px-6 md:px-10 py-10">
                     <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-5 border border-white/30 shadow-2xl">
                        <img 
                           src={getAssetUrl(config.icon)} 
                           alt={config.title} 
                           className="w-12 h-12 md:w-16 md:h-16 object-contain" 
                        />
                     </div>
                     <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">{config.title}</h1>
                     <p className="text-emerald-100 text-base md:text-lg font-medium opacity-90 max-w-md">{config.tagline}</p>
                  </div>
               </div>
            </div>

            {/* Description Section */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
               <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-500" /> About this service
               </h2>
               <p className="text-gray-600 leading-relaxed text-sm">{config.description}</p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {config.inclusions.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all group">
                     <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <CheckCircle2 className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-semibold text-gray-700">{item}</span>
                  </div>
               ))}
            </div>

            {/* How it Works (Visual Steps) */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
               <h2 className="text-lg font-bold text-gray-900 mb-6">How it works</h2>
               <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
                  <div className="flex flex-col gap-6">
                     {config.howItWorks.map((step, i) => (
                        <div key={i} className="relative flex items-center gap-5 pl-12 group">
                           <div className="absolute left-0 w-10 h-10 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-base z-10 transition-all group-hover:bg-emerald-500 group-hover:text-white shadow-lg">
                              {i + 1}
                           </div>
                           <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800 mb-0.5">{step}</p>
                              <p className="text-xs text-gray-400">Step {i + 1} of the process</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* FAQs Accordion */}
            <div className="flex flex-col gap-3">
               <h2 className="text-xl font-bold text-gray-900 mb-2">Frequently Asked</h2>
               {config.faqs.map((faq, i) => (
                  <details key={i} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden text-sm">
                     <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-gray-800 list-none hover:bg-emerald-50 transition-all">
                        {faq.q}
                        <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                     </summary>
                     <div className="p-5 pt-0 text-gray-600 leading-relaxed border-t border-gray-50">
                        {faq.a}
                     </div>
                  </details>
               ))}
            </div>

         </div>

         {/* ── RIGHT COLUMN: BOOKING FORM (5 Cols) ── */}
         <div className="lg:col-span-5 relative">
            <div className="sticky top-24 bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden ring-1 ring-black/5">

               {/* Header */}
               <div className="bg-gradient-to-r from-[var(--color-primary-deep)] to-emerald-800 p-6">
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="text-xl font-bold text-white">Book Now</h3>
                        <p className="text-emerald-200 text-xs mt-1">Starting from ₹{formatPrice(displayPrice)}</p>
                     </div>
                     <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">
                        Available
                     </div>
                  </div>
               </div>

               <div className="p-4 flex flex-col gap-4">

                  {/* Dynamic Fields */}
                  {config.formFields.map(field => (
                     <div key={field.id} className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{field.label} {field.required && '*'}</label>
                        {field.type === 'select' ? (
                           <select
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-sm font-medium outline-none transition-all appearance-none cursor-pointer"
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                              defaultValue=""
                           >
                              <option value="" disabled>{field.placeholder || `Select ${field.label}`}</option>
                              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                           </select>
                        ) : field.type === 'textarea' ? (
                           <textarea
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-sm font-medium outline-none transition-all resize-none"
                              rows={3}
                              placeholder={field.placeholder}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                           />
                        ) : (
                           <input
                              type={field.type}
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-sm font-medium outline-none transition-all"
                              placeholder={field.placeholder}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                           />
                        )}
                     </div>
                  ))}

                  {/* Photo Upload */}
                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Upload Issue Photos</label>
                     <div className="relative group border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-emerald-50/30">
                        <Camera className="w-8 h-8 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-sm font-bold text-gray-400 group-hover:text-emerald-600">Click to upload photos</span>
                        <span className="text-[10px] text-gray-400">Optional but recommended</span>
                        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImages(Array.from(e.target.files || []))} />
                     </div>
                     {images.length > 0 && <p className="text-[10px] text-emerald-600 font-bold ml-1">{images.length} photos selected</p>}
                  </div>

                  {/* DateTime */}
                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Schedule Appointment *</label>
                     <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input
                           type="datetime-local"
                           className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition-all cursor-pointer"
                           min={new Date().toISOString().slice(0, 16)}
                           onChange={(e) => setSelectedDate(e.target.value)}
                        />
                     </div>
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Service Location *</label>
                     <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-emerald-500" />
                        <textarea
                           className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition-all resize-none"
                           rows={2}
                           value={address}
                           placeholder="Enter your full address"
                           onChange={(e) => setAddress(e.target.value)}
                        />
                     </div>
                  </div>

                  {/* Total Section */}
                  <div className="mt-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                     <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Payable</span>
                        <span className="text-xl font-black text-emerald-800">₹{formatPrice(displayPrice)}</span>
                     </div>
                     <p className="text-[9px] text-emerald-600 font-medium">Inclusive of taxes & visit charges</p>
                  </div>

                  {/* Submit */}
                  <button
                     disabled={!isFormValid || isLoading}
                     onClick={() => onBook({ ...formData, selectedDate, address, images })}
                     className={`group relative w-full h-16 rounded-2xl font-black text-base shadow-xl transition-all active:scale-[0.98] ${isFormValid && !isLoading
                        ? 'bg-[var(--color-primary-deep)] text-white hover:bg-[#023d22] shadow-emerald-900/20'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                  >
                     <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                           <>
                              <Loader2 className="w-5 h-5 animate-spin" /> Preparing...
                           </>
                        ) : (
                           <>Confirm Booking <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                        )}
                     </span>
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  </button>

                  <p className="text-center text-[10px] text-gray-400 font-medium">
                     By booking, you agree to our Terms of Service
                  </p>

               </div>
            </div>
         </div>

      </div>
   );
}
