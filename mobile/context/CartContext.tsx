// Cart Context - Shopping cart for services
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = (item: CartItem) => {
        setItems(prev => [...prev, item]);
    };

    const removeItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    };

    const clearCart = () => setItems([]);

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            items, addItem, removeItem, updateQuantity, clearCart,
            totalAmount, itemCount,
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
