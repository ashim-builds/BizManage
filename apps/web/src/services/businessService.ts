import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UpdateBusinessInput, UpdateBusinessSettingsInput } from '@bizmanage/validation';

export function useCurrentBusiness() {
  return useQuery({
    queryKey: ['business', 'current'],
    queryFn: async () => {
      const res = await api.get('/businesses/current');
      return res.data.data;
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateBusinessInput) => {
      const res = await api.put('/businesses/current', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateBusinessSettingsInput) => {
      const res = await api.put('/businesses/current/settings', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'current'] });
    },
  });
}
