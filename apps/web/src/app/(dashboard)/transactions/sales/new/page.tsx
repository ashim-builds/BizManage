'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSaleSchema, CreateSaleInput } from '@bizmanage/validation';
import { PaymentMode, PartyType } from '@bizmanage/types';
import { useCreateSale } from '@/services/saleService';
import { useParties, useCreateParty } from '@/services/partyService';
import { useItems } from '@/services/itemService';
import { useAccounts } from '@/services/accountService';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { ItemSearchSelect } from '@/components/ui/ItemSearchSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { toast } from 'react-hot-toast';
import {
  Receipt,
  Plus,
  Trash2,
  Wallet,
  ArrowLeft,
  Building2,
  Phone,
  Percent,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  CreditCard,
  Banknote,
  Minus,
  X,
  UserPlus,
} from 'lucide-react';

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // Mode: Credit (receivable) vs Cash (fully paid)
  const [saleMode, setSaleMode] = useState<'CASH' | 'CREDIT'>('CASH');

  // Confirmation Modals
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateSaleInput | null>(null);

  // Quick Add Party Modal
  const [isQuickAddPartyOpen, setIsQuickAddPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');

  // Optional Section Accordions
  const [showTerms, setShowTerms] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [termsText, setTermsText] = useState('1. Goods once sold will not be taken back.\n2. Payment is due within credit period.');
  const [notesText, setNotesText] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Queries
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: itemsData } = useItems({ limit: 1000 });
  const { data: accountsData } = useAccounts();

  const createSale = useCreateSale();
  const createParty = useCreateParty();

  const customers = useMemo(() => {
    return (partiesData?.data || []).filter(
      (p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH'
    );
  }, [partiesData]);

  const availableItems = useMemo(() => itemsData?.data || [], [itemsData]);
  const accounts = useMemo(() => accountsData?.data || [], [accountsData]);

  // Form Setup
  const form = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isVatBill: false,
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Watch Form Fields for Live Calculations
  const watchItems = form.watch('items');
  const isVatBill = form.watch('isVatBill');
  const selectedPartyId = form.watch('partyId');
  const selectedPaymentMode = form.watch('paymentMode');
  const paidAmount = form.watch('paidAmount') || 0;

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedPartyId);
  }, [customers, selectedPartyId]);

  // Sync phone when customer changes
  useEffect(() => {
    if (selectedCustomer?.phone) {
      setCustomerPhone(selectedCustomer.phone);
    } else {
      setCustomerPhone('');
    }
  }, [selectedCustomer]);

  // Live Totals Computation
  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      (watchItems || []).map((item) => {
        return {
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          discountPercent: item.discountPercent || item.discount || 0,
        };
      }),
      Boolean(isVatBill)
    );
  }, [watchItems, isVatBill]);

  // Automatically update paidAmount when switching between Cash and Credit mode
  useEffect(() => {
    if (saleMode === 'CASH') {
      form.setValue('paidAmount', totals.totalAmount);
    } else {
      // Credit: default paid amount is 0 unless user explicitly typed a partial amount
      if (paidAmount === totals.totalAmount && totals.totalAmount > 0) {
        form.setValue('paidAmount', 0);
      }
    }
  }, [saleMode, totals.totalAmount]);

  // Filter accounts by payment mode
  const filteredAccounts = useMemo(() => {
    if (selectedPaymentMode === PaymentMode.BANK || selectedPaymentMode === PaymentMode.CHEQUE) {
      return accounts.filter((a: any) => a.type === 'BANK');
    }
    if (selectedPaymentMode === PaymentMode.ONLINE) {
      return accounts.filter((a: any) => a.type === 'WALLET');
    }
    return accounts.filter((a: any) => a.type === 'CASH');
  }, [accounts, selectedPaymentMode]);

  // Item select handler
  const handleItemSelect = (index: number, itemId: string) => {
    const selected = availableItems.find((i: any) => i.id === itemId);
    if (!selected) return;
    form.setValue(`items.${index}.unitPrice`, Number(selected.salePrice || 0));
    form.setValue(`items.${index}.quantity`, 1);
    form.setValue(`items.${index}.discount`, 0);
    form.setValue(`items.${index}.discountPercent`, 0);
  };

  // Form Submit Interceptor for Save Confirmation
  const onFormSubmit = (data: CreateSaleInput) => {
    // Validate Credit requirement
    if (saleMode === 'CREDIT' && !data.partyId) {
      toast.error('Please select a Customer Party for Credit (उधारो) sale.');
      return;
    }

    setPendingFormData(data);
    setIsSaveConfirmOpen(true);
  };

  // Final Confirmed Submit
  const handleConfirmedSave = async () => {
    if (!pendingFormData) return;
    try {
      await createSale.mutateAsync(pendingFormData);
      toast.success('Sale Invoice created successfully! 🎉');
      router.push('/transactions/sales');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create sale invoice.');
    }
  };

  // Quick Add Customer Handler
  const handleQuickAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPartyName.trim()) return;
    try {
      const created = await createParty.mutateAsync({
        name: quickPartyName.trim(),
        phone: quickPartyPhone.trim() || undefined,
        type: PartyType.CUSTOMER,
        openingBalance: 0,
        openingBalanceType: 'RECEIVABLE',
      });
      if (created && created.id) {
        form.setValue('partyId', created.id);
        setCustomerPhone(created.phone || '');
      }
      setIsQuickAddPartyOpen(false);
      setQuickPartyName('');
      setQuickPartyPhone('');
      toast.success('Customer added successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add customer.');
    }
  };

  // Compute Balance Due
  const balanceDue = Math.max(0, totals.totalAmount - (Number(paidAmount) || 0));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-32 font-sans -m-4 sm:-m-6 lg:-m-8">
      {/* TOP STICKY BAR */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/sales"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all"
            title="Back to Sales"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                New Sales Invoice
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                Invoice #{form.watch('invoiceNumber') || 'Auto'}
              </span>
            </div>
          </div>
        </div>

        {/* CASH VS CREDIT TOGGLE SWITCH */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setSaleMode('CREDIT');
              form.setValue('paidAmount', 0);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              saleMode === 'CREDIT'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Credit (उधारो)
          </button>
          <button
            type="button"
            onClick={() => {
              setSaleMode('CASH');
              form.setValue('paidAmount', totals.totalAmount);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              saleMode === 'CASH'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            Cash (नगद)
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onFormSubmit)} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* CARD 1: CUSTOMER & INVOICE META */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Customer Selection */}
            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  {saleMode === 'CREDIT' ? 'Customer Party (उधारो खाता) *' : 'Customer Party (Optional)'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickAddPartyOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Quick Add
                </button>
              </div>

              <select
                {...form.register('partyId')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-xs"
              >
                <option value="">
                  {saleMode === 'CREDIT' ? '-- Select Customer for Credit Sale --' : 'Cash / Walk-in Customer'}
                </option>
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
                <p className="text-[11px] text-rose-600 font-bold">{form.formState.errors.partyId.message}</p>
              )}

              {selectedCustomer && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                  <span>Current Ledger:</span>
                  <span className="font-bold text-slate-800">
                    {getPartyBalanceDisplay(selectedCustomer.currentBalance, 'CUSTOMER')}
                  </span>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>

            {/* Invoice Date */}
            <div className="md:col-span-3 space-y-1.5">
              <DatePicker
                label="Invoice Date"
                required
                value={form.watch('date')}
                onChange={(dateStr) => form.setValue('date', dateStr)}
              />
            </div>

            {/* Bill Type (VAT vs Normal) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-600" /> Tax Type
              </label>
              <select
                value={isVatBill ? 'VAT' : 'NORMAL'}
                onChange={(e) => form.setValue('isVatBill', e.target.value === 'VAT')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
              >
                <option value="NORMAL">Normal Bill (No VAT)</option>
                <option value="VAT">VAT Bill (13%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARD 2: SPREADSHEET LINE ITEMS TABLE */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">
                Invoice Line Items ({fields.length})
              </h3>
              {isVatBill && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  VAT 13% Applied
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 text-center w-12 border-r border-slate-200">#</th>
                  <th className="py-3 px-4 min-w-[280px] border-r border-slate-200">Item / Product</th>
                  <th className="py-3 px-3 text-center w-28 border-r border-slate-200">Quantity</th>
                  <th className="py-3 px-3 text-center w-20 border-r border-slate-200">Unit</th>
                  <th className="py-3 px-3 text-right w-44 border-r border-slate-200">Price / Unit (Rs.)</th>
                  <th className="py-3 px-3 text-center w-28 border-r border-slate-200">Discount (%)</th>
                  {isVatBill && <th className="py-3 px-3 text-right w-28 border-r border-slate-200">Tax (13%)</th>}
                  <th className="py-3 px-4 text-right w-36 border-r border-slate-200">Amount (Rs.)</th>
                  <th className="py-3 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, idx) => {
                  const selectedItemId = form.watch(`items.${idx}.itemId`);
                  const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);

                  const lineQty = form.watch(`items.${idx}.quantity`) || 0;
                  const linePrice = form.watch(`items.${idx}.unitPrice`) || 0;
                  const lineDiscount = form.watch(`items.${idx}.discountPercent`) || form.watch(`items.${idx}.discount`) || 0;
                  const computedItemTotal = totals.items[idx]?.total ?? (lineQty * linePrice * (1 - lineDiscount / 100));

                  const curStock = Number(selectedItem?.currentStock || 0);
                  const isProduct = selectedItem?.type === 'PRODUCT';
                  const isOutOfStock = isProduct && curStock <= 0;
                  const isInsufficientStock = isProduct && curStock > 0 && lineQty > curStock;
                  const isOverStock = isOutOfStock || isInsufficientStock;

                  return (
                    <tr
                      key={field.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOverStock ? 'bg-rose-50/60' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Item Search Combobox */}
                      <td className="py-2.5 px-3 border-r border-slate-200 space-y-1">
                        <ItemSearchSelect
                          items={availableItems}
                          value={selectedItemId || ''}
                          onChange={(id) => {
                            form.setValue(`items.${idx}.itemId`, id);
                            handleItemSelect(idx, id);
                          }}
                          placeholder="Type or search product…"
                          priceField="salePrice"
                        />
                        {selectedItem && (
                          <div className="flex items-center gap-2 px-1 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                curStock <= 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : curStock <= Number(selectedItem.minStockAlert)
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {curStock <= 0
                                ? `Out of Stock (0 ${selectedItem.unit})`
                                : `Stock: ${curStock} ${selectedItem.unit}`}
                            </span>
                            {selectedItem.code && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                SKU: {selectedItem.code}
                              </span>
                            )}
                          </div>
                        )}
                        {isOverStock && (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {isOutOfStock
                              ? 'Out of stock! Cannot bill.'
                              : `Insufficient stock (${curStock} available)`}
                          </p>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (lineQty > 1) form.setValue(`items.${idx}.quantity`, lineQty - 1);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            {...form.register(`items.${idx}.quantity`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-14 text-center bg-transparent text-slate-900 font-mono text-xs font-black focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => form.setValue(`items.${idx}.quantity`, lineQty + 1)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600 border-r border-slate-200">
                        {selectedItem?.unit || 'Pcs'}
                      </td>

                      {/* Price / Unit */}
                      <td className="py-2.5 px-3 border-r border-slate-200 space-y-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                        />
                        {Number(selectedItem?.wholesalePrice || 0) > 0 && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => form.setValue(`items.${idx}.unitPrice`, Number(selectedItem.salePrice || 0))}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                                Number(linePrice) === Number(selectedItem.salePrice)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Retail
                            </button>
                            <button
                              type="button"
                              onClick={() => form.setValue(`items.${idx}.unitPrice`, Number(selectedItem.wholesalePrice || 0))}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                                Number(linePrice) === Number(selectedItem.wholesalePrice)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                              }`}
                            >
                              Wholesale
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Discount % */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            {...form.register(`items.${idx}.discountPercent`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-full pr-5 pl-2 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                          />
                          <span className="absolute right-2 top-1.5 text-slate-400 text-[10px]">%</span>
                        </div>
                      </td>

                      {/* Tax Amount (if VAT) */}
                      {isVatBill && (
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 border-r border-slate-200">
                          Rs. {formatCurrency(totals.items[idx]?.taxAmount || 0)}
                        </td>
                      )}

                      {/* Line Total */}
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-xs border-r border-slate-200">
                        Rs. {formatCurrency(computedItemTotal)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 text-center">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER SUMMARY BAR */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 px-6">
            <button
              type="button"
              onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Another Item
            </button>
            <div className="flex items-center gap-6 font-medium">
              <span>
                Total Items: <strong className="text-slate-900">{fields.length}</strong>
              </span>
              <span>
                Total Qty:{' '}
                <strong className="text-slate-900 font-mono">
                  {(watchItems || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}
                </strong>
              </span>
              <span>
                Items Subtotal:{' '}
                <strong className="text-emerald-600 font-mono font-bold">
                  Rs. {formatCurrency(totals.subTotal)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: PAYMENT & SUMMARY SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: PAYMENT DETAILS & NOTES */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Immediate Payment Collection */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Payment Details
                </h4>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  saleMode === 'CREDIT'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  Mode: {saleMode === 'CREDIT' ? 'Credit (उधारो)' : 'Cash (नगद)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received Amount (Rs.)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    {...form.register('paidAmount', { valueAsNumber: true, onBlur: onNumericBlur })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-emerald-600 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    {...form.register('paymentMode')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value={PaymentMode.CASH}>Cash (नगद)</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / eSewa / Khalti</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deposit To Account</label>
                  <select
                    {...form.register('accountId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value="">Default Cash Account</option>
                    {filteredAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName || a.accountName} (Rs. {formatCurrency(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Status Notices */}
              {saleMode === 'CREDIT' ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>उधारो खाता (Customer Receivable):</span>
                  </div>
                  <span className="font-mono font-black text-amber-700 text-sm">
                    Rs. {formatCurrency(balanceDue)}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>नगद बिक्री (Fully Settled):</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    Paid Rs. {formatCurrency(paidAmount || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Terms & Notes Accordions */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  {showTerms ? 'Hide Terms' : '+ Terms & Conditions'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  {showNotes ? 'Hide Notes' : '+ Private Notes'}
                </button>
              </div>

              {showTerms && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={termsText}
                    onChange={(e) => setTermsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>
              )}

              {showNotes && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Private Internal Notes</label>
                  <textarea
                    rows={2}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter any private remarks or transport reference..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: GRAND TOTAL CALCULATION SUMMARY */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-200">
                Invoice Breakdown
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900 font-bold">Rs. {formatCurrency(totals.subTotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Total Line Discounts</span>
                    <span className="font-mono font-bold">- Rs. {formatCurrency(totals.discount)}</span>
                  </div>
                )}

                {isVatBill && (
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>VAT (13%)</span>
                    <span className="font-mono font-bold">+ Rs. {formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 p-4 rounded-2xl bg-slate-900 text-white flex items-baseline justify-between shadow-lg">
                  <span className="text-sm font-extrabold">Grand Total</span>
                  <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                    Rs. {formatCurrency(totals.totalAmount)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] font-medium">
                  <div className="flex justify-between text-slate-600">
                    <span>Amount Received Now:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      Rs. {formatCurrency(paidAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono font-bold text-amber-600">
                      Rs. {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM FIXED ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 flex items-center justify-between shadow-2xl">
          <button
            type="button"
            onClick={() => setIsDiscardConfirmOpen(true)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs"
          >
            Discard
          </button>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={createSale.isPending}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
            >
              {createSale.isPending ? 'Generating...' : '⚡ Save & Generate Invoice'}
            </button>
          </div>
        </div>
      </form>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickAddPartyOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" /> Quick Add Customer
                </h3>
                <button
                  onClick={() => setIsQuickAddPartyOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickAddParty} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={quickPartyName}
                    onChange={(e) => setQuickPartyName(e.target.value)}
                    placeholder="e.g. Ramesh Hardware"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={quickPartyPhone}
                    onChange={(e) => setQuickPartyPhone(e.target.value)}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddPartyOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createParty.isPending}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                  >
                    {createParty.isPending ? 'Adding...' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* SAVE CONFIRMATION MODAL */}
      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        title="Confirm Create Sales Invoice"
        message={`Are you sure you want to create this Sales Invoice for Rs. ${formatCurrency(totals.totalAmount)}? Inventory stock will be decreased and ${balanceDue > 0 ? `Rs. ${formatCurrency(balanceDue)} will be added to customer ledger` : 'payment will be recorded'}.`}
        isLoading={createSale.isPending}
      />

      {/* DISCARD CONFIRMATION MODAL */}
      <DiscardConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => router.push('/transactions/sales')}
        title="Discard Sales Invoice?"
        message="Are you sure you want to discard this new invoice? Any entered line items and customer details will be lost."
      />
    </div>
  );
}
