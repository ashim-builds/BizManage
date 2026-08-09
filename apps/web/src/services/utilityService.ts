import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationItem {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  createdAt: string;
  link: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (typeof window === 'undefined') return { unreadCount: 0, notifications: [] };
      try {
        const res = await api.get('/utilities/notifications');
        return res.data.data as { unreadCount: number; notifications: NotificationItem[] };
      } catch (_) {
        return { unreadCount: 0, notifications: [] };
      }
    },
    enabled: typeof window !== 'undefined',
    refetchInterval: 30000,
  });
}

export function useImportParties() {
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await api.post('/utilities/import-parties', { rows });
      return res.data;
    },
  });
}

export function useImportItems() {
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await api.post('/utilities/import-items', { rows });
      return res.data;
    },
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get('/utilities/backup');
      return res.data.data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const res = await api.patch('/auth/change-password', data);
      return res.data;
    },
  });
}
