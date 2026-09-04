'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDashboardMetrics } from '@/services/dashboardService';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { GuideNoticeModal } from '@/components/dashboard/GuideNoticeModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import {
  Wallet,
  Building2,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowRight,
  ChevronRight,
  Clock,
  Package,
  Box,
  Zap,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Users,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [txFilter, setTxFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'EXPENSE'>('ALL');

  const currentBiz = user?.memberships?.[0]?.business;

  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (isError || !metrics) {
    return <ErrorState title="Failed to load dashboard metrics" onRetry={refetch} />;
  }

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

  // Filter recent transactions by category
  const filteredTransactions = (metrics.recentTransactions || []).filter((tx: any) => {
    if (txFilter === 'ALL') return true;
    return tx.category === txFilter;
  });

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* 1. Dismissible Notice Banner */}
      <GuideNoticeModal />

      {/* =========================================================
          2. HEADER & QUICK FILTERS (Simple Black & White)
      ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {(currentBiz?.name || 'B').substring(0, 1).toUpperCase()}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentBiz?.name || 'Business Workspace'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentBiz?.taxNumber ? `PAN/VAT: ${currentBiz.taxNumber}` : ''}
          </p>
        </div>

        {/* Quick Date Presets & Custom Pickers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold shrink-0 shadow-xs">
            <button
              onClick={() => setPresetRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                preset === 'all' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPresetRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                preset === 'today' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPresetRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                preset === 'week' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPresetRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                preset === 'month' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CustomDateRangePicker
              startDate={startDate}
              endDate={endDate}
              preset={preset}
              onApply={(s, e, p) => {
                if (p === 'custom') {
                  setStartDate(s);
                  setEndDate(e);
                  setPreset('custom');
                } else {
                  setPresetRange(p as any);
                }
              }}
            />
          </div>
        </div>
      </div>


      {/* =========================================================
          4. 2 MAIN SUMMARY CARDS (RECEIVABLE & PAYABLE WITH COLOR)
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Receivable (Green Inflow) */}
        <Link
          href="/parties"
          className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group transition-all hover:border-emerald-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Total Receivable (उठाउन बाँकी)
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {(metrics.toReceive || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400">
              {metrics.toReceive ? 'Outstanding payments due from customers' : "You don't have any receivables as of now."}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0 shadow-xs">
            ↓
          </div>
        </Link>

        {/* Total Payable (Red Outflow) */}
        <Link
          href="/parties"
          className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group transition-all hover:border-rose-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Total Payable (तिर्न बाँकी)
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {(metrics.toGive || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400">
              {metrics.toGive ? 'Bills & credit owed to suppliers' : "You don't have any payables as of now."}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0 shadow-xs">
            ↑
          </div>
        </Link>
      </div>

      {/* =========================================================
          5. LIQUIDITY & STOCK SUMMARY STRIP (Color Accents & Rich Badges)
      ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cash in Hand (Emerald Liquidity) */}
        <Link
          href="/accounts"
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cash in Hand</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 group-hover:bg-emerald-100 transition-all shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1.5 tracking-tight">
            Rs. {(metrics.totalCash || 0).toLocaleString()}
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] text-slate-500 truncate">Shop cash drawer balance</span>
          </div>
        </Link>

        {/* Bank Balance (Blue Treasury) */}
        <Link
          href="/accounts"
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bank Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-100 transition-all shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1.5 tracking-tight">
            Rs. {(metrics.totalBank || 0).toLocaleString()}
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[11px] text-slate-500 truncate">Total liquid bank funds</span>
          </div>
        </Link>

        {/* Total Stock (Indigo Inventory) */}
        <Link
          href="/inventory"
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total in Stock</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-100 transition-all shadow-2xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1.5 tracking-tight">
            {(metrics.totalItemsCount || metrics.totalProductsCount || 0)} Products
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-[11px] text-slate-500 truncate">Warehouse & shop stock</span>
          </div>
        </Link>

        {/* Low Stock Alert (Amber Alert) */}
        <Link
          href="/inventory?filter=low_stock"
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-amber-200/90 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Low Stock Items</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 group-hover:bg-amber-100 transition-all shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <h4 className="text-xl sm:text-2xl font-black text-amber-950 font-mono tracking-tight">
              {(metrics.lowStockItems?.length || 0)} Items
            </h4>
            {(metrics.lowStockItems?.length || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Action
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-[11px] text-amber-800/80 font-medium truncate">Needs immediate reorder</span>
          </div>
        </Link>
      </div>

      {/* =========================================================
          6. PROFIT & SALES STATUS SUMMARY
      ========================================================= */}
      {(() => {
        const netProfit = metrics.netProfit ?? ((metrics.salesMargin || 0) - (metrics.totalExpenses || 0));
        const isProfit = netProfit >= 0;
        const netMarginPct = metrics.netProfitPercentage ?? ((metrics.totalSales || 0) > 0 ? (netProfit / (metrics.totalSales || 1)) * 100 : 0);
        const todayMargin = metrics.todaySummary?.salesMargin ?? 0;

        return (
          <Link
            href="/profit-loss"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs block transition-all group hover:border-slate-400 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      isProfit
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {isProfit ? 'PROFIT STATUS' : 'LOSS STATUS'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Net Margin: <strong className="text-slate-900 font-mono">{netMarginPct.toFixed(1)}%</strong>
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                  Rs. {netProfit.toLocaleString()}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">Total Sales</span>
                  <strong className="text-slate-900 font-mono">Rs. {(metrics.totalSales || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">Gross Margin</span>
                  <strong className="text-slate-900 font-mono">Rs. {(metrics.salesMargin || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">Total Expenses</span>
                  <strong className="text-slate-900 font-mono">Rs. {(metrics.totalExpenses || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">Today's Margin</span>
                  <strong className="text-slate-900 font-mono">Rs. {todayMargin.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })()}


      {/* =========================================================
          8. MOST USED REPORTS (Simple Clean Buttons)
      ========================================================= */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Most Used Reports</h4>
          <Link href="/reports" className="text-xs font-semibold text-slate-900 hover:underline">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/reports"
            className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-between group transition-all"
          >
            <span className="text-xs font-semibold text-slate-900">Sale Report</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>

          <Link
            href="/transactions"
            className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-between group transition-all"
          >
            <span className="text-xs font-semibold text-slate-900">All Transactions</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>

          <Link
            href="/reports"
            className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-between group transition-all"
          >
            <span className="text-xs font-semibold text-slate-900">Daybook Report</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>

          <Link
            href="/reports?tab=party-balance"
            className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-between group transition-all"
          >
            <span className="text-xs font-semibold text-slate-900">Party Statement</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>
        </div>
      </div>

      {/* =========================================================
          9. RECENT TRANSACTIONS LEDGER TABLE (Simple Clean Rows)
      ========================================================= */}
      {/* =========================================================
          9. RECENT TRANSACTIONS LEDGER TABLE (Color-Coded In/Out)
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Transaction Ledger */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500">Audit log of sales, purchases, and payments.</p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
              {(['ALL', 'SALE', 'PURCHASE', 'PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'] as const).map((filterVal) => {
                const isActive = txFilter === filterVal;
                return (
                  <button
                    key={filterVal}
                    onClick={() => setTxFilter(filterVal)}
                    className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                      isActive
                        ? filterVal === 'SALE' || filterVal === 'PAYMENT_IN'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : filterVal === 'PURCHASE'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : filterVal === 'PAYMENT_OUT' || filterVal === 'EXPENSE'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {filterVal === 'ALL'
                      ? 'All'
                      : filterVal === 'SALE'
                      ? 'Sales'
                      : filterVal === 'PURCHASE'
                      ? 'Purchases'
                      : filterVal === 'PAYMENT_IN'
                      ? 'In'
                      : filterVal === 'PAYMENT_OUT'
                      ? 'Out'
                      : 'Expenses'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTransactions.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ref #</th>
                    <th className="py-2.5 px-3">Particulars</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx: any) => {
                    const isTxIn = tx.category === 'SALE' || tx.category === 'PAYMENT_IN' || tx.category === 'INCOME';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          {tx.referenceNumber || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 truncate max-w-[180px]">
                          {tx.description || 'General Entry'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-medium inline-block truncate max-w-[110px]">
                            {tx.account?.accountName || 'Cash In Hand'}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isTxIn ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          <span className={`inline-block px-1.5 py-0.5 rounded ${isTxIn ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            {isTxIn ? '+' : '-'} Rs. {Number(tx.amount || 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No transactions recorded for this filter.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 text-right">
            <Link
              href="/cashflow"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts Widget */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Low Stock Alerts
                  </h3>
                </div>
              </div>
              <Link href="/inventory?filter=low_stock" className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {metrics.lowStockItems && metrics.lowStockItems.length > 0 ? (
                metrics.lowStockItems.map((item: any) => {
                  const stock = Number(item.currentStock || 0);
                  const isZero = stock <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isZero
                          ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                          : 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <Link href={`/inventory/${item.id}`} className="text-xs font-bold text-slate-900 hover:underline truncate block">
                          {item.name}
                        </Link>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{item.code || 'SKU-N/A'}</span>
                          <span>•</span>
                          <span className={isZero ? 'text-rose-600 font-semibold' : 'text-amber-700 font-semibold'}>
                            {isZero ? 'Out of Stock' : `Min: ${Number(item.minStockAlert || 0)}`}
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                            isZero
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {stock} {item.unit || 'Pcs'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Box className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Stock Levels Healthy</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">No products below reorder point.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
