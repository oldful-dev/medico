import { useState, useCallback, useRef } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';

export interface LocationPrediction {
    description: string;
    place_id: string;
    main_text: string;
    secondary_text: string;
    types: string[];
}

export interface LocationDetails {
    placeId: string;
    name: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    address_components: any[];
}

interface UseLocationSearchReturn {
    predictions: LocationPrediction[];
    loading: boolean;
    error: string | null;
    search: (query: string) => Promise<void>;
    clear: () => void;
    getPlaceDetails: (placeId: string) => Promise<LocationDetails | null>;
}

export const useLocationSearch = (): UseLocationSearchReturn => {
    const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const search = useCallback(async (query: string) => {
        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Clear previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (!query || query.length < 2) {
            setPredictions([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                abortControllerRef.current = new AbortController();

                // Call backend endpoint
                const response = await fetch(`${API_BASE_URL}/location/place-autocomplete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: query }),
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) throw new Error('Failed to fetch predictions');

                const data = await response.json();

                if (data.statusCode === 0) {
                    const formatted = (data.data || []).map((pred: any) => ({
                        description: pred.description,
                        place_id: pred.place_id,
                        main_text: pred.structured_formatting?.main_text || pred.description,
                        secondary_text: pred.structured_formatting?.secondary_text || '',
                        types: pred.types || [],
                    }));
                    setPredictions(formatted);
                } else {
                    setError(data.message || 'Failed to fetch locations');
                    setPredictions([]);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    setError('Unable to search locations');
                    console.error('Location search error:', err);
                }
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce 300ms
    }, []);

    const clear = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setPredictions([]);
        setError(null);
        setLoading(false);
    }, []);

    const getPlaceDetails = useCallback(async (placeId: string): Promise<LocationDetails | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/location/place-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId }),
            });

            if (!response.ok) throw new Error('Failed to fetch place details');

            const data = await response.json();

            if (data.statusCode === 0) {
                return data.data as LocationDetails;
            } else {
                setError(data.message || 'Failed to fetch location details');
                return null;
            }
        } catch (err) {
            setError('Unable to fetch location details');
            console.error('Place details error:', err);
            return null;
        }
    }, []);

    return {
        predictions,
        loading,
        error,
        search,
        clear,
        getPlaceDetails,
    };
};
