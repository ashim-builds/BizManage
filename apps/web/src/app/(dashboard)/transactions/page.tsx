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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Transactions & Cashflow
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            A unified ledger of all financial activities across your business. Track money in, money out, and transfers in real-time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Category</label>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
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
          icon={<Clock className="w-8 h-8 text-blue-400" />}
          title="No Transactions Found"
          description={category || startDate || endDate ? 'Try adjusting your filters.' : 'Your financial ledger is currently empty. Transactions will appear here automatically.'}
          actionLabel={category || startDate || endDate ? 'Clear Filters' : undefined}
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {transactions.map((tx: any) => {
              const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
              const isTransfer = tx.category === 'TRANSFER';

              return (
                <div key={tx.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                    <div>
                      <p className="font-semibold text-white font-mono text-sm">{new Date(tx.date).toLocaleDateString()}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{new Date(tx.date).toLocaleTimeString()}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {tx.category.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                        isTransfer ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        isTxIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {isTransfer ? <RefreshCw className="w-4 h-4" /> :
                         isTxIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{tx.description || 'Transaction'}</p>
                        {tx.referenceId && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">REF: {tx.referenceId}</p>
                        )}
                        {tx.account && (
                           <p className="text-[11px] text-slate-400 mt-1">Acct: {tx.account.accountName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap pl-2">
                      <span className={`font-mono font-bold text-base ${
                        isTransfer ? 'text-blue-400' :
                        isTxIn ? 'text-emerald-400' : 'text-rose-400'
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
          <div className="hidden md:block border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4 text-center">Category</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx: any) => {
                const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
                const isTransfer = tx.category === 'TRANSFER';
                
                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white font-mono">{new Date(tx.date).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">{new Date(tx.date).toLocaleTimeString()}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                          isTransfer ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          isTxIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {isTransfer ? <RefreshCw className="w-3.5 h-3.5" /> :
                           isTxIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{tx.description || 'Transaction'}</p>
                          {tx.referenceId && (
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">REF: {tx.referenceId}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.account ? (
                        <div>
                          <span className="font-semibold text-slate-300">{tx.account.accountName}</span>
                          <span className="block text-[10px] text-slate-500">{tx.account.accountType}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {tx.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-bold text-sm ${
                        isTransfer ? 'text-blue-400' :
                        isTxIn ? 'text-emerald-400' : 'text-rose-400'
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
            <div className="bg-slate-900/50 p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total transactions)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
