import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CategoryInput } from '@bizmanage/validation';

// Party Categories
export function usePartyCategories(search?: string) {
  return useQuery({
    queryKey: ['categories', 'party', search],
    queryFn: async () => {
      const res = await api.get('/categories/party', { params: { search } });
      return res.data.data;
    },
  });
}

export function useCreatePartyCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInput) => {
      const res = await api.post('/categories/party', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'party'] });
    },
  });
}

export function useUpdatePartyCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryInput }) => {
      const res = await api.put(`/categories/party/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'party'] });
    },
  });
}

export function useDeletePartyCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/categories/party/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'party'] });
    },
  });
}

// Item Categories
export function useItemCategories(search?: string) {
  return useQuery({
    queryKey: ['categories', 'item', search],
    queryFn: async () => {
      const res = await api.get('/categories/item', { params: { search } });
      return res.data.data;
    },
  });
}

export function useCreateItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInput) => {
      const res = await api.post('/categories/item', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'item'] });
    },
  });
}

export function useUpdateItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryInput }) => {
      const res = await api.put(`/categories/item/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'item'] });
    },
  });
}

export function useDeleteItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/categories/item/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'item'] });
    },
  });
}

// Expense Categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: async () => {
      const res = await api.get('/categories/expense');
      return res.data.data;
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInput) => {
      const res = await api.post('/categories/expense', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'expense'] });
    },
  });
}

// Income Categories
export function useIncomeCategories() {
  return useQuery({
    queryKey: ['categories', 'income'],
    queryFn: async () => {
      const res = await api.get('/categories/income');
      return res.data.data;
    },
  });
}

export function useCreateIncomeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInput) => {
      const res = await api.post('/categories/income', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'income'] });
    },
  });
}
