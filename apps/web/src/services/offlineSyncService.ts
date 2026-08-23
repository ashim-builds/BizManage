'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface OfflineSaleRecord {
  id: string;
  voucherNo: string;
  timestamp: string;
  data: any;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  error?: string;
}

const OFFLINE_SALES_KEY = 'bizmanage_offline_sales';

export function getPendingOfflineSales(): OfflineSaleRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read offline sales', err);
    return [];
  }
}

export function saveOfflineSale(saleInput: any): OfflineSaleRecord {
  const existing = getPendingOfflineSales();
  const offlineVoucher = `OFFLINE-${Date.now().toString().slice(-6)}`;
  
  const record: OfflineSaleRecord = {
    id: `offline-${Date.now()}`,
    voucherNo: offlineVoucher,
    timestamp: new Date().toISOString(),
    data: saleInput,
    status: 'PENDING_SYNC',
  };

  const updated = [record, ...existing];
  localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(updated));
  return record;
}

export async function syncOfflineSales(): Promise<{ successCount: number; failCount: number }> {
  const records = getPendingOfflineSales();
  const pendingRecords = records.filter((r) => r.status === 'PENDING_SYNC');

  if (pendingRecords.length === 0) {
    return { successCount: 0, failCount: 0 };
  }

  let successCount = 0;
  let failCount = 0;
  const remainingRecords: OfflineSaleRecord[] = [];

  for (const record of records) {
    try {
      await api.post('/sales', record.data);
      successCount++;
    } catch (err: any) {
      console.error(`Failed to sync offline bill ${record.voucherNo}`, err);
      failCount++;
      remainingRecords.push({
        ...record,
        status: 'FAILED',
        error: err.response?.data?.error?.message || 'Network sync error',
      });
    }
  }

  // Keep failed records for retry, remove successfully synced ones
  localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(remainingRecords));

  if (successCount > 0) {
    toast.success(`Synced ${successCount} offline bill(s) to server!`, { id: 'offline-sync-success' });
  }
  if (failCount > 0) {
    toast.error(`Failed to sync ${failCount} offline bill(s). Will retry automatically.`, { id: 'offline-sync-fail' });
  }

  return { successCount, failCount };
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPending = () => {
    const list = getPendingOfflineSales();
    setPendingCount(list.length);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    refreshPending();

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Internet reconnected! Syncing offline bills...', { id: 'online-toast' });
      setIsSyncing(true);
      await syncOfflineSales();
      setIsSyncing(false);
      refreshPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Working in Offline Mode. Sales will be saved locally & synced when back online.', {
        id: 'offline-toast',
        duration: 5000,
      });
      refreshPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerManualSync = async () => {
    setIsSyncing(true);
    await syncOfflineSales();
    setIsSyncing(false);
    refreshPending();
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerManualSync,
  };
}
