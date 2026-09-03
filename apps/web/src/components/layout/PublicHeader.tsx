"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  Lock,
  FileText,
  Shield,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface PublicHeaderProps {
  activePage?: "home" | "privacy" | "terms" | "security";
}

export function PublicHeader({ activePage }: PublicHeaderProps) {
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.isSystemAdmin === true;
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Workspace Dashboard";

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl sticky top-0 z-50 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group shrink-0"
        >
          <img
            src="/logo-transparent.png"
            alt="BizManage Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:opacity-90 transition-opacity">
            BizManage
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium text-slate-600">
          <Link
            href="/#features"
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/explore-stores"
            className="px-3 py-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold transition-colors"
          >
            Explore Stores
          </Link>
          <Link
            href="/#download-app"
            className="px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4 text-red-600" />
            <span>Mobile App</span>
          </Link>
        </nav>

        {/* Header Actions */}
        <div className="hidden sm:flex items-center space-x-2 sm:space-x-4 shrink-0">
          {!authLoading && user ? (
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="text-xs sm:text-sm text-slate-600 hidden lg:inline">
                Welcome, <strong className="text-slate-900">{user.name}</strong>
              </span>

              <Link
                href={dashboardHref}
                className="text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl shadow-md shadow-red-600/25 transition-all flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to {dashboardLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : !authLoading ? (
            <>
              <Link
                href="/login"
                className="text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl shadow-md shadow-red-600/25 transition-all flex items-center gap-1.5"
              >
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <div className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse" />
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center gap-2">
          {!authLoading && user && (
            <Link
              href={dashboardHref}
              className="text-xs font-medium bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg"
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-900" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-5 space-y-4">
          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-sm font-medium"
            >
              Home
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-sm font-medium"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-sm font-medium"
            >
              Pricing
            </Link>
            <Link
              href="/explore-stores"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-semibold transition-colors text-sm"
            >
              Explore Online Stores
            </Link>
            <Link
              href="/security"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activePage === "security"
                  ? "text-blue-400 bg-blue-500/10 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Shield className="w-4 h-4" />
              Security Overview
            </Link>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activePage === "privacy"
                  ? "text-blue-400 bg-blue-500/10 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Lock className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activePage === "terms"
                  ? "text-blue-400 bg-blue-500/10 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            {!authLoading && user ? (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to {dashboardLabel}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-medium border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
