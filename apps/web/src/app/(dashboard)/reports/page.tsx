'use client';

import { useState } from 'react';
import {
  useSalesReport,
  usePurchaseReport,
  useExpenseReport,
  usePaymentReport,
  usePartyBalanceReport,
  useInventoryValuationReport,
  useCashflowStatementReport,
} from '@/services/reportService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
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
} from 'lucide-react';

type ReportTab =
  | 'sales'
  | 'purchases'
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

  const handlePrint = () => {
    window.print();
  };

  const activeQuery =
    activeTab === 'sales'
      ? salesQuery
      : activeTab === 'purchases'
      ? purchaseQuery
      : activeTab === 'expenses'
      ? expenseQuery
      : activeTab === 'payments'
      ? paymentQuery
      : activeTab === 'party-balance'
      ? partyBalQuery
      : activeTab === 'inventory-valuation'
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
            Export-ready executive reports, tax summaries, party ledgers, and inventory valuation metrics.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
        >
          <Printer className="w-4 h-4" /> Print / Export PDF
        </button>
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

              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
                  title="End Date"
                />
              </div>
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
            <table className="w-full text-left text-xs">
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
            <table className="w-full text-left text-xs">
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
            <table className="w-full text-left text-xs">
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
            <table className="w-full text-left text-xs">
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
            <table className="w-full text-left text-xs">
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
    </div>
  );
}
