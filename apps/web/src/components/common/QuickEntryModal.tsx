'use client';

import { useState, useEffect } from 'react';
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
import { useCreateSale } from '@/services/saleService';
import { useCreatePurchase } from '@/services/purchaseService';
import { useCreatePaymentIn, useCreatePaymentOut } from '@/services/paymentService';
import { useCreateExpense } from '@/services/expenseService';
import { useCreateIncome } from '@/services/incomeService';
import { useCreateParty, useParties } from '@/services/partyService';
import { useCreateItem, useItems } from '@/services/itemService';
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

export function QuickEntryModal({ isOpen, onClose, defaultType = 'sale' }: QuickEntryModalProps) {
  const [activeType, setActiveType] = useState<QuickEntryType>(defaultType);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setActiveType(defaultType);
  }, [defaultType]);

  // Global Keyboard ShortCut (Escape to close)
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
  const { data: itemsData } = useItems({ limit: 100 });

  const parties = partiesData?.data || [];
  const items = itemsData?.data || [];

  const customers = parties.filter((p: any) => p.type === 'CUSTOMER' || p.type === 'BOTH');
  const suppliers = parties.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH');

  // Shared Mutations (Reusing exact same business logic services)
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
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
    },
  });

  const purchaseForm = useForm({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      partyId: '',
      date: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      paymentMode: PaymentMode.CASH,
      items: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0 }],
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

  // Form Submit Handlers
  const handleSaleSubmit = async (data: any) => {
    try {
      await createSale.mutateAsync(data);
      showSuccess('Quick Sale recorded successfully!');
      saleForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record sale.');
    }
  };

  const handlePurchaseSubmit = async (data: any) => {
    try {
      await createPurchase.mutateAsync(data);
      showSuccess('Quick Purchase recorded successfully!');
      purchaseForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record purchase.');
    }
  };

  const handlePaymentInSubmit = async (data: any) => {
    try {
      await createPaymentIn.mutateAsync(data);
      showSuccess('Quick Payment In recorded!');
      paymentInForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record payment in.');
    }
  };

  const handlePaymentOutSubmit = async (data: any) => {
    try {
      await createPaymentOut.mutateAsync(data);
      showSuccess('Quick Payment Out recorded!');
      paymentOutForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record payment out.');
    }
  };

  const handleExpenseSubmit = async (data: any) => {
    try {
      await createExpense.mutateAsync(data);
      showSuccess('Quick Expense recorded!');
      expenseForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record expense.');
    }
  };

  const handleIncomeSubmit = async (data: any) => {
    try {
      await createIncome.mutateAsync(data);
      showSuccess('Quick Income recorded!');
      incomeForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record income.');
    }
  };

  const handlePartySubmit = async (data: any) => {
    try {
      await createParty.mutateAsync(data);
      showSuccess(`Party "${data.name}" added successfully!`);
      partyForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create party.');
    }
  };

  const handleItemSubmit = async (data: any) => {
    try {
      await createItem.mutateAsync(data);
      showSuccess(`Item "${data.name}" added successfully!`);
      itemForm.reset();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create item.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden space-y-0 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* MODAL HEADER WITH TYPE SWITCHER */}
        <div className="p-6 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Quick Transaction Entry</h3>
              <p className="text-xs text-slate-400">Fast, minimal-click entry powered by standard accounting engine.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUCCESS NOTIFICATION BAR */}
        {successMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-2.5 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* 8 ACTION TABS */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1 p-2 bg-slate-950/50 border-b border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setActiveType('sale')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'sale' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Sale
          </button>

          <button
            onClick={() => setActiveType('purchase')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'purchase' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" /> Purchase
          </button>

          <button
            onClick={() => setActiveType('payment_in')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'payment_in' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" /> Pay In
          </button>

          <button
            onClick={() => setActiveType('payment_out')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'payment_out' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> Pay Out
          </button>

          <button
            onClick={() => setActiveType('expense')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'expense' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Expense
          </button>

          <button
            onClick={() => setActiveType('income')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'income' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Income
          </button>

          <button
            onClick={() => setActiveType('add_party')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'add_party' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Party
          </button>

          <button
            onClick={() => setActiveType('add_item')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeType === 'add_item' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PackagePlus className="w-4 h-4" /> Item
          </button>
        </div>

        {/* MODAL FORM BODY */}
        <div className="p-6">
          {/* 1. QUICK SALE */}
          {activeType === 'sale' && (
            <form onSubmit={saleForm.handleSubmit(handleSaleSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Customer Party *</label>
                  <select
                    {...saleForm.register('partyId')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    {...saleForm.register('date')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Item & Quantity *</label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    {...saleForm.register('items.0.itemId')}
                    onChange={(e) => {
                      const sel = items.find((i: any) => i.id === e.target.value);
                      if (sel) {
                        saleForm.setValue('items.0.unitPrice', Number(sel.salePrice || 0));
                      }
                    }}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Select Product</option>
                    {items.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Stock: {i.currentStock} {i.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    {...saleForm.register('items.0.quantity', { valueAsNumber: true })}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Price (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...saleForm.register('items.0.unitPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Paid Amount (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...saleForm.register('paidAmount', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createSale.isPending}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                {createSale.isPending ? 'Processing...' : '⚡ Confirm Quick Sale'}
              </button>
            </form>
          )}

          {/* 2. QUICK PURCHASE */}
          {activeType === 'purchase' && (
            <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Supplier Party *</label>
                  <select
                    {...purchaseForm.register('partyId')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    {...purchaseForm.register('date')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Item & Quantity *</label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    {...purchaseForm.register('items.0.itemId')}
                    onChange={(e) => {
                      const sel = items.find((i: any) => i.id === e.target.value);
                      if (sel) {
                        purchaseForm.setValue('items.0.unitPrice', Number(sel.purchasePrice || 0));
                      }
                    }}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Select Item</option>
                    {items.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    {...purchaseForm.register('items.0.quantity', { valueAsNumber: true })}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Purchase Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...purchaseForm.register('items.0.unitPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Paid Amount (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...purchaseForm.register('paidAmount', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-rose-400 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createPurchase.isPending}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20"
              >
                {createPurchase.isPending ? 'Processing...' : '⚡ Confirm Quick Purchase'}
              </button>
            </form>
          )}

          {/* 3. QUICK PAYMENT IN */}
          {activeType === 'payment_in' && (
            <form onSubmit={paymentInForm.handleSubmit(handlePaymentInSubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Party *</label>
                <select
                  {...paymentInForm.register('partyId')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount Received (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...paymentInForm.register('amount', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mode</label>
                  <select
                    {...paymentInForm.register('mode')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank</option>
                    <option value={PaymentMode.ONLINE}>Online Wallet</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={createPaymentIn.isPending}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                {createPaymentIn.isPending ? 'Processing...' : '⚡ Record Payment Received'}
              </button>
            </form>
          )}

          {/* 4. QUICK PAYMENT OUT */}
          {activeType === 'payment_out' && (
            <form onSubmit={paymentOutForm.handleSubmit(handlePaymentOutSubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supplier Party *</label>
                <select
                  {...paymentOutForm.register('partyId')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount Paid (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    {...paymentOutForm.register('amount', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-rose-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mode</label>
                  <select
                    {...paymentOutForm.register('mode')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank</option>
                    <option value={PaymentMode.ONLINE}>Online Wallet</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={createPaymentOut.isPending}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20"
              >
                {createPaymentOut.isPending ? 'Processing...' : '⚡ Record Supplier Payout'}
              </button>
            </form>
          )}

          {/* 5. QUICK EXPENSE */}
          {activeType === 'expense' && (
            <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expense Category *</label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent, Utilities, Tea"
                  {...expenseForm.register('category')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount Spent (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...expenseForm.register('amount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-rose-400 font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={createExpense.isPending}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg shadow-amber-600/20"
              >
                {createExpense.isPending ? 'Processing...' : '⚡ Confirm Expense'}
              </button>
            </form>
          )}

          {/* 6. QUICK OTHER INCOME */}
          {activeType === 'income' && (
            <form onSubmit={incomeForm.handleSubmit(handleIncomeSubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Income Category *</label>
                <input
                  type="text"
                  placeholder="e.g. Scrap Sale, Commission"
                  {...incomeForm.register('category')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...incomeForm.register('amount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={createIncome.isPending}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-lg shadow-teal-600/20"
              >
                {createIncome.isPending ? 'Processing...' : '⚡ Confirm Other Income'}
              </button>
            </form>
          )}

          {/* 7. QUICK ADD PARTY */}
          {activeType === 'add_party' && (
            <form onSubmit={partyForm.handleSubmit(handlePartySubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Party Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe Traders"
                  {...partyForm.register('name')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Party Type *</label>
                  <select
                    {...partyForm.register('type')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value={PartyType.CUSTOMER}>Customer</option>
                    <option value={PartyType.SUPPLIER}>Supplier</option>
                    <option value={PartyType.BOTH}>Both (Customer & Supplier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Opening Balance (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...partyForm.register('openingBalance', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createParty.isPending}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20"
              >
                {createParty.isPending ? 'Processing...' : '⚡ Add Party Master'}
              </button>
            </form>
          )}

          {/* 8. QUICK ADD ITEM */}
          {activeType === 'add_item' && (
            <form onSubmit={itemForm.handleSubmit(handleItemSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Item Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Wireless Mouse"
                    {...itemForm.register('name')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit *</label>
                  <input
                    type="text"
                    {...itemForm.register('unit')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sale Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...itemForm.register('salePrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Purchase Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...itemForm.register('purchasePrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="any"
                    {...itemForm.register('openingStock', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createItem.isPending}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-600/20"
              >
                {createItem.isPending ? 'Processing...' : '⚡ Add Product Master'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
