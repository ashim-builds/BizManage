'use client';

import { useState, useEffect } from 'react';
import { useStorefrontSettings, useUpdateStorefrontSettings } from '@/hooks/useStorefront';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StorefrontSettingsPage() {
  const { data: settings, isLoading, isError } = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();

  const [enableStorefront, setEnableStorefront] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [showStorePrices, setShowStorePrices] = useState(true);
  const [storeTitle, setStoreTitle] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [enableOnlineOrders, setEnableOnlineOrders] = useState(true);
  const [copied, setCopied] = useState(false);

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
    toast.success('Public Store URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enableStorefront && !cleanSlug) {
      toast.error('Store URL handle is required to enable website');
      return;
    }

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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Storefront configuration…
      </div>
    );
  }

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
            Build your online catalog website, toggle product price visibility, and receive WhatsApp & online customer orders.
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-[11px] text-blue-400 font-mono flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> {publicStoreUrl}
                </p>
              )}
            </div>
          </div>

          {/* PRICE VISIBILITY CONTROL */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {showStorePrices ? (
                    <Eye className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-amber-400" />
                  )}
                  Product Price Visibility Control
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose whether product selling prices are visible to website visitors or hidden behind price inquiries.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStorePrices}
                  onChange={(e) => setShowStorePrices(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-amber-600/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div
                onClick={() => setShowStorePrices(true)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  showStorePrices
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Eye className="w-4 h-4 text-emerald-400" /> Show Product Prices
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Product prices (e.g. <span className="font-mono text-emerald-400">Rs. 1,000</span>) are displayed clearly to online customers.
                </p>
              </div>

              <div
                onClick={() => setShowStorePrices(false)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  !showStorePrices
                    ? 'bg-amber-500/10 border-amber-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <EyeOff className="w-4 h-4 text-amber-400" /> Hide Prices (Inquire for Price)
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Prices are hidden and replaced with a <span className="font-semibold text-amber-400">"Price on Request"</span> WhatsApp inquiry badge.
                </p>
              </div>
            </div>
          </div>

          {/* Store Branding & Contact Details */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Store Branding & Contact Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Storefront Title
                </label>
                <input
                  type="text"
                  value={storeTitle}
                  onChange={(e) => setStoreTitle(e.target.value)}
                  placeholder="e.g. RB Hardware & Sanitary House"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  WhatsApp Orders Number
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 9841000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Store Bio / Welcome Message
              </label>
              <textarea
                rows={3}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Welcome to our online store! Browse our catalog and order directly via WhatsApp or online checkout."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={updateSettings.isPending}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? 'Saving Configuration…' : 'Save Website Settings'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Website Card Preview */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400" /> Live Website Preview
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Customer View</span>
            </div>

            {/* Mock Header Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {storeTitle ? storeTitle.substring(0, 2).toUpperCase() : 'STORE'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{storeTitle || 'My Online Store'}</h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                    {storeDescription || 'Digital product catalog'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Product Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">1" CPVC Pipe</span>
                  <span className="text-[10px] text-slate-400">Unit: Pcs</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  In Stock
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  {showStorePrices ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block">Price:</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">Rs. 1,000</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold block flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Price Hidden
                      </span>
                      <span className="text-[10px] text-slate-400">Inquire via WhatsApp</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                >
                  <ShoppingBag className="w-3 h-3" /> Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
