'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';;
import { createPurchaseSchema, CreatePurchaseInput } from '@bizmanage/validation';
import { InvoiceStatus, PaymentMode } from '@bizmanage/types';
import {
  usePurchases,
  usePurchasesSummary,
  useCreatePurchase,
  usePayPurchase,
} from '@/services/purchaseService';
import { useParties } from '@/services/partyService';
import { useItems } from '@/services/itemService';
import { useAccounts } from '@/services/accountService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Wallet,
  Receipt,
  X,
  Package,
  AlertCircle,
  BanknoteIcon,
} from 'lucide-react';

const VAT_RATE = 0.13;

export default function PurchasesPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | ''>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVatBill, setIsVatBill] = useState(false);

  // Pay Due modal state
  const [payDueId, setPayDueId] = useState<string | null>(null);
  const [payDueAmount, setPayDueAmount] = useState(0);
  const [payDueMode, setPayDueMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [payDueCustomAmount, setPayDueCustomAmount] = useState('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePurchasesSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: itemsData } = useItems({ limit: 100 });
  const { data: accountsData } = useAccounts();
  const {
    data: purchasesResponse,
    isLoading: purchasesLoading,
    isError,
    refetch,
  } = usePurchases({ search, status: selectedStatus || undefined });

  const createPurchase = useCreatePurchase();
  const payPurchase = usePayPurchase();

  const handlePayDue = async () => {
    if (!payDueId) return;
    try {
      const amt = payDueCustomAmount ? Number(payDueCustomAmount) : undefined;
      await payPurchase.mutateAsync({ id: payDueId, amount: amt, paymentMode: payDueMode });
      setPayDueId(null);
      setPayDueCustomAmount('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Payment failed.');
    }
  };

  const suppliers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'
  );
  const availableItems = itemsData?.data || [];
  const accounts = accountsData?.data || [];

  // Form
  const form = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchItems = form.watch('items');
  const watchPaymentMode = form.watch('paymentMode');

  // Compute live invoice totals (discount as %)
  const subTotal = watchItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const totalDiscountAmt = watchItems.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    const dPct = Number(item.discount) || 0;
    return acc + (q * p * dPct) / 100;
  }, 0);
  const taxableAmount = subTotal - totalDiscountAmt;
  const vatAmount = isVatBill ? taxableAmount * VAT_RATE : 0;
  const grandTotal = taxableAmount + vatAmount;

  // Auto-fill paid amount = grand total
  useEffect(() => {
    if (isCreateOpen) form.setValue('paidAmount', grandTotal);
  }, [grandTotal, isCreateOpen]);

  const handleCreateSubmit = async (data: CreatePurchaseInput) => {
    try {
      // Convert % discount → Rs. amount per line before sending
      const formattedItems = data.items.map((item) => {
        const q = Number(item.quantity || 0);
        const p = Number(item.unitPrice || 0);
        const dPct = Number(item.discount || 0);
        const dAmt = (q * p * dPct) / 100;
        // VAT tax on this line if isVatBill
        const lineSubtotal = q * p - dAmt;
        const lineTax = isVatBill ? lineSubtotal * VAT_RATE : 0;
        return { ...item, discount: dAmt, taxAmount: lineTax };
      });
      await createPurchase.mutateAsync({ ...data, items: formattedItems });
      setIsCreateOpen(false);
      setIsVatBill(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        paidAmount: 0,
        paymentMode: PaymentMode.CASH,
        items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record purchase bill.');
    }
  };

  const onItemSelect = (index: number, itemId: string) => {
    const selected = availableItems.find((i: any) => i.id === itemId);
    if (selected) {
      form.setValue(`items.${index}.unitPrice`, Number(selected.purchasePrice || 0));
    }
  };

  // Find accounts matching payment mode
  const filteredAccounts = accounts.filter((a) => {
    if (watchPaymentMode === PaymentMode.BANK || watchPaymentMode === PaymentMode.CHEQUE)
      return a.accountType === 'BANK';
    if (watchPaymentMode === PaymentMode.ONLINE) return a.accountType === 'MOBILE_WALLET';
    return a.accountType === 'CASH';
  });

  const purchases = purchasesResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Bills</h1>
          <p className="text-sm text-slate-400 mt-1">
            Record goods & inventory purchases from suppliers, track payables, and record cash payouts.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> + Create Purchase Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalPurchaseAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{summary?.totalPurchasesCount || 0} Bills recorded</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Paid Out</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalPaid || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Cash & bank payments made</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Supplier Payables</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalDue || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{summary?.unpaidCount || 0} Unpaid / Partial bills</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bill number or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
          {(['', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatus === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {purchasesLoading ? (
        <LoadingState message="Loading purchase records..." />
      ) : isError ? (
        <ErrorState title="Failed to load purchases" onRetry={refetch} />
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7 text-purple-400" />}
          title="No Purchase Bills"
          description="Create purchase bills to track inventory restocks and supplier payables."
          actionLabel="Create Purchase Bill"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">BILL NO / DATE</th>
                <th className="px-6 py-4">SUPPLIER</th>
                <th className="px-6 py-4">ITEMS</th>
                <th className="px-6 py-4 text-right">TOTAL AMOUNT</th>
                <th className="px-6 py-4 text-right">PAID / DUE</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases.map((p: any) => {
                const total = Number(p.totalAmount || 0);
                const paid = Number(p.paidAmount || 0);
                const due = Number(p.dueAmount || 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-white">
                      <Link
                        href={`/transactions/purchases/${p.id}`}
                        className="hover:text-blue-400 transition-colors flex items-center gap-2 font-mono"
                      >
                        {p.billNumber}
                      </Link>
                      <p className="text-[10px] text-slate-500 mt-0.5">{new Date(p.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{p.party?.name || 'Unknown Supplier'}</td>
                    <td className="px-6 py-4 text-slate-400">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {p.items?.length || 0} items
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white">
                      Rs. {total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono space-y-0.5">
                      <p className="text-emerald-400 text-[11px]">Paid: Rs. {paid.toLocaleString()}</p>
                      {due > 0 && <p className="text-rose-400 text-[11px]">Due: Rs. {due.toLocaleString()}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === InvoiceStatus.PAID
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === InvoiceStatus.PARTIAL
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(p.status === InvoiceStatus.UNPAID || p.status === InvoiceStatus.PARTIAL) && (
                          <button
                            onClick={() => {
                              setPayDueId(p.id);
                              setPayDueAmount(Number(p.dueAmount || 0));
                              setPayDueCustomAmount('');
                              setPayDueMode(PaymentMode.CASH);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Settle Due Now"
                          >
                            <BanknoteIcon className="w-3 h-3" /> Pay Now
                          </button>
                        )}
                        <Link
                          href={`/transactions/purchases/${p.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block"
                          title="View Purchase Bill"
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
      )}

      {/* CREATE PURCHASE BILL MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">New Purchase Bill</h3>
                  <p className="text-[11px] text-slate-400">Stock increases & payables update automatically</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* VAT Bill Toggle */}
                <button
                  type="button"
                  onClick={() => setIsVatBill(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isVatBill
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  VAT Bill (13%)
                </button>
                <button
                  onClick={() => { setIsCreateOpen(false); setIsVatBill(false); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="p-6 space-y-6">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supplier Party *</label>
                  <select
                    {...form.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.partyId && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.partyId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bill Date *</label>
                  <input
                    type="date"
                    {...form.register('date')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bill Ref No. (Optional)</label>
                  <input
                    type="text"
                    {...form.register('billNumber')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bill Line Items</h4>
                  <button
                    type="button"
                    onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 })}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                {/* Table Headers */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 rounded-lg bg-slate-800/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4">ITEM & AVAILABLE STOCK</div>
                  <div className="col-span-2">QUANTITY</div>
                  <div className="col-span-2">COST RATE (Rs.)</div>
                  <div className="col-span-1">DISC %</div>
                  <div className="col-span-2 text-right">LINE TOTAL</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                  {fields.map((field, idx) => {
                    const selItemId = form.watch(`items.${idx}.itemId`);
                    const selItem = availableItems.find((i: any) => i.id === selItemId);
                    const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
                    const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;
                    const lineDiscPct = Number(form.watch(`items.${idx}.discount`)) || 0;
                    const lineDiscAmt = (lineQty * linePrice * lineDiscPct) / 100;
                    const lineSubtotal = lineQty * linePrice - lineDiscAmt;
                    const lineTax = isVatBill ? lineSubtotal * VAT_RATE : 0;
                    const lineTotal = lineSubtotal + lineTax;

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all"
                      >
                        {/* Item Select */}
                        <div className="col-span-12 md:col-span-4">
                          <select
                            {...form.register(`items.${idx}.itemId`)}
                            onChange={(e) => {
                              form.register(`items.${idx}.itemId`).onChange(e);
                              onItemSelect(idx, e.target.value);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          >
                            <option value="">Select Item</option>
                            {availableItems.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                          {selItem && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-semibold">
                                <Package className="w-2.5 h-2.5" />
                                Stock: {Number(selItem.currentStock || 0).toLocaleString()} {selItem.unit}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                MRP: Rs. {Number(selItem.salePrice || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="md:hidden text-[10px] font-semibold text-slate-500 mb-1 block">QTY</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Qty"
                            {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                            className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="md:hidden text-[10px] font-semibold text-slate-500 mb-1 block">RATE (Rs.)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Cost Price"
                            {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                            className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          />
                        </div>

                        {/* Discount % */}
                        <div className="col-span-4 md:col-span-1">
                          <label className="md:hidden text-[10px] font-semibold text-slate-500 mb-1 block">DISC %</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              placeholder="0"
                              {...form.register(`items.${idx}.discount`, { valueAsNumber: true })}
                              className="w-full pl-2.5 pr-5 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                            />
                            <span className="absolute right-2 top-2 text-slate-500 text-[10px]">%</span>
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="col-span-10 md:col-span-2 flex flex-col justify-center">
                          <p className="text-right font-mono font-bold text-white text-xs">
                            Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {lineDiscAmt > 0 && (
                            <p className="text-right text-[10px] text-rose-400 font-mono">
                              -Rs. {lineDiscAmt.toFixed(2)} disc
                            </p>
                          )}
                          {lineTax > 0 && (
                            <p className="text-right text-[10px] text-amber-400 font-mono">
                              +Rs. {lineTax.toFixed(2)} VAT
                            </p>
                          )}
                        </div>

                        {/* Remove */}
                        <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill Summary + Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
                {/* Payment Section */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-400" /> Payment Details
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Payment Mode</label>
                    <select
                      {...form.register('paymentMode')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank Transfer</option>
                      <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                      <option value={PaymentMode.CHEQUE}>Cheque</option>
                    </select>
                  </div>

                  {/* Account Selector */}
                  {filteredAccounts.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                        Pay From Account
                      </label>
                      <select
                        {...form.register('accountId')}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Auto-select</option>
                        {filteredAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.accountName} — Rs. {Number(a.balance).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Paid Amount (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      {...form.register('paidAmount', { valueAsNumber: true })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Remaining amount will be recorded as supplier due
                    </p>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-700 space-y-2.5 text-xs">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">Bill Summary</h4>
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {totalDiscountAmt > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Discount</span>
                      <span className="font-mono">− Rs. {totalDiscountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {isVatBill && (
                    <>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                        <span>Taxable Amount</span>
                        <span className="font-mono">Rs. {taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-amber-400">
                        <span>VAT (13%)</span>
                        <span className="font-mono">+ Rs. {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-700 mt-1">
                    <span>Grand Total</span>
                    <span className="font-mono text-blue-400">Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {isVatBill && (
                    <div className="pt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> VAT Invoice — 13% Tax Applied
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notes (Optional)</label>
                <textarea
                  {...form.register('notes')}
                  rows={2}
                  placeholder="Any additional remarks about this purchase..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setIsVatBill(false); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPurchase.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {createPurchase.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Save {isVatBill ? 'VAT ' : ''}Purchase Bill
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY DUE MODAL */}
      {payDueId && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <BanknoteIcon className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Settle Purchase Due</h3>
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
                  type="number"
                  step="any"
                  min="0"
                  placeholder={`Full due: Rs. ${payDueAmount.toLocaleString()}`}
                  value={payDueCustomAmount}
                  onChange={(e) => setPayDueCustomAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave blank to pay full outstanding amount</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Mode</label>
                <select
                  value={payDueMode}
                  onChange={(e) => setPayDueMode(e.target.value as PaymentMode)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all"
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
                  disabled={payPurchase.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <BanknoteIcon className="w-3.5 h-3.5" />
                  {payPurchase.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
