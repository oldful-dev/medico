'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import {
  Camera,
  MapPin,
  Info,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { userService } from '@/services/api/userService';
import { cityService, City } from '@/services/api/cityService';
import { useAuthStore, AuthUser } from '@/store/authStore';
import { Suspense } from 'react';
import { PhoneInput } from '@/components/common/PhoneInput';
import Link from 'next/link';

interface ProfileFormData {
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  preferredLanguage: string;
  cityId: string;
  line1: string;
  line2: string;
  emergencyNumber: string;
}

function ProfileSetupForm() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const { login } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      preferredLanguage: 'en',
      cityId: '',
      line1: '', // Flat/House number
      line2: '', // Full address
      emergencyNumber: ''
    }
  });

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await cityService.getCities();
        console.log('CITIES RESPONSE:', res);
        if (res.success && Array.isArray(res.data)) {
          // Filter: only allow enabled cities that aren't coming soon
          const active = res.data.filter(c => c.isEnabled && !c.isComingSoon);
          console.log(`Fetched ${res.data.length} cities, ${active.length} active.`);
          setCities(active);
        } else {
          console.error('Invalid city response format:', res);
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };
    fetchCities();
  }, []);

  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding using OpenStreetMap (Free, no key required for basic use)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setValue('line2', data.display_name);
            // Optionally try to match city
            const city = data.address.city || data.address.town || data.address.village;
            if (city) {
              const matchedCity = cities.find(c => city.toLowerCase().includes(c.name.toLowerCase()));
              if (matchedCity) setValue('cityId', matchedCity.id);
            }
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Failed to get your location. Please type it manually.');
        setDetecting(false);
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

   const onSubmit = async (data: ProfileFormData) => {
    if (!agreed) {
      setError('Please agree to the Policies and Terms to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create User
      const res = await userService.createUser({
        ...data,
        phone,
        emergencyNumber: data.emergencyNumber ? `+91${data.emergencyNumber.replace(/\D/g, '').slice(-10)}` : undefined
      });

      if (res.success && res.data) {
        const { accessToken, refreshToken, ...user } = res.data as { accessToken: string; refreshToken: string } & AuthUser;

        // 2. Authenticate
        await login(accessToken, refreshToken, user as AuthUser);

        // 3. Upload Avatar if exists
        if (profileImage) {
          try {
            await userService.uploadAvatar(profileImage);
          } catch (imgErr) {
            console.warn('Avatar upload failed (non-blocking):', imgErr);
          }
        }

        // 4. Success - use hard navigation to ensure cookies sync with Middleware and Zustand hydrates fresh data
        const redirect = searchParams.get('redirect') || '/app/dashboard';
        window.location.href = redirect;
      } else {
        setError(res.message || 'Failed to complete profile registration');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Part */}
      <div className="bg-gradient-to-r from-[var(--color-primary-deep)] to-emerald-800 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <Image src="/PNG TRANS.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <div className="text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Let&apos;s Create your</p>
            <h1 className="text-3xl font-black tracking-tight">PROFILE</h1>
          </div>
        </div>
        <div className="hidden sm:block px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <p className="text-[10px] font-bold text-white uppercase tracking-widest">Step 2 of 2</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
            <Info className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Row 1: Name + Profile Photo */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
            <input 
              {...register('name', { required: true, minLength: 3 })}
              placeholder="Enter your full name"
              className={`w-full h-14 bg-gray-50 border-2 rounded-2xl px-5 text-sm font-semibold outline-none transition-all ${errors.name ? 'border-rose-200 focus:border-rose-500' : 'border-transparent focus:border-emerald-500 focus:bg-white'}`}
            />
          </div>
          <div className="relative shrink-0">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2 sm:text-right">Photo</label>
             <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--color-primary-deep)] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                   <Camera className="w-4 h-4 text-white" />
                </div>
             </div>
          </div>
        </div>

        {/* Row 2: Email + Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email ID</label>
            <input 
              {...register('email', { pattern: /^\S+@\S+$/i })}
              placeholder="name@example.com"
              className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 text-sm font-semibold outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Language</label>
            <select 
              {...register('preferredLanguage')}
              className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 text-sm font-semibold outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="bn">Bengali</option>
            </select>
          </div>
        </div>

        {/* Row 3: DOB + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">DOB</label>
            <input 
              type="date"
              {...register('dateOfBirth')}
              className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 text-sm font-semibold outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
            <select 
              {...register('gender')}
              className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 text-sm font-semibold outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 4: Phone (Disabled) + City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="space-y-2 opacity-60">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Verified Mobile</label>
            <div className="w-full h-14 bg-gray-100 border-2 border-transparent rounded-2xl px-5 flex items-center justify-between text-sm font-bold text-gray-500">
               {phone}
               <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service City *</label>
            <select 
              {...register('cityId', { required: true })}
              className={`w-full h-14 bg-gray-50 border-2 rounded-2xl px-5 text-sm font-semibold outline-none transition-all appearance-none cursor-pointer ${errors.cityId ? 'border-rose-200' : 'border-transparent focus:border-emerald-500 focus:bg-white'}`}
            >
              <option value="">Select your city</option>
              {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 5: Address */}
        <div className="space-y-4 pt-2">
           <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Permanent Address</label>
              <button 
                type="button" 
                onClick={handleAutoDetectGPS}
                disabled={detecting}
                className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 disabled:opacity-50"
              >
                 <MapPin className="w-3 h-3" /> {detecting ? 'Detecting...' : 'Auto Detect GPS'}
              </button>
           </div>
           
           <div className="space-y-4">
              <input 
                 {...register('line1')}
                 placeholder="Flat / House / Office Number"
                 className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 text-sm font-semibold outline-none transition-all"
              />
              <textarea 
                 {...register('line2')}
                 placeholder="Street Name, Area, Landmark..."
                 rows={3}
                 className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-semibold outline-none transition-all resize-none"
              />
           </div>
        </div>

        {/* Row 6: Emergency */}
        <PhoneInput
          label="Emergency Contact Number"
          value={watch('emergencyNumber')}
          onChange={(val) => setValue('emergencyNumber', val)}
          error={errors.emergencyNumber ? 'Please enter a valid 10-digit number' : ''}
        />

        {/* Policies Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group mt-4">
           <div className="relative mt-0.5">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only" 
              />
              <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${agreed ? 'bg-[var(--color-primary-deep)] border-[var(--color-primary-deep)] shadow-lg' : 'border-gray-200 group-hover:border-emerald-500'}`}>
                 {agreed && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
           </div>
           <div className="flex-1 text-[11px] leading-snug text-gray-500 font-medium">
              I have read and agreed to the{' '}
              <Link 
                href="/legal" 
                onClick={(e) => e.stopPropagation()} 
                className="text-[var(--color-primary-deep)] font-black underline decoration-emerald-200/50 underline-offset-2"
              >
                Ayuxa&apos;s Master Agreement
              </Link>
              {' for the Ayuxa platform.'}
           </div>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-16 bg-[var(--color-primary-deep)] hover:bg-[#023d22] text-white rounded-2xl font-black shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3 mt-4"
        >
          {loading ? 'Completing Profile...' : 'Complete Registration'}
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
           Your data is secured with AES-256 encryption
        </p>
      </form>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFFEE] flex items-center justify-center" />}>
      <div className="min-h-screen bg-[#FFFFEE] flex flex-col items-center justify-center px-4 py-20">
        <ProfileSetupForm />
      </div>
    </Suspense>
  );
}
