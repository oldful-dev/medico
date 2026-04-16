'use client';

import React, { useState, useCallback } from 'react';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle, Camera, X, Loader2 } from 'lucide-react';
import { mediaService } from '@/services/api/mediaService';

// Icon Registry (Simulated from SDUI)
const problemIcons: Record<string, string> = {
  'fever': getAssetUrl('85703338762dce300aaacb9a05f302adc3d527f4.png'),
  'bp': getAssetUrl('a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png'),
  'weakness': getAssetUrl('a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png'),
  'pain': getAssetUrl('3a3fbbfc074010919d54378e2349e7a3ecdea262.png'),
  'rehab': getAssetUrl('cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png'),
  'stroke': getAssetUrl('9c25016906e38b6b999adf0f9fb6cb2adb589322.png'),
  'shoulder': getAssetUrl('05879295a9b69201cfab443f22bf9218402f1522.png'),
  'other': getAssetUrl('34a78d011624199a5541b871a68bb218b41e5aba.png'),
};

const PROBLEMS = [
  { id: 'fever', label: 'Fever/Flu', icon: 'fever' },
  { id: 'bp', label: 'BP/Sugar check', icon: 'bp' },
  { id: 'weakness', label: 'General Weakness', icon: 'weakness' },
  { id: 'pain', label: 'Body/Joint Pain', icon: 'pain' },
  { id: 'rehab', label: 'Post-surgery Rehab', icon: 'rehab' },
  { id: 'stroke', label: 'Stroke Recovery', icon: 'stroke' },
  { id: 'shoulder', label: 'Frozen Shoulder', icon: 'shoulder' },
  { id: 'other', label: 'Other Issues', icon: 'other' },
];

