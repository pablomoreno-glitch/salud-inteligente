import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AdvisorChatResponse,
  AdvisorMessage,
  Availability,
  Business,
  Category,
  Need,
  Product,
  ProductListResponse,
} from "../types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/v1/catalog/categories"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNeeds() {
  return useQuery({
    queryKey: ["needs"],
    queryFn: () => api.get<Need[]>("/v1/catalog/needs"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ProductFilters {
  category?: string;
  need?: string;
  q?: string;
  viral?: boolean;
  trending?: boolean;
  limit?: number;
  offset?: number;
}

function buildQuery(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.need) params.set("need", filters.need);
  if (filters.q) params.set("q", filters.q);
  if (filters.viral) params.set("viral", "true");
  if (filters.trending) params.set("trending", "true");
  params.set("limit", String(filters.limit ?? 24));
  params.set("offset", String(filters.offset ?? 0));
  return params.toString();
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      api.get<ProductListResponse>(`/v1/catalog/products?${buildQuery(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get<Product>(`/v1/catalog/products/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });
}

export function useRelatedProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug, "related"],
    queryFn: () => api.get<Product[]>(`/v1/catalog/products/${slug}/related`),
    enabled: Boolean(slug),
  });
}

export function useAvailability(refs: string[]) {
  const key = refs.slice().sort().join(",");
  return useQuery({
    queryKey: ["availability", key],
    queryFn: () =>
      api.get<Availability[]>(
        `/v1/inventory/availability?refs=${encodeURIComponent(key)}`,
      ),
    enabled: refs.length > 0,
  });
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: () => api.get<Business>("/v1/business"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdvisorChat() {
  return useMutation({
    mutationFn: (messages: AdvisorMessage[]) =>
      api.post<AdvisorChatResponse>("/v1/advisor/chat", { messages }),
  });
}

export function useContactForm() {
  return useMutation({
    mutationFn: (input: {
      name: string;
      phone?: string;
      email?: string;
      message: string;
    }) => api.post("/v1/business/contact-messages", input),
  });
}
