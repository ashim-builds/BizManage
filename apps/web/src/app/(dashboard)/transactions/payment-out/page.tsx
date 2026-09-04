'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentOutSchema, CreatePaymentOutInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import { usePaymentsOut, usePaymentsOutSummary, useCreatePaymentOut, useVoidPaymentOut } from '@/services/paymentService';
import { useParties } from '@/services/partyService';
import { useAccounts } from '@/services/accountService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { ModalPortal } from '@/components/common/ModalPortal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { ResponsiveDataTable, Column } from '@/components/common/ResponsiveDataTable';
import { toast } from 'react-hot-toast';
import {
  ArrowUpRight,
  Plus,
  Search,
  Eye,
  X,
} from 'lucide-react';

export default function PaymentOutPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<CreatePaymentOutInput | null>(null);
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePaymentsOutSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: accountsData } = useAccounts();
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
  const voidPaymentOut = useVoidPaymentOut();

  const parties = partiesData?.data || [];
  const accounts = accountsData?.data || [];
  const payments = paymentsResponse?.data || [];

  const form = useForm<CreatePaymentOutInput>({
    resolver: zodResolver(createPaymentOutSchema),
    defaultValues: {
      partyId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: PaymentMode.CASH,
    },
  });

  const selectedPartyId = form.watch('partyId');
  const selectedParty = parties.find((p: any) => p.id === selectedPartyId);

  const onSubmitInitiate = (data: CreatePaymentOutInput) => {
    setPendingPaymentData(data);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingPaymentData) return;
    try {
      await createPaymentOut.mutateAsync(pendingPaymentData);
      setIsSaveConfirmOpen(false);
      setIsCreateOpen(false);
      setPendingPaymentData(null);
      form.reset({
        partyId: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: PaymentMode.CASH,
      });
      toast.success('Payment Out recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record vendor payout.');
    }
  };

  const handleVoid = (id: string) => {
    setVoidingPaymentId(id);
  };

  const handleConfirmVoid = async () => {
    if (!voidingPaymentId) return;
    try {
      setVoidError('');
      await voidPaymentOut.mutateAsync(voidingPaymentId);
      setVoidingPaymentId(null);
      toast.success('Payment voided successfully');
    } catch (err: any) {
      setVoidError(err.response?.data?.error?.message || 'Failed to void payout.');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (p) => (
        <span className="font-mono text-slate-700 font-semibold">
          {new Date(p.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'party',
      header: 'Supplier Party',
      isPrimaryTitle: true,
      render: (p) => (
        <div>
          <span className="font-bold text-slate-900">{p.party?.name || 'Supplier'}</span>
          {p.status === 'VOIDED' && (
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Voided
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Payment Mode',
      render: (p) => (
        <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase text-[10px]">
          {p.mode}
        </span>
      ),
    },
    {
      key: 'account',
      header: 'Account / Ref',
      render: (p) => (
        <div className="font-mono text-slate-600 text-xs">
          {p.account?.accountName || 'Cash Drawer'}
          {p.referenceNumber && <span className="text-[10px] text-slate-400 block">Ref: {p.referenceNumber}</span>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      align: 'right',
      isStatusBadge: true,
      render: (p) => (
        <span className={`font-mono font-bold text-sm ${p.status === 'VOIDED' ? 'line-through text-slate-400' : 'text-rose-600'}`}>
          - Rs. {Number(p.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      mobileHidden: true,
      render: (p) => <span className="text-slate-500 italic truncate block max-w-xs">{p.notes || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/transactions/payment-out/${p.id}`}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 inline-block shadow-xs"
            title="View Payout Voucher"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {p.status !== 'VOIDED' && (
            <button
              onClick={() => handleVoid(p.id)}
              disabled={voidPaymentOut.isPending}
              className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[10px] font-bold uppercase disabled:opacity-50 transition-all shadow-xs"
              title="Void Payment"
            >
              Void
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ArrowUpRight className="w-6 h-6 text-rose-600" />
            Payment Out (Supplier Payouts)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record payments to vendors, clear purchase bills, and manage cash outflows.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Payment Out
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Vouchers</p>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {summaryLoading ? '...' : (summary?.totalPaymentsCount || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Vendor Payouts</p>
          <p className="text-2xl font-bold text-rose-600 font-mono mt-1">
            {summaryLoading ? '...' : `Rs. ${(summary?.totalPaymentsAmount || 0).toLocaleString()}`}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Today's Payouts</p>
          <p className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {summaryLoading ? '...' : `Rs. ${(summary?.todayPaymentsAmount || 0).toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none"
            />
          </div>

          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            preset={preset}
            onApply={(s, e, p) => {
              setStartDate(s);
              setEndDate(e);
              if (p) setPreset(p as any);
            }}
          />
        </div>

        {/* Payment Mode Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setSelectedMode('')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      {/* Main Table */}
      <ResponsiveDataTable
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        isLoading={paymentsLoading}
        emptyTitle="No Payment Out Records"
        emptyDescription="Record supplier settlements and vendor payouts to track business cash outflows."
        emptyAction={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Record First Payout
          </button>
        }
      />

      {/* Record Payment Out Modal */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" /> Record Payment Out
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={form.handleSubmit(onSubmitInitiate)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Party *</label>
                  <select
                    {...form.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {parties.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({getPartyBalanceDisplay(p.currentBalance, 'SUPPLIER')})
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.partyId && (
                    <p className="text-xs text-rose-500 mt-1">{form.formState.errors.partyId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    {...form.register('amount', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold focus:outline-none"
                    placeholder="0.00"
                  />
                  {form.formState.errors.amount && (
                    <p className="text-xs text-rose-500 mt-1">{form.formState.errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <DatePicker
                    label="Payment Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      {...form.register('mode')}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank</option>
                      <option value={PaymentMode.ONLINE}>Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deduct From Account</label>
                    <select
                      {...form.register('accountId')}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                    >
                      <option value="">Default Account</option>
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Cheque No</label>
                  <input
                    type="text"
                    {...form.register('referenceNumber')}
                    placeholder="e.g. TXN987654 or Cheque #1234"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    {...form.register('notes')}
                    placeholder="e.g. Cleared bill PUR-1002 balance"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                  >
                    Record Payout
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Save Confirm Modal */}
      {isSaveConfirmOpen && pendingPaymentData && (
        <SaveConfirmModal
          isOpen={true}
          title="Confirm Supplier Payout"
          message={`Record payout of Rs. ${pendingPaymentData.amount.toLocaleString()} to ${selectedParty?.name || 'Supplier'}?`}
          onConfirm={handleConfirmSave}
          onClose={() => setIsSaveConfirmOpen(false)}
          isLoading={createPaymentOut.isPending}
        />
      )}

      {/* Void Confirmation Modal */}
      {voidingPaymentId && (
        <ConfirmActionModal
          isOpen={true}
          title="Void Payment Out Voucher"
          description="Are you sure you want to void this payout? The supplier payable balance will be increased and money refunded to your account ledger."
          actionText="Yes, Void Payout"
          variant="danger"
          isProcessing={voidPaymentOut.isPending}
          error={voidError}
          onConfirm={handleConfirmVoid}
          onClose={() => setVoidingPaymentId(null)}
        />
      )}
    </div>
  );
}
