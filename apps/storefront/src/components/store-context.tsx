'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  API_BASE,
  STORE_SLUG,
  publicApi,
  type Address,
  type Cart,
  type CartAccess,
  type Customer,
  type CustomerSession,
  type Order,
  type Product,
  type Variant,
} from '../lib/commerce';

type StoreContextValue = {
  cart: Cart | null;
  cartAccess: CartAccess | null;
  customer: Customer | null;
  session: CustomerSession | null;
  addresses: Address[];
  orders: Order[];
  favorites: Set<string>;
  busy: boolean;
  notice: string;
  cartCount: number;
  cartTotal: number;
  addItem: (variant: Variant, quantity?: number) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  toggleFavorite: (product: Product) => Promise<boolean>;
  signIn: (session: CustomerSession, customer: Customer) => void;
  signOut: () => Promise<void>;
  customerApi: <T>(path: string, init?: RequestInit) => Promise<T>;
  refreshAccount: () => Promise<void>;
  clearCart: () => void;
  setNotice: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const cartKey = `cart:${STORE_SLUG}`;
const sessionKey = `customer:${STORE_SLUG}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartAccess, setCartAccess] = useState<CartAccess | null>(null);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadCart = useCallback(async (access: CartAccess) => {
    try {
      const next = await publicApi<Cart>(`/v1/public/stores/${STORE_SLUG}/carts/${access.cartId}`, {
        headers: { 'x-cart-token': access.cartToken },
      });
      setCart(next);
    } catch {
      sessionStorage.removeItem(cartKey);
      setCartAccess(null);
      setCart(null);
    }
  }, []);

  const customerApi = useCallback(async <T,>(path: string, init?: RequestInit) => {
    if (!session) throw new Error('CUSTOMER_SESSION_REQUIRED');
    return publicApi<T>(path, {
      ...init,
      headers: {
        authorization: `Bearer ${session.token}`,
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  }, [session]);

  const refreshAccount = useCallback(async () => {
    if (!session) return;
    try {
      const [profile, savedAddresses, orderPage, savedFavorites] = await Promise.all([
        customerApi<Customer>('/v1/customer/me'),
        customerApi<Address[]>('/v1/customer/addresses'),
        customerApi<Order[]>('/v1/customer/orders?limit=100'),
        customerApi<Array<{ productId: string }>>('/v1/customer/favorites'),
      ]);
      setCustomer(profile);
      setAddresses(savedAddresses);
      setOrders(orderPage);
      setFavorites(new Set(savedFavorites.map((item) => item.productId)));
    } catch {
      setNotice('Não foi possível atualizar os dados da sua conta.');
    }
  }, [customerApi, session]);

  useEffect(() => {
    const savedCart = sessionStorage.getItem(cartKey);
    if (savedCart) {
      try {
        const access = JSON.parse(savedCart) as CartAccess;
        setCartAccess(access);
        void loadCart(access);
      } catch {
        sessionStorage.removeItem(cartKey);
      }
    }
    const savedSession = sessionStorage.getItem(sessionKey);
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession) as CustomerSession);
      } catch {
        sessionStorage.removeItem(sessionKey);
      }
    }
  }, [loadCart]);

  useEffect(() => { void refreshAccount(); }, [refreshAccount]);

  async function ensureCart(): Promise<CartAccess> {
    if (cartAccess) return cartAccess;
    const access = await publicApi<CartAccess>(`/v1/public/stores/${STORE_SLUG}/carts`, {
      method: 'POST',
      ...(session ? { headers: { authorization: `Bearer ${session.token}` } } : {}),
    });
    sessionStorage.setItem(cartKey, JSON.stringify(access));
    setCartAccess(access);
    return access;
  }

  async function addItem(variant: Variant, quantity = 1) {
    setBusy(true);
    setNotice('');
    try {
      const access = await ensureCart();
      const next = await publicApi<Cart>(`/v1/public/stores/${STORE_SLUG}/carts/${access.cartId}/items`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-cart-token': access.cartToken },
        body: JSON.stringify({ variantId: variant.id, quantity }),
      });
      setCart(next);
      setNotice('Produto adicionado ao carrinho.');
    } catch {
      setNotice('Não foi possível atualizar o carrinho.');
    } finally {
      setBusy(false);
    }
  }

  async function setQuantity(variantId: string, quantity: number) {
    if (!cartAccess || !cart) return;
    setBusy(true);
    try {
      const item = cart.items.find((entry) => entry.variantId === variantId);
      if (quantity <= 0 && item) {
        const response = await fetch(`${API_BASE}/v1/public/stores/${STORE_SLUG}/carts/${cartAccess.cartId}/items/${item.id}`, {
          method: 'DELETE',
          headers: { 'x-cart-token': cartAccess.cartToken },
        });
        if (!response.ok) throw new Error('REMOVE_FAILED');
        await loadCart(cartAccess);
      } else {
        await addItem({ id: variantId } as Variant, quantity);
      }
    } catch {
      setNotice('Não foi possível atualizar a quantidade.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(product: Product): Promise<boolean> {
    if (!session) return false;
    const active = favorites.has(product.id);
    setBusy(true);
    try {
      await customerApi(active ? `/v1/customer/favorites/${product.id}` : '/v1/customer/favorites', {
        method: active ? 'DELETE' : 'POST',
        ...(active ? {} : { body: JSON.stringify({ productId: product.id }) }),
      });
      setFavorites((current) => {
        const next = new Set(current);
        if (active) next.delete(product.id); else next.add(product.id);
        return next;
      });
      return true;
    } finally {
      setBusy(false);
    }
  }

  function signIn(nextSession: CustomerSession, nextCustomer: Customer) {
    sessionStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
    setCustomer(nextCustomer);
  }

  async function signOut() {
    if (session) await customerApi('/v1/customer/auth/logout', { method: 'POST' }).catch(() => undefined);
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    setCustomer(null);
    setAddresses([]);
    setOrders([]);
    setFavorites(new Set());
  }

  function clearCart() {
    sessionStorage.removeItem(cartKey);
    setCartAccess(null);
    setCart(null);
  }

  const value = useMemo<StoreContextValue>(() => ({
    cart,
    cartAccess,
    customer,
    session,
    addresses,
    orders,
    favorites,
    busy,
    notice,
    cartCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    cartTotal: cart?.items.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0) ?? 0,
    addItem,
    setQuantity,
    toggleFavorite,
    signIn,
    signOut,
    customerApi,
    refreshAccount,
    clearCart,
    setNotice,
  }), [addresses, busy, cart, cartAccess, customer, customerApi, favorites, notice, orders, refreshAccount, session]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('StoreProvider ausente');
  return context;
}
