// ──────────────────────────────────────────────────────────────────────────────
//  useServiceInitialization
//
//  Resolves cityId/serviceId/serviceName/servicePrice for a given service
//  slug. Location/address resolution no longer lives here — it moved to
//  AddressContext (mobile/context/AddressContext.tsx), which is the single
//  place GPS is triggered from (an explicit user action, or a guarded
//  one-time bootstrap for brand-new users with zero saved addresses).
//  Screens read `activeAddress` from useAddress() directly instead of this
//  hook's old address/setAddress fields — removing this hook's independent
//  GPS effect is what stops every one of its consumers from silently
//  re-resolving location on every mount, regardless of an already-selected
//  active address.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { apiClient } from '@/services/api/apiClient';

const resolvePrice = (svc: any): number => {
    if (!svc) return 0;
    if (svc.basePrice != null && svc.basePrice > 0) return Number(svc.basePrice);
    if (svc.pricingText) {
        const match = svc.pricingText.match(/[\d,]+/);
        if (match) return parseInt(match[0].replace(/,/g, ''), 10);
    }
    return 0;
};

export function useServiceInitialization(slug: string) {
    const { profile, getServiceBySlug, selectedCityId, services, isLoading: isCatalogLoading } = useUser();

    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [servicePrice, setServicePrice] = useState(0);

    // ── Service & city resolution — drives isLoading ───────────────────────
    useEffect(() => {
        // City is available immediately from profile or context selection
        if (profile?.cityId) {
            setCityId(profile.cityId);
        } else if (selectedCityId) {
            setCityId(selectedCityId);
        }

        // Try context catalog first (fast path — usually already loaded)
        const svc = getServiceBySlug(slug);
        if (svc) {
            setServiceId(svc.id);
            setServiceName(svc.name || '');
            setServicePrice(resolvePrice(svc));
            return;
        }

        // Fallback: direct API call when context service is not resolved yet
        (async () => {
            try {
                const res = await apiClient.get<any[]>('/services');
                if (res.success && res.data) {
                    const found = res.data.find((s: any) => s.slug === slug);
                    if (found) {
                        setServiceId(found.id);
                        setServiceName(found.name || '');
                        setServicePrice(resolvePrice(found));
                    }
                }
            } catch (err) {
                console.warn('Fallback service fetch failed:', err);
            }
        })();
    }, [profile, getServiceBySlug, slug, selectedCityId, services]);

    const isReady = !!cityId && !!serviceId;

    return {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        isLoading: isCatalogLoading,
        isReady,
        dbService: getServiceBySlug(slug),
    };
}
