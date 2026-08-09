import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateIncomeInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';

export interface IncomeQueryParams {
  search?: string;
  category?: string;
  paymentMode?: PaymentMode;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useIncomes(params?: IncomeQueryParams) {
  return useQuery({
    queryKey: ['income', params],
    queryFn: async () => {
      const res = await api.get('/income', { params });
      return res.data;
    },
  });
}

export function useIncomeSummary() {
  return useQuery({
    queryKey: ['income', 'summary'],
    queryFn: async () => {
      const res = await api.get('/income/summary');
      return res.data.data;
    },
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIncomeInput) => {
      const res = await api.post('/income', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/income/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
  });
}
