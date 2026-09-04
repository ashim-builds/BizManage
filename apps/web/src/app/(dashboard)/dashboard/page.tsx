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
  ArrowRight,
  ChevronRight,
  Clock,
  Package,
  Boxes,
  Users,
  FileText,
  ArrowLeftRight,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Banknote,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

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

  const netProfit = metrics.netProfit ?? ((metrics.salesMargin || 0) - (metrics.totalExpenses || 0));
  const isProfit = netProfit >= 0;
  const netMarginPct = metrics.netProfitPercentage ?? ((metrics.totalSales || 0) > 0 ? (netProfit / (metrics.totalSales || 1)) * 100 : 0);
  const todayMargin = metrics.todaySummary?.salesMargin ?? 0;
  const recentTxList = metrics.recentTransactions || [];
  const lowStockList = metrics.lowStockItems || [];

  return (
    <div className="space-y-4 sm:space-y-5 font-sans text-slate-900 pb-16">
      {/* 1. Dismissible Notice Banner */}
      <GuideNoticeModal />

      {/* 2. STORE / BUSINESS PROFILE HEADER CARD */}
      <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 flex items-center justify-center font-bold text-slate-800 text-sm shrink-0">
          {(currentBiz?.name || 'R').substring(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
            {currentBiz?.name || 'My Business Workspace'}
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            {currentBiz?.taxNumber ? `PAN/VAT: ${currentBiz.taxNumber}` : 'PAN/VAT: Not configured'}
          </p>
        </div>
      </div>

      {/* 3. TIME RANGE FILTER PILLS STRIP (Responsive Wrap - No Scroll) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-[11px] sm:text-xs">
          <button
            onClick={() => setPresetRange('all')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              preset === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setPresetRange('today')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              preset === 'today' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPresetRange('week')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              preset === 'week' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPresetRange('month')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              preset === 'month' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
        </div>

        <div className="shrink-0">
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

      {/* 4. TWO MAIN SUMMARY CARDS (RECEIVABLE & PAYABLE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Total Receivable (Green Inflow) */}
        <Link
          href="/parties"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs flex items-center justify-between group transition-all hover:border-emerald-400 active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              TOTAL RECEIVABLE <span className="text-[10px] font-normal text-emerald-600">(उठाउन बाँकी)</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {(metrics.toReceive || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              {metrics.toReceive ? 'Outstanding payments due from customers' : "You don't have any receivables as of now."}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shrink-0">
            ↓
          </div>
        </Link>

        {/* Total Payable (Red Outflow) */}
        <Link
          href="/parties"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200/90 shadow-2xs flex items-center justify-between group transition-all hover:border-rose-400 active:scale-[0.99] cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              TOTAL PAYABLE <span className="text-[10px] font-normal text-rose-600">(तिर्न बाँकी)</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {(metrics.toGive || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              {metrics.toGive ? 'Bills & credit owed to suppliers' : 'Bills & credit owed to suppliers'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shrink-0">
            ↑
          </div>
        </Link>
      </div>

      {/* 5. 2x2 LIQUIDITY & STOCK OVERVIEW GRID */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Cash in Hand */}
        <Link
          href="/accounts"
          className="p-3.5 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">CASH IN HAND</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1 tracking-tight">
            Rs. {(metrics.totalCash || 0).toLocaleString()}
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">Shop cash drawer balance</span>
          </div>
        </Link>

        {/* Bank Accounts */}
        <Link
          href="/accounts"
          className="p-3.5 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">BANK ACCOUNTS</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1 tracking-tight">
            Rs. {(metrics.totalBank || 0).toLocaleString()}
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">Total liquid bank funds</span>
          </div>
        </Link>

        {/* Total in Stock */}
        <Link
          href="/inventory"
          className="p-3.5 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">TOTAL IN STOCK</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1 tracking-tight">
            {(metrics.totalItemsCount || metrics.totalProductsCount || 0)} Products
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">Warehouse & shop stock</span>
          </div>
        </Link>

        {/* Low Stock Items */}
        <Link
          href="/inventory?filter=low_stock"
          className="p-3.5 sm:p-4.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs hover:border-amber-400 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-amber-900 uppercase tracking-wider">LOW STOCK ITEMS</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <h4 className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {(lowStockList.length || 0)} Items
            </h4>
            {lowStockList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Action
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-800/80 font-medium truncate">Needs immediate reorder</span>
          </div>
        </Link>
      </div>

      {/* 6. PROFIT STATUS & MARGINS CARD */}
      <Link
        href="/profit-loss"
        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs block transition-all group hover:border-slate-400 cursor-pointer"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  isProfit
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {isProfit ? 'PROFIT STATUS' : 'LOSS STATUS'}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                Net Margin: <strong className="text-slate-900 font-mono">{netMarginPct.toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            Rs. {netProfit.toLocaleString()}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">TOTAL SALES</span>
              <strong className="text-slate-900 font-mono">Rs. {(metrics.totalSales || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">GROSS MARGIN</span>
              <strong className="text-slate-900 font-mono">Rs. {(metrics.salesMargin || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">TOTAL EXPENSES</span>
              <strong className="text-slate-900 font-mono">Rs. {(metrics.totalExpenses || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">TODAY'S MARGIN</span>
              <strong className="text-slate-900 font-mono">Rs. {todayMargin.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </Link>

      {/* 7. MOST USED REPORTS (4-CARD GRID MATCHING MOCKUP) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">MOST USED REPORTS</h4>
          <Link href="/reports" className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-0.5">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/reports"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Sale Report</span>
          </Link>

          <Link
            href="/transactions"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">All Transactions</span>
          </Link>

          <Link
            href="/reports"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Daybook Report</span>
          </Link>

          <Link
            href="/reports?tab=party-balance"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Party Statement</span>
          </Link>
        </div>
      </div>

      {/* 8. RECENT TRANSACTIONS LIST (MATCHING MOCKUP) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">RECENT TRANSACTIONS</h4>
          <Link href="/transactions" className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-0.5">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentTxList.length > 0 ? (
            recentTxList.slice(0, 5).map((tx: any) => {
              const isTxIn = tx.category === 'SALE' || tx.category === 'PAYMENT_IN' || tx.category === 'INCOME';
              const formattedDate = new Date(tx.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
              const formattedTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {tx.description || `Transaction ${tx.referenceNumber || ''}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[100px]">
                          {tx.account?.accountName || 'Cash In Hand'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs sm:text-sm font-mono font-bold ${isTxIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isTxIn ? '+' : '-'} Rs. {Number(tx.amount || 0).toLocaleString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/90 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">No Transactions to show</p>
              <p className="text-[11px] text-slate-400">You haven't added any transactions yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* 9. LOW STOCK ALERTS LIST (MATCHING MOCKUP) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">LOW STOCK ALERTS</h4>
          <Link href="/inventory?filter=low_stock" className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-0.5">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {lowStockList.length > 0 ? (
            lowStockList.slice(0, 5).map((item: any) => {
              const stock = Number(item.currentStock || 0);
              const isZero = stock <= 0;

              return (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold text-xs">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>{item.code || 'SKU-N/A'}</span>
                        <span>•</span>
                        <span className={isZero ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                          {isZero ? 'Out of Stock' : `Min: ${Number(item.minStockAlert || 1)}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        isZero
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {stock} {item.unit || 'Pcs'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-800">All Stock Levels Healthy</p>
              <p className="text-[11px] text-slate-400">No items currently below minimum stock threshold.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
