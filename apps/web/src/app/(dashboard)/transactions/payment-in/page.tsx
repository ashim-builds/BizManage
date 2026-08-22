'use client';

import Link from 'next/link';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentInSchema, CreatePaymentInInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import { usePaymentsIn, usePaymentsInSummary, useCreatePaymentIn, useVoidPaymentIn } from '@/services/paymentService';
import { useParties } from '@/services/partyService';
import { useAccounts } from '@/services/accountService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { formatCurrency } from '@/lib/accounting';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { toast } from 'react-hot-toast';
import {
  ArrowDownLeft,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
  Building2,
  UserCheck,
  Eye,
} from 'lucide-react';

export default function PaymentInPage() {
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePaymentsInSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: accountsData } = useAccounts();
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
  const voidPaymentIn = useVoidPaymentIn();

  const handleVoid = (id: string) => {
    setVoidingPaymentId(id);
  };

  const parties = partiesData?.data || [];
  const accounts = accountsData?.data || [];

  const form = useForm<CreatePaymentInInput>({
    resolver: zodResolver(createPaymentInSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: PaymentMode.CASH,
    },
  });

  const watchPaymentMode = form.watch('mode');
  const desiredAccountType =
    watchPaymentMode === PaymentMode.BANK || watchPaymentMode === PaymentMode.CHEQUE
      ? 'BANK'
      : watchPaymentMode === PaymentMode.ONLINE
      ? 'MOBILE_WALLET'
      : 'CASH';

  const filteredAccounts = accounts.filter((a: any) => a.accountType === desiredAccountType);

  const handleCreateSubmit = async (data: CreatePaymentInInput) => {
    try {
      await createPaymentIn.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: PaymentMode.CASH,
      });
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record customer payment.');
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
      <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer name, ref number, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <CustomDateRangePicker
              startDate={startDate}
              endDate={endDate}
              preset={startDate || endDate ? 'custom' : 'all'}
              onApply={(s, e, p) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </div>
        </div>

        {/* Payment Mode Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold w-full md:w-auto">
          <button
            onClick={() => setSelectedMode('')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
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
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {payments.map((p: any) => (
              <div key={p.id} className={`p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm ${p.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                  <div className="font-semibold text-white font-mono text-sm">
                    {new Date(p.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'VOIDED' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                        Voided
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px] border border-emerald-500/20">
                      {p.mode}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{p.party?.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Acct: {p.account?.accountName || 'Cash'}
                      {p.referenceNumber ? ` • Ref: ${p.referenceNumber}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-base ${p.status === 'VOIDED' ? 'line-through text-slate-500' : 'text-emerald-400'}`}>
                      + Rs. {Number(p.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end items-center gap-1.5 pt-1">
                  <Link href={`/transactions/payment-in/${p.id}`} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  {p.status !== 'VOIDED' && (
                    <button
                      onClick={() => handleVoid(p.id)}
                      disabled={voidPaymentIn.isPending}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold uppercase disabled:opacity-50 transition-all"
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer Party</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Account / Ref</th>
                  <th className="px-6 py-4 text-right">Amount Collected</th>
                  <th className="px-6 py-4 text-right">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p: any) => (
                <tr key={p.id} className={`hover:bg-slate-800/40 transition-colors ${p.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-semibold text-white font-mono">
                      {new Date(p.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-slate-300 font-semibold">
                      {p.party?.name}
                      {p.status === 'VOIDED' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                          Voided
                        </span>
                      )}
                    </td>

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

                    <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${p.status === 'VOIDED' ? 'line-through text-slate-500' : 'text-emerald-400'}`}>
                      + Rs. {Number(p.amount || 0).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-400 font-sans">{p.notes || '-'}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/transactions/payment-in/${p.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block"
                          title="View Receipt Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {p.status !== 'VOIDED' && (
                          <button
                            onClick={() => handleVoid(p.id)}
                            disabled={voidPaymentIn.isPending}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold uppercase disabled:opacity-50 transition-all"
                            title="Void Payment (Restore Balances)"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                  <option value="">Select Party</option>
                  {parties.filter((c: any) => c.type === 'CUSTOMER').map((c: any) => {
                      const balLabel = getPartyBalanceDisplay(c.currentBalance, c.type);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({balLabel})
                        </option>
                      );
                    })}
                </select>
                {form.formState.errors.partyId && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.partyId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    label="Payment Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d)}
                  />
                  {form.formState.errors.date && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.date.message}</p>
                  )}
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

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account</label>
                  <select
                    {...form.register('accountId')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Default {desiredAccountType.replace('_', ' ')} Account</option>
                    {filteredAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)} Available
                      </option>
                    ))}
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

      <ConfirmActionModal
        isOpen={!!voidingPaymentId}
        onClose={() => { setVoidingPaymentId(null); setVoidError(''); }}
        title="Void Payment In"
        description="Are you sure you want to void this payment? This will reverse the account addition and update the customer balance."
        actionText="Void Payment"
        variant="warning"
        error={voidError}
        isProcessing={voidPaymentIn.isPending}
        onConfirm={async () => {
          if (!voidingPaymentId) return;
          setVoidError('');
          try {
            await voidPaymentIn.mutateAsync(voidingPaymentId);
            setVoidingPaymentId(null);
            toast.success('Payment voided successfully');
            refetch();
          } catch (err: any) {
            setVoidError(err.response?.data?.error?.message || 'Failed to void payment.');
          }
        }}
      />
    </div>
  );
}
