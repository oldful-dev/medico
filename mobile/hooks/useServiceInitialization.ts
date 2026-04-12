import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { locationService } from '@/services/device/locationService';
import { apiClient } from '@/services/api/apiClient';

export function useServiceInitialization(slug: string) {
    const { profile, getServiceBySlug, services, isLoading: isCatalogLoading } = useUser();
    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [servicePrice, setServicePrice] = useState(0);
    const [address, setAddress] = useState('Fetching address...');
    const [isManualAddress, setIsManualAddress] = useState(false);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setIsLoadingInit(true);
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                } else {
                    setIsManualAddress(true);
                    setAddress('');
                }
            } catch (err) {
                console.warn("Location initialization failed", err);
                setIsManualAddress(true);
                setAddress('');
            } finally {
                setIsLoadingInit(false);
            }
        })();
    }, []);

    // Try context first, fallback to direct API call
    useEffect(() => {
        if (profile) {
            setCityId(profile.cityId);
        }

        // Try from context
        const svc = getServiceBySlug(slug);
        if (svc) {
            setServiceId(svc.id);
            setServiceName(svc.name || '');
            setServicePrice(svc.basePrice ?? 0);
            return;
        }

        // Fallback: direct API call if context services not loaded yet
        if (!isCatalogLoading && services.length === 0) {
            (async () => {
                try {
                    const res = await apiClient.get<any[]>('/services');
                    if (res.success && res.data) {
                        const found = res.data.find((s: any) => s.slug === slug);
                        if (found) {
                            setServiceId(found.id);
                            setServiceName(found.name || '');
                            setServicePrice(found.basePrice ?? 0);
                        }
                    }
                } catch (err) {
                    console.warn('Fallback service fetch failed:', err);
                }
            })();
        }
    }, [profile, getServiceBySlug, slug, isCatalogLoading, services.length]);

    const isReady = !!cityId && !!serviceId;

    return {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        address,
        setAddress,
        locationDenied: isManualAddress,
        setIsManualAddress,
        isLoading: isLoadingInit || isCatalogLoading,
        isReady
    };
}
