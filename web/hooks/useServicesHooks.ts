import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

// ─── Types ───────────────────────────────────────────────
export interface ServiceRecord {
  id: string;
  name: string;
  slug: string;
  basePrice: number | null;
  pricingText: string | null;
  serviceType: string;
  isEnabled: boolean;
  icon?: string | null;
  tagline?: string | null;
}

// ─── Query Keys ──────────────────────────────────────────
export const SERVICE_QUERY_KEYS = {
  all: ['services', 'all'] as const,
};

// ─── Shared fetcher ───────────────────────────────────────
async function fetchAllServices(): Promise<ServiceRecord[]> {
  const res = await apiClient.get<ServiceRecord[]>('/services');
  if (!res.success || !res.data) return [];
  return res.data;
}

/**
 * Resolves a numeric price from a ServiceRecord.
 * Prefers basePrice; falls back to parsing the first number in pricingText.
 */
export function resolvePrice(svc: ServiceRecord | undefined | null): number | null {
  if (!svc) return null;
  if (svc.basePrice != null) return Number(svc.basePrice);
  if (svc.pricingText) {
    const match = svc.pricingText.match(/[\d,]+/);
    if (match) return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────
/**
 * useServices — fetches the full service catalogue once and caches it.
 *
 * React Query deduplicates concurrent calls with the same key, so even if
 * [id]/page.tsx and DoctorVisitForm both call this hook simultaneously,
 * only ONE network request is made.
 */
export const useServices = () => {
  return useQuery<ServiceRecord[]>({
    queryKey: SERVICE_QUERY_KEYS.all,
    queryFn: fetchAllServices,
    staleTime: 5 * 60 * 1000,       // 5 min — prices won't change mid-session
    gcTime: 30 * 60 * 1000,         // 30 min garbage-collect
    refetchOnWindowFocus: false,     // price data doesn't need refetch on focus
  });
};

/**
 * useServicePrice — returns the resolved numeric price for a given slug.
 * Tries multiple slug variants so aliased routes (doctor-visit ↔ doctor-home-visit) work.
 */
export const useServicePrice = (slugVariants: string[]) => {
  const { data: services, isLoading } = useServices();

  let matched: ServiceRecord | null = null;
  if (services) {
    for (const slug of slugVariants) {
      const found = services.find(s => s.slug === slug);
      if (found) { matched = found; break; }
    }
  }

  return {
    isLoading,
    service: matched,
    price: resolvePrice(matched),
  };
};
