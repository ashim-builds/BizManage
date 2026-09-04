'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLongPress } from '@/hooks/useLongPress';
import { LongPressActionSheet } from '@/components/ui/LongPressActionSheet';
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
import { ResponsiveDataTable, Column } from '@/components/common/ResponsiveDataTable';
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
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [selectedAddItem, setSelectedAddItem] = useState<string>('');
  const [longPressReturn, setLongPressReturn] = useState<any | null>(null);

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

  // When original invoice is selected, autofill items
  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    form.setValue('saleId', saleId || '');

    if (!saleId) return;

    const sale = salesList.find((s: any) => s.id === saleId);
    if (!sale) return;

    if (sale.partyId) {
      form.setValue('partyId', sale.partyId);
    }

    if (sale.items && sale.items.length > 0) {
      const mappedItems = sale.items.map((it: any) => ({
        itemId: it.itemId,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discountPercent: Number(it.discountPercent) || 0,
        discount: 0,
        taxAmount: Number(it.taxAmount) || 0,
      }));
      replace(mappedItems);
    }
  };

  // Add individual manual item
  const handleManualAddItem = (itemId: string) => {
    if (!itemId) return;
    const item = itemsMap.get(itemId);
    if (!item) return;

    const existingIdx = fields.findIndex((f) => f.itemId === itemId);
    if (existingIdx >= 0) {
      const currentQty = form.getValues(`items.${existingIdx}.quantity`) || 1;
      form.setValue(`items.${existingIdx}.quantity`, currentQty + 1);
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

  const selectedSale = salesList.find((s: any) => s.id === selectedSaleId);
  const isVatBill = !!(selectedSale && Number(selectedSale.taxAmount || 0) > 0);

  // Totals calculations
  const totals = useMemo(() => {
    const rawItems = watchItems.map((it) => ({
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      discountPercent: Number(it.discountPercent) || 0,
    }));
    return calculateInvoiceTotals(rawItems, isVatBill);
  }, [watchItems, isVatBill]);

  const handleCreateSubmit = async (data: CreateSaleReturnInput) => {
    try {
      setErrorBanner('');
      if (!data.items || data.items.length === 0) {
        setErrorBanner('Please add at least one returned item to the credit note.');
        return;
      }

      await createSaleReturn.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset();
      setSelectedSaleId('');
    } catch (err: any) {
      console.error('Failed to create sales return:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to issue sales return credit note.';
      setErrorBanner(msg);
    }
  };

  const totalReturnAmount = returnsList.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

  // Table columns
  const returnColumns: Column<any>[] = [
    {
      key: 'returnNumber',
      header: 'Return # / Date',
      isPrimaryTitle: true,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
            {r.returnNumber}
          </span>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {new Date(r.date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Customer Party',
      render: (r) => (
        <span className="font-bold text-slate-900">{r.party?.name || 'Cash Customer'}</span>
      ),
    },
    {
      key: 'sale',
      header: 'Original Invoice',
      render: (r) => (
        r.sale?.invoiceNumber ? (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100 text-xs">
            {r.sale.invoiceNumber}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'items',
      header: 'Returned Items',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          {r.items?.length || 0} Products
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Return Amount',
      align: 'right',
      isStatusBadge: true,
      render: (r) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          Rs. {Number(r.totalAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'settlement',
      header: 'Settlement',
      align: 'center',
      render: (r) => (
        Number(r.refundAmount || 0) > 0 ? (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Cash Refund: Rs. {Number(r.refundAmount).toLocaleString()}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ledger Adjusted
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <Link
          href={`/transactions/sales-return/${r.id}`}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </Link>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-indigo-600" />
            Sales Returns (Credit Notes)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Issue Credit Notes for returned items from customers. Restores inventory stock & adjusts customer receivable or processes cash refund.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setErrorBanner('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Issue Credit Note (Sales Return)
        </button>
      </div>

      {/* Summary Stats Cards: 1+2 Layout on Mobile (Hero + 2 Grid), 3-Column on Desktop */}
      {/* Mobile View (< md) */}
      <div className="space-y-2 md:hidden">
        {/* Top Hero: Total Return Value */}
        <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">Total Return Value</p>
            <p className="text-base font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
              Rs. {totalReturnAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {returnsList.length} Credit notes issued
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Breakdown Row (2 Columns): Total Credit Notes + Restored Items */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total Notes */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-blue-700 truncate">Total Notes</p>
              <p className="text-sm font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
                {returnsList.length}
              </p>
              <p className="text-[9px] text-blue-600/80 font-semibold mt-0.5 truncate">Credit Notes</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Restored Items */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-emerald-700 truncate">Stock Restored</p>
              <p className="text-sm font-black font-mono text-emerald-700 mt-0.5 whitespace-nowrap">
                {returnsList.reduce((acc, r) => acc + (r.items?.length || 0), 0)}
              </p>
              <p className="text-[9px] text-emerald-600/80 font-semibold mt-0.5 truncate">Items</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View (>= md): 3 Full Width Cards */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-6">
        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Credit Notes Issued</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{returnsList.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Customer returns recorded</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Return Value</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">Rs. {totalReturnAmount.toLocaleString()}</h3>
            <p className="text-[11px] text-indigo-600/80 mt-1 font-medium">Refunds & ledger adjustments</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Restored</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {returnsList.reduce((acc, r) => acc + (r.items?.length || 0), 0)} line items
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Added back to stock</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <ResponsiveDataTable
        columns={returnColumns}
        data={returnsList}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyTitle="No Sales Returns Recorded"
        emptyDescription="Issue Credit Notes when clients return items. Restores inventory and adjusts ledger receivables automatically."
        emptyAction={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Issue First Credit Note
          </button>
        }
      />

      {/* Create Sales Return Modal */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        New Sales Return
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Credit Note
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                      Restores inventory stock and adjusts customer receivable balance or gives instant refund.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {errorBanner && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorBanner}</span>
                  </div>
                )}

                <form id="sales-return-form" onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-6">
                  
                  {/* Step 1: Customer & Invoice Details Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      <Building2 className="w-4 h-4" /> 1. Customer & Origin Invoice
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Customer Party *</label>
                        <select
                          {...form.register('partyId')}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
                          <p className="text-xs text-rose-500 mt-1">{form.formState.errors.partyId.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Original Invoice <span className="text-slate-400 font-normal">(Autofills items)</span>
                        </label>
                        <select
                          value={selectedSaleId}
                          onChange={(e) => handleSelectSale(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
                          <p className="text-xs text-rose-500 mt-1">{form.formState.errors.date.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Line Items Section */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                          <ShoppingBag className="w-4 h-4" /> 2. Returned Products ({fields.length})
                        </div>
                        {isVatBill && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            VAT Included (13%)
                          </span>
                        )}
                      </div>

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
                      <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                        <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No items selected for return</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Select a sales invoice above to automatically load billed items, or use the dropdown to add individual products.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3">Product / Item</th>
                              <th className="px-4 py-3 text-center w-36">Return Qty</th>
                              <th className="px-4 py-3 text-right w-32">Rate (Rs.)</th>
                              <th className="px-4 py-3 text-right w-36">Line Total</th>
                              <th className="px-3 py-3 text-center w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {fields.map((field, idx) => {
                              const itemObj = itemsMap.get(field.itemId);
                              const currentQty = form.watch(`items.${idx}.quantity`) || 0;
                              const currentRate = form.watch(`items.${idx}.unitPrice`) || 0;
                              const lineTotal = currentQty * currentRate;

                              return (
                                <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900">
                                      {itemObj?.name || `Product (${field.itemId.slice(0, 8)})`}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                      {itemObj?.code && <span className="font-mono">SKU: {itemObj.code}</span>}
                                      <span>Unit: {itemObj?.unit || 'Pcs'}</span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (currentQty > 1) {
                                            form.setValue(`items.${idx}.quantity`, currentQty - 1);
                                          }
                                        }}
                                        className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                                        className="w-14 text-center bg-transparent text-slate-900 font-mono text-xs font-bold focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => form.setValue(`items.${idx}.quantity`, currentQty + 1)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 text-right">
                                    <input
                                      type="number"
                                      step="any"
                                      {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                                      className="w-24 px-2 py-1 rounded-lg bg-white border border-slate-300 text-right text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>

                                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">
                                    Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>

                                  <td className="px-3 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => remove(idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                      title="Remove item"
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
                    )}
                  </div>

                  {/* Step 3: Refund Settlement & Totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        <Wallet className="w-4 h-4" /> 3. Settlement & Refund Mode
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Instant Cash Refund (Rs.)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={totals.totalAmount}
                          {...form.register('refundAmount', { valueAsNumber: true })}
                          placeholder="0.00"
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Leave 0 to credit the customer's balance ledger.
                        </p>
                      </div>

                      {watchRefundAmount > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Refund Payment Mode</label>
                          <select
                            {...form.register('paymentMode')}
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value={PaymentMode.CASH}>Cash Drawer</option>
                            <option value={PaymentMode.BANK}>Bank Account</option>
                            <option value={PaymentMode.ONLINE}>Online Wallet</option>
                            <option value={PaymentMode.CHEQUE}>Cheque</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">
                          Rs. {totals.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {isVatBill && (
                        <div className="flex justify-between text-blue-700">
                          <span>VAT (13%):</span>
                          <span className="font-mono font-bold">
                            Rs. {totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total Credit Note Value:</span>
                        <span className="font-mono text-indigo-600">
                          Rs. {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="sales-return-form"
                  disabled={createSaleReturn.isPending}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {createSaleReturn.isPending ? 'Issuing Credit Note...' : 'Save Credit Note'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
