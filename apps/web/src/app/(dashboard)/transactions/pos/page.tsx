'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useItems } from '@/services/itemService';
import { useCreateSale } from '@/services/saleService';
import {
  Zap,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Crown,
  Lock,
  QrCode,
  Search,
  Receipt,
  User,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSPage() {
  const { user } = useAuth();
  const currentBiz = user?.memberships?.[0]?.business;
  const rawFeatures = currentBiz?.subscriptionPackage?.features;
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);
  const isUnlocked = userFeatures.includes('POS_BILLING') || currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('premium');

  const { data: items = [], isLoading: loadingItems } = useItems();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<{ id: string; name: string; price: number; unit: string; qty: number; code?: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'BANK'>('CASH');

  if (!isUnlocked) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6 text-center font-sans animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
          <Crown className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            Premium Module Locked
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            POS Quick Billing & Counter Mode
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            Speed up checkout at your retail counter with barcode scanning, quick tap item grids, and instant receipt generation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Instant Tap Billing</h4>
            <p className="text-[11px] text-slate-400">Add products to cart with 1 click or instant barcode scan.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <QrCode className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Barcode Scanner Sync</h4>
            <p className="text-[11px] text-slate-400">Scan hardware barcodes directly into active counter order.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <Receipt className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Receipt Printer Ready</h4>
            <p className="text-[11px] text-slate-400">Thermal receipt & VAT thermal bill 1-click printing.</p>
          </div>
        </div>

        <div className="pt-4">
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-xl shadow-indigo-600/25"
          >
            <Crown className="w-4 h-4" /> Upgrade to Premium Plan (Rs. 1,199/mo)
          </Link>
        </div>
      </div>
    );
  }

  // Active POS Billing UI for Premium Users
  const filteredItems = items.filter(
    (i: any) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.code && i.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.salePrice || 0),
          unit: item.unit || 'Pcs',
          qty: 1,
          code: item.code,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === id) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as any
    );
  };

  const subTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Tap items to add.');
      return;
    }

    try {
      await createSale.mutateAsync({
        date: new Date().toISOString(),
        isVatBill: false,
        items: cart.map((c) => ({
          itemId: c.id,
          quantity: c.qty,
          unitPrice: c.price,
          discountPercent: 0,
          discount: 0,
          taxAmount: 0,
        })),
        paidAmount: subTotal,
        paymentMode,
      });

      toast.success('POS Order Completed!');
      setCart([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Checkout failed');
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 font-sans animate-in fade-in duration-300">
      {/* Left Column: Product Search & Grid */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden">
        {/* Header & Search */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">POS Counter Grid</h2>
              <p className="text-[11px] text-slate-400">Tap item or scan barcode to add to bill</p>
            </div>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search or Scan Barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {loadingItems ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500">Loading inventory...</div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500">No products found</div>
          ) : (
            filteredItems.map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addToCart(item)}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-left transition-all flex flex-col justify-between group active:scale-95"
              >
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-2">{item.name}</p>
                  {item.code && <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.code}</p>}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">Rs. {item.salePrice}</span>
                  <span className="text-[10px] text-slate-400">{item.unit || 'Pcs'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Active Cart & Checkout */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" /> Active Order ({cart.reduce((a, b) => a + b.qty, 0)})
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[11px] text-rose-400 hover:underline">
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-2 py-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">Cart is empty. Tap items on left.</div>
            ) : (
              cart.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Rs. {c.price} x {c.qty} = <span className="text-white font-bold">Rs. {c.price * c.qty}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(c.id, -1)}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-white">{c.qty}</span>
                    <button
                      onClick={() => updateQty(c.id, 1)}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checkout Controls */}
        <div className="border-t border-slate-800 pt-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Total Payable</span>
            <span className="text-xl font-bold font-mono text-emerald-400">Rs. {subTotal.toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Instant Checkout (Rs. {subTotal.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  );
}
