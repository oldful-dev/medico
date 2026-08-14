// ──────────────────────────────────────────────
//  Address Context — Centralized Active Service Location
//
//  Distinguishes:
//    - Saved Address    : a persistent Address row from the backend
//    - Default Address  : the saved address with isDefault:true
//    - Active Address   : runtime "where should this booking happen"
//    - Device Location  : the phone's physical GPS — only ever a source
//                          the user explicitly pulls from, or a one-time
//                          bootstrap for a brand-new user with zero
//                          saved addresses.
//
//  activeAddress is ALWAYS a derived value (useMemo), never an imperative
//  copy — this is what makes "follow the default" and "stay pinned to an
//  override" fall out of a single conditional with no special-case sync
//  code. See activeAddressSource below.
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import { userService, Address } from '@/services/api/userService';
import { locationService } from '@/services/device/locationService';
import { useUser } from './UserContext';
import { useAuth } from './AuthContext';

export interface ActiveAddressSnapshot {
    id?: string;             // present if sourced from a saved Address; absent for GPS-temporary
    label?: string;
    line1: string;
    line2?: string;
    cityName: string;
    state?: string;
    pincode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    isTemporary: boolean;
}

export type ActiveAddressSource = 'default' | 'manual-override' | 'temporary-gps' | 'none';

interface AddressContextType {
    savedAddresses: Address[];
    defaultAddress: Address | null;
    activeAddress: ActiveAddressSnapshot | null;
    activeAddressSource: ActiveAddressSource;
    isLoading: boolean;
    isMutating: boolean;
    error: string | null;

    selectActiveAddress: (address: Address | ActiveAddressSnapshot) => void;
    clearManualOverride: () => void;
    useCurrentLocationAsActive: (opts?: { save?: boolean; label?: string }) =>
        Promise<{ mode: 'temporary' } | { mode: 'saved'; address: Address } | { mode: 'failed' }>;
    // Runs the same GPS + reverse-geocode lookup but does NOT commit the
    // result as the active address or touch any saved-address state —
    // for screens (e.g. manage-addresses.tsx) that need a snapshot purely
    // to prefill a form for the user to review before they explicitly save.
    detectCurrentLocationSnapshot: () => Promise<ActiveAddressSnapshot | null>;

