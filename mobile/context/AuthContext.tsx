// ──────────────────────────────────────────────
//  Auth Context — Global authentication state
//  Integrates with:
//    - storageService (persist tokens to AsyncStorage)
//    - apiClient (set/clear Bearer token)
//    - authService (backend OTP + token refresh)
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { apiClient } from '@/services/api/apiClient';
import { storageService, STORAGE_KEYS } from '@/services/device/storageService';
import { notificationService } from '@/services/device/notificationService';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    userId: string | null;
    token: string | null;
}

interface AuthContextType extends AuthState {
    login: (accessToken: string, refreshToken: string, userId: string) => Promise<void>;
    logout: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        userId: null,
        token: null,
    });
    const [showSessionDialog, setShowSessionDialog] = useState(false);
    const notificationListenerRef = useRef<Notifications.Subscription | null>(null);
    const responseListenerRef = useRef<Notifications.Subscription | null>(null);

    // ─── Boot: Restore tokens from AsyncStorage ──────
    useEffect(() => {
        (async () => {
            try {
                // Short artificial delay (500ms) to allow the app container to mount 
                // and avoid split-second white flashes before the state takes over.
                await new Promise(resolve => setTimeout(resolve, 500));

                // One-time migration from plaintext AsyncStorage (pre-SecureStore
                // app versions) — must run before getAuthTokens() so an existing
                // session survives the update instead of forcing a re-login.
                await storageService.migrateAuthTokensToSecureStore();

                const { accessToken, refreshToken } = await storageService.getAuthTokens();
                const userId = await storageService.getItem(STORAGE_KEYS.USER_ID);

                if (accessToken && refreshToken && userId) {
                    // Hydrate apiClient with stored tokens
                    apiClient.setAuthToken(accessToken);
                    apiClient.setRefreshToken(refreshToken);

                    setState({
                        isAuthenticated: true,
                        isLoading: false,
                        userId,
                        token: accessToken,
                    });

                    // Register push token on app boot
                    (async () => {
                        try {
                            const pushToken = await notificationService.registerForPush();
                            if (pushToken) {
                                await apiClient.put('/users/profile/device-token', { fcmToken: pushToken });
                            }
                        } catch (error) {
                            console.error('Failed to register push token on boot:', error);
                        }
                    })();
                } else {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            } catch {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        })();
    }, []);

    // ─── Push notification listeners ──────────────────────
    useEffect(() => {
        // Foreground: notification received while app is open
        notificationListenerRef.current = notificationService.addNotificationListener(
            (notification) => {
                // expo-notifications already shows the alert (setNotificationHandler handles it)
                // Nothing extra needed — the notification inbox auto-refreshes on next open
                console.log('Push received:', notification.request.content.title);
            }
        );

        // Tap: user tapped a notification (foreground or background)
        responseListenerRef.current = notificationService.addResponseListener(
            (response) => {
                const data = response.notification.request.content.data as Record<string, any>;
                const type = data?.type as string | undefined;

                if (data?.screen) {
                    router.push(data.screen as any);
                } else if (type?.startsWith('sos_')) {
                    router.push('/sos-emergency' as any);
                } else if (type === 'ticket_created' || type === 'ticket_reply') {
                    router.push('/help-support' as any);
                } else if (
                    type === 'booking_created' || type === 'booking_status' ||
                    type === 'caregiver_assigned' || type === 'lab_booking_confirmed' ||
                    type === 'lab_rescheduled'
                ) {
                    router.push('/my-bookings' as any);
                } else if (type === 'subscription_activated') {
                    router.push('/(tabs)' as any);
                } else {
                    router.push('/notifications' as any);
                }
            }
        );

        return () => {
            notificationListenerRef.current?.remove();
            responseListenerRef.current?.remove();
        };
    }, [router]);

    // ─── Register callback: when apiClient refreshes the token, persist it ──
    useEffect(() => {
        apiClient.setTokenRefreshedCallback(async (newAccessToken: string) => {
            await storageService.setSecureItem(STORAGE_KEYS.AUTH_TOKEN, newAccessToken);
            setState(prev => ({ ...prev, token: newAccessToken }));
        });

        apiClient.setAuthFailureCallback(async () => {
            // Token refresh failed — show session expired dialog
            setShowSessionDialog(true);
        });
    }, []);

    // ─── Login ────────────────────────────────────────
    const login = async (accessToken: string, refreshToken: string, userId: string) => {
        // Persist tokens
        await storageService.saveAuthTokens(accessToken, refreshToken);
        await storageService.setItem(STORAGE_KEYS.USER_ID, userId);

        // Configure apiClient
        apiClient.setAuthToken(accessToken);
        apiClient.setRefreshToken(refreshToken);

        setState({
            isAuthenticated: true,
            isLoading: false,
            userId,
            token: accessToken,
        });

        // Register push token with backend
        try {
            const pushToken = await notificationService.registerForPush();
            if (pushToken) {
                await apiClient.put('/users/profile/device-token', { fcmToken: pushToken });
            }
        } catch (error) {
            console.error('Failed to register push token:', error);
        }
    };

    // ─── Logout ───────────────────────────────────────
    const logout = async () => {
        try {
            // Tell the backend to invalidate the refresh token
            await apiClient.post('/auth/logout').catch(() => { }); // best-effort
        } finally {
            apiClient.clearAuthToken();
            await storageService.clearAuthTokens();
            await storageService.removeItem(STORAGE_KEYS.USER_ID);
            setState({
                isAuthenticated: false,
                isLoading: false,
                userId: null,
                token: null,
            });
        }
    };

    const setLoading = (loading: boolean) => {
        setState(prev => ({ ...prev, isLoading: loading }));
    };

    const handleLoginAgain = async () => {
        setShowSessionDialog(false);
        await logout();
        router.replace('/(auth)/login');
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, setLoading }}>
            {children}

            <Modal
                visible={showSessionDialog}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    <View style={styles.dialog}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-closed" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Session Expired</Text>
                        <Text style={styles.message}>
                            Your session has expired. Please log in again to continue.
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={handleLoginAgain} activeOpacity={0.85}>
                            <Text style={styles.buttonText}>Login Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AuthContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    dialog: {
        backgroundColor: Colors.bgScreen,
        borderRadius: Radius.xl,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        ...Shadow.card,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E8F5EC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading1,
        color: Colors.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 40,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: '#FFFFFF',
    },
});

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
