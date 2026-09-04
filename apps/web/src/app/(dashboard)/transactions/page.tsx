'use client';

import { useState } from 'react';
import { useTransactionsList } from '@/services/cashflowService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ArrowDownLeft, ArrowUpRight, Clock, Filter, Activity, Box, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';

const TRANSACTION_CATEGORIES = [
  'SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN', 
  'PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE', 'INCOME', 'TRANSFER'
];

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, isError, refetch, isFetching } = useTransactionsList({
    page,
    limit: 50,
    category: category || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const transactions = data?.data || [];
  const meta = data?.meta;

  const handleResetFilters = () => {
    setCategory('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4 font-sans pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-600" />
            Transactions &amp; Cashflow Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A unified ledger of all financial activities across your business. Track money in, money out, and transfers in real-time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">Category Filter</label>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Categories</option>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="w-full md:w-56">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              setPage(1);
            }}
            placeholder="From Date"
          />
        </div>
        <div className="w-full md:w-56">
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(d) => {
              setEndDate(d);
              setPage(1);
            }}
            placeholder="To Date"
          />
        </div>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Reset
        </button>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="Loading transactions..." />
      ) : isError ? (
        <ErrorState title="Failed to load transactions" onRetry={refetch} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8 text-blue-500" />}
          title="No Transactions Found"
          description={category || startDate || endDate ? 'Try adjusting your filters.' : 'Your financial ledger is currently empty. Transactions will appear here automatically.'}
          actionLabel={category || startDate || endDate ? 'Clear Filters' : undefined}
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-2.5 md:hidden">
            {transactions.map((tx: any) => {
              const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
              const isTransfer = tx.category === 'TRANSFER';

              return (
                <div key={tx.id} className="p-3.5 bg-white border border-slate-200/90 rounded-2xl flex flex-col gap-2.5 shadow-2xs">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-bold text-slate-900 font-mono text-xs">{new Date(tx.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(tx.date).toLocaleTimeString()}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {tx.category.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                        isTransfer ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        isTxIn ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {isTransfer ? <RefreshCw className="w-4 h-4" /> :
                         isTxIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{tx.description || 'Transaction'}</p>
                        {tx.referenceId && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">REF: {tx.referenceId}</p>
                        )}
                        {tx.account && (
                           <p className="text-[11px] text-slate-500 font-medium mt-0.5">A/C: {tx.account.accountName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap pl-2">
                      <span className={`font-mono font-black text-sm ${
                        isTransfer ? 'text-blue-600' :
                        isTxIn ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {!isTransfer && (isTxIn ? '+ ' : '- ')}Rs. {Number(tx.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto overflow-y-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Date &amp; Time</th>
                  <th className="px-6 py-3.5">Transaction Details</th>
                  <th className="px-6 py-3.5">Account</th>
                  <th className="px-6 py-3.5 text-center">Category</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx: any) => {
                const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
                const isTransfer = tx.category === 'TRANSFER';
                
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono">{new Date(tx.date).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">{new Date(tx.date).toLocaleTimeString()}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs ${
                          isTransfer ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          isTxIn ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {isTransfer ? <RefreshCw className="w-3.5 h-3.5" /> :
                           isTxIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{tx.description || 'Transaction'}</p>
                          {tx.referenceId && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">REF: {tx.referenceId}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.account ? (
                        <div>
                          <span className="font-bold text-slate-800">{tx.account.accountName}</span>
                          <span className="block text-[10px] text-slate-400 font-medium">{tx.account.accountType}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {tx.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-black text-sm ${
                        isTransfer ? 'text-blue-600' :
                        isTxIn ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {!isTransfer && (isTxIn ? '+ ' : '- ')}Rs. {Number(tx.amount || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total transactions)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
