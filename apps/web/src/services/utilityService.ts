import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationItem {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  createdAt: string;
  link: string;
  isRead: boolean;
}

export interface NotificationsResponse {
  unreadCount: number;
  readNotifIds: string[];
  notifications: NotificationItem[];
}

export function useNotifications(businessId?: string | null) {
  return useQuery({
    queryKey: ['notifications', businessId],
    queryFn: async () => {
      const res = await api.get('/utilities/notifications');
      return res.data.data as NotificationsResponse;
    },
    enabled: !!businessId,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationsRead(businessId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { notificationId?: string; notificationIds?: string[]; markAll?: boolean }) => {
      const res = await api.post('/utilities/notifications/mark-read', payload);
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', businessId] });
      const previous = queryClient.getQueryData<NotificationsResponse>(['notifications', businessId]);

      if (previous) {
        const idsToMark = payload.markAll
          ? previous.notifications.map((n) => n.id)
          : payload.notificationId
          ? [payload.notificationId]
          : payload.notificationIds || [];

        const newReadSet = new Set([...previous.readNotifIds, ...idsToMark]);
        const updatedNotifications = previous.notifications.map((n) => ({
          ...n,
          isRead: newReadSet.has(n.id),
        }));
        const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length;

        queryClient.setQueryData<NotificationsResponse>(['notifications', businessId], {
          unreadCount: newUnreadCount,
          readNotifIds: Array.from(newReadSet),
          notifications: updatedNotifications,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', businessId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', businessId] });
    },
  });
}

export function useMarkNotificationsUnread(businessId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { notificationId?: string; notificationIds?: string[]; markAll?: boolean }) => {
      const res = await api.post('/utilities/notifications/mark-unread', payload);
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', businessId] });
      const previous = queryClient.getQueryData<NotificationsResponse>(['notifications', businessId]);

      if (previous) {
        const idsToUnmark = payload.markAll
          ? previous.notifications.map((n) => n.id)
          : payload.notificationId
          ? [payload.notificationId]
          : payload.notificationIds || [];

        const unmarkSet = new Set(idsToUnmark);
        const newReadSet = new Set(previous.readNotifIds.filter((id) => !unmarkSet.has(id)));
        const updatedNotifications = previous.notifications.map((n) => ({
          ...n,
          isRead: newReadSet.has(n.id),
        }));
        const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length;

        queryClient.setQueryData<NotificationsResponse>(['notifications', businessId], {
          unreadCount: newUnreadCount,
          readNotifIds: Array.from(newReadSet),
          notifications: updatedNotifications,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', businessId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', businessId] });
    },
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
      const res = await api.get('/utilities/export-backup');
      return res.data.data;
    },
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/utilities/restore-backup', payload);
      return res.data;
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
