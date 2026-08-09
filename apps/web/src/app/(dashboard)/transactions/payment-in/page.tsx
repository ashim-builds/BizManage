'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentInSchema, CreatePaymentInInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import {
  usePaymentsIn,
  usePaymentsInSummary,
  useCreatePaymentIn,
} from '@/services/paymentService';
import { useParties } from '@/services/partyService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import {
  ArrowDownLeft,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
  Building2,
  UserCheck,
} from 'lucide-react';

export default function PaymentInPage() {
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePaymentsInSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const {
    data: paymentsResponse,
    isLoading: paymentsLoading,
    isError,
    refetch,
  } = usePaymentsIn({
    search,
    mode: selectedMode || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Mutations
  const createPaymentIn = useCreatePaymentIn();

  const customers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH'
  );

  const form = useForm<CreatePaymentInInput>({
    resolver: zodResolver(createPaymentInSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: PaymentMode.CASH,
    },
  });

  const handleCreateSubmit = async (data: CreatePaymentInInput) => {
    try {
      await createPaymentIn.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: PaymentMode.CASH,
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record customer payment.');
    }
  };

  const payments = paymentsResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Payment In Vouchers <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record direct money received from customers, reduce outstanding receivables, and update cash/bank balance.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> + Record Payment Received
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customer Collections</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalCollectedAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalVouchersCount || 0} Payment vouchers issued
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected Today</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.todayCollectedAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Real-time daily collection ledger</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Debt Settlement</p>
            <h3 className="text-2xl font-bold text-slate-300 mt-1">Active Ledger</h3>
            <p className="text-[11px] text-slate-500 mt-1">Adjusts party balance & cashflow</p>
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
              placeholder="Search customer name, ref number, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              selectedMode === '' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
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
          icon={<ArrowDownLeft className="w-7 h-7 text-emerald-400" />}
          title="No Payment In Records"
          description="Record customer collections to decrease receivables and track cash inflows."
          actionLabel="Record Payment Received"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer Party</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4">Account / Ref</th>
                <th className="px-6 py-4 text-right">Amount Collected</th>
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
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px] border border-emerald-500/20">
                      {p.mode}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-400 font-mono">
                    {p.account?.accountName || 'Cash'}
                    {p.referenceNumber && (
                      <span className="text-[10px] text-slate-500 block">Ref: {p.referenceNumber}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    + Rs. {Number(p.amount || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-400 font-sans">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RECORD PAYMENT IN MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> Record Customer Payment (In)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Reduces customer balance and increases cash/bank account balance inside a transaction.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Party *</label>
                <select
                  {...form.register('partyId')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: Rs. {Number(c.currentBalance || 0).toLocaleString()})
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                  <select
                    {...form.register('mode')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 5000"
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
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. CHQ-991823"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Ledger Description</label>
                <textarea
                  rows={2}
                  {...form.register('notes')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Received partial payment against outstanding invoice..."
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
                  disabled={createPaymentIn.isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {createPaymentIn.isPending ? 'Saving...' : 'Record Payment In'}
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
