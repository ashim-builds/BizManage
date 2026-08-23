'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';;
import { createPurchaseSchema, CreatePurchaseInput } from '@bizmanage/validation';
import { InvoiceStatus, PaymentMode, ItemType } from '@bizmanage/types';
import {
  usePurchases,
  usePurchasesSummary,
  useCreatePurchase,
  usePayPurchase,
} from '@/services/purchaseService';
import { useParties } from '@/services/partyService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { useItems, useCreateItem } from '@/services/itemService';
import { ItemSearchSelect } from '@/components/ui/ItemSearchSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAccounts } from '@/services/accountService';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { toast } from 'react-hot-toast';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/ui/ModalPortal';
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
  const [payDueCustomAmount, setPayDueCustomAmount] = useState('');

  // Quick Create Item modal state
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [targetItemRowIdx, setTargetItemRowIdx] = useState<number>(0);
  const [quickItemData, setQuickItemData] = useState({
    name: '',
    code: '',
    unit: 'Pcs',
    purchasePrice: 0,
    salePrice: 0,
  });

  const createItemMutation = useCreateItem();

  const handleQuickCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemData.name.trim()) return;
    try {
      const created = await createItemMutation.mutateAsync({
        name: quickItemData.name.trim(),
        code: quickItemData.code?.trim() || undefined,
        type: ItemType.PRODUCT,
        unit: quickItemData.unit || 'Pcs',
        purchasePrice: Number(quickItemData.purchasePrice || 0),
        salePrice: Number(quickItemData.salePrice || 0),
        openingStock: 0,
        minStockAlert: 0,
      });

      if (created && created.id) {
        form.setValue(`items.${targetItemRowIdx}.itemId`, created.id);
        form.setValue(`items.${targetItemRowIdx}.unitPrice`, Number(created.purchasePrice || 0));
        toast.success(`Product "${created.name}" created & added to bill!`);
      }
      setIsQuickItemOpen(false);
      setQuickItemData({ name: '', code: '', unit: 'Pcs', purchasePrice: 0, salePrice: 0 });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create product.');
    }
  };

  // Pay Due modal state
  const [payDueId, setPayDueId] = useState<string | null>(null);
  const [payDueAmount, setPayDueAmount] = useState(0);
  const [payDueMode, setPayDueMode] = useState<PaymentMode>(PaymentMode.CASH);

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePurchasesSummary();
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: itemsData } = useItems({ limit: 1000 });
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
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Payment failed.');
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
      isVatBill: false,
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchItems = form.watch('items');
  const watchPaymentMode = form.watch('paymentMode');

  const desiredAccountType =
    watchPaymentMode === PaymentMode.BANK || watchPaymentMode === PaymentMode.CHEQUE
      ? 'BANK'
      : watchPaymentMode === PaymentMode.ONLINE
      ? 'MOBILE_WALLET'
      : 'CASH';

  const filteredAccounts = accounts.filter((a: any) => a.accountType === desiredAccountType);

  const watchIsVatBill = form.watch('isVatBill');

  const mappedItems = watchItems.map((item) => ({
    unitPrice: Number(item.unitPrice) || 0,
    quantity: Number(item.quantity) || 0,
    discountPercent: Number(item.discount) || 0,
  }));

  const totals = calculateInvoiceTotals(mappedItems, watchIsVatBill);
  const { subTotal, discount, taxableAmount, taxAmount, totalAmount } = totals;

  // Auto-fill paid amount = grand total
  useEffect(() => {
    if (isCreateOpen) form.setValue('paidAmount', totalAmount);
  }, [totalAmount, isCreateOpen]);

  const handleCreateSubmit = async (data: CreatePurchaseInput) => {
    try {
      // Convert % discount → Rs. amount per line before sending
      const formattedItems = data.items.map((item) => {
        return { 
          ...item, 
          discountPercent: Number(item.discount || 0),
        };
      });
      await createPurchase.mutateAsync({ ...data, items: formattedItems });
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        isVatBill: false,
        paidAmount: 0,
        paymentMode: PaymentMode.CASH,
        items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
      });
      toast.success('Purchase bill recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record purchase bill.');
    }
  };

  const onItemSelect = (index: number, itemId: string) => {
    const selected = availableItems.find((i: any) => i.id === itemId);
    if (selected) {
      form.setValue(`items.${index}.unitPrice`, Number(selected.purchasePrice || 0));
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bill number or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold w-full md:w-auto">
          {(['', 'UNPAID', 'PARTIAL', 'PAID', 'RETURNED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s as any)}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
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
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {purchases.map((p: any) => {
              const total = Number(p.totalAmount || 0);
              const due = Number(p.dueAmount || 0);

              return (
                <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                    <div>
                      <Link href={`/transactions/purchases/${p.id}`} className="font-bold text-blue-400 hover:text-blue-300 font-mono text-sm">
                        {p.billNumber}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">{new Date(p.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      p.status === InvoiceStatus.PAID ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : p.status === InvoiceStatus.PARTIAL ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : p.status === InvoiceStatus.RETURNED ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  
                  {/* Body */}
                  <div className="flex justify-between items-center">
                     <div>
                       <p className="text-sm font-semibold text-slate-200">{p.party?.name || 'Unknown Supplier'}</p>
                       <p className="text-xs text-slate-500 mt-0.5">{p.items?.length || 0} items</p>
                     </div>
                     <div className="text-right">
                       <p className="font-mono font-bold text-white text-base">Rs. {total.toLocaleString()}</p>
                       {due > 0 ? (
                         <p className="font-mono text-[10px] text-rose-400 mt-0.5">Due: Rs. {due.toLocaleString()}</p>
                       ) : (
                         <p className="font-mono text-[10px] text-emerald-400 mt-0.5">Paid In Full</p>
                       )}
                     </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end items-center gap-2 pt-1">
                     {(p.status === InvoiceStatus.UNPAID || p.status === InvoiceStatus.PARTIAL) && (
                       <button onClick={() => {
                          setPayDueId(p.id);
                          setPayDueAmount(Number(p.dueAmount || 0));
                          setPayDueCustomAmount('');
                          setPayDueMode(PaymentMode.CASH);
                       }} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold flex items-center gap-1.5 hover:bg-rose-500/20">
                         <BanknoteIcon className="w-3.5 h-3.5" /> Pay Now
                       </button>
                     )}
                     <Link href={`/transactions/purchases/${p.id}`} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> View
                     </Link>
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
                const totalQty = (p.items || []).reduce((acc: number, it: any) => acc + Number(it.quantity || 0), 0);
                const lineCount = p.items?.length || 0;

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
                        {totalQty} {totalQty === 1 ? 'Pc' : 'Pcs'} ({lineCount} {lineCount === 1 ? 'item' : 'items'})
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
                            : p.status === InvoiceStatus.RETURNED
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
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
        </>
      )}

      {/* CREATE PURCHASE BILL MODAL */}
      {isCreateOpen && (
        <ModalPortal><div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
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
                  onClick={() => form.setValue('isVatBill', !watchIsVatBill)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    watchIsVatBill
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  VAT Bill (13%)
                </button>
                <button
                  onClick={() => { setIsCreateOpen(false); form.setValue('isVatBill', false); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="p-6 space-y-6">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supplier Party *</label>
                  <select
                    {...form.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s: any) => {
                      const balLabel = getPartyBalanceDisplay(s.currentBalance, 'SUPPLIER');
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''} — {balLabel}
                        </option>
                      );
                    })}
                  </select>
                  {form.formState.errors.partyId && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.partyId.message}
                    </p>
                  )}
                </div>

                <div>
                  <DatePicker
                    label="Bill Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d)}
                  />
                  {form.formState.errors.date && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.date.message}
                    </p>
                  )}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetItemRowIdx(fields.length - 1 < 0 ? 0 : fields.length - 1);
                        setQuickItemData({ name: '', code: '', unit: 'Pcs', purchasePrice: 0, salePrice: 0 });
                        setIsQuickItemOpen(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Quick Create Product
                    </button>
                    <button
                      type="button"
                      onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>
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
                    const totals = calculateInvoiceTotals(form.watch('items'), watchIsVatBill);
                    const selItemId = form.watch(`items.${idx}.itemId`);
                    const selItem = availableItems.find((i: any) => i.id === selItemId);

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all"
                      >
                        {/* Item Select */}
                        <div className="col-span-12 md:col-span-4">
                          <ItemSearchSelect
                            items={availableItems}
                            value={selItemId || ''}
                            onChange={(id) => {
                              form.setValue(`items.${idx}.itemId`, id);
                              onItemSelect(idx, id);
                            }}
                            placeholder="Search item…"
                            priceField="purchasePrice"
                            onCreateNewItem={(typedName) => {
                              setTargetItemRowIdx(idx);
                              setQuickItemData({ name: typedName || '', code: '', unit: 'Pcs', purchasePrice: 0, salePrice: 0 });
                              setIsQuickItemOpen(true);
                            }}
                          />
                          {selItem && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-semibold">
                                <Package className="w-2.5 h-2.5" />
                                Stock: {Number(selItem.currentStock || 0).toLocaleString()} {selItem.unit}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 md:col-span-2">
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
                        <div className="col-span-1 text-right font-mono font-bold text-white text-xs">
                          Rs. {formatCurrency(totals.items[idx]?.total || 0)}
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

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Account</label>
                    <select
                      {...form.register('accountId')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    >
                      <option value="">Default {desiredAccountType.replace('_', ' ')} Account</option>
                      {filteredAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)} Available
                        </option>
                      ))}
                    </select>
                  </div>

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

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPurchase.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {createPurchase.isPending ? 'Processing Transaction...' : `Save ${watchIsVatBill ? 'VAT ' : ''}Purchase Bill`}
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
        </div></ModalPortal>
      )}

      {/* QUICK CREATE PRODUCT MODAL */}
      {isQuickItemOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <form
              onSubmit={handleQuickCreateItemSubmit}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" /> Quick Create Product
                </h3>
                <button
                  type="button"
                  onClick={() => setIsQuickItemOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Product / Item Name *</label>
                  <input
                    type="text"
                    required
                    value={quickItemData.name}
                    onChange={(e) => setQuickItemData({ ...quickItemData, name: e.target.value })}
                    placeholder="e.g. Duracell AA Battery Pack"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Barcode SKU (Optional)</label>
                    <input
                      type="text"
                      value={quickItemData.code}
                      onChange={(e) => setQuickItemData({ ...quickItemData, code: e.target.value })}
                      placeholder="e.g. 890123456"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit of Measure</label>
                    <select
                      value={quickItemData.unit}
                      onChange={(e) => setQuickItemData({ ...quickItemData, unit: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Pcs">Pcs (Pieces)</option>
                      <option value="Kg">Kg (Kilogram)</option>
                      <option value="Ltr">Ltr (Liter)</option>
                      <option value="Box">Box</option>
                      <option value="Dzn">Dzn (Dozen)</option>
                      <option value="Meter">Meter</option>
                      <option value="Pack">Pack</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Purchase Cost Rate (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quickItemData.purchasePrice}
                      onChange={(e) => setQuickItemData({ ...quickItemData, purchasePrice: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Selling Rate (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quickItemData.salePrice}
                      onChange={(e) => setQuickItemData({ ...quickItemData, salePrice: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickItemOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all"
                >
                  {createItemMutation.isPending ? 'Creating...' : 'Save & Add to Bill'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
