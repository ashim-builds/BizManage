import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreatePaymentInInput, CreatePaymentOutInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';

export interface PaymentsQueryParams {
  search?: string;
  partyId?: string;
  mode?: PaymentMode;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function usePaymentsIn(params?: PaymentsQueryParams) {
  return useQuery({
    queryKey: ['payments', 'in', params],
    queryFn: async () => {
      const res = await api.get('/payments/in', { params });
      return res.data;
    },
  });
}

export function usePaymentsInSummary() {
  return useQuery({
    queryKey: ['payments', 'in', 'summary'],
    queryFn: async () => {
      const res = await api.get('/payments/in/summary');
      return res.data.data;
    },
  });
}

export function useCreatePaymentIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentInInput) => {
      const res = await api.post('/payments/in', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function usePaymentsOut(params?: PaymentsQueryParams) {
  return useQuery({
    queryKey: ['payments', 'out', params],
    queryFn: async () => {
      const res = await api.get('/payments/out', { params });
      return res.data;
    },
  });
}

export function usePaymentsOutSummary() {
  return useQuery({
    queryKey: ['payments', 'out', 'summary'],
    queryFn: async () => {
      const res = await api.get('/payments/out/summary');
      return res.data.data;
    },
  });
}

export function useCreatePaymentOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentOutInput) => {
      const res = await api.post('/payments/out', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}
