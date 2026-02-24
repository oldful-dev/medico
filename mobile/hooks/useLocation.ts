// useLocation hook - GPS location management
import { useState, useEffect, useCallback } from 'react';
import { locationService, LocationCoordinates } from '@/services/device/locationService';

interface UseLocationReturn {
  location: LocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasPermission: boolean;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const coords = await locationService.getCurrentLocation();
      setLocation(coords);
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // TODO: Check permission and fetch location on mount
  }, []);

  return { location, isLoading, error, refresh, hasPermission };
}
