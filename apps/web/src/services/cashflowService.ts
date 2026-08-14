import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DailyCashflowPoint {
  date: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
}

export interface MonthlyCashflowPoint {
  month: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
}

export function useCashflowSummary() {
  return useQuery({
    queryKey: ['cashflow', 'summary'],
    queryFn: async () => {
      const res = await api.get('/cashflow/summary');
      return res.data.data;
    },
  });
}

export function useDailyCashflow() {
  return useQuery({
    queryKey: ['cashflow', 'daily'],
    queryFn: async () => {
      const res = await api.get('/cashflow/daily');
      return res.data.data as DailyCashflowPoint[];
    },
  });
}

export function useMonthlyCashflow() {
  return useQuery({
    queryKey: ['cashflow', 'monthly'],
    queryFn: async () => {
      const res = await api.get('/cashflow/monthly');
      return res.data.data as MonthlyCashflowPoint[];
    },
  });
}

export function useCashflowAccounts() {
  return useQuery({
    queryKey: ['cashflow', 'accounts'],
    queryFn: async () => {
      const res = await api.get('/cashflow/accounts');
      return res.data.data;
    },
  });
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export function useTransactionsList(params: TransactionListParams) {
  return useQuery({
    queryKey: ['transactions', 'list', params],
    queryFn: async () => {
      const res = await api.get('/cashflow/transactions', { params });
      return res.data;
    },
  });
}
