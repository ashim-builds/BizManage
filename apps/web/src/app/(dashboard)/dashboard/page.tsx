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
  X,
  Zap,
  Users,
  CreditCard,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [txFilter, setTxFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'EXPENSE'>('ALL');
  const [isProfileBannerDismissed, setIsProfileBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('bizmanage_profile_complete_dismissed');
      if (dismissed === 'true') {
        setIsProfileBannerDismissed(true);
      }
    }
  }, []);

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
    return <LoadingState message="Loading Vyapar dashboard..." />;
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
                Select a package to unlock automated WhatsApp reminders, unlimited invoicing, and multi-user access.
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

      {/* =========================================================
          2. VYAPAR DASHBOARD HEADER & QUICK FILTERS
      ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-red-600/20">
              V
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentBiz?.name || 'Business Workspace'}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {currentBiz?.taxNumber ? `PAN/VAT: ${currentBiz.taxNumber} • ` : ''}Real-time billing, party ledger & stock summary.
          </p>
        </div>

        {/* Quick Date Presets & Custom Pickers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold shrink-0">
            <button
              onClick={() => setPresetRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'all' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPresetRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'today' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => setPresetRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'week' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPresetRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${preset === 'month' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
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
          3. VYAPAR QUICK ACTION COMMAND BAR
      ========================================================= */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/transactions/sales"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 flex items-center gap-1.5 transition-all active:scale-95"
            title="Create New Sale Invoice (F2)"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Sale (F2)</span>
          </Link>

          <Link
            href="/transactions/purchases"
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 flex items-center gap-1.5 transition-all active:scale-95"
            title="Record Purchase Bill (F3)"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase</span>
          </Link>

          <Link
            href="/transactions/payment-in"
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 font-semibold text-xs border border-zinc-800 hover:border-emerald-500/30 flex items-center gap-1.5 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Payment In</span>
          </Link>

          <Link
            href="/transactions/payment-out"
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-rose-400 font-semibold text-xs border border-zinc-800 hover:border-rose-500/30 flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Payment Out</span>
          </Link>

          <Link
            href="/transactions/pos"
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-semibold text-xs border border-zinc-800 hover:border-amber-500/30 flex items-center gap-1.5 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>POS Billing</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/inventory"
            className="px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            <span>+ Add Item</span>
          </Link>
          <Link
            href="/parties"
            className="px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>+ Add Party</span>
          </Link>
        </div>
      </div>

      {/* =========================================================
          4. VYAPAR 2 BIG HERO CARDS (RECEIVABLE & PAYABLE)
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* You'll Receive (उठाउन बाँकी) */}
        <Link
          href="/parties"
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 shadow-md flex items-center justify-between group transition-all hover:border-emerald-500/60 active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              <span>You'll Receive (उठाउन बाँकी)</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              Rs. {(metrics.toReceive || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-zinc-400">
              Outstanding payments due from customers
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
            ↓
          </div>
        </Link>

        {/* You'll Pay (तिर्न बाँकी) */}
        <Link
          href="/parties"
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-900 border border-rose-500/30 shadow-md flex items-center justify-between group transition-all hover:border-rose-500/60 active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>You'll Pay (तिर्न बाँकी)</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              Rs. {(metrics.toGive || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-zinc-400">
              Bills & credit owed to suppliers
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
            ↑
          </div>
        </Link>
      </div>

      {/* =========================================================
          5. VYAPAR LIQUIDITY & STOCK SUMMARY STRIP
      ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cash in Hand */}
        <Link
          href="/accounts"
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-white font-mono mt-1">
            Rs. {(metrics.totalCash || 0).toLocaleString()}
          </h4>
          <span className="text-[10px] text-zinc-500">Shop cash drawer balance</span>
        </Link>

        {/* Bank Balance */}
        <Link
          href="/accounts"
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Bank Accounts</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-white font-mono mt-1">
            Rs. {(metrics.totalBank || 0).toLocaleString()}
          </h4>
          <span className="text-[10px] text-zinc-500">Total liquid bank funds</span>
        </Link>

        {/* Total Stock Value */}
        <Link
          href="/inventory"
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Items in Stock</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-white font-mono mt-1">
            {(metrics.totalItemsCount || metrics.totalProductsCount || 0)} Products
          </h4>
          <span className="text-[10px] text-zinc-500">Warehouse & shop inventory</span>
        </Link>

        {/* Low Stock Alert */}
        <Link
          href="/inventory"
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-amber-400 font-mono mt-1">
            {(metrics.lowStockItems?.length || 0)} Items
          </h4>
          <span className="text-[10px] text-zinc-500">Needs immediate reorder</span>
        </Link>
      </div>

      {/* =========================================================
          6. VYAPAR PROFIT & SALES STATUS SUMMARY
      ========================================================= */}
      {(() => {
        const netProfit = metrics.netProfit ?? ((metrics.salesMargin || 0) - (metrics.totalExpenses || 0));
        const isProfit = netProfit >= 0;
        const netMarginPct = metrics.netProfitPercentage ?? ((metrics.totalSales || 0) > 0 ? (netProfit / (metrics.totalSales || 1)) * 100 : 0);
        const todayMargin = metrics.todaySummary?.salesMargin ?? 0;

        return (
          <Link
            href="/profit-loss"
            className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-sm block transition-all group hover:border-zinc-700 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {isProfit ? 'PROFIT STATUS' : 'LOSS STATUS'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Net Margin: <strong className="text-white font-mono">{netMarginPct.toFixed(1)}%</strong>
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-mono text-white">
                  Rs. {netProfit.toLocaleString()}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Total Sales</span>
                  <strong className="text-white font-mono">Rs. {(metrics.totalSales || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Gross Margin</span>
                  <strong className="text-white font-mono">Rs. {(metrics.salesMargin || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Total Expenses</span>
                  <strong className="text-rose-400 font-mono">Rs. {(metrics.totalExpenses || 0).toLocaleString()}</strong>
                </div>
                <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Today's Margin</span>
                  <strong className="text-emerald-400 font-mono">Rs. {todayMargin.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })()}

      {/* =========================================================
          7. VYAPAR RECENT TRANSACTIONS LEDGER TABLE
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Full Transaction Ledger */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Recent Transactions (लेखा खाता)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Real-time log of sales, purchases, and payments.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              {(['ALL', 'SALE', 'PURCHASE', 'PAYMENT_IN', 'PAYMENT_OUT'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${txFilter === filter
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTransactions.length ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description / Party</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredTransactions.map((tx: any) => {
                    const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
                    return (
                      <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isTxIn
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                            {tx.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-white truncate max-w-[180px]">
                          {tx.description || 'General Entry'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 truncate max-w-[100px]">
                          {tx.account?.accountName || 'Cash'}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isTxIn ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                          {isTxIn ? '+' : '-'} Rs. {Number(tx.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No transactions recorded for this filter.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800 text-right">
            <Link
              href="/cashflow"
              className="text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
            >
              <span>View Full Ledger & Cashflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Fast POS Action */}
        <div className="space-y-5">
          {/* Low Stock Widget */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Low-Stock Alerts
              </h3>
              <Link href="/inventory" className="text-xs font-semibold text-amber-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {metrics.lowStockItems && metrics.lowStockItems.length > 0 ? (
                metrics.lowStockItems.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <Link href={`/inventory/${item.id}`} className="text-xs font-bold text-white hover:text-red-400 truncate block">
                        {item.name}
                      </Link>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.code || 'SKU-N/A'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono font-bold ${Number(item.currentStock) <= 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {Number(item.currentStock)} {item.unit}
                      </span>
                      <span className="block text-[9px] text-zinc-500">Min: {Number(item.minStockAlert)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  <Box className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-white">All Stock Levels Healthy</p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">No products below reorder point.</p>
                </div>
              )}
            </div>
          </div>

          {/* Vyapar POS Fast Billing Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Fast POS Checkout</h4>
                <p className="text-[10px] text-zinc-400">Barcode scanner & thermal print</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Open the high-speed barcode checkout screen for busy counters and walk-in retail customers.
            </p>
            <Link
              href="/transactions/pos"
              className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-all flex items-center justify-center gap-2"
            >
              <span>Launch POS Screen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
