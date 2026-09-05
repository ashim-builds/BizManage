'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useSalesReport,
  usePurchaseReport,
  useExpenseReport,
  usePaymentReport,
  usePartyBalanceReport,
  useInventoryValuationReport,
  useCashflowStatementReport,
  useBalanceSheetReport,
} from '@/services/reportService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { VatSalesBookAnnex5 } from '@/components/reports/VatSalesBookAnnex5';
import { VatPurchaseBookAnnex6 } from '@/components/reports/VatPurchaseBookAnnex6';
import { CustomerAgingReport } from '@/components/reports/CustomerAgingReport';
import { VyaparPremiumReports } from '@/components/reports/VyaparPremiumReports';
import { ExportConfirmModal } from '@/components/common/ExportConfirmModal';
import { downloadCsv, downloadJson } from '@/lib/exportUtils';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Search,
  Printer,
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  Receipt,
  Users,
  Package,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Clock,
  Boxes,
  Tag,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export type ReportTab =
  | 'sales'
  | 'purchases'
  | 'balance-sheet'
  | 'billwise-pnl'
  | 'partywise-pnl'
  | 'stock-transfer'
  | 'item-batch'
  | 'tally-export'
  | 'annex5-sales'
  | 'annex6-purchases'
  | 'customer-aging'
  | 'expenses'
  | 'payments'
  | 'party-balance'
  | 'inventory-valuation'
  | 'cashflow-statement';

