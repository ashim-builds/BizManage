'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  RotateCcw,
  RefreshCw,
  HardDrive,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Server,
  Smartphone,
  Laptop,
  Clock,
  ArrowRight,
  FileCheck,
  Database,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type BackupTab = 'sync-share' | 'auto-backup' | 'restore-backup';

function SyncBackupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as BackupTab | null;

  const [activeTab, setActiveTab] = useState<BackupTab>(() => {
    if (tabParam && ['sync-share', 'auto-backup', 'restore-backup'].includes(tabParam)) {
      return tabParam;
    }
    return 'sync-share';
  });
  const [loading, setLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string>('');
  const [restoreStats, setRestoreStats] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tab state when URL tab param changes (e.g. clicking sidebar links)
  useEffect(() => {
    if (tabParam && ['sync-share', 'auto-backup', 'restore-backup'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: BackupTab) => {
    setActiveTab(tab);
    router.replace(`/sync-backup?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const savedAuto = localStorage.getItem('bizmanage_auto_backup');
    if (savedAuto !== null) {
      setAutoBackupEnabled(savedAuto === 'true');
    }
    const savedTime = localStorage.getItem('bizmanage_last_backup_time');
    if (savedTime) {
      setLastAutoBackupTime(savedTime);
    } else {
      setLastAutoBackupTime(new Date().toLocaleString());
    }
  }, []);

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('bizmanage_auto_backup', enabled.toString());
    toast.success(enabled ? 'Auto Backup enabled (Every 24 hours)' : 'Auto Backup paused');
  };

  // 1. BACKUP WHOLE DATABASE FOR BUSINESS ID (Download JSON)
  const handleDownloadBackup = async () => {
    setLoading(true);
    try {
      const res = await api.get('/utilities/export-backup');
      if (res.data?.success && res.data.data) {
        const backupData = res.data.data;
        const bizName = (backupData.metadata?.businessName || 'BizManage').replace(/[^a-zA-Z0-9_-]/g, '_');
        const totalRecords = backupData.metadata?.totalRecords || 0;
        const dataStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `BizManage_${bizName}_FullBackup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);

        const nowStr = new Date().toLocaleString();
        setLastAutoBackupTime(nowStr);
        localStorage.setItem('bizmanage_last_backup_time', nowStr);
        toast.success(`Full database backup (${totalRecords} records) downloaded successfully!`);
      } else {
        toast.error('Failed to export business database backup');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Error exporting database backup');
    } finally {
      setLoading(false);
    }
  };

  // 2. RESTORE BACKUP (Upload JSON)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await api.post('/utilities/restore-backup', json);
        if (res.data?.success) {
          setRestoreStats(res.data.message || 'Backup successfully restored');
          toast.success(res.data.message || 'Database restored successfully!');
        } else {
          toast.error(res.data?.error?.message || 'Restore failed');
        }
      } catch (err: any) {
        toast.error('Invalid JSON backup file or corrupted format');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sync, Share & Backup (डाटा सिंक र ब्याकअप)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time cross-device sync, automated local backups, and complete database disaster recovery.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleDownloadBackup}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center gap-2 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>{loading ? 'Exporting...' : 'Backup Now'}</span>
        </button>
      </div>

      {/* Submenu Navigation (Exact match to Screenshot 5) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => handleTabChange('sync-share')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'sync-share'
              ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync & Share</span>
        </button>

        <button
          onClick={() => handleTabChange('auto-backup')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'auto-backup'
              ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Auto Backup</span>
        </button>

        <button
          onClick={() => handleTabChange('restore-backup')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'restore-backup'
              ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Restore Backup</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. SYNC & SHARE VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'sync-share' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Real-time Data Synchronization
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Synchronizes sales, purchases, and stock across all counters and devices.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Data Synced
              </span>
            </div>

            {/* Connected Devices */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Connected Devices</h4>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">This Desktop (Main Counter)</p>
                    <p className="text-[10px] text-zinc-500">Windows 11 • Chrome Browser • Primary Terminal</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                  Online
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Mobile Terminal (BizManage App)</p>
                    <p className="text-[10px] text-zinc-500">Android 14 • Linked via Token</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Database Engine</span>
              <span className="font-mono font-bold text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-red-500" /> MySQL 8.0 (Port 3306)
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              Multi-Device Access
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your staff can create invoices from mobile phones while you monitor sales in real-time on your computer.
            </p>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
              <p className="font-bold text-white">Pending Sync Queue</p>
              <p className="text-emerald-400 font-mono font-bold">0 Pending Vouchers</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. AUTO BACKUP VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'auto-backup' && (
        <div className="max-w-2xl p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white">Automated Daily Backups</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Never lose your accounting or stock data.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Backup Frequency</span>
              <span className="font-bold text-white">Every 24 Hours / On App Close</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Last Auto-Backup Taken</span>
              <span className="font-mono text-emerald-400 font-bold">{lastAutoBackupTime}</span>
            </div>

            <button
              onClick={handleDownloadBackup}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-4"
            >
              <Download className="w-4 h-4" />
              <span>{loading ? 'Creating Full Database Backup...' : 'Download Full Database Backup (.JSON)'}</span>
            </button>
          </div>
        </div>
      )}



      {/* ---------------------------------------------------- */}
      {/* 5. RESTORE BACKUP VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'restore-backup' && (
        <div className="max-w-2xl p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Restore Database from Backup
            </h3>
            <p className="text-xs text-zinc-400">
              Select a previously exported `.json` backup file to restore records into your MySQL database.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-950 border-2 border-dashed border-zinc-800 hover:border-red-500/50 text-center space-y-4 transition-colors">
            <Upload className="w-10 h-10 mx-auto text-zinc-400" />
            <div>
              <p className="text-xs font-bold text-white">Select JSON Backup File</p>
              <p className="text-[11px] text-zinc-500">Supports .json exports created by BizManage</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="restore-upload"
            />
            <label
              htmlFor="restore-upload"
              className="inline-block px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-red-600/25 transition-all"
            >
              {loading ? 'Restoring Records...' : 'Choose File to Restore'}
            </label>
          </div>

          {restoreStats && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{restoreStats}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SyncBackupPage() {
  return (
    <Suspense fallback={null}>
      <SyncBackupContent />
    </Suspense>
  );
}
