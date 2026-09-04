'use client';

import { useState } from 'react';
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
  items: { id: ReportTab; label: string; icon: any; badge?: string }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'financial',
    name: 'Core Financials',
    icon: DollarSign,
    items: [
      { id: 'sales', label: 'Sales Report', icon: ShoppingCart },
      { id: 'purchases', label: 'Purchase Report', icon: Receipt },
      { id: 'expenses', label: 'Expense Report', icon: DollarSign },
      { id: 'payments', label: 'Payment Vouchers', icon: FileText },
      { id: 'cashflow-statement', label: 'Cashflow Statement', icon: TrendingUp },
    ],
  },
  {
    id: 'vyapar',
    name: 'Profit, P&L & Balance Sheet',
    icon: Scale,
    items: [
      { id: 'balance-sheet', label: 'Balance Sheet (वासलात)', icon: Scale, badge: 'Standard' },
      { id: 'billwise-pnl', label: 'Bill-wise P&L', icon: TrendingUp },
      { id: 'partywise-pnl', label: 'Party-wise P&L', icon: Users },
      { id: 'stock-transfer', label: 'Stock Transfer Log', icon: Boxes },
      { id: 'item-batch', label: 'Batch & Serial Tracking', icon: Tag },
    ],
  },
  {
    id: 'tax_ledger',
    name: 'IRD Tax Books & Ledgers',
    icon: FileSpreadsheet,
    items: [
      { id: 'annex5-sales', label: 'Annex-5 (बिक्री खाता)', icon: FileSpreadsheet, badge: 'IRD Nepal' },
      { id: 'annex6-purchases', label: 'Annex-6 (खरिद खाता)', icon: FileSpreadsheet, badge: 'IRD Nepal' },
      { id: 'customer-aging', label: 'Receivables Aging (उधारो)', icon: Clock },
      { id: 'party-balance', label: 'Party Balances Ledger', icon: Users },
      { id: 'inventory-valuation', label: 'Inventory Valuation', icon: Package },
      { id: 'tally-export', label: 'Tally XML / Excel Export', icon: Download },
    ],
  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);

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

    ExportConfirmModal.show({
      title: `Export ${activeTab.toUpperCase().replace('-', ' ')} Data`,
      message: `Export ${rows.length} rows to Excel / CSV or JSON format.`,
      recordCount: rows.length,
      defaultFormat: 'csv',
      onConfirm: (format) => {
        const dateStr = new Date().toISOString().split('T')[0];
        if (format === 'csv') {
          const keys = Object.keys(rows[0] || {});
          const headers = keys.map((k) => k.replace(/([A-Z])/g, ' $1').toUpperCase());
          const csvRows = rows.map((r) => keys.map((k) => r[k]));
          downloadCsv(`report_${activeTab}_${dateStr}.csv`, headers, csvRows);
        } else {
          downloadJson(`report_${activeTab}_${dateStr}.json`, rows);
        }
        toast.success(`Exported ${rows.length} records to ${format.toUpperCase()}!`);
      },
    });
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

  if (activeQuery.isLoading) {
    return <LoadingState message="Aggregating financial and inventory report data..." />;
  }

  if (activeQuery.isError) {
    return <ErrorState title="Failed to load report data" onRetry={activeQuery.refetch} />;
  }

  const reportData = activeQuery.data;

  // Find active label for mobile button
  const currentTabItem = REPORT_CATEGORIES.flatMap((c) => c.items).find((i) => i.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* ── HEADER & EXPORT ACTIONS ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            Financial & Business Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Export-ready executive reports, IRD tax books, party ledgers, and inventory valuation metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerExportReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export (Excel / JSON)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── CATEGORIZED REPORT NAVIGATOR ────────────────────────────────── */}
      <div className="space-y-3 print:hidden">
        {/* Mobile Dropdown / Accordion Trigger */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
            className="w-full flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold text-slate-900"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Active: <span className="text-blue-600">{currentTabItem?.label || 'Select Report'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {mobileCategoryOpen && (
            <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-3 shadow-lg space-y-4 animate-in fade-in">
              {REPORT_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.name}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {cat.items.map((item) => {
                      const isSelected = activeTab === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileCategoryOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop / Tablet Shelf */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {REPORT_CATEGORIES.flatMap((c) => c.items).map((item) => {
              const isSelected = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
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
      </div>

      {/* ── FILTERS & SEARCH BAR ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab.replace('-', ' ')}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none"
          />
        </div>

        {(activeTab === 'sales' ||
          activeTab === 'purchases' ||
          activeTab === 'expenses' ||
          activeTab === 'payments' ||
          activeTab === 'cashflow-statement') && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setPresetRange('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  preset === 'all' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setPresetRange('today')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  preset === 'today' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPresetRange('week')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  preset === 'week' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setPresetRange('month')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  preset === 'month' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
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

      {/* ── REPORT VIEWS ────────────────────────────────────────────────── */}

      {/* 1. SALES REPORT VIEW */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Revenue</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalRevenue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">{reportData?.summary?.invoicesCount || 0} Sales Invoices</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Tax Collected</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalTax || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">VAT / Tax Total</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Payments Received</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Direct Cash & Bank Inflows</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Outstanding Due</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Uncollected Receivables</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Payment Mode</th>
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
                      <td className="px-4 py-3 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{inv.party?.name || 'Cash Customer'}</td>
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
        </div>
      )}

      {/* 2. PURCHASE REPORT VIEW */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Purchases</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalAmount || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">{reportData?.summary?.purchasesCount || 0} Invoices</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Paid Out</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Vendor Outflows</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-bold">Payables Outstanding</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Pending Supplier Dues</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                      <td className="px-4 py-3 text-slate-600">{new Date(pur.billDate).toLocaleDateString()}</td>
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
        </div>
      )}

      {/* 3. EXPENSE REPORT VIEW */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="px-4 py-3">Expense #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Payment Mode</th>
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
        </div>
      )}

      {/* 4. PAYMENT VOUCHERS VIEW */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Cashflow Inflow & Outflow Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase block">Total Cash Inflows</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                Rs. {(reportData?.summary?.totalInflow || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase block">Total Cash Outflows</span>
              <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">
                Rs. {(reportData?.summary?.totalOutflow || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase block">Net Cash Position</span>
              <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
                Rs. {(reportData?.summary?.netCashflow || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 8. IRD ANNEX 5 VAT SALES BOOK */}
      {activeTab === 'annex5-sales' && (
        <VatSalesBookAnnex5 salesInvoices={salesQuery.data?.invoices || []} />
      )}

      {/* 9. IRD ANNEX 6 VAT PURCHASE BOOK */}
      {activeTab === 'annex6-purchases' && (
        <VatPurchaseBookAnnex6 purchases={purchaseQuery.data?.purchases || []} />
      )}

      {/* 10. CUSTOMER AGING REPORT */}
      {activeTab === 'customer-aging' && (
        <CustomerAgingReport parties={partyBalQuery.data?.parties || []} />
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
    </div>
  );
}