interface ReportCategory {
  id: string;
  name: string;
  icon: any;
  items: { id: ReportTab; label: string; desc: string; icon: any; badge?: string }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'financial',
    name: 'Core Financials',
    icon: DollarSign,
    items: [
      { id: 'sales', label: 'Sales Report', desc: 'Itemized sales invoices, taxes & collections', icon: ShoppingCart },
      { id: 'purchases', label: 'Purchase Report', desc: 'Vendor bills, input tax & payment dues', icon: Receipt },
      { id: 'expenses', label: 'Expense Report', desc: 'Operational expenditures & payment modes', icon: DollarSign },
      { id: 'payments', label: 'Payment Vouchers', desc: 'Cash and bank voucher disbursement log', icon: FileText },
      { id: 'cashflow-statement', label: 'Cashflow Statement', desc: 'Direct cash inflows, outflows & net position', icon: TrendingUp },
    ],
  },
  {
    id: 'vyapar',
    name: 'Profit, P&L & Balance Sheet',
    icon: Scale,
    items: [
      { id: 'balance-sheet', label: 'Balance Sheet (वासलात)', desc: 'Assets, liabilities & owner equity statement', icon: Scale, badge: 'Standard' },
      { id: 'billwise-pnl', label: 'Bill-wise P&L', desc: 'Gross margin breakdown per individual bill', icon: TrendingUp },
      { id: 'partywise-pnl', label: 'Party-wise P&L', desc: 'Customer and supplier profitability matrix', icon: Users },
      { id: 'stock-transfer', label: 'Stock Transfer Log', desc: 'Inter-godown stock movement audit', icon: Boxes },
      { id: 'item-batch', label: 'Batch & Serial Tracking', desc: 'Expiry and warranty batch identification', icon: Tag },
    ],
  },
  {
    id: 'tax_ledger',
    name: 'IRD Tax Books & Ledgers',
    icon: FileSpreadsheet,
    items: [
      { id: 'annex5-sales', label: 'Annex-5 (बिक्री खाता)', desc: 'Official IRD VAT sales register format', icon: FileSpreadsheet, badge: 'IRD Nepal' },
      { id: 'annex6-purchases', label: 'Annex-6 (खरिद खाता)', desc: 'Official IRD VAT purchase book format', icon: FileSpreadsheet, badge: 'IRD Nepal' },
      { id: 'customer-aging', label: 'Receivables Aging (उधारो)', desc: 'Customer outstanding debt by overdue aging', icon: Clock },
      { id: 'party-balance', label: 'Party Balances Ledger', desc: 'Net balance and statement for all contacts', icon: Users },
      { id: 'inventory-valuation', label: 'Inventory Valuation', desc: 'Closing stock asset value at cost price', icon: Package },
      { id: 'tally-export', label: 'Tally XML / Excel Export', desc: 'Seamless ERP accounting voucher export', icon: Download },
    ],
  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [isMobileReportSelected, setIsMobileReportSelected] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

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

  // Queries
  const salesQuery = useSalesReport({ search, startDate, endDate });
  const purchaseQuery = usePurchaseReport({ search, startDate, endDate });
  const expenseQuery = useExpenseReport({ search, startDate, endDate });
  const paymentQuery = usePaymentReport({ startDate, endDate });
  const partyBalQuery = usePartyBalanceReport({ search });
  const inventoryQuery = useInventoryValuationReport({ search });
  const cashflowQuery = useCashflowStatementReport({ startDate, endDate });
  const balanceSheetQuery = useBalanceSheetReport({ asOfDate: endDate || undefined });
  const { data: business } = useCurrentBusiness();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRows, setExportRows] = useState<any[]>([]);

  const handlePrint = () => {
    window.print();
  };

  const handleTriggerExportReport = () => {
    let rows: any[] = [];
    if (activeTab === 'sales') rows = salesQuery.data?.invoices || [];
    else if (activeTab === 'purchases') rows = purchaseQuery.data?.purchases || [];
    else if (activeTab === 'expenses') rows = expenseQuery.data?.expenses || [];
    else if (activeTab === 'payments') rows = paymentQuery.data?.payments || [];
    else if (activeTab === 'party-balance') rows = partyBalQuery.data?.parties || [];
    else if (activeTab === 'inventory-valuation') rows = inventoryQuery.data?.items || [];
    else rows = salesQuery.data?.invoices || [];

    if (!rows || rows.length === 0) {
      toast.error('No rows to export for current filter criteria.');
      return;
    }

    setExportRows(rows);
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = (format: 'csv' | 'json') => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const keys = Object.keys(exportRows[0] || {});
      const headers = keys.map((k) => k.replace(/([A-Z])/g, ' $1').toUpperCase());
      const csvRows = exportRows.map((r) => keys.map((k) => r[k]));
      downloadCsv(`report_${activeTab}_${dateStr}.csv`, headers, csvRows);
    } else {
      downloadJson(`report_${activeTab}_${dateStr}.json`, exportRows);
    }
    toast.success(`Exported ${exportRows.length} records to ${format.toUpperCase()}!`);
    setIsExportModalOpen(false);
  };

  const activeQuery =
    activeTab === 'sales' || activeTab === 'annex5-sales' || activeTab === 'billwise-pnl' || activeTab === 'tally-export'
      ? salesQuery
      : activeTab === 'purchases' || activeTab === 'annex6-purchases'
      ? purchaseQuery
      : activeTab === 'expenses'
      ? expenseQuery
      : activeTab === 'payments'
      ? paymentQuery
      : activeTab === 'party-balance' || activeTab === 'customer-aging' || activeTab === 'partywise-pnl'
      ? partyBalQuery
      : activeTab === 'balance-sheet'
      ? balanceSheetQuery
      : activeTab === 'inventory-valuation' || activeTab === 'item-batch' || activeTab === 'stock-transfer'
      ? inventoryQuery
      : cashflowQuery;

  const reportData = activeQuery.data;

  // Find active item
  const currentTabItem = REPORT_CATEGORIES.flatMap((c) => c.items).find((i) => i.id === activeTab);

  const handleSelectReport = (tabId: ReportTab) => {
    setActiveTab(tabId);
    setIsMobileReportSelected(true);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2.5 sm:px-6 py-3 sm:py-4 font-sans pb-12">
      {/* ── HEADER & ACTIONS ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            Financial &amp; Business Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive accounting reports, IRD tax books, party ledgers, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerExportReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer min-h-[38px]"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer min-h-[38px]"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" /> Print
          </button>
        </div>
      </div>

      {/* ── MOBILE FIRST REPORT SELECTOR HUB (< md) ────────────────── */}
      <div className="md:hidden">
        {!isMobileReportSelected ? (
          /* Report Categories Grid - Select Report First */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Tap any report below to view detailed breakdown &amp; metrics:</span>
            </div>

            {REPORT_CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5">
                  <cat.icon className="w-3.5 h-3.5 text-blue-600" />
                  {cat.name}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectReport(item.id)}
                        className="w-full p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 flex items-center justify-between text-left shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Mobile Active Report Navigation Bar */
          <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setIsMobileReportSelected(false)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer min-h-[36px] px-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Reports</span>
            </button>
            <div className="text-center min-w-0">
              <span className="text-xs font-black text-slate-900 block truncate">{currentTabItem?.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileReportSelected(false)}
              className="text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
            >
              Switch
            </button>
          </div>
        )}
      </div>

      {/* ── DESKTOP REPORT SELECTOR TABS (>= md) ────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 p-2 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {REPORT_CATEGORIES.flatMap((c) => c.items).map((item) => {
            const isSelected = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── REPORT CONTENT SHELL (Only if desktop OR mobile report selected) ── */}
      <div className={`${!isMobileReportSelected ? 'hidden md:block' : 'block'} space-y-4 sm:space-y-6`}>
        {/* FILTERS & SEARCH BAR */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${currentTabItem?.label || 'report'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-600 min-h-[38px]"
            />
          </div>

          {(activeTab === 'sales' ||
            activeTab === 'purchases' ||
            activeTab === 'expenses' ||
            activeTab === 'payments' ||
            activeTab === 'cashflow-statement') && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPresetRange('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                    preset === 'all' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('today')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                    preset === 'today' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('week')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                    preset === 'week' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('month')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                    preset === 'month' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month
                </button>
              </div>

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
          )}
        </div>

        {/* LOADING & ERROR STATES */}
        {activeQuery.isLoading ? (
          <LoadingState message="Aggregating financial and inventory report data..." />
        ) : activeQuery.isError ? (
          <ErrorState title="Failed to load report data" onRetry={activeQuery.refetch} />
        ) : (
          <>
            {/* 1. SALES REPORT VIEW */}
            {activeTab === 'sales' && (
              <div className="space-y-4">
                {/* Compact 2-Column KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Total Revenue</p>
                    <h3 className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalRevenue || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{reportData?.summary?.invoicesCount || 0} Invoices</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Tax Collected</p>
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalTax || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">VAT / Tax</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Received</p>
                    <h3 className="text-base sm:text-xl font-bold text-blue-600 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Cash/Bank Inflows</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Outstanding Due</p>
                    <h3 className="text-base sm:text-xl font-bold text-amber-600 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Receivables</p>
                  </div>
                </div>

                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.invoices?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No sales records found.
                    </div>
                  ) : (
                    reportData?.invoices?.map((inv: any) => (
                      <div key={inv.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-mono font-bold text-blue-600 text-xs">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-slate-500">{new Date(inv.invoiceDate || inv.date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[200px]">{inv.party?.name || 'Walk-in Customer'}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                            {inv.paymentMode}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Total:</span>
                            <strong className="font-mono text-slate-900">Rs. {Number(inv.totalAmount || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block">Received:</span>
                            <strong className="font-mono text-emerald-600">Rs. {Number(inv.paidAmount || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-600 block">Due:</span>
                            <strong className="font-mono text-amber-600">Rs. {Number(inv.dueAmount || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Taxable</th>
                        <th className="px-4 py-3 text-right">Tax</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Received</th>
                        <th className="px-4 py-3 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(inv.invoiceDate || inv.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{inv.party?.name || 'Walk-in Customer'}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                              {inv.paymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">Rs. {Number(inv.subTotal || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">Rs. {Number(inv.taxAmount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            Rs. {Number(inv.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                            Rs. {Number(inv.dueAmount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. PURCHASE REPORT VIEW */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Total Purchases</p>
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalAmount || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{reportData?.summary?.purchasesCount || 0} Bills</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Total Paid</p>
                    <h3 className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Vendor Outflows</p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">Payables Due</p>
                    <h3 className="text-base sm:text-xl font-bold text-rose-600 mt-0.5 font-mono truncate">
                      Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Pending Dues</p>
                  </div>
                </div>

                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.purchases?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No purchase records found.
                    </div>
                  ) : (
                    reportData?.purchases?.map((pur: any) => (
                      <div key={pur.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-mono font-bold text-purple-600 text-xs">{pur.billNumber || 'PUR'}</span>
                          <span className="text-[11px] text-slate-500">{new Date(pur.billDate || pur.date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[200px]">{pur.party?.name || 'Vendor'}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Total:</span>
                            <strong className="font-mono text-slate-900">Rs. {Number(pur.totalAmount || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block">Paid:</span>
                            <strong className="font-mono text-emerald-600">Rs. {Number(pur.paidAmount || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-600 block">Due:</span>
                            <strong className="font-mono text-rose-600">Rs. {Number(pur.dueAmount || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Bill #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3 text-right">Taxable</th>
                        <th className="px-4 py-3 text-right">Tax</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.purchases?.map((pur: any) => (
                        <tr key={pur.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-purple-600">{pur.billNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(pur.billDate || pur.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{pur.party?.name || 'Vendor'}</td>
                          <td className="px-4 py-3 text-right font-mono">Rs. {Number(pur.subTotal || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">Rs. {Number(pur.taxAmount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            Rs. {Number(pur.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            Rs. {Number(pur.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                            Rs. {Number(pur.dueAmount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. EXPENSE REPORT VIEW */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.expenses?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No expense records found.
                    </div>
                  ) : (
                    reportData?.expenses?.map((exp: any) => (
                      <div key={exp.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <strong className="text-slate-900 font-bold">{exp.category}</strong>
                          <span className="text-[11px] text-slate-500">{new Date(exp.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{exp.note || exp.expenseNumber || 'Expense'}</span>
                          <span className="font-mono font-bold text-rose-600 text-sm">
                            Rs. {Number(exp.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Expense #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.expenses?.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-rose-600">{exp.expenseNumber || 'EXP'}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{exp.category}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                              {exp.paymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{exp.note || '—'}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                            Rs. {Number(exp.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PAYMENT VOUCHERS VIEW */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.payments?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No payment vouchers recorded.
                    </div>
                  ) : (
                    reportData?.payments?.map((p: any) => (
                      <div key={p.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            p.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {p.type === 'IN' ? 'PAYMENT IN' : 'PAYMENT OUT'}
                          </span>
                          <span className="text-[11px] text-slate-500">{new Date(p.date || p.paymentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{p.party?.name || p.voucherNumber || 'Direct Payment'}</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            Rs. {Number(p.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Voucher #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Party</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.payments?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{p.voucherNumber || p.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(p.date || p.paymentDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              p.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {p.type === 'IN' ? 'PAYMENT IN' : 'PAYMENT OUT'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{p.party?.name || '—'}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{p.paymentMode}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            Rs. {Number(p.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. PARTY BALANCE REPORT VIEW */}
            {activeTab === 'party-balance' && (
              <div className="space-y-4">
                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.parties?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No party balances found.
                    </div>
                  ) : (
                    reportData?.parties?.map((pty: any) => {
                      const bal = Number(pty.balance || pty.currentBalance || 0);
                      return (
                        <div key={pty.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <strong className="text-slate-900 font-bold">{pty.name}</strong>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold">
                              {pty.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-mono text-[11px]">{pty.phone || pty.pan || 'No phone'}</span>
                            <span className={`font-mono font-bold text-sm ${
                              bal > 0 ? 'text-amber-600' : bal < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              Rs. {Math.abs(bal).toLocaleString()} {bal > 0 ? '(Dr)' : bal < 0 ? '(Cr)' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Party Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">PAN / VAT</th>
                        <th className="px-4 py-3 text-right">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.parties?.map((pty: any) => {
                        const bal = Number(pty.balance || pty.currentBalance || 0);
                        return (
                          <tr key={pty.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-bold text-slate-900">{pty.name}</td>
                            <td className="px-4 py-3 text-slate-600">{pty.type}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{pty.phone || '—'}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{pty.pan || '—'}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${
                              bal > 0 ? 'text-amber-600' : bal < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              Rs. {Math.abs(bal).toLocaleString()} {bal > 0 ? '(Dr)' : bal < 0 ? '(Cr)' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. INVENTORY VALUATION VIEW */}
            {activeTab === 'inventory-valuation' && (
              <div className="space-y-4">
                {/* Mobile Cards (< md) */}
                <div className="grid gap-2.5 md:hidden">
                  {reportData?.items?.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      No inventory items found.
                    </div>
                  ) : (
                    reportData?.items?.map((it: any) => {
                      const stockVal = Number(it.currentStock || 0) * Number(it.purchasePrice || 0);
                      return (
                        <div key={it.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <strong className="text-slate-900 font-bold truncate max-w-[200px]">{it.name}</strong>
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {it.currentStock} {it.unit}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div>Cost: <strong className="font-mono text-slate-800">Rs. {Number(it.purchasePrice || 0).toLocaleString()}</strong></div>
                            <div>Sale: <strong className="font-mono text-slate-800">Rs. {Number(it.salePrice || 0).toLocaleString()}</strong></div>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-slate-500 font-medium">Valuation at Cost:</span>
                            <span className="font-mono font-bold text-emerald-700">Rs. {stockVal.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Purchase Price</th>
                        <th className="px-4 py-3 text-right">Sale Price</th>
                        <th className="px-4 py-3 text-right">Asset Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportData?.items?.map((it: any) => {
                        const stockVal = Number(it.currentStock || 0) * Number(it.purchasePrice || 0);
                        return (
                          <tr key={it.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-bold text-slate-900">{it.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{it.code || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                              {it.currentStock} {it.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">Rs. {Number(it.purchasePrice || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                              Rs. {Number(it.salePrice || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                              Rs. {stockVal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. CASHFLOW STATEMENT VIEW */}
            {activeTab === 'cashflow-statement' && (
              <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Cashflow Inflow &amp; Outflow Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase block">Total Cash Inflows</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1 block">
                      Rs. {(reportData?.summary?.totalInflow || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase block">Total Cash Outflows</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-rose-700 mt-1 block">
                      Rs. {(reportData?.summary?.totalOutflow || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] sm:text-xs font-bold text-blue-800 uppercase block">Net Cash Position</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-blue-700 mt-1 block">
                      Rs. {(reportData?.summary?.netCashflow || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. IRD ANNEX 5 VAT SALES BOOK */}
            {activeTab === 'annex5-sales' && (
              <VatSalesBookAnnex5 sales={salesQuery.data?.invoices || []} />
            )}

            {/* 9. IRD ANNEX 6 VAT PURCHASE BOOK */}
            {activeTab === 'annex6-purchases' && (
              <VatPurchaseBookAnnex6 purchases={purchaseQuery.data?.purchases || []} />
            )}

            {/* 10. CUSTOMER AGING REPORT */}
            {activeTab === 'customer-aging' && (
              <CustomerAgingReport partyBalances={partyBalQuery.data?.parties || []} />
            )}

            {/* 11. VYAPAR PREMIUM REPORTS (Balance Sheet, Billwise P&L, Partywise P&L, Tally Export, Batch) */}
            {(activeTab === 'balance-sheet' ||
              activeTab === 'billwise-pnl' ||
              activeTab === 'partywise-pnl' ||
              activeTab === 'stock-transfer' ||
              activeTab === 'item-batch' ||
              activeTab === 'tally-export') && (
              <VyaparPremiumReports
                tab={activeTab}
                salesRows={salesQuery.data?.invoices || []}
                purchaseRows={purchaseQuery.data?.purchases || []}
                partyRows={partyBalQuery.data?.parties || []}
                itemRows={inventoryQuery.data?.items || []}
                balanceSheetData={balanceSheetQuery.data?.data}
                businessName={business?.name}
                businessPan={business?.taxNumber || 'N/A'}
              />
            )}
          </>
        )}
      </div>

      {/* Export Confirmation Modal */}
      <ExportConfirmModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        title={`Export ${currentTabItem?.label || 'Report'} Data`}
        recordCount={exportRows.length}
      />
    </div>
  );
}
