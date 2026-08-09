import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Account {
  id: string;
  accountName: string;
  accountType: 'CASH' | 'BANK' | 'MOBILE_WALLET';
  accountNumber?: string | null;
  bankName?: string | null;
  balance: number;
  createdAt: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data as { data: Account[]; meta: { totalBalance: number } };
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      accountName: string;
      accountType: 'CASH' | 'BANK' | 'MOBILE_WALLET';
      accountNumber?: string;
      bankName?: string;
      openingBalance?: number;
    }) => {
      const res = await api.post('/accounts', payload);
      return res.data.data as Account;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; accountName?: string; accountType?: string; accountNumber?: string; bankName?: string }) => {
      const res = await api.patch(`/accounts/${id}`, payload);
      return res.data.data as Account;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
