'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createSaleSchema,
  createPurchaseSchema,
  createPaymentInSchema,
  createPaymentOutSchema,
  createExpenseSchema,
  createIncomeSchema,
  partySchema,
  itemSchema,
} from '@bizmanage/validation';
import { PaymentMode, PartyType, ItemType } from '@bizmanage/types';
import { toast } from 'react-hot-toast';
import { useCreateSale } from '@/services/saleService';
import { useCreatePurchase } from '@/services/purchaseService';
import { useCreatePaymentIn, useCreatePaymentOut } from '@/services/paymentService';
import { useCreateExpense } from '@/services/expenseService';
import { useCreateIncome } from '@/services/incomeService';
import { useCreateParty, useParties } from '@/services/partyService';
import { useCreateItem, useItems } from '@/services/itemService';
import { useAccounts } from '@/services/accountService';
import { getPartyBalanceDisplay } from '@/lib/balance';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/accounting';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { ItemSearchSelect } from '@/components/ui/ItemSearchSelect';
import {
  Zap,
  X,
  ShoppingCart,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  UserPlus,
  PackagePlus,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

export type QuickEntryType =
  | 'sale'
  | 'purchase'
  | 'payment_in'
  | 'payment_out'
  | 'expense'
  | 'income'
  | 'add_party'
  | 'add_item';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: QuickEntryType;
}

