'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingsIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/app/account?tab=bookings');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
