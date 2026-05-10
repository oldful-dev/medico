// Native platform handler
//
// The web Firebase SDK uses IndexedDB which doesn't exist in React Native.
// We implement Remote Config via two Firebase REST APIs:
//   1. Firebase Installations API  → get a real FID (Firebase Installation ID)
//   2. Firebase RC Fetch API       → fetch config using that FID
//
// This approach works in managed Expo without any native modules.

import AsyncStorage from '@react-native-async-storage/async-storage';

const FID_CACHE_KEY   = '@ayuxacare_firebase_fid';
const FID_TOKEN_KEY   = '@ayuxacare_firebase_fid_token';
const RC_CACHE_KEY    = '@ayuxacare_rc_cache';
const RC_CACHE_TS_KEY = '@ayuxacare_rc_cache_ts';

// ── Messaging & Analytics — not available in managed Expo ────────────────────
export const getWebMessaging    = () => null;
export const getWebToken        = () => null;
export const isMessagingSupported = async () => false;
export const getWebAnalytics    = () => null;
export const logAnalyticsEvent  = () => null;
export const isAnalyticsSupported = async () => false;

// ── Types ─────────────────────────────────────────────────────────────────────
interface RCInstance {
    projectId:                    string;
    apiKey:                       string;
    appId:                        string;
    minimumFetchIntervalMillis:   number;
    defaultConfig:                Record<string, string>;
    _cache:                       Record<string, string>;
}

// ── Firebase Installations API ────────────────────────────────────────────────
// Registers the app and gets a real FID + auth token required by RC fetch.

async function getFirebaseInstallation(projectId: string, apiKey: string, appId: string): Promise<{ fid: string; token: string }> {
    // Return cached FID+token only if BOTH are present (token is required for RC fetch)
    try {
        const cachedFid   = await AsyncStorage.getItem(FID_CACHE_KEY);
        const cachedToken = await AsyncStorage.getItem(FID_TOKEN_KEY);
        if (cachedFid && cachedToken && cachedToken.length > 20) {
            console.log('[RC-FID] using cached FID:', cachedFid.slice(0, 12) + '...');
            return { fid: cachedFid, token: cachedToken };
        }
        // Token missing or empty — clear and re-register
        if (cachedFid && (!cachedToken || cachedToken.length < 20)) {
            console.log('[RC-FID] cached FID has no token — re-registering');
            await AsyncStorage.multiRemove([FID_CACHE_KEY, FID_TOKEN_KEY]);
        }
    } catch { /* ignore */ }

    console.log('[RC-FID] registering with Firebase Installations API...');
    const url = `https://firebaseinstallations.googleapis.com/v1/projects/${projectId}/installations`;

    // Generate a random FID (22 base64url chars, starts with letter per spec)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let fid = chars[Math.floor(Math.random() * 52)]; // first char must be letter
    for (let i = 0; i < 21; i++) fid += chars[Math.floor(Math.random() * 64)];

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type':    'application/json',
            'x-goog-api-key':  apiKey,
        },
        body: JSON.stringify({
            fid,
            appId,
            authVersion:   'FIS_v2',
            sdkVersion:    'a:17.0.0',
        }),
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`FID registration failed ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    const registeredFid   = data.fid ?? fid;
    const authToken       = data.authToken?.token ?? '';

    console.log('[RC-FID] registered FID:', registeredFid.slice(0, 12) + '...');

    // Cache for future launches
    try {
        await AsyncStorage.setItem(FID_CACHE_KEY,  registeredFid);
        await AsyncStorage.setItem(FID_TOKEN_KEY,  authToken);
    } catch { /* ignore */ }

    return { fid: registeredFid, token: authToken };
}

// ── Remote Config ─────────────────────────────────────────────────────────────

export const getWebRemoteConfig = (app: any): RCInstance => ({
    projectId: app._options?.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    apiKey:    app._options?.apiKey    ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY    ?? '',
    appId:     app._options?.appId     ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID     ?? '',
    minimumFetchIntervalMillis: 3600000,
    defaultConfig: {},
    _cache: {},
});

export const fetchRC = async (rc: RCInstance): Promise<boolean> => {
    // Check if cache is still fresh
    try {
        const tsStr = await AsyncStorage.getItem(RC_CACHE_TS_KEY);
        if (tsStr) {
            const age = Date.now() - parseInt(tsStr, 10);
            if (age < rc.minimumFetchIntervalMillis) {
                const cached = await AsyncStorage.getItem(RC_CACHE_KEY);
                if (cached) {
                    rc._cache = JSON.parse(cached);
                    console.log('[RC-REST] cache still fresh, age:', Math.round(age / 1000) + 's — skipping fetch');
                    return false;
                }
            }
        }
    } catch { /* ignore */ }

    // Get a real Firebase Installation ID + auth token
    const { fid, token } = await getFirebaseInstallation(rc.projectId, rc.apiKey, rc.appId);

    // Fetch Remote Config
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${rc.projectId}/namespaces/firebase:fetch?key=${rc.apiKey}`;
    const body = {
        appId:           rc.appId,
        appInstanceId:   fid,
        packageName:     'com.ayuxacare.app',
        platformVersion: '1.0.0',
        sdkVersion:      '11.0.0',
        appVersion:      '1.0.0',
        languageCode:    'en',
    };

    console.log('[RC-REST] fetching config, FID:', fid.slice(0, 12) + '...');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) headers['x-goog-firebase-installations-auth'] = token;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`RC fetch failed ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    console.log('[RC-REST] state:', data.state, '| entries:', Object.keys(data.entries ?? {}).join(', ') || '(none)');

    // Merge defaultConfig < fetched entries
    rc._cache = { ...rc.defaultConfig, ...(data.entries ?? {}) };

    // Persist to AsyncStorage
    try {
        await AsyncStorage.setItem(RC_CACHE_KEY,    JSON.stringify(rc._cache));
        await AsyncStorage.setItem(RC_CACHE_TS_KEY, String(Date.now()));
    } catch { /* ignore */ }

    return data.state === 'UPDATE';
};

export const getRCValue = (rc: RCInstance, key: string) => ({
    asString: (): string => rc._cache[key] ?? rc.defaultConfig[key] ?? '',
});

export const isRCSupported = async () => true;

// ── Auth — stubbed (not needed for RC) ───────────────────────────────────────
export const getWebAuth               = () => null;
export const webSignInWithCustomToken = async () => null;
export const webSignOut               = async () => {};
