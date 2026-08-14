import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CreateSaleInput,
  CreateSaleReturnInput,
} from '@bizmanage/validation';
import { InvoiceStatus } from '@bizmanage/types';

export interface SalesQueryParams {
  search?: string;
  partyId?: string;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}

export function useSales(params?: SalesQueryParams) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: async () => {
      const res = await api.get('/sales', { params });
      return res.data;
    },
  });
}

export function useSalesSummary() {
  return useQuery({
    queryKey: ['sales', 'summary'],
    queryFn: async () => {
      const res = await api.get('/sales/summary');
      return res.data.data;
    },
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const res = await api.get(`/sales/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleInput) => {
      const res = await api.post('/sales', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function usePaySale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, paymentMode, accountId, notes }: { id: string; amount?: number; paymentMode?: string; accountId?: string; notes?: string }) => {
      const res = await api.post(`/sales/${id}/pay`, { amount, paymentMode, accountId, notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useSaleReturns() {
  return useQuery({
    queryKey: ['sales', 'returns'],
    queryFn: async () => {
      const res = await api.get('/sales/returns/list');
      return res.data.data;
    },
  });
}

export function useSaleReturn(id: string) {
  return useQuery({
    queryKey: ['sales', 'returns', id],
    queryFn: async () => {
      const res = await api.get(`/sales/returns/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateSaleReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleReturnInput) => {
      const res = await api.post('/sales/returns', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}

