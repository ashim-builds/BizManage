'use client';

import { useState } from 'react';
import {
  useCashflowSummary,
  useDailyCashflow,
  useMonthlyCashflow,
  useCashflowAccounts,
} from '@/services/cashflowService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Building2,
  Calendar,
  Layers,
  PieChart,
} from 'lucide-react';

export default function CashflowPage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Queries
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch } = useCashflowSummary();
  const { data: dailyData, isLoading: dailyLoading } = useDailyCashflow();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyCashflow();
  const { data: accounts, isLoading: accountsLoading } = useCashflowAccounts();

  if (summaryLoading || dailyLoading || monthlyLoading || accountsLoading) {
    return <LoadingState message="Calculating real-time cashflow metrics..." />;
  }

  if (summaryError) {
    return <ErrorState title="Failed to load cashflow analytics" onRetry={refetch} />;
  }

  const activeData = viewMode === 'daily' ? dailyData || [] : monthlyData || [];
  const maxAmount = Math.max(
    1,
    ...activeData.map((d: any) => Math.max(d.moneyIn || 0, d.moneyOut || 0))
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Cashflow Analytics <TrendingUp className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time money in vs. money out derived directly from actual business transactions and account ledgers.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Daily (Last 7 Days)
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Monthly (Last 12 Months)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Liquidity</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {(summary?.totalLiquidity || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{summary?.accountsCount || 0} Cash & Bank Accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Money In</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-5 h-5" /> Rs. {(summary?.totalMoneyIn || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Sales, Payment In, Other Income</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Money Out</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-5 h-5" /> Rs. {(summary?.totalMoneyOut || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Purchases, Payment Out, Expenses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Cash Movement</p>
            <h3
              className={`text-2xl font-bold mt-1 ${
                (summary?.netCashflow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(summary?.netCashflow || 0) >= 0 ? '+' : ''} Rs. {(summary?.netCashflow || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {(summary?.netCashflow || 0) >= 0 ? 'Positive Surplus' : 'Net Cash Deficit'}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              (summary?.netCashflow || 0) >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <PieChart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {viewMode === 'daily' ? 'Daily Cashflow (Last 7 Days)' : 'Monthly Cashflow (Last 12 Months)'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of cash inflow vs. outflow per time period.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Money In
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Money Out
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {activeData.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="w-7 h-7 text-slate-500" />}
            title="No Transaction Data"
            description="Perform sales, purchases, payments, or expense entries to populate cashflow trends."
          />
        ) : (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-7 md:grid-cols-12 gap-3 items-end h-64 px-4 pb-4 border-b border-slate-800/80">
              {activeData.map((item: any, idx: number) => {
                const label = item.date ? item.date.slice(5) : item.month;
                const inHeight = Math.max(8, Math.round((item.moneyIn / maxAmount) * 100));
                const outHeight = Math.max(8, Math.round((item.moneyOut / maxAmount) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-48">
                      {/* Money In Bar */}
                      <div
                        style={{ height: `${inHeight}%` }}
                        className="w-1/2 max-w-[14px] bg-emerald-500 rounded-t-sm hover:bg-emerald-400 transition-all relative"
                        title={`Money In: Rs. ${item.moneyIn.toLocaleString()}`}
                      />
                      {/* Money Out Bar */}
                      <div
                        style={{ height: `${outHeight}%` }}
                        className="w-1/2 max-w-[14px] bg-rose-500 rounded-t-sm hover:bg-rose-400 transition-all relative"
                        title={`Money Out: Rs. ${item.moneyOut.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Table Mobile Card Layout */}
            <div className="grid gap-3 md:hidden">
              {activeData.map((row: any, idx: number) => {
                const label = row.date || row.month;
                const isPositive = row.net >= 0;

                return (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="font-semibold text-white text-sm">{label}</span>
                      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''} Rs. {row.net.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono mt-1">
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-0.5">Money In</span>
                        <span className="text-emerald-400 font-bold">+ Rs. {row.moneyIn.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-slate-500 mb-0.5">Money Out</span>
                        <span className="text-rose-400 font-bold">- Rs. {row.moneyOut.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Table Desktop Layout */}
            <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden mt-6">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Period ({viewMode === 'daily' ? 'Date' : 'Month'})</th>
                    <th className="px-6 py-3.5 text-right">Money In</th>
                    <th className="px-6 py-3.5 text-right">Money Out</th>
                    <th className="px-6 py-3.5 text-right">Net Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {activeData.map((row: any, idx: number) => {
                    const label = row.date || row.month;
                    const isPositive = row.net >= 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-white">{label}</td>
                        <td className="px-6 py-3.5 text-right text-emerald-400 font-bold">
                          + Rs. {row.moneyIn.toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right text-rose-400 font-bold">
                          - Rs. {row.moneyOut.toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-3.5 text-right font-bold ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''} Rs. {row.net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Cash & Bank Accounts Liquidity Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" /> Account Liquidity Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time balances across all registered cash and bank accounts.</p>
          </div>
        </div>

        {accounts?.length === 0 ? (
          <p className="text-xs text-slate-500">No active bank accounts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts?.map((acc: any) => {
              const bal = Number(acc.balance || 0);

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-[10px] uppercase border border-purple-500/20">
                      {acc.accountType}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{acc.accountName}</h4>
                    {acc.accountNumber && (
                      <p className="text-[11px] text-slate-400 font-mono">A/C: {acc.accountNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white font-mono">Rs. {bal.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Available Balance</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
