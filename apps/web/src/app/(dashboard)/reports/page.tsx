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
} from 'lucide-react';

type ReportTab =
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
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

  const { data: business } = useCurrentBusiness();

  const handlePrint = () => {
    window.print();
  };

  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    recordCount: number;
    onConfirm: (format: 'csv' | 'json') => void;
  } | null>(null);

  const handleTriggerExportReport = () => {
    const rows: any[] = reportData?.rows || [];
    if (rows.length === 0) {
      toast.error('No report data to export.');
      return;
    }
    const reportTitle = `${activeTab.toUpperCase()} Report`;
    setExportModalConfig({
      isOpen: true,
      title: reportTitle,
      description: `Export data records currently visible in ${reportTitle}.`,
      recordCount: rows.length,
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
      : activeTab === 'inventory-valuation' || activeTab === 'item-batch' || activeTab === 'stock-transfer' || activeTab === 'balance-sheet'
      ? inventoryQuery
      : cashflowQuery;

  if (activeQuery.isLoading) {
    return <LoadingState message="Aggregating financial and inventory report data..." />;
  }

  if (activeQuery.isError) {
    return <ErrorState title="Failed to load report data" onRetry={activeQuery.refetch} />;
  }

  const reportData = activeQuery.data;

  return (
    <div className="space-y-8">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Financial & Business Reports <FileText className="w-6 h-6 text-blue-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Export-ready executive reports, IRD tax books, party ledgers, and inventory valuation metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerExportReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export (Excel / JSON)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* REPORT TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold print:hidden">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Sales Report
        </button>

        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'balance-sheet'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold'
              : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold'
          }`}
        >
          <Scale className="w-3.5 h-3.5" /> Balance Sheet (वासलात)
        </button>

        <button
          onClick={() => setActiveTab('billwise-pnl')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'billwise-pnl'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Bill-wise P&L
        </button>

        <button
          onClick={() => setActiveTab('partywise-pnl')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'partywise-pnl'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Party-wise P&L
        </button>

        <button
          onClick={() => setActiveTab('stock-transfer')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'stock-transfer'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" /> Stock Transfer
        </button>

        <button
          onClick={() => setActiveTab('item-batch')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'item-batch'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Tag className="w-3.5 h-3.5" /> Batch & Serial
        </button>

        <button
          onClick={() => setActiveTab('tally-export')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'tally-export'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-bold'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold'
          }`}
        >
          <Download className="w-3.5 h-3.5" /> Tally Export
        </button>

        <button
          onClick={() => setActiveTab('annex5-sales')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'annex5-sales'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Annex-5 (बिक्री खाता)
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'purchases'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Purchase Report
        </button>

        <button
          onClick={() => setActiveTab('annex6-purchases')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'annex6-purchases'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Annex-6 (खरिद खाता)
        </button>

        <button
          onClick={() => setActiveTab('customer-aging')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'customer-aging'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Receivables Aging (उधारो)
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Expense Report
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Payment Vouchers
        </button>

        <button
          onClick={() => setActiveTab('party-balance')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'party-balance'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Party Balances
        </button>

        <button
          onClick={() => setActiveTab('inventory-valuation')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'inventory-valuation'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Inventory Valuation
        </button>

        <button
          onClick={() => setActiveTab('cashflow-statement')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'cashflow-statement'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Cashflow Statement
        </button>

        <Link
          href="/profit-loss"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-teal-500/20 transition-all font-bold ml-auto"
        >
          <Scale className="w-3.5 h-3.5 text-teal-400" /> Full Profit & Loss Statement →
        </Link>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search report items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {(activeTab === 'sales' ||
            activeTab === 'purchases' ||
            activeTab === 'expenses' ||
            activeTab === 'payments' ||
            activeTab === 'cashflow-statement') && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setPresetRange('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    preset === 'all' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setPresetRange('today')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    preset === 'today' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPresetRange('week')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    preset === 'week' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setPresetRange('month')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    preset === 'month' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
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
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. SALES REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Revenue</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalRevenue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{reportData?.summary?.invoicesCount} Sales Invoices</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Tax Collected</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                Rs. {(reportData?.summary?.totalTax || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">VAT / Tax Total</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Payments Collected</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Direct Cash & Bank Inflows</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Outstanding Due</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Uncollected Receivables</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer Party</th>
                  <th className="px-6 py-4 text-right">Tax</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Due</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportData?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-white">{row.invoiceNumber}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-sans text-slate-300 font-semibold">{row.party?.name}</td>
                    <td className="px-6 py-4 text-right text-slate-400">Rs. {Number(row.taxAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">Rs. {Number(row.paidAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-amber-400 font-bold">Rs. {Number(row.dueAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-white font-bold">Rs. {Number(row.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. PURCHASE REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Procurement Spend</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalSpend || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{reportData?.summary?.billsCount} Purchase Bills</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Tax Paid</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                Rs. {(reportData?.summary?.totalTax || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Input VAT / Tax Paid</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Amount Paid</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalPaid || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Settled Vendor Bills</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Vendor Payables</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalDue || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Unpaid Supplier Bills</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Bill #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Supplier Party</th>
                  <th className="px-6 py-4 text-right">Tax</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Due</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportData?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-white">{row.billNumber}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-sans text-slate-300 font-semibold">{row.party?.name}</td>
                    <td className="px-6 py-4 text-right text-slate-400">Rs. {Number(row.taxAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">Rs. {Number(row.paidAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-rose-400 font-bold">Rs. {Number(row.dueAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-white font-bold">Rs. {Number(row.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. EXPENSE REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Expenses</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalExpenseAmount || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{reportData?.summary?.expensesCount} Entries Logged</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Expense Categories</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {reportData?.summary?.categoriesCount} Categories
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Operational & Overhead Spend</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportData?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-sans text-white font-semibold">{row.category}</td>
                    <td className="px-6 py-4 uppercase text-[10px] text-slate-300 font-bold">{row.paymentMode}</td>
                    <td className="px-6 py-4 font-sans text-slate-400">{row.description || '-'}</td>
                    <td className="px-6 py-4 text-right text-rose-400 font-bold">Rs. {Number(row.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. PARTY BALANCE REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'party-balance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Customer Receivables</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalReceivables || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Money to receive from customers</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Supplier Payables</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalPayables || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Money to give to vendors</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Net Party Balance</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                Rs. {(reportData?.summary?.netBalance || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{reportData?.summary?.partiesCount} Total Parties</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Party Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportData?.rows?.map((row: any) => {
                  const bal = Number(row.currentBalance || 0);
                  const isReceivable = bal > 0;
                  const isPayable = bal < 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-sans font-bold text-white">{row.name}</td>
                      <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-300">{row.type}</td>
                      <td className="px-6 py-4 text-slate-400">{row.phone || '-'}</td>
                      <td className="px-6 py-4 font-sans text-slate-400">{row.category?.name || '-'}</td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          isReceivable ? 'text-emerald-400' : isPayable ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        Rs. {Math.abs(bal).toLocaleString()} {isReceivable ? '(Receivable)' : isPayable ? '(Payable)' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. INVENTORY VALUATION REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'inventory-valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Stock Quantity</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {(reportData?.summary?.totalStockQty || 0).toLocaleString()} Pcs
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{reportData?.summary?.itemsCount} Product Master Items</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Cost Valuation</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalCostValuation || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Based on Purchase Prices</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Retail Sale Valuation</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.totalSaleValuation || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Based on Selling Prices</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-semibold">Potential Margin</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                Rs. {(reportData?.summary?.potentialProfitMargin || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Gross Profit Potential</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Available Stock</th>
                  <th className="px-6 py-4 text-right">Purchase Price</th>
                  <th className="px-6 py-4 text-right">Sale Price</th>
                  <th className="px-6 py-4 text-right">Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportData?.rows?.map((row: any) => {
                  const stock = Number(row.currentStock || 0);
                  const pPrice = Number(row.purchasePrice || 0);
                  const sPrice = Number(row.salePrice || 0);

                  return (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-sans font-bold text-white">{row.name}</td>
                      <td className="px-6 py-4 text-slate-400">{row.code || 'N/A'}</td>
                      <td className="px-6 py-4 font-sans text-slate-400">{row.category?.name || '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {stock} {row.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">Rs. {pPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-400">Rs. {sPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-blue-400 font-bold">
                        Rs. {(stock * pPrice).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. ANNEX-5 SALES BOOK VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'annex5-sales' && (
        <VatSalesBookAnnex5
          sales={reportData?.rows || []}
          startDate={startDate}
          endDate={endDate}
          businessName={business?.name}
          businessPan={business?.taxNumber || '-'}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. ANNEX-6 PURCHASE BOOK VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'annex6-purchases' && (
        <VatPurchaseBookAnnex6
          purchases={reportData?.rows || []}
          startDate={startDate}
          endDate={endDate}
          businessName={business?.name}
          businessPan={business?.taxNumber || '-'}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. CUSTOMER AGING REPORT VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'customer-aging' && (
        <CustomerAgingReport
          partyBalances={reportData?.rows || []}
          businessName={business?.name}
          businessPhone={business?.phone}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 10. VYAPAR PREMIUM REPORTS VIEW */}
      {/* ---------------------------------------------------- */}
      {['balance-sheet', 'billwise-pnl', 'partywise-pnl', 'stock-transfer', 'item-batch', 'tally-export'].includes(activeTab) && (
        <VyaparPremiumReports
          tab={activeTab as any}
          salesRows={salesQuery.data?.rows || []}
          purchaseRows={purchaseQuery.data?.rows || []}
          partyRows={partyBalQuery.data?.rows || []}
          itemRows={inventoryQuery.data?.rows || []}
          businessName={business?.name}
          businessPan={business?.taxNumber || '-'}
        />
      )}

      {/* Export Confirmation Modal */}
      {exportModalConfig && (
        <ExportConfirmModal
          isOpen={exportModalConfig.isOpen}
          onClose={() => setExportModalConfig(null)}
          title={exportModalConfig.title}
          description={exportModalConfig.description}
          recordCount={exportModalConfig.recordCount}
          onConfirm={exportModalConfig.onConfirm}
        />
      )}
    </div>
  );
}
