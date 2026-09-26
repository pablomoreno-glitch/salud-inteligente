import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  AdminDashboard,
  AdminOrderListItem,
  AdminProductRow,
  ContactMessage,
  NotificationStatus,
  OrderNotification,
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

export function useOrderSms() {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const [status, latest] = await Promise.all([
        api.get<NotificationStatus>("/admin/notifications/status", true),
        api.get<{ items: OrderNotification[]; total: number }>("/admin/notifications?limit=1", true),
      ]);
      return { status, last: latest.items[0] ?? null, total: latest.total };
    },
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

/** Every stock row that exists (products never tracked have none). */
export function useAdminInventory() {
  const query = new URLSearchParams({ limit: "500" });
  return useQuery({
    queryKey: ["admin", "inventory"],
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

/** The whole catalog (active and inactive). Filtering happens on the page, so it is instant. */
export function useAdminProducts() {
  const query = new URLSearchParams({ include_inactive: "true", limit: "1000" });
  return useQuery({
    queryKey: ["admin", "products"],
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
