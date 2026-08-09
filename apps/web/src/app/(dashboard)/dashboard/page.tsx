'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDashboardMetrics } from '@/services/dashboardService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
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
  Clock,
  Package,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setPresetRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                preset === 'all' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPresetRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                preset === 'today' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPresetRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                preset === 'week' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPresetRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                preset === 'month' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
              title="Start Date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* TOP SUMMARY CARDS (ROW 1: TO RECEIVE, TO GIVE, SALES, PURCHASE, EXPENSE) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* TO RECEIVE */}
        <Link
          href="/parties"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To Receive</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-emerald-400 mt-2">
            Rs. {metrics.toReceive.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
            Customer Debt <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* TO GIVE */}
        <Link
          href="/parties"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To Give</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-rose-400 mt-2">
            Rs. {metrics.toGive.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-rose-400 transition-colors">
            Supplier Payable <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* TOTAL SALES */}
        <Link
          href="/transactions/sales"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mt-2">
            Rs. {metrics.totalSales.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">{metrics.salesCount} Invoices Billed</p>
        </Link>

        {/* TOTAL PURCHASES */}
        <Link
          href="/transactions/purchases"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mt-2">
            Rs. {metrics.totalPurchases.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">{metrics.purchasesCount} Restock Bills</p>
        </Link>

        {/* TOTAL EXPENSES */}
        <Link
          href="/expenses"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Expense</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-rose-400 mt-2">
            Rs. {metrics.totalExpenses.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Operational Spend</p>
        </Link>
      </div>

      {/* LIQUIDITY & INVENTORY CARDS (ROW 2: CASH, BANK, LIQUIDITY, PRODUCTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash in Hand</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {metrics.totalCash.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Physical Register Cash</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Balance</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">
              Rs. {metrics.totalBank.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Institutional Bank Accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Liquidity</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {metrics.totalCashAndBank.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Total Available Cash + Bank</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <Link
          href="/inventory"
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Products</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">
              {metrics.totalProductsCount || metrics.totalItemsCount || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
              {metrics.totalItemsCount || 0} Items in Inventory <ArrowRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Package className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* TWO COLUMN GRID: RECENT TRANSACTIONS & LOW STOCK ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT TRANSACTIONS (2 COLS) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Recent Transactions Audit Feed
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest financial entries logged in real-time.</p>
            </div>
            <Link
              href="/cashflow"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Full Cashflow <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentTransactions.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-7 h-7 text-slate-500" />}
              title="No Recent Transactions"
              description="Create a sale invoice or purchase bill to populate the transaction feed."
            />
          ) : (
            <div className="divide-y divide-slate-800/60">
              {metrics.recentTransactions.map((txn: any) => {
                const amt = Number(txn.amount || 0);
                const isIncoming =
                  txn.category === 'SALE' ||
                  txn.category === 'PAYMENT_IN' ||
                  txn.category === 'INCOME' ||
                  txn.category === 'PURCHASE_RETURN';

                return (
                  <div key={txn.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isIncoming
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isIncoming ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{txn.description || txn.category}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                            {txn.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {new Date(txn.date).toLocaleDateString()} • {txn.account?.accountName || 'Cash Account'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold">
                      <span className={isIncoming ? 'text-emerald-400' : 'text-rose-400'}>
                        {isIncoming ? '+' : '-'} Rs. {amt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* LOW STOCK ALERTS WIDGET (1 COL) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Low-Stock Alerts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Products requiring immediate restock.</p>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.lowStockItems.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <Package className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">All Stock Levels Healthy</p>
              <p className="text-[11px] text-slate-500 mt-1">No items are below minimum threshold.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.lowStockItems.map((item: any) => {
                const stock = Number(item.currentStock || 0);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Code: {item.code || 'N/A'} • Threshold: {item.minStockAlert} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        {stock} {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
