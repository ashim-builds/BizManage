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
  Share2,
  Check,
} from 'lucide-react';

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // Mode: Credit (receivable) vs Cash (fully paid)
  const [saleMode, setSaleMode] = useState<'CASH' | 'CREDIT'>('CASH');
  const [saveAndNew, setSaveAndNew] = useState(false);

  // Confirmation Modals
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateSaleInput | null>(null);

  // Quick Add Party Modal
  const [isQuickAddPartyOpen, setIsQuickAddPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');

  // Mobile Customer Selector Sheet
  const [isMobileCustomerOpen, setIsMobileCustomerOpen] = useState(false);
  const [mobileCustomerSearch, setMobileCustomerSearch] = useState('');

  // Mobile Add Item Sheet
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
      if (saveAndNew) {
        // Reset form for next invoice
        form.reset({
          date: new Date().toISOString().split('T')[0],
          isVatBill: false,
          paidAmount: 0,
          paymentMode: PaymentMode.CASH,
          items: [{ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 }],
        });
        setCustomerPhone('');
        setNotesText('');
        setIsSaveConfirmOpen(false);
      } else {
        router.push('/transactions/sales');
      }
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
      setIsMobileCustomerOpen(false);
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

  // Filter customers for mobile customer modal
  const filteredMobileCustomers = useMemo(() => {
    if (!mobileCustomerSearch.trim()) return customers;
    const q = mobileCustomerSearch.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, mobileCustomerSearch]);

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans -m-4 sm:-m-6 lg:-m-8 p-3 sm:p-4 pb-32 md:pb-4 space-y-3">
      
      {/* 1. TOP HEADER & CREDIT / CASH PILL */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/transactions/sales"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            title="Back to Sales"
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
            <CreditCard className="w-3.5 h-3.5" /> Credit
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
            <Banknote className="w-3.5 h-3.5" /> Cash
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-3">
        
        {/* ========================================================= */}
        {/* MOBILE SPECIFIC DESIGN (< md) - EXACT VYAPAR MOBILE FLOW  */}
        {/* ========================================================= */}
        <div className="md:hidden space-y-3">
          
          {/* Mobile Meta Row */}
          <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-xs">
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
          </div>

          {/* Mobile Customer Card (Big Touch Friendly) */}
          <div
            onClick={() => setIsMobileCustomerOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer active:bg-slate-50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  {saleMode === 'CREDIT' ? 'Customer Party *' : 'Customer Party'}
                </p>
                <p className="font-bold text-slate-900 text-sm truncate">
                  {selectedCustomer ? selectedCustomer.name : (saleMode === 'CREDIT' ? 'Select Customer (Required)' : 'Cash / Walk-in Customer')}
                </p>
                {selectedCustomer && (
                  <p className="text-[10px] text-slate-500">
                    Ledger: <strong className="text-slate-800">{getPartyBalanceDisplay(selectedCustomer.currentBalance, 'CUSTOMER')}</strong>
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 shrink-0">Change</span>
          </div>

          {/* Mobile Items List Card */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Invoice Items ({fields.filter(f => form.watch(`items.${fields.indexOf(f)}.itemId`)).length})
              </span>
              <button
                type="button"
                onClick={() => setIsMobileAddItemOpen(true)}
                className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Items
              </button>
            </div>

            {/* Empty State */}
            {fields.length === 1 && !form.watch('items.0.itemId') ? (
              <button
                type="button"
                onClick={() => setIsMobileAddItemOpen(true)}
                className="w-full py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 text-center space-y-1.5 active:bg-blue-50/50"
              >
                <Package className="w-6 h-6 mx-auto text-blue-500" />
                <p className="text-xs font-bold text-blue-600">+ Add Items (Products / Services)</p>
                <p className="text-[10px] text-slate-400">Tap to search & add items to bill</p>
              </button>
            ) : (
              <div className="space-y-2.5">
                {fields.map((field, idx) => {
                  const selectedItemId = form.watch(`items.${idx}.itemId`);
                  if (!selectedItemId) return null;
                  const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);
                  const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
                  const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;
                  const lineDisc = Number(form.watch(`items.${idx}.discountPercent`)) || 0;
                  const itemLineTotal = totals.items[idx]?.total ?? (lineQty * linePrice * (1 - lineDisc / 100));

                  return (
                    <div key={field.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{selectedItem?.name}</p>
                          {selectedItem?.code && (
                            <span className="text-[10px] font-mono text-slate-500">SKU: {selectedItem.code}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-xs items-center">
                        {/* Qty Stepper */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Qty</label>
                          <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                if (lineQty > 1) form.setValue(`items.${idx}.quantity`, lineQty - 1, { shouldValidate: true, shouldDirty: true });
                              }}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Minus className="w-2.5 h-2.5" />
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
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Plus className="w-2.5 h-2.5" />
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
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-right font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Subtotal</label>
                          <p className="font-mono font-black text-slate-900 text-xs">
                            Rs. {formatCurrency(itemLineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Totals Breakdown Card */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
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

          {/* Mobile Payment Type Selector */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Payment Type:</span>
              <select
                {...form.register('paymentMode')}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:outline-none"
              >
                <option value={PaymentMode.CASH}>Cash (नगद)</option>
                <option value={PaymentMode.BANK}>Bank Transfer</option>
                <option value={PaymentMode.ONLINE}>eSewa / Mobile Wallet</option>
                <option value={PaymentMode.CHEQUE}>Cheque</option>
              </select>
            </div>
          </div>

          {/* Mobile Description */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <input
              type="text"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Description / Remarks (Optional)..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          {/* Mobile Terms & Conditions Accordion */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
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

        {/* ========================================================= */}
        {/* DESKTOP SPECIFIC DESIGN (>= md) - HIGH DENSITY SPREADSHEET */}
        {/* ========================================================= */}
        <div className="hidden md:block space-y-3">
          
          {/* Desktop Meta & Customer */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4 space-y-1">
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

              <div className="col-span-3 space-y-1">
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

              <div className="col-span-3 space-y-1">
                <DatePicker
                  label="Invoice Date"
                  required
                  value={form.watch('date')}
                  onChange={(dateStr) => form.setValue('date', dateStr, { shouldValidate: true, shouldDirty: true })}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-emerald-600" /> Tax Type
                </label>
                <select
                  value={isVatBill ? 'VAT' : 'NORMAL'}
                  onChange={(e) => form.setValue('isVatBill', e.target.value === 'VAT', { shouldValidate: true, shouldDirty: true })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                >
                  <option value="NORMAL">Normal Bill</option>
                  <option value="VAT">VAT 13%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Line Items Table */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-visible">
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

                      <td className="py-1.5 px-2.5 border-r border-slate-200">
                        <ItemSearchSelect
                          items={availableItems}
                          value={selectedItemId || ''}
                          onChange={(id) => handleItemSelect(idx, id)}
                          placeholder="Select product…"
                          priceField="salePrice"
                        />
                      </td>

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

                      <td className="py-1.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {selectedItem?.unit || 'Pcs'}
                      </td>

                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                        />
                      </td>

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

                      {isVatBill && (
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-700 border-r border-slate-200">
                          Rs. {formatCurrency(totals.items[idx]?.taxAmount || 0)}
                        </td>
                      )}

                      <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 text-xs border-r border-slate-200">
                        Rs. {formatCurrency(computedItemTotal)}
                      </td>

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

          {/* Desktop Summary & Actions */}
          <div className="grid grid-cols-12 gap-3 items-stretch">
            <div className="col-span-7 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Payment & Settlement
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  saleMode === 'CREDIT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {saleMode === 'CREDIT' ? 'Credit Sale' : 'Cash Sale'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Received (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...form.register('paidAmount', { valueAsNumber: true })}
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
                    <option value={PaymentMode.ONLINE}>eSewa / Wallet</option>
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

            <div className="col-span-5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                  <span>Subtotal ({fields.length} items)</span>
                  <span className="font-mono text-slate-900 font-bold">Rs. {formatCurrency(totals.subTotal)}</span>
                </div>

                {isVatBill && (
                  <div className="flex justify-between text-blue-600 font-semibold text-[11px]">
                    <span>VAT (13%)</span>
                    <span className="font-mono font-bold">+ Rs. {formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-900 text-white flex items-baseline justify-between shadow-sm">
                  <span className="text-xs font-bold text-slate-200">Grand Total</span>
                  <span className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                    Rs. {formatCurrency(totals.totalAmount)}
                  </span>
                </div>
              </div>

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
                  onClick={() => setSaveAndNew(false)}
                  disabled={createSale.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {createSale.isPending ? 'Saving...' : 'Save & Generate Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VYAPAR-STYLE MOBILE STICKY BOTTOM BAR (3 BUTTONS)         */}
        {/* ========================================================= */}
        <div className="fixed md:hidden bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-2.5 px-3 pb-4 shadow-2xl flex items-center justify-between gap-2">
          {/* Save & New Button */}
          <button
            type="submit"
            onClick={() => setSaveAndNew(true)}
            disabled={createSale.isPending}
            className="flex-1 py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold active:scale-95 transition-all text-center border border-slate-200"
          >
            Save & New
          </button>

          {/* Primary Save Button */}
          <button
            type="submit"
            onClick={() => setSaveAndNew(false)}
            disabled={createSale.isPending}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save
          </button>

          {/* Share/Print Action */}
          <button
            type="submit"
            onClick={() => setSaveAndNew(false)}
            className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all"
            title="Save & Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* MOBILE CUSTOMER SELECTION SHEET */}
      {isMobileCustomerOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end p-0">
            <div className="w-full bg-white rounded-t-3xl p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> Select Customer
                </h3>
                <button
                  onClick={() => setIsMobileCustomerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search + Quick Add */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer by name or phone..."
                    value={mobileCustomerSearch}
                    onChange={(e) => setMobileCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCustomerOpen(false);
                    setIsQuickAddPartyOpen(true);
                  }}
                  className="p-2 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Customers List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
                {saleMode === 'CASH' && (
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('partyId', '', { shouldValidate: true, shouldDirty: true });
                      setCustomerPhone('');
                      setIsMobileCustomerOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Cash / Walk-in Customer</p>
                      <p className="text-[10px] text-slate-400">Default for immediate cash sales</p>
                    </div>
                    {!selectedPartyId && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                )}

                {filteredMobileCustomers.map((c: any) => {
                  const isSelected = c.id === selectedPartyId;
                  const balLabel = getPartyBalanceDisplay(c.currentBalance, 'CUSTOMER');
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        form.setValue('partyId', c.id, { shouldValidate: true, shouldDirty: true });
                        setCustomerPhone(c.phone || '');
                        setIsMobileCustomerOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.phone || 'No phone'} · {balLabel}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MOBILE ADD ITEM SHEET */}
      {isMobileAddItemOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end p-0">
            <div className="w-full bg-white rounded-t-3xl p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" /> Select Product / Item
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
                  placeholder="Search item name or SKU barcode..."
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
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 active:bg-blue-50"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Stock: {item.currentStock || 0} {item.unit} {item.code ? `· SKU: ${item.code}` : ''}
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
