'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboardMetrics } from '@/services/dashboardService';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { GuideNoticeModal } from '@/components/dashboard/GuideNoticeModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  DollarSign,
  Plus,
  ArrowRight,
  ChevronRight,
  Clock,
  Package,
  Crown,
  CheckCircle2,
  Sparkles,
  Printer,
  Box,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

  const currentBiz = user?.memberships?.[0]?.business;
  const selectedPlan = currentBiz?.subscriptionPackage;

  let profileCompletionPercent = 0;
  if (currentBiz) {
    let fields = 0;
    if (currentBiz.name) fields++;
    if (currentBiz.phone) fields++;
    if (currentBiz.address) fields++;
    if (currentBiz.taxNumber) fields++;
    profileCompletionPercent = Math.round((fields / 4) * 100);
  }

  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  if (isLoading) {
    return <LoadingState message="Loading business executive dashboard..." />;
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

  return (
    <div className="space-y-6 font-sans">
      {/* 1. DISMISSIBLE USER GUIDE NOTICE BANNER */}
      <GuideNoticeModal />

      {/* Subscription Lock / Action Warning */}
      {!selectedPlan && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-white">Subscription Selection Required</p>
              <p className="text-xs text-amber-200/90 mt-0.5">
                You have not selected a plan yet. Please select a plan (Free Starter, Pro, or Enterprise) to activate full BMS feature access.
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shrink-0 shadow-md"
          >
            Select Plan Now →
          </Link>
        </div>
      )}

      {/* Main Executive Dashboard Layout */}
      <div className="space-y-8">
        {/* Header & Date Range Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Executive Dashboard <TrendingUp className="w-6 h-6 text-blue-400" />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time business health, party balance ledger, cashflow liquidity, and sales metrics.
            </p>
          </div>

            {/* Quick Date Presets & Custom Pickers */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar w-full">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold shrink-0">
                <button
                  onClick={() => setPresetRange('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'all' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setPresetRange('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'today' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPresetRange('week')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'week' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setPresetRange('month')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'month' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
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

          {/* KPI Cards - Clean Mobile Layout Style */}

          {/* Top 2 Primary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-3 sm:mb-5">
            {/* To Receive */}
            <Link href="/parties" className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-md flex flex-row items-center justify-between group cursor-pointer transition-all hover:bg-emerald-500/20 hover:scale-[1.01] active:scale-[0.99]">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono">
                  Rs. {(metrics.toReceive || 0).toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-emerald-500">
                  <span>To Receive</span>
                  <ArrowDownLeft className="w-3 h-3" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
            </Link>

            {/* To Give */}
            <Link href="/parties" className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-md flex flex-row items-center justify-between group cursor-pointer transition-all hover:bg-rose-500/20 hover:scale-[1.01] active:scale-[0.99]">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-rose-400 font-mono">
                  Rs. {(metrics.toGive || 0).toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-rose-500">
                  <span>To Give</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-500/40 group-hover:text-rose-500 transition-colors" />
            </Link>
          </div>

          {/* NET PROFIT / LOSS STATUS CARD */}
          {(() => {
            const netProfit = metrics.netProfit ?? ((metrics.salesMargin || 0) - (metrics.totalExpenses || 0));
            const isProfit = netProfit >= 0;
            const netMarginPct = metrics.netProfitPercentage ?? ((metrics.totalSales || 0) > 0 ? (netProfit / (metrics.totalSales || 1)) * 100 : 0);
            const todayMargin = metrics.todaySummary?.salesMargin ?? 0;

            return (
              <Link
                href="/profit-loss"
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900 border shadow-sm block transition-all group hover:bg-slate-800/80 active:scale-[0.99] cursor-pointer ${
                  isProfit ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                      isProfit
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {isProfit ? '📈 We Are In Profit' : '📉 We Are In Loss'}
                  </span>

                  <span className="text-xs text-slate-400 shrink-0">
                    Net Margin: <strong className={`font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>{netMarginPct.toFixed(1)}%</strong>
                  </span>
                </div>

                {/* Amount & Subtitle */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h3
                    className={`text-2xl sm:text-3xl font-black font-mono whitespace-nowrap tracking-tight ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Rs. {netProfit.toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-400">
                    (Sales Margin: Rs. {(metrics.salesMargin || 0).toLocaleString()} • Expenses: Rs. {(metrics.totalExpenses || 0).toLocaleString()})
                  </p>
                </div>

                {/* Footer Action */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Today's Margin: <strong className="text-white font-mono">Rs. {todayMargin.toLocaleString()}</strong>
                  </span>
                  <span className="font-bold text-blue-400 group-hover:text-blue-300 inline-flex items-center gap-1">
                    View Full P&L Statement <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })()}

          {/* Secondary KPI Cards Grid (Clean Mobile Responsive 2-Col / 5-Col Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Sales (Total) */}
            <Link href="/transactions/sales" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all group active:scale-[0.98]">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white font-mono whitespace-nowrap">
                  Rs. {(metrics.totalSales || 0).toLocaleString()}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Sales (Total)</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block group-hover:text-slate-400 transition-colors" />
            </Link>

            {/* Sales Margin */}
            <Link href="/profit-loss" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all group active:scale-[0.98]">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-teal-400 font-mono whitespace-nowrap">
                  Rs. {(metrics.salesMargin || 0).toLocaleString()}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-teal-400/90 mt-1">
                  Sales Margin ({(metrics.salesMarginPercentage || 0).toFixed(0)}%)
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block group-hover:text-slate-400 transition-colors" />
            </Link>

            {/* Purchases */}
            <Link href="/transactions/purchases" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all group active:scale-[0.98]">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white font-mono whitespace-nowrap">
                  Rs. {(metrics.totalPurchases || 0).toLocaleString()}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Purchase (Total)</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block group-hover:text-slate-400 transition-colors" />
            </Link>

            {/* Expense */}
            <Link href="/expenses" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all group active:scale-[0.98]">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white font-mono whitespace-nowrap">
                  Rs. {(metrics.totalExpenses || 0).toLocaleString()}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Expense (Total)</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block group-hover:text-slate-400 transition-colors" />
            </Link>

            {/* Cash & Bank */}
            <Link href="/accounts" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all group active:scale-[0.98] col-span-2 lg:col-span-1">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white font-mono whitespace-nowrap">
                  Rs. {((metrics.totalCash || 0) + (metrics.totalBank || 0)).toLocaleString()}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Total Balance</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block group-hover:text-slate-400 transition-colors" />
            </Link>
          </div>

          {/* Quick Actions (Mobile Mockup Style) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-5 lg:hidden">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true }))}
              className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <div className="text-emerald-400">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[13px] sm:text-sm font-semibold text-white">Quick Entry</span>
            </button>
            <Link
              href="/reports"
              className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <div className="text-emerald-400">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[13px] sm:text-sm font-semibold text-white">View Reports</span>
            </Link>
          </div>

          {/* Complete Profile Banner (Mobile Mockup Style) */}
          <Link href="/settings" className={`block mb-6 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between text-white relative overflow-hidden group hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer z-10 ${profileCompletionPercent >= 100 ? 'bg-emerald-600' : 'bg-[#00A86B]'}`}>
            <div className="relative z-20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-[3px] border-white/30 flex items-center justify-center shrink-0 bg-black/10">
                <span className="text-xs font-bold text-white">{profileCompletionPercent}%</span>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
                  {profileCompletionPercent >= 100 ? 'Business Profile Complete' : 'Complete your Profile'} <ArrowRight className="w-4 h-4" />
                </h3>
                <p className="text-[11px] sm:text-xs text-white/90 mt-1 max-w-[220px] sm:max-w-none">
                  {profileCompletionPercent >= 100
                    ? 'Your profile is fully set up. Click to view or edit.'
                    : 'You can use more app features after completing your business profile.'}
                </p>
              </div>
            </div>
          </Link>

          {/* Row 3 - Audit Feed & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent Transactions Audit Feed */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" /> Recent Transactions Audit Feed
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Latest financial entries logged in real-time.</p>
                </div>
                <Link
                  href="/transactions"
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 sm:mt-0"
                >
                  Full Cashflow <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-4 flex-1">
                {metrics.recentTransactions?.length ? (
                  metrics.recentTransactions.map((tx: any) => {
                    const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
                    return (
                      <div key={tx.id} className="flex items-start sm:items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                        <div className="flex items-start sm:items-center gap-3 w-full max-w-[65%] sm:max-w-none">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${isTxIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                            {isTxIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{tx.description || 'Transaction'}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {new Date(tx.date).toLocaleDateString()} • {tx.account?.accountName || 'Account'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold font-mono shrink-0 ${isTxIn ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                          {isTxIn ? '+' : '-'} Rs. {Number(tx.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                    No recent transactions found.
                  </div>
                )}
              </div>
            </div>

            {/* Low-Stock Alerts */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Low-Stock Alerts
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Products requiring immediate restock.</p>
                </div>
                <Link
                  href="/inventory"
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 mt-2 sm:mt-0"
                >
                  Inventory <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl bg-slate-950/50 border border-slate-800 text-center overflow-y-auto max-h-[300px]">
                {metrics.lowStockItems && metrics.lowStockItems.length > 0 ? (
                  <div className="w-full space-y-3">
                    {metrics.lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-left min-w-0 flex-1">
                          <Link href={`/inventory/${item.id}`} className="text-sm font-bold text-blue-400 hover:text-blue-300 truncate block">
                            {item.name}
                          </Link>
                          {item.code && <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{item.code}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className={`font-bold text-sm ${Number(item.currentStock) <= 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                            {Number(item.currentStock)} {item.unit}
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase mt-0.5">Min: {Number(item.minStockAlert)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Box className="w-8 h-8 text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-white">All Stock Levels Healthy</p>
                    <p className="text-xs text-slate-400 mt-1">No items are below minimum threshold.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
