"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Check,
  Crown,
  Sparkles,
  Zap,
  Plus,
  Download,
  Store,
  MapPin,
  ShoppingBag,
  Globe,
  Smartphone,
  Printer,
  Users,
  Package,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Share2,
  FileSpreadsheet,
  ScanBarcode,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { usePublicStores } from "@/hooks/useStorefront";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  trialDays: number;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { data: publicStores, isLoading: storesLoading } = usePublicStores();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/packages');
        if (res.data.success) {
          const parsedPackages = res.data.data.map((pkg: any) => ({
            ...pkg,
            features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []),
          }));
          setPackages(parsedPackages);
        }
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setPackagesLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? "/admin/dashboard" : (user?.memberships?.length ? "/dashboard" : "/setup-business");
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Workspace Dashboard";

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-500 selection:text-white flex flex-col justify-between font-sans">
      <div>
        <PublicHeader activePage="home" />

        {/* =========================================================
            1. VYAPAR HERO SECTION
        ========================================================= */}
        <section className="relative pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 sm:w-[36rem] h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Vyapar Badge */}
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>#1 Billing, Inventory & Accounting Software</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.15]">
            Manage Your Complete Business in{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-400 to-red-600 bg-clip-text text-transparent">
              One Smart Platform
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-slate-300 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Create professional GST/VAT & PAN bills, manage stock with barcodes, track party ledgers (उधारो खाता), print thermal receipts, and send automated WhatsApp reminders.
          </p>

          {/* Dual CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <Link
              href={user ? dashboardHref : "/register"}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 group"
            >
              <span>{user ? `Open ${dashboardLabel}` : "Start Free Trial — No Card Needed"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#download-app"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-red-400" />
              <span>Get Mobile App</span>
            </a>
          </div>

          {/* Trust Highlights Strip */}
          <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PAN / VAT & GST Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Thermal (58/80mm) & A4 Print</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Invoice Sharing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Offline Support</span>
            </div>
          </div>

          {/* =========================================================
              2. VYAPAR SOFTWARE INTERFACE MOCKUP
          ========================================================= */}
          <div className="mt-14 relative max-w-5xl mx-auto">
            <div className="rounded-3xl p-1.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-2xl border border-slate-800/80">
              <div className="rounded-[22px] bg-slate-950 overflow-hidden border border-slate-800/60 shadow-inner">
                {/* Window Top Bar */}
                <div className="h-10 bg-slate-900 border-b border-slate-800/80 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-[11px] font-mono text-slate-400 ml-2 hidden sm:inline">
                      BizManage Vyapar v2 — Modern Accounting & POS Billing
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      ● Cloud Synced
                    </span>
                  </div>
                </div>

                {/* Mockup Dashboard Content */}
                <div className="p-4 sm:p-6 space-y-5 text-left bg-gradient-to-b from-slate-950 to-[#0c0e14]">
                  {/* Vyapar Action Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-red-600/20">
                        V
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Kathmandu Traders Pvt. Ltd.</h4>
                        <p className="text-[11px] text-slate-400">PAN: 601234567 • FY: 2083/84</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Sale</span>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Purchase</span>
                      </div>
                    </div>
                  </div>

                  {/* 2 Big Vyapar Hero Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* You'll Receive */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>You'll Receive (उठाउन बाँकी)</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                          Rs. 1,48,500
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">From 14 Customers</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        ↓
                      </div>
                    </div>

                    {/* You'll Pay */}
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>You'll Pay (तिर्न बाँकी)</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black font-mono text-rose-400 mt-1">
                          Rs. 62,300
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">To 5 Suppliers</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                        ↑
                      </div>
                    </div>
                  </div>

                  {/* Quick Liquidity Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cash In Hand</span>
                      <strong className="text-sm font-mono text-white">Rs. 38,400</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Bank Balance</span>
                      <strong className="text-sm font-mono text-white">Rs. 2,15,600</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Stock Value</span>
                      <strong className="text-sm font-mono text-white">Rs. 8,45,000</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-amber-400 block">Low Stock Alert</span>
                      <strong className="text-sm font-mono text-amber-400">4 Items to reorder</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. VYAPAR CORE FEATURES SHOWCASE
        ========================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Built for Business Success</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              All Tools You Need to Run Your Shop & Company
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Say goodbye to complicated spreadsheets and expensive legacy software. BizManage gives you every feature in an easy-to-use mobile & web app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: GST/VAT Billing */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                GST / VAT & PAN Billing
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate professional bills in seconds. Supports A4, A5, and 2-inch/3-inch thermal POS receipt printers. Add QR codes for direct digital payment.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-red-400" /> WhatsApp bill sharing with 1-click
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-red-400" /> Custom invoice prefixes & numbering
                </li>
              </ul>
            </div>

            {/* Feature 2: Barcode & Stock Management */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                Inventory & Barcode Stock ERP
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track stock in real-time across your warehouse and shop. Auto-alert when items fall below minimum threshold so you never run out of inventory.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400" /> Barcode scanner support (Camera & USB)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400" /> Item categories, units (Pcs/Kg/Box), and stock valuation
                </li>
              </ul>
            </div>

            {/* Feature 3: Udharo Khata */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Parties & Udharo Khata (उधारो)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Maintain accurate balances for every customer and supplier. See who owes you money at a glance and collect receivables 3x faster.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Automated payment reminder messages
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Complete statement & ledger PDF download
                </li>
              </ul>
            </div>

            {/* Feature 4: Cash & Bank Management */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                Cash, Bank & Digital Payments
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Record cash drawer amounts, multiple business bank accounts, and digital wallet balances (eSewa, Khalti, Fonepay) without discrepancies.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400" /> Daybook and cashflow reconciliation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400" /> Internal account-to-account fund transfer
                </li>
              </ul>
            </div>

            {/* Feature 5: Free Online Storefront */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">
                My Online Store (ई-कमर्स)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Turn your inventory into an online catalog in 10 seconds. Customers can browse your products, check prices, and place direct WhatsApp orders.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-400" /> Custom store link (e.g. /store/myshop)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-400" /> Direct WhatsApp ordering & live stock sync
                </li>
              </ul>
            </div>

            {/* Feature 6: 30+ Financial Reports */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                Business & Tax Reports
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Know your exact Profit & Loss every second. Export one-click reports for tax auditors, accountants, and bank loan approvals in Excel and PDF.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" /> Real-time Profit & Loss statement
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" /> Stock summary & item sales analysis
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. MOBILE APP DOWNLOAD CALLOUT
        ========================================================= */}
        <section id="download-app" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Mobile App Available</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bill On the Go from Your Phone
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Install BizManage directly on your Android or iPhone in 1 tap. Creates invoices instantly, scans barcodes with your phone camera, and works even when your internet is down.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1-Click Install (PWA)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Works Offline
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Cloud Sync
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3 shrink-0 w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto shadow-md">
                <img src="/logo-transparent.png" alt="BizManage" className="w-10 h-10 object-contain" />
              </div>
              <h4 className="text-sm font-bold text-white">BizManage Mobile App</h4>
              <p className="text-xs text-slate-400">Open this website on mobile & tap "Install"</p>
              <Link
                href="/register"
                className="w-full py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all block"
              >
                Create Account & Install
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. VYAPAR PRICING PLANS
        ========================================================= */}
        <section id="pricing" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Crown className="w-3.5 h-3.5" />
              <span>Transparent & Affordable Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Invest in Your Business Growth
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Start free today and upgrade as your sales increase. No hidden costs, no setup fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Plan 1: Free Starter */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Free Starter</h3>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                    FREE FOREVER
                  </span>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">Rs. 0</span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal for new shops, retailers, and small businesses getting started with computerized billing.
                </p>
                <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 50 Items / Products</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 100 Invoices / Month</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Thermal & A4 Printing</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Party Udharo Khata</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Mobile & Web App Access</div>
                </div>
              </div>

              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all text-center block border border-slate-700"
              >
                Get Started Free
              </Link>
            </div>

            {/* Plan 2: Silver Business (Featured Vyapar Red) */}
            <div className="p-7 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#181115] border-2 border-red-500 shadow-2xl shadow-red-600/10 flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                ★ MOST POPULAR
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Silver Business</h3>
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                    RECOMMENDED
                  </span>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">Rs. 2,999</span>
                  <span className="text-xs text-slate-400 ml-1">/ year</span>
                </div>
                <p className="text-xs text-slate-400">
                  Full-powered package for growing stores, wholesalers, distributors, and supermarkets.
                </p>
                <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> <strong>Unlimited</strong> Invoices & Bills</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> <strong>Unlimited</strong> Inventory Products</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> WhatsApp Automated Reminders</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> Barcode Generation & Scanning</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> Profit & Loss + Tax Reports</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-red-400" /> Online Catalog Store</div>
                </div>
              </div>

              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all text-center block shadow-lg shadow-red-600/25 active:scale-95"
              >
                Choose Silver Business
              </Link>
            </div>

            {/* Plan 3: Gold Enterprise */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Gold Enterprise</h3>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    MULTI-BRANCH
                  </span>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">Rs. 5,999</span>
                  <span className="text-xs text-slate-400 ml-1">/ year</span>
                </div>
                <p className="text-xs text-slate-400">
                  Multi-branch management with multiple cashier staff, custom domain storefront, and VIP support.
                </p>
                <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Everything in Silver Business</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Multi-Branch / Multiple Firms</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Role-based Staff Permissions</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Custom Domain Storefront</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Dedicated Phone & WhatsApp Support</div>
                </div>
              </div>

              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all text-center block border border-slate-700"
              >
                Choose Gold Enterprise
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. VYAPAR FAQ ACCORDION
        ========================================================= */}
        <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-800/80">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">Everything you need to know about BizManage v2</p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />
                Is BizManage suitable for shops in Nepal and South Asia?
              </h4>
              <p className="text-slate-400 leading-relaxed pl-6">
                Yes! BizManage is tailored for South Asian businesses. It supports NPR, INR, and USD, PAN/VAT billing, thermal receipt printers, and digital payment QR codes (Garima, eSewa, Fonepay).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />
                Can I print thermal bills from a small POS receipt printer?
              </h4>
              <p className="text-slate-400 leading-relaxed pl-6">
                Absolutely. You can print invoices in both standard A4/A5 paper sizes and 58mm / 80mm thermal rolls via USB, Bluetooth, or WiFi printers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />
                How does offline billing work?
              </h4>
              <p className="text-slate-400 leading-relaxed pl-6">
                BizManage uses local client storage and service workers. If your internet disconnects, you can continue creating sales and billing customers. All data automatically synchronizes to the cloud the moment internet is restored.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />
                How do I install the mobile app?
              </h4>
              <p className="text-slate-400 leading-relaxed pl-6">
                Open this website on Chrome or Safari on your phone and tap "Install App" on the popup. It installs instantly with zero storage penalty and opens fullscreen just like a native app.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}