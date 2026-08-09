'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentOutSchema, CreatePaymentOutInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import {
  usePaymentsOut,
  usePaymentsOutSummary,
  useCreatePaymentOut,
} from '@/services/paymentService';
import { useParties } from '@/services/partyService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import {
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle2,
  Wallet,
  Building2,
  UserCheck,
} from 'lucide-react';

export default function PaymentOutPage() {
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePaymentsOutSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const {
    data: paymentsResponse,
    isLoading: paymentsLoading,
    isError,
    refetch,
  } = usePaymentsOut({
    search,
    mode: selectedMode || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Mutations
  const createPaymentOut = useCreatePaymentOut();

  const suppliers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'
  );

  const form = useForm<CreatePaymentOutInput>({
    resolver: zodResolver(createPaymentOutSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: PaymentMode.CASH,
    },
  });

  const handleCreateSubmit = async (data: CreatePaymentOutInput) => {
    try {
      await createPaymentOut.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: PaymentMode.CASH,
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record supplier payment.');
    }
  };

  const payments = paymentsResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Payment Out Vouchers <ArrowUpRight className="w-6 h-6 text-rose-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record direct money paid out to suppliers, reduce vendor payables, and update cash/bank balance.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all shadow-lg shadow-rose-600/20"
        >
          <Plus className="w-4 h-4" /> + Record Payment Made
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Supplier Payouts</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalPaidAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalVouchersCount || 0} Payment vouchers issued
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Today</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.todayPaidAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Real-time daily payout ledger</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplier Debt Clearance</p>
            <h3 className="text-2xl font-bold text-slate-300 mt-1">Active Ledger</h3>
            <p className="text-[11px] text-slate-500 mt-1">Adjusts vendor balance & cashflow</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search supplier name, ref number, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            title="End Date"
          />
        </div>

        {/* Payment Mode Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setSelectedMode('')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      {/* Main Table */}
      {paymentsLoading ? (
        <LoadingState message="Loading payment vouchers..." />
      ) : isError ? (
        <ErrorState title="Failed to load payment records" onRetry={refetch} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight className="w-7 h-7 text-rose-400" />}
          title="No Payment Out Records"
          description="Record payouts made to vendors and suppliers to reduce payables."
          actionLabel="Record Payment Made"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Supplier Party</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4">Account / Ref</th>
                <th className="px-6 py-4 text-right">Amount Paid</th>
                <th className="px-6 py-4 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white font-mono">
                    {new Date(p.date).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-slate-300 font-semibold">{p.party?.name}</td>

                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold uppercase text-[10px] border border-rose-500/20">
                      {p.mode}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-400 font-mono">
                    {p.account?.accountName || 'Cash'}
                    {p.referenceNumber && (
                      <span className="text-[10px] text-slate-500 block">Ref: {p.referenceNumber}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-mono font-bold text-rose-400 text-sm">
                    - Rs. {Number(p.amount || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-400 font-sans">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RECORD PAYMENT OUT MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-400" /> Record Supplier Payment (Out)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Reduces supplier payable balance and deducts from cash/bank account balance inside a transaction.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Party *</label>
                <select
                  {...form.register('partyId')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: Rs. {Math.abs(Number(s.currentBalance || 0)).toLocaleString()})
                    </option>
                  ))}
                </select>
                {form.formState.errors.partyId && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.partyId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    {...form.register('date')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                  <select
                    {...form.register('mode')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Paid (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. 10000"
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ref No / Cheque No / Txn ID
                </label>
                <input
                  type="text"
                  {...form.register('referenceNumber')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. CHQ-551920"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Ledger Description</label>
                <textarea
                  rows={2}
                  {...form.register('notes')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. Paid vendor against bill restock settlement..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPaymentOut.isPending}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {createPaymentOut.isPending ? 'Saving...' : 'Record Payment Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
