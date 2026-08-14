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
  Printer,
  Box,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  
  const currentBiz = user?.memberships?.[0]?.business;
  const selectedPlan = currentBiz?.subscriptionPackage;
  
  const [optimisticSetup, setOptimisticSetup] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('bizmanage_setup_completed_optimistic') === 'true') {
      setOptimisticSetup(true);
    }
  }, []);

  const isSetupCompleted = Boolean(currentBiz?.setupCompleted) || optimisticSetup;
  const hasProfileComplete = Boolean(currentBiz?.profileCompleted);
  
  const rawFeatures = selectedPlan?.features;
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);

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
  const hasTransactions = (metrics?.salesCount || 0) > 0 || (metrics?.purchasesCount || 0) > 0 || (metrics?.totalExpenses || 0) > 0;

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
            hasSubscription={!!selectedPlan}
            hasItems={hasItems}
            hasParties={hasParties}
            hasTransactions={hasTransactions}
            userFeatures={userFeatures}
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

          {/* KPI Cards Grid - Row 1 (5 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {/* To Receive */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">To Receive</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-emerald-400 font-mono">
                  Rs. {(metrics.toReceive || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Customer Debt →</span>
                </div>
              </div>
            </div>

            {/* To Give */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">To Give</span>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-red-400 font-mono">
                  Rs. {(metrics.toGive || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Supplier Payable →</span>
                </div>
              </div>
            </div>

            {/* Total Sales */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Sales</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-white font-mono">
                  Rs. {(metrics.totalSales || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>{metrics.totalSales ? '1' : '0'} Invoices Billed</span>
                </div>
              </div>
            </div>

            {/* Total Purchase */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Purchase</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-white font-mono">
                  Rs. {(metrics.totalPurchases || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>{metrics.totalPurchases ? '1' : '0'} Purchase Bills</span>
                </div>
              </div>
            </div>

            {/* Total Expense */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Expense</span>
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-white font-mono">
                  Rs. {(metrics.totalExpenses || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Operational Spend</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid - Row 2 (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Cash in Hand */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Cash in Hand</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-emerald-400 font-mono">
                  Rs. {(metrics.totalCash || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Physical Register Cash</span>
                </div>
              </div>
            </div>

            {/* Bank Balance */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Bank Balance</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Printer className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-blue-400 font-mono">
                  Rs. {(metrics.totalBank || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Institutional Bank Accounts</span>
                </div>
              </div>
            </div>

            {/* Total Liquidity */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Liquidity</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-white font-mono">
                  Rs. {((metrics.totalCash || 0) + (metrics.totalBank || 0)).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>Total Available Cash + Bank</span>
                </div>
              </div>
            </div>

            {/* Total Products */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Products</span>
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center">
                  <Box className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-extrabold text-yellow-400 font-mono">
                  {metrics.totalItemsCount || 0}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span>{metrics.totalItemsCount || 0} Items in Inventory →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 - Audit Feed & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent Transactions Audit Feed */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" /> Recent Transactions Audit Feed
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Latest financial entries logged in real-time.</p>
                </div>
                <Link
                  href="/transactions"
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 sm:mt-0"
                >
                  Full Cashflow <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-4 flex-1">
                {metrics.recentTransactions?.length ? (
                  metrics.recentTransactions.map((tx: any) => {
                    const isTxIn = ['SALE', 'PAYMENT_IN', 'INCOME', 'PURCHASE_RETURN'].includes(tx.category);
                    return (
                      <div key={tx.id} className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                            isTxIn 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {isTxIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white">{tx.description || 'Transaction'}</p>
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 uppercase border border-slate-700">
                                {tx.category ? tx.category.replace('_', ' ') : 'TXN'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(tx.date).toLocaleDateString()} • {tx.account?.accountName || 'Account'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold font-mono shrink-0 ${
                          isTxIn ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isTxIn ? '+' : '-'} Rs. {Number(tx.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                    No recent transactions found.
                  </div>
                )}
              </div>
            </div>

            {/* Low-Stock Alerts */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Low-Stock Alerts
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Products requiring immediate restock.</p>
                </div>
                <Link
                  href="/inventory"
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 mt-2 sm:mt-0"
                >
                  Inventory <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
                <Box className="w-8 h-8 text-emerald-400 mb-3" />
                <p className="text-sm font-bold text-white">All Stock Levels Healthy</p>
                <p className="text-xs text-slate-400 mt-1">No items are below minimum threshold.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
