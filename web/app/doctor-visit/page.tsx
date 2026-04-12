'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAssetUrl } from '@/utils/getAssetUrl';

// Icon Hashes
const feverIcon = getAssetUrl('85703338762dce300aaacb9a05f302adc3d527f4.png');
const bpSugarIcon = getAssetUrl('a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png');
const generalWeaknessIcon = getAssetUrl('a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png');
const bodyPainIcon = getAssetUrl('3a3fbbfc074010919d54378e2349e7a3ecdea262.png');
const postSurgeryIcon = getAssetUrl('cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png');
const strokeIcon = getAssetUrl('9c25016906e38b6b999adf0f9fb6cb2adb589322.png');
const frozenShoulderIcon = getAssetUrl('05879295a9b69201cfab443f22bf9218402f1522.png');
const otherIcon = getAssetUrl('34a78d011624199a5541b871a68bb218b41e5aba.png');
const gpDoctorIcon = getAssetUrl('9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png');
const physioIcon = getAssetUrl('ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');

const PROBLEMS = [
  { label: 'Fever/Flu', icon: feverIcon },
  { label: 'BP/Sugar check', icon: bpSugarIcon },
  { label: 'General Weakness', icon: generalWeaknessIcon },
  { label: 'Body pain/joint pain', icon: bodyPainIcon },
  { label: 'Poster-surgery Rehab', icon: postSurgeryIcon },
  { label: 'Stroke Recovery', icon: strokeIcon },
  { label: 'Frozen shoulder', icon: frozenShoulderIcon },
  { label: 'Other', icon: otherIcon },
];

