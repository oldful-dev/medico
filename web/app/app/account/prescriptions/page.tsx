'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PrescriptionsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/app/account?tab=prescriptions');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      <p className="text-sm font-medium text-gray-400">Loading your medical records...</p>
    </div>
  );
}
