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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sync, Share &amp; Backup (डाटा सिंक र ब्याकअप)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time cross-device sync, automated local backups, and complete database disaster recovery.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleDownloadBackup}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{loading ? 'Exporting...' : 'Backup Now'}</span>
        </button>
      </div>

      {/* Submenu Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => handleTabChange('sync-share')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sync-share'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync &amp; Share</span>
        </button>

        <button
          onClick={() => handleTabChange('auto-backup')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'auto-backup'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Auto Backup</span>
        </button>

        <button
          onClick={() => handleTabChange('restore-backup')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'restore-backup'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  Real-time Data Synchronization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronizes sales, purchases, and stock across all counters and devices.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Data Synced
              </span>
            </div>

            {/* Connected Devices */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Connected Devices</h4>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">This Desktop (Main Counter)</p>
                    <p className="text-[10px] text-slate-500">Windows 11 • Web Browser • Primary Terminal</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Online
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Mobile Terminal (BizManage App)</p>
                    <p className="text-[10px] text-slate-500">Android / iOS • Linked via Session</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Database Engine</span>
              <span className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" /> PostgreSQL / MySQL 8.0
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Multi-Device Access
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your staff can create invoices from mobile phones while you monitor sales in real-time on your computer.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <p className="font-bold text-slate-900">Pending Sync Queue</p>
              <p className="text-emerald-700 font-mono font-bold">0 Pending Vouchers</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. AUTO BACKUP VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'auto-backup' && (
        <div className="max-w-2xl p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Automated Daily Backups</h3>
              <p className="text-xs text-slate-500 mt-0.5">Never lose your accounting or stock data.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Backup Frequency</span>
              <span className="font-bold text-slate-900">Every 24 Hours / On App Close</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Last Auto-Backup Taken</span>
              <span className="font-mono text-emerald-700 font-bold">{lastAutoBackupTime}</span>
            </div>

            <button
              onClick={handleDownloadBackup}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-4 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>{loading ? 'Creating Full Database Backup...' : 'Download Full Database Backup (.JSON)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. RESTORE BACKUP VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'restore-backup' && (
        <div className="max-w-2xl p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Restore Database from Backup
            </h3>
            <p className="text-xs text-slate-500">
              Select a previously exported `.json` backup file to restore records into your database.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-500 text-center space-y-4 transition-colors">
            <Upload className="w-10 h-10 mx-auto text-slate-400" />
            <div>
              <p className="text-xs font-bold text-slate-800">Select JSON Backup File</p>
              <p className="text-[11px] text-slate-500">Supports .json exports created by BizManage</p>
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
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20 transition-all min-h-[44px] leading-6"
            >
              {loading ? 'Restoring Records...' : 'Choose File to Restore'}
            </label>
          </div>

          {restoreStats && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