    refreshAddresses: () => Promise<void>;
    addAddress: (input: Omit<Address, 'id'>) => Promise<Address | null>;
    editAddress: (id: string, input: Partial<Address>) => Promise<Address | null>;
    deleteAddress: (id: string) => Promise<boolean>;
    setDefaultAddress: (id: string) => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Parses a Google/native reverse-geocode result into the structured fields
// ActiveAddressSnapshot needs. Mirrors manage-addresses.tsx's
// parseAddressComponents — intentionally duplicated here for Phase 1
// (that screen isn't touched until Phase 2, where the two will be
// consolidated into one shared helper).
async function reverseGeocodeToSnapshot(coords: { latitude: number; longitude: number }): Promise<ActiveAddressSnapshot> {
    const formatted = await locationService.getAddressFromCoordinates(coords);

    let cityName = '';
    let state = '';
    let pincode = '';
    try {
        const results = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
        if (results.length > 0) {
            const addr = results[0];
            if (addr.city) cityName = addr.city;
            if (addr.region) state = addr.region;
            if (addr.postalCode) pincode = addr.postalCode;
        }
    } catch {
        // fall through to text-based extraction below
    }

    if (!pincode) {
        const match = formatted.match(/\b(\d{6})\b/);
        if (match) pincode = match[1];
    }

    return {
        line1: formatted,
        cityName,
        state,
        pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isTemporary: true,
    };
}

function toSnapshot(addr: Address): ActiveAddressSnapshot {
    return {
        id: addr.id,
        label: addr.label,
        line1: addr.line1,
        line2: addr.line2,
        cityName: addr.cityName,
        state: addr.state,
        pincode: addr.pincode,
        landmark: addr.landmark,
        latitude: addr.latitude ?? 0,
        longitude: addr.longitude ?? 0,
        isTemporary: false,
    };
}

export function AddressProvider({ children }: { children: ReactNode }) {
    const { profile, setProfile } = useUser();
    const { isAuthenticated, isLoading: authIsLoading, userId } = useAuth();

    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [activeAddressSource, setActiveAddressSource] = useState<ActiveAddressSource>('default');
    const [manualOverrideAddressId, setManualOverrideAddressId] = useState<string | null>(null);
    const [temporaryAddress, setTemporaryAddress] = useState<ActiveAddressSnapshot | null>(null);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Initialization-race guard ──────────────────────────────────────
    // UserContext.isLoading starts false and only flips true once loadData()
    // actually begins — there's a gap on cold start where profile is null
    // AND isLoading is false, which looks identical to "authenticated user
    // with zero addresses." We wait for profile to actually resolve (or a
    // bounded timeout) before trusting an empty savedAddresses array.
    const [profileSettled, setProfileSettled] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setProfileSettled(false);
            return;
        }
        if (profile) {
            setProfileSettled(true);
            return;
        }
        // Authenticated but profile still null — give the normal fetch a
        // window to resolve before treating "no addresses" as real. This
        // is a bounded fallback only (loadData's own error path can leave
        // profile permanently null with no other signal).
        setProfileSettled(false);
        const t = setTimeout(() => setProfileSettled(true), 6000);
        return () => clearTimeout(t);
    }, [isAuthenticated, profile, userId]);

    // ── Reset everything when the authenticated user changes ──────────
    const lastUserIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (lastUserIdRef.current !== userId) {
            lastUserIdRef.current = userId;
            setSavedAddresses([]);
            setActiveAddressSource('default');
            setManualOverrideAddressId(null);
            setTemporaryAddress(null);
            setError(null);
            bootstrapAttemptedForRef.current = null;
        }
    }, [userId]);

    // ── Sync savedAddresses from UserContext.profile ──────────────────
    useEffect(() => {
        if (profile?.addresses) {
            setSavedAddresses(profile.addresses);
        } else if (!isAuthenticated) {
            setSavedAddresses([]);
        }
    }, [profile?.addresses, isAuthenticated]);

    const defaultAddress = useMemo<Address | null>(() => {
        return savedAddresses.find(a => a.isDefault) || savedAddresses[0] || null;
    }, [savedAddresses]);

    // If a manual override's target address no longer exists (deleted,
    // or a stale reference from a previous session), fall back to default.
    useEffect(() => {
        if (activeAddressSource === 'manual-override' && manualOverrideAddressId) {
            const stillExists = savedAddresses.some(a => a.id === manualOverrideAddressId);
            if (!stillExists && savedAddresses.length > 0) {
                setActiveAddressSource('default');
                setManualOverrideAddressId(null);
            }
        }
    }, [savedAddresses, activeAddressSource, manualOverrideAddressId]);

    const activeAddress = useMemo<ActiveAddressSnapshot | null>(() => {
        if (activeAddressSource === 'temporary-gps' && temporaryAddress) {
            return temporaryAddress;
        }
        if (activeAddressSource === 'manual-override' && manualOverrideAddressId) {
            const found = savedAddresses.find(a => a.id === manualOverrideAddressId);
            if (found) return toSnapshot(found);
        }
        return defaultAddress ? toSnapshot(defaultAddress) : null;
    }, [activeAddressSource, manualOverrideAddressId, temporaryAddress, savedAddresses, defaultAddress]);

    // Tracked here (declared early) but the actual bootstrap effect runs
    // further below, after useCurrentLocationAsActive is defined — avoids
    // referencing a useCallback result before its declaration.
    const bootstrapAttemptedForRef = useRef<string | null>(null);

    // ── Actions ─────────────────────────────────────────────────────────

    const selectActiveAddress = useCallback((address: Address | ActiveAddressSnapshot) => {
        const isTemp = 'isTemporary' in address ? address.isTemporary : false;
        if (isTemp) {
            setTemporaryAddress(address as ActiveAddressSnapshot);
            setActiveAddressSource('temporary-gps');
        } else if (address.id) {
            setManualOverrideAddressId(address.id);
            setActiveAddressSource('manual-override');
        }
    }, []);

    const clearManualOverride = useCallback(() => {
        setManualOverrideAddressId(null);
        setTemporaryAddress(null);
        setActiveAddressSource('default');
    }, []);

    const refreshAddresses = useCallback(async () => {
        try {
            const res = await userService.getProfile();
            if (res.success && res.data) {
                setSavedAddresses(res.data.addresses || []);
                setProfile(res.data); // keep UserContext from drifting during migration
            }
        } catch (e) {
            console.error('Failed to refresh addresses:', e);
        }
    }, [setProfile]);

    const addAddress = useCallback(async (input: Omit<Address, 'id'>): Promise<Address | null> => {
        if (!profile?.id) return null;
        setIsMutating(true);
        setError(null);
        try {
            const res = await userService.addAddress(profile.id, input);
            if (res.success && res.data) {
                await refreshAddresses();
                return res.data;
            }
            setError(res.message || 'Failed to add address');
            return null;
        } catch (e: any) {
            setError(e?.message || 'Failed to add address');
            return null;
        } finally {
            setIsMutating(false);
        }
    }, [profile?.id, refreshAddresses]);

    const editAddress = useCallback(async (id: string, input: Partial<Address>): Promise<Address | null> => {
        if (!profile?.id) return null;
        setIsMutating(true);
        setError(null);
        try {
            const res = await userService.updateAddress(profile.id, id, input);
            if (res.success && res.data) {
                await refreshAddresses();
                return res.data;
            }
            setError(res.message || 'Failed to update address');
            return null;
        } catch (e: any) {
            setError(e?.message || 'Failed to update address');
            return null;
        } finally {
            setIsMutating(false);
        }
    }, [profile?.id, refreshAddresses]);

    const deleteAddress = useCallback(async (id: string): Promise<boolean> => {
        if (!profile?.id) return false;
        setIsMutating(true);
        setError(null);
        try {
            const res = await userService.deleteAddress(profile.id, id);
            if (res.success) {
                if (manualOverrideAddressId === id) {
                    setManualOverrideAddressId(null);
                    setActiveAddressSource('default');
                }
                await refreshAddresses();
                return true;
            }
            setError(res.message || 'Failed to delete address');
            return false;
        } catch (e: any) {
            setError(e?.message || 'Failed to delete address');
            return false;
        } finally {
            setIsMutating(false);
        }
    }, [profile?.id, manualOverrideAddressId, refreshAddresses]);

    const setDefaultAddressAction = useCallback(async (id: string): Promise<void> => {
        if (!profile?.id) return;
        setIsMutating(true);
        setError(null);
        try {
            const res = await userService.updateAddress(profile.id, id, { isDefault: true });
            if (res.success) {
                await refreshAddresses();
                // No extra branching needed: if activeAddressSource is 'default',
                // the activeAddress memo already re-derives from the new
                // defaultAddress automatically. If the user has an override
                // (manual or temporary-gps), it stays pinned — untouched.
            } else {
                setError(res.message || 'Failed to set default address');
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to set default address');
        } finally {
            setIsMutating(false);
        }
    }, [profile?.id, refreshAddresses]);

    const detectCurrentLocationSnapshot = useCallback(async (): Promise<ActiveAddressSnapshot | null> => {
        try {
            const hasPermission = await locationService.requestPermission();
            if (!hasPermission) return null;
            const coords = await locationService.getCurrentLocation();
            return await reverseGeocodeToSnapshot(coords);
        } catch (e) {
            console.warn('detectCurrentLocationSnapshot failed:', e);
            return null;
        }
    }, []);

    const useCurrentLocationAsActive = useCallback(async (opts?: { save?: boolean; label?: string }) => {
        const snapshot = await detectCurrentLocationSnapshot();
        if (!snapshot) return { mode: 'failed' as const };

        if (opts?.save) {
            if (!profile?.id) return { mode: 'failed' as const };
            const created = await addAddress({
                label: opts.label || 'Other',
                line1: snapshot.line1,
                cityName: snapshot.cityName,
                state: snapshot.state || '',
                pincode: snapshot.pincode,
                latitude: snapshot.latitude,
                longitude: snapshot.longitude,
                isDefault: false,
            });
            if (created) {
                selectActiveAddress(created);
                return { mode: 'saved' as const, address: created };
            }
            return { mode: 'failed' as const };
        }

        setTemporaryAddress(snapshot);
        setActiveAddressSource('temporary-gps');
        return { mode: 'temporary' as const };
    }, [profile?.id, addAddress, selectActiveAddress, detectCurrentLocationSnapshot]);

    // ── One-time new-user GPS bootstrap ────────────────────────────────
    // Fires only when ALL of: authenticated, profile data has definitively
    // settled (not just "currently null"), zero saved addresses exist, no
    // active selection exists yet, and this user hasn't already received
    // the attempt this session. Declared after useCurrentLocationAsActive
    // so it can safely reference the fully-defined action.
    useEffect(() => {
        if (!isAuthenticated || authIsLoading) return;
        if (!profileSettled) return;
        if (savedAddresses.length > 0) return;
        if (activeAddressSource !== 'default') return; // something already selected
        if (bootstrapAttemptedForRef.current === userId) return;

        bootstrapAttemptedForRef.current = userId;
        useCurrentLocationAsActive({ save: false }).catch(() => {
            // Best-effort — permission denial/GPS failure just leaves
            // activeAddressSource at 'default' with activeAddress null.
        });
    }, [isAuthenticated, authIsLoading, profileSettled, savedAddresses.length, activeAddressSource, userId, useCurrentLocationAsActive]);

    const isLoading = isAuthenticated && !profileSettled;

    const value: AddressContextType = {
        savedAddresses,
        defaultAddress,
        activeAddress,
        activeAddressSource,
        isLoading,
        isMutating,
        error,
        selectActiveAddress,
        clearManualOverride,
        useCurrentLocationAsActive,
        detectCurrentLocationSnapshot,
        refreshAddresses,
        addAddress,
        editAddress,
        deleteAddress,
        setDefaultAddress: setDefaultAddressAction,
    };

    return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
    const context = useContext(AddressContext);
    if (!context) throw new Error('useAddress must be used within AddressProvider');
    return context;
}
