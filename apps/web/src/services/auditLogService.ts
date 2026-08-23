import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AuditLogsQueryParams {
  search?: string;
  module?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  businessId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  ipAddress?: string | null;
  details?: any;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
  user?: AuditLogUser | null;
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    summary: {
      totalEvents: number;
      salesCount: number;
      purchasesCount: number;
      inventoryCount: number;
      financialCount: number;
    };
  };
}

export function useAuditLogs(params?: AuditLogsQueryParams) {
  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const res = await api.get('/audit-logs', { params });
      return res.data;
    },
  });
}
