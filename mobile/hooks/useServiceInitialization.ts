import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { locationService } from '@/services/device/locationService';

export function useServiceInitialization(slug: string) {
    const { profile, getServiceBySlug, isLoading: isCatalogLoading } = useUser();
    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
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

    useEffect(() => {
        if (profile) {
            setCityId(profile.cityId);
        }
        const svc = getServiceBySlug(slug);
        if (svc) {
            setServiceId(svc.id);
        }
    }, [profile, getServiceBySlug, slug]);

    const isReady = !!cityId && !!serviceId;

    return {
        cityId,
        serviceId,
        address,
        setAddress,
        isManualAddress,
        setIsManualAddress,
        isLoading: isLoadingInit || isCatalogLoading,
        isReady
    };
}
