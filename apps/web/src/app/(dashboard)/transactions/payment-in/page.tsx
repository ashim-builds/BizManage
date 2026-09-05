'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentInSchema, CreatePaymentInInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import { usePaymentsIn, usePaymentsInSummary, useCreatePaymentIn, useVoidPaymentIn } from '@/services/paymentService';
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
  ArrowDownLeft,
  Plus,
  Search,
  Eye,
  X,
  TrendingUp,
  CheckCircle2,
  Clock,
  Receipt,
  Wallet,
  Calendar,
} from 'lucide-react';

export default function PaymentInPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<CreatePaymentInInput | null>(null);
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

  const parties = partiesData?.data || [];
  const accounts = accountsData?.data || [];
  const payments = paymentsResponse?.data || [];

  const form = useForm<CreatePaymentInInput>({
    resolver: zodResolver(createPaymentInSchema),
    defaultValues: {
      partyId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: PaymentMode.CASH,
    },
  });

  const selectedPartyId = form.watch('partyId');
  const selectedParty = parties.find((p: any) => p.id === selectedPartyId);

  const onSubmitInitiate = (data: CreatePaymentInInput) => {
    setPendingPaymentData(data);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingPaymentData) return;
    try {
      await createPaymentIn.mutateAsync(pendingPaymentData);
      setIsSaveConfirmOpen(false);
      setIsCreateOpen(false);
      setPendingPaymentData(null);
      form.reset({
        partyId: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: PaymentMode.CASH,
      });
      toast.success('Payment In recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record payment.');
    }
  };

  const handleVoid = (id: string) => {
    setVoidingPaymentId(id);
  };

  const handleConfirmVoid = async () => {
    if (!voidingPaymentId) return;
    try {
      setVoidError('');
      await voidPaymentIn.mutateAsync(voidingPaymentId);
      setVoidingPaymentId(null);
      toast.success('Payment voided successfully');
    } catch (err: any) {
      setVoidError(err.response?.data?.error?.message || 'Failed to void payment.');
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
      header: 'Customer Party',
      isPrimaryTitle: true,
      render: (p) => (
        <div>
          <span className="font-bold text-slate-900">{p.party?.name || 'Customer'}</span>
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
        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
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
      header: 'Amount Collected',
      align: 'right',
      isStatusBadge: true,
      render: (p) => (
        <span className={`font-mono font-bold text-sm ${p.status === 'VOIDED' ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
          + Rs. {Number(p.amount || 0).toLocaleString()}
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
            href={`/transactions/payment-in/${p.id}`}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 inline-block shadow-xs"
            title="View Receipt Voucher"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {p.status !== 'VOIDED' && (
            <button
              onClick={() => handleVoid(p.id)}
              disabled={voidPaymentIn.isPending}
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

  const renderMobileCard = (p: any) => (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      {/* Top Header: Customer info + Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 text-sm truncate">
              {p.party?.name || 'Cash Customer'}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{new Date(p.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`font-mono font-black text-sm block ${p.status === 'VOIDED' ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
            + Rs. {Number(p.amount || 0).toLocaleString()}
          </span>
          {p.status === 'VOIDED' && (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[9px] uppercase">
              Voided
            </span>
          )}
        </div>
      </div>

      {/* Middle Metadata Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100/80 text-xs">
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
          {p.mode}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium truncate max-w-[150px]">
          {p.account?.accountName || 'Cash Drawer'}
        </span>
        {p.referenceNumber && (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">
            Ref: {p.referenceNumber}
          </span>
        )}
      </div>

      {p.notes && (
        <p className="text-[11px] text-slate-500 italic bg-slate-50 rounded-xl p-2 border border-slate-100 truncate">
          {p.notes}
        </p>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Link
          href={`/transactions/payment-in/${p.id}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Voucher</span>
        </Link>
        {p.status !== 'VOIDED' && (
          <button
            type="button"
            onClick={() => handleVoid(p.id)}
            disabled={voidPaymentIn.isPending}
            className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold uppercase disabled:opacity-50 transition-all cursor-pointer"
          >
            Void
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
            Payment In (Customer Collections)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record customer settlements, direct payments, and reduce outstanding ledger dues.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Payment Received
        </button>
      </div>

      {/* Summary Cards: 1+2 Layout on Mobile (Hero + 2 Grid), 3-Column on Desktop */}
      {/* Mobile View (< md): All 3 metrics cleanly presented without truncation */}
      <div className="space-y-2 md:hidden">
        {/* Top Hero: Total Collections Received */}
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Total Collections Received</p>
            <p className="text-base font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
              Rs. {summaryLoading ? '...' : (summary?.totalPaymentsAmount || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {summary?.totalPaymentsCount || 0} Vouchers settled
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Breakdown Row (2 Columns): Total Vouchers + Today's Collections */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total Vouchers */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-blue-700 truncate">Total Vouchers</p>
              <p className="text-sm font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
                {summaryLoading ? '...' : (summary?.totalPaymentsCount || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-blue-600/80 font-semibold mt-0.5 truncate">Receipts</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Receipt className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Today's Collections */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-emerald-700 truncate">Today's Received</p>
              <p className="text-sm font-black font-mono text-emerald-700 mt-0.5 whitespace-nowrap">
                Rs. {summaryLoading ? '...' : (summary?.todayPaymentsAmount || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-emerald-600/80 font-semibold mt-0.5 truncate">Today</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View (>= md): 3 Full Width Cards */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-6">
        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Vouchers</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {summaryLoading ? '...' : (summary?.totalPaymentsCount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Payment receipts recorded</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collections Received</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.totalPaymentsAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Customer dues cleared</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Collections</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.todayPaymentsAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Received today</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
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
              selectedMode === '' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
        renderMobileCard={renderMobileCard}
        emptyTitle="No Payment In Records"
        emptyDescription="Record customer collections to decrease receivables and track cash inflows."
        emptyAction={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Record First Payment
          </button>
        }
      />

      {/* Record Payment In Modal */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in">
            <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col bg-white overflow-hidden shadow-2xl animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-emerald-50/70 border-b border-emerald-100/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Record Payment In</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        रकम प्राप्त
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Record customer dues settlement & ledger deposit</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <form id="payment-in-form" onSubmit={form.handleSubmit(onSubmitInitiate)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Customer Party <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...form.register('partyId')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px] cursor-pointer"
                    >
                      <option value="">-- Choose Customer --</option>
                      {parties.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({getPartyBalanceDisplay(p.currentBalance, 'CUSTOMER')})
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.partyId && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.partyId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount Received (Rs.) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">Rs.</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        {...form.register('amount', { valueAsNumber: true })}
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-base font-black focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px]"
                        placeholder="0.00"
                      />
                    </div>
                    {form.formState.errors.amount && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <DatePicker
                      label="Payment Date"
                      required
                      value={form.watch('date')}
                      onChange={(d) => form.setValue('date', d)}
                    />
                    {form.formState.errors.date && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.date.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
                      <select
                        {...form.register('mode')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px] cursor-pointer"
                      >
                        <option value={PaymentMode.CASH}>Cash (नगद)</option>
                        <option value={PaymentMode.BANK}>Bank (बैंक)</option>
                        <option value={PaymentMode.ONLINE}>Online (डिजिटल)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deposit Account</label>
                      <select
                        {...form.register('accountId')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px] cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Reference / Cheque No</label>
                    <input
                      type="text"
                      {...form.register('referenceNumber')}
                      placeholder="e.g. TXN987654 or Cheque #1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                    <textarea
                      rows={2}
                      {...form.register('notes')}
                      placeholder="e.g. Cleared bill INV-0042 balance"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs resize-none"
                    />
                  </div>
                </form>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 min-h-[44px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="payment-in-form"
                  disabled={createPaymentIn.isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 min-h-[44px] transition-all cursor-pointer"
                >
                  {createPaymentIn.isPending ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Save Confirm Modal */}
      {isSaveConfirmOpen && pendingPaymentData && (
        <SaveConfirmModal
          isOpen={true}
          title="Confirm Payment Collection"
          message={`Record collection of Rs. ${pendingPaymentData.amount.toLocaleString()} from ${selectedParty?.name || 'Customer'}?`}
          onConfirm={handleConfirmSave}
          onClose={() => setIsSaveConfirmOpen(false)}
          isLoading={createPaymentIn.isPending}
        />
      )}

      {/* Void Confirmation Modal */}
      {voidingPaymentId && (
        <ConfirmActionModal
          isOpen={true}
          title="Void Payment In Voucher"
          description="Are you sure you want to void this payment? The customer balance will be restored and money deducted from your account ledger."
          actionText="Yes, Void Payment"
          variant="danger"
          isProcessing={voidPaymentIn.isPending}
          error={voidError}
          onConfirm={handleConfirmVoid}
          onClose={() => setVoidingPaymentId(null)}
        />
      )}

      {/* Floating Bottom Center Action Button (Mobile) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 lg:hidden pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-600/40 border border-emerald-500/40 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Payment In (रकम प्राप्त)</span>
        </button>
      </div>
    </div>
  );
}
