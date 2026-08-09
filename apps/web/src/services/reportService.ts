import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSalesReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      const res = await api.get('/reports/sales', { params });
      return res.data.data;
    },
  });
}

export function usePurchaseReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'purchases', params],
    queryFn: async () => {
      const res = await api.get('/reports/purchases', { params });
      return res.data.data;
    },
  });
}

export function useExpenseReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'expenses', params],
    queryFn: async () => {
      const res = await api.get('/reports/expenses', { params });
      return res.data.data;
    },
  });
}

export function usePaymentReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: async () => {
      const res = await api.get('/reports/payments', { params });
      return res.data.data;
    },
  });
}

export function usePartyBalanceReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'party-balance', params],
    queryFn: async () => {
      const res = await api.get('/reports/party-balance', { params });
      return res.data.data;
    },
  });
}

export function useInventoryValuationReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'inventory-valuation', params],
    queryFn: async () => {
      const res = await api.get('/reports/inventory-valuation', { params });
      return res.data.data;
    },
  });
}

export function useCashflowStatementReport(params?: any) {
  return useQuery({
    queryKey: ['reports', 'cashflow-statement', params],
    queryFn: async () => {
      const res = await api.get('/reports/cashflow-statement', { params });
      return res.data.data;
    },
  });
}
