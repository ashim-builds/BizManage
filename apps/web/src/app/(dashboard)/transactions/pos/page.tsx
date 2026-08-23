'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useItems } from '@/services/itemService';
import { useCreateSale } from '@/services/saleService';
import { useParties } from '@/services/partyService';
import { ModalPortal } from '@/components/common/ModalPortal';
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
  Printer,
  X,
  Sparkles,
  ArrowRight,
  Calculator,
  Banknote,
  Landmark,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSPage() {
  const { user } = useAuth();
  const currentBiz = user?.memberships?.[0]?.business;
  const rawFeatures = currentBiz?.subscriptionPackage?.features;
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);
  const isUnlocked = userFeatures.includes('POS_BILLING') || currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('premium');

  const { data: itemsData, isLoading: loadingItems } = useItems({ limit: 1000 });
  const { data: partiesData } = useParties();
  const createSale = useCreateSale();

  const itemsList = Array.isArray(itemsData?.data)
    ? itemsData.data
    : Array.isArray(itemsData)
    ? itemsData
    : [];

  const partiesList = Array.isArray(partiesData?.data)
    ? partiesData.data
    : Array.isArray(partiesData)
    ? partiesData
    : [];

  const [cart, setCart] = useState<{ id: string; name: string; price: number; unit: string; qty: number; code?: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'BANK'>('CASH');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<{
    id?: string;
    voucherNo?: string;
    date: string;
    customerName: string;
    paymentMode: string;
    items: { name: string; qty: number; price: number; total: number }[];
    totalAmount: number;
    paidAmount: number;
    changeDue: number;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input on mount
  useEffect(() => {
    if (isUnlocked) {
      searchInputRef.current?.focus();
    }
  }, [isUnlocked]);

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
            Speed up checkout at your retail counter with barcode scanning, quick tap item grids, and instant 80mm thermal receipt generation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Instant Barcode Billing</h4>
            <p className="text-[11px] text-slate-400">Scan product barcodes to instantly add items to order.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <QrCode className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Barcode Scanner Sync</h4>
            <p className="text-[11px] text-slate-400">Works seamlessly with all USB & Bluetooth barcode scanners.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <Receipt className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Thermal Receipt Printer</h4>
            <p className="text-[11px] text-slate-400">Instant 80mm/58mm thermal bill & VAT invoice printing.</p>
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

  // Active POS Billing UI for Premium Users with Multi-Word Tokenized Fuzzy Search
  const filteredItems = itemsList.filter((i: any) => {
    const rawTerm = searchTerm.trim().toLowerCase();
    if (!rawTerm) return true;

    const queryTokens = rawTerm.split(/\s+/).filter(Boolean);
    const targetText = `${i.name || ''} ${i.code || ''} ${i.category?.name || ''}`.toLowerCase();

    return queryTokens.every((token) => targetText.includes(token));
  });

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

  // Handle Hardware Barcode Scanning / Enter keypress
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();

      const term = searchTerm.trim().toLowerCase();

      // 1. Exact SKU/Code match
      const exactCodeMatch = itemsList.find((i: any) => i.code && i.code.toLowerCase() === term);

      // 2. Exact Name match
      const exactNameMatch = itemsList.find((i: any) => i.name && i.name.toLowerCase() === term);

      // 3. Single filtered item match
      const singleMatch = filteredItems.length === 1 ? filteredItems[0] : null;

      const targetItem = exactCodeMatch || exactNameMatch || singleMatch;

      if (targetItem) {
        addToCart(targetItem);
        setSearchTerm('');
        toast.success(`Added ${targetItem.name}`, { duration: 1500 });
      } else if (filteredItems.length > 0) {
        // Add the first filtered item
        addToCart(filteredItems[0]);
        setSearchTerm('');
        toast.success(`Added ${filteredItems[0].name}`, { duration: 1500 });
      } else {
        toast.error(`No product found matching "${searchTerm}"`);
      }
    }
  };

  const subTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const paidVal = typeof amountReceived === 'number' ? amountReceived : subTotal;
  const changeDue = Math.max(0, paidVal - subTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Scan or tap items to add.');
      return;
    }

    try {
      const selectedParty = partiesList.find((p: any) => p.id === selectedPartyId);
      const partyName = selectedParty ? selectedParty.name : customerName;

      const res = await createSale.mutateAsync({
        date: new Date().toISOString(),
        isVatBill: false,
        partyId: selectedPartyId || undefined,
        items: cart.map((c) => ({
          itemId: c.id,
          quantity: c.qty,
          unitPrice: c.price,
          discountPercent: 0,
          discount: 0,
          taxAmount: 0,
        })),
        paidAmount: paidVal,
        paymentMode,
      });

      const saleRecord = res?.data || res;

      // Set completed sale state for Thermal Bill Receipt Modal
      setCompletedSale({
        id: saleRecord?.id,
        voucherNo: saleRecord?.voucherNo || `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(),
        customerName: partyName,
        paymentMode,
        items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price, total: c.price * c.qty })),
        totalAmount: subTotal,
        paidAmount: paidVal,
        changeDue,
      });

      toast.success('POS Order Completed Successfully!');
      setCart([]);
      setSearchTerm('');
      setAmountReceived('');
      searchInputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Checkout failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 font-sans animate-in fade-in duration-300">
      {/* Left Column: Product Search & Grid */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-xl min-h-[350px]">
        {/* Header & Barcode Scanner Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                POS Counter Mode
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
                  Scanner Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Scan barcode or press Enter to add item directly</p>
            </div>
          </div>

          {/* Search Input with Auto Barcode / QR Scanner focus */}
          <div className="relative w-full sm:w-80">
            <div className="absolute left-3 top-2.5 flex items-center text-amber-400">
              <QrCode className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan QR / Barcode or Search (Enter to add)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner placeholder:text-slate-500"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-2 text-[10px] font-mono font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                SCAN
              </div>
            )}
          </div>
        </div>

        {/* Search Results Filter Banner */}
        {searchTerm && (
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Showing matching products for: <strong className="text-amber-400 font-mono">"{searchTerm}"</strong>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">{filteredItems.length} results</span>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {loadingItems ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500">Loading inventory...</div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 space-y-2">
              <QrCode className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No products found matching "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg"
              >
                Show All Inventory
              </button>
            </div>
          ) : (
            filteredItems.map((item: any) => {
              const inCartItem = cart.find((c) => c.id === item.id);
              const inCartQty = inCartItem ? inCartItem.qty : 0;
              const totalStock = Number(item.currentStock ?? 0);
              const isService = item.type === 'SERVICE';
              const remainingStock = Math.max(0, totalStock - inCartQty);
              const isOutOfStock = !isService && remainingStock <= 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isOutOfStock && totalStock <= 0) {
                      toast.error(`Out of stock! (${item.name})`);
                      return;
                    }
                    addToCart(item);
                    toast.success(`Added ${item.name}`, { duration: 1200 });
                  }}
                  className={`p-3.5 rounded-2xl bg-slate-950 border text-left transition-all flex flex-col justify-between group active:scale-95 shadow-sm min-h-[125px] max-h-[155px] relative ${
                    inCartQty > 0
                      ? 'border-amber-500/80 bg-amber-500/5 ring-1 ring-amber-500/30'
                      : isOutOfStock
                      ? 'border-rose-900/40 opacity-75 hover:border-rose-500/60'
                      : 'border-slate-800/90 hover:border-amber-500/60 hover:bg-slate-850/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-2 leading-snug">
                        {item.name}
                      </p>
                      {inCartQty > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px] shrink-0 shadow">
                          {inCartQty} in cart
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] gap-1 flex-wrap">
                      {item.code && <span className="text-amber-400/80 font-mono truncate">SKU: {item.code}</span>}
                      {!isService ? (
                        <span
                          className={`font-semibold font-mono ${
                            isOutOfStock
                              ? 'text-rose-400 font-bold'
                              : remainingStock <= (item.minStockAlert || 5)
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : `Stock: ${remainingStock} ${item.unit || 'Pcs'}`}
                        </span>
                      ) : (
                        <span className="text-purple-400 font-semibold">Service</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">Rs. {Number(item.salePrice).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">{item.unit || 'Pcs'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active Order & Counter Controls */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl">
        <div className="space-y-3">
          {/* Active Order Title & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" /> Active Counter Cart ({cart.reduce((a, b) => a + b.qty, 0)})
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[11px] text-rose-400 hover:underline font-semibold">
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">Customer / Party</label>
            <select
              value={selectedPartyId}
              onChange={(e) => {
                setSelectedPartyId(e.target.value);
                const p = partiesList.find((x: any) => x.id === e.target.value);
                if (p) setCustomerName(p.name);
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="">Walk-in Cash Customer</option>
              {partiesList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="max-h-52 overflow-y-auto space-y-2 py-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Cart is empty. Scan barcode or tap item grid to add.
              </div>
            ) : (
              cart.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Rs. {c.price} x {c.qty} = <span className="text-emerald-400 font-bold">Rs. {(c.price * c.qty).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQty(c.id, -1)}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-white text-xs">{c.qty}</span>
                    <button
                      type="button"
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

        {/* Checkout & Payment Section */}
        <div className="border-t border-slate-800 pt-3 space-y-3">
          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold text-slate-400">
            <button
              type="button"
              onClick={() => setPaymentMode('CASH')}
              className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${paymentMode === 'CASH' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'hover:text-white'}`}
            >
              <Banknote className="w-3.5 h-3.5" /> Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('ONLINE')}
              className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${paymentMode === 'ONLINE' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'hover:text-white'}`}
            >
              <QrCode className="w-3.5 h-3.5" /> QR / Online
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('BANK')}
              className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${paymentMode === 'BANK' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'hover:text-white'}`}
            >
              <Landmark className="w-3.5 h-3.5" /> Bank
            </button>
          </div>

          {/* Amount Received & Change Calculator */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Cash Received</label>
              <input
                type="number"
                placeholder={`Rs. ${subTotal}`}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Change Return</label>
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-emerald-400 text-xs truncate">
                Rs. {changeDue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Total & Checkout Button */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Total Net Amount</span>
              <span className="text-xl font-bold font-mono text-emerald-400">Rs. {subTotal.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || createSale.isPending}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {createSale.isPending ? 'Processing Bill...' : `Checkout & Print Thermal Bill (Rs. ${subTotal.toLocaleString()})`}
            </button>
          </div>
        </div>
      </div>

      {/* POS Thermal Receipt & Sales Invoice Modal */}
      {completedSale && (
        <POSThermalReceiptModal
          isOpen={!!completedSale}
          onClose={() => setCompletedSale(null)}
          sale={completedSale}
          business={currentBiz}
        />
      )}
    </div>
  );
}

function POSThermalReceiptModal({
  isOpen,
  onClose,
  sale,
  business,
}: {
  isOpen: boolean;
  onClose: () => void;
  sale: {
    id?: string;
    voucherNo?: string;
    date: string;
    customerName: string;
    paymentMode: string;
    items: { name: string; qty: number; price: number; total: number }[];
    totalAmount: number;
    paidAmount: number;
    changeDue: number;
  };
  business?: any;
}) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen) return null;

  const handlePrintThermal = () => {
    window.print();
  };

  const totalLineItems = sale.items.length;
  const totalUnits = sale.items.reduce((sum, item) => sum + item.qty, 0);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    sale.voucherNo || 'POS-INV'
  )}`;

  return (
    <ModalPortal>
      <style>{`
        @page {
          size: ${paperWidth === '80mm' ? '80mm auto' : '58mm auto'};
          margin: 0mm;
        }
        @media print {
          html, body {
            width: ${paperWidth === '80mm' ? '80mm' : '58mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-printable-area, #thermal-printable-area * {
            visibility: visible !important;
          }
          #thermal-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '78mm' : '56mm'} !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans">
        <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  POS Bill Receipt
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/25">
                    SUCCESS
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">Invoice #{sale.voucherNo}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Paper Roll Width Switcher */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold text-slate-400">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    paperWidth === '80mm' ? 'bg-emerald-500 text-slate-950 font-extrabold shadow' : 'hover:text-white'
                  }`}
                >
                  80mm Roll
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    paperWidth === '58mm' ? 'bg-emerald-500 text-slate-950 font-extrabold shadow' : 'hover:text-white'
                  }`}
                >
                  58mm Mini
                </button>
              </div>

              <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Authentic POS Thermal Paper Roll Preview */}
          <div className="bg-slate-950/90 p-3 sm:p-4 rounded-2xl border border-slate-800 flex justify-center max-h-[410px] overflow-y-auto shadow-inner">
            <div
              id="thermal-printable-area"
              className={`bg-white text-slate-950 font-mono text-[11px] p-4 shadow-2xl border border-slate-300 space-y-3 transition-all rounded-md w-full select-text ${
                paperWidth === '80mm' ? 'max-w-[320px]' : 'max-w-[250px]'
              }`}
            >
              {/* Receipt Store Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2.5">
                <h2 className="text-base font-black uppercase tracking-tight text-slate-900">{business?.name || 'BizManage Store'}</h2>
                <p className="text-[10px] text-slate-700 leading-tight">{business?.address || 'Main Road, Kathmandu, Nepal'}</p>
                {business?.panNo && <p className="text-[10px] text-slate-700">PAN/VAT: {business.panNo}</p>}
                {business?.phone && <p className="text-[10px] text-slate-700">Tel: {business.phone}</p>}
                <p className="text-[9px] text-slate-500 pt-0.5 font-bold uppercase">RETAIL TAX INVOICE</p>
              </div>

              {/* Bill Details */}
              <div className="text-[10px] border-b border-dashed border-slate-400 pb-2 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Bill No: {sale.voucherNo}</span>
                  <span className="px-1 bg-slate-100 rounded border border-slate-300 text-[9px]">{sale.paymentMode}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="truncate pr-1">Customer: {sale.customerName}</span>
                  <span className="shrink-0">{sale.date}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Counter: #01</span>
                  <span>Operator: Cashier</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-400 text-slate-800">
                    <th className="py-1 font-bold">Item Description</th>
                    <th className="py-1 text-center font-bold">Qty</th>
                    <th className="py-1 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 pr-1">
                        <div className="font-bold text-slate-900 leading-tight">{item.name}</div>
                        <div className="text-[9px] text-slate-600">@ Rs. {item.price.toLocaleString()}</div>
                      </td>
                      <td className="py-1.5 text-center font-bold align-top">{item.qty}</td>
                      <td className="py-1.5 text-right font-mono font-bold align-top">Rs. {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Item Summary Line */}
              <div className="border-t border-b border-slate-300 py-1 text-[9px] font-bold text-slate-700 flex justify-between">
                <span>Items: {totalLineItems}</span>
                <span>Total Qty: {totalUnits} Pcs</span>
              </div>

              {/* Financial Breakdown */}
              <div className="pt-1 space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-xs pt-0.5 border-b border-slate-300 pb-1">
                  <span>NET TOTAL PAYABLE:</span>
                  <span>Rs. {sale.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[10px]">
                  <span>Amount Tendered ({sale.paymentMode}):</span>
                  <span>Rs. {sale.paidAmount.toLocaleString()}</span>
                </div>
                {sale.changeDue > 0 && (
                  <div className="flex justify-between font-extrabold text-emerald-900 text-[10px]">
                    <span>Change Returned:</span>
                    <span>Rs. {sale.changeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Footer QR & Barcode */}
              <div className="text-center pt-2 border-t border-dashed border-slate-400 space-y-2 text-[9px] text-slate-700">
                <div className="space-y-1">
                  <img src={qrCodeUrl} alt="Invoice Verification QR" className="w-20 h-20 mx-auto object-contain p-1 bg-white border border-slate-300 rounded" />
                  <p className="text-[8px] font-mono text-slate-500">Scan QR to verify invoice</p>
                </div>

                {/* Simulated Barcode */}
                <div className="py-1 space-y-0.5">
                  <div className="h-6 w-3/4 mx-auto bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_7px,#fff_7px,#fff_8px)] opacity-85" />
                  <p className="font-mono text-[9px] text-slate-800 tracking-wider">*{sale.voucherNo}*</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 uppercase">*** THANK YOU FOR SHOPPING ***</p>
                  <p className="text-[8px] text-slate-600">Goods once sold can be exchanged within 7 days with bill.</p>
                  <p className="text-[8px] text-slate-500 font-mono pt-1">Powered by BizManage POS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thermal Print Modal Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handlePrintThermal}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Thermal Bill ({paperWidth})
            </button>

            {sale.id && (
              <Link
                href={`/transactions/sales/${sale.id}`}
                onClick={onClose}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all text-center flex items-center justify-center gap-2 border border-slate-700"
              >
                <FileText className="w-4 h-4 text-blue-400" /> Full A4 Invoice
              </Link>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Start Next Sale
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
