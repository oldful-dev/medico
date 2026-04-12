'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/api/authService';
import { useAuthStore, AuthUser } from '@/store/authStore';
import Image from 'next/image';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/common/Footer';

function AuthForm() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhoneState] = useState('');
  const isVerifyingRef = useRef(false);

  const { register, handleSubmit, watch } = useForm({
    defaultValues: { phone: '', otp: '' },
  });

  const phoneValue = watch('phone');
  const otpValue = watch('otp');

  const onRequestOTP = async (data: { phone: string }) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.requestOTP({ phoneNumber: `+91${data.phone}` });
      if (response.success) {
        setPhoneState(data.phone);
        setStep('OTP');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOTP = useCallback(async (data: { phone: string; otp: string }) => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyOTP({
        phoneNumber: `+91${phone}`,
        otp: data.otp,
      });

      if (response.success && response.data) {
        if (response.data.isNewUser) {
          // New user — redirect to profile setup
          router.push(`/auth/setup?phone=${encodeURIComponent(`+91${phone}`)}`);
          return;
        }

        // Existing user — tokens present
        const { accessToken, refreshToken, user } = response.data;

        if (accessToken && refreshToken && user) {
          // Mirror mobile's: login(accessToken, refreshToken, userId)
          await login(accessToken, refreshToken, user as AuthUser);

          // Always redirect to dashboard after login
          router.replace('/app/dashboard');
        } else {
          setError('Invalid response from server. Please try again.');
        }
      } else {
        setError(response.message || 'Invalid or expired OTP');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  }, [phone, login, router]);

  // Auto-submit OTP — placed after onVerifyOTP to avoid TDZ error
  React.useEffect(() => {
    if (step === 'OTP' && otpValue?.length === 4 && !loading) {
      handleSubmit(onVerifyOTP)();
    }
  }, [otpValue, step, loading, handleSubmit, onVerifyOTP]);

  return (
    <>
      {/* Floating Back Button */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 sm:top-10 sm:left-10 flex items-center gap-2 text-gray-400 hover:text-[var(--color-primary-deep)] font-bold transition-all hover:-translate-x-1 group z-[100]"
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover:shadow-lg transition-all border border-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="hidden sm:block text-sm">Back to Home</span>
      </Link>

      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl relative z-10">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="w-32 h-32 relative mb-4">
          <Image
            src="/olfful-logo.png"
            alt="Oldful Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-primary-deep)]">
          {step === 'PHONE' ? 'Welcome to Oldful' : 'Enter OTP'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {step === 'PHONE'
            ? 'Enter your mobile number to continue'
            : `OTP sent to +91 ${phone}`}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSubmit(onRequestOTP)} className="flex flex-col gap-4">
          <div className="flex flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[var(--color-primary)] transition-colors">
            <span className="pl-4 pr-3 text-gray-600 font-semibold text-base border-r border-gray-200 py-3">
              +91
            </span>
            <input
              type="tel"
              maxLength={10}
              className="flex-1 py-3 px-3 text-base outline-none bg-transparent"
              placeholder="Enter 10-digit number"
              autoFocus
              {...register('phone', { required: true, pattern: /^[0-9]{10}$/ })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || phoneValue.length !== 10}
            className="mt-2 bg-[var(--color-primary-deep)] text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-opacity hover:bg-[var(--color-primary)] active:scale-95"
          >
            {loading ? 'Sending OTP...' : 'Get OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onVerifyOTP)} className="flex flex-col gap-4">
          <input
            type="text"
            maxLength={4}
            className="w-full py-4 px-4 border-2 border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] text-center tracking-[0.6em] font-mono text-2xl"
            placeholder="••••"
            autoFocus
            {...register('otp', { required: true })}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[var(--color-primary-deep)] text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-opacity hover:bg-[var(--color-primary)] active:scale-95"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('PHONE'); setError(''); }}
            className="mt-1 text-sm text-[var(--color-primary)] font-medium hover:underline text-center"
          >
            ← Change phone number
          </button>
        </form>
      )}
    </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFFEE] flex items-center justify-center" />}>
      <div className="min-h-screen bg-[#FFFFEE] flex flex-col">
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
          <AuthForm />
        </div>
        <Footer />
      </div>
    </Suspense>
  );
}
