'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight, Clock, MapPin, 
  ArrowRight, Activity,
  ChevronLeft, Zap, FileText
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { SERVICES_CONFIG } from '@/lib/services-config';
import HomeEssentialsBooking from '@/components/services/HomeEssentialsBooking';
import { motion } from 'framer-motion';

const PROBLEMS = [
  { id: 'fever', label: 'Fever / Flu', icon: '85703338762dce300aaacb9a05f302adc3d527f4.png', provider: 'GP' },
  { id: 'bp', label: 'BP / Sugar check', icon: 'a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png', provider: 'GP' },
  { id: 'weakness', label: 'General Weakness', icon: 'a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png', provider: 'GP' },
  { id: 'pain', label: 'Body / Joint Pain', icon: '3a3fbbfc074010919d54378e2349e7a3ecdea262.png', provider: 'GP' },
  { id: 'rehab', label: 'Post-surgery Rehab', icon: 'cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png', provider: 'Physio' },
  { id: 'stroke', label: 'Stroke Recovery', icon: '9c25016906e38b6b999adf0f9fb6cb2adb589322.png', provider: 'Physio' },
  { id: 'shoulder', label: 'Frozen Shoulder', icon: '05879295a9b69201cfab443f22bf9218402f1522.png', provider: 'Physio' },
  { id: 'other', label: 'Other Issues', icon: '34a78d011624199a5541b871a68bb218b41e5aba.png', provider: 'GP' },
];

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore(state => state.addItem);
  
  const config = SERVICES_CONFIG[id];

  // Booking state for specialized forms
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'GP' | 'Physio'>('GP');
  const [timeMode, setTimeMode] = useState<'ASAP' | 'SCHEDULE'>('ASAP');
  const [scheduleDate, setScheduleDate] = useState('');
  const [address, setAddress] = useState('');

  const isDoctorVisit = id === 'doctor-home-visit' || id === 'doctor-visit';
  const isHospitalTrip = id === 'hospital-trip';

  // Use the unified booking UI for all standard service categories (except Quick Services)
  if (config && ['home-essentials', 'medical', 'diagnostic', 'wellness'].includes(config.category) && !isDoctorVisit && !isHospitalTrip) {
     // ... (standard layout)
     return (
       <div className="min-h-screen bg-[var(--color-bg-screen)]">
         <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-10 overflow-x-auto whitespace-nowrap pb-2">
               <Link href="/app/dashboard" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
               <ChevronRight className="w-3 h-3" />
               <Link href="/app/services" className="hover:text-[var(--color-primary)] transition-colors">Services</Link>
               <ChevronRight className="w-3 h-3" />
               <span className="text-[var(--color-primary)]">{config.title}</span>
            </div>
            <HomeEssentialsBooking 
              config={config} 
              onBook={(data) => {
                addItem({ serviceId: config.slug, ...data, price: config.pricing[0].price });
                router.push('/app/cart');
              }} 
            />
         </div>
       </div>
     );
  }

  // --- Specialized Premium Layout for Quick Services (Doctor Visit / Hospital Trip) ---
  const handleSelectProblem = (pId: string) => {
    setSelectedProblem(pId);
    if (['rehab', 'stroke', 'shoulder'].includes(pId)) setSelectedProvider('Physio');
    else setSelectedProvider('GP');
  };

  const handleBookQuickService = () => {
    if ((isDoctorVisit && !selectedProblem) || (isHospitalTrip && !selectedProblem)) return;
    
    addItem({
      serviceId: config?.slug || id,
      problem: selectedProblem || '',
      providerType: selectedProvider,
      visitType: visitType,
      scheduleTime: timeMode === 'ASAP' ? 'ASAP' : scheduleDate,
      address,
      price: isDoctorVisit ? (selectedProvider === 'Physio' ? 699 : 499) : 500
    });
    router.push('/app/cart');
  };

  const visitType = 'Home'; // Default

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] pb-24">
      {/* Header Banner */}
      <div className="bg-[var(--color-primary-deep)] text-white pt-10 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex items-start gap-6">
          <button onClick={() => router.back()} className="mt-1 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black mb-2">{config?.title}</h1>
            <p className="text-emerald-100/80 font-medium">{config?.tagline}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto -mt-12 px-6 grid grid-cols-1 gap-6">
         
         {/* Step 1: Selection Grid */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
               <Activity className="w-5 h-5 text-emerald-500" /> 
               {isDoctorVisit ? 'What is the health problem?' : 'Select a Specialist'}
            </h2>
            
            <div className={`grid grid-cols-2 ${isDoctorVisit ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
               {(isDoctorVisit ? PROBLEMS : HOSPITAL_SPECIALISTS).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProblem(p.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${
                      selectedProblem === p.id 
                      ? 'border-emerald-500 bg-emerald-50 shadow-inner' 
                      : 'border-gray-50 bg-gray-50 hover:border-emerald-200'
                    }`}
                  >
                    <div className="w-12 h-12 relative mb-1">
                      <Image 
                         src={getAssetUrl(p.icon)} 
                         alt={p.label} 
                         fill 
                         className="object-contain group-hover:scale-110 transition-transform" 
                      />
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight ${selectedProblem === p.id ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {p.label}
                    </span>
                  </button>
               ))}
            </div>
            
            {isDoctorVisit && (
               <div className="mt-8 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">Auto</div>
                  <p className="text-[10px] text-amber-700 font-bold">Post-surgery, Rehab & Stroke visits will auto-select Physiotherapist</p>
               </div>
            )}
         </motion.div>

         {/* Step 2: Options */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Provider Type */}
            {isDoctorVisit && (
               <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 flex flex-col">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Professional Type</h3>
                  <div className="flex flex-col gap-3 flex-1">
                     {['GP', 'Physio'].map(type => (
                        <button 
                           key={type}
                           onClick={() => setSelectedProvider(type as 'GP' | 'Physio')}
                           className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 border-2 ${
                              selectedProvider === type 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md transform scale-[1.02]' 
                              : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:scale-[1.01]'
                           }`}
                        >
                           <div className="w-8 h-8 relative shrink-0">
                              <Image 
                                 src={getAssetUrl(type === 'GP' ? '9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png' : 'ad2bd697d39bc0738ca19a09e58ce4677761ca47.png')} 
                                 alt={type} 
                                 fill 
                                 className="object-contain" 
                              />
                           </div>
                           <span className="text-base">{type === 'GP' ? 'GP Visit' : 'Physio Visit'}</span>
                        </button>
                     ))}
                  </div>
               </div>
            )}

            {/* Urgency */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">When should we arrive?</h3>
               <div className="space-y-3">
                  <button 
                     onClick={() => setTimeMode('ASAP')}
                     className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        timeMode === 'ASAP' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-50'
                     }`}
                  >
                     <div className="flex items-center gap-3">
                        <Zap className={`w-5 h-5 ${timeMode === 'ASAP' ? 'text-emerald-500' : 'text-gray-300'}`} />
                        <div className="text-left">
                           <p className="text-sm font-bold text-gray-900">ASAP (Next 60 mins)</p>
                           <p className="text-[10px] text-gray-400 font-medium">Urgent attention needed</p>
                        </div>
                     </div>
                     <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${timeMode === 'ASAP' ? 'border-emerald-500' : 'border-gray-200'}`}>
                        {timeMode === 'ASAP' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                     </div>
                  </button>

                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${
                        timeMode === 'SCHEDULE' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-50 bg-white'
                     }`}>
                     <button 
                        onClick={() => setTimeMode('SCHEDULE')}
                        className="w-full flex items-center justify-between p-4"
                     >
                        <div className="flex items-center gap-3">
                           <Clock className={`w-5 h-5 ${timeMode === 'SCHEDULE' ? 'text-emerald-500' : 'text-gray-300'}`} />
                           <div className="text-left">
                              <p className="text-sm font-bold text-gray-900">Schedule for Later</p>
                              <p className="text-[10px] text-gray-400 font-medium">Pick a specific date & time</p>
                           </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${timeMode === 'SCHEDULE' ? 'border-emerald-500' : 'border-gray-200'}`}>
                           {timeMode === 'SCHEDULE' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                        </div>
                     </button>
                     
                     <motion.div 
                        initial={false}
                        animate={{ height: timeMode === 'SCHEDULE' ? 'auto' : 0, opacity: timeMode === 'SCHEDULE' ? 1 : 0 }}
                        className="px-4 pb-4"
                     >
                        <div className="pt-2 border-t border-emerald-100">
                           <input 
                              type="datetime-local" 
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="w-full h-11 bg-white border-2 border-emerald-100 rounded-xl px-4 text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                           />
                        </div>
                     </motion.div>
                  </div>
               </div>
            </div>
         </div>

         {/* Step 3: Logistics */}
         <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 space-y-6">
            <div className="flex flex-col gap-2">
               <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Confirm Location</label>
               <div className="relative group">
                  <MapPin className="absolute left-4 top-4 w-5 h-5 text-emerald-500" />
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter full address for the visit..."
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium min-h-[100px]"
                  />
               </div>
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Add Reports / Photos (Optional)</label>
               <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-emerald-300 transition-all cursor-pointer bg-gray-50/50">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                     <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-xs font-bold text-gray-500">Click to upload medical documents</p>
                  <p className="text-[10px] text-gray-400">PDF, JPG or PNG (Max 5MB)</p>
               </div>
            </div>
         </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 flex items-center justify-center z-50">
         <div className="max-w-4xl w-full flex items-center justify-between gap-6">
            <div className="hidden sm:block">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount</p>
               <p className="text-2xl font-black text-gray-900">₹{isDoctorVisit ? (selectedProvider === 'Physio' ? 699 : 499) : 500}</p>
            </div>
            <button 
               onClick={handleBookQuickService}
               disabled={!selectedProblem || !address}
               className="flex-1 sm:flex-none sm:min-w-[280px] h-14 bg-[var(--color-primary-deep)] text-white rounded-2xl font-black shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
            >
               Confirm & Book Now <ArrowRight className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
}

const HOSPITAL_SPECIALISTS = [
  { id: 'eye', label: 'Eye Specialist', icon: 'e9d68d0206e443ceceadd7907cd94f1c86fcacd4.png' },
  { id: 'brain', label: 'Brain & Nerves', icon: '2e6febd890c9753178f23a84a8293d0b79e606b6.png' },
  { id: 'kidney', label: 'Kidney & Urinary', icon: 'bc2188e6d87da62a1af90ead7f0bf3503c62395c.png' },
  { id: 'lungs', label: 'Lungs & Breathing', icon: '2e704f53861f02d36dae70114611506893870ca5.png' },
  { id: 'dental', label: 'Dental Care', icon: 'fde7739eae440fa8bbeccc49dfe81d9417584cdb.png' },
  { id: 'cancer', label: 'Cancer Specialist', icon: '12a939ac9402eccf1948ba9378dc7ffb078381cb.png' },
];


