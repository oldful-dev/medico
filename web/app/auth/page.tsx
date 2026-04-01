'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store/authStore';

export default function AuthPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, getValues, watch } = useForm({
    defaultValues: {
      phone: '',
      otp: '',
    }
  });

  const phoneValue = watch('phone');

  const onRequestOTP = async (data: { phone: string }) => {
    setLoading(true);
    setError('');
    try {
      // In mobile, they probably pass '91' + phone, or just phone.
      const response = await authService.requestOTP({ phoneNumber: `91${data.phone}` });
      if (response.success) {
        setStep('OTP');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOTP = async (data: { phone: string; otp: string }) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.verifyOTP({ 
        phoneNumber: `91${data.phone}`, 
        otp: data.otp 
      });
      
      if (response.success && response.data) {
        if (response.data.isNewUser) {
          // Push to profile setup if new user
          // For now just redirect to a hypothetical setup page or login anyway
          router.push('/auth/setup');
        } else {
          login(response.data.accessToken || '');
          router.push('/');
        }
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-[var(--radius-xl)] shadow-[var(--shadow-card)]">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-primary-deep)]">
            Welcome to Medico
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            {step === 'PHONE' 
              ? 'Enter your phone number to continue' 
              : 'Enter the OTP sent to your phone'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-[var(--color-sos-red)] p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSubmit(onRequestOTP)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-body)]">Phone Number</label>
              <div className="flex flex-row items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[var(--color-primary)]">
                <span className="pl-3 pr-2 text-gray-500 font-medium">+91</span>
                <input 
                  type="tel"
                  maxLength={10}
                  className="flex-1 py-3 pr-3 outline-none"
                  placeholder="9999999999"
                  {...register('phone', { required: true, pattern: /^[0-9]{10}$/ })}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading || phoneValue.length !== 10}
              className="mt-4 bg-[var(--color-primary)] text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Sending...' : 'Get OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onVerifyOTP)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-body)]">One Time Password</label>
              <input 
                type="text"
                maxLength={6}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg outline-none focus:border-[var(--color-primary)] text-center tracking-[0.5em] font-mono text-lg"
                placeholder="••••••"
                {...register('otp', { required: true, minLength: 4 })}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 bg-[var(--color-primary)] text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Verifying...' : 'Verify & Proceed'}
            </button>

            <button 
              type="button"
              onClick={() => setStep('PHONE')}
              className="mt-2 text-sm text-[var(--color-primary)] font-medium hover:underline text-center"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
