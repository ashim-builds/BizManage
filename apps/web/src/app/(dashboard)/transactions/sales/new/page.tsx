'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { DatePicker } from '@/components/ui/DatePicker';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  Building2,
  Phone,
  CheckCircle2,
  CreditCard,
  Banknote,
  Minus,
  X,
  UserPlus,
  FileText,
  Paperclip,
  Share2,
  Printer,
  ChevronDown,
  Search,
  Package,
} from 'lucide-react';

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // Mode: Credit (receivable) vs Cash (fully paid)
  const [saleMode, setSaleMode] = useState<'CREDIT' | 'CASH'>('CASH');

  // Multi-tab Simulation (Like Vyapar Desktop)
  const [activeTab, setActiveTab] = useState('Sale #1');

  // Confirmation Modals
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateSaleInput | null>(null);

  // Quick Add Party Modal
  const [isQuickAddPartyOpen, setIsQuickAddPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');

  // Desktop Item Dropdown State (Active Row ID)
  const [activeItemDropdownRow, setActiveItemDropdownRow] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Mobile Add Item Modal
  const [isMobileAddItemOpen, setIsMobileAddItemOpen] = useState(false);
  const [mobileItemSearch, setMobileItemSearch] = useState('');

  // Optional Section Visibility
  const [showTerms, setShowTerms] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [termsText, setTermsText] = useState('1. Goods once sold will not be taken back.\n2. Payment is due within agreed credit period.');
  const [descriptionText, setDescriptionText] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Bottom Share / Save Dropdown Menu
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isRoundOff, setIsRoundOff] = useState(true);
  const [globalDiscountPct, setGlobalDiscountPct] = useState<number>(0);

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
      items: [
        { itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 },
        { itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Watch Form Fields Reactively
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
    }
  }, [selectedCustomer]);

  // Live Totals Computation
  const totals = useMemo(() => {
    const rawItems = (watchItems || []).map((item) => ({
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice) || 0,
      discountPercent: Number(item?.discountPercent) || 0,
    }));

    const computed = calculateInvoiceTotals(rawItems, Boolean(isVatBill), globalDiscountPct);
    return computed;
  }, [watchItems, isVatBill, globalDiscountPct]);

  // Sync paidAmount with Cash/Credit mode
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

  // Item select handler for desktop spreadsheet & mobile
  const handleSelectItem = (index: number, item: any) => {
    form.setValue(`items.${index}.itemId`, item.id, { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.unitPrice`, Number(item.salePrice || 0), { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.quantity`, 1, { shouldValidate: true, shouldDirty: true });
    form.setValue(`items.${index}.discountPercent`, 0, { shouldValidate: true, shouldDirty: true });
    setActiveItemDropdownRow(null);
    setItemSearchQuery('');
  };

  // Filtered items for desktop dropdown search
  const filteredDesktopItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return availableItems;
    const q = itemSearchQuery.toLowerCase();
    return availableItems.filter(
      (i: any) =>
        i.name.toLowerCase().includes(q) ||
        (i.code && i.code.toLowerCase().includes(q))
    );
  }, [availableItems, itemSearchQuery]);

  // Filtered items for mobile item modal
  const filteredMobileItems = useMemo(() => {
    if (!mobileItemSearch.trim()) return availableItems;
    const q = mobileItemSearch.toLowerCase();
    return availableItems.filter(
      (it: any) =>
        it.name.toLowerCase().includes(q) ||
        (it.code && it.code.toLowerCase().includes(q))
    );
  }, [availableItems, mobileItemSearch]);

  // Form Submit Interceptor
  const onFormSubmit = (data: CreateSaleInput) => {
    if (saleMode === 'CREDIT' && !data.partyId) {
      toast.error('Please select a Customer for Credit sale.');
      return;
    }

    const validItems = (data.items || []).filter((it) => it.itemId && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item to the invoice.');
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

  const balanceDue = Math.max(0, totals.totalAmount - (Number(paidAmount) || 0));

  return (
    <div className="bg-[#f4f5f8] min-h-screen text-slate-900 font-sans -m-4 sm:-m-6 lg:-m-8">
      
      {/* ======================================================== */}
      {/* DESKTOP VYAPAR APPLICATION VIEW (HIDDEN ON MOBILE: >= md) */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-col min-h-screen bg-white">
        
        {/* TOP TAB BAR (Like Vyapar Desktop) */}
        <div className="bg-[#e9edf2] border-b border-slate-300 px-4 pt-2 flex items-center gap-1">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white border-t-2 border-t-blue-600 border-x border-slate-300 rounded-t-lg text-xs font-bold text-slate-800 shadow-xs">
            <span>{activeTab}</span>
            <button
              type="button"
              onClick={() => router.push('/transactions/sales')}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              form.reset();
              toast.success('Opened new sale tab');
            }}
            className="p-1.5 text-blue-600 hover:bg-slate-200 rounded-md transition-colors"
            title="New Sale Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* MAIN DESKTOP FORM */}
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex-1 p-6 space-y-5">
          
          {/* HEADER ROW: Title + Credit/Cash Toggle */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sale</h2>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={saleMode === 'CREDIT' ? 'text-blue-600 font-black' : 'text-slate-500'}>Credit</span>
              <button
                type="button"
                onClick={() => {
                  const nextMode = saleMode === 'CREDIT' ? 'CASH' : 'CREDIT';
                  setSaleMode(nextMode);
                  if (nextMode === 'CASH') {
                    form.setValue('paidAmount', totals.totalAmount, { shouldValidate: true, shouldDirty: true });
                  } else {
                    form.setValue('paidAmount', 0, { shouldValidate: true, shouldDirty: true });
                  }
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  saleMode === 'CASH' ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
              <span className={saleMode === 'CASH' ? 'text-blue-600 font-black' : 'text-slate-500'}>Cash</span>
            </div>
          </div>

          {/* CUSTOMER & INVOICE DETAILS ROW */}
          <div className="flex flex-wrap items-start justify-between gap-6 pb-2">
            
            {/* Customer Dropdown & Phone Inputs */}
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <select
                  {...form.register('partyId')}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs appearance-none pr-8"
                >
                  <option value="">
                    {saleMode === 'CREDIT' ? 'Search by Name/Phone *' : 'Search by Name/Phone (Cash Customer)'}
                  </option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({getPartyBalanceDisplay(c.currentBalance, 'CUSTOMER')})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              <div className="w-48">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone No."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsQuickAddPartyOpen(true)}
                className="px-2.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
              >
                + Add Customer
              </button>
            </div>

            {/* Invoice Number & Date */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-end gap-3">
                <span className="text-slate-500 font-semibold">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 w-32 text-right">2</span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-slate-500 font-semibold">Invoice Date</span>
                <div className="w-36">
                  <DatePicker
                    required
                    value={form.watch('date')}
                    onChange={(dateStr) => form.setValue('date', dateStr, { shouldValidate: true, shouldDirty: true })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SPREADSHEET LINE ITEMS TABLE (Exact Vyapar Grid) */}
          <div className="border border-slate-300 rounded-lg overflow-visible bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f4f5f8] text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">#</th>
                  <th className="py-2.5 px-4 min-w-[320px] border-r border-slate-300">ITEM</th>
                  <th className="py-2.5 px-3 text-center w-28 border-r border-slate-300">QTY</th>
                  <th className="py-2.5 px-3 text-center w-28 border-r border-slate-300">UNIT</th>
                  <th className="py-2.5 px-3 text-right w-40 border-r border-slate-300">PRICE/UNIT</th>
                  <th className="py-2.5 px-4 text-right w-40">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fields.map((field, idx) => {
                  const selectedItemId = form.watch(`items.${idx}.itemId`);
                  const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);
                  const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
                  const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;
                  const lineAmount = lineQty * linePrice;

                  const isDropdownOpen = activeItemDropdownRow === idx;

                  return (
                    <tr key={field.id} className="hover:bg-slate-50/70 transition-colors group relative">
                      
                      {/* # Index & Delete */}
                      <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200 relative">
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="hidden group-hover:inline-flex p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* ITEM SELECTOR INPUT & VYAPAR FLOATING POPUP */}
                      <td className="py-1 px-2 border-r border-slate-200 relative">
                        <input
                          type="text"
                          value={isDropdownOpen ? itemSearchQuery : (selectedItem?.name || '')}
                          onFocus={() => {
                            setActiveItemDropdownRow(idx);
                            setItemSearchQuery(selectedItem?.name || '');
                          }}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                          placeholder="Type item name..."
                          className="w-full px-2.5 py-1.5 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-900 font-semibold text-xs focus:outline-none"
                        />

                        {/* Vyapar Floating Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 w-[460px] bg-white border border-slate-300 rounded-lg shadow-2xl z-50 overflow-hidden text-xs">
                            <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                              <button
                                type="button"
                                onClick={() => {
                                  toast.success('Quick item create modal');
                                }}
                                className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Item
                              </button>
                              <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase">
                                <span>SALE PRICE</span>
                                <span>PURCHASE PRICE</span>
                                <span>STOCK</span>
                              </div>
                            </div>

                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                              {filteredDesktopItems.length === 0 ? (
                                <div className="p-4 text-center text-slate-400">No matching items</div>
                              ) : (
                                filteredDesktopItems.map((item: any) => {
                                  const stock = Number(item.currentStock || 0);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleSelectItem(idx, item)}
                                      className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50/80 transition-colors"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-800">{item.name}</p>
                                        {item.code && <p className="text-[10px] font-mono text-slate-400">{item.code}</p>}
                                      </div>
                                      <div className="flex items-center gap-8 font-mono text-right text-xs">
                                        <span className="w-16 font-bold text-slate-900">
                                          {item.salePrice || 0}
                                        </span>
                                        <span className="w-16 text-slate-500">
                                          {item.purchasePrice || 0}
                                        </span>
                                        <span className={`w-12 font-bold ${stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                          {stock}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* QTY */}
                      <td className="py-1 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className="w-full text-center px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 font-mono font-bold text-xs focus:outline-none"
                        />
                      </td>

                      {/* UNIT */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <select
                          value={selectedItem?.unit || 'NONE'}
                          className="w-full px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 text-xs font-medium text-slate-700 focus:outline-none"
                        >
                          <option value="NONE">{selectedItem?.unit || 'NONE'}</option>
                          <option value="PCS">PCS</option>
                          <option value="BOX">BOX</option>
                          <option value="KG">KG</option>
                          <option value="MTR">MTR</option>
                        </select>
                      </td>

                      {/* PRICE / UNIT */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          {...form.register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                          className="w-full text-right px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 font-mono font-bold text-xs focus:outline-none"
                        />
                      </td>

                      {/* AMOUNT */}
                      <td className="py-1 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(lineAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* TABLE FOOTER (ADD ROW & TOTAL SUMMARY) */}
            <div className="p-2.5 px-4 bg-[#f8fafc] border-t border-slate-300 flex items-center justify-between text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 })}
                className="px-3 py-1 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 font-bold transition-all"
              >
                ADD ROW
              </button>

              <div className="flex items-center gap-12 font-mono">
                <span>
                  TOTAL QTY:{' '}
                  <strong className="text-slate-900 font-black">
                    {(watchItems || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)}
                  </strong>
                </span>
                <span>
                  SUBTOTAL:{' '}
                  <strong className="text-slate-900 font-black text-sm">
                    {formatCurrency(totals.subTotal)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* LOWER SECTION: ACTIONS (LEFT) & INVOICE BREAKDOWN (RIGHT) */}
          <div className="grid grid-cols-12 gap-6 pt-2">
            
            {/* LEFT 4 BUTTONS (Terms, Description, Image, Document) */}
            <div className="col-span-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  {showTerms ? 'HIDE TERMS' : 'ADD TERMS & CONDITIONS'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDescription(!showDescription)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  {showDescription ? 'HIDE DESCRIPTION' : 'ADD DESCRIPTION'}
                </button>

                <button
                  type="button"
                  onClick={() => toast.success('Image upload ready')}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4 text-slate-400" /> ADD IMAGE
                </button>

                <button
                  type="button"
                  onClick={() => toast.success('Document upload ready')}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4 text-slate-400" /> ADD DOCUMENT
                </button>
              </div>

              {showTerms && (
                <textarea
                  rows={2}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              )}

              {showDescription && (
                <textarea
                  rows={2}
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  placeholder="Enter private description / transport notes..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              )}
            </div>

            {/* RIGHT BREAKDOWN & SAVE BUTTONS */}
            <div className="col-span-6 flex flex-col items-end space-y-3">
              
              <div className="w-80 space-y-2.5 text-xs font-semibold text-slate-600">
                {/* Discount */}
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={globalDiscountPct || ''}
                      onChange={(e) => setGlobalDiscountPct(Number(e.target.value) || 0)}
                      placeholder="%"
                      className="w-16 px-2 py-1 rounded border border-slate-300 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrency(totals.discount)}
                      className="w-24 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-right font-mono text-xs text-slate-700"
                    />
                  </div>
                </div>

                {/* Tax (VAT) */}
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={isVatBill ? 'VAT' : 'NONE'}
                      onChange={(e) => form.setValue('isVatBill', e.target.value === 'VAT', { shouldValidate: true, shouldDirty: true })}
                      className="w-28 px-2 py-1 rounded border border-slate-300 text-xs focus:outline-none"
                    >
                      <option value="NONE">NONE</option>
                      <option value="VAT">VAT 13%</option>
                    </select>
                    <span className="font-mono text-slate-900 w-16 text-right font-bold">
                      {formatCurrency(totals.taxAmount)}
                    </span>
                  </div>
                </div>

                {/* Round off & Total */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 text-[11px]">
                    <input
                      type="checkbox"
                      checked={isRoundOff}
                      onChange={(e) => setIsRoundOff(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Round Off
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Total</span>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrency(totals.totalAmount)}
                      className="w-36 px-3 py-1.5 rounded-lg bg-white border border-slate-400 font-mono font-black text-right text-sm text-slate-900 shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* BOTTOM ACTION BUTTONS (Share Dropdown + Save) */}
              <div className="flex items-center gap-2 pt-2 relative">
                
                {/* Share Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                    className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Share</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isShareMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs font-semibold text-slate-700 divide-y divide-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          toast.success('Share link generated');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>Share</span>
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          window.print();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>Print</span>
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          form.handleSubmit(onFormSubmit)();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-blue-600 font-bold"
                      >
                        <span>Save & New</span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Save Button */}
                <button
                  type="submit"
                  disabled={createSale.isPending}
                  className="px-8 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  {createSale.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* MOBILE VYAPAR APPLICATION VIEW (HIDDEN ON DESKTOP: < md) */}
      {/* ======================================================== */}
      <div className="md:hidden flex flex-col min-h-screen bg-[#F8FAFC] p-3 space-y-3">
        
        {/* Top Header */}
        <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Link href="/transactions/sales" className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Sale</h1>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSaleMode('CREDIT');
                form.setValue('paidAmount', 0, { shouldValidate: true, shouldDirty: true });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                saleMode === 'CREDIT' ? 'bg-emerald-600 text-white' : 'text-slate-600 font-bold'
              }`}
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => {
                setSaleMode('CASH');
                form.setValue('paidAmount', totals.totalAmount, { shouldValidate: true, shouldDirty: true });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                saleMode === 'CASH' ? 'bg-slate-800 text-white' : 'text-slate-600 font-bold'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-3 pb-24">
          
          {/* Invoice Meta */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice No.</span>
                <p className="font-bold text-slate-800 font-mono">2</p>
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

            <div className="pt-2 border-t border-slate-100">
              <select
                {...form.register('partyId')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-semibold"
              >
                <option value="">{saleMode === 'CREDIT' ? 'Customer *' : 'Customer (Optional)'}</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Box */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Items ({fields.length})</span>
              <button
                type="button"
                onClick={() => setIsMobileAddItemOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Items
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {fields.map((field, idx) => {
                const selectedItemId = form.watch(`items.${idx}.itemId`);
                const selectedItem = availableItems.find((i: any) => i.id === selectedItemId);
                const lineQty = Number(form.watch(`items.${idx}.quantity`)) || 0;
                const linePrice = Number(form.watch(`items.${idx}.unitPrice`)) || 0;

                return (
                  <div key={field.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{selectedItem?.name || `Item #${idx + 1}`}</p>
                      <p className="text-[10px] text-slate-400">
                        {lineQty} x Rs. {linePrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900">Rs. {formatCurrency(lineQty * linePrice)}</p>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="text-[10px] text-rose-500">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Total Amount</span>
              <span className="font-mono font-bold text-slate-900 text-sm">Rs. {formatCurrency(totals.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Received</span>
              <input
                type="number"
                {...form.register('paidAmount', { valueAsNumber: true })}
                className="w-24 px-2 py-0.5 text-right font-mono font-bold rounded border border-slate-300"
              />
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className={balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>Balance Due</span>
              <span className={`font-mono font-black ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                Rs. {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Mobile Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 flex items-center gap-2 z-40">
            <button
              type="button"
              onClick={() => router.push('/transactions/sales')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={createSale.isPending}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black shadow-md shadow-blue-600/20"
            >
              {createSale.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

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

              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {filteredMobileItems.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const firstItem = form.getValues('items.0');
                      if (fields.length === 1 && (!firstItem || !firstItem.itemId)) {
                        handleSelectItem(0, item);
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
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Stock: {item.currentStock || 0}</p>
                    </div>
                    <span className="font-bold font-mono text-slate-900 text-xs">Rs. {item.salePrice || 0}</span>
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
        message="Are you sure you want to discard this new invoice?"
      />
    </div>
  );
}
