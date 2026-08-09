'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, LayoutDashboard, Receipt, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
                B
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                BizManage
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {!loading && user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-300 hidden sm:inline">
                    Welcome, <strong className="text-white">{user.name}</strong>
                  </span>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
            <ShieldCheck className="w-4 h-4" /> Multi-Tenant Production Architecture
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Next-Gen Business Accounting & <span className="text-blue-500">Inventory ERP</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Manage sales, purchases, customers, suppliers, inventory stock, expenses, and real-time P&L reports with strict data isolation.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-500/25 transition-all text-base flex items-center gap-2"
              >
                <LayoutDashboard className="w-5 h-5" /> Open Workspace Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-500/25 transition-all text-base flex items-center gap-2"
                >
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold transition-all text-base"
                >
                  Access Dashboard
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sales & Billing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Create digital sales invoices, estimates, credit notes, track payments received, and manage customer balances.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Inventory Management</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Real-time stock level tracking, low stock alerts, product SKU coding, unit conversions, and automated ledger movements.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Reports & Analytics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated Profit & Loss statements, Daybook, Stock Summary, Party Statements, and Tax (GST/VAT) reporting.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Component */}
      <footer className="border-t border-slate-800 bg-slate-900/60 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/30">
                  B
                </div>
                <span className="text-lg font-bold text-white">BizManage</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Production-ready multi-tenant Business Management & Accounting SaaS application built for modern enterprises.
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-slate-400 font-medium">All Systems Operational</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Product Features</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><Link href="/transactions/sales" className="hover:text-white transition-colors">Sales & Invoicing</Link></li>
                <li><Link href="/inventory" className="hover:text-white transition-colors">Stock & Inventory ERP</Link></li>
                <li><Link href="/expenses" className="hover:text-white transition-colors">Expense Tracking</Link></li>
                <li><Link href="/reports" className="hover:text-white transition-colors">P&L & Financial Reports</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Architecture</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><span className="text-slate-400">Fastify REST API</span></li>
                <li><span className="text-slate-400">Next.js App Router</span></li>
                <li><span className="text-slate-400">Prisma Multi-Tenant ORM</span></li>
                <li><span className="text-slate-400">PostgreSQL Database</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In to Account</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Register Business</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Workspace Dashboard</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} BizManage SaaS Inc. All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 cursor-pointer">Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
