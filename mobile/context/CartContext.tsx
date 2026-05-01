// Cart Context - Shopping cart for services with persistence
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/api/apiClient';

const CART_STORAGE_KEY = '@oldful_cart_items';

export interface CartItem {
    id: string;
    serviceType: string;
    title: string;
    price: number;
    quantity: number;
    details: any;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    totalAmount: number;
    itemCount: number;
    isInitialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Hydrate cart from storage on mount
    useEffect(() => {
        const loadCart = async () => {
            try {
                const saved = await AsyncStorage.getItem(CART_STORAGE_KEY);
                if (saved) {
                    let loadedItems: CartItem[] = JSON.parse(saved);

                    // ─── Background Price Reconciliation ───────────────────────────────
                    // Silently update any cart item whose stored price has drifted
                    // from the current DB price (e.g. admin changed service price).
                    try {
                        const res = await apiClient.get<any[]>('/services');
                        if (res.success && res.data) {
                            const priceMap: Record<string, number> = {};
                            res.data.forEach((s: any) => {
                                if (s.slug) priceMap[s.slug] = s.basePrice ?? 0;
                            });
                            loadedItems = loadedItems.map(item => {
                                const livePrice = priceMap[item.serviceType];
                                if (livePrice > 0 && Math.abs(item.price - livePrice) > 5) {
                                    return { ...item, price: livePrice };
                                }
                                return item;
                            });
                        }
                    } catch {
                        // Fail silently — keep existing prices if API unavailable
                    }

                    setItems(loadedItems);
                }
            } catch (error) {
                console.error('Failed to load cart from storage:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        loadCart();
    }, []);

    // Persist cart to storage on change
    useEffect(() => {
        if (isInitialized) {
            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
                .catch(err => console.error('Failed to save cart:', err));
        }
    }, [items, isInitialized]);

    const addItem = (item: CartItem) => {
        setItems(prev => {
            // Check if item already exists
            const exists = prev.find(i => i.id === item.id);
            if (exists) return prev;
            return [...prev, item];
        });
    };

    const removeItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    };

    const clearCart = () => setItems([]);

    const totalAmount = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <CartContext.Provider value={{
            items, addItem, removeItem, updateQuantity, clearCart,
            totalAmount, itemCount, isInitialized
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
}
