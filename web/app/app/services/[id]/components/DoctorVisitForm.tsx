'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { motion } from 'framer-motion';

// Icon Registry (Simulated from SDUIDenderer)
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

const ProblemCard = React.memo(({ item, selected, onSelect }: { item: any, selected: boolean, onSelect: (id: string) => void }) => (
  <button
    onClick={() => onSelect(item.id)}
    className={`flex flex-col items-center bg-white rounded-xl shadow-sm transition-all overflow-hidden border-2 p-1 ${
      selected ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/5' : 'border-transparent'
    }`}
  >
    <div className="w-full aspect-[1/0.85] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2">
      <img src={problemIcons[item.icon]} alt={item.label} className="w-full h-full object-contain" />
    </div>
    <span className={`text-[10px] text-center pt-2 pb-1 px-1 leading-tight font-bold ${selected ? 'text-[var(--color-primary)]' : 'text-gray-600'}`}>
      {item.label}
    </span>
  </button>
));

ProblemCard.displayName = 'ProblemCard';

export default function DoctorVisitForm() {
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [doctorType, setDoctorType] = useState<'GP' | 'Physio'>('GP');
  
  const handleSelectProblem = useCallback((id: string) => {
    setSelectedProblem(id);
    // Smart auto-selection
    if (['rehab', 'stroke', 'shoulder'].includes(id)) {
      setDoctorType('Physio');
    } else {
      setDoctorType('GP');
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      {/* Intro */}
      <div className="bg-[#f0f9f5] rounded-2xl p-5 border border-[var(--color-primary)]/10">
        <p className="text-sm text-center text-gray-500 font-medium">
          Booking a <span className="text-[var(--color-primary)] font-bold">Doctor Visit</span> to your home for non-emergency medical assistance.
        </p>
      </div>

      {/* Select Problem */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
           <span className="w-1.5 h-6 bg-[var(--color-primary)] rounded-full" />
           What's the health problem?
        </h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {PROBLEMS.map((item) => (
            <ProblemCard 
              key={item.id} 
              item={item} 
              selected={selectedProblem === item.id} 
              onSelect={handleSelectProblem} 
            />
          ))}
        </div>
      </div>

      {/* Doctor Type */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
         <h2 className="text-md font-bold text-gray-800 mb-4">Doctor Type Selection</h2>
         <div className="flex gap-4">
             <button 
                onClick={() => setDoctorType('GP')}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${doctorType === 'GP' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-50 grayscale opacity-60'}`}
             >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">👨‍⚕️</div>
                <span className="text-xs font-bold text-gray-700">General Physician</span>
             </button>
             <button 
                onClick={() => setDoctorType('Physio')}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${doctorType === 'Physio' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-50 grayscale opacity-60'}`}
             >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">💪</div>
                <span className="text-xs font-bold text-gray-700">Physiotherapist</span>
             </button>
         </div>
      </div>

      {/* Footer Action */}
      <div className="fixed bottom-24 md:bottom-8 left-0 right-0 md:left-auto md:right-auto md:w-full md:max-w-xl px-6 pointer-events-none md:sticky md:top-[90vh]">
        <button 
          disabled={!selectedProblem}
          className={`w-full h-14 bg-[var(--color-primary-deep)] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all pointer-events-auto active:scale-95 disabled:grayscale disabled:opacity-50 ${selectedProblem ? 'translate-y-0' : 'translate-y-4 opacity-0'}`}
        >
          Select {doctorType === 'GP' ? 'Physician' : 'Physiotherapist'} 
          <span className="text-lg">→</span>
        </button>
      </div>

    </div>
  );
}
