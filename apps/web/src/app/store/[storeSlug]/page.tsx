'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { usePublicStorefront, useSubmitOnlineOrder } from '@/hooks/useStorefront';
import {
  Store,
  Search,
  ShoppingBag,
  MessageSquare,
  Package,
  EyeOff,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Minus,
  Send,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

export default function PublicStorefrontPage() {
  const params = useParams();
  const storeSlug = (params?.storeSlug as string) || '';

  const { data: storeData, isLoading, isError } = usePublicStorefront(storeSlug);
  const submitOrder = useSubmitOnlineOrder(storeSlug);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customer Order Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  const store = storeData?.store;
  const categories = storeData?.categories || [];
  const products = storeData?.products || [];

  // Filter products by category and tokenized search query
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'ALL') {
      result = result.filter((p: any) => p.category?.id === selectedCategory);
    }
    const rawTerm = searchQuery.trim().toLowerCase();
    if (rawTerm) {
      const cleanTerm = rawTerm.replace(/[^a-z0-9]/g, '');
      const terms = rawTerm.split(/\s+/).filter(Boolean);
      result = result.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const cleanName = name.replace(/[^a-z0-9]/g, '');

        if (cleanTerm && cleanName.includes(cleanTerm)) return true;
        return terms.every((t) => name.includes(t) || code.includes(t));
      });
    }
    return result;
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          unit: product.unit,
          price: product.price || 0,
          quantity: 1,
        },
      ];
    });
    toast.success(`Added "${product.name}" to cart`);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === id) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const phone = store?.whatsappNumber || store?.phone || '';
    if (!phone) {
      toast.error('Store WhatsApp contact number is not set');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let msg = `*New Order from Website*\n`;
    if (customerName) msg += `*Customer:* ${customerName}\n`;
    if (customerPhone) msg += `*Phone:* ${customerPhone}\n`;
    if (deliveryAddress) msg += `*Address:* ${deliveryAddress}\n`;
    msg += `\n*Items Ordered:*\n`;
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} x ${item.quantity} ${item.unit} (Rs. ${item.price})\n`;
    });
    if (cartTotalPrice > 0) {
      msg += `\n*Total Amount:* Rs. ${cartTotalPrice.toLocaleString()}`;
    }
    if (notes) msg += `\n*Notes:* ${notes}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDirectOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error('Please enter your name and phone number');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your shopping cart is empty');
      return;
    }

    try {
      const res = await submitOrder.mutateAsync({
        customerName,
        customerPhone,
        deliveryAddress,
        notes,
        items: cart.map((c) => ({ itemId: c.id, quantity: c.quantity })),
      });
      setOrderSuccess(res);
      setCart([]);
      toast.success('Order submitted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Loading online store catalog…</p>
        </div>
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold">Store Not Found</h2>
          <p className="text-sm text-slate-400">
            The store URL handle <span className="font-mono text-white">/store/{storeSlug}</span> is either offline or currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* Top Banner & Navigation Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-full h-full bg-blue-600/20 text-blue-400 font-bold text-base flex items-center justify-center">
                  {store.name ? store.name.substring(0, 2).toUpperCase() : <Store className="w-5 h-5" />}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                {store.name}
              </h1>
              {store.address && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {store.address}
                </p>
              )}
            </div>
          </div>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 relative"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/80 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-slate-900 p-2 border border-slate-800 shadow-xl shrink-0"
              />
            )}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome to {store.name}
              </h2>
              {store.description && (
                <p className="text-sm text-slate-400 max-w-2xl mt-1.5 leading-relaxed">
                  {store.description}
                </p>
              )}
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or code…"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Product Catalog Grid */}
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <Package className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Products Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No products matched your search filter. Try clearing your search query or selecting a different category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product: any) => {
              const inStock = product.inStock;

              return (
                <div
                  key={product.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 transition-all p-4 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inStock
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {product.unit && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Unit: {product.unit}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    {product.code && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        SKU: {product.code}
                      </p>
                    )}
                    {product.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Price Visibility Display */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        Rs. {(product.price || 0).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={() => addToCart(product)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Shopping Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  Your Order Cart ({cartItemCount})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-400">
                  <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold">Your cart is empty</p>
                  <p className="text-[11px] text-slate-500">Browse products and click "Add" to build your order.</p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-800/60">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          Rs. {item.price.toLocaleString()} / {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Success Banner */}
              {orderSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-2 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Order Submitted!
                  </div>
                  <p>
                    Order invoice <span className="font-mono font-bold text-white">{orderSuccess.invoiceNumber}</span> has been received by the store.
                  </p>
                </div>
              )}

              {/* Customer Details Form */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Customer Details
                  </h4>

                  <div>
                    <input
                      type="text"
                      placeholder="Your Full Name *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder="Phone / WhatsApp Number *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Delivery Address (Optional)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Checkout Actions */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                {cartTotalPrice > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="text-sm font-mono text-emerald-400">Rs. {cartTotalPrice.toLocaleString()}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppCheckout}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Order via WhatsApp
                  </button>

                  <button
                    type="button"
                    disabled={submitOrder.isPending}
                    onClick={handleDirectOrderSubmit}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submitOrder.isPending ? 'Submitting Order…' : 'Submit Direct Online Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
