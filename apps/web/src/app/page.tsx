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
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { usePublicStores } from "@/hooks/useStorefront";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AVAILABLE_FEATURES } from "@/lib/constants";
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
  // Check whether the logged-in user is an admin
  const isAdmin = user?.isSystemAdmin === true;

  // Role-based dashboard
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard";

  // Role-based dashboard label
  const dashboardLabel = isAdmin
    ? "Admin Dashboard"
    : "Workspace Dashboard";

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white flex flex-col justify-between">
      <div>
        <PublicHeader activePage="home" />

        {/* =========================================================
            HERO SECTION
        ========================================================= */}
        <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-6 sm:mb-8 text-center max-w-full leading-tight">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />

            <span className="truncate whitespace-normal">
              Multi-Tenant Production Architecture
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Next-Gen Business Accounting &{" "}
            <span className="text-blue-500">
              Inventory ERP
            </span>
          </h1>

          {/* Description */}
          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Manage sales, purchases, customers, suppliers,
            inventory stock, expenses, and real-time P&L
            reports with strict data isolation.
          </p>

          {/* Hero Actions */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 w-full sm:w-auto">

            {!authLoading && user ? (
              <Link
                href={dashboardHref}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-500/25 transition-all text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />

                {isAdmin
                  ? "Open Admin Dashboard"
                  : "Open Workspace Dashboard"}

                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            ) : (
              <>
                {/* Start Trial */}
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-500/25 transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>

                {/* Login */}
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold transition-all text-sm sm:text-base flex items-center justify-center"
                >
                  Access Dashboard
                </Link>
              </>
            )}
          </div>
        </section>

        {/* =========================================================
            FEATURE GRID
        ========================================================= */}
        <section id="features" className="scroll-mt-20 py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sales */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold mb-2">
                Sales & Billing
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                Create digital sales invoices, estimates,
                credit notes, track payments received, and
                manage customer balances.
              </p>
            </div>

            {/* Inventory */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold mb-2">
                Inventory Management
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                Real-time stock level tracking, low stock
                alerts, product SKU coding, unit conversions,
                and automated ledger movements.
              </p>
            </div>

            {/* Reports */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold mb-2">
                Reports & Analytics
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                Automated Profit & Loss statements,
                Daybook, Stock Summary, Party Statements,
                and Tax (GST/VAT) reporting.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            FEATURED ONLINE STORES DIRECTORY SECTION
        ========================================================= */}
        <section id="stores" className="scroll-mt-20 py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center mb-12">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20 inline-flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" />
              Public E-Commerce Catalog
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">
              Explore Active Online Stores
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
              Browse products, request prices, and submit direct orders or WhatsApp inquiries to verified businesses powered by BizManage.
            </p>
          </div>

          {storesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : publicStores && publicStores.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {publicStores.slice(0, 3).map((store: any) => (
                  <div
                    key={store.slug}
                    className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all p-6 flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt={store.title} className="w-full h-full object-contain p-1 rounded-xl" />
                          ) : (
                            store.title ? store.title.substring(0, 2).toUpperCase() : 'ST'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {store.title}
                          </h3>
                          {store.address && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {store.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {store.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {store.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        /store/{store.slug}
                      </span>
                      <Link
                        href={`/store/${store.slug}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                      >
                        Visit Store <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Explore All Stores Button */}
              <div className="text-center pt-2">
                <Link
                  href="/explore-stores"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all shadow-lg hover:scale-105"
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  Explore All Online Stores ({publicStores.length})
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4 max-w-xl mx-auto">
              <Store className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">Create & Publish Your Store</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Build your online catalog, toggle price visibility, receive WhatsApp inquiries, and manage inventory automatically from your BizManage dashboard.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all"
              >
                Create Storefront Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* =========================================================
            PRICING & PLANS
        ========================================================= */}
        <section id="pricing" className="scroll-mt-20 py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          {/* Pricing Header */}
          <div className="text-center mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Transparent Pricing
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">
              Flexible Plans for Growing Businesses
            </h2>

            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
              Start with our free starter tier or upgrade
              to unlock advanced financial reports,
              multi-branch setup, and custom branding.
            </p>
          </div>

          {/* Plans */}
          {packagesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-md md:max-w-4xl lg:max-w-none mx-auto">
              {packages.map((pkg, idx) => {
                const isPopular = idx === 1; // Highlighting the second one
                return (
                  <div key={pkg.id} className={`relative p-8 rounded-3xl border flex flex-col justify-between transition-all ${isPopular ? 'border-blue-600 bg-slate-900/90 shadow-2xl shadow-blue-600/10 border-2' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
                        Most Popular
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center justify-between mb-4 mt-2">
                        <div className="flex items-center gap-2">
                          {isPopular ? <Crown className="w-5 h-5 text-amber-400" /> : pkg.isDefault ? null : <Zap className="w-5 h-5 text-amber-300" />}
                          <h3 className="text-xl font-bold text-white">
                            {pkg.name}
                          </h3>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isPopular ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                          {pkg.isDefault ? 'Starter' : isPopular ? 'Pro' : 'Scale'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-6">
                        {pkg.isDefault ? 'Essential ERP features for single shop owners.' : 'Complete suite of features for growing businesses.'}
                      </p>

                      <div className="mb-6">
                        <span className="text-4xl font-extrabold text-white font-mono">
                          {pkg.currency} {pkg.price}
                        </span>
                        <span className="text-xs text-slate-400">
                          {" "}
                          / {pkg.billingPeriod.toLowerCase()}
                        </span>
                      </div>

                      <ul className="space-y-3 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-6">
                        {pkg.features.slice(0, 5).map(featId => {
                          const featObj = AVAILABLE_FEATURES.find(f => f.id === featId);
                          return (
                            <li key={featId} className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{featObj ? featObj.label : featId}</span>
                            </li>
                          );
                        })}
                        {pkg.features.length > 5 && (
                          <li className="flex items-center gap-2.5 text-slate-400 pt-2 font-medium">
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>{pkg.features.length - 5} more features</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <Link
                      href="/register"
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-2 ${isPopular ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}`}
                    >
                      {pkg.isDefault ? 'Get Started Free' : 'Choose Plan'}
                      {isPopular && <ArrowRight className="w-4 h-4" />}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <PublicFooter />
    </div>
  );
}