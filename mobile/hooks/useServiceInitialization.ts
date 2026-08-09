// ──────────────────────────────────────────────────────────────────────────────
//  useServiceInitialization
//
//  What changed (performance fix):
//   • isLoading now ONLY reflects the service-catalog fetch, NOT location.
//     The booking button becomes available as soon as the catalog is ready
//     (typically < 2 s on a good connection, instant when cached).
//   • Location is fetched in the background in parallel. The address field
//     updates itself once GPS resolves (or times out via locationService).
//   • cityId falls back to profile.cityId immediately — no extra API round-trip.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { locationService } from '@/services/device/locationService';
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
    const [address, setAddress] = useState('Fetching address...');
    const [isManualAddress, setIsManualAddress] = useState(false);

    // ── 1. Location fetch — runs in the background, does NOT block isLoading ──
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (!hasPermission) {
                    if (!cancelled) {
                        setIsManualAddress(true);
                        setAddress('');
                    }
                    return;
                }

                const coords = await locationService.getCurrentLocation();
                if (cancelled) return;

                // Kick off reverse-geocode — also non-blocking for the button
                locationService
                    .getAddressFromCoordinates(coords)
                    .then(fetchedAddress => {
                        if (!cancelled) setAddress(fetchedAddress);
                    })
                    .catch(() => {
                        if (!cancelled) {
                            setIsManualAddress(true);
                            setAddress('');
                        }
                    });
            } catch {
                if (!cancelled) {
                    setIsManualAddress(true);
                    setAddress('');
                }
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // ── 2. Service & city resolution — drives isLoading ───────────────────────
    useEffect(() => {
        // City is available immediately from profile or context selection
        if (profile?.cityId) {
            setCityId(profile.cityId);
        } else if (selectedCityId) {
            setCityId(selectedCityId);
        }

        // Try context catalog first (fast path — usually already loaded)
        const svc = getServiceBySlug(slug);
        console.log(`[useServiceInitialization] slug="${slug}" getServiceBySlug resolved:`, svc ? { id: svc.id, name: svc.name } : 'NOT_FOUND');
        if (svc) {
            setServiceId(svc.id);
            setServiceName(svc.name || '');
            setServicePrice(resolvePrice(svc));
            return;
        }

        // Fallback: direct API call when context service is not resolved yet
        (async () => {
            try {
                console.log(`[useServiceInitialization] fetching fallback /services for slug="${slug}"...`);
                const res = await apiClient.get<any[]>('/services');
                if (res.success && res.data) {
                    const found = res.data.find((s: any) => s.slug === slug);
                    console.log(`[useServiceInitialization] fallback query resolved found:`, found ? { id: found.id, name: found.name } : 'NOT_FOUND');
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
    console.log(`[useServiceInitialization] render isReady=${isReady} cityId="${cityId}" serviceId="${serviceId}"`);

    return {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        address,
        setAddress,
        locationDenied: isManualAddress,
        setIsManualAddress,
        // isLoading is now ONLY the catalog loading state.
        // Location runs in the background and never blocks the button.
        isLoading: isCatalogLoading,
        isReady,
        dbService: getServiceBySlug(slug),
    };
}
