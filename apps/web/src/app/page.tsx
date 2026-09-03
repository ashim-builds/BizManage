"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function Home() {
  const { user } = useAuth();

  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? "/admin/dashboard" : (user?.memberships?.length ? "/dashboard" : "/setup-business");
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Workspace Dashboard";

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white flex flex-col justify-between font-sans">
      <div>
        <PublicHeader activePage="home" />

        {/* =========================================================
            1. HERO SECTION (Simple & Minimal Black & White)
        ========================================================= */}
        <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto text-center">
          {/* Neutral Pill Badge */}
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-slate-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
            <span>Trusted by 1.5 Cr+ Businesses</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.15] text-slate-900">
            Best GST Billing Software for Small Businesses
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-slate-600 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed font-normal">
            Create professional GST & PAN bills, manage stock with barcodes, track customer ledgers (उधारो खाता), print thermal receipts, and send automated WhatsApp reminders.
          </p>

          {/* Dual Simple CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <Link
              href={user ? dashboardHref : "/register"}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 group"
            >
              <span>{user ? `Open ${dashboardLabel}` : "Start 7-Day Free Trial"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/explore-stores"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Store className="w-4 h-4 text-slate-600" />
              <span>Explore Stores</span>
            </Link>
          </div>

          {/* Ratings Strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-bold">★ 4.8</span>
              <span>Google Play</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-bold">★ 4.9</span>
              <span>SourceForge</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-bold">★ 4.4</span>
              <span>G2 Crowd</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No Credit Card Required</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            2. 4 TRUST BADGES BANNER (Clean & Simple)
        ========================================================= */}
        <section className="bg-slate-50 border-y border-slate-200 py-6 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900">GST-Ready Billing</h4>
                <p className="text-[11px] text-slate-500">VAT & PAN Compliant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900">Secure SSL Data</h4>
                <p className="text-[11px] text-slate-500">Automatic Cloud Backup</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900">Business Owners</h4>
                <p className="text-[11px] text-slate-500">1.5 Cr+ Trust BizManage</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900">Retail & Factory</h4>
                <p className="text-[11px] text-slate-500">Fast POS & Barcodes</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. INTERACTIVE DESKTOP DEMO WINDOW (Monochrome)
        ========================================================= */}
        <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {/* Window Top Controls */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-xs font-semibold text-slate-600 ml-2">BizManage Desktop v2.0</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Live MySQL Database Sync
              </div>
            </div>

            {/* Inner Dashboard Preview */}
            <div className="p-6 sm:p-8 bg-[#F8FAFC] space-y-6">
              {/* Header inside window */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                    V
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Kathmandu Retail Mart</h3>
                    <p className="text-[11px] text-slate-500">PAN: 601239921 • Real-time Accounting</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs flex items-center gap-1 shadow-xs">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> + Add Sale
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-xs flex items-center gap-1 shadow-xs">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> + Add Purchase
                  </span>
                </div>
              </div>

              {/* 2 Big Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Receivable (उठाउन बाँकी)</span>
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">Rs. 248,500</h4>
                    <p className="text-[11px] text-slate-400">14 pending customer invoices</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-bold flex items-center justify-center text-lg">
                    ↓
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Payable (तिर्न बाँकी)</span>
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">Rs. 94,200</h4>
                    <p className="text-[11px] text-slate-400">6 supplier bills due this week</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-bold flex items-center justify-center text-lg">
                    ↑
                  </div>
                </div>
              </div>

              {/* Liquidity Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cash in Hand</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">Rs. 62,400</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Bank Balance</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">Rs. 510,000</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Stock</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">Rs. 1,480,200</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-700 uppercase font-semibold">Low Stock</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">3 Items</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. 6 CORE FEATURES (Simple White Cards)
        ========================================================= */}
        <section id="features" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Full Feature Suite
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 mt-4">
              Everything Your Business Needs in One Software
            </h2>
            <p className="text-xs sm:text-base text-slate-500 mt-2">
              From fast barcode checkout to stock transfer and automatic WhatsApp reminders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. POS Quick Billing */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">POS Quick Billing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Superfast barcode scanning, keyboard hotkeys (F2/F3), and thermal printer compatibility (58mm/80mm) for busy retail shops.
              </p>
            </div>

            {/* 2. Godowns & Stock Transfer */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Manage Godowns & Stock Transfer</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Organize inventory across multiple warehouses and branch locations. Transfer stock seamlessly with automated movement audit logs.
              </p>
            </div>

            {/* 3. Barcode Labels */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Barcode Label Printing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate CODE128 and EAN barcodes. Print sticker sheets or roll labels with customized MRP, expiry dates, and store names.
              </p>
            </div>

            {/* 4. WhatsApp Invoicing */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">WhatsApp Invoicing & Reminders</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send professional digital bills and payment reminders directly to customer WhatsApp with 1 click. Zero SMS fees.
              </p>
            </div>

            {/* 5. Manufacturing Transactions */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Manufacturing & Assembly (BOM)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Record raw material consumption, calculate labor overheads, and auto-produce finished goods into stock.
              </p>
            </div>

            {/* 6. Tally Export & GST Reports */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Financial Reports & Tally Export</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate Balance Sheets, Billwise P&L, and Daybook reports. Export transaction data directly to Tally ERP with 1 click.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. MULTI-DEVICE SYNC
        ========================================================= */}
        <section id="download-app" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-full">
                Multi-Device Synchronization
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Sync Data Across Desktop & Mobile Seamlessly
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Manage your shop counter on Desktop while monitoring live sales and customer dues from your mobile phone anywhere.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-all"
                >
                  Start 7-Day Free Trial
                </Link>
                <Link
                  href="/sync-backup"
                  className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-semibold text-xs transition-all"
                >
                  View Sync & Backup Hub
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-2">
                <Laptop className="w-8 h-8 text-slate-700 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">Desktop App</h4>
                <p className="text-[10px] text-slate-400">Windows & Mac</p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-2">
                <Smartphone className="w-8 h-8 text-slate-700 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">Mobile App</h4>
                <p className="text-[10px] text-slate-400">Android & iOS</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. PRICING PLANS (Simple Monochrome Cards)
        ========================================================= */}
        <section id="pricing" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Affordable Plans
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 mt-4">
              Simple Pricing in Rupees (Rs.)
            </h2>
            <p className="text-xs sm:text-base text-slate-500 mt-2">
              Every plan includes a full 7-day free trial with all features unlocked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Starter */}
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Free Starter</h3>
                <p className="text-xs text-slate-500">For new businesses and freelancers.</p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">Rs. 0</span>
                  <span className="text-xs text-slate-400 ml-1">/ forever</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Up to 50 Sale Invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Basic Inventory & Stock
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Standard Receipt Thermal Print
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs text-center transition-all border border-slate-200"
              >
                Get Started Free
              </Link>
            </div>

            {/* Gold (Clean Bold Border) */}
            <div className="p-8 rounded-2xl bg-white border-2 border-slate-900 shadow-md space-y-6 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                Most Popular
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Gold Edition</h3>
                <p className="text-xs text-slate-500">Complete POS billing & inventory for retail.</p>
                <div className="pt-2">
                  <span className="text-xs text-slate-400 line-through mr-1 font-mono">Rs. 4,999</span>
                  <span className="text-3xl font-black text-slate-900 font-mono">Rs. 2,499</span>
                  <span className="text-xs text-slate-500 ml-1">/ year</span>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Only Rs. 208 / month</p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-4 h-4 text-slate-900 shrink-0" /> 7-Day Full Free Trial Included
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Unlimited GST / PAN Bills
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> High-Speed POS Quick Billing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Custom Barcode Printing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> 1-Click WhatsApp Invoicing
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs text-center transition-all shadow-xs active:scale-95"
              >
                Start 7-Day Free Trial
              </Link>
            </div>

            {/* Platinum */}
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Platinum ERP</h3>
                <p className="text-xs text-slate-500">Multi-godown & manufacturing operations.</p>
                <div className="pt-2">
                  <span className="text-xs text-slate-400 line-through mr-1 font-mono">Rs. 7,999</span>
                  <span className="text-3xl font-black text-slate-900 font-mono">Rs. 3,999</span>
                  <span className="text-xs text-slate-500 ml-1">/ year</span>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Only Rs. 333 / month</p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Multi-Godowns & Stock Transfer
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Manufacturing Assembly (BOM)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> Export to Tally ERP
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-800 shrink-0" /> E-commerce Online Storefront
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs text-center transition-all"
              >
                Start Platinum Trial
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            7. FAQ
        ========================================================= */}
        <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Everything you need to know about BizManage v2.0.</p>
          </div>

          <div className="space-y-3">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">How does the 7-day free trial work?</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                When you create an account, all features—including POS billing, godowns, barcode label printing, and WhatsApp bills—are unlocked for 7 full days with no credit card required.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Can I backup my business data locally?</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Yes. Our Sync, Share & Backup tool allows you to download a complete JSON backup snapshot with 1 click, and restore it at any time.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Can I connect thermal printers and barcode scanners?</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Yes. BizManage POS supports USB/Bluetooth thermal receipt printers (58mm/80mm) and all barcode scanners out of the box.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}