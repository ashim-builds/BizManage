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
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AVAILABLE_FEATURES } from "@/app/admin/packages/page";

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
        {/* =========================================================
            HEADER
        ========================================================= */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
            >
              <img
                src="/logo-transparent.png"
                alt="BizManage Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
              />

              <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                BizManage
              </span>
            </Link>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
              {!authLoading && user ? (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Welcome Message */}
                  <span className="text-xs sm:text-sm text-slate-300 hidden md:inline">
                    Welcome,{" "}
                    <strong className="text-white">
                      {user.name}
                    </strong>
                  </span>

                  {/* Dashboard */}
                  <Link
                    href={dashboardHref}
                    className="text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 sm:gap-2"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />

                    <span className="hidden sm:inline">
                      Go to {dashboardLabel}
                    </span>

                    <span className="sm:hidden">
                      Dashboard
                    </span>

                    <ArrowRight className="hidden sm:inline w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <>
                  {/* Sign In */}
                  <Link
                    href="/login"
                    className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-2 py-1.5 sm:px-4 sm:py-2"
                  >
                    Sign In
                  </Link>

                  {/* Get Started */}
                  <Link
                    href="/register"
                    className="text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 sm:gap-2"
                  >
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

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
        <section className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
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
            PRICING & PLANS
        ========================================================= */}
        <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
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
      <footer className="border-t border-slate-800 bg-slate-900/60 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

            {/* Brand */}
            <div className="space-y-4">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <img
                  src="/logo-transparent.png"
                  alt="BizManage Logo"
                  className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                />

                <span className="text-lg font-bold text-white group-hover:text-slate-200 transition-colors">
                  BizManage
                </span>
              </Link>

              <p className="text-xs text-slate-400 leading-relaxed">
                Production-ready multi-tenant Business Management &
                Accounting SaaS application built for modern enterprises.
              </p>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                <span className="text-[11px] text-slate-400 font-medium">
                  All Systems Operational
                </span>
              </div>
            </div>

            {/* Product Features */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
                Product Features
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link
                    href="/transactions/sales"
                    className="hover:text-white transition-colors"
                  >
                    Sales & Invoicing
                  </Link>
                </li>

                <li>
                  <Link
                    href="/inventory"
                    className="hover:text-white transition-colors"
                  >
                    Stock & Inventory ERP
                  </Link>
                </li>

                <li>
                  <Link
                    href="/expenses"
                    className="hover:text-white transition-colors"
                  >
                    Expense Tracking
                  </Link>
                </li>

                <li>
                  <Link
                    href="/reports"
                    className="hover:text-white transition-colors"
                  >
                    P&L & Financial Reports
                  </Link>
                </li>
              </ul>
            </div>

            {/* Architecture */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
                Architecture
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <span>Fastify REST API</span>
                </li>

                <li>
                  <span>Next.js App Router</span>
                </li>

                <li>
                  <span>Prisma Multi-Tenant ORM</span>
                </li>

                <li>
                  <span>PostgreSQL Database</span>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
                Quick Links
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-400">

                {/* Sign In */}
                <li>
                  <Link
                    href="/login"
                    className="hover:text-white transition-colors"
                  >
                    Sign In to Account
                  </Link>
                </li>

                {/* Register */}
                <li>
                  <Link
                    href="/register"
                    className="hover:text-white transition-colors"
                  >
                    Register Business
                  </Link>
                </li>

                {/* Role-Aware Dashboard */}
                <li>
                  {!authLoading && user ? (
                    <Link
                      href={dashboardHref}
                      className="hover:text-white transition-colors"
                    >
                      {dashboardLabel}
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="hover:text-white transition-colors"
                    >
                      Workspace Dashboard
                    </Link>
                  )}
                </li>

                {/* Admin Portal */}
                <li>
                  {!authLoading && user ? (
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />

                      <span>
                        {isAdmin
                          ? "Admin Dashboard"
                          : "Admin Portal"}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />

                      <span>Admin Portal</span>
                    </Link>
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} BizManage SaaS Inc.
              All rights reserved.
            </p>

            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="hover:text-slate-400 transition-colors"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                className="hover:text-slate-400 transition-colors"
              >
                Terms of Service
              </Link>

              <Link
                href="/security"
                className="hover:text-slate-400 transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}