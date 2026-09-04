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
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('week');

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
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-600" /> Cashflow Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time money in vs. money out derived directly from actual business transactions and account ledgers.
          </p>
        </div>

        {/* View Switcher Tabs & Custom Date Picker */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Daily (7D)
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Monthly (12M)
            </button>
          </div>

          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            preset={preset}
            onApply={(s, e, p) => {
              setStartDate(s);
              setEndDate(e);
              setPreset(p);
              if (s || e) {
                router.push(`/reports?tab=cashflow-statement&startDate=${s}&endDate=${e}`);
              }
            }}
          />
        </div>
      </div>

      {/* Summary Cards: 1+3 Layout on Mobile, 4-Column on Desktop */}
      <div className="space-y-2 md:hidden">
        {/* Top Hero: Total Liquidity */}
        <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Total Cash Liquidity</p>
            <p className="text-base font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
              Rs. {(summary?.totalLiquidity || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Across {summary?.accountsCount || 0} Cash & Bank Accounts
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Wallet className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Breakdown Row (3 Columns) */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
            <p className="text-[10px] font-bold text-emerald-700 truncate">Money In</p>
            <p className="text-xs font-black font-mono text-emerald-700 mt-0.5 truncate">
              Rs. {(summary?.totalMoneyIn || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
            <p className="text-[10px] font-bold text-rose-700 truncate">Money Out</p>
            <p className="text-xs font-black font-mono text-rose-700 mt-0.5 truncate">
              Rs. {(summary?.totalMoneyOut || 0).toLocaleString()}
            </p>
          </div>
          <div className={`border rounded-2xl p-2 sm:p-2.5 shadow-2xs ${(summary?.netCashflow || 0) >= 0 ? 'bg-emerald-50/70 border-emerald-200/80' : 'bg-rose-50/70 border-rose-200/80'}`}>
            <p className={`text-[10px] font-bold truncate ${(summary?.netCashflow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Net Flow</p>
            <p className={`text-xs font-black font-mono mt-0.5 truncate ${(summary?.netCashflow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {(summary?.netCashflow || 0) >= 0 ? '+' : ''} Rs. {(summary?.netCashflow || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View (>= md): 4 Full Width Cards */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 lg:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Liquidity</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
              Rs. {(summary?.totalLiquidity || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{summary?.accountsCount || 0} Cash & Bank Accounts</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Money In</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              Rs. {(summary?.totalMoneyIn || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Sales, collections & income</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Money Out</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">
              Rs. {(summary?.totalMoneyOut || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Purchases, payouts & expenses</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Movement</p>
            <h3
              className={`text-2xl font-black mt-1 font-mono ${
                (summary?.netCashflow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {(summary?.netCashflow || 0) >= 0 ? '+' : ''} Rs. {(summary?.netCashflow || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {(summary?.netCashflow || 0) >= 0 ? 'Net positive surplus' : 'Net cash deficit'}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
              (summary?.netCashflow || 0) >= 0
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}
          >
            <PieChart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {viewMode === 'daily' ? 'Daily Cashflow (Last 7 Days)' : 'Monthly Cashflow (Last 12 Months)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of cash inflow vs. outflow per time period.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs"></span> Money In
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs"></span> Money Out
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {activeData.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="w-7 h-7 text-slate-400" />}
            title="No Transaction Data"
            description="Perform sales, purchases, payments, or expense entries to populate cashflow trends."
          />
        ) : (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-7 md:grid-cols-12 gap-2 sm:gap-3 items-end h-64 px-2 sm:px-4 pb-4 border-b border-slate-100">
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
                        className="w-1/2 max-w-[14px] bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all relative shadow-2xs"
                        title={`Money In: Rs. ${item.moneyIn.toLocaleString()}`}
                      />
                      {/* Money Out Bar */}
                      <div
                        style={{ height: `${outHeight}%` }}
                        className="w-1/2 max-w-[14px] bg-rose-500 rounded-t-md hover:bg-rose-600 transition-all relative shadow-2xs"
                        title={`Money Out: Rs. ${item.moneyOut.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Table Mobile Card Layout */}
            <div className="grid gap-2.5 md:hidden">
              {activeData.map((row: any, idx: number) => {
                const label = row.date || row.month;
                const isPositive = row.net >= 0;

                return (
                  <div key={idx} className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-2 shadow-2xs">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <span className="font-bold text-slate-900 text-xs">{label}</span>
                      <span className={`font-mono font-black text-xs ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''} Rs. {row.net.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono mt-0.5">
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-sans font-bold">Money In</span>
                        <span className="text-emerald-600 font-bold">+ Rs. {row.moneyIn.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-slate-400 text-[10px] font-sans font-bold">Money Out</span>
                        <span className="text-rose-600 font-bold">- Rs. {row.moneyOut.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Table Desktop Layout */}
            <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden mt-6 shadow-xs">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Period ({viewMode === 'daily' ? 'Date' : 'Month'})</th>
                    <th className="px-6 py-3.5 text-right">Money In</th>
                    <th className="px-6 py-3.5 text-right">Money Out</th>
                    <th className="px-6 py-3.5 text-right">Net Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {activeData.map((row: any, idx: number) => {
                    const label = row.date || row.month;
                    const isPositive = row.net >= 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{label}</td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-bold">
                          + Rs. {row.moneyIn.toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right text-rose-600 font-bold">
                          - Rs. {row.moneyOut.toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-3.5 text-right font-black ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
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
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" /> Account Liquidity Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time balances across all registered cash and bank accounts.</p>
          </div>
        </div>

        {accounts?.length === 0 ? (
          <p className="text-xs text-slate-400">No active bank accounts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts?.map((acc: any) => {
              const bal = Number(acc.balance || 0);

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] uppercase border border-purple-200 inline-block mb-1">
                      {acc.accountType}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{acc.accountName}</h4>
                    {acc.accountNumber && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">A/C: {acc.accountNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900 font-mono">Rs. {bal.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Available Balance</p>
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
