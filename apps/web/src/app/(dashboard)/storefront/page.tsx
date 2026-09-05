'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useStorefrontSettings,
  useUpdateStorefrontSettings,
  useStorefrontOrders,
  useStorefrontCustomers,
  useUpdateOrderStatus,
} from '@/hooks/useStorefront';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import {
  Globe,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Store,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Save,
  Link as LinkIcon,
  Clock,
  XCircle,
  Phone,
  MapPin,
  FileText,
  RefreshCw,
  Check,
  Users,
  Search,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StorefrontSettingsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'orders' | 'customers'>('settings');

  const { data: settings, isLoading, isError } = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();
  const { data: customersData, isLoading: customersLoading } = useStorefrontCustomers();

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useStorefrontOrders();
  const updateStatus = useUpdateOrderStatus();

  const [enableStorefront, setEnableStorefront] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [showStorePrices, setShowStorePrices] = useState(true);
  const [storeTitle, setStoreTitle] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [enableOnlineOrders, setEnableOnlineOrders] = useState(true);
  const [copied, setCopied] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const customers = customersData || [];

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.trim().toLowerCase();
    return customers.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const address = (c.address || '').toLowerCase();
      return name.includes(term) || phone.includes(term) || email.includes(term) || address.includes(term);
    });
  }, [customers, customerSearch]);

  useEffect(() => {
    if (settings) {
      setEnableStorefront(settings.enableStorefront);
      setStoreSlug(settings.storeSlug || '');
      setShowStorePrices(settings.showStorePrices ?? true);
      setStoreTitle(settings.storeTitle || '');
      setStoreDescription(settings.storeDescription || '');
      setWhatsappNumber(settings.whatsappNumber || '');
      setStoreBannerUrl(settings.storeBannerUrl || '');
      setEnableOnlineOrders(settings.enableOnlineOrders ?? true);
    }
  }, [settings]);

  const cleanSlug = storeSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const publicStoreUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/store/${cleanSlug || 'my-shop'}`
      : `/store/${cleanSlug || 'my-shop'}`;

  const handleCopyLink = () => {
    if (!cleanSlug) {
      toast.error('Please configure a store URL handle first');
      return;
    }
    navigator.clipboard.writeText(publicStoreUrl);
    setCopied(true);
    toast.success('Public Store Website URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (enableStorefront && !cleanSlug) {
      toast.error('Store URL handle is required to enable website');
      return;
    }
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaveConfirmOpen(false);
    executeSettingsSave();
  };

  const executeSettingsSave = async () => {
    try {
      await updateSettings.mutateAsync({
        enableStorefront,
        storeSlug: cleanSlug,
        showStorePrices,
        storeTitle,
        storeDescription,
        whatsappNumber,
        storeBannerUrl,
        enableOnlineOrders,
      });
      toast.success('Online Storefront settings saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update storefront settings');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Storefront configuration…
      </div>
    );
  }

  const pendingOrdersCount = orders?.filter((o: any) => o.status === 'UNPAID' || o.status === 'PARTIAL').length || 0;
  const totalRevenue = orders?.reduce((acc: number, o: any) => acc + (o.status === 'PAID' ? o.totalAmount : 0), 0) || 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              Online Storefront & Website
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                enableStorefront
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${enableStorefront ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
              />
              {enableStorefront ? 'Website Published' : 'Draft Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Build your online catalog website, manage online orders, and toggle price show/hide controls.
          </p>
        </div>

        {cleanSlug && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 shadow-xs"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={publicStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Website
            </a>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" /> Website Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Online Orders Manager
          {pendingOrdersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] shadow-xs">
              {pendingOrdersCount} New
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Registered Store Customers
          {customers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[10px]">
              {customers.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: WEBSITE SETTINGS */}
      {activeTab === 'settings' ? (
        <form onSubmit={handleSaveRequest} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Settings */}
          <div className="md:col-span-2 space-y-6">
            {/* Main Website Switch */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-600" /> Enable Public Website & Catalog
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Publish your product catalog online for customers to browse and order.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableStorefront}
                    onChange={(e) => setEnableStorefront(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Store URL Handle */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Store Web Handle (URL Slug) *
                </label>
                <div className="flex rounded-xl bg-slate-50 border border-slate-300 overflow-hidden focus-within:border-blue-600 focus-within:bg-white">
                  <span className="px-3.5 py-2.5 bg-slate-100 text-slate-600 text-xs font-mono flex items-center shrink-0 border-r border-slate-300">
                    /store/
                  </span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value)}
                    placeholder="e.g. rb-hardware"
                    className="w-full px-3.5 py-2.5 bg-transparent text-slate-900 text-xs font-mono focus:outline-none placeholder-slate-400"
                  />
                </div>
                {cleanSlug && (
                  <p className="text-[11px] text-blue-600 font-mono flex items-center gap-1 pt-1 font-semibold">
                    <LinkIcon className="w-3 h-3 shrink-0" /> Public Store Link: {publicStoreUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Store Information */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Store Information & Contact</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Store Title / Display Name
                  </label>
                  <input
                    type="text"
                    value={storeTitle}
                    onChange={(e) => setStoreTitle(e.target.value)}
                    placeholder="Leave empty to use Business Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Store Description / Welcome Message
                  </label>
                  <textarea
                    rows={3}
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Short summary of your products and store location…"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updateSettings.isPending}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 min-h-[44px] active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? 'Saving configuration…' : 'Save Storefront Settings'}
            </button>
          </div>

          {/* Right Column: Preview & Status */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Website Features Included
              </h3>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Public Store URL <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">/store/[slug]</code>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Business Logo &amp; Banner Header</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Price Show / Hide Controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customer Phone Call & Order Inquiries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Direct Online Orders (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">WEB-00001</code>)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </form>
      ) : activeTab === 'orders' ? (
        /* TAB 2: ONLINE ORDERS MANAGER */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block">Total Online Orders</span>
              <p className="text-2xl font-black text-slate-900">{orders?.length || 0}</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block">Pending Orders</span>
              <p className="text-2xl font-black text-amber-600">{pendingOrdersCount}</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block">Online Orders Revenue</span>
              <p className="text-2xl font-black text-emerald-600">Rs. {totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Orders Container */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" /> Incoming Web Orders &amp; Leads
              </h3>
              <button
                type="button"
                onClick={() => refetchOrders()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {ordersLoading ? (
              <div className="p-8 text-center text-slate-500 font-medium">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading incoming online orders…
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">No Online Orders Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When customers submit orders on your storefront website, they will appear here automatically.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout (< 768px) */}
                <div className="grid gap-3.5 md:hidden">
                  {orders.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <Link
                            href={`/transactions/sales/${ord.id}`}
                            className="text-blue-600 hover:underline font-mono font-bold text-xs flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {ord.invoiceNumber}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {ord.status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            PAID
                          </span>
                        ) : ord.status === 'ACCEPTED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            ACCEPTED
                          </span>
                        ) : ord.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            PENDING
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <strong className="text-slate-900 block text-xs font-bold">{ord.customerName}</strong>
                        {ord.customerPhone && (
                          <p className="text-slate-600 text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {ord.customerPhone}
                          </p>
                        )}
                        {ord.deliveryAddress && (
                          <p className="text-slate-500 text-[11px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {ord.deliveryAddress}
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Items Ordered</p>
                        {ord.items.map((it: any) => (
                          <div key={it.id} className="text-xs text-slate-700 flex items-center justify-between">
                            <span>• {it.name}</span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              x {it.quantity} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                            Total Amount
                          </span>
                          <span className="text-sm font-bold font-mono text-emerald-600">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {ord.status === 'UNPAID' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'ACCEPTED')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Order
                            </button>
                          )}

                          {ord.status !== 'PAID' && ord.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'PAID')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}

                          {ord.status !== 'CANCELLED' && ord.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                              title="Cancel Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout (>= 768px) */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Web Invoice #</th>
                        <th className="px-4 py-3">Customer Info</th>
                        <th className="px-4 py-3">Items Ordered</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-4 font-mono font-bold text-slate-900">
                            <Link
                              href={`/transactions/sales/${ord.id}`}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {ord.invoiceNumber}
                            </Link>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="px-4 py-4 space-y-1">
                            <strong className="text-slate-900 block text-xs font-bold">{ord.customerName}</strong>
                            {ord.customerPhone && (
                              <span className="text-slate-600 text-[11px] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {ord.customerPhone}
                              </span>
                            )}
                            {ord.deliveryAddress && (
                              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {ord.deliveryAddress}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="space-y-1 max-w-xs">
                              {ord.items.map((it: any) => (
                                <div key={it.id} className="text-xs text-slate-700">
                                  • {it.name}{' '}
                                  <span className="text-slate-500">
                                    x {it.quantity} {it.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-4 font-mono font-bold text-emerald-600">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {ord.status === 'PAID' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                PAID
                              </span>
                            ) : ord.status === 'ACCEPTED' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                ACCEPTED
                              </span>
                            ) : ord.status === 'CANCELLED' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                CANCELLED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                PENDING
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              {ord.status === 'UNPAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'ACCEPTED')}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" /> Accept Order
                                </button>
                              )}

                              {ord.status !== 'PAID' && ord.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'PAID')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" /> Mark Paid
                                </button>
                              )}

                              {ord.status !== 'CANCELLED' && ord.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                                  title="Cancel Order"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* TAB 3: REGISTERED STORE CUSTOMERS DIRECTORY */
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> Registered Storefront Customers
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                View customer contact details, total web orders placed, and lifetime spend for your online storefront
                users.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, phone, email…"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {customersLoading ? (
            <div className="p-8 text-center text-slate-500 font-medium">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading registered storefront customers…
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No Store Customers Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {customerSearch
                  ? `No customers matched "${customerSearch}". Try searching another name or phone number.`
                  : 'When customers place orders or register on your online storefront, their details will appear here automatically.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards (< 768px) */}
              <div className="grid gap-3.5 md:hidden">
                {filteredCustomers.map((cust: any) => (
                  <div key={cust.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <strong className="text-slate-900 text-xs font-bold">{cust.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {cust.totalOrdersCount} Order{cust.totalOrdersCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      {cust.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </p>
                      )}
                      {cust.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.email}</span>
                        </p>
                      )}
                      {cust.address && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Spent</span>
                        <span className="text-xs font-bold font-mono text-emerald-600">
                          Rs. {Number(cust.totalSpent || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Contact (Phone & Email)</th>
                      <th className="px-4 py-3">Delivery Address</th>
                      <th className="px-4 py-3 text-center">Total Orders</th>
                      <th className="px-4 py-3 text-right">Lifetime Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((cust: any) => (
                      <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{cust.name}</td>
                        <td className="px-4 py-3.5 space-y-0.5">
                          <p className="font-mono text-slate-800 font-medium">{cust.phone || 'N/A'}</p>
                          {cust.email && <p className="text-[10px] text-slate-500">{cust.email}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{cust.address || '—'}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-blue-600">
                          {cust.totalOrdersCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                          Rs. {Number(cust.totalSpent || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Save Confirmation Modal */}
      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isLoading={updateSettings.isPending}
        title="Save Storefront Settings?"
        message="Are you sure you want to save changes to your Online Storefront website?"
        confirmText="Yes, Save Settings"
      />
    </div>
  );
}
