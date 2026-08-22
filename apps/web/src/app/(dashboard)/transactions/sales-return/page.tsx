'use client';

import Link from 'next/link';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSaleReturnSchema, CreateSaleReturnInput } from '@bizmanage/validation';
import { useSaleReturns, useCreateSaleReturn, useSales } from '@/services/saleService';
import { useParties } from '@/services/partyService';
import { useAccounts } from '@/services/accountService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { DatePicker } from '@/components/ui/DatePicker';
import { RotateCcw, Plus, FileText, ArrowDownLeft, X, Trash2, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { PaymentMode } from '@bizmanage/types';

export default function SalesReturnPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');

  // Queries
  const { data: returnsData, isLoading, isError, refetch } = useSaleReturns();
  const { data: salesData } = useSales({ limit: 100 });
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: accountsData } = useAccounts();

  // Mutations
  const createSaleReturn = useCreateSaleReturn();

  const customers = (partiesData?.data || []).filter(
    (p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH'
  );
  const salesList = salesData?.data || [];
  const accountsList = accountsData?.data || [];
  const returnsList = (returnsData as any[]) || [];

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
        discount: Number(line.discount || 0),
        taxAmount: Number(line.taxAmount || 0),
      }));
      replace(defaultReturnItems);
    }
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Sales Returns (Credit Notes) <RotateCcw className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Issue Credit Notes for returned items from customers. Automatically restores inventory stock & adjusts customer receivable or processes cash refund.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setErrorBanner('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
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
                  <th className="px-6 py-4 text-center">Settlement Status</th>
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
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {r.items?.length || 0} items
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right font-mono font-bold text-white">
                    Rs. {Number(r.totalAmount || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Credit Note Issued
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/transactions/sales-return/${r.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block"
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-indigo-400" /> New Sales Return (Credit Note)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select customer and original invoice to populate items. Return pricing uses original sold rates.
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Total Return Value</h4>
                    <p className="text-[10px] text-slate-400">Total value of credit note {isVatBill ? '(VAT Included)' : ''}</p>
                  </div>
                  <div className="text-xl font-bold text-indigo-400 font-mono">
                    Rs. {formatCurrency(calculatedTotal)}
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorBanner && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {errorBanner}
                </div>
              )}

              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Customer Party *</label>
                    <select
                      {...form.register('partyId')}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Original Invoice (Optional)</label>
                    <select
                      value={selectedSaleId}
                      onChange={(e) => handleSelectSale(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      <p className="text-xs text-red-400 mt-1">{form.formState.errors.date.message}</p>
                    )}
                  </div>
                </div>

                {/* Returned Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Returned Products Line Items
                    </h4>
                  </div>

                  {fields.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-500">
                      Select a Sales Invoice above to load line items for return.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, idx) => {
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                          >
                            <div className="col-span-5">
                              <span className="text-white font-semibold block truncate">
                                Item ID: {field.itemId}
                              </span>
                              <span className="text-[10px] text-slate-400">Original Rate: Rs. {field.unitPrice}</span>
                            </div>

                            <div className="col-span-3">
                              <label className="block text-[10px] text-slate-400 mb-0.5">Return Qty</label>
                              <input
                                type="number"
                                step="any"
                                {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                              />
                            </div>

                            <div className="col-span-3 text-right font-mono font-bold text-white text-xs">
                              Rs. {formatCurrency(totals.items[idx]?.total || 0)}
                            </div>

                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => remove(idx)}
                                className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Refund & Settlement Mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Immediate Cash/Bank Refund (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...form.register('refundAmount', { valueAsNumber: true })}
                      placeholder="0 for Credit to Customer Account"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Leave 0 to credit customer ledger balance automatically.
                    </p>
                  </div>

                  {watchRefundAmount > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Refund Account</label>
                      <select
                        {...form.register('accountId')}
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="">Default Cash Account</option>
                        {accountsList.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.accountName} (Bal: Rs. {Number(a.balance).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Reason for Return</label>
                  <textarea
                    rows={2}
                    {...form.register('notes')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Returned 1 damaged wash basin unit..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-sm font-bold text-white font-mono">
                    Total Return Credit: <span className="text-indigo-400">Rs. {calculatedTotal.toLocaleString()}</span>
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createSaleReturn.isPending}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {createSaleReturn.isPending ? 'Processing...' : 'Issue Credit Note'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
