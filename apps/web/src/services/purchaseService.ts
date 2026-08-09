import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreatePurchaseInput, CreatePurchaseReturnInput } from '@bizmanage/validation';
import { InvoiceStatus } from '@bizmanage/types';

export interface PurchasesQueryParams {
  search?: string;
  partyId?: string;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}

export function usePurchases(params?: PurchasesQueryParams) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: async () => {
      const res = await api.get('/purchases', { params });
      return res.data;
    },
  });
}

export function usePurchasesSummary() {
  return useQuery({
    queryKey: ['purchases', 'summary'],
    queryFn: async () => {
      const res = await api.get('/purchases/summary');
      return res.data.data;
    },
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: async () => {
      const res = await api.get(`/purchases/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseInput) => {
      const res = await api.post('/purchases', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function usePayPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, paymentMode, accountId, notes }: { id: string; amount?: number; paymentMode?: string; accountId?: string; notes?: string }) => {
      const res = await api.post(`/purchases/${id}/pay`, { amount, paymentMode, accountId, notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function usePurchaseReturns() {
  return useQuery({
    queryKey: ['purchases', 'returns'],
    queryFn: async () => {
      const res = await api.get('/purchases/returns/list');
      return res.data.data;
    },
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseReturnInput) => {
      const res = await api.post('/purchases/returns', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}
