"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Shield,
  Lock,
  FileText,
  Send,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Zap,
  Globe,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import toast from "react-hot-toast";

export function PublicFooter() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Workspace Dashboard";

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribed(true);
    toast.success("Thank you for subscribing to BizManage updates!");
    setNewsletterEmail("");
  };

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-900 relative z-10 overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12 relative z-10">
        {/* Top Newsletter / CTA Banner */}
        <div className="mb-16 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stay Ahead with BizManage</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Get accounting insights & feature updates
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
              Join thousands of business owners receiving our weekly enterprise & POS billing tips.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="Enter your business email..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-red-600/25 shrink-0 active:scale-95"
            >
              {subscribed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Subscribed
                </>
              ) : (
                <>
                  <span>Subscribe Free</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Main Grid Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <img
                src="/logo-transparent.png"
                alt="BizManage Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="text-2xl font-black tracking-tight text-slate-900">
                BizManage
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
              Production-ready multi-tenant Business Management & Accounting application built for modern retail stores, hardware shops, and enterprise businesses.
            </p>

            {/* Contact Badges */}
            <div className="space-y-2 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span>Kathmandu & Pokhara, Nepal · Global Cloud Host</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>support@bizmanage.app</span>
              </div>
            </div>

            {/* Operational Status */}
            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                All Systems Operational · 99.99% Uptime
              </span>
            </div>
          </div>

          {/* Column 1: Product Solutions */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Core Products
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/transactions/pos" className="hover:text-slate-900 transition-colors flex items-center gap-1 group">
                  <span className="group-hover:translate-x-0.5 transition-transform">POS Quick Billing & Thermal</span>
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-slate-900 transition-colors flex items-center gap-1 group">
                  <span className="group-hover:translate-x-0.5 transition-transform">Inventory & Barcode ERP</span>
                </Link>
              </li>
              <li>
                <Link href="/transactions/sales" className="hover:text-slate-900 transition-colors flex items-center gap-1 group">
                  <span className="group-hover:translate-x-0.5 transition-transform">Sales Invoices & VAT Billing</span>
                </Link>
              </li>
              <li>
                <Link href="/parties" className="hover:text-slate-900 transition-colors flex items-center gap-1 group">
                  <span className="group-hover:translate-x-0.5 transition-transform">Customer & Supplier Ledgers</span>
                </Link>
              </li>
              <li>
                <Link href="/reports" className="hover:text-slate-900 transition-colors flex items-center gap-1 group">
                  <span className="group-hover:translate-x-0.5 transition-transform">Profit & Loss Financials</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Architecture & Security */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Security & Trust
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/security" className="hover:text-slate-900 transition-colors flex items-center gap-1 text-blue-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Security Architecture
                </Link>
              </li>
              <li>
                <span className="text-slate-400">256-Bit SSL/TLS Encryption</span>
              </li>
              <li>
                <span className="text-slate-400">Multi-Tenant MySQL Isolation</span>
              </li>
              <li>
                <span className="text-slate-400">Automated Daily Backups</span>
              </li>
              <li>
                <span className="text-slate-400">Fastify REST API & Next.js 14</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Access */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/explore-stores" className="hover:text-emerald-700 transition-colors text-emerald-600 font-semibold">
                  Explore Online Stores
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-slate-900 transition-colors">
                  Sign In to Account
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-slate-900 transition-colors">
                  Register New Business
                </Link>
              </li>
              <li>
                {!authLoading && user ? (
                  <Link href={dashboardHref} className="hover:text-slate-900 transition-colors font-bold text-red-600 flex items-center gap-1">
                    <span>{dashboardLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <Link href="/subscription" className="hover:text-slate-900 transition-colors">
                    Pricing & Tiers
                  </Link>
                )}
              </li>
              <li>
                <Link href="/admin/login" className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors text-amber-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin Portal</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BizManage Inc. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Privacy Policy
            </Link>

            <Link href="/terms" className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              Terms of Service
            </Link>

            <Link href="/security" className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              Security Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
