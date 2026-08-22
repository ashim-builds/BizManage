"use client";

import Link from "next/link";
import { ShieldCheck, Shield, Lock, FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export function PublicFooter() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Workspace Dashboard";

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-white relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Brand & Description */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center space-x-2.5 group"
            >
              <img
                src="/logo-transparent.png"
                alt="BizManage Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                BizManage
              </span>
            </Link>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Production-ready multi-tenant Business Management & Accounting SaaS
              application built for modern enterprises, retail stores, and growing businesses.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-slate-400">
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Column 1: Product Features */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Product Features
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/#features"
                  className="hover:text-white transition-colors"
                >
                  Sales & POS Invoicing
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="hover:text-white transition-colors"
                >
                  Stock & Inventory ERP
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="hover:text-white transition-colors"
                >
                  Expense & Ledger Tracking
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="hover:text-white transition-colors"
                >
                  P&L & Financial Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="hover:text-white transition-colors"
                >
                  Multi-Store Barcode Scanning
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Architecture & Trust */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Architecture & Trust
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/security"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3 h-3 text-blue-400" />
                  Security Architecture
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Fastify High-Speed REST API</span>
              </li>
              <li>
                <span className="text-slate-500">Next.js App Router Client</span>
              </li>
              <li>
                <span className="text-slate-500">Prisma Multi-Tenant ORM</span>
              </li>
              <li>
                <span className="text-slate-500">PostgreSQL Isolated Data</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition-colors"
                >
                  Sign In to Account
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="hover:text-white transition-colors"
                >
                  Register Business
                </Link>
              </li>
              <li>
                {!authLoading && user ? (
                  <Link
                    href={dashboardHref}
                    className="hover:text-white transition-colors text-blue-400"
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
              <li>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors text-slate-400"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin Portal</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="hover:text-white transition-colors"
                >
                  Security & Compliance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} BizManage SaaS Inc. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-slate-500" />
              Terms of Service
            </Link>

            <Link
              href="/security"
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <Shield className="w-3 h-3 text-slate-500" />
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
