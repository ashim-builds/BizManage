'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSaleReturnSchema, CreateSaleReturnInput } from '@bizmanage/validation';
import { useSaleReturns, useCreateSaleReturn, useSales } from '@/services/saleService';
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
  FileText,
  ArrowDownLeft,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShoppingBag,
  CreditCard,
  Building2,
  Receipt,
  Minus,
  Wallet,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PaymentMode } from '@bizmanage/types';

export default function SalesReturnPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [selectedAddItem, setSelectedAddItem] = useState<string>('');

  // Queries
  const { data: returnsData, isLoading, isError, refetch } = useSaleReturns();
  const { data: salesData } = useSales({ limit: 100 });
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: accountsData } = useAccounts();
  const { data: itemsData } = useItems({ limit: 1000 });

  // Mutations
  const createSaleReturn = useCreateSaleReturn();

  const customers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH'
  );
  const salesList = salesData?.data || [];
  const accountsList = accountsData?.data || [];
  const returnsList = (returnsData as any[]) || [];
  const availableItems = itemsData?.data || [];

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    availableItems.forEach((i: any) => map.set(i.id, i));
    return map;
  }, [availableItems]);

  const form = useForm<CreateSaleReturnInput>({
    resolver: zodResolver(createSaleReturnSchema),
    defaultValues: {
      partyId: '',
      saleId: '',
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

  // Filter sales for selected customer
  const customerSales = salesList.filter((s: any) => !watchPartyId || s.partyId === watchPartyId);

  // Auto-fill return line items when a Sale Invoice is selected
  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    form.setValue('saleId', saleId);
    if (!saleId) {
      replace([]);
      return;
    }

    const sale = salesList.find((s: any) => s.id === saleId);
    if (sale && sale.partyId) {
      form.setValue('partyId', sale.partyId);
    }

    if (sale && sale.items) {
      const defaultReturnItems = sale.items.map((line: any) => ({
        itemId: line.itemId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent || 0),
        discount: Number(line.discount || 0),
        taxAmount: Number(line.taxAmount || 0),
      }));
      replace(defaultReturnItems);
    }
  };

  const handleManualAddItem = (itemId: string) => {
    if (!itemId) return;
    const item = itemsMap.get(itemId);
    if (!item) return;

    // Check if already in fields
    const existingIndex = fields.findIndex((f) => f.itemId === itemId);
    if (existingIndex >= 0) {
      const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
      form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
    } else {
      append({
        itemId: item.id,
        quantity: 1,
        unitPrice: Number(item.salePrice || 0),
        discountPercent: 0,
        discount: 0,
        taxAmount: 0,
      });
    }
    setSelectedAddItem('');
  };

  const selectedSale = customerSales.find((s: any) => s.id === selectedSaleId);
  const isVatBill = selectedSale?.isVatBill || false;

  const mappedItems = watchItems.map((item) => ({
    unitPrice: Number(item.unitPrice) || 0,
    quantity: Number(item.quantity) || 0,
    discountPercent: Number(item.discountPercent) || 0,
  }));

  const totals = calculateInvoiceTotals(mappedItems, isVatBill);
  const calculatedTotal = totals.totalAmount;

  const handleCreateSubmit = async (data: CreateSaleReturnInput) => {
    setErrorBanner('');
    try {
      await createSaleReturn.mutateAsync({
        ...data,
        refundAmount: Number(data.refundAmount || 0),
      });
      setIsCreateOpen(false);
      form.reset();
      setSelectedSaleId('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.error?.message || 'Failed to create sales return credit note.');
    }
  };

  const totalReturnAmount = returnsList.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <RotateCcw className="w-6 h-6" />
            </span>
            Sales Returns (Credit Notes)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Issue Credit Notes for returned items from customers. Restores inventory stock & adjusts customer receivable or processes cash refund.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setErrorBanner('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Issue Credit Note (Sales Return)
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Total Credit Notes Issued</p>
          <p className="text-xl font-bold text-white font-mono">{returnsList.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Total Sales Return Value</p>
          <p className="text-xl font-bold text-indigo-400 font-mono">Rs. {totalReturnAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Inventory Restored</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">
            {returnsList.reduce((acc, r) => acc + (r.items?.length || 0), 0)} line items
          </p>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="Loading sales returns..." />
      ) : isError ? (
        <ErrorState title="Failed to load sales returns" onRetry={refetch} />
      ) : returnsList.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="w-7 h-7 text-indigo-400" />}
          title="No Sales Returns Recorded"
          description="Issue Credit Notes when clients return items. Restores inventory and adjusts ledger receivables automatically."
          actionLabel="Issue Credit Note"
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
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Credit Note
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{r.party?.name || 'Walk-in Customer'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {r.sale?.invoiceNumber ? `Ref: ${r.sale.invoiceNumber} • ` : ''}
                      {r.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-white text-base">Rs. {Number(r.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link href={`/transactions/sales-return/${r.id}`} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1.5">
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
                  <th className="px-6 py-4">Return No / Date</th>
                  <th className="px-6 py-4">Customer Party</th>
                  <th className="px-6 py-4">Original Invoice</th>
                  <th className="px-6 py-4">Returned Items</th>
                  <th className="px-6 py-4 text-right">Return Amount</th>
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
                    {r.sale?.invoiceNumber ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">
                        {r.sale.invoiceNumber}
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
                        Account Credit
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/transactions/sales-return/${r.id}`}
                      className="p-2 inline-flex rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="View Credit Note"
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

      {/* CREATE SALES RETURN MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/90 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Modal Sticky Header */}
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 border border-indigo-500/30">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        New Sales Return
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        Credit Note
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                      Restores inventory stock and adjusts customer receivable balance or gives instant refund.
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

                <form id="sales-return-form" onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-6">
                  
                  {/* Step 1: Customer & Invoice Details Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Building2 className="w-4 h-4" /> 1. Customer & Origin Invoice
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Party *</label>
                        <select
                          {...form.register('partyId')}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
                          <p className="text-xs text-rose-400 mt-1">{form.formState.errors.partyId.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Original Invoice <span className="text-slate-500 font-normal">(Autofills items)</span>
                        </label>
                        <select
                          value={selectedSaleId}
                          onChange={(e) => handleSelectSale(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        >
                          <option value="">Select Invoice to Autofill</option>
                          {customerSales.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.invoiceNumber} — Rs. {Number(s.totalAmount).toLocaleString()} ({new Date(s.date).toLocaleDateString()})
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
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
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
                        />
                      </div>
                    </div>

                    {fields.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-300">No items selected for return</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Select a sales invoice above to automatically load billed items, or use the dropdown to add individual products.
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
                                        className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-right text-white font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                  <span className="font-mono font-bold text-indigo-400">Rs. {formatCurrency(lineTotal)}</span>
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
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Wallet className="w-4 h-4" /> 3. Settlement Mode
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Immediate Cash/Bank Refund (Rs.)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            {...form.register('refundAmount', { valueAsNumber: true })}
                            placeholder="0 (Credits customer ledger)"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {calculatedTotal > 0 && (
                            <button
                              type="button"
                              onClick={() => form.setValue('refundAmount', calculatedTotal)}
                              className="absolute right-2 top-2 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/30 transition-colors"
                            >
                              Full Refund
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Leave 0 to credit customer ledger balance automatically.
                        </p>
                      </div>

                      {watchRefundAmount > 0 && (
                        <div className="animate-in fade-in duration-150">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Refund Outflow Account *</label>
                          <select
                            {...form.register('accountId')}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Returned damaged item from transit, customer changed mind..."
                    />
                  </div>
                </form>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-[11px] text-slate-400 font-medium">Total Return Credit</p>
                    <p className="text-base sm:text-xl font-bold font-mono text-indigo-400">
                      Rs. {formatCurrency(calculatedTotal)}
                    </p>
                  </div>
                  {watchRefundAmount > 0 && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      Cash Refund: Rs. {formatCurrency(watchRefundAmount)}
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
                    form="sales-return-form"
                    disabled={createSaleReturn.isPending || fields.length === 0}
                    className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                  >
                    {createSaleReturn.isPending ? (
                      'Processing...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Issue Credit Note
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
