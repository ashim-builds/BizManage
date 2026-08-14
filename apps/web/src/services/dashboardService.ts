import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
}

export interface DashboardMetrics {
  toReceive: number;
  toGive: number;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalCash: number;
  totalBank: number;
  totalCashAndBank: number;
  recentTransactions: any[];
  lowStockItems: any[];
  salesCount: number;
  purchasesCount: number;
  totalItemsCount: number;
  totalProductsCount: number;
  totalPartiesCount?: number;
}

export function useDashboardMetrics(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ['dashboard', 'metrics', params],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics', { params });
      return res.data.data as DashboardMetrics;
    },
  });
}