export default function DoctorVisitScreen() {
  const router = useRouter();

  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedDoctorType, setSelectedDoctorType] = useState<'GP' | 'Physio'>('GP');
  const [visitType, setVisitType] = useState<'Home' | 'Clinic'>('Home');
  const [selectedWhen, setSelectedWhen] = useState<'ASAP' | 'Later'>('ASAP');
  const [isBooking, setIsBooking] = useState(false);

  const [address, setAddress] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsDetecting(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)} (GPS)`);
          setIsDetecting(false);
        },
        () => {
          setIsDetecting(false);
          setAddress('');
        }
      );
    }
  }, []);

  const handleBookService = async () => {
    if (!selectedProblem) {
      alert('Please select a health problem first.');
      return;
    }
    setIsBooking(true);
    // Mimicking network request
    setTimeout(() => {
      setIsBooking(false);
      router.push('/doctor-visit/confirmation'); // Redirect to next step based on API return
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-primary)]">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-5 pt-8 pb-6">
        <button onClick={() => router.back()} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-white text-xl font-semibold -ml-8">Doctor Visit</h1>
        <div className="w-6"></div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 bg-[var(--color-bg-screen)] rounded-t-[40px] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32">
          
          {/* Description Card */}
          <div className="bg-white/40 rounded-xl px-4 py-3 mb-5 shadow-sm">
            <p className="text-center text-sm text-[#777]">
              <span className="font-medium text-[var(--color-text-dark)]">Booking a doctor or </span>
              <span className="font-medium text-[var(--color-primary)]">physiotherapist </span>
              to visit your home for non-emergency issues.
            </p>
          </div>

          {/* Select Problem Card */}
          <div className="bg-white rounded-xl p-5 mb-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <h2 className="text-[var(--color-primary)] font-semibold text-lg mb-4">Select problem</h2>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {PROBLEMS.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedProblem(item.label)}
                  className={`flex flex-col items-center bg-[var(--color-bg-screen)] rounded-md shadow-sm transition-all overflow-hidden border-2 ${
                    selectedProblem === item.label ? 'border-[var(--color-primary)]' : 'border-transparent'
                  }`}
                >
                  <div className="w-full aspect-[1/0.85] bg-white overflow-hidden">
                    <img src={item.icon} alt={item.label} className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[10px] text-center py-2 px-1 leading-3 ${selectedProblem === item.label ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-dark)] font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
              {/* Dummy block to balance grid */}
              <div className="hidden"></div>
            </div>

            {/* Smart Banner */}
            <div className="flex flex-row items-center mt-2 px-1">
              <span className="bg-[#61ac6699] text-[var(--color-text-dark)] text-[10px] font-medium px-2 py-0.5 rounded mr-2">Smart :</span>
              <span className="text-[var(--color-primary)] text-[10px] font-medium leading-none flex-1">
                Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist
              </span>
            </div>
          </div>

          {/* Select Doctor Type Card */}
          <div className="bg-white rounded-xl p-5 mb-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <h2 className="text-[var(--color-primary)] font-semibold text-lg mb-4">Select doctor type</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDoctorType('GP')}
                className={`flex-1 flex flex-row items-center justify-center py-2 px-2 rounded-lg border ${
                  selectedDoctorType === 'GP' 
                    ? 'border-[var(--color-primary)] bg-[rgba(2,116,63,0.05)] text-[var(--color-primary)]' 
                    : 'border-gray-300 text-[var(--color-text-muted)]'
                }`}
              >
                <img src={gpDoctorIcon} alt="GP" className="w-6 h-6 mr-1" />
                <span className="text-xs font-medium">General Physician</span>
              </button>
              <button
                onClick={() => setSelectedDoctorType('Physio')}
                className={`flex-1 flex flex-row items-center justify-center py-2 px-2 rounded-lg border ${
                  selectedDoctorType === 'Physio' 
                    ? 'border-[var(--color-primary)] bg-[rgba(2,116,63,0.05)] text-[var(--color-primary)]' 
                    : 'border-gray-300 text-[var(--color-text-muted)]'
                }`}
              >
                <img src={physioIcon} alt="Physio" className="w-6 h-6 mr-1" />
                <span className="text-xs font-medium">Physiotherapist</span>
              </button>
            </div>
          </div>

          {/* Select Visit Type Card */}
          <div className="bg-white rounded-xl p-5 mb-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <h2 className="text-[var(--color-primary)] font-semibold text-lg mb-4">Select Visit Type</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setVisitType('Home')}
                className={`flex-1 flex flex-row items-center py-2 px-3 rounded-lg border ${
                  visitType === 'Home' 
                    ? 'border-[var(--color-primary)] bg-[rgba(4,131,87,0.05)] text-[var(--color-primary)]' 
                    : 'border-gray-300 text-[var(--color-text-muted)]'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <span className="text-sm font-semibold">Home session</span>
              </button>
              <button
                onClick={() => setVisitType('Clinic')}
                className={`flex-1 flex flex-row items-center py-2 px-3 rounded-lg border ${
                  visitType === 'Clinic' 
                    ? 'border-[var(--color-primary)] bg-[rgba(4,131,87,0.05)] text-[var(--color-primary)]' 
                    : 'border-gray-300 text-[var(--color-text-muted)]'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span className="text-sm font-medium">Clinic Visit</span>
              </button>
            </div>
          </div>

          {/* When? Card */}
          <div className="bg-white rounded-xl p-5 mb-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <h2 className="text-[var(--color-primary)] font-semibold text-lg mb-4">When?</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="radio" 
                  name="when" 
                  value="ASAP" 
                  checked={selectedWhen === 'ASAP'} 
                  onChange={() => setSelectedWhen('ASAP')}
                  className="w-5 h-5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300" 
                />
                <span className="ml-3 text-sm font-medium text-[var(--color-primary-dark)]">Come ASAP <span className="text-[#888] font-normal text-xs">(Urgent)</span></span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="radio" 
                  name="when" 
                  value="Later" 
                  checked={selectedWhen === 'Later'} 
                  onChange={() => setSelectedWhen('Later')}
                  className="w-5 h-5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300" 
                />
                <span className="ml-3 text-sm font-medium text-[var(--color-primary-dark)]">Schedule Later <span className="text-[#888] font-normal text-xs">(Date/Time picker)</span></span>
              </label>
            </div>
          </div>

          {/* Confirm Address */}
          <div className="bg-white rounded-xl p-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <h2 className="text-[var(--color-primary)] font-semibold text-lg mb-3">Confirm address</h2>
            <div className="flex items-center bg-[#d9d9d94a] border border-[#8f8f8f26] rounded-md px-3 py-2 mb-2">
              <svg className="w-4 h-4 text-gray-700 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="text-sm flex-1 truncate text-gray-800">
                {isDetecting ? 'Detecting location...' : address || 'No address found. Please update profile.'}
              </span>
              <button className="text-[var(--color-primary)] text-sm ml-2" onClick={() => router.push('/app/account')}>Edit</button>
            </div>
            <p className="text-[var(--color-primary)] text-xs ml-1">Location detected from browser.</p>
          </div>

        </div>
      </div>

      {/* Floating Action Button Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FFFFF8] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-[10px] py-4 flex justify-center z-50">
        <button
          onClick={handleBookService}
          disabled={isBooking}
          className="w-[85%] max-w-[340px] h-12 bg-[var(--color-primary)] rounded-full text-white font-medium text-lg flex items-center justify-center transition-opacity active:scale-95 disabled:opacity-60"
        >
          {isBooking ? 'Processing...' : 'Book Now'}
        </button>
      </div>

    </div>
  );
}
