import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BOMComponentItem {
  id?: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  item?: {
    id: string;
    name: string;
    code?: string | null;
    unit: string;
    currentStock: number;
    purchasePrice: number;
  };
}

export interface BillOfMaterialRecord {
  id: string;
  name: string;
  finishedItemId: string;
  outputQuantity: number;
  sourceGodownId?: string | null;
  targetGodownId?: string | null;
  estimatedCost: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedItem: {
    id: string;
    name: string;
    code?: string | null;
    unit: string;
    currentStock: number;
    salePrice: number;
    purchasePrice: number;
  };
  defaultGodown?: { id: string; name: string } | null;
  components: BOMComponentItem[];
  _count?: { productionRuns: number };
}

export interface ProductionRunRecord {
  id: string;
  runNumber: string;
  bomId: string;
  finishedItemId: string;
  quantityProduced: number;
  sourceGodownId?: string | null;
  destinationGodownId?: string | null;
  totalCost: number;
  notes?: string | null;
  runDate: string;
  createdAt: string;
  bom: { id: string; name: string };
  finishedItem: { id: string; name: string; code?: string | null; unit: string };
  sourceGodown?: { id: string; name: string } | null;
  destinationGodown?: { id: string; name: string } | null;
}

export function useBOMs() {
  return useQuery({
    queryKey: ['manufacturing', 'boms'],
    queryFn: async () => {
      const res = await api.get('/manufacturing/boms');
      return res.data as { success: boolean; data: BillOfMaterialRecord[] };
    },
  });
}

export function useBOM(id?: string) {
  return useQuery({
    queryKey: ['manufacturing', 'boms', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/manufacturing/boms/${id}`);
      return res.data.data as BillOfMaterialRecord;
    },
    enabled: !!id,
  });
}

export function useCreateBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      finishedItemId: string;
      outputQuantity: number;
      sourceGodownId?: string | null;
      targetGodownId?: string | null;
      estimatedCost?: number;
      notes?: string | null;
      components: { itemId: string; quantity: number; unitCost?: number }[];
    }) => {
      const res = await api.post('/manufacturing/boms', payload);
      return res.data.data as BillOfMaterialRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manufacturing', 'boms'] });
    },
  });
}

export function useDeleteBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/manufacturing/boms/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manufacturing', 'boms'] });
    },
  });
}

export function useProductionRuns(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['manufacturing', 'runs', params],
    queryFn: async () => {
      const res = await api.get('/manufacturing/runs', { params });
      return res.data as {
        success: boolean;
        data: ProductionRunRecord[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useExecuteProductionRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bomId: string;
      quantityProduced: number;
      sourceGodownId?: string | null;
      destinationGodownId?: string | null;
      runDate?: string;
      notes?: string | null;
    }) => {
      const res = await api.post('/manufacturing/runs', payload);
      return res.data.data as ProductionRunRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manufacturing'] });
      qc.invalidateQueries({ queryKey: ['godowns'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
