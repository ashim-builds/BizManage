import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStorefrontSettings,
  updateStorefrontSettings,
  getStorefrontOrders,
  updateOrderStatus,
  getPublicStores,
  getPublicStorefront,
  submitOnlineOrder,
  StorefrontSettings,
} from '@/services/storefrontService';

export function useStorefrontSettings() {
  return useQuery({
    queryKey: ['storefrontSettings'],
    queryFn: getStorefrontSettings,
  });
}

export function useUpdateStorefrontSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StorefrontSettings>) => updateStorefrontSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefrontSettings'] });
    },
  });
}

export function useStorefrontOrders() {
  return useQuery({
    queryKey: ['storefrontOrders'],
    queryFn: getStorefrontOrders,
    refetchInterval: 15000, // Auto-refresh incoming online orders every 15 seconds
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefrontOrders'] });
    },
  });
}

export function usePublicStores() {
  return useQuery({
    queryKey: ['publicStores'],
    queryFn: getPublicStores,
  });
}

export function usePublicStorefront(storeSlug: string) {
  return useQuery({
    queryKey: ['publicStorefront', storeSlug],
    queryFn: () => getPublicStorefront(storeSlug),
    enabled: Boolean(storeSlug),
  });
}

export function useSubmitOnlineOrder(storeSlug: string) {
  return useMutation({
    mutationFn: (orderData: {
      customerName: string;
      customerPhone: string;
      deliveryAddress?: string;
      notes?: string;
      items: Array<{ itemId: string; quantity: number }>;
    }) => submitOnlineOrder(storeSlug, orderData),
  });
}
