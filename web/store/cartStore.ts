import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  serviceId: string;
  problem: string;
  providerType: string;
  scheduleTime: string;
  address: string;
  visitType?: string;
  price: number;
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
        // Overwrite existing items for this specific UX since usually one heavy service booking at a time
        // Or keep accumulating? The prompt design says "Show selected service", implies single checkout
        items: [{ ...item, id: Date.now().toString() }],
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
