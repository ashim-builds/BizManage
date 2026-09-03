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

  const cleanSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const publicStoreUrl = typeof window !== 'undefined'
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Globe className="w-7 h-7 text-blue-400" />
              Online Storefront & Website
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                enableStorefront
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enableStorefront ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {enableStorefront ? 'Website Published' : 'Draft Mode'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Build your online catalog website, manage online orders, and toggle price show/hide controls.
          </p>
        </div>

        {cleanSlug && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={publicStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Website
            </a>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Store className="w-4 h-4" /> Website Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Online Orders Manager
          {pendingOrdersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] shadow-sm">
              {pendingOrdersCount} New
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" /> Registered Store Customers
          {customers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px]">
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
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-400" /> Enable Public Website & Catalog
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Store URL Handle */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Store Web Handle (URL Slug) *
                </label>
                <div className="flex rounded-xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="px-3.5 py-2.5 bg-slate-800/80 text-slate-400 text-xs font-mono flex items-center shrink-0 border-r border-slate-800">
                    /store/
                  </span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value)}
                    placeholder="e.g. rb-hardware"
                    className="w-full px-3.5 py-2.5 bg-transparent text-white text-xs font-mono focus:outline-none placeholder-slate-600"
                  />
                </div>
                {cleanSlug && (
                  <p className="text-[11px] text-blue-400 font-mono flex items-center gap-1 pt-1">
                    <LinkIcon className="w-3 h-3 shrink-0" /> Public Store Link: {publicStoreUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Store Information */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">Store Information & Contact</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Store Title / Display Name
                  </label>
                  <input
                    type="text"
                    value={storeTitle}
                    onChange={(e) => setStoreTitle(e.target.value)}
                    placeholder="Leave empty to use Business Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    WhatsApp Contact Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Store Description / Welcome Message
                  </label>
                  <textarea
                    rows={3}
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Short summary of your products and store location…"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updateSettings.isPending}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? 'Saving configuration…' : 'Save Storefront Settings'}
            </button>
          </div>

          {/* Right Column: Preview & Status */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Website Features Included
              </h3>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Public Store URL <code>/store/[slug]</code></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Business Logo &amp; Banner Header</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Price Show / Hide Controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct WhatsApp Inquiries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct Online Orders (<code>WEB-00001</code>)</span>
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
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Total Online Orders</span>
              <p className="text-2xl font-extrabold text-white">{orders?.length || 0}</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Pending Payment Collection</span>
              <p className="text-2xl font-extrabold text-amber-400">{pendingOrdersCount}</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Online Orders Revenue</span>
              <p className="text-2xl font-extrabold text-emerald-400">Rs. {totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-400" /> Incoming Web Orders &amp; Leads
              </h3>
              <button
                type="button"
                onClick={() => refetchOrders()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {ordersLoading ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading incoming online orders…
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">No Online Orders Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When customers submit orders on your storefront website, they will appear here automatically.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout (< 768px) */}
                <div className="grid gap-3.5 md:hidden p-4">
                  {orders.map((ord: any) => (
                    <div key={ord.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-md">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div>
                          <Link
                            href={`/transactions/sales/${ord.id}`}
                            className="text-blue-400 hover:underline font-mono font-bold text-xs flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {ord.invoiceNumber}
                          </Link>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {ord.status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            PAID
                          </span>
                        ) : ord.status === 'ACCEPTED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                            ACCEPTED
                          </span>
                        ) : ord.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            PENDING
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <strong className="text-white block text-xs font-bold">{ord.customerName}</strong>
                        {ord.customerPhone && (
                          <p className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" /> {ord.customerPhone}
                          </p>
                        )}
                        {ord.deliveryAddress && (
                          <p className="text-slate-400 text-[11px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {ord.deliveryAddress}
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Items Ordered</p>
                        {ord.items.map((it: any) => (
                          <div key={it.id} className="text-xs text-slate-300 flex items-center justify-between">
                            <span>• {it.name}</span>
                            <span className="text-slate-400 font-mono text-[11px]">x {it.quantity} {it.unit}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {ord.customerPhone && (
                            <a
                              href={`https://wa.me/${ord.customerPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1 text-[11px] font-bold"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {ord.status === 'UNPAID' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'ACCEPTED')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Order
                            </button>
                          )}

                          {ord.status !== 'PAID' && ord.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'PAID')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}

                          {ord.status !== 'CANCELLED' && ord.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
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
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Web Invoice #</th>
                        <th className="px-4 py-3">Customer Info</th>
                        <th className="px-4 py-3">Items Ordered</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-4 font-mono font-bold text-white">
                            <Link
                              href={`/transactions/sales/${ord.id}`}
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {ord.invoiceNumber}
                            </Link>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="px-4 py-4 space-y-1">
                            <strong className="text-white block text-xs">{ord.customerName}</strong>
                            {ord.customerPhone && (
                              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" /> {ord.customerPhone}
                              </span>
                            )}
                            {ord.deliveryAddress && (
                              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" /> {ord.deliveryAddress}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="space-y-1 max-w-xs">
                              {ord.items.map((it: any) => (
                                <div key={it.id} className="text-xs text-slate-300">
                                  • {it.name} <span className="text-slate-400">x {it.quantity} {it.unit}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-4 font-mono font-bold text-emerald-400">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {ord.status === 'PAID' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                PAID
                              </span>
                            ) : ord.status === 'ACCEPTED' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                                ACCEPTED
                              </span>
                            ) : ord.status === 'CANCELLED' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                                CANCELLED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                PENDING
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              {ord.customerPhone && (
                                <a
                                  href={`https://wa.me/${ord.customerPhone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
                                  title="Contact Customer via WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </a>
                              )}

                              {ord.status === 'UNPAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'ACCEPTED')}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" /> Accept Order
                                </button>
                              )}

                              {ord.status !== 'PAID' && ord.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'PAID')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" /> Mark Paid
                                </button>
                              )}

                              {ord.status !== 'CANCELLED' && ord.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
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
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Registered Storefront Customers
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                View customer contact details, total web orders placed, and lifetime spend for your online storefront users.
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
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {customersLoading ? (
            <div className="p-8 text-center text-slate-400 font-medium">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading registered storefront customers…
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No Store Customers Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                  <div key={cust.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <strong className="text-white text-xs font-bold">{cust.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cust.totalOrdersCount} Order{cust.totalOrdersCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      {cust.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{cust.phone}</span>
                        </p>
                      )}
                      {cust.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{cust.email}</span>
                        </p>
                      )}
                      {cust.address && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{cust.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Spent</span>
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          Rs. {Number(cust.totalSpent || 0).toLocaleString()}
                        </span>
                      </div>

                      {cust.phone && (
                        <a
                          href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Contact (Phone & Email)</th>
                      <th className="px-4 py-3">Delivery Address</th>
                      <th className="px-4 py-3 text-center">Total Orders</th>
                      <th className="px-4 py-3 text-right">Lifetime Spent</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCustomers.map((cust: any) => (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white">
                          {cust.name}
                        </td>
                        <td className="px-4 py-3.5 space-y-0.5">
                          <p className="font-mono text-slate-300">{cust.phone || 'N/A'}</p>
                          {cust.email && <p className="text-[10px] text-slate-400">{cust.email}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {cust.address || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-blue-400">
                          {cust.totalOrdersCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                          Rs. {Number(cust.totalSpent || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {cust.phone && (
                            <a
                              href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Chat
                            </a>
                          )}
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