export default function DoctorVisitForm() {
  const router = useRouter();
  const addItem = useCartStore(state => state.addItem);

  const [step, setStep] = useState(1);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [doctorType, setDoctorType] = useState<'GP' | 'Physio'>('GP');
  const [timeMode, setTimeMode] = useState<'ASAP' | 'SCHEDULE'>('ASAP');
  const [scheduleDate, setScheduleDate] = useState('');
  const [address, setAddress] = useState('Home: 12th Main, Indiranagar, Bangalore');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      return newPreviews.filter((_, i) => i !== index);
    });
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSelectProblem = useCallback((id: string) => {
    setSelectedProblem(id);
    if (['rehab', 'stroke', 'shoulder'].includes(id)) {
      setDoctorType('Physio');
    } else {
      setDoctorType('GP');
    }
    // Auto-advance for better UX
    setTimeout(() => handleNext(), 300);
  }, []);

  const handleFinish = async () => {
    setIsUploading(true);
    let uploadedUrls: string[] = [];
    
    try {
      if (images.length > 0) {
        uploadedUrls = await mediaService.uploadMultipleMedia(images, 'doctor-visits');
      }

      const bookingPayload = {
        serviceId: 'doctor-home-visit',
        scheduledDate: timeMode === 'ASAP' ? new Date().toISOString() : scheduleDate,
        addressLine: address,
        amount: doctorType === 'GP' ? 499 : 699,
        paymentMethod: 'cod', // Services default to request/COD mode
        formDataJson: {
          problem: selectedProblem || 'Checkup',
          providerType: doctorType,
          scheduleTime: timeMode === 'ASAP' ? 'ASAP (Next 60 mins)' : scheduleDate,
          attachments: uploadedUrls
        }
      };

      // Import is injected at top of file, using any generic path since we are in components
      const { bookingService } = await import('@/services/api/bookingService');
      await bookingService.createBooking(bookingPayload);
      
      router.push('/app/success');
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to submit booking request. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto pb-24">
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-1.5 rounded-full transition-colors ${step >= i ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1: PROBLEM */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-gray-800">What&apos;s the health problem?</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {PROBLEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectProblem(item.id)}
                  className={`flex flex-col items-center bg-white rounded-xl shadow-sm transition-all overflow-hidden border-2 p-1 ${selectedProblem === item.id ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/5' : 'border-transparent'
                    }`}
                >
                  <div className="w-full aspect-[1/0.85] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2">
                    <img src={problemIcons[item.icon]} alt={item.label} className="w-full h-full object-contain" />
                  </div>
                  <span className={`text-[10px] text-center pt-2 pb-1 px-1 leading-tight font-bold ${selectedProblem === item.id ? 'text-[var(--color-primary)]' : 'text-gray-600'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: PROVIDER */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            <button onClick={handleBack} className="text-sm font-semibold text-gray-500 pl-1 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold text-gray-800">Select Provider Type</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setDoctorType('GP')}
                className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${doctorType === 'GP' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md' : 'border-gray-50 bg-white grayscale opacity-60'}`}
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl">👨‍⚕️</div>
                <span className="text-sm font-bold text-gray-800">General Physician</span>
              </button>
              <button
                onClick={() => setDoctorType('Physio')}
                className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${doctorType === 'Physio' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md' : 'border-gray-50 bg-white grayscale opacity-60'}`}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">💪</div>
                <span className="text-sm font-bold text-gray-800">Physiotherapist</span>
              </button>
            </div>

            <button onClick={handleNext} className="mt-8 bg-[var(--color-primary-deep)] text-white h-14 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">Continue</button>
          </motion.div>
        )}

        {/* STEP 3: TIME */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            <button onClick={handleBack} className="text-sm font-semibold text-gray-500 pl-1 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold text-gray-800">When do you need them?</h2>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setTimeMode('ASAP')}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${timeMode === 'ASAP' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md' : 'border-gray-100 bg-white'}`}
              >
                <div className={`p-3 rounded-full ${timeMode === 'ASAP' ? 'bg-emerald-100 text-[var(--color-primary-deep)]' : 'bg-gray-100 text-gray-500'}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-base">Come ASAP</div>
                  <div className="text-xs text-gray-500 mt-1">Provider will arrive in 45-60 mins</div>
                </div>
              </button>

              <button
                onClick={() => setTimeMode('SCHEDULE')}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${timeMode === 'SCHEDULE' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md' : 'border-gray-100 bg-white'}`}
              >
                <div className={`p-3 rounded-full ${timeMode === 'SCHEDULE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-base">Schedule for Later</div>
                  <div className="text-xs text-gray-500 mt-1">Pick a convenient date & time</div>
                </div>
              </button>

              {timeMode === 'SCHEDULE' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                  <input
                    type="datetime-local"
                    className="w-full border-2 border-gray-200 rounded-xl p-4 text-gray-800 outline-none focus:border-[var(--color-primary)] font-medium"
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </motion.div>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={timeMode === 'SCHEDULE' && !scheduleDate}
              className="mt-4 bg-[var(--color-primary-deep)] text-white h-14 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* STEP 4: ADDRESS */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            <button onClick={handleBack} className="text-sm font-semibold text-gray-500 pl-1 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold text-gray-800">Confirm Address</h2>

            <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-[var(--color-primary)] shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-500 mb-2">Service Location</div>
                  <textarea
                    className="w-full text-base font-medium text-gray-800 outline-none resize-none bg-transparent"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                You can edit this address or proceed directly to checkout.
              </div>
            </div>

            {/* Photo Upload Card (Added) */}
            <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-gray-800">Upload Reports or Symptom Photos</h3>
              </div>

              <div className="relative group border-2 border-dashed border-gray-100 hover:border-[var(--color-primary)] rounded-xl py-8 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-[var(--color-primary)]/5">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-[var(--color-primary)]/10 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                </div>
                <span className="text-xs font-bold text-gray-500 group-hover:text-[var(--color-primary)] mt-1">Click to browse photos</span>
                <span className="text-[10px] text-gray-400 text-center px-10 leading-tight">Optional: Share photos of symptoms or previous reports for better diagnosis</span>
                <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                      <img src={url} alt="preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 rounded-full text-white flex items-center justify-center shadow-lg active:scale-90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleFinish}
              disabled={isUploading}
              className="mt-8 bg-[var(--color-primary)] text-white h-14 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isUploading ? (
                <>Uploading Reports... <Loader2 className="w-5 h-5 animate-spin" /></>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Proceed to Cart</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
