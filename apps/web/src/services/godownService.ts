import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Godown {
  id: string;
  name: string;
  location?: string | null;
  capacity?: string | null;
  isDefault: boolean;
  totalItemsCount: number;
  totalUnits: number;
  totalStockValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface GodownStockItem {
  id: string;
  itemId: string;
  itemName: string;
  itemCode?: string | null;
  unit: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  stockValue: number;
  totalItemStock: number;
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string;
  sourceGodownId: string;
  destinationGodownId: string;
  itemId: string;
  quantity: number;
  transferDate: string;
  notes?: string | null;
  createdAt: string;
  sourceGodown: { id: string; name: string };
  destinationGodown: { id: string; name: string };
  item: { id: string; name: string; code?: string | null; unit: string };
}

export function useGodowns() {
  return useQuery({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await api.get('/godowns');
      return res.data as { success: boolean; data: Godown[] };
    },
  });
}

export function useGodownStocks(godownId?: string) {
  return useQuery({
    queryKey: ['godowns', godownId, 'stocks'],
    queryFn: async () => {
      if (!godownId) return null;
      const res = await api.get(`/godowns/${godownId}/stocks`);
      return res.data.data as { godown: Godown; stocks: GodownStockItem[] };
    },
    enabled: !!godownId,
  });
}

export function useCreateGodown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      location?: string;
      capacity?: string;
      isDefault?: boolean;
    }) => {
      const res = await api.post('/godowns', payload);
      return res.data.data as Godown;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['godowns'] });
    },
  });
}

export function useUpdateGodown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      location?: string;
      capacity?: string;
      isDefault?: boolean;
    }) => {
      const res = await api.put(`/godowns/${id}`, payload);
      return res.data.data as Godown;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['godowns'] });
    },
  });
}

export function useDeleteGodown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/godowns/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['godowns'] });
    },
  });
}

export function useStockTransfers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['godowns', 'transfers', params],
    queryFn: async () => {
      const res = await api.get('/godowns/transfers', { params });
      return res.data as {
        success: boolean;
        data: StockTransferRecord[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useExecuteStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sourceGodownId: string;
      destinationGodownId: string;
      itemId: string;
      quantity: number;
      notes?: string;
      transferDate?: string;
    }) => {
      const res = await api.post('/godowns/transfers', payload);
      return res.data.data as StockTransferRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['godowns'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
