import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PartyInput, UpdatePartyInput } from '@bizmanage/validation';
import { PartyType } from '@bizmanage/types';

export interface PartiesQueryParams {
  search?: string;
  categoryId?: string;
  type?: PartyType;
  page?: number;
  limit?: number;
}

export function useParties(params?: PartiesQueryParams) {
  return useQuery({
    queryKey: ['parties', params],
    queryFn: async () => {
      const res = await api.get('/parties', { params });
      return res.data;
    },
  });
}

export function usePartiesSummary() {
  return useQuery({
    queryKey: ['parties', 'summary'],
    queryFn: async () => {
      const res = await api.get('/parties/summary');
      return res.data.data;
    },
  });
}

export function useParty(id: string) {
  return useQuery({
    queryKey: ['parties', id],
    queryFn: async () => {
      const res = await api.get(`/parties/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/parties', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePartyInput }) => {
      const res = await api.put(`/parties/${id}`, data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['parties', variables.id] });
    },
  });
}

export function useDeleteParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/parties/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}
