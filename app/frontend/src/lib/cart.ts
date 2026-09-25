import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { Cart, CartSource, CheckoutResponse } from "../types";

const CART_TOKEN_KEY = "si_cart_token";

export function getCartToken(): string | null {
  try {
    return localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCartToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(CART_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CART_TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

async function createCart(): Promise<Cart> {
  const cart = await api.post<Cart>("/v1/cart");
  setCartToken(cart.token);
  return cart;
}

async function fetchOrCreateCart(): Promise<Cart> {
  const token = getCartToken();
  if (!token) {
    return createCart();
  }
  try {
    return await api.get<Cart>(`/v1/cart/${token}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return createCart();
    }
    throw error;
  }
}

export const cartQueryKey = ["cart"] as const;

export function useCart() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: fetchOrCreateCart,
    staleTime: 0,
  });
}

async function ensureToken(): Promise<string> {
  const token = getCartToken();
  if (token) return token;
  const cart = await createCart();
  return cart.token;
}

export function useSetCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ref: string;
      quantity: number;
      source?: CartSource;
    }) => {
      const token = await ensureToken();
      try {
        return await api.put<Cart>(`/v1/cart/${token}/items/${input.ref}`, {
          quantity: input.quantity,
          source: input.source ?? "catalog",
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          const cart = await createCart();
          return api.put<Cart>(`/v1/cart/${cart.token}/items/${input.ref}`, {
            quantity: input.quantity,
            source: input.source ?? "catalog",
          });
        }
        throw error;
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ref: string) => {
      const token = await ensureToken();
      return api.delete<Cart>(`/v1/cart/${token}/items/${ref}`);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await ensureToken();
      return api.delete<Cart>(`/v1/cart/${token}/items`);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_name: string;
      customer_phone: string;
      customer_city: string;
      notes?: string;
    }) => {
      const token = await ensureToken();
      return api.post<CheckoutResponse>("/v1/orders", {
        cart_token: token,
        ...input,
      });
    },
    onSuccess: () => {
      setCartToken(null);
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });
}
