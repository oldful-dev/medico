import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  type?: 'service' | 'plan'; 
  serviceId?: string;
  planId?: string;
  billingCycle?: string;
  price: number;
  name?: string; // Cache name for display
  // Dynamic fields for different services
  [key: string]: unknown;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set(() => ({
        items: [{ ...item, id: Date.now().toString() } as CartItem],
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id),
      })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'oldful-cart-storage',
    }
  )
);
