'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardMetrics } from '@/services/dashboardService';
import { useAuth } from '@/providers/AuthProvider';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';

interface ProfitLossSectionProps {
  metrics: DashboardMetrics;
  startDate: string;
  endDate: string;
  preset: 'all' | 'today' | 'week' | 'month' | 'custom';
  onPresetChange: (preset: 'today' | 'week' | 'month' | 'all') => void;
  onCustomDateChange: (start: string, end: string) => void;
}

export function ProfitLossSection({
  metrics,
  startDate,
  endDate,
  preset,
  onPresetChange,
  onCustomDateChange,
}: ProfitLossSectionProps) {
  const { user } = useAuth();
  const business = user?.memberships?.[0]?.business;

  // Period values
  const totalSales = metrics.totalSales || 0;
  const grossSales = metrics.grossSales ?? totalSales;
  const saleReturns = metrics.saleReturns ?? 0;
  const cogs = metrics.cogs || 0;
  const salesMargin = metrics.salesMargin ?? Math.max(0, totalSales - cogs);
  const salesMarginPct = metrics.salesMarginPercentage ?? (totalSales > 0 ? (salesMargin / totalSales) * 100 : 0);

  const totalPurchases = metrics.totalPurchases || 0;
  const grossPurchases = metrics.grossPurchases ?? totalPurchases;
  const purchaseReturns = metrics.purchaseReturns ?? 0;
  const totalExpenses = metrics.totalExpenses || 0;

  const netProfit = metrics.netProfit ?? (salesMargin - totalExpenses);
  const netProfitPct = metrics.netProfitPercentage ?? (totalSales > 0 ? (netProfit / totalSales) * 100 : 0);
  const isProfitable = netProfit >= 0;

  // Today's summary values
  const todaySummary = metrics.todaySummary || {
    sales: 0,
    grossSales: 0,
    saleReturns: 0,
    cogs: 0,
    salesMargin: 0,
    salesMarginPercentage: 0,
    purchases: 0,
    expenses: 0,
    netProfit: 0,
    salesCount: 0,
  };

  const todayMargin = todaySummary.salesMargin || 0;
  const todaySales = todaySummary.sales || 0;
  const todayMarginPct = todaySummary.salesMarginPercentage || (todaySales > 0 ? (todayMargin / todaySales) * 100 : 0);
  const todayNetProfit = todaySummary.netProfit || 0;
  const todayIsProfitable = todayNetProfit >= 0;

  // Clean formatted period text for print
  const getPrintPeriodText = () => {
    if (preset === 'today') {
      return `Today (${new Date().toLocaleDateString()})`;
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return `Last 7 Days (${past.toLocaleDateString()} to ${new Date().toLocaleDateString()})`;
    } else if (preset === 'month') {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      return `This Month (${firstDay.toLocaleDateString()} to ${new Date().toLocaleDateString()})`;
    } else if (startDate || endDate) {
      return `${startDate || 'Beginning'} to ${endDate || 'Present'}`;
    }
    return 'All Time';
  };

  return (
    <div className="space-y-5 font-sans print:space-y-4 print:bg-white print:text-slate-900">
      {/* FORMAL PRINT HEADER (Visible ONLY during print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
              {business?.name || 'My Business'}
            </h1>
            {business?.address && <p className="text-xs text-slate-600">{business.address}</p>}
            {business?.phone && <p className="text-xs text-slate-600">Phone: {business.phone}</p>}
            {business?.taxNumber && (
              <p className="text-xs text-slate-600 font-mono">PAN/VAT: {business.taxNumber}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-base font-extrabold text-slate-900 uppercase">
              Profit & Loss Statement
            </h2>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              Statement Period: {getPrintPeriodText()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Report Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* 1. DATE PRESET FILTER BAR (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <button
            onClick={() => onPresetChange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              preset === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onPresetChange('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              preset === 'week' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => onPresetChange('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              preset === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => onPresetChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              preset === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Time
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            preset={preset}
            onApply={(s, e, p) => {
              if (p === 'custom') {
                onCustomDateChange(s, e);
              } else {
                onPresetChange(p as any);
              }
            }}
          />
        </div>
      </div>

      {/* 2. NET PROFIT / LOSS STATUS CARD */}
      <div
        className={`p-4 sm:p-5 rounded-2xl bg-white border shadow-xs print:border-slate-300 print:shadow-none print:p-3 ${
          isProfitable ? 'border-emerald-300 ring-1 ring-emerald-500/10' : 'border-rose-300 ring-1 ring-rose-500/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
              isProfitable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isProfitable ? '📈 WE ARE IN PROFIT' : '📉 WE ARE IN LOSS'}
          </span>

          <span className="text-xs text-slate-500 print:text-slate-700">
            Net Margin: <strong className={`font-mono font-bold ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>{netProfitPct.toFixed(1)}%</strong>
          </span>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h3
            className={`text-2xl sm:text-3xl font-black font-mono whitespace-nowrap tracking-tight ${
              isProfitable ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            Rs. {netProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 print:text-slate-600">
            (Sales Margin: Rs. {salesMargin.toLocaleString()} • Expenses: Rs. {totalExpenses.toLocaleString()})
          </p>
        </div>
      </div>

      {/* 3. TODAY'S SALES MARGIN SUMMARY (Screen only - Hidden on Print) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Today’s Live Sales Margin Snapshot
          </h4>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            Real-time
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200">
            <h5 className="text-base sm:text-lg font-bold text-emerald-600 font-mono whitespace-nowrap">
              Rs. {todayMargin.toLocaleString()}
            </h5>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">
              Today's Margin ({todayMarginPct.toFixed(0)}%)
            </p>
            <p className="text-[9px] text-emerald-700 font-sans mt-0.5 font-medium">आजको सामान नाफा</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200">
            <h5 className="text-base sm:text-lg font-bold text-slate-900 font-mono whitespace-nowrap">
              Rs. {todaySales.toLocaleString()}
            </h5>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">Today's Sales</p>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5 font-medium">आजको कुल बिक्री</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200">
            <h5 className="text-base sm:text-lg font-bold text-slate-900 font-mono whitespace-nowrap">
              Rs. {(todaySummary.cogs || 0).toLocaleString()}
            </h5>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">Sold Cost (COGS)</p>
            <p className="text-[9px] text-amber-700 font-sans mt-0.5 font-medium">बिकेको सामानको खरिद मूल्य</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200">
            <h5
              className={`text-base sm:text-lg font-bold font-mono whitespace-nowrap ${
                todayIsProfitable ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {todayIsProfitable ? '+' : ''} Rs. {todayNetProfit.toLocaleString()}
            </h5>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">Today's Net Profit</p>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5 font-medium">खर्च कटाएर बाँकी नाफा</p>
          </div>
        </div>
      </div>

      {/* 4. PERIOD METRICS COMPARISON (Clean 2-Col Mobile / Print Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 print:gap-2">
        {/* Total Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3 className="text-base sm:text-xl font-bold text-slate-900 font-mono whitespace-nowrap">
            Rs. {totalSales.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">Sales (Total Net)</div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3 className="text-base sm:text-xl font-bold text-slate-800 font-mono whitespace-nowrap">
            Rs. {cogs.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">Cost of Goods (COGS)</div>
        </div>

        {/* Sales Margin */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3 className="text-base sm:text-xl font-bold text-teal-600 font-mono whitespace-nowrap">
            Rs. {salesMargin.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-teal-700 mt-1 font-semibold">
            Sales Margin ({salesMarginPct.toFixed(0)}%)
          </div>
        </div>

        {/* Purchases */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3 className="text-base sm:text-xl font-bold text-slate-900 font-mono whitespace-nowrap">
            Rs. {totalPurchases.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">Purchase (Total)</div>
        </div>

        {/* Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3 className="text-base sm:text-xl font-bold text-slate-900 font-mono whitespace-nowrap">
            Rs. {totalExpenses.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">Expense (Total)</div>
        </div>

        {/* Net Profit / Loss */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:border-slate-300 print:p-2.5">
          <h3
            className={`text-base sm:text-xl font-bold font-mono whitespace-nowrap ${
              isProfitable ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isProfitable ? '+' : ''} Rs. {netProfit.toLocaleString()}
          </h3>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">
            Net Profit ({netProfitPct.toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* 5. ITEMIZED PROFIT & LOSS BREAKDOWN TABLE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 print:border-slate-300 print:p-3 print:shadow-none">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Itemized Financial Statement Breakdown
        </h4>

        <div className="divide-y divide-slate-100 text-xs text-slate-800">
          <div className="py-2.5 print:py-1.5 flex items-center justify-between">
            <span className="text-slate-600">(+) Gross Sales Revenue</span>
            <span className="font-mono font-bold text-slate-900">Rs. {grossSales.toLocaleString()}</span>
          </div>

          <div className="py-2.5 print:py-1.5 flex items-center justify-between">
            <span className="text-slate-600">(-) Sales Returns & Credit Notes</span>
            <span className="font-mono font-bold text-rose-600">- Rs. {saleReturns.toLocaleString()}</span>
          </div>

          <div className="py-2.5 print:py-1.5 flex items-center justify-between font-bold bg-slate-50/50 px-2 rounded-lg">
            <span className="text-slate-900">(=) Net Sales Revenue</span>
            <span className="font-mono text-slate-900">Rs. {totalSales.toLocaleString()}</span>
          </div>

          <div className="py-2.5 print:py-1.5 flex items-center justify-between">
            <span className="text-slate-600">(-) Cost of Goods Sold (COGS)</span>
            <span className="font-mono font-bold text-amber-700">- Rs. {cogs.toLocaleString()}</span>
          </div>

          <div className="py-2.5 print:py-1.5 flex items-center justify-between font-bold bg-teal-50/50 px-2 rounded-lg">
            <span className="text-teal-800">(=) Gross Sales Margin</span>
            <span className="font-mono text-teal-800">Rs. {salesMargin.toLocaleString()} ({salesMarginPct.toFixed(1)}%)</span>
          </div>

          <div className="py-2.5 print:py-1.5 flex items-center justify-between">
            <span className="text-slate-600">(-) Operating Expenses</span>
            <span className="font-mono font-bold text-rose-600">- Rs. {totalExpenses.toLocaleString()}</span>
          </div>

          <div className="py-3 print:py-2 flex items-center justify-between font-extrabold text-sm border-t border-slate-200 mt-1">
            <span className={isProfitable ? 'text-emerald-700' : 'text-rose-700'}>
              (=) Net Profit / (Loss)
            </span>
            <span className={`font-mono text-base ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfitable ? '+' : ''} Rs. {netProfit.toLocaleString()} ({netProfitPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 flex justify-between items-center border-t border-slate-100">
          <span>Purchases during period: <strong className="text-slate-900 font-mono">Rs. {totalPurchases.toLocaleString()}</strong></span>
          <Link href="/reports" className="text-blue-600 hover:text-blue-700 font-bold print:hidden">
            All Reports →
          </Link>
        </div>
      </div>
    </div>
  );
}
