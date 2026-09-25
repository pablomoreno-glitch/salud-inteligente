import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  AdminDashboard,
  AdminOrderListItem,
  AdminProductRow,
  ContactMessage,
  Order,
  OrderStatus,
  StockRow,
} from "../types";

export function useDashboard(days: number) {
  return useQuery({
    queryKey: ["admin", "dashboard", days],
    queryFn: () => api.get<AdminDashboard>(`/admin/dashboard?days=${days}`, true),
  });
}

export function useAdminOrders(params: { status?: string; q?: string }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () =>
      api.get<{ items: AdminOrderListItem[]; total: number }>(
        `/admin/orders?${query.toString()}`,
        true,
      ),
  });
}

export function useAdminOrder(id: number | null) {
  return useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => api.get<Order>(`/admin/orders/${id}`, true),
    enabled: id !== null,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch<Order>(`/admin/orders/${id}/status`, { status }, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useAdminInventory(params: { status?: string; q?: string }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  return useQuery({
    queryKey: ["admin", "inventory", params],
    queryFn: () =>
      api.get<{ items: StockRow[]; total: number }>(
        `/admin/inventory?${query.toString()}`,
        true,
      ),
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ref,
      ...body
    }: {
      ref: string;
      quantity: number | null;
      low_stock_threshold?: number;
    }) => api.patch<StockRow>(`/admin/inventory/${ref}`, body, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useAdminProducts(params: { q?: string; category?: string }) {
  const query = new URLSearchParams();
  query.set("include_inactive", "true");
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  return useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () =>
      api.get<{ items: AdminProductRow[]; total: number }>(
        `/admin/products?${query.toString()}`,
        true,
      ),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ref,
      ...body
    }: {
      ref: string;
      price?: number | null;
      description?: string;
      is_active?: boolean;
      name?: string;
    }) => api.patch<AdminProductRow>(`/admin/products/${ref}`, body, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useAdminMessages(params: { status?: string }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  return useQuery({
    queryKey: ["admin", "messages", params],
    queryFn: () =>
      api.get<{ items: ContactMessage[]; total: number }>(
        `/admin/messages?${query.toString()}`,
        true,
      ),
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactMessage["status"] }) =>
      api.patch<ContactMessage>(`/admin/messages/${id}`, { status }, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
