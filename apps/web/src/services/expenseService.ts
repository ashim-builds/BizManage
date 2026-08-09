import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateExpenseInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';

export interface ExpenseQueryParams {
  search?: string;
  category?: string;
  paymentMode?: PaymentMode;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useExpenses(params?: ExpenseQueryParams) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const res = await api.get('/expenses', { params });
      return res.data;
    },
  });
}

export function useExpensesSummary() {
  return useQuery({
    queryKey: ['expenses', 'summary'],
    queryFn: async () => {
      const res = await api.get('/expenses/summary');
      return res.data.data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const res = await api.post('/expenses', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/expenses/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
