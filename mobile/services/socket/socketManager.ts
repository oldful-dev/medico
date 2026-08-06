import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';
import { sduiService } from '../firebase/sduiService';
import { bannerService } from '../api/bannerService';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://api.ayuxacare.com';

let socket: Socket | null = null;
let connectionPromise: Promise<Socket | null> | null = null;

/**
 * Initialize Socket.io with authentication
 * Returns a promise that resolves when the socket is connected or fails
 */
export const initSocket = async (): Promise<Socket | null> => {
    // If already connected, return immediately
    if (socket && socket.connected) {
        console.log('[Socket] ✅ Already connected, reusing socket');
        return socket;
    }

    // If already initializing, return the pending promise
    if (connectionPromise) {
        console.log('[Socket] ⏳ Initialization in progress, waiting...');
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            console.log('[Socket] 🔌 Initializing with URL:', SOCKET_URL);

            // Get auth token from apiClient (set after login)
            let token = apiClient.getAuthToken();

            // If no token yet, wait briefly for it to be available (in case user just logged in)
            if (!token) {
                console.log('[Socket] 🔑 No token available yet, waiting...');
                let attempts = 0;
                while (!token && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    token = apiClient.getAuthToken();
                    attempts++;
                }
                console.log('[Socket] 🔑 Auth token available:', token ? 'yes' : 'no (continuing without auth)');
            } else {
                console.log('[Socket] 🔑 Auth token available: yes');
            }

            const auth: any = token ? { token } : {};

            socket = io(SOCKET_URL, {
                auth,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity,
                transports: ['websocket', 'polling'],
                timeout: 20000,
                withCredentials: true,
            });

            // Wait for connection with timeout
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Socket connection timeout'));
                }, 10000);

                socket!.once('connect', () => {
                    clearTimeout(timeout);
                    console.log('[Socket] ✅ Connected, socket ID:', socket!.id);
                    resolve();
                });

                socket!.once('connect_error', (err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });

            // Attach event listeners after connection
            socket.on('connect_error', (err: any) => {
                console.error('[Socket] ❌ Connection error:', err.message || err);
            });

            socket.on('disconnect', (reason: string) => {
                console.warn('[Socket] ⚠️ Disconnected:', reason);
            });

            socket.on('error', (err: any) => {
                console.error('[Socket] ❌ Socket error:', err);
            });

            // Global Real-Time Force Cache Refresh Listener
            socket.on('CACHE_PURGE_FORCE_REFRESH', async (data: any) => {
                console.log('[Socket] 🔄 Received CACHE_PURGE_FORCE_REFRESH signal from admin:', data);
                try {
                    sduiService.clearCache();
                    await sduiService.init(true);

                    bannerService.clearCache();
                    await bannerService.getHomeBanners(true);

                    await AsyncStorage.multiRemove(['@ayuxacare_rc_cache', '@ayuxacare_rc_cache_ts']);
                    console.log('[Socket] ✅ Real-time data force refreshed across mobile app');
                } catch (err) {
                    console.error('[Socket] Error handling CACHE_PURGE_FORCE_REFRESH:', err);
                }
            });

            return socket;
        } catch (error) {
            console.error('[Socket] ❌ Initialization error:', error);
            socket = null;
            return null;
        } finally {
            connectionPromise = null;
        }
    })();

    return connectionPromise;
};

/**
 * Join user room for receiving personal updates
 */
export const joinUserRoom = async (userId: string): Promise<void> => {
    try {
        if (!socket) {
            console.log('[Socket] 📡 Socket not initialized, initializing...');
            await initSocket();
        }

        if (!socket) {
            console.error('[Socket] ❌ Failed to initialize socket');
            return;
        }

        // Wait for connection if not connected
        if (!socket.connected) {
            console.log('[Socket] ⏳ Waiting for connection before joining room...');
            await new Promise<void>((resolve) => {
                socket!.once('connect', () => {
                    resolve();
                });
            });
        }

        socket.emit('join_user_room', userId);
        console.log('[Socket] ✅ Joined user room:', userId);
    } catch (error) {
        console.error('[Socket] ❌ Error joining user room:', error);
    }
};

/**
 * Get socket instance
 */
export const getSocket = (): Socket | null => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket] Disconnected');
    }
};

/**
 * Emit event
 */
export const emitSocket = (event: string, data?: any): void => {
    if (socket && socket.connected) {
        socket.emit(event, data);
    } else {
        console.warn(`[Socket] Cannot emit ${event}, socket not connected`);
    }
};

/**
 * Listen to socket event
 */
export const onSocket = (event: string, callback: (...args: any[]) => void): (() => void) => {
    if (!socket) {
        console.warn('[Socket] Socket not initialized');
        return () => {};
    }

    socket.on(event, callback);

    // Return cleanup function
    return () => {
        if (socket) {
            socket.off(event, callback);
        }
    };
};
