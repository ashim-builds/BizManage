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

  // Active POS Billing UI for Premium Users
  const filteredItems = itemsList.filter(
    (i: any) =>
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 font-sans animate-in fade-in duration-300">
      {/* Left Column: Product Search & Grid */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-xl">
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
        <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
            filteredItems.map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  addToCart(item);
                  toast.success(`Added ${item.name}`, { duration: 1200 });
                }}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-left transition-all flex flex-col justify-between group active:scale-95 shadow-sm"
              >
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-2">{item.name}</p>
                  {item.code && <p className="text-[10px] text-amber-400/80 font-mono mt-0.5">SKU: {item.code}</p>}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">Rs. {Number(item.salePrice).toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">{item.unit || 'Pcs'}</span>
                </div>
              </button>
            ))
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

// ---------------------------------------------------------
// POS Thermal Receipt Print Modal Component
// ---------------------------------------------------------
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
  if (!isOpen) return null;

  const handlePrintThermal = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-sans my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sale Completed Successfully</h3>
                <p className="text-[11px] text-slate-400">Invoice #{sale.voucherNo}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Printable 80mm Thermal Receipt Layout Container */}
          <div className="p-4 rounded-2xl bg-white text-slate-950 font-mono text-xs shadow-inner space-y-3 leading-tight border border-slate-300 max-h-96 overflow-y-auto">
            <div id="thermal-receipt-content" className="space-y-2">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <h2 className="text-base font-extrabold uppercase">{business?.name || 'BizManage Store'}</h2>
                <p className="text-[10px]">{business?.address || 'Main Road, Kathmandu, Nepal'}</p>
                {business?.panNo && <p className="text-[10px]">PAN/VAT: {business.panNo}</p>}
                {business?.phone && <p className="text-[10px]">Tel: {business.phone}</p>}
              </div>

              <div className="text-[11px] border-b border-dashed border-slate-400 pb-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: {sale.voucherNo}</span>
                  <span>{sale.date}</span>
                </div>
                <div>Customer: {sale.customerName}</div>
                <div>Payment: {sale.paymentMode}</div>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-400">
                    <th className="py-1 font-bold">Item</th>
                    <th className="py-1 text-center font-bold">Qty</th>
                    <th className="py-1 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 truncate max-w-[120px]">{item.name}</td>
                      <td className="py-1 text-center">{item.qty}</td>
                      <td className="py-1 text-right">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL PAYABLE:</span>
                  <span>Rs. {sale.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Paid:</span>
                  <span>Rs. {sale.paidAmount.toLocaleString()}</span>
                </div>
                {sale.changeDue > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Change Due:</span>
                    <span>Rs. {sale.changeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] space-y-0.5">
                <p className="font-bold">*** THANK YOU FOR YOUR BUSINESS ***</p>
                <p>Powered by BizManage POS</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrintThermal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" /> Print Thermal Bill
            </button>
            {sale.id && (
              <Link
                href={`/transactions/sales/${sale.id}`}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" /> View Full Invoice
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Start Next Sale
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
