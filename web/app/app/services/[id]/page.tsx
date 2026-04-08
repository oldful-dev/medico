'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';

// This is a simplified version of the doctor-visit logic we saw earlier.
// In a real production app, we would map the 'id' to a specific configuration or form.
import DoctorVisitForm from './components/DoctorVisitForm';

const SERVICE_FORMS: Record<string, React.FC> = {
  'doctor-visit': DoctorVisitForm,
  // Add others here: 'home-nurse': HomeNurseForm, etc.
};

export default function ServicePage() {
  const { id } = useParams();
  const router = useRouter();

  const FormComponent = useMemo(() => {
    return SERVICE_FORMS[id as string] || (() => (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">🧩</div>
        <h2 className="text-xl font-bold text-gray-800">Service Coming Soon</h2>
        <p className="text-gray-500 mt-2">The {id} flow is being optimized for web performance.</p>
        <button 
          onClick={() => router.back()}
          className="mt-6 bg-[var(--color-primary)] text-white px-6 py-2 rounded-full font-bold shadow-lg"
        >
          Go Back
        </button>
      </div>
    ));
  }, [id, router]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-screen)]">
      {/* Header Area */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[var(--color-bg-screen)] z-10">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 capitalize">
          {id?.toString().replace('-', ' ')}
        </h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <AnimatePresence mode="wait">
        <motion.div
           key={id as string}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3 }}
           className="flex-1 px-4 pb-20"
        >
          <FormComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
