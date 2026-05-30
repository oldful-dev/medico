// Cart Context - Shopping cart for services with persistence
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/api/apiClient';

const CART_STORAGE_KEY = '@ayuxacare_cart_items';

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
    groupedItems: Record<string, CartItem[]>;
    selectedItemIds: string[];
    addItem: (item: CartItem) => void;
    removeItem: (itemId: string) => void;
    removeItems: (itemIds: string[]) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCategory: (category: string) => void;
    clearCart: () => void;
    getCategoryTotal: (category: string) => number;
    getGrandTotal: () => number;
    toggleItemSelection: (itemId: string) => void;
    selectItemsOfCategory: (category: string, select: boolean) => void;
    selectAllItems: (select: boolean) => void;
    isItemSelected: (itemId: string) => boolean;
    totalAmount: number;
    itemCount: number;
    isInitialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
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
                    setSelectedItemIds(loadedItems.map(item => item.id));
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
            if (exists) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i);
            }
            return [...prev, item];
        });
        setSelectedItemIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
    };

    const removeItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
        setSelectedItemIds(prev => prev.filter(id => id !== itemId));
    };

    const removeItems = (itemIds: string[]) => {
        setItems(prev => prev.filter(i => !itemIds.includes(i.id)));
        setSelectedItemIds(prev => prev.filter(id => !itemIds.includes(id)));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    };

    const clearCategory = (category: string) => {
        const idsToRemove = items.filter(i => i.serviceType === category).map(i => i.id);
        setItems(prev => prev.filter(i => i.serviceType !== category));
        setSelectedItemIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    };

    const clearCart = () => {
        setItems([]);
        setSelectedItemIds([]);
    };

    const getCategoryTotal = (category: string) => {
        return items
            .filter(i => i.serviceType === category)
            .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    };

    const getGrandTotal = () => {
        return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    };

    const toggleItemSelection = (itemId: string) => {
        setSelectedItemIds(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const selectItemsOfCategory = (category: string, select: boolean) => {
        const categoryItemIds = items.filter(i => i.serviceType === category).map(i => i.id);
        setSelectedItemIds(prev => {
            if (select) {
                const toAdd = categoryItemIds.filter(id => !prev.includes(id));
                return [...prev, ...toAdd];
            } else {
                return prev.filter(id => !categoryItemIds.includes(id));
            }
        });
    };

    const selectAllItems = (select: boolean) => {
        if (select) {
            setSelectedItemIds(items.map(i => i.id));
        } else {
            setSelectedItemIds([]);
        }
    };

    const isItemSelected = (itemId: string) => {
        return selectedItemIds.includes(itemId);
    };

    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.serviceType]) acc[item.serviceType] = [];
        acc[item.serviceType].push(item);
        return acc;
    }, {} as Record<string, CartItem[]>);

    const totalAmount = getGrandTotal();
    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <CartContext.Provider value={{
            items, groupedItems, selectedItemIds, addItem, removeItem, removeItems, updateQuantity, clearCategory, clearCart,
            getCategoryTotal, getGrandTotal, toggleItemSelection, selectItemsOfCategory, selectAllItems, isItemSelected,
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
