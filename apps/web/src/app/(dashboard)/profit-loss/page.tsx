'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDashboardMetrics } from '@/services/dashboardService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ProfitLossSection } from '@/components/dashboard/ProfitLossSection';
import {
  Scale,
  ArrowLeft,
  Printer,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useDashboardMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const setPresetRange = (p: 'today' | 'week' | 'month' | 'all') => {
    setPreset(p);
    const now = new Date();
    if (p === 'today') {
      const todayStr = now.toISOString().split('T')[0] || '';
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === 'week') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0] || '');
      setEndDate(now.toISOString().split('T')[0] || '');
    } else if (p === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0] || '');
      setEndDate(now.toISOString().split('T')[0] || '');
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <LoadingState message="Calculating Profit & Loss statement..." />;
  }

  if (isError || !metrics) {
    return <ErrorState title="Failed to load Profit & Loss data" onRetry={refetch} />;
  }

  const isProfitable = (metrics.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-8 font-sans">
      {/* Top Header (Clean Mobile Responsive) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-black-500">Profit & Loss Statement</h1>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${
                  isProfitable
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {isProfitable ? 'In Profit' : 'In Loss'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Sales Revenue, Cost of Goods Sold (COGS), Procurement, and Operational Net Earnings.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-all"
          >
            All Reports
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            Print / Export
          </button>
        </div>
      </div>

      {/* Main Profit & Loss Interactive Component */}
      <ProfitLossSection
        metrics={metrics}
        startDate={startDate}
        endDate={endDate}
        preset={preset}
        onPresetChange={setPresetRange}
        onCustomDateChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setPreset('custom');
        }}
      />
    </div>
  );
}
