'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboardMetrics } from '@/services/dashboardService';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { BmsOnboardingWizard } from '@/components/dashboard/BmsOnboardingWizard';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  DollarSign,
  Plus,
  ArrowRight,
  Clock,
  Package,
  Crown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  
  const currentBiz = user?.memberships?.[0]?.business;
  const selectedPlan = currentBiz?.subscriptionPlan;
  
  const [optimisticSetup, setOptimisticSetup] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('bizmanage_setup_completed_optimistic') === 'true') {
      setOptimisticSetup(true);
    }
  }, []);

  const isSetupCompleted = Boolean(currentBiz?.setupCompleted) || optimisticSetup;
  const hasProfileComplete = Boolean(currentBiz?.profileCompleted);

  const handleUnlockDashboard = async () => {
    // In a full implementation, you would call updateBusiness.mutateAsync({ setupCompleted: true }) here.
    // For now, if the user explicitly unlocks, they can bypass it visually.
    setOptimisticSetup(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_setup_completed_optimistic', 'true');
    }
  };

  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const hasItems = (metrics?.totalItemsCount || 0) > 0;
  const hasParties = (metrics?.totalPartiesCount || 0) > 0;
  const hasTransactions = (metrics?.totalSales || 0) > 0 || (metrics?.totalPurchases || 0) > 0 || (metrics?.totalExpenses || 0) > 0;

  // Auto-complete setup if all steps done
  const allStepsFinished = hasItems && hasParties && hasTransactions && !!selectedPlan && hasProfileComplete;

  useEffect(() => {
    // Force a fresh fetch of metrics every time dashboard is opened
    // so setup guide states (like hasParties, hasItems) update instantly
    refetch();

    if (allStepsFinished && !isSetupCompleted) {
       // If all steps finished but DB hasn't marked it yet, we could trigger the API update here
       // or just rely on the API state for next reload.
    }
  }, [allStepsFinished, refetch, isSetupCompleted]);

  if (isLoading) {
    return <LoadingState message="Loading business executive dashboard..." />;
  }

  if (isError || !metrics) {
    return <ErrorState title="Failed to load dashboard metrics" onRetry={refetch} />;
  }

  const setPresetRange = (p: 'today' | 'week' | 'month' | 'all') => {
    setPreset(p);
    const now = new Date();
    if (p === 'today') {
      const todayStr = now.toISOString().split('T')[0] || '';
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === 'week') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0] || '');
      setEndDate(now.toISOString().split('T')[0] || '');
    } else if (p === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0] || '');
      setEndDate(now.toISOString().split('T')[0] || '');
    } else {
      setStartDate('');
      setEndDate('');
    }
  };


  return (
    <div className="space-y-8 font-sans">
      {/* Subscription Lock / Action Warning */}
      {!selectedPlan && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-white">Subscription Selection Required</p>
              <p className="text-xs text-amber-200/90 mt-0.5">
                You have not selected a plan yet. Please select a plan (Free Starter, Pro, or Enterprise) to activate full BMS feature access.
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shrink-0 shadow-md"
          >
            Select Plan Now →
          </Link>
        </div>
      )}

      {/* SETUP PHASE: If setup is NOT completed, show ONLY the BMS Setup Wizard with clear notice */}
      {!isSetupCompleted && !allStepsFinished ? (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Notice */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-blue-500/30 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Initial Setup Required
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Complete your business setup below to unlock your Executive Dashboard.
            </h1>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Follow these guided steps to configure your business profile, pick a subscription plan, and set up your items & parties.
            </p>
          </div>

          {/* BMS Setup Onboarding Wizard */}
          <BmsOnboardingWizard
            userName={user?.name || 'Owner'}
            businessName={user?.memberships?.[0]?.business?.name || 'My Business'}
            hasProfileComplete={hasProfileComplete}
            hasItems={hasItems}
            hasParties={hasParties}
            hasTransactions={hasTransactions}
          />

          {/* Skip / Unlock Button */}
          <div className="text-center pt-4">
            <button
              onClick={handleUnlockDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlock & View Executive Dashboard Now
            </button>
          </div>
        </div>
      ) : (
        /* COMPLETED SETUP PHASE: Show Executive Dashboard */
        <div className="space-y-8">
          {/* Top Glowing Banner with Business Name */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border border-blue-500/30 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live ERP Workspace Active
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3 flex-wrap">
                  {user?.memberships?.[0]?.business?.name || 'My Business'}
                  <span className="text-slate-400 text-lg md:text-xl font-medium">— Executive Dashboard</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Real-time double-entry ledgers, party balance tracking, cashflow liquidity, and sales analytics.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <span className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-300 font-extrabold text-xs border border-blue-500/30 uppercase tracking-wider shadow-inner">
                  {selectedPlan ? `${selectedPlan.toUpperCase()} PLAN` : 'FREE STARTER'}
                </span>
                <Link
                  href="/settings?tab=guide"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Setup Guide
                </Link>
              </div>
            </div>
          </div>
          {/* Header & Date Range Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Executive Dashboard <TrendingUp className="w-6 h-6 text-blue-400" />
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time business health, party balance ledger, cashflow liquidity, and sales metrics.
              </p>
            </div>

            {/* Quick Date Presets & Custom Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setPresetRange('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    preset === 'all' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setPresetRange('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    preset === 'today' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPresetRange('week')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    preset === 'week' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setPresetRange('month')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    preset === 'month' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  This Month
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                  title="Start Date"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                  title="End Date"
                />
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Revenue */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Sales Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-3 font-mono">
                Rs. {(metrics.totalSales || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Direct Sales
                </span>
              </div>
            </div>

            {/* Total Purchases */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Purchases</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-3 font-mono">
                Rs. {(metrics.totalPurchases || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                <span className="text-blue-400 font-bold flex items-center gap-0.5">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Supplier Procurement
                </span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Operating Expenses</span>
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-3 font-mono">
                Rs. {(metrics.totalExpenses || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                <span className="text-red-400 font-bold">Office & Utilities</span>
              </div>
            </div>

            {/* Total Items in Catalog */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Active Catalog Items</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-3 font-mono">
                {metrics.totalItemsCount || 0}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                <span className="text-purple-400 font-bold">Products & Services</span>
              </div>
            </div>
          </div>

          {/* Action Quick Links & Party Receivables/Payables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Receivables & Payables Ledger Summary */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" /> Party Balances & Cashflow
                  </h3>
                  <p className="text-xs text-slate-400">Current outstanding debts and payments due.</p>
                </div>
                <Link
                  href="/parties"
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View Parties <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-xs font-semibold text-slate-400 block">Total Customer Receivables (To Collect)</span>
                  <p className="text-xl font-bold text-emerald-400 mt-2 font-mono">
                    Rs. {(metrics.toReceive || 0).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <span className="text-xs font-semibold text-slate-400 block">Total Supplier Payables (To Pay)</span>
                  <p className="text-xl font-bold text-amber-400 mt-2 font-mono">
                    Rs. {(metrics.toGive || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Launchpad */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" /> Quick Operations
              </h3>

              <div className="space-y-2.5">
                <Link
                  href="/transactions/sales"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Create Sales Invoice
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/inventory"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" /> Add Inventory Item
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/parties"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" /> Register Customer / Party
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
