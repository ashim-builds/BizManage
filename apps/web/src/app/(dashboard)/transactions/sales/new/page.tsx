'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { toast } from 'react-hot-toast';
import {
  Receipt,
  Plus,
  Trash2,
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
  Search,
  Package,
  ChevronDown,
  ChevronUp,
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

  // Mobile Add Item Modal
  const [isMobileAddItemOpen, setIsMobileAddItemOpen] = useState(false);
  const [mobileItemSearch, setMobileItemSearch] = useState('');

  // Optional Section Accordions
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState('1. Goods once sold will not be taken back.\n2. Payment is due within agreed credit period.');
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

  // Watch Form Fields Reactively using useWatch
  const watchItems = useWatch({ control: form.control, name: 'items' });
  const isVatBill = useWatch({ control: form.control, name: 'isVatBill' });
  const selectedPartyId = useWatch({ control: form.control, name: 'partyId' });
  const selectedPaymentMode = useWatch({ control: form.control, name: 'paymentMode' });
  const paidAmount = useWatch({ control: form.control, name: 'paidAmount' }) ?? 0;

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
    const rawItems = (watchItems || []).map((item) => ({
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice) || 0,
      discountPercent: Number(item?.discountPercent) || Number(item?.discount) || 0,
    }));

    return calculateInvoiceTotals(rawItems, Boolean(isVatBill));
  }, [watchItems, isVatBill]);

  // Sync paidAmount when switching between Cash and Credit mode or when totals change in Cash mode
  useEffect(() => {
    if (saleMode === 'CASH') {
      form.setValue('paidAmount', totals.totalAmount, { shouldValidate: true, shouldDirty: true });
    } else {
      if (paidAmount === totals.totalAmount && totals.totalAmount > 0) {
        form.setValue('paidAmount', 0, { shouldValidate: true, shouldDirty: true });
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

  // Item select handler for desktop & mobile
  const handleItemSelect = useCallback((index: number, itemId: string) => {
    const selected = availableItems.find((i: any) => i.id === itemId);
    if (!selected) return;
    form.setValue(`items.${index}.itemId`, itemId, { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.unitPrice`, Number(selected.salePrice || 0), { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.quantity`, 1, { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.discount`, 0, { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.discountPercent`, 0, { shouldValidate: true, shouldDirty: true });
  }, [availableItems, form]);

  // Add Item From Mobile Modal
  const handleAddMobileItem = (item: any) => {
    // If the first item is empty, replace it; otherwise append
    const firstItem = form.getValues('items.0');
    if (fields.length === 1 && (!firstItem || !firstItem.itemId)) {
      form.setValue('items.0.itemId', item.id, { shouldValidate: true, shouldDirty: true });
      form.setValue('items.0.unitPrice', Number(item.salePrice || 0), { shouldValidate: true, shouldDirty: true });
      form.setValue('items.0.quantity', 1, { shouldValidate: true, shouldDirty: true });
      form.setValue('items.0.discountPercent', 0, { shouldValidate: true, shouldDirty: true });
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
    setIsMobileAddItemOpen(false);
    toast.success(`Added ${item.name}`);
  };

  // Form Submit Interceptor for Save Confirmation
  const onFormSubmit = (data: CreateSaleInput) => {
    if (saleMode === 'CREDIT' && !data.partyId) {
      toast.error('Please select a Customer Party for Credit (उधारो) sale.');
      return;
    }

    // Filter valid items
    const validItems = (data.items || []).filter((it) => it.itemId);
    if (validItems.length === 0) {
      toast.error('Please add at least one product item to the invoice.');
      return;
    }

    setPendingFormData({ ...data, items: validItems });
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
        form.setValue('partyId', created.id, { shouldValidate: true, shouldDirty: true });
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

  // Filter items for mobile item modal
  const filteredMobileItems = useMemo(() => {
    if (!mobileItemSearch.trim()) return availableItems;
    const q = mobileItemSearch.toLowerCase();
    return availableItems.filter(
      (it: any) =>
        it.name.toLowerCase().includes(q) ||
        (it.code && it.code.toLowerCase().includes(q))
    );
  }, [availableItems, mobileItemSearch]);

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans -m-4 sm:-m-6 lg:-m-8 p-3 sm:p-4 pb-28 md:pb-4 space-y-3">
      
      {/* 1. TOP HEADER & CREDIT / CASH PILL */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/transactions/sales"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-slate-900 tracking-tight">Sale</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              Auto #
            </span>
          </div>
        </div>

        {/* CREDIT / CASH TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSaleMode('CREDIT');
              form.setValue('paidAmount', 0, { shouldValidate: true, shouldDirty: true });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              saleMode === 'CREDIT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <CreditCard className="w-3 h-3" /> Credit
          </button>
          <button
            type="button"
            onClick={() => {
              setSaleMode('CASH');
              form.setValue('paidAmount', totals.totalAmount, { shouldValidate: true, shouldDirty: true });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              saleMode === 'CASH'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <Banknote className="w-3 h-3" /> Cash
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-3">
        
        {/* 2. INVOICE META & CUSTOMER */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          
          {/* Top Meta Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pb-2 border-b border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice No.</span>
              <p className="font-bold text-slate-800 font-mono mt-0.5">Auto #</p>
            </div>
            <div>
              <DatePicker
                label="Date"
                required
                value={form.watch('date')}
                onChange={(dateStr) => form.setValue('date', dateStr, { shouldValidate: true, shouldDirty: true })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Tax Type</label>
              <select
                value={isVatBill ? 'VAT' : 'NORMAL'}
                onChange={(e) => form.setValue('isVatBill', e.target.value === 'VAT', { shouldValidate: true, shouldDirty: true })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="NORMAL">Normal Bill</option>
                <option value="VAT">VAT 13%</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Customer Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98XXXXXXXX"
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Customer Selector Card */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                {saleMode === 'CREDIT' ? 'Customer *' : 'Customer (Optional for Cash)'}
              </label>
              <button
                type="button"
                onClick={() => setIsQuickAddPartyOpen(true)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Customer
              </button>
            </div>

            <select
              {...form.register('partyId')}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="">
                {saleMode === 'CREDIT' ? '-- Select Customer (Required for Credit) --' : 'Cash / Walk-in Customer'}
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
        </div>

        {/* 3. ITEMS SECTION (RESPONSIVE: MOBILE CARDS + DESKTOP SPREADSHEET TABLE) */}
        
        {/* MOBILE VIEW (< md) */}
        <div className="md:hidden space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Items ({fields.length})
            </span>
            <button
              type="button"
              onClick={() => setIsMobileAddItemOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Items
            </button>
          </div>

          {fields.map((field, idx) => {
            const selectedItemId = form.watch(`items.${idx}.itemId`);
            const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);
            const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
            const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;
            const lineDisc = Number(form.watch(`items.${idx}.discountPercent`)) || 0;
            const itemLineTotal = totals.items[idx]?.total ?? (lineQty * linePrice * (1 - lineDisc / 100));

            return (
              <div key={field.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-xs">
                      {selectedItem?.name || `Item #${idx + 1} (Tap to select)`}
                    </p>
                    {selectedItem?.code && (
                      <span className="text-[10px] font-mono text-slate-400">SKU: {selectedItem.code}</span>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {!selectedItemId && (
                  <ItemSearchSelect
                    items={availableItems}
                    value={selectedItemId || ''}
                    onChange={(id) => handleItemSelect(idx, id)}
                    placeholder="Search or select product…"
                  />
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-xs items-center">
                  {/* Qty */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Quantity</label>
                    <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          if (lineQty > 1) form.setValue(`items.${idx}.quantity`, lineQty - 1, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        className="w-full text-center bg-transparent font-bold text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => form.setValue(`items.${idx}.quantity`, lineQty + 1, { shouldValidate: true, shouldDirty: true })}
                        className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Rate (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Amount</label>
                    <p className="font-mono font-black text-slate-900 text-xs">
                      Rs. {formatCurrency(itemLineTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP VIEW (>= md) */}
        <div className="hidden md:block rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-visible">
          <div className="p-2.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Invoice Items ({fields.length})
              </span>
              {isVatBill && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  VAT 13% Applied
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-2.5 text-center w-10 border-r border-slate-200">#</th>
                <th className="py-2.5 px-3 min-w-[260px] border-r border-slate-200">Product / Item</th>
                <th className="py-2.5 px-2.5 text-center w-28 border-r border-slate-200">Quantity</th>
                <th className="py-2.5 px-2.5 text-center w-16 border-r border-slate-200">Unit</th>
                <th className="py-2.5 px-2.5 text-right w-36 border-r border-slate-200">Rate (Rs.)</th>
                <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200">Disc (%)</th>
                {isVatBill && <th className="py-2.5 px-2.5 text-right w-24 border-r border-slate-200">VAT (13%)</th>}
                <th className="py-2.5 px-3 text-right w-32 border-r border-slate-200">Amount (Rs.)</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, idx) => {
                const selectedItemId = form.watch(`items.${idx}.itemId`);
                const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);

                const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
                const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;
                const lineDiscount = Number(form.watch(`items.${idx}.discountPercent`)) || 0;
                const computedItemTotal = totals.items[idx]?.total ?? (lineQty * linePrice * (1 - lineDiscount / 100));

                return (
                  <tr key={field.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-2 text-center font-mono text-slate-400 font-bold border-r border-slate-200">
                      {idx + 1}
                    </td>

                    {/* Item Selector */}
                    <td className="py-1.5 px-2.5 border-r border-slate-200">
                      <ItemSearchSelect
                        items={availableItems}
                        value={selectedItemId || ''}
                        onChange={(id) => handleItemSelect(idx, id)}
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
                            if (lineQty > 1) form.setValue(`items.${idx}.quantity`, lineQty - 1, { shouldValidate: true, shouldDirty: true });
                          }}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className="w-10 text-center bg-transparent text-slate-900 font-mono text-xs font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => form.setValue(`items.${idx}.quantity`, lineQty + 1, { shouldValidate: true, shouldDirty: true })}
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
                        type="number"
                        step="any"
                        {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          {...form.register(`items.${idx}.discountPercent`, { valueAsNumber: true })}
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

        {/* 4. TOTALS, PAYMENT & DETAILS (MATCHING VYAPAR WORKFLOW) */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          
          {/* Totals Summary Row */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 font-semibold border-b border-dashed border-slate-200 pb-1.5">
              <span>Total Amount</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                Rs. {formatCurrency(totals.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 font-semibold border-b border-dashed border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Received
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono">Rs.</span>
                <input
                  type="number"
                  step="any"
                  {...form.register('paidAmount', { valueAsNumber: true })}
                  className="w-28 px-2 py-0.5 text-right font-mono font-black text-xs rounded border border-slate-300 text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center font-bold">
              <span className={balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                Balance Due
              </span>
              <span className={`font-mono font-black text-sm ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                Rs. {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Payment Type:</span>
              <select
                {...form.register('paymentMode')}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:outline-none"
              >
                <option value={PaymentMode.CASH}>Cash (नगद)</option>
                <option value={PaymentMode.BANK}>Bank</option>
                <option value={PaymentMode.ONLINE}>eSewa / Wallet</option>
                <option value={PaymentMode.CHEQUE}>Cheque</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Account:</span>
              <select
                {...form.register('accountId')}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 font-semibold bg-white text-xs focus:outline-none"
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

          {/* Description & Remarks */}
          <div className="pt-2 border-t border-slate-100">
            <input
              type="text"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Description / Remarks (Optional)..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Collapsible Terms & Conditions */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700"
            >
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Terms & Conditions
              </span>
              {showTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showTerms && (
              <textarea
                rows={2}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none font-sans"
              />
            )}
          </div>
        </div>

        {/* 5. ACTION BUTTONS (MOBILE STICKY & DESKTOP EMBEDDED) */}
        <div className="fixed md:static bottom-0 left-0 right-0 z-40 bg-white md:bg-transparent border-t md:border-t-0 border-slate-200 p-3 px-4 shadow-lg md:shadow-none flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsDiscardConfirmOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Discard
          </button>

          <button
            type="submit"
            disabled={createSale.isPending}
            className="flex-1 max-w-xs md:max-w-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {createSale.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* MOBILE ADD ITEM MODAL */}
      {isMobileAddItemOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end md:justify-center p-0 md:p-4">
            <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" /> Select Item to Add
                </h3>
                <button
                  onClick={() => setIsMobileAddItemOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item name or SKU..."
                  value={mobileItemSearch}
                  onChange={(e) => setMobileItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Item List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
                {filteredMobileItems.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddMobileItem(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Stock: {item.currentStock || 0} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-slate-900 text-xs">
                        Rs. {formatCurrency(item.salePrice || 0)}
                      </p>
                      <span className="text-[10px] font-bold text-blue-600">+ Add</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

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
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={quickPartyPhone}
                    onChange={(e) => setQuickPartyPhone(e.target.value)}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
        message={`Are you sure you want to create this Sales Invoice for Rs. ${formatCurrency(totals.totalAmount)}?`}
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
