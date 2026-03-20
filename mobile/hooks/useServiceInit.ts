import { useState, useEffect } from 'react';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { apiClient } from '@/services/api/apiClient';
import type { ServiceFormConfig } from '@/types/serviceForm';

interface ServiceData {
  id: string;
  name: string;
  slug: string;
  formFieldsJson?: ServiceFormConfig | null;
  heroImageUrl?: string;
  [key: string]: any;
}

interface UseServiceInitOptions {
  needsLocation?: boolean;
}

interface UseServiceInitResult {
  cityId: string;
  serviceId: string;
  address: string;
  setAddress: (address: string) => void;
  isManualAddress: boolean;
  service: ServiceData | null;
  formConfig: ServiceFormConfig | null;
  isLoadingInit: boolean;
  error: string | null;
}

export function useServiceInit(
  slug: string,
  options: UseServiceInitOptions = { needsLocation: true }
): UseServiceInitResult {
  const [cityId, setCityId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [address, setAddress] = useState('Fetching address...');
  const [isManualAddress, setIsManualAddress] = useState(false);
  const [service, setService] = useState<ServiceData | null>(null);
  const [formConfig, setFormConfig] = useState<ServiceFormConfig | null>(null);
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoadingInit(true);
        setError(null);

        // 1. Fetch location (if needed)
        if (options.needsLocation !== false) {
          try {
            const hasPermission = await locationService.requestPermission();
            if (hasPermission) {
              const coords = await locationService.getCurrentLocation();
              const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
              if (!cancelled) setAddress(fetchedAddress);
            } else {
              if (!cancelled) {
                setIsManualAddress(true);
                setAddress('');
              }
            }
          } catch {
            if (!cancelled) {
              setIsManualAddress(true);
              setAddress('');
            }
          }
        }

        // 2. Fetch user profile → cityId
        const profileRes = await userService.getProfile();
        if (!cancelled && profileRes.success && profileRes.data) {
          setCityId(profileRes.data.cityId);
        }

        // 3. Fetch service by slug → serviceId + formFieldsJson
        const serviceRes = await apiClient.get<any[]>('/services');
        if (!cancelled && serviceRes.success && serviceRes.data) {
          const svc = serviceRes.data.find((s: any) => s.slug === slug);
          if (svc) {
            setServiceId(svc.id);
            setService(svc);
            if (svc.formFieldsJson) {
              setFormConfig(svc.formFieldsJson as ServiceFormConfig);
            }
          } else {
            setError(`Service "${slug}" not found`);
          }
        }
      } catch (err) {
        console.log(`Service init failed for ${slug}:`, err);
        if (!cancelled) {
          setError('Failed to initialize service');
          setIsManualAddress(true);
          setAddress('');
        }
      } finally {
        if (!cancelled) setIsLoadingInit(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return {
    cityId,
    serviceId,
    address,
    setAddress,
    isManualAddress,
    service,
    formConfig,
    isLoadingInit,
    error,
  };
}