const TAB_CONFIG: {
  id: QuickEntryType;
  label: string;
  icon: any;
  activeColor: string;
  badgeBg: string;
}[] = [
  { id: 'sale', label: 'Sale', icon: ShoppingCart, activeColor: 'bg-blue-600 text-white shadow-xs', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'purchase', label: 'Purchase', icon: Receipt, activeColor: 'bg-indigo-600 text-white shadow-xs', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'payment_in', label: 'Pay In', icon: ArrowDownRight, activeColor: 'bg-emerald-600 text-white shadow-xs', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'payment_out', label: 'Pay Out', icon: ArrowUpRight, activeColor: 'bg-rose-600 text-white shadow-xs', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'expense', label: 'Expense', icon: DollarSign, activeColor: 'bg-amber-600 text-white shadow-xs', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'income', label: 'Income', icon: TrendingUp, activeColor: 'bg-teal-600 text-white shadow-xs', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'add_party', label: 'Party', icon: UserPlus, activeColor: 'bg-slate-900 text-white shadow-xs', badgeBg: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'add_item', label: 'Item', icon: PackagePlus, activeColor: 'bg-cyan-600 text-white shadow-xs', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

export function QuickEntryModal({ isOpen, onClose, defaultType = 'sale' }: QuickEntryModalProps) {
  const [activeType, setActiveType] = useState<QuickEntryType>(defaultType);
  const modalRef = useRef<HTMLDivElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveType(defaultType);
      setSuccessMsg(null);
    }
  }, [isOpen, defaultType]);

  // Global Keyboard ShortCut (Escape to close)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Shared Queries
  const { data: partiesData } = useParties({ limit: 100 });
  const { data: itemsData } = useItems({ limit: 1000 });
  const { data: accountsData } = useAccounts();

  const parties = partiesData?.data || [];
  const items = itemsData?.data || [];
  const accounts = accountsData?.data || [];

  const customers = parties.filter((p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH');
  const suppliers = parties.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH');

  // Shared Mutations
  const createSale = useCreateSale();
  const createPurchase = useCreatePurchase();
  const createPaymentIn = useCreatePaymentIn();
  const createPaymentOut = useCreatePaymentOut();
  const createExpense = useCreateExpense();
  const createIncome = useCreateIncome();
  const createParty = useCreateParty();
  const createItem = useCreateItem();

  // Forms
  const saleForm = useForm({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      partyId: '',
      date: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      isVatBill: false,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const purchaseForm = useForm({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      partyId: '',
      date: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      isVatBill: false,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discountPercent: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const paymentInForm = useForm({
    resolver: zodResolver(createPaymentInSchema),
    defaultValues: {
      partyId: '',
      amount: 0,
      mode: PaymentMode.CASH,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const paymentOutForm = useForm({
    resolver: zodResolver(createPaymentOutSchema),
    defaultValues: {
      partyId: '',
      amount: 0,
      mode: PaymentMode.CASH,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const expenseForm = useForm({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      category: '',
      amount: 0,
      paymentMode: PaymentMode.CASH,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const incomeForm = useForm({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: {
      category: '',
      amount: 0,
      paymentMode: PaymentMode.CASH,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const partyForm = useForm({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      type: PartyType.CUSTOMER,
      openingBalance: 0,
    },
  });

  const itemForm = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      type: ItemType.PRODUCT,
      unit: 'Pcs',
      salePrice: 0,
      purchasePrice: 0,
      openingStock: 0,
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Watchers & Auto-fill
  const saleWatchItems = saleForm.watch('items');
  const saleWatchIsVatBill = saleForm.watch('isVatBill');

  const saleTotals = calculateInvoiceTotals(
    saleWatchItems.map((i) => ({
      unitPrice: Number(i.unitPrice) || 0,
      quantity: Number(i.quantity) || 0,
      discountPercent: Number(i.discountPercent) || 0,
    })),
    saleWatchIsVatBill
  );

  useEffect(() => {
    if (activeType === 'sale') saleForm.setValue('paidAmount', saleTotals.totalAmount);
  }, [saleTotals.totalAmount, activeType, saleForm]);

  const purchaseWatchItems = purchaseForm.watch('items');
  const purchaseWatchIsVatBill = purchaseForm.watch('isVatBill');

  const purchaseTotals = calculateInvoiceTotals(
    purchaseWatchItems.map((i) => ({
      unitPrice: Number(i.unitPrice) || 0,
      quantity: Number(i.quantity) || 0,
      discountPercent: Number(i.discountPercent) || 0,
    })),
    purchaseWatchIsVatBill
  );

  useEffect(() => {
    if (activeType === 'purchase') purchaseForm.setValue('paidAmount', purchaseTotals.totalAmount);
  }, [purchaseTotals.totalAmount, activeType, purchaseForm]);

  const getAccountType = (mode: string) => {
    return mode === PaymentMode.BANK || mode === PaymentMode.CHEQUE
      ? 'BANK'
      : mode === PaymentMode.ONLINE
        ? 'MOBILE_WALLET'
        : 'CASH';
  };

  const salePaymentMode = saleForm.watch('paymentMode');
  const purchasePaymentMode = purchaseForm.watch('paymentMode');
  const paymentInMode = paymentInForm.watch('mode');
  const paymentOutMode = paymentOutForm.watch('mode');

  const saleAccounts = accounts.filter((a: any) => a.accountType === getAccountType(salePaymentMode));
  const purchaseAccounts = accounts.filter((a: any) => a.accountType === getAccountType(purchasePaymentMode));
  const paymentInAccounts = accounts.filter((a: any) => a.accountType === getAccountType(paymentInMode));
  const paymentOutAccounts = accounts.filter((a: any) => a.accountType === getAccountType(paymentOutMode));

  // Form Submit Handlers
  const handleSaleSubmit = async (data: any) => {
    if (data.items && Array.isArray(data.items)) {
      for (const line of data.items) {
        if (!line.itemId) continue;
        const sel = items.find((i: any) => i.id === line.itemId);
        if (sel && sel.type === 'PRODUCT') {
          const stock = Number(sel.currentStock || 0);
          const reqQty = Number(line.quantity || 0);
          if (stock <= 0) {
            toast.error(`"${sel.name}" is out of stock (Available: 0 ${sel.unit}).`);
            return;
          }
          if (reqQty > stock) {
            toast.error(`Insufficient stock for "${sel.name}". Available: ${stock} ${sel.unit}.`);
            return;
          }
        }
      }
    }

    try {
      await createSale.mutateAsync(data);
      showSuccess('Quick Sale recorded successfully!');
      toast.success('Sale invoice created successfully');
      saleForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record sale.');
    }
  };

  const handlePurchaseSubmit = async (data: any) => {
    try {
      await createPurchase.mutateAsync(data);
      showSuccess('Quick Purchase recorded successfully!');
      toast.success('Purchase bill recorded successfully');
      purchaseForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record purchase.');
    }
  };

  const handlePaymentInSubmit = async (data: any) => {
    try {
      await createPaymentIn.mutateAsync(data);
      showSuccess('Quick Payment In recorded!');
      toast.success('Payment in recorded successfully');
      paymentInForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record payment in.');
    }
  };

  const handlePaymentOutSubmit = async (data: any) => {
    try {
      await createPaymentOut.mutateAsync(data);
      showSuccess('Quick Payment Out recorded!');
      toast.success('Payment out recorded successfully');
      paymentOutForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record payment out.');
    }
  };

  const handleExpenseSubmit = async (data: any) => {
    try {
      await createExpense.mutateAsync(data);
      showSuccess('Quick Expense recorded!');
      toast.success('Expense recorded successfully');
      expenseForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record expense.');
    }
  };

  const handleIncomeSubmit = async (data: any) => {
    try {
      await createIncome.mutateAsync(data);
      showSuccess('Quick Income recorded!');
      toast.success('Income recorded successfully');
      incomeForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record income.');
    }
  };

  const handlePartySubmit = async (data: any) => {
    try {
      const payload = { ...data };
      if (payload.type === PartyType.SUPPLIER) {
        payload.openingBalanceType = 'PAYABLE';
      } else {
        payload.openingBalanceType = 'RECEIVABLE';
      }
      await createParty.mutateAsync(payload);
      showSuccess(`Party "${data.name}" added successfully!`);
      toast.success('Party created successfully');
      partyForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create party.');
    }
  };

  const handleItemSubmit = async (data: any) => {
    try {
      await createItem.mutateAsync(data);
      showSuccess(`Item "${data.name}" added successfully!`);
      toast.success('Item created successfully');
      itemForm.reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create item.');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          className="w-full sm:max-w-2xl bg-white sm:border sm:border-slate-200 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-b-3xl animate-in slide-in-from-bottom sm:zoom-in-95"
        >
          {/* MODAL HEADER WITH CLEAN LIGHT STYLING */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">Quick Entry Voucher</h3>
                <p className="text-[11px] text-slate-500 truncate">Fast bookkeeping entry with automated ledger balance sync</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SUCCESS NOTIFICATION BAR */}
          {successMsg && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center gap-2 text-emerald-800 text-xs font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {successMsg}
            </div>
          )}

          {/* 8 ACTION TABS GRID */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 p-2 bg-slate-100/70 border-b border-slate-200 text-xs font-bold shrink-0">
            {TAB_CONFIG.map((t) => {
              const Icon = t.icon;
              const isActive = activeType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveType(t.id)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer min-h-[44px] justify-center ${
                    isActive
                      ? t.activeColor
                      : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold leading-tight truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* MODAL FORM BODY */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 font-sans">
            {/* 1. QUICK SALE */}
            {activeType === 'sale' && (
              <form onSubmit={saleForm.handleSubmit(handleSaleSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Party *</label>
                    <select
                      {...saleForm.register('partyId')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs min-h-[44px]"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      {...saleForm.register('date')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs min-h-[44px]"
                    />
                  </div>
                </div>

                {(() => {
                  const selectedQuickSaleItemId = saleForm.watch('items.0.itemId');
                  const selectedQuickSaleItem = items.find((i: any) => i.id === selectedQuickSaleItemId);
                  const quickSaleQty = Number(saleForm.watch('items.0.quantity') || 0);
                  const quickSaleStock = Number(selectedQuickSaleItem?.currentStock || 0);
                  const isQuickSaleProduct = selectedQuickSaleItem?.type === 'PRODUCT';
                  const isQuickSaleOutOfStock = isQuickSaleProduct && quickSaleStock <= 0;
                  const isQuickSaleInsufficient = isQuickSaleProduct && quickSaleStock > 0 && quickSaleQty > quickSaleStock;
                  const isQuickSaleOverStock = isQuickSaleOutOfStock || isQuickSaleInsufficient;

                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Item & Quantity *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <ItemSearchSelect
                          items={items}
                          value={selectedQuickSaleItemId || ''}
                          onChange={(id) => {
                            saleForm.setValue('items.0.itemId', id);
                            const sel = items.find((i: any) => i.id === id);
                            if (sel) saleForm.setValue('items.0.unitPrice', Number(sel.salePrice || 0));
                          }}
                          placeholder="Search product…"
                          priceField="salePrice"
                          className="sm:col-span-2"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Qty"
                          {...saleForm.register('items.0.quantity', { valueAsNumber: true })}
                          className={`px-3.5 py-2.5 rounded-xl bg-white border text-slate-900 font-mono font-bold text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all min-h-[44px] shadow-2xs ${
                            isQuickSaleOverStock
                              ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                              : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                          }`}
                        />
                      </div>
                      {selectedQuickSaleItem && (
                        <div className="flex items-center gap-2 mt-1.5 px-0.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              quickSaleStock <= 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : quickSaleStock <= Number(selectedQuickSaleItem.minStockAlert)
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {quickSaleStock <= 0
                              ? `Out of Stock (0 ${selectedQuickSaleItem.unit})`
                              : `Stock: ${quickSaleStock} ${selectedQuickSaleItem.unit}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            MRP: Rs. {Number(selectedQuickSaleItem.salePrice)}
                          </span>
                        </div>
                      )}
                      {isQuickSaleOutOfStock && (
                        <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Out of stock! Cannot record sale.
                        </p>
                      )}
                      {isQuickSaleInsufficient && (
                        <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Insufficient stock ({quickSaleStock} available, {quickSaleQty} requested)
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (Rs.) *</label>
                    <input
                      type="number"
                      step="any"
                      {...saleForm.register('items.0.unitPrice', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      step="any"
                      {...saleForm.register('items.0.discountPercent', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Line Total</label>
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-emerald-700 font-mono font-black text-xs sm:text-sm flex items-center min-h-[44px]">
                      Rs. {formatCurrency(saleTotals.items[0]?.total || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="saleIsVatBill"
                      {...saleForm.register('isVatBill')}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                    <label htmlFor="saleIsVatBill" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                      Generate 13% VAT Bill
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Paid Amount (Rs.)
                      <span className="text-[10px] text-slate-500 font-normal ml-2">Total: Rs. {formatCurrency(saleTotals.totalAmount)}</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...saleForm.register('paidAmount', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-emerald-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      {...saleForm.register('paymentMode')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank</option>
                      <option value={PaymentMode.ONLINE}>Online Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                    <select
                      {...saleForm.register('accountId' as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">Default Account</option>
                      {saleAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createSale.isPending}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createSale.isPending ? 'Processing...' : 'Confirm Quick Sale'}
                </button>
              </form>
            )}

            {/* 2. QUICK PURCHASE */}
            {activeType === 'purchase' && (
              <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Party *</label>
                    <select
                      {...purchaseForm.register('partyId')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs min-h-[44px]"
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
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      {...purchaseForm.register('date')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item & Quantity *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <ItemSearchSelect
                      items={items}
                      value={purchaseForm.watch('items.0.itemId') || ''}
                      onChange={(id) => {
                        purchaseForm.setValue('items.0.itemId', id);
                        const sel = items.find((i: any) => i.id === id);
                        if (sel) purchaseForm.setValue('items.0.unitPrice', Number(sel.purchasePrice || 0));
                      }}
                      placeholder="Search item…"
                      priceField="purchasePrice"
                      className="sm:col-span-2"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      {...purchaseForm.register('items.0.quantity', { valueAsNumber: true })}
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 min-h-[44px] shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Cost (Rs.) *</label>
                    <input
                      type="number"
                      step="any"
                      {...purchaseForm.register('items.0.unitPrice', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      step="any"
                      {...purchaseForm.register('items.0.discountPercent', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Line Total</label>
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-indigo-700 font-mono font-black text-xs sm:text-sm flex items-center min-h-[44px]">
                      Rs. {formatCurrency(purchaseTotals.items[0]?.total || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="purchaseIsVatBill"
                      {...purchaseForm.register('isVatBill')}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="purchaseIsVatBill" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                      Generate 13% VAT Bill
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Paid Amount (Rs.)
                      <span className="text-[10px] text-slate-500 font-normal ml-2">Total: Rs. {formatCurrency(purchaseTotals.totalAmount)}</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...purchaseForm.register('paidAmount', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-rose-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      {...purchaseForm.register('paymentMode')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank</option>
                      <option value={PaymentMode.ONLINE}>Online Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                    <select
                      {...purchaseForm.register('accountId' as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="">Default Account</option>
                      {purchaseAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createPurchase.isPending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createPurchase.isPending ? 'Processing...' : 'Confirm Quick Purchase'}
                </button>
              </form>
            )}

            {/* 3. QUICK PAYMENT IN */}
            {activeType === 'payment_in' && (
              <form onSubmit={paymentInForm.handleSubmit(handlePaymentInSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Party *</label>
                  <select
                    {...paymentInForm.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs min-h-[44px]"
                  >
                    <option value="">Select Customer Party</option>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (Rs.) *</label>
                    <input
                      type="number"
                      step="any"
                      {...paymentInForm.register('amount', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-emerald-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mode</label>
                    <select
                      {...paymentInForm.register('mode')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank</option>
                      <option value={PaymentMode.ONLINE}>Online Wallet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                  <select
                    {...paymentInForm.register('accountId' as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">Default Account</option>
                    {paymentInAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createPaymentIn.isPending}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createPaymentIn.isPending ? 'Processing...' : 'Record Payment Received'}
                </button>
              </form>
            )}

            {/* 4. QUICK PAYMENT OUT */}
            {activeType === 'payment_out' && (
              <form onSubmit={paymentOutForm.handleSubmit(handlePaymentOutSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Party *</label>
                  <select
                    {...paymentOutForm.register('partyId')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs min-h-[44px]"
                  >
                    <option value="">Select Supplier Party</option>
                    {suppliers.map((s: any) => {
                      const balLabel = getPartyBalanceDisplay(s.currentBalance, 'SUPPLIER');
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({balLabel})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (Rs.) *</label>
                    <input
                      type="number"
                      step="any"
                      {...paymentOutForm.register('amount', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-rose-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mode</label>
                    <select
                      {...paymentOutForm.register('mode')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.BANK}>Bank</option>
                      <option value={PaymentMode.ONLINE}>Online Wallet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                  <select
                    {...paymentOutForm.register('accountId' as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                  >
                    <option value="">Default Account</option>
                    {paymentOutAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName || a.accountName} — Rs. {formatCurrency(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createPaymentOut.isPending}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createPaymentOut.isPending ? 'Processing...' : 'Record Supplier Payout'}
                </button>
              </form>
            )}

            {/* 5. QUICK EXPENSE */}
            {activeType === 'expense' && (
              <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                  <input
                    type="text"
                    placeholder="e.g. Office Rent, Utilities, Tea"
                    {...expenseForm.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Spent (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...expenseForm.register('amount', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-rose-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createExpense.isPending}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createExpense.isPending ? 'Processing...' : 'Confirm Expense'}
                </button>
              </form>
            )}

            {/* 6. QUICK OTHER INCOME */}
            {activeType === 'income' && (
              <form onSubmit={incomeForm.handleSubmit(handleIncomeSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Income Category *</label>
                  <input
                    type="text"
                    placeholder="e.g. Scrap Sale, Commission"
                    {...incomeForm.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...incomeForm.register('amount', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-emerald-700 font-mono font-black text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createIncome.isPending}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createIncome.isPending ? 'Processing...' : 'Confirm Other Income'}
                </button>
              </form>
            )}

            {/* 7. QUICK ADD PARTY */}
            {activeType === 'add_party' && (
              <form onSubmit={partyForm.handleSubmit(handlePartySubmit)} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Party Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe Traders"
                    {...partyForm.register('name')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold min-h-[44px] shadow-2xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Party Type *</label>
                    <select
                      {...partyForm.register('type')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    >
                      <option value={PartyType.CUSTOMER}>Customer</option>
                      <option value={PartyType.SUPPLIER}>Supplier</option>
                      <option value={PartyType.BOTH}>Both (Customer & Supplier)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...partyForm.register('openingBalance', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createParty.isPending}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-slate-900/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createParty.isPending ? 'Processing...' : 'Add Party Master'}
                </button>
              </form>
            )}

            {/* 8. QUICK ADD ITEM */}
            {activeType === 'add_item' && (
              <form onSubmit={itemForm.handleSubmit(handleItemSubmit)} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Berger Paint 20L"
                      {...itemForm.register('name')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold min-h-[44px] shadow-2xs focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                    <input
                      type="text"
                      {...itemForm.register('unit')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold min-h-[44px] shadow-2xs focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sale Price (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...itemForm.register('salePrice', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-emerald-700 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...itemForm.register('purchasePrice', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-blue-700 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      step="any"
                      {...itemForm.register('openingStock', { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createItem.isPending}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {createItem.isPending ? 'Processing...' : 'Add Product Master'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
