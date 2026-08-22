"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  BarChart3,
  Shield,
  HelpCircle,
  Search,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function NotFound() {
  const router = useRouter();

  const quickLinks = [
    {
      name: "Dashboard",
      description: "Business analytics & summaries",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      name: "Point of Sale (POS)",
      description: "Quick retail checkout & barcode scanning",
      href: "/pos",
      icon: ShoppingCart,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      name: "Sales & Invoicing",
      description: "Manage customer sales & invoice records",
      href: "/transactions/sales",
      icon: Receipt,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      name: "Inventory & Stock",
      description: "Real-time stock catalog & adjustments",
      href: "/inventory/items",
      icon: Package,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      name: "Financial Reports",
      description: "Profit & Loss, balance sheets & tax",
      href: "/reports/profit-loss",
      icon: BarChart3,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      name: "Security Overview",
      description: "Enterprise multi-tenancy & trust",
      href: "/security",
      icon: Shield,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <PublicHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24 w-full flex flex-col items-center justify-center text-center">
        {/* Ambient Glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 rounded-full blur-2xl opacity-60 animate-pulse pointer-events-none" />
          
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/40 bg-blue-950/60 text-blue-400 text-xs sm:text-sm font-semibold tracking-wider uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping mr-1" />
            Error 404 • Resource Not Found
          </div>
        </div>

        {/* 404 Giant Badge */}
        <h1 className="text-7xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-600 drop-shadow-2xl mb-4 font-mono">
          404
        </h1>

        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mb-8 leading-relaxed">
          The page you are looking for might have been removed, renamed, or is temporarily unavailable. Check the URL or navigate to one of the main sections below.
        </p>

        {/* Main CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-14">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Home className="w-4 h-4" />
            Return to Homepage
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>

        {/* Quick Navigation Destination Grid */}
        <div className="w-full max-w-3xl pt-8 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5 flex items-center justify-center gap-2">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            Popular Destinations
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-left">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-3.5 rounded-xl transition-all flex items-start gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${item.color} group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
