'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useLongPress } from '@/hooks/useLongPress';
import { LongPressActionSheet } from '@/components/ui/LongPressActionSheet';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSaleSchema, CreateSaleInput } from '@bizmanage/validation';
import { InvoiceStatus, PaymentMode, PartyType } from '@bizmanage/types';
import { useSales, useSalesSummary, useCreateSale, usePaySale } from '@/services/saleService';
import { useParties, useCreateParty } from '@/services/partyService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { useItems } from '@/services/itemService';
import { ItemSearchSelect } from '@/components/ui/ItemSearchSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAccounts } from '@/services/accountService';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { toast } from 'react-hot-toast';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import {
  TrendingUp,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Wallet,
  Receipt,
  AlertCircle,
  UserPlus,
  Percent,
  X,
  BanknoteIcon,
  QrCode,
} from 'lucide-react';

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | ''>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingSaleData, setPendingSaleData] = useState<CreateSaleInput | null>(null);

  // Long-press action sheet (mobile)
  const [longPressSale, setLongPressSale] = useState<any | null>(null);

  // Pay Due modal state
  const [payDueId, setPayDueId] = useState<string | null>(null);
  const [payDueAmount, setPayDueAmount] = useState(0);
  const [payDueMode, setPayDueMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [payDueCustomAmount, setPayDueCustomAmount] = useState('');

  // Quick Add Party state
  const [isQuickAddPartyOpen, setIsQuickAddPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = useSalesSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: itemsData } = useItems({ limit: 1000 });
  const { data: accountsData } = useAccounts();
  const {
    data: salesResponse,
    isLoading: salesLoading,
    isError,
    refetch,
  } = useSales({
    search,
    status: selectedStatus || undefined,
  });

  // Mutations
  const createSale = useCreateSale();
  const paySale = usePaySale();
  const createParty = useCreateParty();

  const handlePayDue = async () => {
    if (!payDueId) return;
    try {
      const amt = payDueCustomAmount ? Number(payDueCustomAmount) : undefined;
      await paySale.mutateAsync({ id: payDueId, amount: amt, paymentMode: payDueMode });
      setPayDueId(null);
      setPayDueCustomAmount('');
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Payment failed.');
    }
  };

  const customers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH'
  );
  const availableItems = itemsData?.data || [];
  const accounts = accountsData?.data || [];

  // Form
  const form = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isVatBill: false,
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items') || [];
  const watchIsVatBill = form.watch('isVatBill');
  const watchPaymentMode = form.watch('paymentMode');

  // Compute stock validation errors for the current form state
  const stockErrors = useMemo(() => {
    const qtyMap = new Map<string, number>();
    for (const line of watchItems) {
      if (!line?.itemId) continue;
      const cur = qtyMap.get(line.itemId) || 0;
      qtyMap.set(line.itemId, cur + Number(line.quantity || 0));
    }

    const errors: string[] = [];
    for (const [itemId, totalQty] of qtyMap.entries()) {
      const item = availableItems.find((i: any) => i.id === itemId);
      if (item && item.type === 'PRODUCT') {
        const stock = Number(item.currentStock || 0);
        if (stock <= 0) {
          errors.push(`"${item.name}" is out of stock (Available: 0 ${item.unit}). Cannot create bill.`);
        } else if (totalQty > stock) {
          errors.push(`"${item.name}" exceeds available inventory (Available: ${stock} ${item.unit}, Total Requested: ${totalQty} ${item.unit}).`);
        }
      }
    }
    return errors;
  }, [watchItems, availableItems]);

  const totals = calculateInvoiceTotals(
    watchItems.map((item) => ({
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      discountPercent: Number(item.discount || 0),
    })),
    watchIsVatBill
  );
  
  const { subTotal, discount, taxableAmount, taxAmount, totalAmount } = totals;

  useEffect(() => {
    if (isCreateOpen) {
      form.setValue('paidAmount', totalAmount);
    }
  }, [totalAmount, isCreateOpen]);

  const desiredAccountType =
    watchPaymentMode === PaymentMode.BANK || watchPaymentMode === PaymentMode.CHEQUE
      ? 'BANK'
      : watchPaymentMode === PaymentMode.ONLINE
      ? 'MOBILE_WALLET'
      : 'CASH';

  const filteredAccounts = accounts.filter((a: any) => a.accountType === desiredAccountType);

  const handleQuickAddPartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPartyName.trim()) return;

    const phoneVal = quickPartyPhone.trim();
    if (phoneVal && !/^(97|98)\d{8}$/.test(phoneVal)) {
      toast.error('Phone number must start with 97 or 98 and be exactly 10 digits (e.g. 9841234567).');
      return;
    }

    try {
      const newParty = await createParty.mutateAsync({
        name: quickPartyName.trim(),
        type: PartyType.CUSTOMER,
        phone: phoneVal || undefined,
        openingBalance: 0,
        openingBalanceType: 'RECEIVABLE',
      });
      form.setValue('partyId', newParty.id);
      setIsQuickAddPartyOpen(false);
      setQuickPartyName('');
      setQuickPartyPhone('');
      toast.success('Customer added successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add customer.');
    }
  };

  const handleSaleSaveRequest = (data: CreateSaleInput) => {
    // Client-side stock validation check
    const itemQtyMap = new Map<string, number>();
    for (const line of data.items) {
      if (!line.itemId) continue;
      const current = itemQtyMap.get(line.itemId) || 0;
      itemQtyMap.set(line.itemId, current + Number(line.quantity || 0));
    }

    for (const [itemId, totalQty] of itemQtyMap.entries()) {
      const sel = availableItems.find((i: any) => i.id === itemId);
      if (sel && sel.type === 'PRODUCT') {
        const stock = Number(sel.currentStock || 0);
        if (stock <= 0) {
          toast.error(`"${sel.name}" is out of stock (Available: 0 ${sel.unit}). Cannot create bill.`);
          return;
        }
        if (totalQty > stock) {
          toast.error(`Insufficient stock for "${sel.name}". Available: ${stock} ${sel.unit}, Total requested in bill: ${totalQty} ${sel.unit}.`);
          return;
        }
      }
    }

    setPendingSaleData(data);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSaleSave = () => {
    setIsSaveConfirmOpen(false);
    if (pendingSaleData) {
      handleCreateSubmit(pendingSaleData);
    }
  };

  const handleCreateSubmit = async (data: CreateSaleInput) => {
    try {
      const formattedItems = data.items.map((item) => {
        return {
          ...item,
          discountPercent: Number(item.discount || 0),
        };
      });

      await createSale.mutateAsync({
        ...data,
        items: formattedItems,
      });
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        isVatBill: false,
        paidAmount: 0,
        paymentMode: PaymentMode.CASH,
        items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
      });
      toast.success('Sales invoice issued successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to issue sales invoice.');
    }
  };

  const onItemSelect = (index: number, itemId: string) => {
    const selected = availableItems.find((i: any) => i.id === itemId);
    if (selected) {
      form.setValue(`items.${index}.unitPrice`, Number(selected.salePrice || 0));
    }
  };

  const sales = salesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Issue sales tax invoices to customers, decrease product stock, and manage customer receivables.
          </p>
        </div>
        <Link
          href="/transactions/sales/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> + Create Sale Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.totalSalesAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary?.totalSalesCount || 0} Invoices issued
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collected</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.totalCollected || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Received via Cash, Bank, Mobile Wallet</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Customer Receivables</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.totalReceivables || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary?.unpaidCount || 0} Outstanding due invoices
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setSelectedStatus('')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              selectedStatus === '' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus(InvoiceStatus.UNPAID)}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              selectedStatus === InvoiceStatus.UNPAID ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unpaid
          </button>
          <button
            onClick={() => setSelectedStatus(InvoiceStatus.PARTIAL)}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              selectedStatus === InvoiceStatus.PARTIAL ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partial
          </button>
          <button
            onClick={() => setSelectedStatus(InvoiceStatus.PAID)}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              selectedStatus === InvoiceStatus.PAID ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setSelectedStatus(InvoiceStatus.RETURNED)}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              selectedStatus === InvoiceStatus.RETURNED ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Returned
          </button>
        </div>
      </div>

      {/* Main Table */}
      {salesLoading ? (
        <LoadingState message="Loading sales invoices..." />
      ) : isError ? (
        <ErrorState title="Failed to load sales invoices" onRetry={refetch} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-7 h-7 text-blue-400" />}
          title="No Sales Invoices"
          description="Create sales invoices to process customer orders, update stock levels, and collect payments."
          actionLabel="Create Sale Invoice"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {sales.map((s: any) => (
              <MobileSaleCard
                key={s.id}
                sale={s}
                onLongPress={() => setLongPressSale(s)}
                onPay={(id, amount) => {
                  setPayDueId(id);
                  setPayDueAmount(amount);
                  setPayDueCustomAmount('');
                  setPayDueMode(PaymentMode.CASH);
                }}
              />
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-200/90 rounded-2xl overflow-x-auto overflow-y-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs min-w-[800px] border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 border-r border-slate-200">Invoice No / Date</th>
                  <th className="px-5 py-4 border-r border-slate-200">Customer Party</th>
                  <th className="px-4 py-4 text-center border-r border-slate-200">Items Count</th>
                  <th className="px-5 py-4 text-right border-r border-slate-200">Total Amount</th>
                  <th className="px-5 py-4 text-right border-r border-slate-200">Collected / Due</th>
                  <th className="px-4 py-4 text-center border-r border-slate-200">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s: any) => {
                const total = Number(s.totalAmount || 0);
                const paid = Number(s.paidAmount || 0);
                const due = Number(s.dueAmount || 0);

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-4 font-semibold text-slate-900 border-r border-slate-100">
                      <Link
                        href={`/transactions/sales/${s.id}`}
                        className="hover:text-blue-600 transition-colors flex items-center gap-2 font-mono font-bold text-blue-600"
                      >
                        {s.invoiceNumber}
                      </Link>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(s.date).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-800 font-semibold border-r border-slate-100">
                      {s.party?.name || 'Walk-in Customer'}
                    </td>

                    <td className="px-4 py-4 text-center text-slate-500 border-r border-slate-100">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                        {s.items?.length || 0} items
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                      Rs. {total.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right font-mono space-y-0.5 border-r border-slate-100">
                      <p className="text-emerald-600 text-[11px] font-bold">Paid: Rs. {paid.toLocaleString()}</p>
                      {due > 0 && <p className="text-amber-600 text-[11px] font-bold">Due: Rs. {due.toLocaleString()}</p>}
                    </td>

                    <td className="px-4 py-4 text-center border-r border-slate-100">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === InvoiceStatus.PAID
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === InvoiceStatus.PARTIAL
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : s.status === InvoiceStatus.RETURNED
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(s.status === InvoiceStatus.UNPAID || s.status === InvoiceStatus.PARTIAL) && (
                          <button
                            onClick={() => {
                              setPayDueId(s.id);
                              setPayDueAmount(Number(s.dueAmount || 0));
                              setPayDueCustomAmount('');
                              setPayDueMode(PaymentMode.CASH);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Settle Due Now"
                          >
                            <BanknoteIcon className="w-3 h-3" /> Pay Now
                          </button>
                        )}
                        <Link
                          href={`/transactions/sales/${s.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-block"
                          title="View Sale Tax Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* CREATE SALE INVOICE MODAL */}
      {isCreateOpen && (
        <ModalPortal><div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-400" /> New Sales Invoice
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stock availability will be validated and inventory decreased inside a transaction.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Auto-Numbering Active</span>
            </div>

            <form onSubmit={form.handleSubmit(handleSaleSaveRequest)} className="space-y-6">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Customer Party</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddPartyOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2 py-0.5 rounded-lg transition-all"
                    >
                      <UserPlus className="w-3 h-3 text-blue-400" /> + Quick Add Customer
                    </button>
                  </div>
                  <select
                    {...form.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c: any) => {
                      const balLabel = getPartyBalanceDisplay(c.currentBalance, 'CUSTOMER');
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

                <div>
                  <DatePicker
                    label="Invoice Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d)}
                  />
                  {form.formState.errors.date && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bill Type *</label>
                  <select
                    {...form.register('isVatBill', { setValueAs: (v) => v === 'true' || v === true })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  >
                    <option value="false">Normal Bill (No VAT)</option>
                    <option value="true">VAT / Tax Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Invoice No. (Optional)
                  </label>
                  <input
                    type="text"
                    {...form.register('invoiceNumber')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    placeholder="Auto-generated if left blank"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    Invoice Line Items
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>

                {/* Line Items Table Column Headers */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-3.5 py-2 bg-slate-800/60 rounded-xl border border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-4">Item & Available Stock</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price (Rs.)</div>
                  <div className="col-span-2">Discount (%)</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                <div className="space-y-2.5">
                  {fields.map((field, idx) => {
                    const selectedItemId = form.watch(`items.${idx}.itemId`);
                    const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);

                    const lineQty = form.watch(`items.${idx}.quantity`) || 0;
                    const linePrice = form.watch(`items.${idx}.unitPrice`) || 0;
                    const lineDiscPercent = form.watch(`items.${idx}.discount`) || 0;
                    const lineTax = form.watch(`items.${idx}.taxAmount`) || 0;

                    const lineSubtotal = lineQty * linePrice;
                    const lineDiscAmt = (lineSubtotal * lineDiscPercent) / 100;
                    const lineTotal = lineSubtotal - lineDiscAmt + lineTax;

                    const curStock = Number(selectedItem?.currentStock || 0);
                    const isProduct = selectedItem?.type === 'PRODUCT';
                    const isOutOfStock = isProduct && curStock <= 0;
                    const isInsufficientStock = isProduct && curStock > 0 && lineQty > curStock;
                    const isOverStock = isOutOfStock || isInsufficientStock;

                    return (
                      <div
                        key={field.id}
                        className={`grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl border transition-all ${
                          isOverStock
                            ? 'bg-rose-500/10 border-rose-500/40'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                        }`}
                      >
                        <div className="col-span-12 md:col-span-4">
                          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Item & Available Stock
                          </label>
                          <ItemSearchSelect
                            items={availableItems}
                            value={selectedItemId || ''}
                            onChange={(id) => {
                              form.setValue(`items.${idx}.itemId`, id);
                              onItemSelect(idx, id);
                            }}
                            placeholder="Search product…"
                            priceField="salePrice"
                          />
                          {selectedItem && (
                            <div className="flex items-center gap-2 mt-1.5 px-0.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  curStock <= 0
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : curStock <= Number(selectedItem.minStockAlert)
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {curStock <= 0 ? `Out of Stock (0 ${selectedItem.unit})` : `Stock: ${curStock} ${selectedItem.unit}`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                MRP: Rs. {Number(selectedItem.salePrice)}
                              </span>
                            </div>
                          )}
                          {isOutOfStock && (
                            <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 shrink-0" /> Out of stock! Available: 0 {selectedItem?.unit}. Cannot bill.
                            </p>
                          )}
                          {isInsufficientStock && (
                            <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 shrink-0" /> Insufficient stock ({curStock} {selectedItem?.unit} available, {lineQty} requested)
                            </p>
                          )}
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Quantity
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            placeholder="Qty"
                            {...form.register(`items.${idx}.quantity`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className={`w-full px-3 py-2 rounded-xl bg-slate-800/90 border text-white text-xs font-mono focus:outline-none focus:ring-2 transition-all ${
                              isOverStock
                                ? 'border-rose-500/80 focus:ring-rose-500/40 focus:border-rose-500'
                                : 'border-slate-700/80 focus:ring-blue-500/40 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Unit Price (Rs.)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            placeholder="Unit Price"
                            {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                          />
                          {Number(selectedItem?.wholesalePrice || 0) > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => form.setValue(`items.${idx}.unitPrice`, Number(selectedItem.salePrice || 0))}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  Number(linePrice) === Number(selectedItem.salePrice)
                                    ? 'bg-blue-500 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                }`}
                                title={`Set Retail Price (Rs. ${Number(selectedItem.salePrice)})`}
                              >
                                Retail
                              </button>
                              <button
                                type="button"
                                onClick={() => form.setValue(`items.${idx}.unitPrice`, Number(selectedItem.wholesalePrice || 0))}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  Number(linePrice) === Number(selectedItem.wholesalePrice)
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-purple-300 hover:text-white border border-slate-700'
                                }`}
                                title={`Set Wholesale Rate: Rs. ${Number(selectedItem.wholesalePrice)}`}
                              >
                                Wholesale
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Disc (%)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            placeholder="Disc %"
                            {...form.register(`items.${idx}.discount`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div className="col-span-8 md:col-span-1 text-left md:text-right font-mono font-bold text-white text-xs pt-1 md:pt-0">
                          <span className="block md:hidden text-[10px] text-slate-400 font-semibold mb-0.5">Line Total</span>
                          Rs. {formatCurrency(totals.items[idx]?.total ?? lineTotal)}
                        </div>

                        <div className="col-span-4 md:col-span-1 text-right flex items-center justify-end">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all flex items-center gap-1 text-xs"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="md:hidden">Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-400" /> Immediate Payment Collection
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Received Amount (Rs.)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        {...form.register('paidAmount', { valueAsNumber: true, onBlur: onNumericBlur })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Payment Mode</label>
                      <select
                        {...form.register('paymentMode')}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={PaymentMode.CASH}>Cash</option>
                        <option value={PaymentMode.BANK}>Bank Transfer</option>
                        <option value={PaymentMode.CHEQUE}>Cheque</option>
                        <option value={PaymentMode.ONLINE}>Mobile Wallet</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Deposit To Account</label>
                      <select
                        {...form.register('accountId')}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Default Account</option>
                        {filteredAccounts.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {formatCurrency(subTotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Total Discount</span>
                      <span className="font-mono">- Rs. {formatCurrency(discount)}</span>
                    </div>
                  )}

                  {watchIsVatBill && (
                    <>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Taxable Amount</span>
                        <span className="font-mono">Rs. {formatCurrency(taxableAmount)}</span>
                      </div>
                      <div className="flex justify-between text-blue-400">
                        <span>VAT (13%)</span>
                        <span className="font-mono">+ Rs. {formatCurrency(taxAmount)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                    <span>Grand Total</span>
                    <span className="font-mono text-blue-400">Rs. {formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Stock Warning Banner */}
              {stockErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-xs">Cannot Create Bill: Stock Unavailable</p>
                    <ul className="list-disc list-inside text-[11px] text-rose-300/90 mt-1 space-y-0.5">
                      {stockErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
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
                  disabled={createSale.isPending || stockErrors.length > 0}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={stockErrors.length > 0 ? 'Cannot issue bill: One or more products are out of stock or exceed inventory.' : ''}
                >
                  {createSale.isPending ? 'Processing Transaction...' : 'Save & Issue Sales Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickAddPartyOpen && (
        <ModalPortal><div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" /> Quick Add New Customer
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickAddPartyOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddPartySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer / Party Name *</label>
                <input
                  type="text"
                  required
                  value={quickPartyName}
                  onChange={(e) => setQuickPartyName(e.target.value)}
                  placeholder="e.g. Ram Bahadur or Acme Traders"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number (10 Digits starting with 97/98)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={quickPartyPhone}
                  onChange={(e) => setQuickPartyPhone(e.target.value)}
                  placeholder="e.g. 9841234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsQuickAddPartyOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createParty.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                >
                  {createParty.isPending ? 'Saving Customer...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* PAY DUE MODAL */}
      {payDueId && (
        <ModalPortal><div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <BanknoteIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Settle Invoice Due</h3>
                  <p className="text-[11px] text-slate-400">Outstanding: Rs. {payDueAmount.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setPayDueId(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount to Pay (Rs.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={onNumericKeyDown}
                                    onFocus={onNumericFocus}
                                    onBlur={onNumericBlur}
                                    min="0"
                  placeholder={`Full due: Rs. ${payDueAmount.toLocaleString()}`}
                  value={payDueCustomAmount}
                  onChange={(e) => setPayDueCustomAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave blank to pay full outstanding amount</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Mode</label>
                <select
                  value={payDueMode}
                  onChange={(e) => setPayDueMode(e.target.value as PaymentMode)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.BANK}>Bank Transfer</option>
                  <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPayDueId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayDue}
                  disabled={paySale.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <BanknoteIcon className="w-3.5 h-3.5" />
                  {paySale.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* SAVE CONFIRMATION MODAL */}
      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSaleSave}
        isLoading={createSale.isPending}
        title="Issue Sales Invoice?"
        message="Are you sure you want to issue this sales invoice? Stock will be updated and customer balance will be adjusted accordingly."
        confirmText="Confirm & Issue"
      />

      {/* Long-Press Action Sheet (Mobile) */}
      <LongPressActionSheet
        open={!!longPressSale}
        onClose={() => setLongPressSale(null)}
        title={longPressSale?.invoiceNumber}
        subtitle={longPressSale?.party?.name || 'Walk-in Customer'}
        onView={() => {
          if (longPressSale) window.location.href = `/transactions/sales/${longPressSale.id}`;
          setLongPressSale(null);
        }}
        actions={[
          {
            label: 'View Invoice',
            icon: <Eye className="w-5 h-5" />,
            onClick: () => { if (longPressSale) window.location.href = `/transactions/sales/${longPressSale.id}`; },
            variant: 'default',
          },
          ...(longPressSale && Number(longPressSale.dueAmount || 0) > 0 ? [{
            label: 'Collect Payment',
            icon: <BanknoteIcon className="w-5 h-5" />,
            onClick: () => {
              setPayDueId(longPressSale.id);
              setPayDueAmount(Number(longPressSale.dueAmount || 0));
              setPayDueCustomAmount('');
              setPayDueMode(PaymentMode.CASH);
              setLongPressSale(null);
            },
            variant: 'default' as const,
          }] : []),
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Mobile Sale Card with Long-Press
// ---------------------------------------------------------------------------

interface MobileSaleCardProps {
  sale: any;
  onLongPress: () => void;
  onPay: (id: string, amount: number) => void;
}

function MobileSaleCard({ sale: s, onLongPress, onPay }: MobileSaleCardProps) {
  const longPressHandlers = useLongPress(onLongPress, { delay: 600 });
  const total = Number(s.totalAmount || 0);
  const due = Number(s.dueAmount || 0);
  const totalQty = (s.items || []).reduce((acc: number, it: any) => acc + Number(it.quantity || 0), 0);
  const lineCount = s.items?.length || 0;

  return (
    <div
      {...longPressHandlers}
      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3 select-text"
    >
      {/* Top Row */}
      <div className="flex items-center justify-between">
        <div>
          <a href={`/transactions/sales/${s.id}`} className="font-bold text-slate-900 font-mono text-sm hover:text-blue-600">
            {s.invoiceNumber}
          </a>
          <p className="text-[10px] text-slate-400">{new Date(s.date).toLocaleDateString()}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            s.status === 'PAID'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : s.status === 'PARTIAL'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : s.status === 'RETURNED'
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {s.status}
        </span>
      </div>

      {/* Body */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-bold text-slate-800">{s.party?.name || 'Walk-in Customer'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalQty} {totalQty === 1 ? 'Pc' : 'Pcs'} ({lineCount} {lineCount === 1 ? 'item' : 'items'})</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-slate-900 text-base">Rs. {total.toLocaleString()}</p>
          {due > 0 ? (
            <p className="font-mono text-[10px] text-amber-600 font-bold mt-0.5">Due: Rs. {due.toLocaleString()}</p>
          ) : (
            <p className="font-mono text-[10px] text-emerald-600 font-bold mt-0.5">Paid In Full</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
        {due > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPay(s.id, due); }}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-100"
          >
            <BanknoteIcon className="w-3.5 h-3.5" /> Pay
          </button>
        )}
        <a href={`/transactions/sales/${s.id}`} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> View
        </a>
      </div>
    </div>
  );
}
