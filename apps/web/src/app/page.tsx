'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Receipt,
  ShieldCheck,
  Check,
  Crown,
  Zap,
  Plus,
  Store,
  Smartphone,
  Users,
  Package,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  ScanBarcode,
  Laptop,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function Home() {
  const { user } = useAuth();

  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? '/admin/dashboard' : user?.memberships?.length ? '/dashboard' : '/setup-business';
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Workspace Dashboard';

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col justify-between font-sans">
      <div>
        <PublicHeader activePage="home" />

        {/* =========================================================
            0. REMOVED NEWSLETTER SECTION
        ========================================================= */}

        {/* =========================================================
            1. HERO SECTION (Black & White with Color Accents)
        ========================================================= */}
        <section className="relative pt-12 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 max-w-7xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-tight sm:leading-[1.15] text-black">
            Best GST Billing Software for Small Businesses
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-slate-700 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed font-normal">
            Create professional GST & PAN bills, manage stock with barcodes, track customer ledgers (उधारो खाता), print
            thermal receipts, and send automated WhatsApp reminders.
          </p>

          {/* Dual Simple CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              href={user ? dashboardHref : '/register'}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group"
            >
              <span>{user ? `Open ${dashboardLabel}` : 'Start 14 Days Free'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/explore-stores"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-black border-2 border-black font-bold text-base transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Store className="w-5 h-5 text-black" />
              <span>Explore Stores</span>
            </Link>
          </div>

          {/* Simple Trust Line */}
          <div className="mt-10 flex items-center justify-center gap-2 text-slate-600">
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span className="text-sm font-semibold">No credit card required to start</span>
          </div>
        </section>

        {/* =========================================================
            2. 4 TRUST BADGES BANNER (Black & White)
        ========================================================= */}
        <section className="bg-black border-y border-slate-800 py-8 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">GST-Ready Billing</h4>
                <p className="text-xs text-slate-400">VAT & PAN Compliant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">Secure Data</h4>
                <p className="text-xs text-slate-400">Cloud Backup Included</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">Business Ready</h4>
                <p className="text-xs text-slate-400">Trusted Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">All Industries</h4>
                <p className="text-xs text-slate-400">Retail & Factory</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. INTERACTIVE DESKTOP DEMO WINDOW (Black & White)
        ========================================================= */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="rounded-2xl border-2 border-black bg-white shadow-xl overflow-hidden">
            {/* Window Top Controls */}
            <div className="bg-black border-b-2 border-black px-6 py-4 flex items-center justify-start">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-500 cursor-pointer" />
                <span className="text-sm font-bold text-white ml-3">BizManage Desktop</span>
              </div>
            </div>

            {/* Inner Dashboard Preview */}
            <div className="p-5 sm:p-8 md:p-10 bg-white space-y-6 sm:space-y-8">
              {/* Header inside window */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white font-bold text-lg">
                    V
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">Kathmandu Retail Mart</h3>
                    <p className="text-xs text-slate-600">PAN: 601239921 • Real-time Accounting</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                    <Plus className="w-4 h-4 stroke-[3]" /> Add Sale
                  </span>
                  <span className="px-4 py-2 rounded-xl bg-white border-2 border-black text-black font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all">
                    <Plus className="w-4 h-4 stroke-[3]" /> Add Purchase
                  </span>
                </div>
              </div>

              {/* 2 Big Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-6 rounded-xl bg-white border-2 border-black shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Total Receivable (उठाउन बाँकी)
                    </span>
                    <h4 className="text-3xl sm:text-4xl font-black text-black font-mono mt-2">Rs. 248,500</h4>
                    <p className="text-xs text-slate-600 mt-1">14 pending customer invoices</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                    ↓
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-white border-2 border-black shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Total Payable (तिर्न बाँकी)
                    </span>
                    <h4 className="text-3xl sm:text-4xl font-black text-black font-mono mt-2">Rs. 94,200</h4>
                    <p className="text-xs text-slate-600 mt-1">6 supplier bills due this week</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                    ↑
                  </div>
                </div>
              </div>

              {/* Liquidity Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border-2 border-black">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cash in Hand</span>
                  <p className="text-lg font-black text-black font-mono mt-1">Rs. 62,400</p>
                </div>
                <div className="p-4 rounded-xl bg-white border-2 border-black">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bank Balance</span>
                  <p className="text-lg font-black text-black font-mono mt-1">Rs. 510,000</p>
                </div>
                <div className="p-4 rounded-xl bg-white border-2 border-black">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Stock</span>
                  <p className="text-lg font-black text-black font-mono mt-1">Rs. 1,480,200</p>
                </div>
                <div className="p-4 rounded-xl bg-white border-2 border-black">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Low Stock</span>
                  <p className="text-lg font-black text-black font-mono mt-1">3 Items</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. 6 CORE FEATURES (Black & White Cards with Accents)
        ========================================================= */}
        <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-black">
              Everything Your Business Needs
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-700 mt-3 sm:mt-4">
              From fast barcode checkout to stock transfer and automatic WhatsApp reminders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. POS Quick Billing */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">POS Quick Billing</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Superfast barcode scanning, keyboard hotkeys (F2/F3), and thermal printer compatibility for busy retail
                shops.
              </p>
            </div>

            {/* 2. Godowns & Stock Transfer */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">Manage Godowns & Stock Transfer</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Organize inventory across multiple warehouses and branch locations with automated movement audit logs.
              </p>
            </div>

            {/* 3. Barcode Labels */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">Barcode Label Printing</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Generate CODE128 and EAN barcodes. Print sticker sheets or roll labels with customized MRP and expiry
                dates.
              </p>
            </div>

            {/* 4. WhatsApp Invoicing */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">WhatsApp Invoicing & Reminders</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Send professional digital bills and payment reminders directly to customer WhatsApp with one click.
              </p>
            </div>

            {/* 5. Manufacturing Transactions */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">Manufacturing & Assembly</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Record raw material consumption, calculate labor overheads, and auto-produce finished goods into stock.
              </p>
            </div>

            {/* 6. Tally Export & GST Reports */}
            <div className="p-7 rounded-2xl bg-white border-2 border-black shadow-md space-y-4 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-black">Financial Reports & Tally Export</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Generate Balance Sheets, Billwise P&L, and Daybook reports. Export directly to Tally ERP with one click.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. MULTI-DEVICE SYNC
        ========================================================= */}
        <section id="download-app" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="rounded-2xl bg-black border-2 border-black p-10 sm:p-16 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="space-y-6 max-w-xl text-center lg:text-left">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Sync Data Across Desktop & Mobile
              </h2>
              <p className="text-base text-slate-300 leading-relaxed">
                Manage your shop counter on Desktop while monitoring live sales and customer dues from your mobile phone
                anywhere.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/register"
                  className="px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-base shadow-lg transition-all active:scale-95"
                >
                  Start 14 Days Free
                </Link>
                <Link
                  href="/sync-backup"
                  className="px-8 py-4 rounded-xl bg-transparent hover:bg-slate-900 text-white border-2 border-white font-bold text-base transition-all"
                >
                  View Sync & Backup
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="p-8 rounded-2xl bg-white border-2 border-white shadow-lg text-center space-y-3">
                <Laptop className="w-10 h-10 text-black mx-auto" />
                <h4 className="text-sm font-bold text-black">Desktop App</h4>
                <p className="text-xs text-slate-600">Windows & Mac</p>
              </div>
              <div className="p-8 rounded-2xl bg-white border-2 border-white shadow-lg text-center space-y-3">
                <Smartphone className="w-10 h-10 text-black mx-auto" />
                <h4 className="text-sm font-bold text-black">Mobile App</h4>
                <p className="text-xs text-slate-600">Android & iOS</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. PRICING PLANS (Black & White Cards)
        ========================================================= */}
        <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-slate-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-xs">
              <span>Transparent Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-black">
              Simple Pricing in Rupees
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-700 mt-3 sm:mt-4">
              Every plan includes a full 14-day free trial with all features unlocked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
            {/* Free Starter */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-black shadow-md space-y-6 flex flex-col justify-between hover:shadow-xl transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-black">Free Starter</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    Forever Free
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">For new businesses and freelancers.</p>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tight whitespace-nowrap">Rs. 0</span>
                    <span className="text-xs text-slate-600 font-medium">/ forever</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Free Base Accounting</p>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 pt-4 border-t-2 border-black/10">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Up to 50 Sale Invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Basic Inventory & Stock
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Thermal Print Support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Single User / Device
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Cash & Bank Ledgers
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3.5 rounded-2xl bg-white border-2 border-black hover:bg-black hover:text-white text-black font-extrabold text-sm text-center transition-all active:scale-95 shadow-xs"
              >
                Get Started Free
              </Link>
            </div>

            {/* Gold Edition (Most Popular) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-black border-2 border-black shadow-2xl space-y-6 flex flex-col justify-between relative md:-translate-y-2 hover:shadow-2xl transition-all">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/40 border border-blue-400 whitespace-nowrap">
                Most Popular
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-xl font-black text-white">Gold Edition</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Retail Pro
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">Complete POS billing & inventory for retail.</p>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 line-through font-mono">Rs. 4,999</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Save 50%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight whitespace-nowrap">Rs. 2,499</span>
                    <span className="text-xs text-slate-300 font-medium">/ year</span>
                  </div>
                  <p className="text-xs text-slate-300 font-bold mt-1.5">Only Rs. 208 / month</p>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-200 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2 font-bold text-white">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> 14-Day Full Free Trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> Unlimited GST / PAN Bills
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> High-Speed POS Billing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> Custom Barcode Printing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> WhatsApp Invoicing & Reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 stroke-[3]" /> Up to 5 Staff Users
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm text-center transition-all shadow-lg shadow-blue-600/30 active:scale-95"
              >
                Start 14 Days Free Trial
              </Link>
            </div>

            {/* Platinum ERP */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-black shadow-md space-y-6 flex flex-col justify-between hover:shadow-xl transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-black">Platinum ERP</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">Multi-godown & manufacturing operations.</p>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 line-through font-mono">Rs. 7,999</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Save 50%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tight whitespace-nowrap">Rs. 3,999</span>
                    <span className="text-xs text-slate-600 font-medium">/ year</span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold mt-1.5">Only Rs. 333 / month</p>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 pt-4 border-t-2 border-black/10">
                  <li className="flex items-center gap-2 font-semibold">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Everything in Gold Edition
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Multi-Godowns & Transfers
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Manufacturing & BOM Assembly
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Export to Tally ERP & Excel
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Online E-commerce Storefront
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0 stroke-[3]" /> Unlimited Staff & Priority 24/7
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3.5 rounded-2xl bg-black hover:bg-slate-900 text-white font-extrabold text-sm text-center transition-all active:scale-95 shadow-md"
              >
                Start Platinum Trial
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            7. FAQ
        ========================================================= */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-black tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-700 mt-2 sm:mt-3">
              Everything you need to know about BizManage v2.0.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-white border-2 border-black">
              <h4 className="text-base font-bold text-black">How does the 14-day free trial work?</h4>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                When you create an account, all features—including POS billing, godowns, barcode label printing, and
                WhatsApp bills—are unlocked for 14 full days with no credit card required.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border-2 border-black">
              <h4 className="text-base font-bold text-black">Can I backup my business data locally?</h4>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                Yes. Our Sync & Backup tool allows you to download a complete JSON backup snapshot with one click, and
                restore it at any time.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border-2 border-black">
              <h4 className="text-base font-bold text-black">Can I connect thermal printers and barcode scanners?</h4>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                Yes. BizManage POS supports USB/Bluetooth thermal receipt printers and all barcode scanners out of the
                box.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
