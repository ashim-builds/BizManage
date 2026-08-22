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
  grossSales?: number;
  saleReturns?: number;
  totalPurchases: number;
  grossPurchases?: number;
  purchaseReturns?: number;
  totalExpenses: number;
  cogs?: number;
  salesMargin?: number;
  salesMarginPercentage?: number;
  netProfit?: number;
  netProfitPercentage?: number;
  todaySummary?: {
    sales: number;
    grossSales?: number;
    saleReturns?: number;
    cogs: number;
    salesMargin: number;
    salesMarginPercentage: number;
    purchases: number;
    expenses: number;
    netProfit: number;
    salesCount?: number;
  };
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
