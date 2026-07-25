'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { planService, Plan } from '@/services/api/planService';
import { BillingCycle } from '@/services/api/subscriptionService';
import { useUserHooks } from '@/hooks/useUserHooks';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import { Loader2, Check, Clock, Shield, ArrowRight } from 'lucide-react';

export default function PlansPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem, clearCart } = useCartStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('QUARTERLY');
  const { useProfile } = useUserHooks();
  const { data: profile } = useProfile();

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await planService.getPlans();
        if (res.success && res.data) {
          setPlans(res.data);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleChoosePlan = (plan: Plan) => {
    if (plan.quarterlyPrice === 0) {
      router.push('/app/services/trip-travels');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to continue');
      router.push('/auth?redirect=/app/plans');
      return;
    }

    // 1. Calculate price
    let price = 0;
    switch (billingCycle) {
      case 'QUARTERLY': price = plan.quarterlyPrice; break;
      case 'BIANNUAL': price = plan.biannualPrice; break;
      case 'YEARLY': price = plan.yearlyPrice; break;
    }

    // 2. Add to cart as a 'plan' type
    clearCart(); // Subscriptions are handled one at a time
    addItem({
      type: 'plan',
      planId: plan.id,
      name: `${plan.name} (${billingCycle})`,
      price,
      billingCycle,
    });

    // 3. Go to checkout
    router.push('/app/checkout');
  };

  const getPrice = (plan: Plan) => {
    switch (billingCycle) {
      case 'QUARTERLY': return plan.quarterlyPrice;
      case 'BIANNUAL': return plan.biannualPrice;
      case 'YEARLY': return plan.yearlyPrice;
    }
  };

  const getPriceLabel = () => {
    switch (billingCycle) {
      case 'QUARTERLY': return '/ quarter';
      case 'BIANNUAL': return '/ 6 months';
      case 'YEARLY': return '/ year';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Ayuxa Care Plans</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your health & wellness needs. Flexible billing cycles to fit your budget.
          </p>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-3 sm:flex gap-1 w-full max-w-md sm:max-w-max">
             {(['QUARTERLY', 'BIANNUAL', 'YEARLY'] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    billingCycle === cycle 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cycle.charAt(0) + cycle.slice(1).toLowerCase()}
                </button>
             ))}
          </div>
        </div>

        {/* Active Subscription Banner */}
        {profile?.subscriptions?.some(s => s.status === 'ACTIVE') && (
           <div className="mb-12 bg-white border border-emerald-100 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Shield className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <div className="text-sm font-bold text-emerald-800">Your Current Subscription</div>
                    <div className="text-xl font-extrabold text-[#034C2A]">
                       {profile.subscriptions.find(s => s.status === 'ACTIVE')?.plan.name}
                    </div>
                 </div>
              </div>
              <div className="text-right">
                 <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Expires On</div>
                 <div className="text-sm font-bold text-gray-700">
                    {profile.subscriptions.find(s => s.status === 'ACTIVE')?.expiryDate 
                      ? new Date(profile.subscriptions.find(s => s.status === 'ACTIVE')!.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'N/A'}
                 </div>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
           {plans.map((plan, idx) => {
             const isOnDemand = plan.quarterlyPrice === 0;
             const isPro = plan.name === 'HomeMaker Plan';
             const isActive = profile?.subscriptions?.some(s => s.status === 'ACTIVE' && s.plan.name === plan.name);
             
             return (
               <div 
                 key={plan.id}
                 className={`rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border transition-all relative flex flex-col ${
                   isPro 
                    ? 'bg-[var(--color-primary)] border-0 -translate-y-2 shadow-2xl z-10' 
                    : 'bg-white border-gray-100 hover:shadow-xl'
                 }`}
               >
                 {isOnDemand ? (
                    <div className="absolute top-0 right-6 bg-orange-50 text-orange-600 text-[10px] font-bold py-1 px-3 rounded-b-lg tracking-wider uppercase">
                      On Demand
                    </div>
                 ) : isPro ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--color-accent-bright)] text-[#034C2A] text-[10px] font-bold py-1 px-3 rounded-b-lg tracking-wider uppercase">
                      Most Popular
                    </div>
                 ) : null}
                 
                 <h3 className={`text-xl font-bold mb-2 ${isPro ? 'text-white' : 'text-gray-800'}`}>{plan.name}</h3>
                 <p className={`text-sm h-10 ${isPro ? 'text-emerald-100' : 'text-gray-500'}`}>{plan.description}</p>
                 
                 <div className="my-6">
                    {isOnDemand ? (
                      <span className={`text-4xl font-extrabold ${isPro ? 'text-white' : 'text-gray-900'}`}>Pay per trip</span>
                    ) : (
                      <>
                        <span className={`text-4xl font-extrabold ${isPro ? 'text-white' : 'text-gray-900'}`}>₹{(getPrice(plan) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                        <span className={`font-semibold text-sm ml-1 ${isPro ? 'text-emerald-200' : 'text-gray-400'}`}> {getPriceLabel()}</span>
                        
                        <div className={`mt-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${isPro ? 'text-emerald-300' : 'text-emerald-600'}`}>
                           <Clock className="w-3 h-3" />
                           Valid for {billingCycle === 'QUARTERLY' ? '90 days' : billingCycle === 'BIANNUAL' ? '180 days' : '365 days'}
                        </div>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => handleChoosePlan(plan)}
                    disabled={!isOnDemand && isActive}
                    className={`w-full font-bold py-3.5 rounded-xl transition-all mb-8 flex items-center justify-center gap-2 ${
                      !isOnDemand && isActive
                       ? 'bg-gray-100 text-gray-400 cursor-default'
                       : isPro 
                         ? 'bg-[#0EDD94] hover:bg-[#34C759] text-[#034C2A] shadow-lg active:scale-95' 
                         : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95'
                    }`}
                  >
                    {isOnDemand ? (
                      <span className="flex items-center gap-2">Request Now <ArrowRight className="w-4 h-4" /></span>
                    ) : isActive ? (
                      <>Active Plan</>
                    ) : (
                      <span className="flex items-center gap-2">Choose This Plan <ArrowRight className="w-4 h-4" /></span>
                    )}
                  </button>

                  <div className="space-y-4 flex-grow">
                    {plan.benefits?.split(',').map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-emerald-400/20' : 'bg-emerald-50'}`}>
                          <Check className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        </div>
                        <span className={`text-sm ${isPro ? 'text-emerald-50' : 'text-gray-600'}`}>{benefit.trim()}</span>
                      </div>
                    ))}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
}
