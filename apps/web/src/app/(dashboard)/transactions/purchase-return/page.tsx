'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPurchaseReturnSchema, CreatePurchaseReturnInput } from '@bizmanage/validation';
import { usePurchaseReturns, useCreatePurchaseReturn, usePurchases } from '@/services/purchaseService';
import { useParties } from '@/services/partyService';
import { useAccounts } from '@/services/accountService';
import { useItems } from '@/services/itemService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { DatePicker } from '@/components/ui/DatePicker';
import { ItemSearchSelect } from '@/components/ui/ItemSearchSelect';
import {
  RotateCcw,
  Plus,
  ShoppingBag,
  ArrowUpRight,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Building2,
  Minus,
  Wallet,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { PaymentMode } from '@bizmanage/types';

export default function PurchaseReturnPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [selectedAddItem, setSelectedAddItem] = useState<string>('');

  // Queries
  const { data: returnsData, isLoading, isError, refetch } = usePurchaseReturns();
  const { data: purchasesData } = usePurchases({ limit: 100 });
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: accountsData } = useAccounts();
  const { data: itemsData } = useItems({ limit: 1000 });

  // Mutations
  const createPurchaseReturn = useCreatePurchaseReturn();

  const suppliers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'
  );
  const purchasesList = purchasesData?.data || [];
  const accountsList = accountsData?.data || [];
  const returnsList = (returnsData as any[]) || [];
  const availableItems = itemsData?.data || [];

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    availableItems.forEach((i: any) => map.set(i.id, i));
    return map;
  }, [availableItems]);

  const form = useForm<CreatePurchaseReturnInput>({
    resolver: zodResolver(createPurchaseReturnSchema),
    defaultValues: {
      partyId: '',
      purchaseId: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: PaymentMode.CASH,
      refundAmount: 0,
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchPartyId = form.watch('partyId');
  const watchItems = form.watch('items') || [];
  const watchRefundAmount = form.watch('refundAmount') || 0;

  // Filter purchase bills for selected supplier
  const supplierPurchases = purchasesList.filter((p: any) => !watchPartyId || p.partyId === watchPartyId);

  const selectedPurchase = supplierPurchases.find((p: any) => p.id === selectedPurchaseId);
  const isVatBill = selectedPurchase?.isVatBill || false;

  const getReturnableInfo = (itemId: string) => {
    if (!selectedPurchase || !selectedPurchase.items) return null;
    const originalLine = selectedPurchase.items.find((line: any) => line.itemId === itemId);
    if (!originalLine) return null;
    const purchasedQty = Number(originalLine.quantity || 0);
    const returnedQty = Number(originalLine.returnedQuantity || 0);
    const returnableQty = Math.max(0, purchasedQty - returnedQty);
    return { purchasedQty, returnedQty, returnableQty, unitPrice: Number(originalLine.unitPrice) };
  };

  // Auto-fill return line items when a Purchase Bill is selected
  const handleSelectPurchase = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    form.setValue('purchaseId', purchaseId);
    setErrorBanner('');
    if (!purchaseId) {
      replace([]);
      return;
    }

    const purchase = purchasesList.find((p: any) => p.id === purchaseId);
    if (purchase && purchase.partyId) {
      form.setValue('partyId', purchase.partyId);
    }

    if (purchase && purchase.items) {
      const returnableItems = purchase.items
        .map((line: any) => {
          const purchased = Number(line.quantity || 0);
          const returned = Number(line.returnedQuantity || 0);
          const returnable = Math.max(0, purchased - returned);
          return {
            itemId: line.itemId,
            quantity: returnable,
            unitPrice: Number(line.unitPrice),
            discountPercent: Number(line.discountPercent || 0),
            discount: Number(line.discount || 0),
            taxAmount: Number(line.taxAmount || 0),
          };
        })
        .filter((item: any) => item.quantity > 0);

      if (returnableItems.length === 0) {
        setErrorBanner(`All items in Purchase Bill #${purchase.billNumber} have already been fully returned.`);
      }
      replace(returnableItems);
    }
  };

  const handleManualAddItem = (itemId: string) => {
    if (!itemId) return;
    if (!selectedPurchaseId) {
      setErrorBanner('Please select an original Purchase Bill first before adding items to return.');
      return;
    }

    const returnableInfo = getReturnableInfo(itemId);
    if (!returnableInfo) {
      setErrorBanner('Item was not part of the selected Purchase Bill. Unlinked items cannot be returned.');
      return;
    }

    const item = itemsMap.get(itemId);
    if (!item) return;

    const existingIndex = fields.findIndex((f) => f.itemId === itemId);
    if (existingIndex >= 0) {
      const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
      if (currentQty + 1 > returnableInfo.returnableQty) {
        setErrorBanner(`Cannot return more than originally purchased. Remaining returnable for "${item.name}": ${returnableInfo.returnableQty} ${item.unit || 'Pcs'}.`);
        return;
      }
      form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
    } else {
      if (returnableInfo.returnableQty <= 0) {
        setErrorBanner(`"${item.name}" has already been fully returned for this bill.`);
        return;
      }
      append({
        itemId: item.id,
        quantity: Math.min(1, returnableInfo.returnableQty),
        unitPrice: returnableInfo.unitPrice,
        discountPercent: 0,
        discount: 0,
        taxAmount: 0,
      });
    }
    setSelectedAddItem('');
  };

  const mappedItems = watchItems.map((item) => ({
    unitPrice: Number(item.unitPrice) || 0,
    quantity: Number(item.quantity) || 0,
    discountPercent: Number(item.discountPercent) || 0,
  }));

  const totals = calculateInvoiceTotals(mappedItems, isVatBill);
  const calculatedTotal = totals.totalAmount;

  const handleCreateSubmit = async (data: CreatePurchaseReturnInput) => {
    setErrorBanner('');

    if (!data.purchaseId || !selectedPurchaseId) {
      setErrorBanner('Selecting an original Purchase Bill is mandatory for processing a Purchase Return.');
      return;
    }

    if (!data.items || data.items.length === 0) {
      setErrorBanner('At least one item with valid return quantity is required.');
      return;
    }

    for (const line of data.items) {
      const info = getReturnableInfo(line.itemId);
      if (!info) {
        const itemObj = itemsMap.get(line.itemId);
        setErrorBanner(`Item "${itemObj?.name || 'Item'}" was not part of the selected Purchase Bill.`);
        return;
      }
      if (line.quantity > info.returnableQty) {
        const itemObj = itemsMap.get(line.itemId);
        setErrorBanner(`Cannot return ${line.quantity} of "${itemObj?.name || 'Item'}". Maximum remaining returnable: ${info.returnableQty} ${itemObj?.unit || 'Pcs'}.`);
        return;
      }
    }

    try {
      await createPurchaseReturn.mutateAsync({
        ...data,
        refundAmount: Number(data.refundAmount || 0),
      });
      setIsCreateOpen(false);
      form.reset();
      setSelectedPurchaseId('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.error?.message || 'Failed to issue Debit Note.');
    }
  };

  const totalReturnAmount = returnsList.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RotateCcw className="w-6 h-6" />
            </span>
            Purchase Returns (Debit Notes)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Issue Debit Notes to suppliers for returned raw material / goods. Reduces inventory stock & decreases supplier payable balance or records cash refund.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setErrorBanner('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Issue Debit Note (Purchase Return)
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Total Debit Notes Issued</p>
          <p className="text-xl font-bold text-white font-mono">{returnsList.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Total Return Value</p>
          <p className="text-xl font-bold text-purple-400 font-mono">Rs. {totalReturnAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Inventory Deducted</p>
          <p className="text-xl font-bold text-rose-400 font-mono">
            {returnsList.reduce((acc, r) => acc + (r.items?.length || 0), 0)} line items
          </p>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="Loading purchase returns..." />
      ) : isError ? (
        <ErrorState title="Failed to load purchase returns" onRetry={refetch} />
      ) : returnsList.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="w-7 h-7 text-purple-400" />}
          title="No Purchase Returns Recorded"
          description="Issue Debit Notes when returning defective items to vendors. Deducts stock and adjusts ledger payables automatically."
          actionLabel="Issue Debit Note"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {returnsList.map((r: any) => (
              <div key={r.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="font-bold text-white font-mono text-sm">{r.returnNumber}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Debit Note
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{r.party?.name || 'Supplier'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {r.purchase?.billNumber ? `Ref Bill: ${r.purchase.billNumber} • ` : ''}
                      {r.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-white text-base">Rs. {Number(r.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link href={`/transactions/purchase-return/${r.id}`} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Debit Note No / Date</th>
                  <th className="px-6 py-4">Supplier Party</th>
                  <th className="px-6 py-4">Original Purchase Bill</th>
                  <th className="px-6 py-4">Returned Items</th>
                  <th className="px-6 py-4 text-right">Debit Amount</th>
                  <th className="px-6 py-4 text-center">Settlement</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
              {returnsList.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white font-mono">
                    {r.returnNumber}
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      {new Date(r.date).toLocaleDateString()}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-slate-300 font-semibold">{r.party?.name || '—'}</td>

                  <td className="px-6 py-4 font-mono text-slate-400">
                    {r.purchase?.billNumber ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-400 font-bold">
                        {r.purchase.billNumber}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono">
                      {r.items?.length || 0} Products
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right font-mono font-bold text-white">
                    Rs. {Number(r.totalAmount || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {Number(r.refundAmount || 0) > 0 ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Refund: Rs. {Number(r.refundAmount).toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Payable Reduced
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/transactions/purchase-return/${r.id}`}
                      className="p-2 inline-flex rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="View Debit Note"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CREATE PURCHASE RETURN MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/90 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Modal Sticky Header */}
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        New Purchase Return
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Debit Note
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                      Deducts inventory stock and reduces supplier payable balance or receives cash refund.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all active:scale-95"
                    title="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {errorBanner && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorBanner}</span>
                  </div>
                )}

                <form id="purchase-return-form" onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-6">
                  
                  {/* Step 1: Supplier & Bill Details Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                      <Building2 className="w-4 h-4" /> 1. Supplier & Origin Purchase Bill
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Party *</label>
                        <select
                          {...form.register('partyId')}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((s: any) => {
                            const balLabel = getPartyBalanceDisplay(s.currentBalance, 'SUPPLIER');
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} ({balLabel})
                              </option>
                            );
                          })}
                        </select>
                        {form.formState.errors.partyId && (
                          <p className="text-xs text-rose-400 mt-1">{form.formState.errors.partyId.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Original Purchase Bill <span className="text-slate-500 font-normal">(Autofills items)</span>
                        </label>
                        <select
                          value={selectedPurchaseId}
                          onChange={(e) => handleSelectPurchase(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        >
                          <option value="">Select Bill to Autofill</option>
                          {supplierPurchases.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.billNumber} — Rs. {Number(p.totalAmount).toLocaleString()} ({new Date(p.date).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <DatePicker
                          label="Return Date"
                          required
                          value={form.watch('date')}
                          onChange={(d) => form.setValue('date', d)}
                        />
                        {form.formState.errors.date && (
                          <p className="text-xs text-rose-400 mt-1">{form.formState.errors.date.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Line Items Section */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
                          <ShoppingBag className="w-4 h-4" /> 2. Returned Products ({fields.length})
                        </div>
                        {isVatBill && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                            VAT Included (13%)
                          </span>
                        )}
                      </div>

                      {/* Add item combobox */}
                      <div className="w-full sm:w-72">
                        <ItemSearchSelect
                          items={availableItems}
                          value={selectedAddItem}
                          onChange={handleManualAddItem}
                          placeholder="+ Add Item to Return..."
                          priceField="purchasePrice"
                        />
                      </div>
                    </div>

                    {fields.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-300">No items selected for debit note</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Select a purchase bill above to automatically load billed items, or use the dropdown to add individual products.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden sm:block border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Product / Item</th>
                                <th className="px-4 py-3 text-center w-36">Return Qty</th>
                                <th className="px-4 py-3 text-right w-32">Rate (Rs.)</th>
                                <th className="px-4 py-3 text-right w-36">Line Total</th>
                                <th className="px-3 py-3 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {fields.map((field, idx) => {
                                const itemObj = itemsMap.get(field.itemId);
                                const currentQty = form.watch(`items.${idx}.quantity`) || 0;
                                const currentRate = form.watch(`items.${idx}.unitPrice`) || 0;
                                const lineTotal = currentQty * currentRate;

                                return (
                                  <tr key={field.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-white">
                                        {itemObj?.name || `Product (${field.itemId.slice(0, 8)})`}
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        {itemObj?.code && <span className="font-mono">SKU: {itemObj.code}</span>}
                                        <span>Unit: {itemObj?.unit || 'Pcs'}</span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                      <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (currentQty > 1) {
                                              form.setValue(`items.${idx}.quantity`, currentQty - 1);
                                            }
                                          }}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                          type="number"
                                          step="any"
                                          min="0.01"
                                          {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                                          className="w-14 text-center bg-transparent text-white font-mono text-xs font-bold focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => form.setValue(`items.${idx}.quantity`, currentQty + 1)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                                        className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-right text-white font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      />
                                    </td>

                                    <td className="px-4 py-3 text-right font-mono font-bold text-white text-xs">
                                      Rs. {formatCurrency(lineTotal)}
                                    </td>

                                    <td className="px-3 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => remove(idx)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                                        title="Remove line item"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="sm:hidden space-y-2.5">
                          {fields.map((field, idx) => {
                            const itemObj = itemsMap.get(field.itemId);
                            const currentQty = form.watch(`items.${idx}.quantity`) || 0;
                            const currentRate = form.watch(`items.${idx}.unitPrice`) || 0;
                            const lineTotal = currentQty * currentRate;

                            return (
                              <div
                                key={field.id}
                                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-xs font-bold text-white block">
                                      {itemObj?.name || `Product (${field.itemId.slice(0, 8)})`}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {itemObj?.code ? `SKU: ${itemObj.code} • ` : ''}Unit: {itemObj?.unit || 'Pcs'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => remove(idx)}
                                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 items-center">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Return Qty</label>
                                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (currentQty > 1) {
                                            form.setValue(`items.${idx}.quantity`, currentQty - 1);
                                          }
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        step="any"
                                        {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                                        className="w-full text-center bg-transparent text-white font-mono text-xs font-bold focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => form.setValue(`items.${idx}.quantity`, currentQty + 1)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Rate (Rs.)</label>
                                    <input
                                      type="number"
                                      step="any"
                                      {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs font-semibold focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-1 text-xs">
                                  <span className="text-[11px] text-slate-400">Total:</span>
                                  <span className="font-mono font-bold text-purple-400">Rs. {formatCurrency(lineTotal)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Step 3: Settlement & Refund Mode */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                      <Wallet className="w-4 h-4" /> 3. Settlement Mode
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Immediate Supplier Cash Refund (Rs.)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            {...form.register('refundAmount', { valueAsNumber: true })}
                            placeholder="0 (Reduces supplier payable)"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          {calculatedTotal > 0 && (
                            <button
                              type="button"
                              onClick={() => form.setValue('refundAmount', calculatedTotal)}
                              className="absolute right-2 top-2 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-colors"
                            >
                              Full Refund
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Leave 0 to reduce supplier payable balance automatically.
                        </p>
                      </div>

                      {watchRefundAmount > 0 && (
                        <div className="animate-in fade-in duration-150">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Refund Inflow Account *</label>
                          <select
                            {...form.register('accountId')}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Default Cash In Hand</option>
                            {accountsList.map((a: any) => (
                              <option key={a.id} value={a.id}>
                                {a.accountName} (Bal: Rs. {Number(a.balance).toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Notes / Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Notes / Reason for Return <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      {...form.register('notes')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g. Returned defective pipes from lot #304 back to manufacturer..."
                    />
                  </div>
                </form>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-[11px] text-slate-400 font-medium">Total Debit Note Value</p>
                    <p className="text-base sm:text-xl font-bold font-mono text-purple-400">
                      Rs. {formatCurrency(calculatedTotal)}
                    </p>
                  </div>
                  {watchRefundAmount > 0 && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      Cash Inflow: Rs. {formatCurrency(watchRefundAmount)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="purchase-return-form"
                    disabled={createPurchaseReturn.isPending || fields.length === 0}
                    className="px-5 sm:px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                  >
                    {createPurchaseReturn.isPending ? (
                      'Processing...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Issue Debit Note
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
