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
  FileText,
  CreditCard,
  Banknote,
  Minus,
  X,
  UserPlus,
  Save,
  RotateCcw,
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
  const [showNotes, setShowNotes] = useState(false);
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
      toast.success('Sale Invoice created successfully!');
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
    <div className="bg-[#F8FAFC] text-slate-900 font-sans -m-4 sm:-m-6 lg:-m-8 p-3 sm:p-4 space-y-3">
      {/* TOP HEADER & TOGGLE BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Link
            href="/transactions/sales"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all"
            title="Back to Sales"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Receipt className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              New Sales Invoice
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              Auto #
            </span>
          </div>
        </div>

        {/* CASH VS CREDIT TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSaleMode('CREDIT');
              form.setValue('paidAmount', 0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              saleMode === 'CREDIT'
                ? 'bg-amber-500 text-white shadow-xs'
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              saleMode === 'CASH'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            Cash (नगद)
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-3">
        {/* COMPACT ROW 1: CUSTOMER & METADATA */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
            
            {/* Customer Party */}
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  {saleMode === 'CREDIT' ? 'Customer Party *' : 'Customer Party'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickAddPartyOpen(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-2.5 h-2.5" /> Quick Add
                </button>
              </div>

              <select
                {...form.register('partyId')}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
              >
                <option value="">
                  {saleMode === 'CREDIT' ? '-- Select Customer (Required) --' : 'Cash / Walk-in Customer'}
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
            </div>

            {/* Phone */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98XXXXXXXX"
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
              />
            </div>

            {/* Date */}
            <div className="md:col-span-3 space-y-1">
              <DatePicker
                label="Invoice Date"
                required
                value={form.watch('date')}
                onChange={(dateStr) => form.setValue('date', dateStr)}
              />
            </div>

            {/* Bill Type */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-600" /> Tax Type
              </label>
              <select
                value={isVatBill ? 'VAT' : 'NORMAL'}
                onChange={(e) => form.setValue('isVatBill', e.target.value === 'VAT')}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
              >
                <option value="NORMAL">Normal Bill</option>
                <option value="VAT">VAT 13%</option>
              </select>
            </div>
          </div>
        </div>

        {/* COMPACT ROW 2: LINE ITEMS TABLE */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-2.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Invoice Items ({fields.length})
              </span>
              {isVatBill && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  VAT 13%
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-2.5 text-center w-10 border-r border-slate-200">#</th>
                  <th className="py-2 px-3 min-w-[240px] border-r border-slate-200">Product / Item</th>
                  <th className="py-2 px-2.5 text-center w-28 border-r border-slate-200">Quantity</th>
                  <th className="py-2 px-2.5 text-center w-16 border-r border-slate-200">Unit</th>
                  <th className="py-2 px-2.5 text-right w-36 border-r border-slate-200">Rate (Rs.)</th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-200">Disc (%)</th>
                  {isVatBill && <th className="py-2 px-2.5 text-right w-24 border-r border-slate-200">VAT (13%)</th>}
                  <th className="py-2 px-3 text-right w-32 border-r border-slate-200">Amount (Rs.)</th>
                  <th className="py-2 px-2 text-center w-10"></th>
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

                  return (
                    <tr
                      key={field.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOutOfStock ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-center font-mono text-slate-400 font-bold border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Item Selector */}
                      <td className="py-1.5 px-2.5 border-r border-slate-200">
                        <ItemSearchSelect
                          items={availableItems}
                          value={selectedItemId || ''}
                          onChange={(id) => {
                            form.setValue(`items.${idx}.itemId`, id);
                            handleItemSelect(idx, id);
                          }}
                          placeholder="Select product…"
                          priceField="salePrice"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200">
                        <div className="inline-flex items-center gap-0.5 bg-slate-50 border border-slate-300 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (lineQty > 1) form.setValue(`items.${idx}.quantity`, lineQty - 1);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            {...form.register(`items.${idx}.quantity`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-10 text-center bg-transparent text-slate-900 font-mono text-xs font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => form.setValue(`items.${idx}.quantity`, lineQty + 1)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-1.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {selectedItem?.unit || 'Pcs'}
                      </td>

                      {/* Price / Unit */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            onKeyDown={onNumericKeyDown}
                            onFocus={onNumericFocus}
                            {...form.register(`items.${idx}.discountPercent`, { valueAsNumber: true, onBlur: onNumericBlur })}
                            className="w-full pr-4 pl-1.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                          />
                          <span className="absolute right-1.5 top-1 text-slate-400 text-[9px]">%</span>
                        </div>
                      </td>

                      {/* Tax Amount */}
                      {isVatBill && (
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-700 border-r border-slate-200">
                          Rs. {formatCurrency(totals.items[idx]?.taxAmount || 0)}
                        </td>
                      )}

                      {/* Line Total */}
                      <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 text-xs border-r border-slate-200">
                        Rs. {formatCurrency(computedItemTotal)}
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-1.5 text-center">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* COMPACT ROW 3: UNIFIED PAYMENT, SUMMARY & ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          
          {/* LEFT: PAYMENT DETAILS */}
          <div className="md:col-span-7 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Payment & Settlement
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  saleMode === 'CREDIT'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {saleMode === 'CREDIT' ? 'Credit Sale' : 'Cash Sale'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Received (Rs.)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    {...form.register('paidAmount', { valueAsNumber: true, onBlur: onNumericBlur })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-emerald-600 font-mono font-black text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Mode</label>
                  <select
                    {...form.register('paymentMode')}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value={PaymentMode.CASH}>Cash (नगद)</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / eSewa</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Deposit Account</label>
                  <select
                    {...form.register('accountId')}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value="">Default Account</option>
                    {filteredAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName || a.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {saleMode === 'CREDIT' ? (
                <div className="p-2 px-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Customer Receivable:
                  </span>
                  <span className="font-mono font-black text-amber-700">
                    Rs. {formatCurrency(balanceDue)}
                  </span>
                </div>
              ) : (
                <div className="p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-emerald-800 font-bold text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled in Cash:
                  </span>
                  <span className="font-mono font-black text-emerald-700">
                    Paid Rs. {formatCurrency(paidAmount || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Optional Notes Toggle */}
            <div>
              {showNotes ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Private Notes</label>
                    <button
                      type="button"
                      onClick={() => setShowNotes(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Hide
                    </button>
                  </div>
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter transport/remarks..."
                    className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> + Add Remarks / Notes
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: GRAND TOTAL & ACTION BUTTONS */}
          <div className="md:col-span-5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                <span>Subtotal ({fields.length} items)</span>
                <span className="font-mono text-slate-900 font-bold">Rs. {formatCurrency(totals.subTotal)}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold text-[11px]">
                  <span>Discounts</span>
                  <span className="font-mono font-bold">- Rs. {formatCurrency(totals.discount)}</span>
                </div>
              )}

              {isVatBill && (
                <div className="flex justify-between text-blue-600 font-semibold text-[11px]">
                  <span>VAT (13%)</span>
                  <span className="font-mono font-bold">+ Rs. {formatCurrency(totals.taxAmount)}</span>
                </div>
              )}

              {/* Grand Total Box */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-baseline justify-between shadow-sm">
                <span className="text-xs font-bold text-slate-200">Grand Total</span>
                <span className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                  Rs. {formatCurrency(totals.totalAmount)}
                </span>
              </div>
            </div>

            {/* INTEGRATED ACTION BUTTONS */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsDiscardConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Discard
              </button>

              <button
                type="submit"
                disabled={createSale.isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {createSale.isPending ? 'Saving...' : 'Save & Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickAddPartyOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" /> Quick Add Customer
                </h3>
                <button
                  onClick={() => setIsQuickAddPartyOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickAddParty} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={quickPartyName}
                    onChange={(e) => setQuickPartyName(e.target.value)}
                    placeholder="e.g. Ramesh Hardware"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={quickPartyPhone}
                    onChange={(e) => setQuickPartyPhone(e.target.value)}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddPartyOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createParty.isPending}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
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
