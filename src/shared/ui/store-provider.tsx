'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { CartLine, PublicUser, Product } from '@/shared/lib/types';
import { api } from '@/shared/lib/client';
type Store = {
  user: PublicUser | null;
  authReady: boolean;
  cart: CartLine[];
  wishlist: string[];
  toast: (s: string) => void;
  refreshUser: () => Promise<void>;
  add: (p: Product, variantId: string, quantity?: number) => void;
  change: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
  toggleWish: (id: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const toast = useCallback((s: string) => setMessage(s), []);
  const refreshUser = useCallback(async () => {
    try {
      const d = await api<{ user: PublicUser | null }>('/api/auth/session');
      setUser(d.user);
      if (d.user) setWishlist(d.user.wishlist);
    } finally {
      setAuthReady(true);
    }
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ks-cart') || '[]');
      if (Array.isArray(saved))
        setCart(
          saved.filter(
            (l) =>
              typeof l.productId === 'string' &&
              typeof l.variantId === 'string' &&
              Number.isInteger(l.quantity) &&
              l.quantity > 0 &&
              l.quantity <= 10,
          ),
        );
      const w = JSON.parse(localStorage.getItem('ks-wishlist') || '[]');
      if (Array.isArray(w)) setWishlist(w.filter((v) => typeof v === 'string'));
    } catch {}
    setReady(true);
    refreshUser().catch(() => setAuthReady(true));
  }, [refreshUser]);
  useEffect(() => {
    if (ready) localStorage.setItem('ks-cart', JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem('ks-wishlist', JSON.stringify(wishlist));
  }, [wishlist, ready]);
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(id);
    }
  }, [message]);
  function add(p: Product, variantId: string, quantity = 1) {
    const v = p.variants.find((v) => v.id === variantId);
    const existing =
      cart.find((l) => l.productId === p._id && l.variantId === variantId)?.quantity || 0;
    if (!v || v.stock < existing + quantity) {
      toast('That quantity is not available.');
      return;
    }
    if (existing + quantity > 10) {
      toast('Maximum 10 per option.');
      return;
    }
    setCart((lines) => {
      const old = lines.find((l) => l.productId === p._id && l.variantId === variantId);
      return old
        ? lines.map((l) => (l === old ? { ...l, quantity: l.quantity + quantity } : l))
        : [...lines, { productId: p._id, variantId, quantity }];
    });
    toast(`${p.name} added to your bag`);
  }
  function change(productId: string, variantId: string, quantity: number) {
    setCart((lines) =>
      quantity <= 0
        ? lines.filter((l) => l.productId !== productId || l.variantId !== variantId)
        : lines.map((l) =>
            l.productId === productId && l.variantId === variantId
              ? { ...l, quantity: Math.min(10, quantity) }
              : l,
          ),
    );
  }
  async function toggleWish(id: string) {
    const next = wishlist.includes(id) ? wishlist.filter((v) => v !== id) : [...wishlist, id];
    setWishlist(next);
    if (user) {
      try {
        const d = await api<{ user: PublicUser }>('/api/account', {
          method: 'PATCH',
          body: JSON.stringify({ wishlist: next }),
        });
        setUser(d.user);
      } catch (e) {
        setWishlist(wishlist);
        toast((e as Error).message);
      }
    }
  }
  async function logout() {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    setUser(null);
    setWishlist([]);
    toast('You have been signed out.');
  }
  return (
    <Context.Provider
      value={{
        user,
        authReady,
        cart,
        wishlist,
        toast,
        refreshUser,
        add,
        change,
        clear: () => setCart([]),
        toggleWish,
        logout,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Store provider missing');
  return ctx;
}
