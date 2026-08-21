import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { encryptPayload } from '@/lib/e2eeInterceptor';
import { ItemInput, UpdateItemInput, StockAdjustmentInput } from '@bizmanage/validation';
import { ItemType } from '@bizmanage/types';

const ITEM_ENCRYPTED_FIELDS = ['name', 'code'];

export interface ItemsQueryParams {
  search?: string;
  categoryId?: string;
  type?: ItemType;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useItems(params?: ItemsQueryParams) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: async () => {
      const res = await api.get('/items', {
        params: {
          limit: 1000,
          ...params,
          lowStock: params?.lowStock ? 'true' : undefined,
        },
      });
      return res.data;
    },
  });
}

export function useItemsSummary() {
  return useQuery({
    queryKey: ['items', 'summary'],
    queryFn: async () => {
      const res = await api.get('/items/summary');
      return res.data.data;
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      const res = await api.get(`/items/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemInput) => {
      const encryptedData = await encryptPayload(data, ITEM_ENCRYPTED_FIELDS);
      const res = await api.post('/items', encryptedData);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemInput }) => {
      const encryptedData = await encryptPayload(data, ITEM_ENCRYPTED_FIELDS);
      const res = await api.put(`/items/${id}`, encryptedData);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', variables.id] });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StockAdjustmentInput }) => {
      const res = await api.post(`/items/${id}/adjust`, data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', variables.id] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/items/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
